// Every tunable number in the game lives here so balancing never means hunting through systems.

import type { ClassName } from './types';

export interface ModeConfig {
  maps: number;
  xpMultiplier: number;
  /** 'flat': every level costs the same XP. 'steep': each level costs more than the last. */
  xpCurve: 'flat' | 'steep';
  /** Items a champion can hold. */
  itemSlots: number;
  /** Whether item nodes appear on the map. */
  itemNodes: boolean;
  /** Whether a shop opens after each region boss (and fights pay gold). */
  shop: boolean;
  levelUpNodeLevels: number;
  /**
   * Enemy levels per map: [first layer, boss]. Fights in between scale linearly, then `enemyLevelOffset` applies.
   * Fixed numbers, set to where a typical team stands at that point, so your own team's level never changes them.
   */
  enemyLevels: readonly (readonly [number, number])[];
}


const MODES = {
  short: {
    maps: 3, xpMultiplier: 2.5, xpCurve: 'flat', itemSlots: 1, itemNodes: true, shop: false, levelUpNodeLevels: 2,
    enemyLevels: [[2, 5], [8, 10], [13, 17]],
  },
  full: {
    maps: 8, xpMultiplier: 0.75, xpCurve: 'flat', itemSlots: 1, itemNodes: true, shop: false, levelUpNodeLevels: 2,
    enemyLevels: [[2, 2], [3, 4], [5, 6], [7, 8], [9, 11], [11, 13], [13, 15], [15, 17]],
  },
  armory: {
    maps: 8, xpMultiplier: 1, xpCurve: 'steep', itemSlots: 3, itemNodes: false, shop: true, levelUpNodeLevels: 1,
    enemyLevels: [[2, 3], [5, 6], [7, 9], [10, 12], [12, 14], [14, 15], [15, 16], [16, 18]],
  },
  /** One region per run; its boss is the last of the maps. Rules match the short run, with gentler enemy levels (regions add their own bonus). */
  conquest: {
    maps: 3, xpMultiplier: 2.5, xpCurve: 'flat', itemSlots: 1, itemNodes: true, shop: false, levelUpNodeLevels: 2,
    enemyLevels: [[2, 5], [7, 10], [12, 16]],
  },
} satisfies Record<string, ModeConfig>;

export const CONFIG = {
  ddragonVersion: '16.19.1',

  team: {
    maxSize: 6,
  },

  run: {
    startLevel: 2,
    modes: MODES as Record<keyof typeof MODES, ModeConfig>,
    /** Map layer sizes before the boss node. */
    layers: [3, 4, 3, 4, 3, 2],
    /** Added to the mode's `enemyLevels` by fight kind. The final boss's ace is one level higher still. */
    enemyLevelOffset: { camp: -2, rival: -1, boss: 0 },
    /** Fraction of max HP restored to surviving champions after a won fight. Knocked-out ones stay out. */
    postBattleHeal: 1,
    recruitOptions: 3,
    itemOptions: 3,
    levelUpOptions: 3,
  },

  /** Node-type weights at the start and the end of a run; interpolated by run progress. */
  nodeWeights: {
    early: { recruit: 15, camp: 34, rival: 14, item: 15, levelup: 11, fountain: 8 },
    late: { recruit: 7, camp: 22, rival: 29, item: 19, levelup: 11, fountain: 11 },
  },

  leveling: {
    maxLevel: 18,
    /** XP to go from level L to L + 1 = round(base × growth^(L − 1)). */
    xpCurves: {
      flat: { base: 100, growth: 1 },
      // 1→2 costs 40 XP, 10→11 about 140, 17→18 about 375.
      steep: { base: 40, growth: 1.15 },
    },
    xpReward: { camp: 40, rival: 70, boss: 120 },
    /** Ultimate unlocks at the first level and ranks up at the others. */
    ultimateRanks: [6, 11, 16],
  },

  /** Armory mode: gold, the shop between regions, and enemy items. */
  armory: {
    goldReward: { camp: 18, rival: 35, boss: 90 },
    startingGold: 0,
    shopOffers: 6,
    rerollCost: 10,
    /** Fraction of an item's cost returned when selling it. */
    sellRatio: 0.5,
    /** Shop tier weights at the start and the end of a run; interpolated by progress. */
    tierWeights: {
      early: { basic: 55, epic: 38, legendary: 7 },
      late: { basic: 10, epic: 35, legendary: 55 },
    },
    /** Rival and boss champions carry up to this many items, growing with run progress. */
    enemyMaxItems: 3,
    /** Scales how fast enemy item counts grow (1 = reach the max at the end of the run). */
    enemyItemPace: 0.6,
  },

  /** Conquest mode: Blue Essence, the rune shop, champion unlocks and region difficulty. */
  conquest: {
    /** Essence per won fight, multiplied by the region's `essenceMultiplier`. Kept even when the run is lost. */
    essenceReward: { camp: 6, rival: 12, boss: 30 },
    /** Bonus essence for conquering a region (× multiplier), and again on the first conquest. */
    clearBonus: 60,
    firstClearBonus: 150,
    /** Cost to unlock a champion, by rarity. */
    unlockCost: { common: 250, rare: 500, epic: 900, legendary: 1500 },
    /** Rune rank r costs `runeRankCost × r` essence. */
    runeRankCost: 20,
    maxRuneRank: 5,
    /**
     * Per region tier above 1: enemy HP/AD/AP/armor/MR bonus, recommended rune power, and extra essence multiplier.
     * Five rune ranks (+5% to one stat each) are worth about +5% to everything, so power 5 per tier evens it out.
     */
    perTier: { enemyBonus: 0.05, recommendedPower: 5, essenceMultiplier: 0.5 },
  },

  abilities: {
    /** Flat ability numbers grow by this fraction per level above 1. */
    baseGrowthPerLevel: 0.12,
    /** Ultimate flat numbers are multiplied by this per rank (index = rank - 1). */
    ultimateRankScale: [1, 1.3, 1.6],
  },

  battle: {
    critMultiplier: 1.75,
    /** Each hit rolls damage in [1 - v, 1 + v], like Pokémon's damage roll. Keeps small stat edges from deciding every fight. */
    damageVariance: 0.15,
    /**
     * Overtime: once the same two champions have fought for `startTurn` turns, both take true damage at the end
     * of every turn, `basePct` of max HP the first time and `growthPct` more each turn after. Resets when a new
     * champion steps in.
     */
    overtime: { startTurn: 20, basePct: 0.03, growthPct: 0.03 },
    /** Safety net only (overtime ends every matchup long before this). Decided by remaining HP if ever reached. */
    maxTurns: 1000,
    strongMultiplier: 1.2,
    weakMultiplier: 0.85,
  },

  /** Item stats scale from this fraction at level 1 up to 100% at max level, so items don't dominate early fights. */
  itemStatScaleAtLevel1: 0.5,

  /** Skin-line variants ("shinies"). */
  skinLine: {
    chance: 0.01,
    statBonus: 0.05,
  },
} as const;

/**
 * Class counters, keyed by the attacker's primary class.
 * The multiplier is applied once per defender class, so a dual-class defender can stack.
 */
export const CLASS_COUNTERS: Record<ClassName, { strong: ClassName[]; weak: ClassName[] }> = {
  Assassin: { strong: ['Mage', 'Marksman'], weak: ['Tank'] },
  Fighter: { strong: ['Tank', 'Assassin'], weak: ['Mage'] },
  Tank: { strong: ['Assassin', 'Marksman'], weak: ['Fighter'] },
  Mage: { strong: ['Fighter', 'Support'], weak: ['Assassin'] },
  Marksman: { strong: ['Tank', 'Fighter'], weak: ['Assassin'] },
  Support: { strong: ['Assassin', 'Mage'], weak: ['Tank'] },
};
