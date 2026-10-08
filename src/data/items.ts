// Items. Effects are interpreted by systems/battle.ts.
// Classic modes offer the original legendaries at item nodes (one slot per champion).
// The Armory mode sells everything here in a shop (three slots per champion). Costs are LoL gold ÷ 25.

import type { ItemDef, ItemTier } from '../core/types';

type Def = Omit<ItemDef, 'tier'>;

const legendary = (d: Def): ItemDef => ({ ...d, tier: 'legendary' });
const epic = (d: Def): ItemDef => ({ ...d, tier: 'epic', shopOnly: true });
const basic = (d: Def): ItemDef => ({ ...d, tier: 'basic', shopOnly: true });

const ITEM_LIST: ItemDef[] = [
  // ── Legendaries (classic + shop) ──────────────────────────────────
  legendary({
    id: 'infinity-edge', name: 'Infinity Edge', ddragonId: '3031', cost: 138,
    description: '+40 AD, +20% crit chance. Crits deal +40% damage.',
    stats: { ad: 40, crit: 0.2 }, effects: { critDamage: 0.4 },
  }),
  legendary({
    id: 'rabadons-deathcap', name: "Rabadon's Deathcap", ddragonId: '3089', cost: 144,
    description: '+120 AP.',
    stats: { ap: 120 },
  }),
  legendary({
    id: 'thornmail', name: 'Thornmail', ddragonId: '3075', cost: 100,
    description: '+40 armor, +100 HP. Reflects 20% of physical damage taken.',
    stats: { armor: 40, hp: 100 }, effects: { reflectPhysical: 0.2 },
  }),
  legendary({
    id: 'warmogs-armor', name: "Warmog's Armor", ddragonId: '3083', cost: 124,
    description: '+350 HP. Regenerates 2% max HP every turn.',
    stats: { hp: 350 }, effects: { regenMaxHp: 0.02 },
  }),
  legendary({
    id: 'guardian-angel', name: 'Guardian Angel', ddragonId: '3026', cost: 128,
    description: '+20 AD, +20 armor. Revives once per battle at 30% HP.',
    stats: { ad: 20, armor: 20 }, effects: { reviveOnce: 0.3 },
  }),
  legendary({
    id: 'zhonyas-hourglass', name: "Zhonya's Hourglass", ddragonId: '3157', cost: 130,
    description: '+70 AP, +30 armor. The first time it drops below 30% HP, it ignores the next enemy turn.',
    stats: { ap: 70, armor: 30 }, effects: { stasisOnce: true },
  }),
  legendary({
    id: 'blade-of-the-ruined-king', name: 'Blade of the Ruined King', ddragonId: '3153', cost: 128,
    description: "+30 AD, 10% lifesteal. Basic attacks deal 8% of the target's current HP.",
    stats: { ad: 30 }, effects: { lifesteal: 0.1, onHitCurrentHp: 0.08 },
  }),
  legendary({
    id: 'sunfire-aegis', name: 'Sunfire Aegis', ddragonId: '3068', cost: 108,
    description: '+250 HP, +20 armor. Burns the opponent for 2% of own max HP every turn.',
    stats: { hp: 250, armor: 20 }, effects: { burnSelfMaxHp: 0.02 },
  }),
  legendary({
    id: 'bloodthirster', name: 'Bloodthirster', ddragonId: '3072', cost: 136,
    description: '+40 AD, 12% lifesteal.',
    stats: { ad: 40 }, effects: { lifesteal: 0.12 },
  }),
  legendary({
    id: 'spirit-visage', name: 'Spirit Visage', ddragonId: '3065', cost: 116,
    description: '+250 HP, +35 MR. +25% healing received.',
    stats: { hp: 250, mr: 35 }, effects: { healingAmp: 0.25 },
  }),
  legendary({
    id: 'void-staff', name: 'Void Staff', ddragonId: '3135', cost: 120,
    description: "+85 AP. Ignores 40% of the target's magic resist.",
    stats: { ap: 85 }, effects: { magicPen: 0.4 },
  }),
  legendary({
    id: 'black-cleaver', name: 'Black Cleaver', ddragonId: '3071', cost: 120,
    description: "+30 AD, +200 HP. Ignores 30% of the target's armor.",
    stats: { ad: 30, hp: 200 }, effects: { armorPen: 0.3 },
  }),
  legendary({
    id: 'the-collector', name: 'The Collector', ddragonId: '6676', cost: 128,
    description: '+50 AD, +20% crit chance. Executes targets left below 5% HP.',
    stats: { ad: 50, crit: 0.2 }, effects: { execute: 0.05 },
  }),
  legendary({
    id: 'force-of-nature', name: 'Force of Nature', ddragonId: '4401', cost: 112,
    description: '+200 HP, +45 MR, +10 speed.',
    stats: { hp: 200, mr: 45, speed: 10 },
  }),
  legendary({
    id: 'trinity-force', name: 'Trinity Force', ddragonId: '3078', cost: 133,
    description: '+25 AD, +150 HP, +15 speed.',
    stats: { ad: 25, hp: 150, speed: 15 },
  }),

  // ── New legendaries (Armory shop only) ────────────────────────────
  legendary({
    id: 'morellonomicon', name: 'Morellonomicon', ddragonId: '3165', cost: 114, shopOnly: true,
    description: '+70 AP, +150 HP. The opponent receives 50% less healing.',
    stats: { ap: 70, hp: 150 }, effects: { antiHeal: 0.5 },
  }),
  legendary({
    id: 'rylais-crystal-scepter', name: "Rylai's Crystal Scepter", ddragonId: '3116', cost: 104, shopOnly: true,
    description: '+70 AP, +250 HP. Every action slows the target by 25% for 2 turns.',
    stats: { ap: 70, hp: 250 }, effects: { slowOnHit: 0.25 },
  }),
  legendary({
    id: 'liandrys-torment', name: "Liandry's Torment", ddragonId: '6653', cost: 120, shopOnly: true,
    description: "+80 AP, +150 HP. Abilities burn the target for 3% of its max HP per turn (3 turns).",
    stats: { ap: 80, hp: 150 }, effects: { burnOnAbility: 0.03 },
  }),
  legendary({
    id: 'steraks-gage', name: "Sterak's Gage", ddragonId: '3053', cost: 128, shopOnly: true,
    description: '+30 AD, +250 HP. Once per fight, gain a shield of 30% max HP when dropping below 40% HP.',
    stats: { ad: 30, hp: 250 }, effects: { lowHpShield: 0.3 },
  }),
  legendary({
    id: 'kraken-slayer', name: 'Kraken Slayer', ddragonId: '6672', cost: 120, shopOnly: true,
    description: '+40 AD, +10 speed. Basic attacks deal 60 bonus true damage.',
    stats: { ad: 40, speed: 10 }, effects: { onHitTrue: 60 },
  }),
  legendary({
    id: 'randuins-omen', name: "Randuin's Omen", ddragonId: '3143', cost: 108, shopOnly: true,
    description: '+300 HP, +45 armor. Takes 35% less damage from critical hits.',
    stats: { hp: 300, armor: 45 }, effects: { critReduction: 0.35 },
  }),
  legendary({
    id: 'heartsteel', name: 'Heartsteel', ddragonId: '3084', cost: 120, shopOnly: true,
    description: '+550 HP.',
    stats: { hp: 550 },
  }),
  legendary({
    id: 'frozen-heart', name: 'Frozen Heart', ddragonId: '3110', cost: 100, shopOnly: true,
    description: '+60 armor. Every action slows the target by 15% for 2 turns.',
    stats: { armor: 60 }, effects: { slowOnHit: 0.15 },
  }),
  legendary({
    id: 'titanic-hydra', name: 'Titanic Hydra', ddragonId: '3748', cost: 132, shopOnly: true,
    description: '+30 AD, +400 HP.',
    stats: { ad: 30, hp: 400 },
  }),
  legendary({
    id: 'mortal-reminder', name: 'Mortal Reminder', ddragonId: '3033', cost: 120, shopOnly: true,
    description: "+35 AD, +15% crit chance. Ignores 25% of the target's armor; the opponent receives 40% less healing.",
    stats: { ad: 35, crit: 0.15 }, effects: { armorPen: 0.25, antiHeal: 0.4 },
  }),
  legendary({
    id: 'dead-mans-plate', name: "Dead Man's Plate", ddragonId: '3742', cost: 116, shopOnly: true,
    description: '+350 HP, +35 armor, +15 speed.',
    stats: { hp: 350, armor: 35, speed: 15 },
  }),
  legendary({
    id: 'banshees-veil', name: "Banshee's Veil", ddragonId: '3102', cost: 120, shopOnly: true,
    description: '+70 AP, +45 MR.',
    stats: { ap: 70, mr: 45 },
  }),
  legendary({
    id: 'shadowflame', name: 'Shadowflame', ddragonId: '4645', cost: 128, shopOnly: true,
    description: "+100 AP. Ignores 15% of the target's magic resist.",
    stats: { ap: 100 }, effects: { magicPen: 0.15 },
  }),
  legendary({
    id: 'rapid-firecannon', name: 'Rapid Firecannon', ddragonId: '3094', cost: 106, shopOnly: true,
    description: '+15 AD, +15% crit chance, +20 speed.',
    stats: { ad: 15, crit: 0.15, speed: 20 },
  }),

  // ── Epic (mid-tier) ───────────────────────────────────────────────
  epic({ id: 'pickaxe', name: 'Pickaxe', ddragonId: '1037', cost: 35, description: '+20 AD.', stats: { ad: 20 } }),
  epic({ id: 'bf-sword', name: 'B. F. Sword', ddragonId: '1038', cost: 52, description: '+30 AD.', stats: { ad: 30 } }),
  epic({ id: 'needlessly-large-rod', name: 'Needlessly Large Rod', ddragonId: '1058', cost: 48, description: '+45 AP.', stats: { ap: 45 } }),
  epic({ id: 'chain-vest', name: 'Chain Vest', ddragonId: '1031', cost: 32, description: '+28 armor.', stats: { armor: 28 } }),
  epic({ id: 'negatron-cloak', name: 'Negatron Cloak', ddragonId: '1057', cost: 34, description: '+28 MR.', stats: { mr: 28 } }),
  epic({ id: 'giants-belt', name: "Giant's Belt", ddragonId: '1011', cost: 36, description: '+250 HP.', stats: { hp: 250 } }),
  epic({
    id: 'vampiric-scepter', name: 'Vampiric Scepter', ddragonId: '1053', cost: 36,
    description: '+10 AD, 8% lifesteal.', stats: { ad: 10 }, effects: { lifesteal: 0.08 },
  }),
  epic({ id: 'phage', name: 'Phage', ddragonId: '3044', cost: 44, description: '+15 AD, +150 HP.', stats: { ad: 15, hp: 150 } }),
  epic({ id: 'kindlegem', name: 'Kindlegem', ddragonId: '3067', cost: 32, description: '+150 HP, +5 speed.', stats: { hp: 150, speed: 5 } }),
  epic({
    id: 'bramble-vest', name: 'Bramble Vest', ddragonId: '3076', cost: 32,
    description: '+20 armor. Reflects 10% of physical damage taken.', stats: { armor: 20 }, effects: { reflectPhysical: 0.1 },
  }),
  epic({ id: 'caulfields-warhammer', name: "Caulfield's Warhammer", ddragonId: '3133', cost: 42, description: '+18 AD, +6 speed.', stats: { ad: 18, speed: 6 } }),
  epic({
    id: 'executioners-calling', name: "Executioner's Calling", ddragonId: '3123', cost: 32,
    description: '+15 AD. The opponent receives 40% less healing.', stats: { ad: 15 }, effects: { antiHeal: 0.4 },
  }),
  epic({ id: 'fiendish-codex', name: 'Fiendish Codex', ddragonId: '3108', cost: 34, description: '+30 AP, +5 speed.', stats: { ap: 30, speed: 5 } }),
  epic({ id: 'zeal', name: 'Zeal', ddragonId: '3086', cost: 48, description: '+12% crit chance, +8 speed.', stats: { crit: 0.12, speed: 8 } }),

  // ── Basic ─────────────────────────────────────────────────────────
  basic({ id: 'long-sword', name: 'Long Sword', ddragonId: '1036', cost: 14, description: '+10 AD.', stats: { ad: 10 } }),
  basic({ id: 'amplifying-tome', name: 'Amplifying Tome', ddragonId: '1052', cost: 16, description: '+20 AP.', stats: { ap: 20 } }),
  basic({ id: 'cloth-armor', name: 'Cloth Armor', ddragonId: '1029', cost: 12, description: '+12 armor.', stats: { armor: 12 } }),
  basic({ id: 'null-magic-mantle', name: 'Null-Magic Mantle', ddragonId: '1033', cost: 16, description: '+12 MR.', stats: { mr: 12 } }),
  basic({ id: 'ruby-crystal', name: 'Ruby Crystal', ddragonId: '1028', cost: 16, description: '+100 HP.', stats: { hp: 100 } }),
  basic({ id: 'cloak-of-agility', name: 'Cloak of Agility', ddragonId: '1018', cost: 24, description: '+12% crit chance.', stats: { crit: 0.12 } }),
  basic({ id: 'boots', name: 'Boots', ddragonId: '1001', cost: 12, description: '+8 speed.', stats: { speed: 8 } }),
  basic({ id: 'dagger', name: 'Dagger', ddragonId: '1042', cost: 10, description: '+5 AD, +4 speed.', stats: { ad: 5, speed: 4 } }),
  basic({
    id: 'rejuvenation-bead', name: 'Rejuvenation Bead', ddragonId: '1006', cost: 12,
    description: 'Regenerates 1% max HP every turn.', stats: {}, effects: { regenMaxHp: 0.01 },
  }),
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(ITEM_LIST.map((i) => [i.id, i]));
export const ITEM_IDS = ITEM_LIST.map((i) => i.id);
/** Items offered by classic item nodes and carried by classic enemies. */
export const CLASSIC_ITEM_IDS = ITEM_LIST.filter((i) => !i.shopOnly).map((i) => i.id);
export const itemIdsOfTier = (tier: ItemTier) => ITEM_LIST.filter((i) => i.tier === tier).map((i) => i.id);
