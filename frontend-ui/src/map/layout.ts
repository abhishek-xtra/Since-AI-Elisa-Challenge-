// d3-force, run to a fixed number of ticks and then frozen, so the map never wobbles on camera.
// To keep the wires clean it tries several deterministic starting arrangements, keeps the one with
// the fewest crossings, then re-places leaf nodes (one wire each) around their neighbour to clear
// what is left. Same data, same picture, every time.
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import type { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";
import type { MapView, ViewNodeKind } from "./view";

export interface Point {
  x: number;
  y: number;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
}

const TICKS = 320;
const STARTS = 40;

/** Room each kind of node needs, label included. */
const RADIUS: Record<ViewNodeKind, number> = { badge: 84, tip: 64, device: 46, site: 58, region: 58, model: 50 };
const LINK: Record<string, number> = { tip: 110, scope: 110, badge: 160, net: 120 };

// ---------- geometry ----------

const orient = (p: Point, q: Point, r: Point) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  return orient(a, b, c) !== orient(a, b, d) && orient(c, d, a) !== orient(c, d, b);
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

type Edge = { from: string; to: string };

/** Pairs of wires that cross (wires sharing a node never count). */
export function countCrossings(edges: Edge[], pos: Map<string, Point>): number {
  let n = 0;
  for (let i = 0; i < edges.length; i++)
    for (let j = i + 1; j < edges.length; j++) {
      const e = edges[i];
      const f = edges[j];
      if (e.from === f.from || e.from === f.to || e.to === f.from || e.to === f.to) continue;
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      const c = pos.get(f.from);
      const d = pos.get(f.to);
      if (a && b && c && d && segmentsCross(a, b, c, d)) n++;
    }
  return n;
}

/** Wires that run through a node they don't belong to. */
function wiresThroughNodes(edges: Edge[], pos: Map<string, Point>, clearance = 16): number {
  let n = 0;
  for (const e of edges) {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!a || !b) continue;
    for (const [id, p] of pos) if (id !== e.from && id !== e.to && distToSegment(p, a, b) < clearance) n++;
  }
  return n;
}

function crowding(view: MapView, pos: Map<string, Point>): number {
  let s = 0;
  const nodes = view.nodes;
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = pos.get(nodes[i].id)!;
      const b = pos.get(nodes[j].id)!;
      const need = (RADIUS[nodes[i].kind] + RADIUS[nodes[j].kind]) * 0.7;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < need) s += need - d;
    }
  return s;
}

/** Wires leaving the same node at nearly the same angle read as one bundle; spread them. */
function bunching(view: MapView, pos: Map<string, Point>): number {
  const around = new Map<string, number[]>();
  for (const e of view.edges) {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!a || !b) continue;
    around.set(e.from, [...(around.get(e.from) ?? []), Math.atan2(b.y - a.y, b.x - a.x)]);
    around.set(e.to, [...(around.get(e.to) ?? []), Math.atan2(a.y - b.y, a.x - b.x)]);
  }
  let s = 0;
  const MIN = 0.5; // about 30 degrees
  for (const angles of around.values()) {
    if (angles.length < 2) continue;
    angles.sort((x, y) => x - y);
    for (let i = 0; i < angles.length; i++) {
      const gap = i ? angles[i] - angles[i - 1] : angles[0] + 2 * Math.PI - angles[angles.length - 1];
      if (gap < MIN) s += (MIN - gap) * 120;
    }
  }
  return s;
}

/** Wires running through another node's label (the text hangs below each dot). */
export function wiresThroughLabels(view: MapView, pos: Map<string, Point>): number {
  let n = 0;
  for (const node of view.nodes) {
    const p = pos.get(node.id)!;
    // Badges are pills centred on their point; other nodes hang their text below the dot.
    const box =
      node.kind === "badge"
        ? { x1: p.x - (node.label.length * 3.6 + 18), x2: p.x + (node.label.length * 3.6 + 18), y1: p.y - 24, y2: p.y + 24 }
        : (() => {
            const half = node.kind === "tip" ? 62 : node.quiet ? 30 : 48;
            return { x1: p.x - half, x2: p.x + half, y1: p.y + 10, y2: p.y + (node.sublabel ? 36 : 24) };
          })();
    for (const e of view.edges) {
      if (e.from === node.id || e.to === node.id) continue;
      const a = pos.get(e.from)!;
      const b = pos.get(e.to)!;
      // Sample along the wire; cheap and good enough at this scale.
      for (let t = 0.05; t < 1; t += 0.05) {
        const x = a.x + t * (b.x - a.x);
        const y = a.y + t * (b.y - a.y);
        if (x > box.x1 && x < box.x2 && y > box.y1 && y < box.y2) {
          n++;
          break;
        }
      }
    }
  }
  return n;
}

function score(view: MapView, pos: Map<string, Point>): number {
  return (
    countCrossings(view.edges, pos) * 10000 +
    wiresThroughNodes(view.edges, pos) * 2000 +
    wiresThroughLabels(view, pos) * 150 +
    bunching(view, pos) +
    crowding(view, pos)
  );
}

// ---------- force layout from one starting arrangement ----------

/** A small seeded random generator, so every start is reproducible. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runForce(view: MapView, attempt: number): Map<string, Point> {
  const ids = view.nodes.map((n) => n.id).sort();
  const rand = mulberry32(attempt + 1);
  // Attempt 0 keeps id order on a circle; later attempts shuffle the order and rotate the start.
  const order = attempt === 0 ? ids : [...ids].sort(() => rand() - 0.5);
  const turn = attempt * 2.399963; // golden angle
  const sim: SimNode[] = order.map((id, i) => {
    const angle = turn + (2 * Math.PI * i) / Math.max(order.length, 1);
    return { id, x: 220 * Math.cos(angle), y: 220 * Math.sin(angle) };
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

  forceSimulation(sim)
    .force(
      "link",
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(links)
        .id((d) => d.id)
        .distance((l) => LINK[(l as unknown as { kind: string }).kind] ?? 120)
        .strength(0.8),
    )
    .force("charge", forceManyBody().strength(-700))
    .force("collide", forceCollide<SimNode>().radius((d) => RADIUS[kindOf.get(d.id) ?? "device"]))
    // Pulled in harder vertically than horizontally, so the picture comes out wide, like a screen.
    .force("x", forceX(0).strength(0.02))
    .force("y", forceY(0).strength(0.09))
    .stop()
    .tick(TICKS);

  return new Map(sim.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
}

// ---------- leaf re-placement ----------

/** Moves each one-wire node around its neighbour to the spot that crosses and crowds least. */
function placeLeaves(view: MapView, pos: Map<string, Point>): void {
  const degree = new Map<string, string[]>();
  for (const e of view.edges) {
    degree.set(e.from, [...(degree.get(e.from) ?? []), e.to]);
    degree.set(e.to, [...(degree.get(e.to) ?? []), e.from]);
  }
  const kindOf = new Map(view.nodes.map((n) => [n.id, n.kind]));
  const leaves = view.nodes
    .map((n) => n.id)
    .filter((id) => id !== view.focusId && degree.get(id)?.length === 1)
    .sort();

  const localCost = (leaf: string, at: Point): number => {
    const parent = degree.get(leaf)![0];
    const p = pos.get(parent)!;
    let cost = 0;
    for (const f of view.edges) {
      if (f.from === leaf || f.to === leaf || f.from === parent || f.to === parent) continue;
      const c = pos.get(f.from)!;
      const d = pos.get(f.to)!;
      if (segmentsCross(p, at, c, d)) cost += 1000;
      if (distToSegment(at, c, d) < 24) cost += 300; // the leaf sitting on someone else's wire
    }
    for (const [id, q] of pos) {
      if (id === leaf) continue;
      if (id !== parent && distToSegment(q, p, at) < 16) cost += 300; // its own wire running through a node
      const need = (RADIUS[kindOf.get(leaf) ?? "device"] + RADIUS[kindOf.get(id) ?? "device"]) * 0.7;
      const d = Math.hypot(q.x - at.x, q.y - at.y);
      if (d < need) cost += (need - d) * 4;
    }
    return cost;
  };

  for (let pass = 0; pass < 3; pass++) {
    for (const leaf of leaves) {
      const parent = pos.get(degree.get(leaf)![0])!;
      const cur = pos.get(leaf)!;
      const r = Math.max(LINK[kindOf.get(leaf) === "tip" ? "tip" : kindOf.get(leaf) === "badge" ? "badge" : "net"], Math.hypot(cur.x - parent.x, cur.y - parent.y));
      let best = cur;
      let bestCost = localCost(leaf, cur);
      for (const scale of [1, 1.35]) {
        for (let k = 0; k < 36; k++) {
          const a = (k / 36) * 2 * Math.PI;
          const at = { x: parent.x + r * scale * Math.cos(a), y: parent.y + r * scale * Math.sin(a) };
          // Prefer staying close to where the forces put it, all else equal.
          const cost = localCost(leaf, at) + Math.hypot(at.x - cur.x, at.y - cur.y) * 0.02;
          if (cost < bestCost) {
            bestCost = cost;
            best = at;
          }
        }
      }
      pos.set(leaf, best);
    }
  }
}

/** Tries moving every other node (not the focus) to nearby spots; keeps a move only if the whole picture improves. */
function nudgeAll(view: MapView, pos: Map<string, Point>): void {
  let current = score(view, pos);
  const ids = view.nodes.map((n) => n.id).filter((id) => id !== view.focusId).sort();
  for (let pass = 0; pass < 2 && current >= 1; pass++) {
    for (const id of ids) {
      const cur = pos.get(id)!;
      let best = cur;
      for (const r of [60, 120, 200]) {
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * 2 * Math.PI;
          const at = { x: cur.x + r * Math.cos(a), y: cur.y + r * Math.sin(a) };
          pos.set(id, at);
          const s = score(view, pos);
          if (s < current - 0.5) {
            current = s;
            best = at;
          }
        }
      }
      pos.set(id, best);
    }
  }
}

export function layout(view: MapView): Map<string, Point> {
  let best: Map<string, Point> | null = null;
  let bestScore = Infinity;
  for (let attempt = 0; attempt < STARTS; attempt++) {
    const pos = runForce(view, attempt);
    placeLeaves(view, pos);
    const s = score(view, pos);
    if (s < bestScore) {
      bestScore = s;
      best = pos;
    }
    if (s < 1) break; // nothing crossing, bunched or crowded
  }
  if (best && bestScore >= 1) nudgeAll(view, best);
  return best ?? new Map();
}

/** The box around a layout, with room for labels. */
export function bounds(points: Map<string, Point>, pad = 110) {
  let minX = -1;
  let minY = -1;
  let maxX = 1;
  let maxY = 1;
  for (const p of points.values()) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX: minX - pad, minY: minY - pad, width: maxX - minX + 2 * pad, height: maxY - minY + 2 * pad };
}

/** Moves layout coordinates into world pixels: the top-left of the padded box becomes (0, 0). */
export function toWorld(points: Map<string, Point>) {
  const b = bounds(points);
  const out = new Map<string, Point>();
  for (const [id, p] of points) out.set(id, { x: p.x - b.minX, y: p.y - b.minY });
  return { positions: out, width: b.width, height: b.height };
}
