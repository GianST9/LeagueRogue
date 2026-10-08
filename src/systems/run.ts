// The run state machine. Pure game logic: the UI calls these actions and renders `state.phase`.
// Actions mutate the state they're given; the UI clones before calling them.

import { CONFIG, type ModeConfig } from '../core/config';
import { createRng, type Rng } from '../core/rng';
import type { ItemTier, RunChampion } from '../core/types';
import { BOSSES, championDef, type BossDef } from '../data/bosses';
import { CHAMPIONS, CHAMPION_IDS } from '../data/champions';
import { CLASSIC_ITEM_IDS, ITEMS, itemIdsOfTier } from '../data/items';
import { simulateBattle, type BattleResult, type BattleUnit } from './battle';
import { fullHeal, grantXp, maxHpOf, setLevel } from './leveling';
import { findNode, generateMap, type MapNode, type NodeKind, type RunMap } from './map';

export type RunMode = keyof typeof CONFIG.run.modes;
export type FightKind = 'camp' | 'rival' | 'boss';

/** A non-player combatant. Plain data so the whole run state can be cloned and saved. */
export interface EnemyUnit {
  uid: string;
  defId: string;
  level: number;
  itemIds: string[];
}

export interface LevelGain {
  uid: string;
  from: number;
  to: number;
}

export type Phase =
  | { kind: 'starter'; options: RunChampion[] }
  | { kind: 'map' }
  | { kind: 'battle'; fight: FightKind; playerUids: string[]; enemy: EnemyUnit[]; seed: number; result: BattleResult }
  | { kind: 'recruit'; options: RunChampion[] }
  | { kind: 'item'; options: string[] }
  | { kind: 'levelup'; options: string[] }
  | { kind: 'fountain' }
  | { kind: 'battleWon'; fight: FightKind; xp: number; gold: number; gains: LevelGain[] }
  | { kind: 'mapComplete'; bossId: string; xp: number; gold: number; gains: LevelGain[] }
  /** Armory shop after a region boss. A null offer was already bought. */
  | { kind: 'shop'; offers: (string | null)[]; rerolls: number }
  | { kind: 'gameOver'; fight: FightKind }
  | { kind: 'victory' };

export interface RunState {
  mode: RunMode;
  seed: number;
  rngState: number;
  totalMaps: number;
  mapIndex: number;
  /** Boss ids in the order they're fought this run. */
  bossOrder: string[];
  map: RunMap;
  /** Last visited node id on the current map; null before the first step. */
  position: string | null;
  visited: string[];
  team: RunChampion[];
  /** Unequipped items. */
  bag: string[];
  gold: number;
  nextUid: number;
  phase: Phase;
  battlesWon: number;
}

export function modeConfig(s: RunState): ModeConfig {
  return CONFIG.run.modes[s.mode];
}

// ── setup ──────────────────────────────────────────────────────────

export function newRun(mode: RunMode, seed: number): RunState {
  const rng = createRng(seed);
  const mc = CONFIG.run.modes[mode];
  const state: RunState = {
    mode,
    seed,
    rngState: 0,
    totalMaps: mc.maps,
    mapIndex: 0,
    bossOrder: rng.shuffle(BOSSES.map((b) => b.id)).slice(0, mc.maps),
    map: generateMap(rng, 0, excludedNodes(mc)),
    position: null,
    visited: [],
    team: [],
    bag: [],
    gold: mc.shop ? CONFIG.armory.startingGold : 0,
    nextUid: 1,
    phase: { kind: 'map' },
    battlesWon: 0,
  };
  const commons = CHAMPION_IDS.filter((id) => CHAMPIONS[id].rarity === 'common');
  const options = rng.shuffle(commons).slice(0, 3).map((id) => makeChampion(state, rng, id, CONFIG.run.startLevel));
  state.phase = { kind: 'starter', options };
  state.rngState = rng.state();
  return state;
}

export function chooseStarter(s: RunState, index: number): void {
  const phase = expectPhase(s, 'starter');
  s.team.push(phase.options[index]);
  s.phase = { kind: 'map' };
}

function excludedNodes(mc: ModeConfig): NodeKind[] {
  return mc.itemNodes ? [] : ['item'];
}

// ── map ────────────────────────────────────────────────────────────

export function currentBoss(s: RunState): BossDef {
  const id = s.bossOrder[s.mapIndex];
  return BOSSES.find((b) => b.id === id)!;
}

export function availableNodes(s: RunState): MapNode[] {
  if (s.phase.kind !== 'map') return [];
  if (s.position === null) return s.map.layers[0];
  return findNode(s.map, s.position).next.map((id) => findNode(s.map, id));
}

export function enterNode(s: RunState, nodeId: string): void {
  expectPhase(s, 'map');
  if (!availableNodes(s).some((n) => n.id === nodeId)) throw new Error(`Node ${nodeId} is not reachable`);
  const node = findNode(s.map, nodeId);
  s.position = nodeId;
  s.visited.push(nodeId);

  withRng(s, (rng) => {
    switch (node.kind) {
      case 'camp':
      case 'rival':
      case 'boss':
        startBattle(s, rng, node.kind, buildEnemies(s, rng, node));
        break;
      case 'recruit': {
        const owned = new Set(s.team.map((c) => c.defId));
        const pool = CHAMPION_IDS.filter((id) => !owned.has(id));
        const level = Math.max(CONFIG.run.startLevel, Math.round(averageLevel(s)));
        const options = rng.shuffle(pool).slice(0, CONFIG.run.recruitOptions).map((id) => makeChampion(s, rng, id, level));
        s.phase = { kind: 'recruit', options };
        break;
      }
      case 'item':
        s.phase = { kind: 'item', options: rng.shuffle(CLASSIC_ITEM_IDS).slice(0, CONFIG.run.itemOptions) };
        break;
      case 'levelup': {
        const eligible = s.team.filter((c) => c.level < CONFIG.leveling.maxLevel).map((c) => c.uid);
        s.phase = { kind: 'levelup', options: rng.shuffle(eligible).slice(0, CONFIG.run.levelUpOptions) };
        break;
      }
      case 'fountain':
        s.team.forEach(fullHeal);
        s.phase = { kind: 'fountain' };
        break;
    }
  });
}

// ── battles ────────────────────────────────────────────────────────

export function toBattleUnit(c: RunChampion): BattleUnit {
  return { uid: c.uid, def: championDef(c.defId), level: c.level, itemIds: c.itemIds, skinLine: c.skinLine, hp: c.hp };
}

export function enemyToBattleUnit(e: EnemyUnit): BattleUnit {
  return { uid: e.uid, def: championDef(e.defId), level: e.level, itemIds: e.itemIds };
}

function startBattle(s: RunState, rng: Rng, fight: FightKind, enemy: EnemyUnit[]): void {
  const fighters = s.team.filter((c) => !c.fainted && c.hp > 0);
  const seed = rng.int(0, 2 ** 31 - 1);
  const result = simulateBattle({ player: fighters.map(toBattleUnit), enemy: enemy.map(enemyToBattleUnit), seed });
  s.phase = { kind: 'battle', fight, playerUids: fighters.map((c) => c.uid), enemy, seed, result };
}

/** Applies the outcome of the battle the player just watched. */
export function finishBattle(s: RunState): void {
  const phase = expectPhase(s, 'battle');
  const mc = modeConfig(s);
  for (const outcome of phase.result.player) {
    const champ = s.team.find((c) => c.uid === outcome.uid);
    if (!champ) continue;
    champ.hp = outcome.hp;
    champ.fainted = outcome.fainted;
  }

  if (phase.result.winner === 'enemy') {
    s.phase = { kind: 'gameOver', fight: phase.fight };
    return;
  }

  s.battlesWon++;
  for (const champ of s.team) {
    if (!champ.fainted) champ.hp = Math.min(maxHpOf(champ), champ.hp + Math.round(maxHpOf(champ) * CONFIG.run.postBattleHeal));
  }
  const xp = Math.round(CONFIG.leveling.xpReward[phase.fight] * mc.xpMultiplier);
  const gold = mc.shop ? CONFIG.armory.goldReward[phase.fight] : 0;
  s.gold += gold;
  const gains: LevelGain[] = [];
  for (const champ of s.team) {
    const from = champ.level;
    if (grantXp(champ, xp, mc.xpCurve) > 0) gains.push({ uid: champ.uid, from, to: champ.level });
  }

  if (phase.fight !== 'boss') {
    s.phase = { kind: 'battleWon', fight: phase.fight, xp, gold, gains };
    return;
  }
  // Beating a boss revives and heals the whole team, like a gym in pokelike.
  s.team.forEach(fullHeal);
  s.phase = s.mapIndex + 1 >= s.totalMaps
    ? { kind: 'victory' }
    : { kind: 'mapComplete', bossId: currentBoss(s).id, xp, gold, gains };
}

function buildEnemies(s: RunState, rng: Rng, node: MapNode): EnemyUnit[] {
  const progress = runProgress(s, node.layer);
  const shopMode = modeConfig(s).shop;
  const level = (bonus: number) => {
    const curve = 1 + Math.round(progress * CONFIG.run.enemyLevelSpan);
    const floor = curve - CONFIG.run.enemyCurveSlack;
    return clamp(Math.max(floor, Math.floor(averageLevel(s))) + bonus, 1, CONFIG.leveling.maxLevel);
  };
  const uid = () => `e${s.nextUid++}`;
  // Classic: at most one legendary, with a chance that grows over the run.
  // Armory: several shop items, more and better ones as the run goes on, to match the player's shopping.
  const items = (classicChance: number, armoryProgress: number): string[] => {
    if (!shopMode) return rng.chance(classicChance) ? [rng.pick(CLASSIC_ITEM_IDS)] : [];
    const { enemyMaxItems, enemyItemPace } = CONFIG.armory;
    const count = Math.min(enemyMaxItems, Math.floor(armoryProgress * enemyItemPace * enemyMaxItems + rng.next()));
    return Array.from({ length: count }, () => rng.pick(itemIdsOfTier(rollTier(rng, armoryProgress))));
  };

  if (node.kind === 'camp') {
    const count = 1 + Math.floor(progress * 2);
    return rng.shuffle(CHAMPION_IDS).slice(0, count).map((defId) => ({ uid: uid(), defId, level: level(-2), itemIds: [] }));
  }

  if (node.kind === 'rival') {
    const count = 2 + Math.floor(progress * 3);
    return rng.shuffle(CHAMPION_IDS).slice(0, count).map((defId) => ({
      uid: uid(), defId, level: level(-1), itemIds: items(progress * 0.5, progress * 0.8),
    }));
  }

  // Boss: themed members first, then the ace. Later bosses bring more champions.
  const boss = currentBoss(s);
  const bossProgress = s.mapIndex / s.totalMaps;
  const size = Math.min(CONFIG.team.maxSize, 2 + Math.floor(bossProgress * 4));
  let members = boss.team.slice(-(size - 1));
  while (members.length < size - 1) {
    const extra = rng.pick(CHAMPION_IDS.filter((id) => !members.includes(id) && id !== boss.aceId));
    members = [extra, ...members];
  }
  // The ace holds its signature item from the second boss on; only the final boss's ace is a level ahead.
  const aceItems = s.mapIndex === 0 ? [] : [boss.aceItemId];
  if (shopMode && s.mapIndex > 0) aceItems.push(...items(0, bossProgress).slice(0, CONFIG.armory.enemyMaxItems - 1));
  return [
    ...members.map((defId) => ({ uid: uid(), defId, level: level(0), itemIds: items(bossProgress * 0.6, bossProgress) })),
    { uid: uid(), defId: boss.aceId, level: level(s.mapIndex === s.totalMaps - 1 ? 1 : 0), itemIds: aceItems },
  ];
}

// ── rewards ────────────────────────────────────────────────────────

/** Pick a recruit (or null to skip). With a full team, `replaceUid` says who leaves. */
export function chooseRecruit(s: RunState, index: number | null, replaceUid?: string): void {
  const phase = expectPhase(s, 'recruit');
  if (index !== null) {
    const recruit = phase.options[index];
    if (s.team.length >= CONFIG.team.maxSize) {
      const i = s.team.findIndex((c) => c.uid === replaceUid);
      if (i === -1) throw new Error('Team is full: choose a champion to replace');
      const [released] = s.team.splice(i, 1, recruit);
      s.bag.push(...released.itemIds);
    } else {
      s.team.push(recruit);
    }
  }
  s.phase = { kind: 'map' };
}

/** Take an item (or null to skip) and optionally give it to a champion; otherwise it goes in the bag. */
export function chooseItem(s: RunState, itemId: string | null, targetUid?: string): void {
  expectPhase(s, 'item');
  if (itemId) {
    s.bag.push(itemId);
    if (targetUid) equipFromBag(s, itemId, targetUid);
  }
  s.phase = { kind: 'map' };
}

export function chooseLevelUp(s: RunState, uid: string | null): void {
  expectPhase(s, 'levelup');
  const champ = s.team.find((c) => c.uid === uid);
  if (champ) setLevel(champ, champ.level + modeConfig(s).levelUpNodeLevels);
  s.phase = { kind: 'map' };
}

/** Dismisses an info screen (fountain, battle won, map complete) or leaves the shop. */
export function continueRun(s: RunState): void {
  switch (s.phase.kind) {
    case 'fountain':
    case 'battleWon':
      s.phase = { kind: 'map' };
      return;
    case 'mapComplete':
      if (modeConfig(s).shop) {
        withRng(s, (rng) => { s.phase = { kind: 'shop', offers: shopOffers(s, rng), rerolls: 0 }; });
        return;
      }
      nextMap(s);
      return;
    case 'shop':
      nextMap(s);
      return;
    default:
      throw new Error(`Nothing to continue from in phase ${s.phase.kind}`);
  }
}

function nextMap(s: RunState): void {
  s.mapIndex++;
  s.position = null;
  s.visited = [];
  withRng(s, (rng) => {
    s.map = generateMap(rng, s.mapIndex / s.totalMaps, excludedNodes(modeConfig(s)));
  });
  s.phase = { kind: 'map' };
}

// ── shop (Armory mode) ─────────────────────────────────────────────

/** Progress used for shop offers: the region just cleared, out of all regions. */
function shopProgress(s: RunState): number {
  return (s.mapIndex + 1) / s.totalMaps;
}

function rollTier(rng: Rng, progress: number): ItemTier {
  const { early, late } = CONFIG.armory.tierWeights;
  const t = clamp(progress, 0, 1);
  return rng.weighted({
    basic: early.basic + (late.basic - early.basic) * t,
    epic: early.epic + (late.epic - early.epic) * t,
    legendary: early.legendary + (late.legendary - early.legendary) * t,
  });
}

function shopOffers(s: RunState, rng: Rng): string[] {
  const offers: string[] = [];
  let guard = 0;
  while (offers.length < CONFIG.armory.shopOffers && guard++ < 200) {
    const id = rng.pick(itemIdsOfTier(rollTier(rng, shopProgress(s))));
    if (!offers.includes(id)) offers.push(id);
  }
  // Show cheapest first.
  return offers.sort((a, b) => ITEMS[a].cost - ITEMS[b].cost);
}

export function buyItem(s: RunState, offerIndex: number): void {
  const phase = expectPhase(s, 'shop');
  const id = phase.offers[offerIndex];
  if (!id) return;
  const cost = ITEMS[id].cost;
  if (s.gold < cost) throw new Error('Not enough gold');
  s.gold -= cost;
  s.bag.push(id);
  phase.offers[offerIndex] = null;
}

export function rerollCost(): number {
  return CONFIG.armory.rerollCost;
}

export function rerollShop(s: RunState): void {
  const phase = expectPhase(s, 'shop');
  if (s.gold < rerollCost()) throw new Error('Not enough gold');
  s.gold -= rerollCost();
  withRng(s, (rng) => {
    phase.offers = shopOffers(s, rng);
  });
  phase.rerolls++;
}

export function sellPrice(itemId: string): number {
  return Math.floor(ITEMS[itemId].cost * CONFIG.armory.sellRatio);
}

/** Sells an item from the bag. Only possible in the shop. */
export function sellItem(s: RunState, bagIndex: number): void {
  expectPhase(s, 'shop');
  const [id] = s.bag.splice(bagIndex, 1);
  if (id) s.gold += sellPrice(id);
}

// ── team management (allowed whenever the player is on the map) ────

export function moveChampion(s: RunState, uid: string, delta: -1 | 1): void {
  const i = s.team.findIndex((c) => c.uid === uid);
  const j = i + delta;
  if (i === -1 || j < 0 || j >= s.team.length) return;
  [s.team[i], s.team[j]] = [s.team[j], s.team[i]];
}

/**
 * Puts a bag item on a champion. `slot` picks which slot: an empty slot (or omitted) adds it,
 * an occupied slot swaps the old item back into the bag. With one slot, equipping always swaps.
 */
export function equipFromBag(s: RunState, itemId: string, uid: string, slot?: number): void {
  const bagIndex = s.bag.indexOf(itemId);
  const champ = s.team.find((c) => c.uid === uid);
  if (bagIndex === -1 || !champ) return;
  const slots = modeConfig(s).itemSlots;
  const target = slot ?? (champ.itemIds.length < slots ? champ.itemIds.length : slots - 1);
  if (target < 0 || target >= slots) return;
  s.bag.splice(bagIndex, 1);
  changeItems(champ, (ids) => {
    const previous = ids[target];
    if (previous) s.bag.push(previous);
    if (target < ids.length) ids[target] = itemId;
    else ids.push(itemId);
  });
}

export function unequip(s: RunState, uid: string, slot = 0): void {
  const champ = s.team.find((c) => c.uid === uid);
  const id = champ?.itemIds[slot];
  if (!champ || !id) return;
  s.bag.push(id);
  changeItems(champ, (ids) => ids.splice(slot, 1));
}

// ── helpers ────────────────────────────────────────────────────────

/** Changes held items while keeping missing HP the same (gaining max HP heals; losing it can't kill). */
function changeItems(champ: RunChampion, fn: (ids: string[]) => void): void {
  const oldMax = maxHpOf(champ);
  fn(champ.itemIds);
  const newMax = maxHpOf(champ);
  if (!champ.fainted) champ.hp = clamp(champ.hp + (newMax - oldMax), 1, newMax);
}

const SKIN_LINES = ['Star Guardian', 'PROJECT', 'Arcade', 'High Noon', 'Spirit Blossom', 'Pool Party', 'Blood Moon'];

function makeChampion(s: RunState, rng: Rng, defId: string, level: number): RunChampion {
  const champ: RunChampion = {
    uid: `c${s.nextUid++}`, defId, level, xp: 0, hp: 0, fainted: false, itemIds: [],
    skinLine: rng.chance(CONFIG.skinLine.chance) ? rng.pick(SKIN_LINES) : undefined,
  };
  champ.hp = maxHpOf(champ);
  return champ;
}

export function averageLevel(s: RunState): number {
  if (s.team.length === 0) return CONFIG.run.startLevel;
  return s.team.reduce((sum, c) => sum + c.level, 0) / s.team.length;
}

function runProgress(s: RunState, layer: number): number {
  return (s.mapIndex + layer / CONFIG.run.layers.length) / s.totalMaps;
}

function withRng(s: RunState, fn: (rng: Rng) => void): void {
  const rng = createRng(s.rngState);
  fn(rng);
  s.rngState = rng.state();
}

function expectPhase<K extends Phase['kind']>(s: RunState, kind: K): Extract<Phase, { kind: K }> {
  if (s.phase.kind !== kind) throw new Error(`Expected phase ${kind}, got ${s.phase.kind}`);
  return s.phase as Extract<Phase, { kind: K }>;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
