// Geometry of the /tree wheel: where every node sits, and the link between two nodes. Pure functions, no React.
import type { Candidate, Tip, TimelineEvent } from "../grow/timeline";
import { SUB, TOP, branchOf } from "./words";

export const C = { x: 900, y: 470 };
export const DEG = Math.PI / 180;
// The wheel, placed by hand so no label meets another at 1920x1080: the centre, three named sectors around it (Faults
// right, Site access lower left, Other on top) and their sub-branches. Tips grow out of a sub-branch along its
// direction (degrees, 0 = right, 90 = down); scope leaves fan out beyond the tip. The upper left stays free for the
// capture quote.
export const SKELETON: Record<string, { x: number; y: number; dir?: number; label?: "lab-u" | "lab-d" }> = {
  root: C,
  faults: { x: 1150, y: 430 }, access: { x: 690, y: 640 }, other: { x: 900, y: 290 },
  sfp_replaced: { x: 1290, y: 300, dir: -15, label: "lab-u" },
  alarm_raised: { x: 1430, y: 520, dir: 10, label: "lab-u" },
  fault_other: { x: 1290, y: 720, dir: 25, label: "lab-d" },
  keys: { x: 580, y: 770, dir: 175, label: "lab-d" },
  route: { x: 480, y: 520, dir: 190, label: "lab-u" },
  unsorted: { x: 900, y: 130, dir: -90, label: "lab-u" },
};
export const TIP_DIST: Record<string, number> = { sfp_replaced: 250, alarm_raised: 250, fault_other: 250, keys: 210, route: 210, unsorted: 200 };
export const LEAF_DIST: Record<string, number> = { sfp_replaced: 160, alarm_raised: 160, fault_other: 160, keys: 130, route: 130, unsorted: 130 };
export const LEAF_STEP = 13;
export const COMPACT_DIST = 70; // more than two tips in a sub-branch: leaves shrink to a tight fan of dots
export const COMPACT_STEP = 14;
export const TIP_SPREAD = 140; // tips in one sub-branch sit side by side across its direction, further apart with big fans

export interface Pos { id: string; x: number; y: number; a: number; parent?: string; label?: string }
export interface Leaf extends Pos { c: Candidate; fall: boolean; tip: string; i: number; compact: boolean }

export const toward = (from: { x: number; y: number }, a: number, d: number) => ({ x: from.x + d * Math.cos(a * DEG), y: from.y + d * Math.sin(a * DEG) });
export const side = (p: Pos) => (Math.cos(p.a * DEG) >= -0.05 ? "right" : "left");

/** Every stored tip stays on screen (a replaced fact is kept, dim). Leaves: the decided one once a tap decided. */
export function placeAll(tips: Tip[], t: number, events: TimelineEvent[]) {
  const cur = events[t];
  const shown = tips;
  const pos: Pos[] = [{ id: "root", a: 0, ...C }];
  const leaves: Leaf[] = [];
  for (const top of TOP) pos.push({ id: top.id, a: 0, parent: "root", ...SKELETON[top.id] });
  for (const sub of SUB) {
    const s = SKELETON[sub.id];
    pos.push({ id: sub.id, a: s.dir!, parent: sub.parent, x: s.x, y: s.y });
    const mine = shown.filter((x) => branchOf(x) === sub.id).sort((a, b) => a.bornAt - b.bornAt);
    const compact = mine.length > 2;
    const spread = compact ? TIP_SPREAD : Math.max(TIP_SPREAD, 46 * Math.max(0, ...mine.map((x) => x.candidates.length)));
    mine.forEach((tip, k) => {
      const base = toward(s, s.dir!, TIP_DIST[sub.id]);
      const off = (k - (mine.length - 1) / 2) * spread;
      const tp = toward(base, s.dir! + 90, off);
      // the lower of two side-by-side tips puts its label below, away from the sub-branch label
      pos.push({ id: tip.assertion_id, a: s.dir!, parent: sub.id, label: off > 0 && s.label === "lab-u" ? "lab-d" : s.label, ...tp });
      const tapped = cur?.kind === "answer" && cur.assertion_id === tip.assertion_id;
      const live = tip.candidates.filter((c) => c.against === 0);
      const list = tip.decided && !tapped ? live.filter((c) => c.predicate === tip.decided!.predicate) : live;
      // the leaf fan opens away from the tip's label, so no leaf line runs under the label and looks cut off
      const label = off > 0 && s.label === "lab-u" ? "lab-d" : s.label;
      const away = (Math.cos(s.dir! * DEG) >= 0 ? 1 : -1) * (label === "lab-u" ? 1 : -1);
      list.forEach((c, i) => {
        const la = s.dir! + away * (12 + i * (compact ? COMPACT_STEP : LEAF_STEP));
        leaves.push({ id: `${tip.assertion_id}:${c.predicate}`, a: la, parent: tip.assertion_id, compact,
          ...toward(tp, la, compact ? COMPACT_DIST : LEAF_DIST[sub.id]), c,
          tip: tip.assertion_id, i, fall: tapped && !!tip.decided && c.predicate !== tip.decided.predicate });
      });
    });
  }
  return { shown, pos, leaves };
}

/** A curved link from parent to child, bending out of the parent's side like a radial dendrogram. */
export function link(p: Pos, c: Pos) {
  const k = { x: p.x + (c.x - p.x) * 0.25, y: c.y };
  return `M ${p.x} ${p.y} Q ${k.x} ${k.y} ${c.x} ${c.y}`;
}

