// The hand-made launch roster: 30 champions, 3 per region.
// Kits follow the LoL champion loosely, simplified to 1–2 abilities plus an ultimate.
// Classes are Riot's own tags; the first one is the primary class used for counters.

import type { ChampionDef } from '../core/types';

const CHAMPION_LIST: ChampionDef[] = [
  // ───────────── Demacia ─────────────
  {
    id: 'garen', name: 'Garen', ddragonId: 'Garen', title: 'The Might of Demacia',
    classes: ['Fighter', 'Tank'], region: 'Demacia', rarity: 'common',
    statTweaks: { hp: 1.08, armor: 1.1 },
    abilities: [
      { key: 'Q', name: 'Decisive Strike', description: 'A heavy strike that briefly stuns.', cooldown: 3,
        damage: { base: 30, adRatio: 1.4, type: 'physical' }, stun: 1 },
      { key: 'E', name: 'Judgment', description: 'Spins for three hits.', cooldown: 4,
        damage: { base: 12, adRatio: 0.45, type: 'physical', hits: 3 } },
    ],
    ultimate: { key: 'R', name: 'Demacian Justice', description: 'True damage that grows with the target\'s missing HP.', cooldown: 6,
      damage: { base: 120, targetMissingHpRatio: 0.25, type: 'true' } },
  },
  {
    id: 'lux', name: 'Lux', ddragonId: 'Lux', title: 'the Lady of Luminosity',
    classes: ['Mage', 'Support'], region: 'Demacia', rarity: 'common',
    abilities: [
      { key: 'Q', name: 'Light Binding', description: 'Binds the target in light.', cooldown: 4,
        damage: { base: 60, apRatio: 0.7, type: 'magic' }, stun: 1 },
      { key: 'W', name: 'Prismatic Barrier', description: 'Shields herself when hurt.', cooldown: 4, castBelowHp: 0.6,
        shield: { base: 60, apRatio: 0.35 } },
    ],
    ultimate: { key: 'R', name: 'Final Spark', description: 'A massive beam of light.', cooldown: 5,
      damage: { base: 200, apRatio: 1.1, type: 'magic' } },
  },
  {
    id: 'lucian', name: 'Lucian', ddragonId: 'Lucian', title: 'the Purifier',
    classes: ['Marksman', 'Assassin'], region: 'Demacia', rarity: 'rare',
    abilities: [
      { key: 'Q', name: 'Piercing Light', description: 'A piercing bolt of light.', cooldown: 2,
        damage: { base: 50, adRatio: 1.0, type: 'physical' } },
      { key: 'E', name: 'Relentless Pursuit', description: 'Dashes and fires twice.', cooldown: 3,
        damage: { base: 10, adRatio: 0.6, type: 'physical', hits: 2, canCrit: true } },
    ],
    ultimate: { key: 'R', name: 'The Culling', description: 'Unleashes a torrent of shots.', cooldown: 5,
      damage: { base: 15, adRatio: 0.25, type: 'physical', hits: 8 } },
  },

  // ───────────── Noxus ─────────────
  {
    id: 'darius', name: 'Darius', ddragonId: 'Darius', title: 'the Hand of Noxus',
    classes: ['Fighter', 'Tank'], region: 'Noxus', rarity: 'common',
    abilities: [
      { key: 'Q', name: 'Decimate', description: 'Swings his axe and heals from the blow.', cooldown: 3,
        damage: { base: 40, adRatio: 1.2, type: 'physical' }, lifesteal: 0.3 },
      { key: 'W', name: 'Crippling Strike', description: 'Slows the target.', cooldown: 3,
        damage: { base: 10, adRatio: 1.3, type: 'physical' }, targetDebuff: { stat: 'speed', pct: -0.3, turns: 2 } },
    ],
    ultimate: { key: 'R', name: 'Noxian Guillotine', description: 'True-damage execute on a weakened foe.', cooldown: 4, castBelowHp: 1,
      damage: { base: 110, adRatio: 0.75, targetMissingHpRatio: 0.15, type: 'true' } },
  },
  {
    id: 'katarina', name: 'Katarina', ddragonId: 'Katarina', title: 'the Sinister Blade',
    classes: ['Assassin', 'Mage'], region: 'Noxus', rarity: 'rare',
    abilities: [
      { key: 'Q', name: 'Bouncing Blade', description: 'A dagger that ricochets.', cooldown: 2,
        damage: { base: 55, apRatio: 0.35, adRatio: 0.3, type: 'magic' } },
      { key: 'E', name: 'Shunpo', description: 'Blinks to the target and strikes.', cooldown: 3,
        damage: { base: 20, adRatio: 0.6, apRatio: 0.25, type: 'magic' }, selfBuff: { stat: 'speed', pct: 0.3, turns: 2 } },
    ],
    ultimate: { key: 'R', name: 'Death Lotus', description: 'A storm of daggers.', cooldown: 5,
      damage: { base: 25, adRatio: 0.18, apRatio: 0.18, type: 'magic', hits: 6 } },
  },
  {
    id: 'swain', name: 'Swain', ddragonId: 'Swain', title: 'the Noxian Grand General',
    classes: ['Mage', 'Support'], region: 'Noxus', rarity: 'rare',
    statTweaks: { hp: 1.1 },
    abilities: [
      { key: 'Q', name: 'Death\'s Hand', description: 'Unleashes bolts of eldritch power.', cooldown: 2,
        damage: { base: 65, apRatio: 0.6, type: 'magic' } },
      { key: 'E', name: 'Nevermove', description: 'Roots the target with a demonic hand.', cooldown: 4,
        damage: { base: 35, apRatio: 0.3, type: 'magic' }, stun: 1 },
    ],
    ultimate: { key: 'R', name: 'Demonic Ascension', description: 'Drains the enemy each turn and heals.', cooldown: 6,
      damage: { base: 90, apRatio: 0.6, type: 'magic' }, lifesteal: 1,
      selfBuff: { stat: 'mr', pct: 0.3, turns: 3 } },
  },

  // ───────────── Ionia ─────────────
  {
    id: 'yasuo', name: 'Yasuo', ddragonId: 'Yasuo', title: 'the Unforgiven',
    classes: ['Fighter', 'Assassin'], region: 'Ionia', rarity: 'rare',
    statTweaks: { crit: 2 },
    abilities: [
      { key: 'Q', name: 'Steel Tempest', description: 'A thrust that can crit.', cooldown: 1,
        damage: { base: 25, adRatio: 1.0, type: 'physical', canCrit: true } },
      { key: 'W', name: 'Wind Wall', description: 'Raises a shield of wind.', cooldown: 4, castBelowHp: 0.5,
        shield: { base: 80, adRatio: 0.6 } },
    ],
    ultimate: { key: 'R', name: 'Last Breath', description: 'Blinks in and slashes.', cooldown: 5,
      damage: { base: 150, adRatio: 1.5, type: 'physical' }, selfBuff: { stat: 'armor', pct: 0.3, turns: 2 } },
  },
  {
    id: 'ahri', name: 'Ahri', ddragonId: 'Ahri', title: 'the Nine-Tailed Fox',
    classes: ['Mage', 'Assassin'], region: 'Ionia', rarity: 'rare',
    abilities: [
      { key: 'Q', name: 'Orb of Deception', description: 'An orb that drains life on the way back.', cooldown: 2,
        damage: { base: 65, apRatio: 0.6, type: 'magic' }, lifesteal: 0.2 },
      { key: 'E', name: 'Charm', description: 'Charms the target.', cooldown: 4,
        damage: { base: 50, apRatio: 0.45, type: 'magic' }, stun: 1 },
    ],
    ultimate: { key: 'R', name: 'Spirit Rush', description: 'Dashes three times, firing bolts.', cooldown: 5,
      damage: { base: 55, apRatio: 0.35, type: 'magic', hits: 3 } },
  },
  {
    id: 'shen', name: 'Shen', ddragonId: 'Shen', title: 'the Eye of Twilight',
    classes: ['Tank'], region: 'Ionia', rarity: 'common',
    abilities: [
      { key: 'Q', name: 'Twilight Assault', description: 'Strikes with his spirit blade.', cooldown: 2,
        damage: { base: 30, adRatio: 0.8, targetMaxHpRatio: 0.04, type: 'magic' } },
      { key: 'E', name: 'Shadow Dash', description: 'Dashes in and taunts.', cooldown: 4,
        damage: { base: 40, adRatio: 0.3, type: 'physical' }, stun: 1 },
    ],
    ultimate: { key: 'R', name: 'Stand United', description: 'A large shield.', cooldown: 6, castBelowHp: 0.6,
      shield: { base: 150, maxHpRatio: 0.15 } },
  },

  // ───────────── Freljord ─────────────
  {
    id: 'ashe', name: 'Ashe', ddragonId: 'Ashe', title: 'the Frost Archer',
    classes: ['Marksman', 'Support'], region: 'Freljord', rarity: 'common',
    abilities: [
      { key: 'Q', name: 'Ranger\'s Focus', description: 'Fires a flurry of frost arrows.', cooldown: 3,
        damage: { base: 8, adRatio: 0.32, type: 'physical', hits: 4, canCrit: true } },
      { key: 'W', name: 'Volley', description: 'A volley that slows.', cooldown: 3,
        damage: { base: 40, adRatio: 1.0, type: 'physical' }, targetDebuff: { stat: 'speed', pct: -0.25, turns: 2 } },
    ],
    ultimate: { key: 'R', name: 'Enchanted Crystal Arrow', description: 'A long stun.', cooldown: 6,
      damage: { base: 110, adRatio: 0.5, type: 'magic' }, stun: 2 },
  },
  {
    id: 'braum', name: 'Braum', ddragonId: 'Braum', title: 'the Heart of the Freljord',
    classes: ['Tank', 'Support'], region: 'Freljord', rarity: 'common',
    statTweaks: { armor: 1.15, mr: 1.15 },
    abilities: [
      { key: 'Q', name: 'Winter\'s Bite', description: 'Ice that slows the target.', cooldown: 2,
        damage: { base: 65, targetMaxHpRatio: 0.05, type: 'magic' }, targetDebuff: { stat: 'speed', pct: -0.3, turns: 2 } },
      { key: 'E', name: 'Unbreakable', description: 'Raises his shield and hardens.', cooldown: 4, castBelowHp: 0.7,
        selfBuff: { stat: 'armor', pct: 0.5, turns: 2 } },
    ],
    ultimate: { key: 'R', name: 'Glacial Fissure', description: 'Slams the ground, knocking up.', cooldown: 6,
      damage: { base: 130, apRatio: 0.6, type: 'magic' }, stun: 1 },
  },
  {
    id: 'sejuani', name: 'Sejuani', ddragonId: 'Sejuani', title: 'Fury of the North',
    classes: ['Tank'], region: 'Freljord', rarity: 'rare',
    abilities: [
      { key: 'Q', name: 'Arctic Assault', description: 'Charges in and knocks up.', cooldown: 4,
        damage: { base: 60, targetMaxHpRatio: 0.04, type: 'magic' }, stun: 1 },
      { key: 'W', name: 'Winter\'s Wrath', description: 'Two flail swings.', cooldown: 2,
        damage: { base: 15, targetMaxHpRatio: 0.02, adRatio: 0.3, type: 'physical', hits: 2 } },
    ],
    ultimate: { key: 'R', name: 'Glacial Prison', description: 'Freezes the target in place.', cooldown: 6,
      damage: { base: 120, apRatio: 0.8, type: 'magic' }, stun: 2 },
  },

  // ───────────── Piltover ─────────────
  {
    id: 'caitlyn', name: 'Caitlyn', ddragonId: 'Caitlyn', title: 'the Sheriff of Piltover',
    classes: ['Marksman'], region: 'Piltover', rarity: 'common',
    statTweaks: { ad: 1.05 },
    abilities: [
      { key: 'Q', name: 'Piltover Peacemaker', description: 'A long-range piercing shot.', cooldown: 2,
        damage: { base: 50, adRatio: 1.3, type: 'physical' } },
      { key: 'W', name: 'Yordle Snap Trap', description: 'A trap that roots.', cooldown: 4,
        damage: { base: 30, adRatio: 0.5, type: 'physical', canCrit: true }, stun: 1 },
    ],
    ultimate: { key: 'R', name: 'Ace in the Hole', description: 'A precise long-range shot.', cooldown: 5,
      damage: { base: 180, adRatio: 1.3, type: 'physical' } },
  },
  {
    id: 'jayce', name: 'Jayce', ddragonId: 'Jayce', title: 'the Defender of Tomorrow',
    classes: ['Fighter', 'Marksman'], region: 'Piltover', rarity: 'rare',
    abilities: [
      { key: 'Q', name: 'Shock Blast', description: 'An accelerated orb of electricity.', cooldown: 2,
        damage: { base: 60, adRatio: 1.4, type: 'physical' } },
      { key: 'E', name: 'Thundering Blow', description: 'A hammer blow based on the target\'s max HP.', cooldown: 3,
        damage: { base: 20, adRatio: 0.8, targetMaxHpRatio: 0.1, type: 'magic' } },
    ],
    ultimate: { key: 'R', name: 'Transform: Mercury Cannon', description: 'Switches stance, gaining attack power.', cooldown: 5,
      selfBuff: { stat: 'ad', pct: 0.35, turns: 3 }, damage: { base: 60, adRatio: 0.8, type: 'physical' } },
  },
  {
    id: 'ezreal', name: 'Ezreal', ddragonId: 'Ezreal', title: 'the Prodigal Explorer',
    classes: ['Marksman', 'Mage'], region: 'Piltover', rarity: 'rare',
    abilities: [
      { key: 'Q', name: 'Mystic Shot', description: 'A quick bolt that can crit.', cooldown: 1,
        damage: { base: 30, adRatio: 1.1, type: 'physical', canCrit: true } },
      { key: 'W', name: 'Essence Flux', description: 'A magic orb.', cooldown: 3,
        damage: { base: 70, adRatio: 1.0, type: 'magic' } },
    ],
    ultimate: { key: 'R', name: 'Trueshot Barrage', description: 'A huge energy wave.', cooldown: 5,
      damage: { base: 200, adRatio: 1.4, type: 'magic' } },
  },

  // ───────────── Zaun ─────────────
  {
    id: 'jinx', name: 'Jinx', ddragonId: 'Jinx', title: 'the Loose Cannon',
    classes: ['Marksman'], region: 'Zaun', rarity: 'common',
    abilities: [
      { key: 'Q', name: 'Switcheroo!', description: 'Rockets that hit twice.', cooldown: 2,
        damage: { base: 10, adRatio: 0.65, type: 'physical', hits: 2, canCrit: true } },
      { key: 'W', name: 'Zap!', description: 'A shock blast that slows.', cooldown: 3,
        damage: { base: 50, adRatio: 1.2, type: 'physical' }, targetDebuff: { stat: 'speed', pct: -0.4, turns: 2 } },
    ],
    ultimate: { key: 'R', name: 'Super Mega Death Rocket!', description: 'Hits harder the more HP the target is missing.', cooldown: 5,
      damage: { base: 150, adRatio: 1.2, targetMissingHpRatio: 0.25, type: 'physical' } },
  },
  {
    id: 'ekko', name: 'Ekko', ddragonId: 'Ekko', title: 'the Boy Who Shattered Time',
    classes: ['Assassin', 'Mage'], region: 'Zaun', rarity: 'rare',
    abilities: [
      { key: 'Q', name: 'Timewinder', description: 'A device that hits on the way out and back.', cooldown: 2,
        damage: { base: 35, apRatio: 0.35, type: 'magic', hits: 2 } },
      { key: 'E', name: 'Phase Dive', description: 'Blinks and strikes with %HP damage.', cooldown: 3,
        damage: { base: 50, apRatio: 0.4, targetMaxHpRatio: 0.03, type: 'magic' } },
    ],
    ultimate: { key: 'R', name: 'Chronobreak', description: 'Rewinds time, healing and dealing damage.', cooldown: 6, castBelowHp: 0.45,
      damage: { base: 150, apRatio: 1.0, type: 'magic' }, heal: { base: 100, apRatio: 0.6, maxHpRatio: 0.1 } },
  },
  {
    id: 'singed', name: 'Singed', ddragonId: 'Singed', title: 'the Mad Chemist',
    classes: ['Tank', 'Mage'], region: 'Zaun', rarity: 'common',
    statTweaks: { hp: 1.1 },
    abilities: [
      { key: 'Q', name: 'Poison Trail', description: 'Poisons the target for several turns.', cooldown: 3,
        dot: { base: 20, apRatio: 0.25, maxHpRatio: 0.03, type: 'magic', turns: 3 } },
      { key: 'E', name: 'Fling', description: 'Flings the target over his shoulder.', cooldown: 4,
        damage: { base: 50, apRatio: 0.5, targetMaxHpRatio: 0.06, type: 'magic' }, stun: 1 },
    ],
    ultimate: { key: 'R', name: 'Insanity Potion', description: 'Drinks a potent concoction.', cooldown: 6,
      selfBuff: { stat: 'armor', pct: 0.4, turns: 3 }, heal: { base: 0, maxHpRatio: 0.15 } },
  },

  // ───────────── Shadow Isles ─────────────
  {
    id: 'thresh', name: 'Thresh', ddragonId: 'Thresh', title: 'the Chain Warden',
    classes: ['Support', 'Tank'], region: 'ShadowIsles', rarity: 'rare',
    abilities: [
      { key: 'Q', name: 'Death Sentence', description: 'Hooks and stuns the target.', cooldown: 4,
        damage: { base: 80, apRatio: 0.5, type: 'magic' }, stun: 1 },
      { key: 'W', name: 'Dark Passage', description: 'A protective lantern shield.', cooldown: 4, castBelowHp: 0.6,
        shield: { base: 70, apRatio: 0.4, maxHpRatio: 0.06 } },
    ],
    ultimate: { key: 'R', name: 'The Box', description: 'Walls of spectral energy slow and damage.', cooldown: 5,
      damage: { base: 150, apRatio: 1.0, type: 'magic' }, targetDebuff: { stat: 'speed', pct: -0.5, turns: 2 } },
  },
  {
    id: 'hecarim', name: 'Hecarim', ddragonId: 'Hecarim', title: 'the Shadow of War',
    classes: ['Fighter', 'Tank'], region: 'ShadowIsles', rarity: 'rare',
    statTweaks: { speed: 1.3 },
    abilities: [
      { key: 'Q', name: 'Rampage', description: 'A cleaving sweep.', cooldown: 1,
        damage: { base: 35, adRatio: 0.9, type: 'physical' } },
      { key: 'E', name: 'Devastating Charge', description: 'Charges and knocks back.', cooldown: 4,
        damage: { base: 40, adRatio: 1.0, type: 'physical' }, stun: 1, selfBuff: { stat: 'speed', pct: 0.4, turns: 2 } },
    ],
    ultimate: { key: 'R', name: 'Onslaught of Shadows', description: 'Spectral riders cause terror.', cooldown: 6,
      damage: { base: 150, apRatio: 1.0, adRatio: 0.4, type: 'magic' }, stun: 1 },
  },
  {
    id: 'karthus', name: 'Karthus', ddragonId: 'Karthus', title: 'the Deathsinger',
    classes: ['Mage'], region: 'ShadowIsles', rarity: 'rare',
    abilities: [
      { key: 'Q', name: 'Lay Waste', description: 'A delayed blast. Cast every turn.', cooldown: 0,
        damage: { base: 50, apRatio: 0.45, type: 'magic' } },
      { key: 'E', name: 'Defile', description: 'An aura of decay.', cooldown: 4,
        dot: { base: 15, apRatio: 0.15, type: 'magic', turns: 3 } },
    ],
    ultimate: { key: 'R', name: 'Requiem', description: 'A massive song of death.', cooldown: 6,
      damage: { base: 220, apRatio: 0.8, type: 'magic' } },
  },

  // ───────────── Shurima ─────────────
  {
    id: 'nasus', name: 'Nasus', ddragonId: 'Nasus', title: 'the Curator of the Sands',
    classes: ['Fighter', 'Tank'], region: 'Shurima', rarity: 'common',
    abilities: [
      { key: 'Q', name: 'Siphoning Strike', description: 'A heavy strike that grows stronger with levels.', cooldown: 1,
        damage: { base: 55, adRatio: 1.2, type: 'physical' }, lifesteal: 0.15 },
      { key: 'W', name: 'Wither', description: 'Ages the target, slowing it heavily.', cooldown: 4,
        targetDebuff: { stat: 'speed', pct: -0.6, turns: 3 } },
    ],
    ultimate: { key: 'R', name: 'Fury of the Sands', description: 'Grows huge, gaining HP and armor.', cooldown: 7,
      selfBuff: { stat: 'armor', pct: 0.5, turns: 4 }, heal: { base: 50, maxHpRatio: 0.2 } },
  },
  {
    id: 'sivir', name: 'Sivir', ddragonId: 'Sivir', title: 'the Battle Mistress',
    classes: ['Marksman'], region: 'Shurima', rarity: 'common',
    abilities: [
      { key: 'Q', name: 'Boomerang Blade', description: 'A blade that hits going out and back.', cooldown: 2,
        damage: { base: 20, adRatio: 0.75, type: 'physical', hits: 2, canCrit: true } },
      { key: 'E', name: 'Spell Shield', description: 'Blocks harm and restores HP.', cooldown: 4, castBelowHp: 0.5,
        shield: { base: 80, adRatio: 0.5 } },
    ],
    ultimate: { key: 'R', name: 'On The Hunt', description: 'Rallies, gaining speed and attack.', cooldown: 6,
      selfBuff: { stat: 'ad', pct: 0.3, turns: 3 }, damage: { base: 50, adRatio: 1.2, type: 'physical', canCrit: true } },
  },
  {
    id: 'rammus', name: 'Rammus', ddragonId: 'Rammus', title: 'the Armordillo',
    classes: ['Tank'], region: 'Shurima', rarity: 'common',
    statTweaks: { armor: 1.4 },
    abilities: [
      { key: 'Q', name: 'Powerball', description: 'Rolls in and knocks back.', cooldown: 4,
        damage: { base: 70, apRatio: 0.6, armorRatio: 0.5, type: 'magic' }, stun: 1 },
      { key: 'W', name: 'Defensive Ball Curl', description: 'Curls up, greatly raising armor.', cooldown: 4,
        selfBuff: { stat: 'armor', pct: 0.6, turns: 2 } },
    ],
    ultimate: { key: 'R', name: 'Soaring Slam', description: 'Leaps and shakes the earth.', cooldown: 6,
      damage: { base: 130, apRatio: 0.6, type: 'magic' }, targetDebuff: { stat: 'speed', pct: -0.4, turns: 2 } },
  },

  // ───────────── Void ─────────────
  {
    id: 'khazix', name: "Kha'Zix", ddragonId: 'Khazix', title: 'the Voidreaver',
    classes: ['Assassin'], region: 'Void', rarity: 'rare',
    abilities: [
      { key: 'Q', name: 'Taste Their Fear', description: 'A slash that hurts more on wounded targets.', cooldown: 1,
        damage: { base: 45, adRatio: 1.1, targetMissingHpRatio: 0.08, type: 'physical' } },
      { key: 'W', name: 'Void Spike', description: 'Spikes that heal him.', cooldown: 3,
        damage: { base: 60, adRatio: 1.0, type: 'physical' }, heal: { base: 40, adRatio: 0.5 } },
    ],
    ultimate: { key: 'R', name: 'Void Assault', description: 'Turns invisible and gains bonus attack.', cooldown: 5,
      selfBuff: { stat: 'ad', pct: 0.4, turns: 2 }, damage: { base: 50, adRatio: 0.8, type: 'physical' } },
  },
  {
    id: 'chogath', name: "Cho'Gath", ddragonId: 'Chogath', title: 'the Terror of the Void',
    classes: ['Tank', 'Mage'], region: 'Void', rarity: 'common',
    statTweaks: { hp: 1.12 },
    abilities: [
      { key: 'Q', name: 'Rupture', description: 'The ground erupts, knocking up.', cooldown: 4,
        damage: { base: 55, apRatio: 0.6, type: 'magic' }, stun: 1 },
      { key: 'W', name: 'Feral Scream', description: 'A terrible scream.', cooldown: 3,
        damage: { base: 45, apRatio: 0.5, type: 'magic' } },
    ],
    ultimate: { key: 'R', name: 'Feast', description: 'Devours the target for true damage.', cooldown: 5,
      damage: { base: 140, apRatio: 0.4, type: 'true' }, heal: { base: 0, maxHpRatio: 0.08 } },
  },
  {
    id: 'kaisa', name: "Kai'Sa", ddragonId: 'Kaisa', title: 'Daughter of the Void',
    classes: ['Marksman', 'Mage'], region: 'Void', rarity: 'rare',
    abilities: [
      { key: 'Q', name: 'Icathian Rain', description: 'A swarm of missiles.', cooldown: 2,
        damage: { base: 15, adRatio: 0.35, type: 'physical', hits: 4 } },
      { key: 'W', name: 'Void Seeker', description: 'A void blast with %missing-HP damage.', cooldown: 3,
        damage: { base: 30, adRatio: 1.0, targetMissingHpRatio: 0.1, type: 'magic' } },
    ],
    ultimate: { key: 'R', name: 'Killer Instinct', description: 'Dashes in behind a shield.', cooldown: 5,
      shield: { base: 100, adRatio: 1.0 }, damage: { base: 40, adRatio: 0.6, type: 'physical' } },
  },

  // ───────────── Bilgewater ─────────────
  {
    id: 'missfortune', name: 'Miss Fortune', ddragonId: 'MissFortune', title: 'the Bounty Hunter',
    classes: ['Marksman', 'Mage'], region: 'Bilgewater', rarity: 'common',
    abilities: [
      { key: 'Q', name: 'Double Up', description: 'A shot that bounces and crits.', cooldown: 2,
        damage: { base: 40, adRatio: 1.35, type: 'physical', canCrit: true } },
      { key: 'E', name: 'Make It Rain', description: 'A rain of bullets that slows.', cooldown: 4,
        damage: { base: 45, adRatio: 0.9, type: 'physical' }, targetDebuff: { stat: 'speed', pct: -0.3, turns: 2 } },
    ],
    ultimate: { key: 'R', name: 'Bullet Time', description: 'Channels waves of bullets.', cooldown: 6,
      damage: { base: 12, adRatio: 0.35, type: 'physical', hits: 8 } },
  },
  {
    id: 'pyke', name: 'Pyke', ddragonId: 'Pyke', title: 'the Bloodharbor Ripper',
    classes: ['Support', 'Assassin'], region: 'Bilgewater', rarity: 'rare',
    abilities: [
      { key: 'Q', name: 'Bone Skewer', description: 'Hooks and drags the target in.', cooldown: 3,
        damage: { base: 70, adRatio: 0.9, type: 'physical' }, stun: 1 },
      { key: 'E', name: 'Phantom Undertow', description: 'Dashes through the target.', cooldown: 4,
        damage: { base: 60, adRatio: 1.0, type: 'physical' } },
    ],
    ultimate: { key: 'R', name: 'Death from Below', description: 'Executes a weakened target.', cooldown: 4,
      damage: { base: 160, adRatio: 0.8, targetMissingHpRatio: 0.2, type: 'true' } },
  },
  {
    id: 'nautilus', name: 'Nautilus', ddragonId: 'Nautilus', title: 'the Titan of the Depths',
    classes: ['Tank', 'Support'], region: 'Bilgewater', rarity: 'common',
    abilities: [
      { key: 'Q', name: 'Dredge Line', description: 'Hooks the target with his anchor.', cooldown: 4,
        damage: { base: 70, apRatio: 0.9, type: 'magic' }, stun: 1 },
      { key: 'W', name: 'Titan\'s Wrath', description: 'A shield of dark water.', cooldown: 4, castBelowHp: 0.7,
        shield: { base: 40, maxHpRatio: 0.07 } },
    ],
    ultimate: { key: 'R', name: 'Depth Charge', description: 'A shockwave that knocks up.', cooldown: 6,
      damage: { base: 150, apRatio: 0.8, type: 'magic' }, stun: 1 },
  },
];

export const CHAMPIONS: Record<string, ChampionDef> = Object.fromEntries(CHAMPION_LIST.map((c) => [c.id, c]));
export const CHAMPION_IDS = CHAMPION_LIST.map((c) => c.id);
