// Turns the battle event log into a displayable state, one event at a time.

import type { AbilityDef, Region, Side } from '../core/types';
import { championDef } from '../data/bosses';
import { REGIONS } from '../data/regions';
import type { BattleEvent } from '../systems/battle';
import { computeStats } from '../systems/stats';

type AbilityKey = AbilityDef['key'];

export interface UnitView {
  uid: string;
  defId: string;
  level: number;
  itemIds: string[];
  skinLine?: string;
  maxHp: number;
  hp: number;
  shield: number;
  fainted: boolean;
  stunned: boolean;
  /**
   * Mirrors the engine's cooldown counters: set to cooldown + 1 on cast and reduced by 1 at the start of each of
   * the champion's own actions. An ability is ready when its counter is 1 or less.
   */
  cooldowns: Partial<Record<AbilityKey, number>>;
  /** Last ability key used, for highlighting. */
  lastCast?: AbilityKey | 'AA';
}

export interface FloatText {
  id: number;
  side: Side;
  text: string;
  kind: 'damage' | 'crit' | 'heal' | 'shield' | 'status' | 'strong' | 'weak' | 'region' | 'true';
}

export interface BattleView {
  units: Record<Side, UnitView[]>;
  active: Record<Side, number>;
  turn: number;
  /** Which side's active champion is acting / was just hit, for animations. */
  acting: Side | null;
  hit: Side | null;
  floats: FloatText[];
  log: string[];
  winner: Side | null;
}

export interface UnitSource {
  uid: string;
  defId: string;
  level: number;
  itemIds?: string[];
  skinLine?: string;
  hp?: number;
}

export function initialView(player: UnitSource[], enemy: UnitSource[]): BattleView {
  const toView = (u: UnitSource): UnitView => {
    const maxHp = computeStats(championDef(u.defId), u.level, u.itemIds, u.skinLine).hp;
    return {
      uid: u.uid, defId: u.defId, level: u.level, itemIds: u.itemIds ?? [], skinLine: u.skinLine,
      maxHp, hp: Math.min(maxHp, u.hp ?? maxHp), shield: 0, fainted: false, stunned: false, cooldowns: {},
    };
  };
  return {
    units: { player: player.map(toView), enemy: enemy.map(toView) },
    active: { player: -1, enemy: -1 },
    turn: 0, acting: null, hit: null, floats: [], log: [], winner: null,
  };
}

/** Turns of waiting left before an ability can be used again (0 = ready). */
export function turnsUntilReady(u: UnitView, key: AbilityKey): number {
  return Math.max(0, (u.cooldowns[key] ?? 0) - 1);
}

let floatId = 0;
const LOG_LINES = 5;

/** Returns a new view with the event applied. */
export function applyEvent(prev: BattleView, e: BattleEvent): BattleView {
  const v: BattleView = {
    ...prev,
    units: {
      player: prev.units.player.map((u) => ({ ...u, cooldowns: { ...u.cooldowns } })),
      enemy: prev.units.enemy.map((u) => ({ ...u, cooldowns: { ...u.cooldowns } })),
    },
    active: { ...prev.active },
    acting: null,
    hit: null,
  };
  const unit = (side: Side, slot: number) => v.units[side][slot];
  const float = (side: Side, text: string, kind: FloatText['kind']) => {
    v.floats = [...v.floats.slice(-8), { id: ++floatId, side, text, kind }];
  };
  const tickCooldowns = (u: UnitView) => {
    for (const key of Object.keys(u.cooldowns) as AbilityKey[]) u.cooldowns[key] = Math.max(0, u.cooldowns[key]! - 1);
  };
  const text = describe(e, v);
  if (text) v.log = [...v.log, text].slice(-LOG_LINES);

  switch (e.t) {
    case 'turn': v.turn = e.n; break;
    case 'enter': v.active[e.side] = e.slot; break;
    case 'cast': {
      const u = unit(e.side, e.slot);
      v.acting = e.side;
      u.stunned = false;
      tickCooldowns(u);
      u.lastCast = e.key;
      if (e.key !== 'AA') {
        const def = championDef(u.defId);
        const ability = [...def.abilities, def.ultimate].find((a) => a.key === e.key)!;
        u.cooldowns[e.key] = ability.cooldown + 1;
      }
      break;
    }
    case 'damage': {
      const u = unit(e.side, e.slot);
      u.hp = e.hp;
      u.shield = e.shield;
      v.hit = e.side;
      const kind = e.crit ? 'crit' : e.source === 'bonus' ? 'true' : 'damage';
      float(e.side, `-${e.amount}`, kind);
      if (e.source === 'hit' && e.effect !== 'neutral') float(e.side, e.effect === 'strong' ? 'Strong!' : 'Resisted', e.effect);
      break;
    }
    case 'heal': unit(e.side, e.slot).hp = e.hp; float(e.side, `+${e.amount}`, 'heal'); break;
    case 'shield': unit(e.side, e.slot).shield = e.shield; float(e.side, `🛡 ${e.amount}`, 'shield'); break;
    case 'stun': unit(e.side, e.slot).stunned = true; float(e.side, 'Stunned!', 'status'); break;
    case 'stunned': {
      const u = unit(e.side, e.slot);
      u.stunned = false;
      tickCooldowns(u);
      break;
    }
    case 'stasis': float(e.side, 'Stasis!', 'status'); break;
    case 'dodge': float(e.side, 'Dodged!', 'status'); break;
    case 'region': float(e.side, REGIONS[e.region].name, 'region'); break;
    case 'revive': {
      const u = unit(e.side, e.slot);
      u.hp = e.hp;
      u.fainted = false;
      float(e.side, 'Revived!', 'heal');
      break;
    }
    case 'execute': unit(e.side, e.slot).hp = 0; float(e.side, 'Executed!', 'status'); break;
    case 'ko': {
      const u = unit(e.side, e.slot);
      u.fainted = true;
      u.hp = 0;
      break;
    }
    case 'buff': break;
    case 'end': v.winner = e.winner; break;
  }
  return v;
}

/** Milliseconds to linger on an event at 1× speed. */
export function eventDelay(e: BattleEvent): number {
  switch (e.t) {
    case 'turn': return 80;
    case 'enter': return 550;
    case 'cast': return 380;
    case 'damage': return e.source === 'hit' ? 420 : 300;
    case 'ko': return 700;
    case 'revive': return 650;
    case 'execute': return 500;
    case 'stunned': return 380;
    case 'stasis': case 'dodge': return 400;
    case 'region': return 250;
    case 'heal': case 'shield': case 'stun': return 300;
    case 'buff': return 150;
    case 'end': return 0;
  }
}

function describe(e: BattleEvent, v: BattleView): string | null {
  const name = (side: Side, slot: number) => {
    const n = championDef(v.units[side][slot].defId).name;
    return side === 'player' ? n : `Enemy ${n}`;
  };
  const regionText: Partial<Record<Region, string>> = {
    Demacia: 'is shielded by Demacia',
    Ionia: 'dodges with Ionian grace',
    Shurima: 'rises again with the power of Shurima',
    ShadowIsles: 'feeds on the Black Mist',
  };
  switch (e.t) {
    case 'enter': return `${name(e.side, e.slot)} enters the fight.`;
    case 'cast': return e.key === 'AA' ? null : `${name(e.side, e.slot)} uses ${e.name}!`;
    case 'stunned': return `${name(e.side, e.slot)} is stunned and can't act.`;
    case 'stasis': return `${name(e.side, e.slot)} goes into stasis!`;
    case 'region': return regionText[e.region] ? `${name(e.side, e.slot)} ${regionText[e.region]}!` : null;
    case 'revive': return `${name(e.side, e.slot)} is revived!`;
    case 'execute': return `${name(e.side, e.slot)} is executed!`;
    case 'ko': return `${name(e.side, e.slot)} is knocked out!`;
    default: return null;
  }
}
