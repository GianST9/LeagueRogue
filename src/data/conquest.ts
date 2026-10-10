// Conquest mode data: the world map of regions, the runes sold in the rune shop, and the starting collection.
// Region ids match the boss ids in bosses.ts; the region's boss guards the last map of its run.

import { CONFIG } from '../core/config';
import type { StatBonus, StatKey } from '../core/types';
import { BOSSES } from './bosses';
import { REGIONS, type RegionDef } from './regions';

export interface ConquestRegion {
  /** Same id as the region's boss in BOSSES. */
  id: string;
  /** 1 = easiest. Sets enemy strength and essence pay. */
  tier: number;
  /** Enemy champions get this percentage bonus to HP, AD, AP, armor and MR. */
  enemyBonus: number;
  /** Rune power per champion that roughly cancels out `enemyBonus`. Shown as a guide. */
  recommendedPower: number;
  essenceMultiplier: number;
  /** Regions opened by conquering this one. */
  unlocks: string[];
  blurb: string;
}

const tier = (n: number) => {
  const { enemyBonus, recommendedPower, essenceMultiplier } = CONFIG.conquest.perTier;
  return {
    tier: n,
    enemyBonus: (n - 1) * enemyBonus,
    recommendedPower: (n - 1) * recommendedPower,
    essenceMultiplier: 1 + (n - 1) * essenceMultiplier,
  };
};

export const CONQUEST_REGIONS: ConquestRegion[] = [
  { id: 'demacia', ...tier(1), unlocks: ['noxus', 'freljord'],
    blurb: 'The shining kingdom is a safe place to start. Jarvan IV guards the capital.' },
  { id: 'noxus', ...tier(2), unlocks: ['ionia', 'zaun'],
    blurb: 'Strength above all. Swain commands the Noxian legions.' },
  { id: 'freljord', ...tier(2), unlocks: ['ionia', 'shurima'],
    blurb: 'Frozen tundra and warring tribes. Lissandra waits beneath the ice.' },
  { id: 'ionia', ...tier(3), unlocks: ['shadowisles'],
    blurb: 'The First Lands are beautiful and deadly. Zed rules the shadows.' },
  { id: 'zaun', ...tier(3), unlocks: ['shadowisles'],
    blurb: 'Chem-fumes and back-alley inventors. Viktor has glorious plans.' },
  { id: 'shurima', ...tier(4), unlocks: ['bilgewater'],
    blurb: 'The sun disc burns again. Azir reclaims his empire.' },
  { id: 'shadowisles', ...tier(4), unlocks: ['bilgewater'],
    blurb: 'The Black Mist hungers. Viego leads the Ruination.' },
  { id: 'bilgewater', ...tier(5), unlocks: [],
    blurb: 'The deadliest port in Runeterra. Gangplank collects his toll.' },
];

export const STARTING_REGION = 'demacia';

export function conquestRegion(id: string): ConquestRegion {
  const r = CONQUEST_REGIONS.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown conquest region: ${id}`);
  return r;
}

/** Name and color of a conquest region (from its boss's home region). */
export function regionLook(id: string): RegionDef {
  const boss = BOSSES.find((b) => b.id === id);
  if (!boss) throw new Error(`Unknown conquest region: ${id}`);
  return REGIONS[boss.region];
}

export interface RuneDef {
  id: string;
  name: string;
  icon: string;
  /** Stats this rune raises, by this much per rank. */
  stats: StatKey[];
  perRank: number;
}

export const RUNES: RuneDef[] = [
  { id: 'fury', name: 'Fury', icon: '⚔️', stats: ['ad', 'ap'], perRank: 0.05 },
  { id: 'vitality', name: 'Vitality', icon: '❤️', stats: ['hp'], perRank: 0.05 },
  { id: 'bulwark', name: 'Bulwark', icon: '🛡️', stats: ['armor'], perRank: 0.05 },
  { id: 'warding', name: 'Warding', icon: '🔮', stats: ['mr'], perRank: 0.05 },
  { id: 'swiftness', name: 'Swiftness', icon: '💨', stats: ['speed'], perRank: 0.04 },
];

/** Champions everyone owns from the start. */
export const STARTING_CHAMPIONS = ['garen', 'lux', 'darius', 'ashe', 'braum', 'shen'];

/** The percentage bonus a set of rune ranks gives. */
export function runeBonusOf(ranks: Partial<Record<string, number>>): StatBonus {
  const bonus: StatBonus = {};
  for (const rune of RUNES) {
    const rank = ranks[rune.id] ?? 0;
    if (rank <= 0) continue;
    for (const stat of rune.stats) bonus[stat] = (bonus[stat] ?? 0) + rune.perRank * rank;
  }
  return bonus;
}

/** Enemy stat bonus for a region. */
export function regionEnemyBonus(region: ConquestRegion): StatBonus | undefined {
  const v = region.enemyBonus;
  return v > 0 ? { hp: v, ad: v, ap: v, armor: v, mr: v } : undefined;
}
