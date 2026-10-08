// Stat archetypes per class. A champion's stats = its primary class archetype × its statTweaks.
// Damage stats grow faster than resistances so fights stay a similar length from level 1 to 18.

import type { ClassName, Stats } from '../core/types';

export interface Archetype {
  base: Stats;
  growth: Stats;
}

export const ARCHETYPES: Record<ClassName, Archetype> = {
  Fighter: {
    base: { hp: 640, ad: 64, ap: 0, armor: 34, mr: 32, speed: 60, crit: 0 },
    growth: { hp: 90, ad: 8.5, ap: 0, armor: 2, mr: 1.5, speed: 0, crit: 0 },
  },
  Tank: {
    base: { hp: 720, ad: 56, ap: 20, armor: 42, mr: 36, speed: 45, crit: 0 },
    growth: { hp: 108, ad: 6.5, ap: 3, armor: 2.6, mr: 2, speed: 0, crit: 0 },
  },
  Mage: {
    base: { hp: 560, ad: 48, ap: 60, armor: 24, mr: 30, speed: 55, crit: 0 },
    growth: { hp: 80, ad: 5, ap: 10, armor: 1.6, mr: 1.5, speed: 0, crit: 0 },
  },
  Assassin: {
    base: { hp: 580, ad: 66, ap: 40, armor: 28, mr: 30, speed: 85, crit: 0.1 },
    growth: { hp: 80, ad: 9, ap: 7, armor: 1.8, mr: 1.5, speed: 0, crit: 0 },
  },
  Marksman: {
    base: { hp: 560, ad: 62, ap: 0, armor: 24, mr: 28, speed: 70, crit: 0.2 },
    growth: { hp: 78, ad: 9.5, ap: 0, armor: 1.7, mr: 1.3, speed: 0, crit: 0.01 },
  },
  Support: {
    base: { hp: 580, ad: 50, ap: 40, armor: 30, mr: 30, speed: 55, crit: 0 },
    growth: { hp: 82, ad: 5, ap: 6.5, armor: 2, mr: 1.6, speed: 0, crit: 0 },
  },
};
