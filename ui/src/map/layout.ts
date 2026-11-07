// d3-force, run to a fixed number of ticks and then frozen, so the map never wobbles on camera.
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import type { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";
import type { MapView } from "./view";

export interface Point {
  x: number;
  y: number;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
}

const TICKS = 300;

export function layout(view: MapView): Map<string, Point> {
  const ids = view.nodes.map((n) => n.id).sort();
  // Deterministic start: evenly spaced on a circle, in id order.
  const sim: SimNode[] = ids.map((id, i) => {
    const angle = (2 * Math.PI * i) / Math.max(ids.length, 1);
    return { id, x: 160 * Math.cos(angle), y: 160 * Math.sin(angle) };
  });
  const byId = new Map(sim.map((n) => [n.id, n]));
  const focus = byId.get(view.focusId);
  if (focus) {
    focus.x = focus.fx = 0;
    focus.y = focus.fy = 0;
  }

  const kindOf = new Map(view.nodes.map((n) => [n.id, n.kind]));
  const links: SimulationLinkDatum<SimNode>[] = view.edges
    .filter((e) => byId.has(e.from) && byId.has(e.to))
    .map((e) => ({ source: e.from, target: e.to, kind: e.kind }));

  const simulation = forceSimulation(sim)
    .force(
      "link",
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(links)
        .id((d) => d.id)
        .distance((l) => {
          const k = (l as unknown as { kind: string }).kind;
          return k === "tip" ? 70 : k === "badge" ? 110 : 80;
        })
        .strength(0.7),
    )
    .force("charge", forceManyBody().strength(-420))
    .force(
      "collide",
      forceCollide<SimNode>().radius((d) => {
        const k = kindOf.get(d.id);
        return k === "badge" ? 70 : k === "tip" ? 46 : 36;
      }),
    )
    .force("x", forceX(0).strength(0.04))
    .force("y", forceY(0).strength(0.06))
    .stop();

  simulation.tick(TICKS);
  return new Map(sim.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
}

/** Scales layout coordinates into a box, keeping the focus (0,0) at the centre. */
export function fit(points: Map<string, Point>, width: number, height: number, pad = 90): Map<string, Point> {
  let maxX = 1;
  let maxY = 1;
  for (const p of points.values()) {
    maxX = Math.max(maxX, Math.abs(p.x));
    maxY = Math.max(maxY, Math.abs(p.y));
  }
  const scale = Math.min((width / 2 - pad) / maxX, (height / 2 - pad) / maxY, 1.5);
  const s = Math.max(scale, 0.35);
  const out = new Map<string, Point>();
  for (const [id, p] of points) out.set(id, { x: width / 2 + p.x * s, y: height / 2 + p.y * s });
  return out;
}
