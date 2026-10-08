import { expect, it } from 'vitest';
import { championDef } from '../src/data/bosses';
import { CHAMPION_IDS } from '../src/data/champions';
import { createRng } from '../src/core/rng';
import { simulateBattle } from '../src/systems/battle';
import { applyEvent, initialView, turnsUntilReady } from '../src/ui/battleView';

it('the UI cooldown mirror agrees with the engine: every ability cast was shown as ready', () => {
  const rng = createRng(5);
  for (let seed = 0; seed < 60; seed++) {
    const ids = rng.shuffle(CHAMPION_IDS).slice(0, 6);
    const player = ids.slice(0, 3).map((id, i) => ({ uid: `p${i}`, defId: id, level: 12 }));
    const enemy = ids.slice(3).map((id, i) => ({ uid: `e${i}`, defId: id, level: 12 }));
    const toUnit = (u: (typeof player)[number]) => ({ uid: u.uid, def: championDef(u.defId), level: u.level });
    const result = simulateBattle({ player: player.map(toUnit), enemy: enemy.map(toUnit), seed });

    let view = initialView(player, enemy);
    for (const e of result.events) {
      if (e.t === 'cast' && e.key !== 'AA') {
        // The engine ticks cooldowns at the start of the action, so "ready" means one tick away from 0.
        const u = view.units[e.side][e.slot];
        expect(Math.max(0, turnsUntilReady(u, e.key) - 1), `${u.defId} ${e.key}`).toBe(0);
      }
      view = applyEvent(view, e);
    }
    expect(view.winner).toBe(result.winner);
  }
});
