// Finland's regions (maakunnat), for naming and placing them on the zoomed-out map.
// Borders are approximate: each region is the part of the outline closest to its centre point.
// That reads correctly at map scale without shipping real border data.
import { FINLAND, project, type LonLat } from "./finland";

export interface RegionInfo {
  /** The id the topology uses in `region`, e.g. "north_ostrobothnia". */
  key: string;
  name: string;
  /** Finnish name, shown small under the English one. */
  fi: string;
  /** Rough centre, where the label sits. */
  at: LonLat;
}

export const REGIONS: RegionInfo[] = [
  { key: "lapland", name: "Lapland", fi: "Lappi", at: [25.9, 67.75] },
  { key: "north_ostrobothnia", name: "North Ostrobothnia", fi: "Pohjois-Pohjanmaa", at: [26.2, 65.15] },
  { key: "kainuu", name: "Kainuu", fi: "Kainuu", at: [28.6, 64.35] },
  { key: "central_ostrobothnia", name: "Central Ostrobothnia", fi: "Keski-Pohjanmaa", at: [24.2, 63.85] },
  { key: "ostrobothnia", name: "Ostrobothnia", fi: "Pohjanmaa", at: [21.95, 62.95] },
  { key: "south_ostrobothnia", name: "South Ostrobothnia", fi: "Etelä-Pohjanmaa", at: [23.2, 62.7] },
  { key: "north_savo", name: "North Savo", fi: "Pohjois-Savo", at: [27.5, 63.15] },
  { key: "north_karelia", name: "North Karelia", fi: "Pohjois-Karjala", at: [30.1, 62.85] },
  { key: "central_finland", name: "Central Finland", fi: "Keski-Suomi", at: [25.5, 62.4] },
  { key: "south_savo", name: "South Savo", fi: "Etelä-Savo", at: [27.8, 61.85] },
  { key: "satakunta", name: "Satakunta", fi: "Satakunta", at: [22.05, 61.45] },
  { key: "pirkanmaa", name: "Pirkanmaa", fi: "Pirkanmaa", at: [23.8, 61.75] },
  { key: "southwest_finland", name: "Southwest Finland", fi: "Varsinais-Suomi", at: [22.6, 60.6] },
  { key: "kanta_hame", name: "Kanta-Häme", fi: "Kanta-Häme", at: [24.25, 60.9] },
  { key: "paijat_hame", name: "Päijät-Häme", fi: "Päijät-Häme", at: [25.7, 61.2] },
  { key: "uusimaa", name: "Uusimaa", fi: "Uusimaa", at: [24.95, 60.4] },
  { key: "kymenlaakso", name: "Kymenlaakso", fi: "Kymenlaakso", at: [26.8, 60.75] },
  { key: "south_karelia", name: "South Karelia", fi: "Etelä-Karjala", at: [28.2, 61.2] },
];

/** Åland is off the outline, so it gets a label position but no cell. */
export const ALAND: RegionInfo = { key: "aland", name: "Åland", fi: "Ahvenanmaa", at: [20.6, 60.6] };

/** Older or broader values still work: they get a name and a place, but no cell. */
const AREAS: RegionInfo[] = [
  { key: "north", name: "Northern Finland", fi: "Pohjois-Suomi", at: [26.9, 67.4] },
  { key: "south", name: "Southern Finland", fi: "Etelä-Suomi", at: [26.2, 61.2] },
  { key: "east", name: "Eastern Finland", fi: "Itä-Suomi", at: [29.0, 62.6] },
  { key: "west", name: "Western Finland", fi: "Länsi-Suomi", at: [22.6, 62.6] },
];

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]+/g, "_")
    .replace(/^_|_$/g, "");

const INDEX = new Map<string, RegionInfo>();
for (const r of [...REGIONS, ALAND, ...AREAS]) for (const k of [r.key, r.name, r.fi]) INDEX.set(fold(k), r);

/** Finds a region by its key, English name or Finnish name, ignoring case and accents. */
export function findRegion(value: string): RegionInfo | undefined {
  return INDEX.get(fold(value.replace(/^region:/, "")));
}

// ---------- approximate borders ----------

type XY = { x: number; y: number };
const K = project([26.5, 65]).x; // project() is linear in longitude; K is its scale per degree
const unproject = ({ x, y }: XY): LonLat => [x / K + 25.5, 65 - y];

/** Keeps the part of a polygon on the seed's side of the line halfway between `a` and `b`. */
function clipHalf(poly: XY[], a: XY, b: XY): XY[] {
  const nx = b.x - a.x;
  const ny = b.y - a.y;
  const c = (nx * (a.x + b.x)) / 2 + (ny * (a.y + b.y)) / 2;
  const side = (p: XY) => nx * p.x + ny * p.y - c; // <= 0 means closer to a
  const out: XY[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const sp = side(p);
    const sq = side(q);
    if (sp <= 0) out.push(p);
    if (sp < 0 !== sq < 0 && sp !== sq) {
      const t = sp / (sp - sq);
      out.push({ x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) });
    }
  }
  return out;
}

let cells: Map<string, LonLat[]> | null = null;

/** Each region's approximate area: Finland's outline, split around the region centres. */
export function regionCells(): Map<string, LonLat[]> {
  if (cells) return cells;
  const outline = FINLAND.map(project);
  const seeds = REGIONS.map((r) => project(r.at));
  cells = new Map();
  REGIONS.forEach((r, i) => {
    let poly = outline;
    seeds.forEach((s, j) => {
      if (j !== i && poly.length) poly = clipHalf(poly, seeds[i], s);
    });
    if (poly.length > 2) cells!.set(r.key, poly.map(unproject));
  });
  return cells;
}
