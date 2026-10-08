import type { Region } from '../core/types';
import { championDef } from '../data/bosses';
import { REGION_TIERS, REGIONS } from '../data/regions';

export interface RegionStatus {
  region: Region;
  /** Distinct champions of this region in the lineup. */
  count: number;
  /** 0 = inactive, 1 or 2 = active tier. */
  tier: number;
}

export function tierFor(count: number): number {
  return REGION_TIERS.filter((n) => count >= n).length;
}

/** Region counts for a lineup, sorted active-first. Duplicate champions count once. */
export function regionStatuses(defIds: string[]): RegionStatus[] {
  const byRegion = new Map<Region, Set<string>>();
  for (const id of defIds) {
    const region = championDef(id).region;
    if (!byRegion.has(region)) byRegion.set(region, new Set());
    byRegion.get(region)!.add(id);
  }
  return [...byRegion.entries()]
    .map(([region, ids]) => ({ region, count: ids.size, tier: tierFor(ids.size) }))
    .sort((a, b) => b.tier - a.tier || b.count - a.count || a.region.localeCompare(b.region));
}

/** Active tier per region for a lineup. */
export function regionTiers(defIds: string[]): Partial<Record<Region, number>> {
  const out: Partial<Record<Region, number>> = {};
  for (const s of regionStatuses(defIds)) if (s.tier > 0) out[s.region] = s.tier;
  return out;
}

/** The bonus value a champion of `region` gets at `tier` (0 when inactive). */
export function regionValue(region: Region, tier: number | undefined): number {
  return tier ? REGIONS[region].values[tier - 1] : 0;
}
