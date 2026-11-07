// /tree: the minimal view for the video. A radial filing system with the root in the centre, fixed named sectors
// drawn dim from the first frame, tips growing outward in their sector and a fan of scope leaves at each tip. One
// change per event, plain words from src/tree/words.ts built from backend fields. The system itself has no tree.
import { useCallback, useMemo } from "react";
import { usePlayback } from "../grow/usePlayback";
import { fold, type TimelineEvent } from "../grow/timeline";
import { link, placeAll, side, type Leaf, type Pos } from "../tree/layout";
import { useTween } from "../tree/useTween";
import { activeIncident } from "./GrowPage";
import { useScale } from "./TitleCard";
import { useQuery } from "../router";
import { MOTION, motionMs, motionVars } from "../tree/motion";
import { ROOT, SUB, TOP, branchOf, caption, day, leafWords, primary, reasonWords, sourceTag, tipWords } from "../tree/words";
import "../tree/tree.css";

const W = 1920;
const H = 1080;
const FOOTER = "Visualisation for the video. The tree is drawn from the stored assertions; the system itself has no tree.";

export function TreePage() {
  const scale = useScale();
  const gapQ = Number(useQuery().get("gap"));
  const gap = Number.isFinite(gapQ) && gapQ > 0 ? gapQ : MOTION.gap;
  const step = useCallback((e: TimelineEvent) => motionMs(e) + (e.kind === "capture" ? Math.max(gap, MOTION.captureGap) : gap), [gap]);
  const { state, events, at: t, last, clean, q, next } = usePlayback(step, { spaceSteps: true });
  const view = useMemo(() => fold(events, t), [events, t]);
  const laid = useMemo(() => placeAll(view.tips, t, events), [view.tips, t, events]);
  // one eased position per node per frame; nodes and links are both drawn from it
  const targets = useMemo(() => new Map([...laid.pos, ...laid.leaves].map((p) => [p.id, { x: p.x, y: p.y }])), [laid]);
  const tw = useTween(targets, MOTION.layout);
  if (state.status === "error") return <main className="thread-page"><p>Could not load the video timeline: {state.error.message}</p></main>;
  if (state.status === "loading") return <main className="t-stage" />;

  const { shown } = laid;
  const pos: Pos[] = laid.pos.map((p) => ({ ...p, ...tw.get(p.id) }));
  const leaves: Leaf[] = laid.leaves.map((l) => ({ ...l, ...tw.get(l.id) }));
  const leafIds = new Set(laid.leaves.map((l) => l.id));
  const byId = new Map<string, Pos>([...pos, ...leaves].map((p) => [p.id, p]));
  const tips = new Map(shown.map((x) => [x.assertion_id, x]));
  const cur = view.current;
  const retracted = new Set(events.slice(0, t + 1).filter((e) => e.kind === "retract").map((e) => (e as { assertion_id: string }).assertion_id));
  const filled = new Set(shown.flatMap((x) => [branchOf(x), SUB.find((s) => s.id === branchOf(x))!.parent, "root"]));

  // the incident the view follows, its one result and the path its pulse takes: centre -> sector -> tip -> leaf
  const inc = activeIncident(events, t);
  const r = inc ? primary(inc, new Set(tips.keys())) : undefined;
  const target = r && tips.get(r.assertion_id);
  const results = r ? r.candidates : {};
  const stopLeaf = r && leaves.find((l) => l.tip === r.assertion_id && !l.fall &&
    (r.outcome === "declined" ? ["fails", "missing"].includes(results[l.c.predicate]) : r.outcome === "proposed" && results[l.c.predicate] === "holds"));
  const chain: Pos[] = [];
  if (target) {
    const sub = branchOf(target);
    for (const id of ["root", SUB.find((s) => s.id === sub)!.parent, sub, target.assertion_id]) chain.push(byId.get(id)!);
    if (stopLeaf) chain.push(stopLeaf);
  }
  const path = new Set(chain.map((p) => p.id));
  const pulse = chain.slice(1).map((p, i) => link(chain[i], p).replace(/^M [^ ]+ [^ ]+ /, "")).reduce((d, s) => `${d} ${s}`, chain.length ? `M ${chain[0].x} ${chain[0].y}` : "");
  const dim = (id: string) => (target && !path.has(id) && t !== last ? " dim" : ""); // the last frame shows the whole wheel
  const reason = r && r.outcome === "declined" && target ? reasonWords(r, target, inc!) : "";

  // camera: holds still until something happens, then one decisive move that frames the sector in play (about 60% of
  // the height); messages and notifications never move it. The last event frames the whole wheel.
  const all = [...laid.pos, ...laid.leaves]; // the camera frames where things are going, not where they are mid-slide
  const box = (ps: Pos[]) => ({
    x0: Math.min(...ps.map((p) => p.x - (leafIds.has(p.id) && side(p) === "left" ? 150 : 150))),
    x1: Math.max(...ps.map((p) => p.x + (leafIds.has(p.id) && side(p) === "right" ? 220 : 150))),
    y0: Math.min(...ps.map((p) => p.y - 90)), y1: Math.max(...ps.map((p) => p.y + 100)),
  });
  const final = t === last;
  const focusId = (() => {
    for (let i = t; i >= 0; i--) {
      const e = events[i];
      if (e.kind === "capture" || e.kind === "retract" || e.kind === "supersede" || e.kind === "expire" || e.kind === "answer") return e.assertion_id;
      if (e.kind === "dispute") return e.assertions[0];
      if (e.kind === "incident") {
        const pr = primary(e, new Set(tips.keys()));
        if (pr) return pr.assertion_id;
      }
    }
    return undefined;
  })();
  const focusTip = !final && focusId ? tips.get(focusId) : undefined;
  const sector = focusTip ? branchOf(focusTip) : undefined;
  const framed = sector
    ? all.filter((p) => p.id === sector || p.id === SUB.find((s) => s.id === sector)!.parent ||
        (tips.has(p.id) && branchOf(tips.get(p.id)!) === sector) || (leafIds.has(p.id) && branchOf(tips.get((p as Leaf).tip)!) === sector))
    : all;
  const bb = box(framed);
  const VIEW_H = H - 130;
  const zoom = sector
    ? Math.min(1.35, Math.max(1, (0.6 * VIEW_H) / (bb.y1 - bb.y0)), (0.9 * W) / (bb.x1 - bb.x0))
    : Math.min(1, W / (bb.x1 - bb.x0), VIEW_H / (bb.y1 - bb.y0));
  const tx = W / 2 - ((bb.x0 + bb.x1) / 2) * zoom;
  const ty = VIEW_H / 2 - ((bb.y0 + bb.y1) / 2) * zoom;
  const camera = `translate(${tx}px, ${ty}px) scale(${zoom})`;
  const toScreen = (p: Pos) => ({ x: tx + p.x * zoom, y: ty + p.y * zoom });

  const words = q.get("caption") === "0" ? "" : caption(cur, events, tips, new Set(tips.keys()));
  const branch = (id: string) => [...TOP, ...SUB].find((b) => b.id === id);
  const tipSide = (p: Pos) => p.label ?? "lab-u";
  const quoteTo = cur?.kind === "capture" ? byId.get(cur.assertion_id) : undefined;
  const still = q.get("still");

  return (
    <main className={`t-stage${still ? " still" : ""}`} style={{ ...motionVars(), ...(still ? { "--still": `-${Number(still)}ms` } : {}) } as React.CSSProperties}>
      <div className="t-frame" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div className={`t-canvas${final ? " final" : ""}`} style={{ transform: camera }}>
          <svg className="t-links" width={W} height={H} aria-hidden="true">
            {[...pos, ...leaves].filter((p) => p.parent).map((p) => {
              const par = byId.get(p.parent!)!;
              const d = link(par, p);
              const tipId = tips.has(p.id) ? p.id : (p as Leaf).tip;
              const tip = tipId ? tips.get(tipId) : undefined;
              const cls = tip ? `tip${tip.expired || tip.superseded_by || retracted.has(tip.assertion_id) ? " gone" : ""}${(p as Leaf).fall ? " fall" : ""}` : filled.has(p.id) ? "on" : "empty";
              return <path key={p.id} className={`t-link ${cls}${dim(p.id)}`} d={d} pathLength={1}
                style={{ d: `path("${d}")`, "--i": (p as Leaf).i ?? 0 } as React.CSSProperties} />;
            })}
            {pulse && <path key={`trail${inc!.index}`} className="t-trail" d={pulse} pathLength={1} />}
          </svg>

          {pos.filter((p) => !tips.has(p.id)).map((p) => {
            const b = branch(p.id);
            return (
              <div key={p.id} className={`t-node t-branch ${p.id === "root" ? "root" : SUB.some((s) => s.id === p.id) ? "sub" : "top"}${filled.has(p.id) ? "" : " empty"}${dim(p.id)}`}
                style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
                <span className="t-dot" />
                <span className="t-name">{p.id === "root" ? ROOT : b!.name}</span>
                {b && b.parent !== "root" && <span className={`t-cap${!filled.has(p.id) && filled.has(b.parent) ? " quiet" : ""}`}>{b.caption}</span>}
              </div>
            );
          })}

          {shown.map((x) => {
            const p = byId.get(x.assertion_id)!;
            const gone = x.superseded_by ? `replaced ${day(x.valid_to!)}` : x.expired ? `expired ${day(x.valid_to!)}`
              : retracted.has(x.assertion_id) ? `${x.said_by.split(" ")[0]} took it back` : "";
            const isTarget = target?.assertion_id === x.assertion_id;
            const tag = isTarget && r!.outcome === "proposed" ? sourceTag(x) : "";
            const line = gone || (isTarget && reason && !stopLeaf ? reason : "") || tag || (x.status === "disputed" ? "disputed" : x.trust === "hunch" ? "hunch" : "");
            return (
              <div key={x.assertion_id} className={`t-node t-tip ${tipSide(p)}${x.trust === "hunch" ? " hunch" : ""}${x.status === "disputed" ? " disputed" : ""}${gone ? " gone" : ""}${x.superseded_by ? " replaced" : ""}${isTarget ? ` hit ${r!.outcome}` : ""}${dim(x.assertion_id)}`}
                style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
                <span className="t-dot" />
                <span className="t-sources">{x.sources.map((s) => <i key={s} />)}</span>
                <span className="t-name">{tipWords(x)}{line && <span key={line} className={`t-status${tag && line === tag ? " tag" : line === "disputed" || line === "hunch" ? ` mark ${line}` : ""}`}>{line}</span>}</span>
              </div>
            );
          })}

          {leaves.map((l) => {
            const res = l.tip === r?.assertion_id ? results[l.c.predicate] : undefined;
            const tip = tips.get(l.tip)!;
            const named = !l.compact || tip.decided?.predicate === l.c.predicate || res === "holds" || stopLeaf?.id === l.id;
            const gone = tip.expired || retracted.has(tip.assertion_id) || tip.superseded_by;
            return (
              <div key={l.id} className={`t-node t-leaf ${side(l)}${l.compact ? " compact" : ""}${res ? ` r-${res}` : ""}${gone ? " gone" : ""}${l.fall ? " fall" : ""}${l.tip === r?.assertion_id ? (res ? "" : " dim") : dim(l.id)}`}
                style={{ transform: `translate(${l.x}px, ${l.y}px)`, "--i": l.i } as React.CSSProperties}>
                <span className="t-dot" />
                {named && <span className="t-label">{leafWords(l.c)}{l.c.edge === "open" && <em className="t-open"> ↗ open</em>}</span>}
                {stopLeaf?.id === l.id && reason && <span className="t-reason">{reason}</span>}
              </div>
            );
          })}

          {pulse && <span key={`p${inc!.index}`} className="t-pulse" style={{ offsetPath: `path("${pulse}")` }} />}
        </div>

        {cur?.kind === "capture" && quoteTo && (
          <blockquote key={cur.index} className="t-quote"
            style={{ "--tx": `${toScreen(quoteTo).x - 60}px`, "--ty": `${toScreen(quoteTo).y - 60}px` } as React.CSSProperties}>
            <p>&ldquo;{cur.this_excerpt}&rdquo;</p>
            <cite>{cur.said_by}</cite>
          </blockquote>
        )}

        {words && <p key={`c${t}`} className="t-caption">{words}</p>}
        {/* an invisible strip on the right edge steps forward on click, like the Teams clone (mouse-only recording) */}
        <div className="t-next" onClick={next} aria-hidden="true" />
        {!clean && <p className="t-footer">{FOOTER} &middot; {t} / {last}</p>}
      </div>
    </main>
  );
}
