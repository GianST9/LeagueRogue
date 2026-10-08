// Region bosses (the "gym leaders"). Each fights with a themed team and their own champion as the ace.
// Boss-only champions aren't recruitable; Swain is both a boss and part of the roster.

import type { ChampionDef, Region } from '../core/types';
import { CHAMPIONS } from './champions';

export interface BossDef {
  id: string;
  /** Champion id of the ace (in BOSS_CHAMPIONS or CHAMPIONS). */
  aceId: string;
  region: Region;
  /** Roster champions the boss fields before the ace, front first. */
  team: string[];
  /** Item the ace always holds. */
  aceItemId: string;
  intro: string;
}

export const BOSS_CHAMPIONS: Record<string, ChampionDef> = {
  jarvaniv: {
    id: 'jarvaniv', name: 'Jarvan IV', ddragonId: 'JarvanIV', title: 'the Exemplar of Demacia',
    classes: ['Fighter', 'Tank'], region: 'Demacia', rarity: 'legendary',
    abilities: [
      { key: 'Q', name: 'Dragon Strike', description: 'A spear thrust that shreds armor.', cooldown: 2,
        damage: { base: 50, adRatio: 1.2, type: 'physical' }, targetDebuff: { stat: 'armor', pct: -0.25, turns: 3 } },
      { key: 'W', name: 'Golden Aegis', description: 'A royal shield.', cooldown: 4, castBelowHp: 0.7,
        shield: { base: 60, maxHpRatio: 0.08 } },
    ],
    ultimate: { key: 'R', name: 'Cataclysm', description: 'Leaps in and traps the target in an arena.', cooldown: 6,
      damage: { base: 150, adRatio: 1.4, type: 'physical' }, stun: 1 },
  },
  lissandra: {
    id: 'lissandra', name: 'Lissandra', ddragonId: 'Lissandra', title: 'the Ice Witch',
    classes: ['Mage'], region: 'Freljord', rarity: 'legendary',
    abilities: [
      { key: 'Q', name: 'Ice Shard', description: 'A shard that slows.', cooldown: 1,
        damage: { base: 60, apRatio: 0.6, type: 'magic' }, targetDebuff: { stat: 'speed', pct: -0.2, turns: 2 } },
      { key: 'W', name: 'Ring of Frost', description: 'Freezes the target in place.', cooldown: 4,
        damage: { base: 60, apRatio: 0.5, type: 'magic' }, stun: 1 },
    ],
    ultimate: { key: 'R', name: 'Frozen Tomb', description: 'Encases herself in ice and heals.', cooldown: 6, castBelowHp: 0.5,
      heal: { base: 100, apRatio: 0.8, maxHpRatio: 0.1 }, selfBuff: { stat: 'armor', pct: 0.5, turns: 2 } },
  },
  zed: {
    id: 'zed', name: 'Zed', ddragonId: 'Zed', title: 'the Master of Shadows',
    classes: ['Assassin'], region: 'Ionia', rarity: 'legendary',
    abilities: [
      { key: 'Q', name: 'Razor Shuriken', description: 'Two shuriken from Zed and his shadow.', cooldown: 1,
        damage: { base: 35, adRatio: 0.6, type: 'physical', hits: 2 } },
      { key: 'E', name: 'Shadow Slash', description: 'A slash that slows.', cooldown: 2,
        damage: { base: 50, adRatio: 0.8, type: 'physical' }, targetDebuff: { stat: 'speed', pct: -0.3, turns: 2 } },
    ],
    ultimate: { key: 'R', name: 'Death Mark', description: 'Marks the target, then detonates the mark.', cooldown: 5,
      damage: { base: 120, adRatio: 1.2, targetMissingHpRatio: 0.2, type: 'physical' } },
  },
  viktor: {
    id: 'viktor', name: 'Viktor', ddragonId: 'Viktor', title: 'the Herald of the Arcane',
    classes: ['Mage'], region: 'Zaun', rarity: 'legendary',
    abilities: [
      { key: 'Q', name: 'Siphon Power', description: 'Drains energy into a shield.', cooldown: 1,
        damage: { base: 50, apRatio: 0.45, type: 'magic' }, shield: { base: 20, apRatio: 0.15 } },
      { key: 'E', name: 'Death Ray', description: 'A searing laser beam.', cooldown: 3,
        damage: { base: 90, apRatio: 0.8, type: 'magic' } },
    ],
    ultimate: { key: 'R', name: 'Arcane Storm', description: 'A storm of energy that burns over time.', cooldown: 6,
      damage: { base: 100, apRatio: 0.6, type: 'magic' }, dot: { base: 40, apRatio: 0.3, type: 'magic', turns: 3 } },
  },
  azir: {
    id: 'azir', name: 'Azir', ddragonId: 'Azir', title: 'the Emperor of the Sands',
    classes: ['Mage', 'Marksman'], region: 'Shurima', rarity: 'legendary',
    abilities: [
      { key: 'W', name: 'Arise!', description: 'Sand soldiers strike twice.', cooldown: 0,
        damage: { base: 30, apRatio: 0.35, type: 'magic', hits: 2 } },
      { key: 'E', name: 'Shifting Sands', description: 'Dashes behind a shield.', cooldown: 4, castBelowHp: 0.6,
        shield: { base: 80, apRatio: 0.6 } },
    ],
    ultimate: { key: 'R', name: "Emperor's Divide", description: 'A wall of soldiers knocks the enemy back.', cooldown: 6,
      damage: { base: 160, apRatio: 0.8, type: 'magic' }, stun: 1 },
  },
  viego: {
    id: 'viego', name: 'Viego', ddragonId: 'Viego', title: 'The Ruined King',
    classes: ['Fighter', 'Assassin'], region: 'ShadowIsles', rarity: 'legendary',
    abilities: [
      { key: 'Q', name: 'Blade of the Ruined King', description: 'A thrust that steals life.', cooldown: 1,
        damage: { base: 35, adRatio: 0.9, type: 'physical' }, lifesteal: 0.15 },
      { key: 'W', name: 'Spectral Maw', description: 'A dash that stuns.', cooldown: 4,
        damage: { base: 60, adRatio: 1.0, type: 'magic' }, stun: 1 },
    ],
    ultimate: { key: 'R', name: 'Heartbreaker', description: 'Shatters a weakened target.', cooldown: 5,
      damage: { base: 100, adRatio: 1.2, targetMissingHpRatio: 0.2, type: 'physical' } },
  },
  gangplank: {
    id: 'gangplank', name: 'Gangplank', ddragonId: 'Gangplank', title: 'the Saltwater Scourge',
    classes: ['Fighter'], region: 'Bilgewater', rarity: 'legendary',
    statTweaks: { crit: 1 },
    abilities: [
      { key: 'Q', name: 'Parrrley', description: 'A pistol shot that can crit.', cooldown: 1,
        damage: { base: 30, adRatio: 1.0, type: 'physical', canCrit: true } },
      { key: 'W', name: 'Remove Scurvy', description: 'Eats citrus to heal and clear stuns.', cooldown: 4, castBelowHp: 0.55,
        heal: { base: 80, apRatio: 0.9, maxHpRatio: 0.1 } },
    ],
    ultimate: { key: 'R', name: 'Cannon Barrage', description: 'A rain of cannonballs.', cooldown: 6,
      damage: { base: 40, adRatio: 0.3, type: 'magic', hits: 6 } },
  },
};

export const BOSSES: BossDef[] = [
  { id: 'demacia', aceId: 'jarvaniv', region: 'Demacia', team: ['lucian', 'lux', 'garen'], aceItemId: 'black-cleaver',
    intro: 'Jarvan IV stands with the might of Demacia.' },
  { id: 'noxus', aceId: 'swain', region: 'Noxus', team: ['katarina', 'darius'], aceItemId: 'spirit-visage',
    intro: 'Swain surveys the field. "Noxus does not kneel."' },
  { id: 'freljord', aceId: 'lissandra', region: 'Freljord', team: ['ashe', 'braum', 'sejuani'], aceItemId: 'zhonyas-hourglass',
    intro: 'The air goes still and cold. Lissandra awaits.' },
  { id: 'ionia', aceId: 'zed', region: 'Ionia', team: ['shen', 'ahri', 'yasuo'], aceItemId: 'the-collector',
    intro: 'Shadows move in the corner of your eye. Zed is here.' },
  { id: 'zaun', aceId: 'viktor', region: 'Zaun', team: ['singed', 'ekko', 'jinx'], aceItemId: 'void-staff',
    intro: 'Viktor has evolved. Have you?' },
  { id: 'shurima', aceId: 'azir', region: 'Shurima', team: ['rammus', 'nasus', 'sivir'], aceItemId: 'rabadons-deathcap',
    intro: 'Azir rises from the sands. "Shurima! Your emperor has returned!"' },
  { id: 'shadowisles', aceId: 'viego', region: 'ShadowIsles', team: ['thresh', 'hecarim', 'karthus'], aceItemId: 'blade-of-the-ruined-king',
    intro: 'The Black Mist rolls in. Viego searches for his queen.' },
  { id: 'bilgewater', aceId: 'gangplank', region: 'Bilgewater', team: ['nautilus', 'pyke', 'missfortune'], aceItemId: 'infinity-edge',
    intro: 'Gangplank peels an orange. "Time to pay the toll."' },
];

/** Looks up any champion, recruitable or boss-only. */
export function championDef(id: string): ChampionDef {
  const def = CHAMPIONS[id] ?? BOSS_CHAMPIONS[id];
  if (!def) throw new Error(`Unknown champion: ${id}`);
  return def;
}
