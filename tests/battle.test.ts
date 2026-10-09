import { CONFIG } from '../src/core/config';
import { describe, expect, it } from 'vitest';
import { CHAMPIONS, CHAMPION_IDS } from '../src/data/champions';
import { simulateBattle, type BattleUnit } from '../src/systems/battle';
import { classMultiplier } from '../src/systems/damage';

const unit = (id: string, level = 5, extra: Partial<BattleUnit> = {}): BattleUnit => ({
  uid: `${id}-${level}-${extra.itemIds?.join() ?? ''}`, def: CHAMPIONS[id], level, ...extra,
});

describe('simulateBattle', () => {
  it('is deterministic for a given seed', () => {
    const player = [unit('garen'), unit('jinx'), unit('lux')];
    const enemy = [unit('darius'), unit('ahri'), unit('thresh')];
    const a = simulateBattle({ player, enemy, seed: 42 });
    const b = simulateBattle({ player, enemy, seed: 42 });
    expect(a).toEqual(b);
  });

  it('always terminates with a winner and an end event', () => {
    for (let seed = 0; seed < 50; seed++) {
      const r = simulateBattle({ player: [unit('rammus', 18)], enemy: [unit('braum', 18)], seed });
      expect(['player', 'enemy']).toContain(r.winner);
      expect(r.events.at(-1)).toMatchObject({ t: 'end', winner: r.winner });
    }
  });

  it('a much higher-level team wins', () => {
    const r = simulateBattle({ player: [unit('garen', 15)], enemy: [unit('garen', 1)], seed: 1 });
    expect(r.winner).toBe('player');
  });

  it('marks the losing side as fainted and keeps winner HP', () => {
    const r = simulateBattle({ player: [unit('caitlyn', 12)], enemy: [unit('sivir', 2), unit('ashe', 2)], seed: 3 });
    expect(r.winner).toBe('player');
    expect(r.enemy.every((u) => u.fainted)).toBe(true);
    expect(r.player[0].hp).toBeGreaterThan(0);
  });

  it('brings in the next champion after a KO', () => {
    const r = simulateBattle({ player: [unit('jinx', 14)], enemy: [unit('lux', 1), unit('ashe', 1)], seed: 9 });
    const enters = r.events.filter((e) => e.t === 'enter' && e.side === 'enemy');
    expect(enters.map((e) => (e as { slot: number }).slot)).toEqual([0, 1]);
  });

  it('skips champions that start fainted', () => {
    const r = simulateBattle({
      player: [unit('garen', 10, { hp: 0 }), unit('darius', 10)],
      enemy: [unit('lux', 1)], seed: 5,
    });
    expect(r.events[0]).toEqual({ t: 'enter', side: 'player', slot: 1 });
  });

  it('locks the ultimate before level 6 and unlocks it at 6', () => {
    const castsR = (level: number) => {
      const r = simulateBattle({ player: [unit('garen', level)], enemy: [unit('rammus', level)], seed: 2 });
      return r.events.some((e) => e.t === 'cast' && e.side === 'player' && e.key === 'R');
    };
    expect(castsR(5)).toBe(false);
    expect(castsR(6)).toBe(true);
  });

  it('Guardian Angel revives once', () => {
    const r = simulateBattle({
      player: [unit('jinx', 3, { itemIds: ['guardian-angel'] })],
      enemy: [unit('darius', 14)], seed: 4,
    });
    expect(r.events.filter((e) => e.t === 'revive')).toHaveLength(1);
    expect(r.winner).toBe('enemy');
  });

  it('stunned champions skip their turn', () => {
    const r = simulateBattle({ player: [unit('ashe', 10)], enemy: [unit('nasus', 10)], seed: 8 });
    const stunIdx = r.events.findIndex((e) => e.t === 'stun' && e.side === 'enemy');
    expect(stunIdx).toBeGreaterThan(-1);
    expect(r.events.slice(stunIdx).some((e) => e.t === 'stunned' && e.side === 'enemy')).toBe(true);
  });

  it('gives a level 1 1v1 a reasonable length', () => {
    let totalTurns = 0;
    let fights = 0;
    for (const a of CHAMPION_IDS) {
      for (const b of CHAMPION_IDS) {
        if (a === b) continue;
        totalTurns += simulateBattle({ player: [unit(a, 1)], enemy: [unit(b, 1)], seed: fights }).turns;
        fights++;
      }
    }
    const avg = totalTurns / fights;
    expect(avg).toBeGreaterThan(3);
    expect(avg).toBeLessThan(25);
  });
});

describe('overtime', () => {
  // Two healing tanks that barely scratch each other.
  const stalemate = (seed: number) => simulateBattle({
    player: [unit('braum', 18, { itemIds: ['warmogs-armor', 'spirit-visage'] }), unit('shen', 18, { itemIds: ['warmogs-armor'] })],
    enemy: [unit('rammus', 18, { itemIds: ['warmogs-armor', 'spirit-visage'] }), unit('nautilus', 18, { itemIds: ['warmogs-armor'] })],
    seed,
  });

  it('ends long matchups with a winner instead of a turn-limit loss', () => {
    for (let seed = 0; seed < 10; seed++) {
      const r = stalemate(seed);
      expect(r.turns).toBeLessThan(CONFIG.battle.maxTurns);
      expect(r.events.some((e) => e.t === 'overtime')).toBe(true);
      expect(r.events.some((e) => e.t === 'damage' && e.source === 'overtime')).toBe(true);
    }
  });

  it('starts after the configured number of turns and resets when a champion enters', () => {
    const r = stalemate(1);
    let turnsSinceEnter = 0;
    for (const e of r.events) {
      if (e.t === 'enter') turnsSinceEnter = 0;
      if (e.t === 'turn') turnsSinceEnter++;
      if (e.t === 'overtime') expect(turnsSinceEnter).toBeGreaterThanOrEqual(CONFIG.battle.overtime.startTurn);
      if (e.t === 'damage' && e.source === 'overtime') {
        expect(turnsSinceEnter).toBeGreaterThanOrEqual(CONFIG.battle.overtime.startTurn);
      }
    }
  });

  it('never knocks out both champions in the same overtime tick', () => {
    for (let seed = 0; seed < 30; seed++) {
      const r = stalemate(seed);
      let killsThisTick = 0;
      for (const e of r.events) {
        if (e.t === 'turn') killsThisTick = 0;
        if (e.t === 'damage' && e.source === 'overtime' && e.hp === 0) killsThisTick++;
        expect(killsThisTick).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('classMultiplier', () => {
  it('assassins are strong against marksmen', () => {
    expect(classMultiplier(CHAMPIONS.khazix, CHAMPIONS.caitlyn)).toBeCloseTo(1.2);
  });
  it('assassins are weak against tanks', () => {
    expect(classMultiplier(CHAMPIONS.khazix, CHAMPIONS.rammus)).toBeCloseTo(0.85);
  });
  it('stacks across dual-class defenders', () => {
    // Fighter vs Tank/Support: strong vs Tank only.
    expect(classMultiplier(CHAMPIONS.garen, CHAMPIONS.braum)).toBeCloseTo(1.2);
    // Assassin vs Marksman/Mage: strong vs both.
    expect(classMultiplier(CHAMPIONS.khazix, CHAMPIONS.ezreal)).toBeCloseTo(1.44);
  });
});
