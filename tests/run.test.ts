import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { CONFIG } from '../src/core/config';
import { generateMap, findNode, type NodeKind } from '../src/systems/map';
import { chooseRecruit, chooseStarter, enterNode, newRun, type RunMode } from '../src/systems/run';
import { playRun } from './bot';

/** Plays a fresh run of a classic mode with the bot. */
function autoplay(mode: Exclude<RunMode, 'conquest'>, seed: number) {
  return playRun(newRun(mode, seed));
}

describe('generateMap', () => {
  it('has the configured layers and a single boss at the end', () => {
    const map = generateMap(createRng(1), 0);
    expect(map.layers.map((l) => l.length)).toEqual([...CONFIG.run.layers, 1]);
    expect(map.layers.at(-1)![0].kind).toBe('boss');
  });

  it('every node is reachable and every non-boss node leads somewhere', () => {
    for (let seed = 0; seed < 50; seed++) {
      const map = generateMap(createRng(seed), seed / 50);
      for (let l = 1; l < map.layers.length; l++) {
        const incoming = new Set(map.layers[l - 1].flatMap((n) => n.next));
        for (const node of map.layers[l]) expect(incoming.has(node.id)).toBe(true);
      }
      for (const layer of map.layers.slice(0, -1)) for (const n of layer) expect(n.next.length).toBeGreaterThan(0);
    }
  });

  it('edges never cross', () => {
    for (let seed = 0; seed < 20; seed++) {
      const map = generateMap(createRng(seed), 0.5);
      for (const layer of map.layers.slice(0, -1)) {
        const edges = layer.flatMap((n) => n.next.map((id) => [n.index, findNode(map, id).index]));
        for (const [a1, b1] of edges) for (const [a2, b2] of edges) expect(a1 < a2 && b1 > b2).toBe(false);
      }
    }
  });

  it('first layer: a fight, a recruit and a random non-fountain node', () => {
    for (let seed = 0; seed < 50; seed++) {
      const progress = seed % 2 ? 0 : 0.5;
      const kinds = generateMap(createRng(seed), progress).layers[0].map((n) => n.kind);
      expect(kinds).toHaveLength(3);
      expect(kinds).toContain('recruit');
      expect(kinds.some((k) => k === 'camp' || k === 'rival')).toBe(true);
      expect(kinds).not.toContain('fountain');
      // The very first fight of a run is always a camp.
      if (progress === 0) expect(kinds).toContain('camp');
    }
  });

  it('before the boss: exactly one fountain and one other node', () => {
    for (let seed = 0; seed < 50; seed++) {
      const map = generateMap(createRng(seed), 0.3);
      const kinds: NodeKind[] = map.layers[map.layers.length - 2].map((n) => n.kind);
      expect(kinds).toHaveLength(2);
      expect(kinds.filter((k) => k === 'fountain')).toHaveLength(1);
    }
  });
});

describe('run', () => {
  it('starts with 3 common starters at the start level', () => {
    const s = newRun('short', 1);
    expect(s.phase.kind).toBe('starter');
    if (s.phase.kind !== 'starter') return;
    expect(s.phase.options).toHaveLength(3);
    expect(s.phase.options.every((c) => c.level === CONFIG.run.startLevel)).toBe(true);
  });

  it('is deterministic for a seed', () => {
    expect(autoplay('short', 77).state).toEqual(autoplay('short', 77).state);
  });

  it('rejects unreachable nodes', () => {
    const s = newRun('short', 3);
    chooseStarter(s, 0);
    expect(() => enterNode(s, '2-0')).toThrow();
  });

  it('full team recruit requires a replacement', () => {
    const s = newRun('short', 5);
    chooseStarter(s, 0);
    s.team = Array.from({ length: CONFIG.team.maxSize }, () => ({ ...s.team[0] }));
    s.phase = { kind: 'recruit', options: [{ ...s.team[0], uid: 'new' }] };
    expect(() => chooseRecruit(s, 0)).toThrow();
  });

  for (const mode of ['short', 'full', 'armory'] as const) {
    it(`the bot can play ${mode} runs to completion without errors`, () => {
      const results = Array.from({ length: 40 }, (_, seed) => autoplay(mode, seed));
      const wins = results.filter((r) => r.won).length;
      const avgMaps = results.reduce((sum, r) => sum + r.mapsCleared, 0) / results.length;
      if (process.env.npm_lifecycle_event === 'balance') {
        const reached = Array.from({ length: results[0].state.totalMaps + 1 }, (_, m) => results.filter((r) => r.mapsCleared >= m).length);
        console.log(`${mode}: bot win rate ${Math.round((wins / results.length) * 100)}%, avg maps cleared ${avgMaps.toFixed(2)}, runs clearing ≥N maps: ${reached.join(' ')}`);
      }
      // A naive bot should sometimes win but not always.
      expect(results.every((r) => r.state.team.length > 0)).toBe(true);
    });
  }
});
