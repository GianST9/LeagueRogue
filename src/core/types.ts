// Shared game types. Everything here is plain data — no DOM, no side effects.

export type ClassName = 'Fighter' | 'Tank' | 'Mage' | 'Assassin' | 'Marksman' | 'Support';

export type Region =
  | 'Demacia'
  | 'Noxus'
  | 'Ionia'
  | 'Freljord'
  | 'Piltover'
  | 'Zaun'
  | 'ShadowIsles'
  | 'Shurima'
  | 'Void'
  | 'Bilgewater';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type DamageType = 'physical' | 'magic' | 'true';

export interface Stats {
  hp: number;
  ad: number;
  ap: number;
  armor: number;
  mr: number;
  /** Turn order. Higher acts first. */
  speed: number;
  /** Crit chance, 0..1. Applies to basic attacks and abilities flagged `canCrit`. */
  crit: number;
}

export type StatKey = keyof Stats;

/** Percentage stat bonuses, e.g. { hp: 0.1 } = +10% HP. Runes (player) and region difficulty (enemies) use these. */
export type StatBonus = Partial<Record<StatKey, number>>;

export interface DamageSpec {
  /** Flat damage, multiplied by the ability level factor. */
  base: number;
  adRatio?: number;
  apRatio?: number;
  /** Scales with the caster's own armor (tank damage). */
  armorRatio?: number;
  /** Bonus damage equal to this fraction of the target's max HP. */
  targetMaxHpRatio?: number;
  /** Bonus damage equal to this fraction of the target's missing HP. */
  targetMissingHpRatio?: number;
  type: DamageType;
  /** Number of hits; each hit deals the full spec (split the ratios yourself). */
  hits?: number;
  canCrit?: boolean;
}

export interface HealSpec {
  base: number;
  apRatio?: number;
  adRatio?: number;
  /** Fraction of the caster's max HP. */
  maxHpRatio?: number;
}

export interface BuffSpec {
  stat: StatKey;
  /** Multiplier applied to the stat, e.g. 0.3 = +30%. Negative values debuff. */
  pct: number;
  turns: number;
}

export interface DotSpec {
  /** Damage per turn as a fraction of the target's max HP. */
  maxHpRatio?: number;
  /** Flat damage per turn, multiplied by the ability level factor. */
  base?: number;
  apRatio?: number;
  type: DamageType;
  turns: number;
}

export interface AbilityDef {
  key: 'Q' | 'W' | 'E' | 'R';
  name: string;
  description: string;
  /** Turns between casts. 0 means every turn. */
  cooldown: number;
  /** Only cast when the caster is at or below this HP fraction. */
  castBelowHp?: number;
  damage?: DamageSpec;
  heal?: HealSpec;
  shield?: HealSpec;
  /** Fraction of damage dealt by this ability returned as healing. */
  lifesteal?: number;
  /** Target skips this many of its turns. */
  stun?: number;
  selfBuff?: BuffSpec;
  targetDebuff?: BuffSpec;
  dot?: DotSpec;
}

export interface ChampionDef {
  id: string;
  name: string;
  /** Data Dragon key used for the icon URL. */
  ddragonId: string;
  title: string;
  /** First entry is the primary class; it decides the counter multiplier when attacking. */
  classes: ClassName[];
  region: Region;
  rarity: Rarity;
  /** Per-stat multipliers applied on top of the primary class archetype. */
  statTweaks?: Partial<Stats>;
  abilities: AbilityDef[];
  ultimate: AbilityDef;
}

export interface ItemEffects {
  lifesteal?: number;
  /** Revive once per battle at this fraction of max HP. */
  reviveOnce?: number;
  /** Reflects this fraction of physical damage taken back to the attacker. */
  reflectPhysical?: number;
  /** Basic attacks deal bonus physical damage equal to this fraction of the target's current HP. */
  onHitCurrentHp?: number;
  /** Fraction of the target's armor ignored. */
  armorPen?: number;
  /** Fraction of the target's magic resist ignored. */
  magicPen?: number;
  /** Extra crit damage multiplier (added to the base crit multiplier). */
  critDamage?: number;
  /** Deals this fraction of own max HP as magic damage to the opponent every turn. */
  burnSelfMaxHp?: number;
  /** Multiplies all healing the holder receives. */
  healingAmp?: number;
  /** Executes a target left below this HP fraction after the holder hits it. */
  execute?: number;
  /** Becomes untargetable for one enemy turn the first time it drops below 30% HP. */
  stasisOnce?: boolean;
  /** Heals this fraction of max HP at the end of every turn. */
  regenMaxHp?: number;
  /** The opponent receives this much less healing (Grievous Wounds). */
  antiHeal?: number;
  /** Every action slows the target's speed by this fraction for 2 turns. */
  slowOnHit?: number;
  /** Abilities burn the target for this fraction of its max HP per turn, 3 turns. */
  burnOnAbility?: number;
  /** Once per fight, gain a shield of this fraction of max HP when dropping below 40% HP. */
  lowHpShield?: number;
  /** Basic attacks deal this much bonus true damage (scaled like item stats). */
  onHitTrue?: number;
  /** Takes this much less damage from critical hits. */
  critReduction?: number;
}

/** Shop tiers (Armory mode). */
export type ItemTier = 'basic' | 'epic' | 'legendary';

export interface ItemDef {
  id: string;
  name: string;
  ddragonId: string;
  description: string;
  /** Flat stat bonuses. `crit` is additive chance. */
  stats: Partial<Stats>;
  effects?: ItemEffects;
  tier: ItemTier;
  /** Shop price in gold. */
  cost: number;
  /** Only sold in the Armory shop; never offered by item nodes in the classic modes. */
  shopOnly?: boolean;
}

/** A champion owned by the player during a run. */
export interface RunChampion {
  uid: string;
  defId: string;
  level: number;
  xp: number;
  /** Current HP; persists between battles until healed. */
  hp: number;
  fainted: boolean;
  /** Held items, up to the mode's slot count. */
  itemIds: string[];
  /** Skin-line variant ("shiny"): cosmetic plus a small stat bonus. */
  skinLine?: string;
  /** Percentage stat bonus from runes (Conquest mode). */
  statBonus?: StatBonus;
}

export type Side = 'player' | 'enemy';
