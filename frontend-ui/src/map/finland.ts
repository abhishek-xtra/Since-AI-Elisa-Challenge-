// A simplified outline of Finland for the zoomed-out view. Hand-traced, about 70 points:
// close enough to read as Finland at a glance, not a survey map. [longitude, latitude].
export type LonLat = [number, number];

export const FINLAND: LonLat[] = [
  // north-west arm, then the border with Norway eastwards
  [20.55, 69.06], [21.05, 69.3], [21.6, 69.28], [22.35, 68.82], [23.15, 68.65], [23.95, 68.83],
  [24.9, 68.58], [25.75, 68.98], [25.95, 69.6], [26.5, 69.94], [27.3, 69.98], [27.95, 70.09],
  [28.45, 69.92], [29.35, 69.65],
  // the eastern border with Russia, southwards
  [28.85, 69.2], [28.4, 68.9], [28.7, 68.5], [28.45, 68.2], [29.35, 67.8], [30.05, 67.65],
  [29.5, 67.1], [29.05, 66.85], [30.1, 66.15], [29.9, 65.7], [30.15, 65.2], [29.65, 64.9],
  [30.05, 64.6], [30.5, 64.25], [29.95, 63.75], [30.95, 63.35], [31.55, 62.9], [31.0, 62.4],
  [30.2, 61.85], [29.3, 61.3], [28.6, 60.95], [27.8, 60.55],
  // the south coast, westwards
  [27.2, 60.45], [26.5, 60.4], [25.8, 60.25], [25.0, 60.15], [24.3, 60.05], [23.5, 59.95],
  [22.95, 59.82], [22.5, 60.0], [22.0, 60.25], [21.4, 60.55],
  // the west coast, northwards along the Gulf of Bothnia
  [21.5, 61.1], [21.45, 61.6], [21.3, 62.05], [21.1, 62.45], [21.4, 62.95], [21.6, 63.2],
  [22.3, 63.5], [22.95, 63.8], [23.6, 64.05], [24.3, 64.45], [24.75, 64.85], [25.4, 65.05],
  [25.3, 65.5], [24.75, 65.65], [24.15, 65.82],
  // the border with Sweden, back up to the arm
  [23.75, 66.2], [23.65, 66.55], [23.9, 66.9], [23.55, 67.25], [23.55, 67.6], [23.75, 67.9],
  [23.35, 68.15], [22.4, 68.45], [21.6, 68.75], [20.9, 69.05],
];

/** A few towns, only for orientation. */
export const TOWNS: { name: string; at: LonLat }[] = [
  { name: "Helsinki", at: [24.94, 60.17] },
  { name: "Tampere", at: [23.76, 61.5] },
  { name: "Oulu", at: [25.47, 65.01] },
  { name: "Rovaniemi", at: [25.73, 66.5] },
];

const MID_LAT = 64.5;
const K = Math.cos((MID_LAT * Math.PI) / 180);

/** Equirectangular projection, scaled for Finland's latitude. Returns unscaled units. */
export function project([lon, lat]: LonLat): { x: number; y: number } {
  return { x: (lon - 25.5) * K, y: -(lat - 65) };
}

export interface Projector {
  (p: LonLat): { x: number; y: number };
}

/** Fits Finland into a box and returns a function from [lon, lat] to pixels. */
export function fitFinland(width: number, height: number, pad = { top: 100, bottom: 80, side: 40 }): Projector {
  const pts = FINLAND.map(project);
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const s = Math.min((width - 2 * pad.side) / (maxX - minX), (height - pad.top - pad.bottom) / (maxY - minY));
  const offX = (width - (maxX - minX) * s) / 2 - minX * s;
  const offY = pad.top + (height - pad.top - pad.bottom - (maxY - minY) * s) / 2 - minY * s;
  return (p) => {
    const q = project(p);
    return { x: offX + q.x * s, y: offY + q.y * s };
  };
}

export function pathOf(points: LonLat[], at: Projector, close = true): string {
  return points.map((p, i) => `${i ? "L" : "M"}${at(p).x.toFixed(1)},${at(p).y.toFixed(1)}`).join("") + (close ? "Z" : "");
}
