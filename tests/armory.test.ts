import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { createRng } from '../src/core/rng';
import type { RunChampion } from '../src/core/types';
import { championDef } from '../src/data/bosses';
import { ITEMS, ITEM_IDS } from '../src/data/items';
import { combineEffects, simulateBattle } from '../src/systems/battle';
import { grantXp, maxHpOf, xpToNext } from '../src/systems/leveling';
import { generateMap } from '../src/systems/map';
import {
  buyItem, chooseStarter, continueRun, equipFromBag, newRun, rerollShop, sellItem, sellPrice, unequip, type RunState,
} from '../src/systems/run';

describe('steep XP curve', () => {
  it('early levels are cheap, late levels expensive', () => {
    expect(xpToNext(1, 'steep')).toBe(40);
    expect(xpToNext(17, 'steep')).toBeGreaterThan(350);
    for (let l = 1; l < 17; l++) expect(xpToNext(l + 1, 'steep')).toBeGreaterThan(xpToNext(l, 'steep'));
  });

  it('the flat curve is unchanged', () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(17)).toBe(100);
  });

  it('grantXp follows the curve', () => {
    const c: RunChampion = { uid: 'x', defId: 'garen', level: 1, xp: 0, hp: 0, fainted: false, itemIds: [] };
    c.hp = maxHpOf(c);
    grantXp(c, 40 + 46, 'steep');
    expect(c.level).toBe(3);
  });
});

describe('Armory maps', () => {
  it('never contain item nodes', () => {
    for (let seed = 0; seed < 50; seed++) {
      const map = generateMap(createRng(seed), seed / 50, ['item']);
      expect(map.layers.flat().some((n) => n.kind === 'item')).toBe(false);
    }
  });
});

/** An Armory run that has just cleared its first region. */
function atShop(gold: number): RunState {
  const s = newRun('armory', 11);
  chooseStarter(s, 0);
  s.phase = { kind: 'mapComplete', bossId: s.bossOrder[0], xp: 0, gold: 0, essence: 0, gains: [] };
  s.gold = gold;
  continueRun(s);
  return s;
}

describe('shop', () => {
  it('opens after a region and offers distinct items', () => {
    const s = atShop(0);
    expect(s.phase.kind).toBe('shop');
    if (s.phase.kind !== 'shop') return;
    expect(s.phase.offers).toHaveLength(CONFIG.armory.shopOffers);
    expect(new Set(s.phase.offers).size).toBe(CONFIG.armory.shopOffers);
  });

  it('buying spends gold, puts the item in the bag and removes the offer', () => {
    const s = atShop(1000);
    if (s.phase.kind !== 'shop') throw new Error();
    const id = s.phase.offers[0]!;
    buyItem(s, 0);
    expect(s.gold).toBe(1000 - ITEMS[id].cost);
    expect(s.bag).toEqual([id]);
    expect(s.phase.offers[0]).toBeNull();
  });

  it('several items can be bought in one visit', () => {
    const s = atShop(10_000);
    if (s.phase.kind !== 'shop') throw new Error();
    for (let i = 0; i < CONFIG.armory.shopOffers; i++) buyItem(s, i);
    expect(s.bag).toHaveLength(CONFIG.armory.shopOffers);
  });

  it("can't overspend", () => {
    const s = atShop(0);
    expect(() => buyItem(s, 0)).toThrow();
    expect(() => rerollShop(s)).toThrow();
  });

  it('reroll costs gold and replaces offers', () => {
    const s = atShop(100);
    rerollShop(s);
    expect(s.gold).toBe(100 - CONFIG.armory.rerollCost);
  });

  it('selling returns half the price', () => {
    const s = atShop(0);
    s.bag = ['infinity-edge'];
    sellItem(s, 0);
    expect(s.gold).toBe(sellPrice('infinity-edge'));
    expect(s.bag).toEqual([]);
  });

  it('leaving the shop starts the next map', () => {
    const s = atShop(0);
    continueRun(s);
    expect(s.phase.kind).toBe('map');
    expect(s.mapIndex).toBe(1);
  });
});

describe('item slots', () => {
  it('Armory champions hold up to 3 items; equipping a full slot swaps', () => {
    const s = atShop(0);
    const champ = s.team[0];
    s.bag = ['long-sword', 'ruby-crystal', 'cloth-armor', 'bf-sword'];
    equipFromBag(s, 'long-sword', champ.uid);
    equipFromBag(s, 'ruby-crystal', champ.uid);
    equipFromBag(s, 'cloth-armor', champ.uid);
    expect(champ.itemIds).toEqual(['long-sword', 'ruby-crystal', 'cloth-armor']);
    equipFromBag(s, 'bf-sword', champ.uid, 1);
    expect(champ.itemIds).toEqual(['long-sword', 'bf-sword', 'cloth-armor']);
    expect(s.bag).toEqual(['ruby-crystal']);
    unequip(s, champ.uid, 0);
    expect(champ.itemIds).toEqual(['bf-sword', 'cloth-armor']);
  });

  it('classic champions still hold one item', () => {
    const s = newRun('full', 3);
    chooseStarter(s, 0);
    const champ = s.team[0];
    s.bag = ['long-sword', 'bf-sword'];
    equipFromBag(s, 'long-sword', champ.uid);
    equipFromBag(s, 'bf-sword', champ.uid);
    expect(champ.itemIds).toEqual(['bf-sword']);
    expect(s.bag).toEqual(['long-sword']);
  });

  it('item HP counts towards max HP', () => {
    const s = atShop(0);
    const champ = s.team[0];
    const before = maxHpOf(champ);
    s.bag = ['giants-belt'];
    equipFromBag(s, 'giants-belt', champ.uid);
    expect(maxHpOf(champ)).toBeGreaterThan(before);
    expect(champ.hp).toBe(maxHpOf(champ));
  });
});

describe('item effects', () => {
  it('stacking: numbers add up, one-off effects use the strongest copy, caps apply', () => {
    const fx = combineEffects([ITEMS['vampiric-scepter'], ITEMS['bloodthirster'], ITEMS['morellonomicon'], ITEMS['executioners-calling']]);
    expect(fx.lifesteal).toBeCloseTo(0.2);
    expect(fx.antiHeal).toBe(0.5);
    expect(combineEffects([ITEMS['void-staff'], ITEMS['void-staff']]).magicPen).toBe(0.6);
  });

  it('every item has a cost and tier, and new items are shop-only', () => {
    for (const id of ITEM_IDS) {
      expect(ITEMS[id].cost, id).toBeGreaterThan(0);
      if (ITEMS[id].tier !== 'legendary') expect(ITEMS[id].shopOnly, id).toBe(true);
    }
  });

  it('grievous wounds reduce healing', () => {
    const healed = (enemyItems: string[]) => {
      const r = simulateBattle({
        player: [{ uid: 'p', def: championDef('darius'), level: 10, itemIds: ['bloodthirster'] }],
        enemy: [{ uid: 'e', def: championDef('rammus'), level: 10, itemIds: enemyItems }],
        seed: 4,
      });
      return r.events.filter((e) => e.t === 'heal' && e.side === 'player').reduce((sum, e) => sum + (e as { amount: number }).amount, 0);
    };
    expect(healed(['morellonomicon'])).toBeLessThan(healed([]) * 0.75);
  });

  it("Sterak's shields once when low", () => {
    const r = simulateBattle({
      player: [{ uid: 'p', def: championDef('garen'), level: 6, itemIds: ['steraks-gage'] }],
      enemy: [{ uid: 'e', def: championDef('darius'), level: 14 }],
      seed: 2,
    });
    const shields = r.events.filter((e) => e.t === 'shield' && e.side === 'player');
    expect(shields.length).toBeGreaterThanOrEqual(1);
  });
});
