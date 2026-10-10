// Conquest meta-progression: Blue Essence, unlocked champions, rune pages and conquered regions.
// Pure logic on plain data. Actions mutate the state they're given; the UI clones first. Saving lives in core/save.ts.

import { CONFIG } from '../core/config';
import type { StatBonus } from '../core/types';
import { CHAMPIONS } from '../data/champions';
import {
  CONQUEST_REGIONS, RUNES, STARTING_CHAMPIONS, STARTING_REGION, conquestRegion, runeBonusOf,
} from '../data/conquest';
import type { ConquestReward, ConquestSetup, RunState } from './run';

export const META_VERSION = 1;

export interface MetaState {
  version: number;
  essence: number;
  /** Unlocked champion ids, in unlock order. */
  champions: string[];
  /** Rune ranks per champion id, then per rune id. */
  runes: Record<string, Record<string, number>>;
  /** Regions you can start a run in. */
  openRegions: string[];
  /** Regions conquered at least once. */
  conquered: string[];
  /** Lifetime stats, for the world map. */
  runsPlayed: number;
  essenceEarned: number;
}

export function newMeta(): MetaState {
  return {
    version: META_VERSION,
    essence: 0,
    champions: [...STARTING_CHAMPIONS],
    runes: {},
    openRegions: [STARTING_REGION],
    conquered: [],
    runsPlayed: 0,
    essenceEarned: 0,
  };
}

/** Repairs a loaded save: fills in missing fields and drops ids that no longer exist. */
export function sanitizeMeta(raw: unknown): MetaState {
  const base = newMeta();
  if (!raw || typeof raw !== 'object') return base;
  const m = raw as Partial<MetaState>;
  const regionIds = new Set(CONQUEST_REGIONS.map((r) => r.id));
  const runeIds = new Set(RUNES.map((r) => r.id));
  const ids = (list: unknown, valid: (id: string) => boolean) =>
    Array.isArray(list) ? [...new Set(list.filter((id): id is string => typeof id === 'string' && valid(id)))] : [];
  const champions = ids(m.champions, (id) => id in CHAMPIONS);
  const runes: MetaState['runes'] = {};
  for (const [champ, page] of Object.entries(m.runes ?? {})) {
    if (!(champ in CHAMPIONS) || !page || typeof page !== 'object') continue;
    for (const [rune, rank] of Object.entries(page)) {
      if (runeIds.has(rune) && typeof rank === 'number' && rank > 0) {
        (runes[champ] ??= {})[rune] = Math.min(CONFIG.conquest.maxRuneRank, Math.floor(rank));
      }
    }
  }
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  return {
    version: META_VERSION,
    essence: num(m.essence),
    champions: champions.length ? [...new Set([...STARTING_CHAMPIONS, ...champions])] : base.champions,
    runes,
    openRegions: [...new Set([STARTING_REGION, ...ids(m.openRegions, (id) => regionIds.has(id))])],
    conquered: ids(m.conquered, (id) => regionIds.has(id)),
    runsPlayed: num(m.runsPlayed),
    essenceEarned: num(m.essenceEarned),
  };
}

// ── champions ──────────────────────────────────────────────────────

export function unlockCost(defId: string): number {
  return CONFIG.conquest.unlockCost[CHAMPIONS[defId].rarity];
}

export function isUnlocked(m: MetaState, defId: string): boolean {
  return m.champions.includes(defId);
}

export function unlockChampion(m: MetaState, defId: string): void {
  if (isUnlocked(m, defId)) return;
  const cost = unlockCost(defId);
  if (m.essence < cost) throw new Error('Not enough essence');
  m.essence -= cost;
  m.champions.push(defId);
}

// ── runes ──────────────────────────────────────────────────────────

export function runeRank(m: MetaState, defId: string, runeId: string): number {
  return m.runes[defId]?.[runeId] ?? 0;
}

/** Cost of the next rank of a rune, or null at max rank. */
export function runeUpgradeCost(m: MetaState, defId: string, runeId: string): number | null {
  const rank = runeRank(m, defId, runeId);
  return rank >= CONFIG.conquest.maxRuneRank ? null : CONFIG.conquest.runeRankCost * (rank + 1);
}

export function upgradeRune(m: MetaState, defId: string, runeId: string): void {
  if (!isUnlocked(m, defId)) throw new Error('Champion is locked');
  const cost = runeUpgradeCost(m, defId, runeId);
  if (cost === null) throw new Error('Rune is at max rank');
  if (m.essence < cost) throw new Error('Not enough essence');
  m.essence -= cost;
  (m.runes[defId] ??= {})[runeId] = runeRank(m, defId, runeId) + 1;
}

/** Total rune ranks on a champion: the number regions recommend. */
export function runePower(m: MetaState, defId: string): number {
  return Object.values(m.runes[defId] ?? {}).reduce((sum, r) => sum + r, 0);
}

export function maxRunePower(): number {
  return RUNES.length * CONFIG.conquest.maxRuneRank;
}

export function runeBonus(m: MetaState, defId: string): StatBonus {
  return runeBonusOf(m.runes[defId] ?? {});
}

// ── regions and runs ───────────────────────────────────────────────

export type RegionStatus = 'locked' | 'open' | 'conquered';

export function regionStatus(m: MetaState, regionId: string): RegionStatus {
  if (m.conquered.includes(regionId)) return 'conquered';
  return m.openRegions.includes(regionId) ? 'open' : 'locked';
}

export function conquestSetup(m: MetaState, regionId: string): ConquestSetup {
  if (regionStatus(m, regionId) === 'locked') throw new Error(`Region ${regionId} is locked`);
  return {
    regionId,
    roster: [...m.champions],
    runes: Object.fromEntries(m.champions.map((id) => [id, runeBonus(m, id)])),
  };
}

/**
 * Banks a finished Conquest run: essence from fights, plus the conquest bonuses on a win, and opens the next regions.
 * Marks the run as settled so it can't pay out twice. Returns the reward (also stored on the run).
 */
export function settleRun(m: MetaState, run: RunState): ConquestReward | null {
  const c = run.conquest;
  if (!c || c.settled) return c?.settled ?? null;
  if (run.phase.kind !== 'victory' && run.phase.kind !== 'gameOver') throw new Error('The run has not ended');
  const region = conquestRegion(c.regionId);
  const won = run.phase.kind === 'victory';
  const first = won && !m.conquered.includes(region.id);
  const clear = won ? Math.round(CONFIG.conquest.clearBonus * region.essenceMultiplier) : 0;
  const firstClear = first ? Math.round(CONFIG.conquest.firstClearBonus * region.essenceMultiplier) : 0;
  const total = c.essence + clear + firstClear;
  const newRegions = won ? region.unlocks.filter((id) => !m.openRegions.includes(id)) : [];

  m.essence += total;
  m.essenceEarned += total;
  m.runsPlayed++;
  if (first) m.conquered.push(region.id);
  m.openRegions.push(...newRegions);

  c.settled = { battles: c.essence, clear, firstClear, total, newRegions };
  return c.settled;
}
