// The greedy bot shared by the run and Conquest tests.

import { CONFIG } from '../src/core/config';
import { ITEMS } from '../src/data/items';
import { findNode, type NodeKind } from '../src/systems/map';
import {
  availableNodes, buyItem, chooseItem, chooseLevelUp, chooseRecruit, chooseStarter, continueRun, enterNode, equipFromBag,
  finishBattle, modeConfig, type RunState,
} from '../src/systems/run';
import { regionStatuses } from '../src/systems/synergies';

const NODE_PRIORITY: NodeKind[] = ['camp', 'levelup', 'rival', 'item', 'recruit', 'fountain', 'boss'];

/**
 * A simple greedy bot. Plays a freshly started run to the end and returns how far it got.
 * Starter: the first option, or in Conquest the one with the most rune bonus.
 */
export function playRun(s: RunState): { state: RunState; won: boolean; mapsCleared: number } {
  chooseStarter(s, bestStarter(s));
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
        if (p.options.length === 0) { chooseRecruit(s, null); break; }
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

function bestStarter(s: RunState): number {
  if (s.phase.kind !== 'starter') throw new Error('expected a fresh run');
  const power = s.phase.options.map((c) => Object.values(c.statBonus ?? {}).reduce((sum, v) => sum + v, 0));
  return power.indexOf(Math.max(...power));
}
