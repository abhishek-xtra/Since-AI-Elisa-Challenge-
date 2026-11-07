// /tree: the minimal view for the video. A radial filing system with the root in the centre, fixed named sectors
// drawn dim from the first frame, tips growing outward in their sector and a fan of scope leaves at each tip. One
// change per event, plain words from src/tree/words.ts built from backend fields. The system itself has no tree.
import { useMemo } from "react";
import { usePlayback } from "../grow/usePlayback";
import { fold, type Candidate, type Tip, type TimelineEvent } from "../grow/timeline";
import { activeIncident } from "./GrowPage";
import { useScale } from "./TitleCard";
import { ROOT, SUB, TOP, branchOf, caption, day, leafWords, primary, reasonWords, sourceTag, tipWords } from "../tree/words";
import "../tree/tree.css";

const W = 1920;
const H = 1080;
const C = { x: 900, y: 470 };
const DEG = Math.PI / 180;
// The wheel, placed by hand so no label meets another at 1920x1080: the centre, three named sectors around it (Faults
// right, Site access lower left, Other on top) and their sub-branches. Tips grow out of a sub-branch along its
// direction (degrees, 0 = right, 90 = down); scope leaves fan out beyond the tip. The upper left stays free for the
// capture quote.
const SKELETON: Record<string, { x: number; y: number; dir?: number; label?: "lab-u" | "lab-d" }> = {
  root: C,
  faults: { x: 1150, y: 430 }, access: { x: 690, y: 640 }, other: { x: 900, y: 290 },
  sfp_replaced: { x: 1290, y: 300, dir: -15, label: "lab-u" },
  alarm_raised: { x: 1430, y: 520, dir: 10, label: "lab-u" },
  fault_other: { x: 1290, y: 720, dir: 25, label: "lab-d" },
  keys: { x: 580, y: 770, dir: 175, label: "lab-d" },
  route: { x: 480, y: 520, dir: 190, label: "lab-u" },
  unsorted: { x: 900, y: 130, dir: -90, label: "lab-u" },
};
const TIP_DIST: Record<string, number> = { sfp_replaced: 250, alarm_raised: 250, fault_other: 250, keys: 210, route: 210, unsorted: 200 };
const LEAF_DIST: Record<string, number> = { sfp_replaced: 160, alarm_raised: 160, fault_other: 160, keys: 130, route: 130, unsorted: 130 };
const LEAF_STEP = 13;
const COMPACT_DIST = 70; // more than two tips in a sub-branch: leaves shrink to a tight fan of dots
const COMPACT_STEP = 14;
const TIP_SPREAD = 140; // tips in one sub-branch sit side by side across its direction, further apart with big fans
const FOOTER = "Visualisation for the video. The tree is drawn from the stored assertions; the system itself has no tree.";
const step = (e: TimelineEvent) => (e.kind === "message" ? 900 : e.kind === "notification" ? 1800 : 3400);

interface Pos { id: string; x: number; y: number; a: number; parent?: string; label?: string }
interface Leaf extends Pos { c: Candidate; fall: boolean; tip: string; i: number; compact: boolean }

const toward = (from: { x: number; y: number }, a: number, d: number) => ({ x: from.x + d * Math.cos(a * DEG), y: from.y + d * Math.sin(a * DEG) });
const side = (p: Pos) => (Math.cos(p.a * DEG) >= -0.05 ? "right" : "left");

/** Every stored tip stays on screen (a replaced fact is kept, dim). Leaves: the decided one once a tap decided. */
function placeAll(tips: Tip[], t: number, events: TimelineEvent[]) {
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
      list.forEach((c, i) => {
        const la = s.dir! + (i - (list.length - 1) / 2) * (compact ? COMPACT_STEP : LEAF_STEP);
        leaves.push({ id: `${tip.assertion_id}:${c.predicate}`, a: la, parent: tip.assertion_id, compact,
          ...toward(tp, la, compact ? COMPACT_DIST : LEAF_DIST[sub.id]), c,
          tip: tip.assertion_id, i, fall: tapped && !!tip.decided && c.predicate !== tip.decided.predicate });
      });
    });
  }
  return { shown, pos, leaves };
}

/** A curved link from parent to child, bending out of the parent's side like a radial dendrogram. */
function link(p: Pos, c: Pos) {
  const k = { x: p.x + (c.x - p.x) * 0.25, y: c.y };
  return `M ${p.x} ${p.y} Q ${k.x} ${k.y} ${c.x} ${c.y}`;
}

export function TreePage() {
  const scale = useScale();
  const { state, events, at: t, last, clean, q } = usePlayback(step);
  const view = useMemo(() => fold(events, t), [events, t]);
  const laid = useMemo(() => placeAll(view.tips, t, events), [view.tips, t, events]);
  if (state.status === "error") return <main className="thread-page"><p>Could not load the video timeline: {state.error.message}</p></main>;
  if (state.status === "loading") return <main className="t-stage" />;

  const { shown, pos, leaves } = laid;
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

  // camera: lean toward where something happens, then ease back to the whole wheel
  const focus = cur?.kind === "capture" || cur?.kind === "retract" || cur?.kind === "supersede" || cur?.kind === "expire" || cur?.kind === "answer"
    ? byId.get(cur.assertion_id) : target ? byId.get(target.assertion_id) : undefined;
  // keep everything that is drawn inside the frame while the camera leans in
  const all = [...pos, ...leaves];
  const minX = Math.min(...all.map((p) => p.x - (leaves.includes(p as Leaf) && side(p) === "left" ? 150 : 150)));
  const maxX = Math.max(...all.map((p) => p.x + (leaves.includes(p as Leaf) && side(p) === "right" ? 220 : 150)));
  const minY = Math.min(...all.map((p) => p.y - 90)), maxY = Math.max(...all.map((p) => p.y + 100));
  const final = t === last;  // the last event: ease out until the whole wheel is in frame
  const zoom = Math.min(focus && !final ? 1.05 : 1, W / (maxX - minX), (H - 130) / (maxY - minY));
  const fx = focus && !final ? C.x + (focus.x - C.x) * 0.3 : C.x;
  const fy = focus && !final ? C.y + (focus.y - C.y) * 0.3 : C.y;
  const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  const tx = clamp(C.x - fx * zoom, -minX * zoom, W - maxX * zoom);
  const ty = clamp(C.y - fy * zoom, -minY * zoom, H - 130 - maxY * zoom);
  const camera = `translate(${tx}px, ${ty}px) scale(${zoom})`;
  const toScreen = (p: Pos) => ({ x: tx + p.x * zoom, y: ty + p.y * zoom });

  const words = q.get("caption") === "0" ? "" : caption(cur, events, tips, new Set(tips.keys()));
  const branch = (id: string) => [...TOP, ...SUB].find((b) => b.id === id);
  const tipSide = (p: Pos) => p.label ?? "lab-u";
  const quoteTo = cur?.kind === "capture" ? byId.get(cur.assertion_id) : undefined;
  const still = q.get("still");

  return (
    <main className={`t-stage${still ? " still" : ""}`} style={still ? ({ "--still": `-${Number(still)}ms` } as React.CSSProperties) : undefined}>
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
        {!clean && <p className="t-footer">{FOOTER} &middot; {t} / {last}</p>}
      </div>
    </main>
  );
}
