import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { CHAMPIONS } from '../src/data/champions';
import { CONQUEST_REGIONS, RUNES, STARTING_CHAMPIONS, STARTING_REGION, conquestRegion } from '../src/data/conquest';
import { maxHpOf } from '../src/systems/leveling';
import {
  conquestSetup, newMeta, regionStatus, runeBonus, runePower, runeUpgradeCost, sanitizeMeta, settleRun, unlockChampion,
  unlockCost, upgradeRune, type MetaState,
} from '../src/systems/meta';
import {
  abandonRun, chooseStarter, enterNode, finishBattle, newRun, availableNodes, type RunState,
} from '../src/systems/run';
import { playRun } from './bot';

describe('meta-progression', () => {
  it('starts with the starter collection, Demacia open and no essence', () => {
    const m = newMeta();
    expect(m.champions).toEqual(STARTING_CHAMPIONS);
    expect(m.essence).toBe(0);
    expect(regionStatus(m, STARTING_REGION)).toBe('open');
    expect(CONQUEST_REGIONS.filter((r) => regionStatus(m, r.id) === 'locked')).toHaveLength(CONQUEST_REGIONS.length - 1);
  });

  it('unlocking a champion costs essence by rarity', () => {
    const m = newMeta();
    expect(() => unlockChampion(m, 'ahri')).toThrow();
    m.essence = 1000;
    unlockChampion(m, 'ahri');
    expect(m.champions).toContain('ahri');
    expect(m.essence).toBe(1000 - CONFIG.conquest.unlockCost.rare);
    // Unlocking twice is a no-op.
    unlockChampion(m, 'ahri');
    expect(m.essence).toBe(1000 - unlockCost('ahri'));
  });

  it('rune ranks get more expensive and stop at the max rank', () => {
    const m = newMeta();
    m.essence = 10_000;
    const costs: number[] = [];
    for (let i = 0; i < CONFIG.conquest.maxRuneRank; i++) {
      costs.push(runeUpgradeCost(m, 'garen', 'vitality')!);
      upgradeRune(m, 'garen', 'vitality');
    }
    expect(costs).toEqual(costs.map((_, i) => CONFIG.conquest.runeRankCost * (i + 1)));
    expect(runeUpgradeCost(m, 'garen', 'vitality')).toBeNull();
    expect(() => upgradeRune(m, 'garen', 'vitality')).toThrow();
    expect(runePower(m, 'garen')).toBe(CONFIG.conquest.maxRuneRank);
    expect(runeBonus(m, 'garen').hp).toBeCloseTo(0.25);
  });

  it("can't rune a locked champion or overspend", () => {
    const m = newMeta();
    m.essence = 1000;
    expect(() => upgradeRune(m, 'ahri', 'fury')).toThrow();
    m.essence = 0;
    expect(() => upgradeRune(m, 'garen', 'fury')).toThrow();
  });

  it('sanitizes broken saves', () => {
    expect(sanitizeMeta(null)).toEqual(newMeta());
    const m = sanitizeMeta({
      essence: -5, champions: ['ahri', 'nope', 7], runes: { garen: { fury: 99, junk: 2 }, nope: { fury: 1 } },
      openRegions: ['noxus', 'atlantis'], conquered: ['demacia'],
    });
    expect(m.essence).toBe(0);
    expect(m.champions).toEqual([...STARTING_CHAMPIONS, 'ahri']);
    expect(m.runes).toEqual({ garen: { fury: CONFIG.conquest.maxRuneRank } });
    expect(m.openRegions).toEqual([STARTING_REGION, 'noxus']);
    expect(m.conquered).toEqual(['demacia']);
  });

  it('has a reachable path to every region, getting harder', () => {
    const reached = new Set([STARTING_REGION]);
    for (const r of [...CONQUEST_REGIONS].sort((a, b) => a.tier - b.tier)) {
      expect(reached.has(r.id), r.id).toBe(true);
      for (const next of r.unlocks) {
        expect(conquestRegion(next).tier).toBeGreaterThan(r.tier);
        reached.add(next);
      }
    }
  });
});

function conquestRun(m: MetaState, regionId: string, seed = 1): RunState {
  return newRun('conquest', seed, conquestSetup(m, regionId));
}

describe('conquest runs', () => {
  it('need a setup, and only conquest runs take one', () => {
    expect(() => newRun('conquest', 1)).toThrow();
    expect(() => newRun('short', 1, conquestSetup(newMeta(), STARTING_REGION))).toThrow();
    expect(() => conquestRun(newMeta(), 'bilgewater')).toThrow();
  });

  it('offer the whole collection as starters and end on the region boss', () => {
    const m = newMeta();
    const s = conquestRun(m, STARTING_REGION);
    if (s.phase.kind !== 'starter') throw new Error('expected starter');
    expect(s.phase.options.map((c) => c.defId)).toEqual(m.champions);
    expect(s.bossOrder).toHaveLength(CONFIG.run.modes.conquest.maps);
    expect(s.bossOrder.at(-1)).toBe(STARTING_REGION);
    expect(new Set(s.bossOrder).size).toBe(s.bossOrder.length);
  });

  it('give runed champions their bonus stats', () => {
    const m = newMeta();
    m.essence = 10_000;
    for (let i = 0; i < 3; i++) upgradeRune(m, 'garen', 'vitality');
    const s = conquestRun(m, STARTING_REGION);
    if (s.phase.kind !== 'starter') throw new Error('expected starter');
    const garen = s.phase.options.find((c) => c.defId === 'garen')!;
    const lux = s.phase.options.find((c) => c.defId === 'lux')!;
    expect(garen.statBonus?.hp).toBeCloseTo(0.15);
    expect(lux.statBonus).toBeUndefined();
    expect(garen.hp).toBe(maxHpOf(garen));
    expect(maxHpOf(garen)).toBeGreaterThan(maxHpOf({ ...garen, statBonus: undefined }));
  });

  it('only recruit unlocked champions', () => {
    const m = newMeta();
    const s = conquestRun(m, STARTING_REGION, 4);
    chooseStarter(s, 0);
    for (let seed = 0; seed < 30; seed++) {
      const t = structuredClone(s);
      t.rngState = seed;
      const recruit = availableNodes(t).find((n) => n.kind === 'recruit')!;
      enterNode(t, recruit.id);
      if (t.phase.kind !== 'recruit') throw new Error('expected recruit');
      for (const c of t.phase.options) expect(m.champions).toContain(c.defId);
    }
  });

  it('make enemies stronger in harder regions and pay more essence', () => {
    const m = newMeta();
    m.openRegions.push('bilgewater');
    const fightIn = (regionId: string) => {
      const s = conquestRun(m, regionId, 9);
      chooseStarter(s, 0);
      const fight = availableNodes(s).find((n) => n.kind === 'camp' || n.kind === 'rival')!;
      enterNode(s, fight.id);
      if (s.phase.kind !== 'battle') throw new Error('expected battle');
      const enemyBonus = s.phase.enemy[0].statBonus;
      // Force a win to compare the pay.
      s.phase.result = { ...s.phase.result, winner: 'player' };
      finishBattle(s);
      return { enemyBonus, essence: s.conquest!.essence };
    };
    const easy = fightIn(STARTING_REGION);
    const hard = fightIn('bilgewater');
    expect(easy.enemyBonus).toBeUndefined();
    expect(hard.enemyBonus?.hp).toBeCloseTo(conquestRegion('bilgewater').enemyBonus);
    expect(easy.essence).toBeGreaterThan(0);
    expect(hard.essence).toBeGreaterThan(easy.essence);
  });

  it('bank essence once, with conquest bonuses and new regions on a win', () => {
    const m = newMeta();
    const s = conquestRun(m, STARTING_REGION);
    s.conquest!.essence = 40;
    s.phase = { kind: 'victory' };
    const reward = settleRun(m, s)!;
    const region = conquestRegion(STARTING_REGION);
    expect(reward.clear).toBe(CONFIG.conquest.clearBonus);
    expect(reward.firstClear).toBe(CONFIG.conquest.firstClearBonus);
    expect(m.essence).toBe(40 + reward.clear + reward.firstClear);
    expect(reward.newRegions).toEqual(region.unlocks);
    expect(regionStatus(m, STARTING_REGION)).toBe('conquered');
    for (const id of region.unlocks) expect(regionStatus(m, id)).toBe('open');
    // Settling again pays nothing.
    settleRun(m, s);
    expect(m.essence).toBe(reward.total);

    // A second conquest has no first-time bonus.
    const again = conquestRun(m, STARTING_REGION);
    again.phase = { kind: 'victory' };
    expect(settleRun(m, again)!.firstClear).toBe(0);
  });

  it('keep fight essence after a defeat or abandoning', () => {
    const m = newMeta();
    const s = conquestRun(m, STARTING_REGION);
    chooseStarter(s, 0);
    s.conquest!.essence = 25;
    expect(() => settleRun(m, s)).toThrow();
    abandonRun(s);
    expect(s.phase.kind).toBe('gameOver');
    const reward = settleRun(m, s)!;
    expect(reward.total).toBe(25);
    expect(m.essence).toBe(25);
    expect(m.conquered).toEqual([]);
  });
});

/**
 * A whole campaign with the bot: play the easiest unconquered open region, bank the essence, then spread it over
 * the runes of six champions. Prints how many runs each region took with `npm run balance`.
 */
function playCampaign(seed: number, maxRuns = 300): { runs: number; runsPerRegion: Record<string, number>; done: boolean } {
  const m = newMeta();
  const runsPerRegion: Record<string, number> = {};
  const core = m.champions.slice(0, CONFIG.team.maxSize);
  for (let run = 0; run < maxRuns; run++) {
    const target = CONQUEST_REGIONS
      .filter((r) => regionStatus(m, r.id) === 'open')
      .sort((a, b) => a.tier - b.tier)[0];
    if (!target) return { runs: run, runsPerRegion, done: true };
    runsPerRegion[target.id] = (runsPerRegion[target.id] ?? 0) + 1;
    const result = playRun(conquestRun(m, target.id, seed * 1000 + run));
    settleRun(m, result.state);
    // Spend: always the cheapest rune rank among the core six.
    for (;;) {
      const options = core.flatMap((id) => RUNES.map((r) => ({ id, rune: r.id, cost: runeUpgradeCost(m, id, r.id) })))
        .filter((o): o is { id: string; rune: string; cost: number } => o.cost !== null && o.cost <= m.essence)
        .sort((a, b) => a.cost - b.cost);
      if (!options.length) break;
      upgradeRune(m, options[0].id, options[0].rune);
    }
  }
  return { runs: maxRuns, runsPerRegion, done: false };
}

describe('campaign', () => {
  it('the bot can conquer every region given enough runs', () => {
    const results = Array.from({ length: 6 }, (_, seed) => playCampaign(seed));
    if (process.env.npm_lifecycle_event === 'balance') {
      for (const r of results) {
        console.log(`campaign: ${r.done ? `done in ${r.runs} runs` : 'not finished'} · ${CONQUEST_REGIONS.map((x) => `${x.id} ${r.runsPerRegion[x.id] ?? '-'}`).join(', ')}`);
      }
    }
    expect(results.filter((r) => r.done).length).toBeGreaterThan(0);
  });

  it('every roster champion can be unlocked', () => {
    for (const id of Object.keys(CHAMPIONS)) expect(unlockCost(id)).toBeGreaterThan(0);
  });
});
