import { useEffect, useMemo, useRef, useState } from "react";
import { BeatControls } from "../components/BeatControls";
import { ChatPanel } from "../components/ChatPanel";
import { TipCard } from "../components/TipCard";
import { getSource, loadAssertions } from "../data";
import { labelFor } from "../data/derive";
import type { Assertion, Beat, ChatReply, ContextResult, Graph } from "../data/types";
import { fit, layout } from "../map/layout";
import { localView, regionView } from "../map/view";
import type { MapView, ViewNode } from "../map/view";
import { navigate, useQuery, withQuery } from "../router";
import { useAsync } from "../useAsync";

export const DEFAULT_FOCUS = "TRN-087";

interface Loaded {
  graph: Graph;
  assertions: Assertion[];
  beat: Beat | null;
}

async function load(beatN: number): Promise<Loaded> {
  const src = getSource();
  const graph = await src.getGraph();
  if (beatN && src.getBeat) {
    const beat = await src.getBeat(beatN);
    // A beat is a snapshot: drop the graph's current assertion edges and use the beat's assertions.
    const ids = new Set(graph.nodes.filter((n) => n.kind === "assertion").map((n) => n.id));
    return { graph: { nodes: graph.nodes, edges: graph.edges.filter((e) => !ids.has(e.from)) }, assertions: beat.assertions, beat };
  }
  return { graph, assertions: await loadAssertions(src, graph), beat: null };
}

const resultId = (r: ContextResult) => (typeof r.assertion === "string" ? r.assertion : r.assertion.id);

function beatFocus(beat: Beat): string | undefined {
  return beat.incident?.entity_id ?? beat.assertions[0]?.evidence.cases[0]?.entity;
}

function useWindowSize() {
  // Below this size the map keeps its layout and scrolls instead (phones).
  const read = () => ({ w: Math.max(window.innerWidth, 820), h: Math.max(window.innerHeight, 620) });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const on = () => setSize(read());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}

function NodeView({
  n,
  selected,
  highlighted,
  onTip,
  onBadge,
}: {
  n: ViewNode;
  selected: boolean;
  highlighted: boolean;
  onTip: (id: string) => void;
  onBadge: (n: ViewNode) => void;
}) {
  if (n.kind === "tip")
    return (
      <button
        type="button"
        className={`tip-node${n.hunch ? " hunch" : ""}${selected ? " selected" : ""}${highlighted ? " ring" : ""}`}
        aria-label={n.label}
        aria-expanded={selected}
        onClick={(e) => {
          e.stopPropagation();
          onTip(n.id);
        }}
      >
        <span className="tip-dot" aria-hidden="true" />
        <span className="tip-label" aria-hidden="true">
          {n.label}
        </span>
      </button>
    );
  if (n.kind === "badge")
    return (
      <button
        type="button"
        className="count-badge"
        onClick={(e) => {
          e.stopPropagation();
          onBadge(n);
        }}
      >
        {n.label}
      </button>
    );
  if (n.badge)
    // Zoomed out: a region you can click to zoom back in.
    return (
      <button
        type="button"
        className="region-node"
        onClick={(e) => {
          e.stopPropagation();
          onBadge(n);
        }}
      >
        <span className="net-dot hub" aria-hidden="true" />
        <span className="net-label">{n.label}</span>
        <span className="count-badge static">{n.badge.text}</span>
      </button>
    );
  const hub = n.kind !== "device";
  return (
    <div className={`net-node${hub ? " hub" : ""}${n.focus ? " focus" : ""}`}>
      <span className={`net-dot${hub ? " hub" : ""}`} aria-hidden="true" />
      <span className="net-label">{n.label}</span>
    </div>
  );
}

/** Decides once, on mount, whether this node plays its entrance; later renders never restart it. */
function NodeEnter({ animate, children }: { animate: boolean; children: React.ReactNode }) {
  const [play] = useState(animate);
  return <div className={`node-enter${play ? " animate" : ""}`}>{children}</div>;
}

export function MapPage() {
  const q = useQuery();
  const beatN = Number(q.get("beat")) || 0;
  const zoomedOut = q.get("zoom") === "out";
  const [state, reload] = useAsync(() => load(beatN), String(beatN));
  const [showHunches, setShowHunches] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const { w, h } = useWindowSize();

  const loaded = state.status === "ready" ? state.value : null;
  const beat = loaded?.beat ?? null;
  const focus = (beat && beatFocus(beat)) || q.get("focus") || DEFAULT_FOCUS;
  const at = useMemo(() => (beat ? new Date(beat.at_time) : new Date()), [beat]);

  useEffect(() => setExpanded([]), [focus, zoomedOut]);
  useEffect(() => {
    const first = beat?.results?.find((r) => r.outcome === "proposed");
    setSelected(first ? resultId(first) : null);
  }, [beat]);
  useEffect(() => {
    if (!highlighted.length) return;
    const t = setTimeout(() => setHighlighted([]), 600);
    return () => clearTimeout(t);
  }, [highlighted]);

  const view: MapView | null = useMemo(() => {
    if (!loaded) return null;
    if (zoomedOut) return regionView(loaded.graph, loaded.assertions, { showHunches, at });
    return localView(loaded.graph, loaded.assertions, { focus, showHunches, expanded, at });
  }, [loaded, zoomedOut, focus, showHunches, expanded, at]);

  // Lay out with hunches included, so turning the toggle on or off never moves anything.
  const layoutView: MapView | null = useMemo(() => {
    if (!loaded) return null;
    if (zoomedOut) return regionView(loaded.graph, loaded.assertions, { showHunches: true, at });
    return localView(loaded.graph, loaded.assertions, { focus, showHunches: true, expanded, at });
  }, [loaded, zoomedOut, focus, expanded, at]);
  const raw = useMemo(() => (layoutView ? layout(layoutView) : new Map()), [layoutView]);
  const positions = useMemo(() => fit(raw, w, h), [raw, w, h]);
  const ready = state.status === "ready";

  // Each new level or focus re-mounts the canvas. It blooms out from the focus,
  // unless it arrived through a zoom transition, which already carries the motion.
  const canvasKey = `${zoomedOut}|${focus}|${beatN}`;
  const bloom = useMemo(() => !(document.documentElement.dataset.transition ?? "").startsWith("zoom"), [canvasKey]);
  // Nodes that appear later (an expanded badge) grow out of the badge that was clicked.
  const spawnRef = useRef<{ key: string; x: number; y: number } | null>(null);
  const spawn = spawnRef.current?.key === canvasKey ? spawnRef.current : null;
  const pageRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // On a narrow screen the map scrolls; start with the focus in the middle.
    const el = pageRef.current;
    if (ready && el) el.scrollTo?.({ left: (el.scrollWidth - el.clientWidth) / 2, top: (el.scrollHeight - el.clientHeight) / 2 });
  }, [ready, w, h, focus]);

  if (state.status === "loading")
    return (
      <main className="map-page">
        <p className="sr-only" role="status">Loading the map</p>
      </main>
    );
  if (state.status === "error")
    return (
      <main className="map-page">
        <p className="map-status" role="alert">Couldn't load the map. {state.error.message}</p>
      </main>
    );
  if (!view || !loaded) return null;

  const selectedTip = view.tips.find((t) => t.id === selected) ?? null;
  const selPos = selectedTip ? positions.get(selectedTip.id) : undefined;
  const cardStyle: React.CSSProperties | undefined = selPos
    ? {
        top: Math.min(Math.max(selPos.y - 24, 70), h - 170),
        // Away from the centre, so the card never covers the focus device; toward it when there is no room.
        ...((selPos.x < w / 2 ? selPos.x > 370 : w - selPos.x < 370) ? { right: w - selPos.x + 34 } : { left: selPos.x + 34 }),
      }
    : undefined;

  function onBadge(n: ViewNode) {
    const action = n.badge?.action;
    if (!action) return;
    if (action.type === "expand") {
      const at = positions.get(n.id);
      spawnRef.current = at ? { key: canvasKey, ...at } : null;
      setExpanded((e) => [...new Set([...e, ...action.sites])]);
    } else if (action.type === "zoom-out") zoomOut();
    else navigate(withQuery({ zoom: null, focus: action.id, beat: null }), { transition: "zoom-in", origin: positions.get(n.id) });
  }

  function zoomOut() {
    setSelected(null);
    navigate(withQuery({ zoom: "out", beat: null }), { transition: "zoom-out" });
  }

  function onReply(r: ChatReply) {
    if (r.assertion_ids.length) setHighlighted(r.assertion_ids);
    if (r.kind === "add") reload();
  }

  const chipText = zoomedOut ? "Whole network" : `Around ${view.nodes.find((n) => n.id === focus)?.label ?? focus}`;

  return (
    <main className="map-page" ref={pageRef} onClick={() => setSelected(null)}>
      <header className="map-head">
        <h1>Context map</h1>
        <span className="chip">{chipText}</span>
      </header>
      <div className="map-controls" onClick={(e) => e.stopPropagation()}>
        <label className="toggle">
          <input type="checkbox" checked={showHunches} onChange={(e) => setShowHunches(e.target.checked)} />
          Show unconfirmed hunches
        </label>
        {!zoomedOut && (
          <button type="button" className="text-btn" onClick={zoomOut}>
            Zoom out to whole network
          </button>
        )}
      </div>

      <div key={canvasKey} className={`map-canvas${bloom ? " bloom" : ""}`} style={{ width: w, height: h }}>
        <svg key={expanded.join(",")} className={`map-edges${expanded.length ? " later" : ""}`} width={w} height={h} aria-hidden="true">
          {view.edges.map((e, i) => {
            const a = positions.get(e.from);
            const b = positions.get(e.to);
            if (!a || !b) return null;
            const far = Math.max(Math.hypot(a.x - w / 2, a.y - h / 2), Math.hypot(b.x - w / 2, b.y - h / 2));
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                pathLength={1}
                className={`edge edge-${e.kind}`}
                style={{ "--d": `${Math.round(far * 0.9)}ms` } as React.CSSProperties}
              />
            );
          })}
        </svg>
        {view.nodes.map((n) => {
          const p = positions.get(n.id);
          if (!p) return null;
          const from = spawn ?? { x: w / 2, y: h / 2 };
          const motion = {
            transform: `translate(${p.x}px, ${p.y}px)`,
            "--fx": `${from.x - p.x}px`,
            "--fy": `${from.y - p.y}px`,
            "--d": `${spawn ? 0 : Math.round(Math.hypot(p.x - w / 2, p.y - h / 2) * 0.9)}ms`,
          } as React.CSSProperties;
          return (
            <div key={n.id} className={`map-node kind-${n.kind}`} style={motion}>
              <NodeEnter animate={bloom || !!spawn}>
              <NodeView
                n={n}
                selected={n.id === selected}
                highlighted={highlighted.includes(n.id)}
                onTip={(id) => setSelected((s) => (s === id ? null : id))}
                onBadge={onBadge}
              />
              </NodeEnter>
            </div>
          );
        })}
      </div>

      <ul className="sr-only" aria-label="Tips in view">
        {view.tips.map((t) => (
          <li key={t.id}>{labelFor(t)}</li>
        ))}
      </ul>

      {selectedTip && (
        <div onClick={(e) => e.stopPropagation()}>
          <TipCard key={selectedTip.id} side={cardStyle && "right" in cardStyle ? "left" : "right"} tip={selectedTip} all={loaded.assertions} style={cardStyle} onClose={() => setSelected(null)} />
        </div>
      )}

      <div onClick={(e) => e.stopPropagation()}>
        <ChatPanel onReply={onReply} />
        <BeatControls title={beat?.title} />
      </div>
    </main>
  );
}
