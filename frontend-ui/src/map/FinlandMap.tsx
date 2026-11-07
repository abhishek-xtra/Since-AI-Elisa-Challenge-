// The zoomed-out view: a wireframe of Finland split into its regions. Regions with sites are lit, labelled
// and clickable, with their tip count; individual tips appear only after zooming in, so a busy network
// never turns into a cloud of dots.
import { useId, useMemo, useState } from "react";
import type { Assertion, Graph } from "../data/types";
import { FINLAND, TOWNS, fitFinland, pathOf, type LonLat } from "./finland";
import { finlandRegions, type RegionMark } from "./geo";
import { regionCells } from "./regions";

interface Props {
  graph: Graph;
  assertions: Assertion[];
  showHunches: boolean;
  at: Date;
  width: number;
  height: number;
  onOpenRegion: (region: RegionMark, at: { x: number; y: number }) => void;
}

function graticule(at: (p: LonLat) => { x: number; y: number }): string {
  const lines: LonLat[][] = [];
  for (let lon = 20; lon <= 32; lon += 2) lines.push([[lon, 59.5], [lon, 70.5]]);
  for (let lat = 60; lat <= 70; lat += 1) lines.push([[20, lat], [32, lat]]);
  return lines.map((l) => pathOf(l, at, false)).join("");
}

/** A soft glow that grows with the number of tips, gently (square root) and capped, so one busy region doesn't swamp the map. */
const glowSize = (tips: number) => (tips ? Math.min(60 + 20 * Math.sqrt(tips), 180) : 0);

export function FinlandMap({ graph, assertions, showHunches, at, width, height, onOpenRegion }: Props) {
  const clip = useId().replace(/:/g, "");
  const [hover, setHover] = useState<string | null>(null);
  const project = useMemo(() => fitFinland(width, height), [width, height]);
  const regions = useMemo(() => finlandRegions(graph, assertions, { showHunches, at }), [graph, assertions, showHunches, at]);
  const outline = useMemo(() => pathOf(FINLAND, project), [project]);
  const grid = useMemo(() => graticule(project), [project]);
  const cells = useMemo(() => [...regionCells()].map(([key, poly]) => ({ key, d: pathOf(poly, project) })), [project]);

  const byKey = new Map(regions.filter((r) => r.key).map((r) => [r.key!, r]));
  const placed = regions.filter((r) => r.at);
  const unplaced = regions.filter((r) => !r.at);
  const open = (r: RegionMark) => onOpenRegion(r, r.at ? project(r.at) : { x: width / 2, y: height / 2 });

  return (
    <div className="finland">
      <svg className="finland-svg" width={width} height={height}>
        <defs>
          <clipPath id={clip}>
            <path d={outline} />
          </clipPath>
        </defs>
        <g aria-hidden="true">
          <path className="fi-fill" d={outline} />
          <path className="fi-grid" d={grid} clipPath={`url(#${clip})`} />
        </g>
        {cells.map(({ key, d }, i) => {
          const r = byKey.get(key);
          return (
            <path
              key={key}
              d={d}
              aria-hidden="true"
              className={`fi-cell${r ? " active" : ""}${r?.tips ? " has-tips" : ""}${hover === key ? " hover" : ""}`}
              style={{ "--i": i } as React.CSSProperties}
              onMouseEnter={r ? () => setHover(key) : undefined}
              onMouseLeave={r ? () => setHover(null) : undefined}
              onClick={
                r
                  ? (e) => {
                      e.stopPropagation();
                      open(r);
                    }
                  : undefined
              }
            />
          );
        })}
        <path className="fi-outline" d={outline} pathLength={1} aria-hidden="true" />
        {TOWNS.map((t) => {
          const p = project(t.at);
          // Towns only help orientation; a region label nearby says more, so the town steps aside.
          const crowded = placed.some((r) => {
            const q = project(r.at!);
            return Math.abs(q.x - p.x) < 90 && Math.abs(q.y - p.y) < 45;
          });
          if (crowded) return null;
          return (
            <g key={t.name} className="fi-town" aria-hidden="true">
              <circle cx={p.x} cy={p.y} r={2.5} />
              <text x={p.x - 7} y={p.y + 4} textAnchor="end">
                {t.name}
              </text>
            </g>
          );
        })}
      </svg>

      {placed.map((r, i) => {
        const pos = project(r.at!);
        const size = glowSize(r.tips);
        return (
          <button
            key={r.id}
            type="button"
            className={`fi-region${hover === r.key ? " hover" : ""}`}
            style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, "--i": i, "--glow": `${size}px` } as React.CSSProperties}
            onMouseEnter={() => r.key && setHover(r.key)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => r.key && setHover(r.key)}
            onBlur={() => setHover(null)}
            onClick={(e) => {
              e.stopPropagation();
              open(r);
            }}
          >
            {size > 0 && <span className="fi-region-glow" aria-hidden="true" />}
            <span className="fi-region-name">{r.name}</span>
            {r.fi && <span className="fi-region-fi">{r.fi}</span>}
            <span className="fi-region-count">{r.tips === 1 ? "1 tip" : r.tips ? `${r.tips} tips` : "no tips yet"}</span>
          </button>
        );
      })}

      {unplaced.length > 0 && (
        <div className="fi-unplaced">
          {unplaced.map((r) => (
            <button
              key={r.id}
              type="button"
              className="count-badge"
              onClick={(e) => {
                e.stopPropagation();
                open(r);
              }}
            >
              {r.name} · {r.tips === 1 ? "1 tip" : `${r.tips} tips`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
