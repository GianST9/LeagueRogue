// Branching node map (Slay the Spire / pokelike style). Layers flow from the start to a single boss node.
// Edges only connect "overlapping" nodes in neighbouring layers, so paths never cross.

import { CONFIG } from '../core/config';
import type { Rng } from '../core/rng';

export type NodeKind = 'camp' | 'rival' | 'recruit' | 'item' | 'fountain' | 'levelup' | 'boss';
type RegularKind = Exclude<NodeKind, 'boss'>;

export interface MapNode {
  id: string;
  layer: number;
  index: number;
  kind: NodeKind;
  /** Ids of nodes in the next layer this node leads to. */
  next: string[];
}

export interface RunMap {
  layers: MapNode[][];
}

/**
 * @param progress 0 at the start of the run, approaching 1 on the last map. Shifts node weights.
 * @param exclude Node kinds this mode doesn't use (e.g. item nodes in the Armory mode).
 */
export function generateMap(rng: Rng, progress: number, exclude: readonly NodeKind[] = []): RunMap {
  const sizes = [...CONFIG.run.layers, 1];
  const weights = interpolateWeights(progress);
  for (const kind of exclude) delete (weights as Partial<Record<RegularKind, number>>)[kind as RegularKind];

  const layers: MapNode[][] = sizes.map((size, layer) =>
    Array.from({ length: size }, (_, index) => ({
      id: `${layer}-${index}`,
      layer,
      index,
      kind: layer === sizes.length - 1 ? 'boss' : rng.weighted(weights),
      next: [],
    })),
  );

  // Fixed points. First layer: one fight, one recruit, the rest random (never a fountain).
  // Layer before the boss: one fountain, the rest random non-fountain nodes.
  const { fountain: _, ...noFountain } = weights;
  const fight: RegularKind = progress === 0 ? 'camp' : rng.weighted({ camp: weights.camp, rival: weights.rival });
  assignShuffled(rng, layers[0], [fight, 'recruit'], noFountain);
  assignShuffled(rng, layers[layers.length - 2], ['fountain'], noFountain);

  for (let l = 0; l < layers.length - 1; l++) {
    const from = layers[l];
    const to = layers[l + 1];
    from.forEach((node, i) => {
      // Node i covers the interval [i/n, (i+1)/n); it links to every next-layer node overlapping it.
      const lo = Math.floor((i * to.length) / from.length);
      const hi = Math.ceil(((i + 1) * to.length) / from.length) - 1;
      for (let j = lo; j <= hi; j++) node.next.push(to[j].id);
    });
  }

  return { layers };
}

export function findNode(map: RunMap, id: string): MapNode {
  const [layer, index] = id.split('-').map(Number);
  const node = map.layers[layer]?.[index];
  if (!node) throw new Error(`No map node ${id}`);
  return node;
}

/** Gives `layer` the fixed kinds (in random positions); remaining nodes are rolled from `fill`. */
function assignShuffled(rng: Rng, layer: MapNode[], fixed: RegularKind[], fill: Partial<Record<RegularKind, number>>): void {
  const kinds: RegularKind[] = [...fixed];
  while (kinds.length < layer.length) kinds.push(rng.weighted(fill));
  rng.shuffle(kinds).forEach((kind, i) => { if (layer[i]) layer[i].kind = kind; });
}

function interpolateWeights(progress: number): Partial<Record<RegularKind, number>> & Record<'camp' | 'rival', number> {
  const { early, late } = CONFIG.nodeWeights;
  const t = Math.min(1, Math.max(0, progress));
  const out = {} as Record<RegularKind, number>;
  for (const key of Object.keys(early) as RegularKind[]) out[key] = early[key] + (late[key] - early[key]) * t;
  return out;
}
