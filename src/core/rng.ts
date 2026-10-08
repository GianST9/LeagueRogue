// Seeded PRNG (mulberry32). All game logic takes an Rng so runs and battles are reproducible.

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  /** Picks a key with probability proportional to its weight. */
  weighted<K extends string>(weights: Partial<Record<K, number>>): K;
  /** Current internal state, so a run can be saved and resumed. */
  state(): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;

  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));

  return {
    next,
    int,
    chance: (p) => next() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error('pick() from empty list');
      return items[int(0, items.length - 1)];
    },
    shuffle: (items) => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    weighted: (weights) => {
      const entries = Object.entries(weights) as [string, number][];
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let roll = next() * total;
      for (const [key, w] of entries) {
        roll -= w;
        if (roll < 0) return key as never;
      }
      return entries[entries.length - 1][0] as never;
    },
    state: () => s,
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}
