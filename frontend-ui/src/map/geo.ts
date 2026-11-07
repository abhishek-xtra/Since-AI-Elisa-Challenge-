// The regions on the Finland map, each with its count of live tips. Tips themselves are not drawn
// at this level: with many of them it would only be clutter. Clicking a region opens its diagram.
import type { Assertion, Graph } from "../data/types";
import type { LonLat } from "./finland";
import { findRegion } from "./regions";
import { regionView } from "./view";

export interface RegionMark {
  /** The graph's region node id, e.g. "region:uusimaa". */
  id: string;
  /** Key in the regions table, when the region is known; it has a cell on the map. */
  key?: string;
  name: string;
  fi?: string;
  tips: number;
  /** Where the label sits; regions we can't place are listed under the map instead. */
  at?: LonLat;
}

/** Every region that has sites, with its live tip count. */
export function finlandRegions(graph: Graph, assertions: Assertion[], opts: { showHunches: boolean; at: Date }): RegionMark[] {
  return regionView(graph, assertions, opts).nodes.map((n) => {
    const known = findRegion(n.id);
    return { id: n.id, key: known?.key, name: n.label, fi: known && known.fi !== known.name ? known.fi : undefined, tips: n.badge?.tips ?? 0, at: known?.at };
  });
}
