import { CONFIG, type ModeConfig } from '../core/config';
import type { RunChampion } from '../core/types';
import { CHAMPIONS } from '../data/champions';
import { computeStats } from './stats';

export type XpCurve = ModeConfig['xpCurve'];

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number, curve: XpCurve = 'flat'): number {
  const { base, growth } = CONFIG.leveling.xpCurves[curve];
  return Math.round(base * growth ** (level - 1));
}

/** Sets a champion's level and raises current HP by however much max HP grew. */
export function setLevel(champ: RunChampion, level: number): void {
  const oldMax = maxHpOf(champ);
  champ.level = Math.min(level, CONFIG.leveling.maxLevel);
  const newMax = maxHpOf(champ);
  if (!champ.fainted) champ.hp = Math.min(newMax, champ.hp + Math.max(0, newMax - oldMax));
}

/** Adds XP and returns the number of levels gained. XP is dropped at the level cap. */
export function grantXp(champ: RunChampion, amount: number, curve: XpCurve = 'flat'): number {
  const { maxLevel } = CONFIG.leveling;
  if (champ.level >= maxLevel) return 0;
  const startLevel = champ.level;
  champ.xp += amount;
  let level = champ.level;
  while (level < maxLevel && champ.xp >= xpToNext(level, curve)) {
    champ.xp -= xpToNext(level, curve);
    level++;
  }
  if (level >= maxLevel) champ.xp = 0;
  setLevel(champ, level);
  return champ.level - startLevel;
}

export function maxHpOf(champ: RunChampion): number {
  return computeStats(CHAMPIONS[champ.defId], champ.level, champ.itemIds, champ.skinLine, champ.statBonus).hp;
}

/** Fountain: full heal and revive. */
export function fullHeal(champ: RunChampion): void {
  champ.fainted = false;
  champ.hp = maxHpOf(champ);
}
