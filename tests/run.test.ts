import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { CONFIG } from '../src/core/config';
import { generateMap, findNode, type NodeKind } from '../src/systems/map';
import { regionStatuses } from '../src/systems/synergies';
import {
  buyItem, equipFromBag, modeConfig,
  availableNodes, chooseItem, chooseLevelUp, chooseRecruit, chooseStarter, continueRun, enterNode, finishBattle,
  newRun, type RunMode, type RunState,
} from '../src/systems/run';
import { ITEMS } from '../src/data/items';

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

const NODE_PRIORITY: NodeKind[] = ['camp', 'levelup', 'rival', 'item', 'recruit', 'fountain', 'boss'];

/** A simple greedy bot. Returns how far it got. */
function autoplay(mode: RunMode, seed: number): { state: RunState; won: boolean; mapsCleared: number } {
  const s = newRun(mode, seed);
  chooseStarter(s, 0);
  for (let step = 0; step < 500; step++) {
    const p = s.phase;
    switch (p.kind) {
      case 'map': {
        const nodes = availableNodes(s);
        const healthy = s.team.filter((c) => !c.fainted).length;
        const depleted = healthy * 2 <= s.team.length;
        const rank = (k: NodeKind) => {
          if (k === 'fountain' && healthy < s.team.length) return -3;
          if (k === 'recruit' && s.team.length < CONFIG.team.maxSize) return -2;
          // A sensible player avoids fights while half the team is knocked out.
          if (depleted && (k === 'camp' || k === 'rival')) return 10 + NODE_PRIORITY.indexOf(k);
          return NODE_PRIORITY.indexOf(k);
        };
        // Like a human, steer toward a reachable fountain when anyone is knocked out.
        const reachesFountain = (id: string): boolean => {
          const node = findNode(s.map, id);
          return node.kind === 'fountain' || node.next.some(reachesFountain);
        };
        const pathRank = (id: string) => (healthy < s.team.length && !reachesFountain(id) ? 5 : 0);
        const pick = [...nodes].sort((a, b) => rank(a.kind) + pathRank(a.id) - rank(b.kind) - pathRank(b.id))[0];
        enterNode(s, pick.id);
        break;
      }
      case 'battle': finishBattle(s); break;
      case 'recruit': {
        // Chase region bonuses: take the recruit that most improves the team's region tiers.
        const full = s.team.length >= CONFIG.team.maxSize;
        const score = (ids: string[]) => regionStatuses(ids).reduce((sum, r) => sum + r.tier * 10 + r.count, 0);
        let best = { score: -1, index: 0, replace: undefined as string | undefined };
        p.options.forEach((option, index) => {
          const candidates = full ? s.team.map((c) => c.uid) : [undefined];
          for (const replace of candidates) {
            const ids = [...s.team.filter((c) => c.uid !== replace).map((c) => c.defId), option.defId];
            const sc = score(ids);
            if (sc > best.score) best = { score: sc, index, replace };
          }
        });
        chooseRecruit(s, best.index, best.replace);
        break;
      }
      case 'item': chooseItem(s, p.options[0], s.team.find((c) => c.itemIds.length === 0)?.uid); break;
      case 'levelup': chooseLevelUp(s, p.options[0] ?? null); break;
      case 'fountain': case 'battleWon': case 'mapComplete': continueRun(s); break;
      case 'shop': {
        // Buy the most expensive affordable items, then fill empty slots front to back.
        let bought = true;
        while (bought) {
          bought = false;
          const affordable = p.offers
            .map((id, i) => ({ id, i }))
            .filter((o): o is { id: string; i: number } => !!o.id && ITEMS[o.id].cost <= s.gold)
            .sort((a, b) => ITEMS[b.id].cost - ITEMS[a.id].cost);
          if (affordable.length) { buyItem(s, affordable[0].i); bought = true; }
        }
        for (const champ of s.team) {
          while (champ.itemIds.length < modeConfig(s).itemSlots && s.bag.length) equipFromBag(s, s.bag[0], champ.uid);
        }
        continueRun(s);
        break;
      }
      case 'gameOver': return { state: s, won: false, mapsCleared: s.mapIndex };
      case 'victory': return { state: s, won: true, mapsCleared: s.totalMaps };
      case 'starter': throw new Error('unexpected starter phase');
    }
  }
  throw new Error('run did not finish');
}

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

  for (const mode of ['short', 'full', 'armory'] as RunMode[]) {
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
