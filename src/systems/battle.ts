// Headless, deterministic auto-battler. Sequential 1v1: each side's front champion fights until
// knocked out, then the next one in team order steps in. Produces an event log for the UI to replay.

import { CONFIG } from '../core/config';
import { createRng, type Rng } from '../core/rng';
import type {
  AbilityDef, BuffSpec, ChampionDef, DamageSpec, DamageType, HealSpec, ItemDef, ItemEffects, Region, Side, Stats, StatKey,
} from '../core/types';
import { ITEMS } from '../data/items';
import { classMultiplier, type Effectiveness, effectivenessOf, mitigate } from './damage';
import { abilityLevelFactor, computeStats, itemStatScale, ultimateRank } from './stats';
import { regionTiers, regionValue } from './synergies';

export interface BattleUnit {
  uid: string;
  def: ChampionDef;
  level: number;
  itemIds?: string[];
  skinLine?: string;
  /** Starting HP; defaults to max. */
  hp?: number;
}

export type BattleEvent =
  | { t: 'enter'; side: Side; slot: number }
  | { t: 'turn'; n: number }
  | { t: 'cast'; side: Side; slot: number; key: AbilityDef['key'] | 'AA'; name: string }
  | { t: 'damage'; side: Side; slot: number; amount: number; hp: number; shield: number; crit: boolean;
      effect: Effectiveness; dmgType: DamageType; source: DamageSource }
  | { t: 'heal'; side: Side; slot: number; amount: number; hp: number }
  | { t: 'shield'; side: Side; slot: number; amount: number; shield: number }
  | { t: 'stun'; side: Side; slot: number; turns: number }
  | { t: 'stunned'; side: Side; slot: number }
  | { t: 'buff'; side: Side; slot: number; stat: StatKey; pct: number }
  | { t: 'stasis'; side: Side; slot: number }
  | { t: 'dodge'; side: Side; slot: number }
  /** A region bonus triggered for this champion (the effect itself follows as its own event). */
  | { t: 'region'; side: Side; slot: number; region: Region }
  | { t: 'revive'; side: Side; slot: number; hp: number }
  | { t: 'execute'; side: Side; slot: number }
  | { t: 'ko'; side: Side; slot: number }
  | { t: 'end'; winner: Side; turns: number };

export interface UnitOutcome {
  uid: string;
  hp: number;
  fainted: boolean;
}

export interface BattleResult {
  winner: Side;
  turns: number;
  events: BattleEvent[];
  player: UnitOutcome[];
  enemy: UnitOutcome[];
  /** Active region tiers per side. */
  regions: Record<Side, Partial<Record<Region, number>>>;
}

export type DamageSource = 'hit' | 'dot' | 'reflect' | 'burn' | 'bonus';

interface Buff extends BuffSpec { remaining: number }
interface Dot { perTurn: number; type: DamageType; remaining: number; tag?: 'zaun' | 'burn' }

interface Fighter {
  side: Side;
  slot: number;
  unit: BattleUnit;
  def: ChampionDef;
  items: ItemDef[];
  /** Combined effects of all held items. */
  fx: ItemEffects;
  stats: Stats;
  maxHp: number;
  hp: number;
  shield: number;
  levelFactor: number;
  ultRank: number;
  cooldowns: Map<AbilityDef['key'], number>;
  stunned: number;
  buffs: Buff[];
  dots: Dot[];
  reviveUsed: boolean;
  stasisUsed: boolean;
  stasisActive: boolean;
  /** This champion's own region bonus value (0 when its region isn't active). */
  regionBonus: number;
  regionReviveUsed: boolean;
  hasActed: boolean;
  lowHpShieldUsed: boolean;
}

const BASIC_ATTACK: DamageSpec = { base: 0, adRatio: 1, type: 'physical', canCrit: true };

export function simulateBattle(opts: { player: BattleUnit[]; enemy: BattleUnit[]; seed: number }): BattleResult {
  return new Battle(opts.player, opts.enemy, createRng(opts.seed)).run();
}

class Battle {
  private events: BattleEvent[] = [];
  private teams: Record<Side, Fighter[]>;
  private active: Record<Side, number> = { player: 0, enemy: 0 };
  private regions: Record<Side, Partial<Record<Region, number>>>;

  constructor(player: BattleUnit[], enemy: BattleUnit[], private rng: Rng) {
    if (player.length === 0 || enemy.length === 0) throw new Error('Both teams need at least one champion');
    this.regions = {
      player: regionTiers(player.map((u) => u.def.id)),
      enemy: regionTiers(enemy.map((u) => u.def.id)),
    };
    this.teams = {
      player: player.map((u, i) => makeFighter('player', i, u, this.regions.player)),
      enemy: enemy.map((u, i) => makeFighter('enemy', i, u, this.regions.enemy)),
    };
  }

  run(): BattleResult {
    // Skip any unit that starts at 0 HP.
    for (const side of ['player', 'enemy'] as Side[]) {
      this.active[side] = this.teams[side].findIndex((f) => f.hp > 0);
      if (this.active[side] === -1) return this.finish(side === 'player' ? 'enemy' : 'player', 0);
      this.enter(side, this.active[side]);
    }

    for (let turn = 1; turn <= CONFIG.battle.maxTurns; turn++) {
      this.log({ t: 'turn', n: turn });
      const p = this.current('player');
      const e = this.current('enemy');
      for (const actor of this.turnOrder(p, e)) {
        // The actor may have been knocked out earlier this turn.
        if (actor.hp <= 0 || this.current(actor.side) !== actor) continue;
        this.act(actor, this.current(other(actor.side)));
        if (this.resolveKOs()) return this.finish(this.winner(), turn);
      }
      this.endOfTurn();
      if (this.resolveKOs()) return this.finish(this.winner(), turn);
    }
    return this.finish('enemy', CONFIG.battle.maxTurns);
  }

  // ── turn structure ───────────────────────────────────────────────

  private turnOrder(a: Fighter, b: Fighter): Fighter[] {
    const sa = stat(a, 'speed');
    const sb = stat(b, 'speed');
    if (sa === sb) return this.rng.chance(0.5) ? [a, b] : [b, a];
    return sa > sb ? [a, b] : [b, a];
  }

  private act(actor: Fighter, target: Fighter): void {
    for (const [key, cd] of actor.cooldowns) actor.cooldowns.set(key, Math.max(0, cd - 1));

    if (actor.stunned > 0) {
      actor.stunned--;
      this.log({ t: 'stunned', side: actor.side, slot: actor.slot });
      return;
    }

    const ability = this.chooseAbility(actor);
    this.log({
      t: 'cast', side: actor.side, slot: actor.slot,
      key: ability ? ability.key : 'AA', name: ability ? ability.name : 'Attack',
    });

    if (ability) actor.cooldowns.set(ability.key, ability.cooldown + 1);

    if (target.stasisActive) {
      target.stasisActive = false;
      this.log({ t: 'stasis', side: target.side, slot: target.slot });
      actor.hasActed = true;
      return;
    }
    if (this.isRegion(target, 'Ionia') && this.rng.chance(target.regionBonus)) {
      this.log({ t: 'region', side: target.side, slot: target.slot, region: 'Ionia' });
      this.log({ t: 'dodge', side: target.side, slot: target.slot });
      actor.hasActed = true;
      return;
    }

    if (ability) this.castAbility(actor, target, ability);
    else this.basicAttack(actor, target);
    actor.hasActed = true;

    if (target.hp > 0 && actor.hp > 0) this.afterAction(actor, target);
  }

  /** Effects that trigger on every action: Freljord chill, Zaun poison, slowing items. */
  private afterAction(actor: Fighter, target: Fighter): void {
    if (actor.fx.slowOnHit) this.buff(target, { stat: 'speed', pct: -actor.fx.slowOnHit, turns: 2 });
    if (this.isRegion(actor, 'Freljord')) {
      this.buff(target, { stat: 'speed', pct: -actor.regionBonus, turns: 2 });
    }
    if (this.isRegion(actor, 'Zaun')) {
      target.dots = target.dots.filter((d) => d.tag !== 'zaun');
      target.dots.push({ perTurn: target.maxHp * actor.regionBonus, type: 'magic', remaining: 3, tag: 'zaun' });
    }
  }

  private enter(side: Side, slot: number): void {
    this.active[side] = slot;
    this.log({ t: 'enter', side, slot });
    const f = this.teams[side][slot];
    if (this.isRegion(f, 'Demacia')) {
      const amount = Math.round(f.maxHp * f.regionBonus);
      f.shield += amount;
      this.log({ t: 'region', side, slot, region: 'Demacia' });
      this.log({ t: 'shield', side, slot, amount, shield: f.shield });
    }
  }

  private isRegion(f: Fighter, region: Region): boolean {
    return f.regionBonus > 0 && f.def.region === region;
  }

  private chooseAbility(actor: Fighter): AbilityDef | undefined {
    const options = actor.ultRank > 0 ? [actor.def.ultimate, ...actor.def.abilities] : actor.def.abilities;
    return options.find((a) => {
      if ((actor.cooldowns.get(a.key) ?? 0) > 0) return false;
      if (a.castBelowHp !== undefined && actor.hp / actor.maxHp > a.castBelowHp) return false;
      return true;
    });
  }

  private basicAttack(actor: Fighter, target: Fighter): void {
    const dealt = this.hit(actor, target, BASIC_ATTACK, 1);
    const onHit = actor.fx.onHitCurrentHp;
    if (onHit && target.hp > 0) {
      this.applyDamage(actor, target, target.hp * onHit, 'physical', false, 'hit');
    }
    if (actor.fx.onHitTrue && target.hp > 0) {
      this.applyDamage(actor, target, actor.fx.onHitTrue * itemStatScale(actor.unit.level), 'true', false, 'bonus');
    }
    this.lifesteal(actor, dealt, 0);
  }

  private castAbility(actor: Fighter, target: Fighter, ability: AbilityDef): void {
    const scale = actor.levelFactor * (ability.key === 'R' ? CONFIG.abilities.ultimateRankScale[actor.ultRank - 1] : 1);

    let dealt = 0;
    if (ability.damage) dealt = this.hit(actor, target, ability.damage, scale);
    this.lifesteal(actor, dealt, ability.lifesteal ?? 0);

    if (ability.heal) this.heal(actor, healAmount(actor, ability.heal, scale));
    if (ability.shield) {
      const amount = Math.round(healAmount(actor, ability.shield, scale));
      actor.shield += amount;
      this.log({ t: 'shield', side: actor.side, slot: actor.slot, amount, shield: actor.shield });
    }
    if (ability.selfBuff) this.buff(actor, ability.selfBuff);
    if (target.hp <= 0) return;
    if (ability.targetDebuff) this.buff(target, ability.targetDebuff);
    if (ability.stun) {
      target.stunned = Math.max(target.stunned, ability.stun);
      this.log({ t: 'stun', side: target.side, slot: target.slot, turns: ability.stun });
    }
    if (ability.dot) {
      const d = ability.dot;
      const perTurn = (d.base ?? 0) * scale + (d.apRatio ?? 0) * stat(actor, 'ap') + (d.maxHpRatio ?? 0) * target.maxHp;
      target.dots.push({ perTurn, type: d.type, remaining: d.turns });
    }
    if (actor.fx.burnOnAbility) {
      target.dots = target.dots.filter((d) => d.tag !== 'burn');
      target.dots.push({ perTurn: target.maxHp * actor.fx.burnOnAbility, type: 'magic', remaining: 3, tag: 'burn' });
    }
  }

  /** Resolves every hit of a damage spec. Returns total damage dealt to HP and shields. */
  private hit(actor: Fighter, target: Fighter, spec: DamageSpec, scale: number): number {
    let total = 0;
    for (let i = 0; i < (spec.hits ?? 1); i++) {
      if (target.hp <= 0) break;
      let raw = spec.base * scale
        + (spec.adRatio ?? 0) * stat(actor, 'ad')
        + (spec.apRatio ?? 0) * stat(actor, 'ap')
        + (spec.armorRatio ?? 0) * stat(actor, 'armor')
        + (spec.targetMaxHpRatio ?? 0) * target.maxHp
        + (spec.targetMissingHpRatio ?? 0) * (target.maxHp - target.hp);
      const canCrit = !!spec.canCrit || this.isRegion(actor, 'Bilgewater');
      const crit = canCrit && this.rng.chance(stat(actor, 'crit'));
      if (crit) raw *= (CONFIG.battle.critMultiplier + (actor.fx.critDamage ?? 0)) * (1 - (target.fx.critReduction ?? 0));
      raw *= classMultiplier(actor.def, target.def);
      if (this.isRegion(actor, 'Noxus') && target.hp / target.maxHp < 0.5) raw *= 1 + actor.regionBonus;
      if (this.isRegion(actor, 'Piltover') && !actor.hasActed) raw *= 1 + actor.regionBonus;
      const v = CONFIG.battle.damageVariance;
      raw *= 1 - v + this.rng.next() * 2 * v;
      const dealt = this.applyDamage(actor, target, raw, spec.type, crit, 'hit');
      total += dealt;
      if (this.isRegion(actor, 'Void') && target.hp > 0) {
        total += this.applyDamage(actor, target, dealt * actor.regionBonus, 'true', false, 'bonus');
      }

      const execute = actor.fx.execute;
      if (execute && target.hp > 0 && target.hp / target.maxHp < execute) {
        target.hp = 0;
        this.log({ t: 'execute', side: target.side, slot: target.slot });
      }
    }
    return total;
  }

  /** Mitigates, absorbs with shields, applies HP loss and on-damage item effects. */
  private applyDamage(
    source: Fighter, target: Fighter, raw: number, type: DamageType, crit: boolean, kind: DamageSource,
  ): number {
    let amount = Math.max(1, Math.round(mitigate(raw, type, target, source.fx)));
    const total = amount;
    const absorbed = Math.min(target.shield, amount);
    target.shield -= absorbed;
    amount -= absorbed;
    target.hp = Math.max(0, target.hp - amount);
    this.log({
      t: 'damage', side: target.side, slot: target.slot, amount: total, hp: target.hp, shield: target.shield,
      crit, effect: kind === 'hit' ? effectivenessOf(source.def, target.def) : 'neutral', dmgType: type, source: kind,
    });

    if (target.fx.lowHpShield && !target.lowHpShieldUsed && target.hp > 0 && target.hp / target.maxHp < 0.4) {
      target.lowHpShieldUsed = true;
      const shield = Math.round(target.maxHp * target.fx.lowHpShield);
      target.shield += shield;
      this.log({ t: 'shield', side: target.side, slot: target.slot, amount: shield, shield: target.shield });
    }
    if (target.fx.stasisOnce && !target.stasisUsed && target.hp > 0 && target.hp / target.maxHp < 0.3) {
      target.stasisUsed = true;
      target.stasisActive = true;
    }
    const reflect = target.fx.reflectPhysical;
    if (reflect && type === 'physical' && kind === 'hit' && source.hp > 0) {
      this.applyDamage(target, source, total * reflect, 'true', false, 'reflect');
    }
    return total;
  }

  private lifesteal(actor: Fighter, dealt: number, abilityLifesteal: number): void {
    const ratio = abilityLifesteal + (actor.fx.lifesteal ?? 0);
    if (ratio > 0 && dealt > 0 && actor.hp > 0) this.heal(actor, dealt * ratio);
  }

  private heal(f: Fighter, raw: number): void {
    // Grievous wounds from the opponent's items cut healing.
    const foe = this.current(other(f.side));
    const amp = (1 + (f.fx.healingAmp ?? 0)) * (1 - (foe.fx.antiHeal ?? 0));
    const amount = Math.min(f.maxHp - f.hp, Math.round(raw * amp));
    if (amount <= 0) return;
    f.hp += amount;
    this.log({ t: 'heal', side: f.side, slot: f.slot, amount, hp: f.hp });
  }

  private buff(f: Fighter, spec: BuffSpec): void {
    f.buffs.push({ ...spec, remaining: spec.turns });
    this.log({ t: 'buff', side: f.side, slot: f.slot, stat: spec.stat, pct: spec.pct });
  }

  private endOfTurn(): void {
    for (const side of ['player', 'enemy'] as Side[]) {
      const f = this.current(side);
      const foe = this.current(other(side));
      if (f.hp <= 0) continue;

      for (const dot of f.dots) {
        if (f.hp <= 0) break;
        this.applyDamage(foe, f, dot.perTurn, dot.type, false, 'dot');
        dot.remaining--;
      }
      f.dots = f.dots.filter((d) => d.remaining > 0);

      const burn = f.fx.burnSelfMaxHp;
      if (burn && foe.hp > 0) this.applyDamage(f, foe, f.maxHp * burn, 'magic', false, 'burn');

      const regen = f.fx.regenMaxHp;
      if (regen && f.hp > 0) this.heal(f, f.maxHp * regen);

      for (const b of f.buffs) b.remaining--;
      f.buffs = f.buffs.filter((b) => b.remaining > 0);
    }
  }

  /** Handles revives, KOs and replacements. Returns true when one side has nobody left. */
  private resolveKOs(): boolean {
    for (const side of ['player', 'enemy'] as Side[]) {
      const f = this.current(side);
      if (f.hp > 0) continue;
      const revive = f.fx.reviveOnce;
      if (revive && !f.reviveUsed) {
        f.reviveUsed = true;
        this.revive(f, revive);
        continue;
      }
      if (this.isRegion(f, 'Shurima') && !f.regionReviveUsed) {
        f.regionReviveUsed = true;
        this.log({ t: 'region', side, slot: f.slot, region: 'Shurima' });
        this.revive(f, f.regionBonus);
        continue;
      }
      this.log({ t: 'ko', side, slot: f.slot });

      const killer = this.current(other(side));
      if (killer.hp > 0 && this.isRegion(killer, 'ShadowIsles')) {
        this.log({ t: 'region', side: killer.side, slot: killer.slot, region: 'ShadowIsles' });
        this.heal(killer, killer.maxHp * killer.regionBonus);
      }

      const next = this.teams[side].findIndex((g, i) => i > f.slot && g.hp > 0);
      if (next === -1) return true;
      this.enter(side, next);
    }
    return false;
  }

  private revive(f: Fighter, hpFraction: number): void {
    f.hp = Math.round(f.maxHp * hpFraction);
    f.dots = [];
    f.stunned = 0;
    this.log({ t: 'revive', side: f.side, slot: f.slot, hp: f.hp });
  }

  // ── helpers ──────────────────────────────────────────────────────

  private current(side: Side): Fighter {
    return this.teams[side][this.active[side]];
  }

  private winner(): Side {
    return this.current('player').hp > 0 ? 'player' : 'enemy';
  }

  private finish(winner: Side, turns: number): BattleResult {
    this.log({ t: 'end', winner, turns });
    const outcome = (side: Side): UnitOutcome[] =>
      this.teams[side].map((f) => ({ uid: f.unit.uid, hp: f.hp, fainted: f.hp <= 0 }));
    return {
      winner, turns, events: this.events, player: outcome('player'), enemy: outcome('enemy'), regions: this.regions,
    };
  }

  private log(e: BattleEvent): void {
    this.events.push(e);
  }
}

function makeFighter(side: Side, slot: number, unit: BattleUnit, tiers: Partial<Record<Region, number>>): Fighter {
  const stats = computeStats(unit.def, unit.level, unit.itemIds, unit.skinLine);
  const items = (unit.itemIds ?? []).map((id) => ITEMS[id]);
  const regionBonus = regionValue(unit.def.region, tiers[unit.def.region]);
  if (unit.def.region === 'Piltover') stats.speed *= 1 + regionBonus;
  if (unit.def.region === 'Bilgewater') stats.crit = Math.min(1, stats.crit + regionBonus);
  return {
    side, slot, unit, def: unit.def, stats,
    items,
    fx: combineEffects(items),
    maxHp: stats.hp,
    hp: Math.min(stats.hp, unit.hp ?? stats.hp),
    shield: 0,
    levelFactor: abilityLevelFactor(unit.level),
    ultRank: ultimateRank(unit.level),
    cooldowns: new Map(),
    stunned: 0,
    buffs: [],
    dots: [],
    reviveUsed: false,
    stasisUsed: false,
    stasisActive: false,
    regionBonus,
    regionReviveUsed: false,
    lowHpShieldUsed: false,
    hasActed: false,
  };
}

/**
 * Combines several items' effects. Most numbers add up (with sensible caps); one-off effects
 * (revive, grievous wounds) use the strongest copy instead of stacking.
 */
export function combineEffects(items: ItemDef[]): ItemEffects {
  const out: ItemEffects = {};
  const strongest = new Set<keyof ItemEffects>(['reviveOnce', 'antiHeal', 'lowHpShield', 'execute']);
  for (const item of items) {
    for (const [key, value] of Object.entries(item.effects ?? {}) as [keyof ItemEffects, number | boolean][]) {
      if (typeof value === 'boolean') (out as Record<string, unknown>)[key] = value || !!out[key];
      else if (strongest.has(key)) (out as Record<string, number>)[key] = Math.max((out[key] as number) ?? 0, value);
      else (out as Record<string, number>)[key] = ((out[key] as number) ?? 0) + value;
    }
  }
  const cap = (key: keyof ItemEffects, max: number) => {
    if (typeof out[key] === 'number') (out as Record<string, number>)[key] = Math.min(max, out[key] as number);
  };
  cap('armorPen', 0.6);
  cap('magicPen', 0.6);
  cap('critReduction', 0.6);
  cap('slowOnHit', 0.5);
  cap('lifesteal', 0.4);
  return out;
}

/** A stat with active buffs applied. Never drops below 10% of the base value. */
function stat(f: Fighter, key: StatKey): number {
  const pct = f.buffs.filter((b) => b.stat === key).reduce((sum, b) => sum + b.pct, 0);
  return f.stats[key] * Math.max(0.1, 1 + pct);
}

function healAmount(f: Fighter, spec: HealSpec, scale: number): number {
  return spec.base * scale
    + (spec.apRatio ?? 0) * stat(f, 'ap')
    + (spec.adRatio ?? 0) * stat(f, 'ad')
    + (spec.maxHpRatio ?? 0) * f.maxHp;
}

function other(side: Side): Side {
  return side === 'player' ? 'enemy' : 'player';
}
