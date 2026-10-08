import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { createRng } from '../src/core/rng';
import type { RunChampion } from '../src/core/types';
import { CHAMPIONS, CHAMPION_IDS } from '../src/data/champions';
import { ITEMS } from '../src/data/items';
import { REGIONS } from '../src/data/regions';
import { fullHeal, grantXp, maxHpOf } from '../src/systems/leveling';
import { computeStats, itemStatScale, ultimateRank } from '../src/systems/stats';

describe('rng', () => {
  it('repeats for the same seed', () => {
    const a = createRng(123);
    const b = createRng(123);
    expect(Array.from({ length: 10 }, () => a.next())).toEqual(Array.from({ length: 10 }, () => b.next()));
  });
  it('int stays in range', () => {
    const r = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const n = r.int(2, 5);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(5);
    }
  });
  it('weighted never picks a zero-weight key', () => {
    const r = createRng(7);
    for (let i = 0; i < 500; i++) expect(r.weighted({ a: 1, b: 0, c: 3 })).not.toBe('b');
  });
});

describe('data', () => {
  it('has 30 champions, 3 per region', () => {
    expect(CHAMPION_IDS).toHaveLength(30);
    const perRegion = new Map<string, number>();
    for (const id of CHAMPION_IDS) perRegion.set(CHAMPIONS[id].region, (perRegion.get(CHAMPIONS[id].region) ?? 0) + 1);
    expect([...perRegion.keys()].sort()).toEqual(Object.keys(REGIONS).sort());
    expect([...perRegion.values()].every((n) => n === 3)).toBe(true);
  });
  it('every champion has 1–2 abilities and an R ultimate', () => {
    for (const id of CHAMPION_IDS) {
      const c = CHAMPIONS[id];
      expect(c.abilities.length, id).toBeGreaterThanOrEqual(1);
      expect(c.abilities.length, id).toBeLessThanOrEqual(2);
      expect(c.ultimate.key, id).toBe('R');
    }
  });
  it('item ids match their keys', () => {
    for (const [key, item] of Object.entries(ITEMS)) expect(item.id).toBe(key);
  });
});

describe('stats & leveling', () => {
  it('stats grow with level', () => {
    const l1 = computeStats(CHAMPIONS.garen, 1);
    const l18 = computeStats(CHAMPIONS.garen, 18);
    expect(l18.hp).toBeGreaterThan(l1.hp * 2);
    expect(l18.ad).toBeGreaterThan(l1.ad * 2);
  });
  it('items and skin lines add stats', () => {
    const base = computeStats(CHAMPIONS.jinx, 5);
    expect(computeStats(CHAMPIONS.jinx, 5, ['infinity-edge']).ad).toBeCloseTo(base.ad + 40 * itemStatScale(5));
    expect(itemStatScale(18)).toBe(1);
    expect(computeStats(CHAMPIONS.jinx, 5, [], 'Star Guardian').ad).toBeCloseTo(base.ad * 1.05);
  });
  it('ultimate ranks at 6 / 11 / 16', () => {
    expect([1, 5, 6, 10, 11, 15, 16, 18].map(ultimateRank)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  const fresh = (): RunChampion => {
    const c: RunChampion = { uid: 'x', defId: 'garen', level: 1, xp: 0, hp: 0, fainted: false, itemIds: [] };
    c.hp = maxHpOf(c);
    return c;
  };

  it('grantXp levels up and carries over XP', () => {
    const c = fresh();
    expect(grantXp(c, 250)).toBe(2);
    expect(c.level).toBe(3);
    expect(c.xp).toBe(50);
  });
  it('levelling up raises current HP by the max HP gained', () => {
    const c = fresh();
    c.hp -= 100;
    const before = maxHpOf(c);
    grantXp(c, 100);
    expect(c.hp).toBe(maxHpOf(c) - 100);
    expect(maxHpOf(c)).toBeGreaterThan(before);
  });
  it('stops at the level cap', () => {
    const c = fresh();
    grantXp(c, 100_000);
    expect(c.level).toBe(CONFIG.leveling.maxLevel);
    expect(c.xp).toBe(0);
  });
  it('fullHeal revives', () => {
    const c = fresh();
    c.hp = 0;
    c.fainted = true;
    fullHeal(c);
    expect(c.fainted).toBe(false);
    expect(c.hp).toBe(maxHpOf(c));
  });
});
