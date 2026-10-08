// Round-robin 1v1 win rates. Always runs as a sanity check; `npm run balance` also prints the table.

import { expect, it } from 'vitest';
import { CHAMPIONS, CHAMPION_IDS } from '../src/data/champions';
import { simulateBattle } from '../src/systems/battle';

const LEVELS = [1, 9, 18];
const SEEDS = 4;

it('no champion is wildly out of line in 1v1s', () => {
  const rows: { id: string; rates: number[]; avgTurns: number }[] = [];
  for (const a of CHAMPION_IDS) {
    const rates: number[] = [];
    let turns = 0;
    let fights = 0;
    for (const level of LEVELS) {
      let wins = 0;
      let games = 0;
      for (const b of CHAMPION_IDS) {
        if (a === b) continue;
        for (let seed = 0; seed < SEEDS; seed++) {
          // Play both sides so first-mover ties don't bias the result.
          const asPlayer = simulateBattle({
            player: [{ uid: 'a', def: CHAMPIONS[a], level }], enemy: [{ uid: 'b', def: CHAMPIONS[b], level }], seed,
          });
          const asEnemy = simulateBattle({
            player: [{ uid: 'b', def: CHAMPIONS[b], level }], enemy: [{ uid: 'a', def: CHAMPIONS[a], level }], seed,
          });
          wins += (asPlayer.winner === 'player' ? 1 : 0) + (asEnemy.winner === 'enemy' ? 1 : 0);
          games += 2;
          turns += asPlayer.turns + asEnemy.turns;
          fights += 2;
        }
      }
      rates.push(wins / games);
    }
    rows.push({ id: a, rates, avgTurns: turns / fights });
  }

  if (process.env.npm_lifecycle_event === 'balance') {
    rows.sort((x, y) => y.rates.reduce((s, r) => s + r) - x.rates.reduce((s, r) => s + r));
    console.log(['champion'.padEnd(14), ...LEVELS.map((l) => `L${l}`.padStart(6)), 'turns'.padStart(7)].join(''));
    for (const r of rows) {
      console.log([r.id.padEnd(14), ...r.rates.map((x) => `${Math.round(x * 100)}%`.padStart(6)),
        r.avgTurns.toFixed(1).padStart(7)].join(''));
    }
  }

  for (const r of rows) {
    for (const rate of r.rates) {
      expect(rate, r.id).toBeGreaterThan(0.05);
      expect(rate, r.id).toBeLessThan(0.95);
    }
  }
});
