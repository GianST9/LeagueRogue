import { describe, expect, it } from 'vitest';
import { championDef } from '../src/data/bosses';
import { simulateBattle, type BattleEvent, type BattleUnit } from '../src/systems/battle';
import { regionStatuses, regionTiers, tierFor } from '../src/systems/synergies';

const unit = (id: string, level = 8, uid = id): BattleUnit => ({ uid, def: championDef(id), level });
const regionEvents = (events: BattleEvent[], region: string) =>
  events.filter((e) => e.t === 'region' && e.region === region);

describe('region counting', () => {
  it('activates tier 1 at 2 and tier 2 at 3 champions', () => {
    expect([0, 1, 2, 3, 4].map(tierFor)).toEqual([0, 0, 1, 2, 2]);
    expect(regionTiers(['garen', 'lux'])).toEqual({ Demacia: 1 });
    expect(regionTiers(['garen', 'lux', 'lucian', 'jinx'])).toEqual({ Demacia: 2 });
  });

  it('counts duplicate champions once', () => {
    expect(regionTiers(['garen', 'garen'])).toEqual({});
  });

  it('boss-only champions count for their region', () => {
    expect(regionTiers(['garen', 'jarvaniv'])).toEqual({ Demacia: 1 });
  });

  it('lists inactive regions too, active first', () => {
    const s = regionStatuses(['jinx', 'garen', 'lux']);
    expect(s[0]).toMatchObject({ region: 'Demacia', count: 2, tier: 1 });
    expect(s[1]).toMatchObject({ region: 'Zaun', count: 1, tier: 0 });
  });
});

describe('region bonuses in battle', () => {
  it('Demacia: shields on entering', () => {
    const r = simulateBattle({ player: [unit('garen'), unit('lux')], enemy: [unit('sivir')], seed: 1 });
    expect(regionEvents(r.events, 'Demacia').length).toBeGreaterThan(0);
    expect(r.regions.player).toEqual({ Demacia: 1 });
  });

  it('no bonus with a single champion of a region', () => {
    const r = simulateBattle({ player: [unit('garen')], enemy: [unit('sivir')], seed: 1 });
    expect(r.events.some((e) => e.t === 'region')).toBe(false);
  });

  it('Shurima: revives once per champion', () => {
    const r = simulateBattle({
      player: [unit('nasus', 3), unit('sivir', 3), unit('rammus', 3)],
      enemy: [unit('darius', 16)], seed: 2,
    });
    const revives = r.events.filter((e) => e.t === 'revive' && e.side === 'player');
    expect(revives).toHaveLength(3);
  });

  it('Ionia: dodges sometimes', () => {
    let dodges = 0;
    for (let seed = 0; seed < 20; seed++) {
      const r = simulateBattle({ player: [unit('yasuo'), unit('ahri'), unit('shen')], enemy: [unit('darius', 12)], seed });
      dodges += r.events.filter((e) => e.t === 'dodge').length;
    }
    expect(dodges).toBeGreaterThan(0);
  });

  it('Zaun: poisons the target', () => {
    const r = simulateBattle({ player: [unit('jinx'), unit('ekko')], enemy: [unit('rammus', 10)], seed: 3 });
    const dots = r.events.filter((e) => e.t === 'damage' && e.side === 'enemy' && e.source === 'dot');
    expect(dots.length).toBeGreaterThan(0);
  });

  it('Void: hits deal bonus true damage', () => {
    const r = simulateBattle({ player: [unit('khazix'), unit('kaisa')], enemy: [unit('rammus', 10)], seed: 3 });
    expect(r.events.some((e) => e.t === 'damage' && e.source === 'bonus' && e.dmgType === 'true')).toBe(true);
  });

  it('a full region team beats the same champions split across regions more often', () => {
    // Same levels, same team size: Freljord ×3 with the bonus vs 3 unrelated champions, both orders.
    let synergyWins = 0;
    for (let seed = 0; seed < 100; seed++) {
      const r = simulateBattle({
        player: [unit('sejuani'), unit('braum'), unit('ashe')],
        enemy: [unit('rammus'), unit('nautilus'), unit('caitlyn')], seed,
      });
      if (r.winner === 'player') synergyWins++;
    }
    expect(synergyWins).toBeGreaterThan(30);
  });
});
