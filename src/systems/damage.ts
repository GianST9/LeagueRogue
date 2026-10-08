import { CLASS_COUNTERS, CONFIG } from '../core/config';
import type { ChampionDef, DamageType, ItemEffects, Stats, StatKey } from '../core/types';

export type Effectiveness = 'strong' | 'weak' | 'neutral';

/** Attacker's primary class against each of the defender's classes, multiplied together. */
export function classMultiplier(attacker: ChampionDef, defender: ChampionDef): number {
  const chart = CLASS_COUNTERS[attacker.classes[0]];
  let mult = 1;
  for (const cls of defender.classes) {
    if (chart.strong.includes(cls)) mult *= CONFIG.battle.strongMultiplier;
    if (chart.weak.includes(cls)) mult *= CONFIG.battle.weakMultiplier;
  }
  return mult;
}

export function effectivenessOf(attacker: ChampionDef, defender: ChampionDef): Effectiveness {
  const mult = classMultiplier(attacker, defender);
  if (mult > 1.001) return 'strong';
  if (mult < 0.999) return 'weak';
  return 'neutral';
}

/** LoL-style resist formula: damage × 100 / (100 + resist). Penetration lowers the resist first. */
export function mitigate(
  raw: number,
  type: DamageType,
  target: { stats: Stats; buffs: { stat: StatKey; pct: number }[] },
  attackerEffects?: ItemEffects,
): number {
  if (type === 'true') return raw;
  const key: StatKey = type === 'physical' ? 'armor' : 'mr';
  const pen = type === 'physical' ? attackerEffects?.armorPen ?? 0 : attackerEffects?.magicPen ?? 0;
  const buffPct = target.buffs.filter((b) => b.stat === key).reduce((sum, b) => sum + b.pct, 0);
  const resist = target.stats[key] * Math.max(0.1, 1 + buffPct) * (1 - pen);
  return raw * (100 / (100 + Math.max(0, resist)));
}
