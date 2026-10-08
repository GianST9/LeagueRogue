import { CONFIG } from '../core/config';
import type { ChampionDef, Stats, StatKey } from '../core/types';
import { ARCHETYPES } from '../data/classes';
import { ITEMS } from '../data/items';

const STAT_KEYS: StatKey[] = ['hp', 'ad', 'ap', 'armor', 'mr', 'speed', 'crit'];
const SKIN_BUFFED: StatKey[] = ['hp', 'ad', 'ap', 'armor', 'mr'];

/** Final stats for a champion at a level, including its item and skin-line bonus. */
export function computeStats(def: ChampionDef, level: number, itemIds: readonly string[] = [], skinLine?: string): Stats {
  const arch = ARCHETYPES[def.classes[0]];
  const stats = {} as Stats;
  for (const key of STAT_KEYS) {
    const raw = arch.base[key] + arch.growth[key] * (level - 1);
    stats[key] = raw * (def.statTweaks?.[key] ?? 1);
  }
  if (skinLine) {
    for (const key of SKIN_BUFFED) stats[key] *= 1 + CONFIG.skinLine.statBonus;
  }
  for (const id of itemIds) {
    for (const [key, value] of Object.entries(ITEMS[id].stats) as [StatKey, number][]) stats[key] += value * itemStatScale(level);
  }
  stats.hp = Math.round(stats.hp);
  stats.crit = Math.min(1, stats.crit);
  return stats;
}

export function itemStatScale(level: number): number {
  const low = CONFIG.itemStatScaleAtLevel1;
  return low + (1 - low) * ((level - 1) / (CONFIG.leveling.maxLevel - 1));
}

/** Multiplier on an ability's flat numbers at a given champion level. */
export function abilityLevelFactor(level: number): number {
  return 1 + CONFIG.abilities.baseGrowthPerLevel * (level - 1);
}

/** 0 = ultimate locked, 1..3 = rank. */
export function ultimateRank(level: number): number {
  return CONFIG.leveling.ultimateRanks.filter((l) => level >= l).length;
}
