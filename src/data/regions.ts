// Region bonuses (the "type traits"). Fielding 2 or 3 different champions from a region activates a tier;
// the bonus applies to that region's champions. Effects are implemented in systems/battle.ts.

import type { Region } from '../core/types';

/** Champion counts needed for tier 1 and tier 2. The launch roster has 3 champions per region. */
export const REGION_TIERS = [2, 3] as const;

export interface RegionDef {
  name: string;
  color: string;
  /** Bonus strength at tier 1 and tier 2. Meaning depends on the region. */
  values: readonly [number, number];
  /** Player-facing description for a tier's value. */
  describe: (value: number) => string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const REGIONS: Record<Region, RegionDef> = {
  Demacia: {
    name: 'Demacia', color: '#d9c38c', values: [0.12, 0.2],
    describe: (v) => `Enter each fight with a shield worth ${pct(v)} of max HP.`,
  },
  Noxus: {
    name: 'Noxus', color: '#d0453f', values: [0.15, 0.3],
    describe: (v) => `Deal ${pct(v)} more damage to targets below 50% HP.`,
  },
  Ionia: {
    name: 'Ionia', color: '#d86fa6', values: [0.1, 0.18],
    describe: (v) => `${pct(v)} chance to dodge an enemy action entirely.`,
  },
  Freljord: {
    name: 'Freljord', color: '#7fc4e8', values: [0.15, 0.3],
    describe: (v) => `Every action chills the target: ${pct(v)} less speed for 2 turns.`,
  },
  Piltover: {
    name: 'Piltover', color: '#e0a446', values: [0.2, 0.35],
    describe: (v) => `+${pct(v)} speed, and the first action of each fight deals +${pct(v)} damage.`,
  },
  Zaun: {
    name: 'Zaun', color: '#5fbf6b', values: [0.02, 0.035],
    describe: (v) => `Every action poisons the target for ${pct(v)} of its max HP per turn (3 turns).`,
  },
  ShadowIsles: {
    name: 'Shadow Isles', color: '#3fb8a5', values: [0.15, 0.3],
    describe: (v) => `Heal ${pct(v)} of max HP after knocking out an enemy.`,
  },
  Shurima: {
    name: 'Shurima', color: '#e6b85c', values: [0.2, 0.35],
    describe: (v) => `Once per fight, revive at ${pct(v)} HP when knocked out.`,
  },
  Void: {
    name: 'Void', color: '#9b59d0', values: [0.08, 0.15],
    describe: (v) => `Hits deal an extra ${pct(v)} of their damage as true damage.`,
  },
  Bilgewater: {
    name: 'Bilgewater', color: '#3a8ac4', values: [0.1, 0.2],
    describe: (v) => `+${pct(v)} crit chance, and every ability can crit.`,
  },
};
