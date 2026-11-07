// /tree: the minimal view for the video. Only the filing system and what lands in it, one change per event, in plain
// words built by src/tree/words.ts from the backend fields. A picture for the video; the system itself has no tree.
import { useMemo } from "react";
import { usePlayback } from "../grow/usePlayback";
import { fold, type Candidate, type Tip, type TimelineEvent } from "../grow/timeline";
import { activeIncident } from "./GrowPage";
import { useScale } from "./TitleCard";
import { ROOT, SUB, TOP, branchOf, caption, day, leafWords, primary, reasonWords, tipWords } from "../tree/words";
import "../tree/tree.css";

const W = 1920;
const H = 1080;
const X = { root: 40, top: 380, sub: 740, tip: 1080, leaf: 1600 };
const TIP_OUT = 425; // leaf links start after the tip label, never through it
const AVAIL = H - 150; // above the caption band
const LEAF = 62;
const FOOTER = "Visualisation for the video. The tree is drawn from the stored assertions; the system itself has no tree.";
const step = (e: TimelineEvent) => (e.kind === "message" ? 900 : e.kind === "notification" ? 1800 : 3200);

interface Pos { id: string; x: number; y: number; parent?: string }
interface Leaf extends Pos { c: Candidate; fall: boolean; tip: string }

/** Tips on screen: superseded ones only at the moment they are replaced. Leaves: the decided one once a tap decided. */
function placeAll(tips: Tip[], at: number, events: TimelineEvent[]) {
  const cur = events[at];
  const shown = tips.filter((t) => !t.superseded_by || (cur?.kind === "supersede" && cur.assertion_id === t.assertion_id));
  const pos: Pos[] = [];
  const leaves: Leaf[] = [];
  let y = 150; // room for the capture quote top-left
  const tops: Record<string, number[]> = {};
  for (const top of TOP) {
    const subYs: number[] = [];
    for (const sub of SUB.filter((s) => s.parent === top.id)) {
      const mine = shown.filter((t) => branchOf(t) === sub.id).sort((a, b) => a.bornAt - b.bornAt);
      if (!mine.length) {
        subYs.push(y + 55);
        pos.push({ id: sub.id, x: X.sub, y: y + 55, parent: top.id });
        y += 130;
        continue;
      }
      const tipYs: number[] = [];
      for (const t of mine) {
        const tapped = cur?.kind === "answer" && cur.assertion_id === t.assertion_id;
        const live = t.candidates.filter((c) => c.against === 0);
        const list = t.decided && !tapped ? live.filter((c) => c.predicate === t.decided!.predicate) : live;
        const block = Math.max(list.length * LEAF, 140);
        const top0 = y + (block - list.length * LEAF) / 2;
        list.forEach((c, i) =>
          leaves.push({ id: `${t.assertion_id}:${c.predicate}`, x: X.leaf, y: top0 + i * LEAF + LEAF / 2, parent: t.assertion_id, c, tip: t.assertion_id,
            fall: tapped && !!t.decided && c.predicate !== t.decided.predicate }),
        );
        const ty = y + block / 2 + 10;
        tipYs.push(ty);
        pos.push({ id: t.assertion_id, x: X.tip, y: ty, parent: sub.id });
        y += block + 20;
      }
      const sy = (Math.min(...tipYs) + Math.max(...tipYs)) / 2;
      subYs.push(sy);
      pos.push({ id: sub.id, x: X.sub, y: sy, parent: top.id });
      y += 10;
    }
    tops[top.id] = subYs;
    const ty = (Math.min(...subYs) + Math.max(...subYs)) / 2;
    pos.push({ id: top.id, x: X.top, y: ty, parent: "root" });
    y += 30;
  }
  const tys = TOP.map((t) => pos.find((p) => p.id === t.id)!.y);
  pos.push({ id: "root", x: X.root, y: (Math.min(...tys) + Math.max(...tys)) / 2 });
  return { shown, pos, leaves, height: y };
}

const curve = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const mx = (a.x + b.x) / 2;
  return `C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
};

export function TreePage() {
  const scale = useScale();
  const { state, events, at, last, clean, q } = usePlayback(step);
  const view = useMemo(() => fold(events, at), [events, at]);
  const laid = useMemo(() => placeAll(view.tips, at, events), [view.tips, at, events]);
  if (state.status === "error") return <main className="thread-page"><p>Could not load the video timeline: {state.error.message}</p></main>;
  if (state.status === "loading") return <main className="t-stage" />;

  const { shown, pos, leaves, height } = laid;
  const byId = new Map<string, Pos>([...pos, ...leaves].map((p) => [p.id, p]));
  const tips = new Map(shown.map((t) => [t.assertion_id, t]));
  const cur = view.current;
  const retracted = new Set(events.slice(0, at + 1).filter((e) => e.kind === "retract").map((e) => (e as { assertion_id: string }).assertion_id));
  const filled = new Set(shown.flatMap((t) => [branchOf(t), SUB.find((s) => s.id === branchOf(t))!.parent, "root"]));

  // the incident the view follows, its one result and the path its pulse takes
  const inc = activeIncident(events, at);
  const r = inc ? primary(inc, new Set(tips.keys())) : undefined;
  const target = r && tips.get(r.assertion_id);
  const results = r ? r.candidates : {};
  const stopLeaf = r && leaves.find((l) => l.tip === r.assertion_id && !l.fall &&
    (r.outcome === "declined" ? ["fails", "missing"].includes(results[l.c.predicate]) : r.outcome === "proposed" && results[l.c.predicate] === "holds"));
  const path = new Set<string>();
  if (target) {
    path.add("root").add(branchOf(target)).add(SUB.find((s) => s.id === branchOf(target))!.parent).add(target.assertion_id);
    if (stopLeaf) path.add(stopLeaf.id);
  }
  const chain = [...path].map((id) => byId.get(id)!).sort((a, b) => a.x - b.x);
  const pulse = chain.length > 1 ? chain.slice(1).reduce((d, p, i) => `${d} ${curve(chain[i], p)}`, `M ${chain[0].x} ${chain[0].y}`) : "";
  const dim = (id: string) => (inc && target && !path.has(id) ? " dim" : "");
  const reason = r && r.outcome === "declined" && target ? reasonWords(r, target, inc!) : "";

  // keep the newest thing in view when the tree outgrows the frame
  const s = Math.max(0.8, Math.min(1, AVAIL / height));
  const newest = cur && "assertion_id" in cur ? byId.get(cur.assertion_id as string) : target ? byId.get(target.assertion_id) : undefined;
  const ty = newest ? Math.min(0, Math.max(AVAIL - height * s, AVAIL / 2 - newest.y * s)) : Math.min(0, AVAIL - height * s);
  const quoteTo = cur?.kind === "capture" ? byId.get(cur.assertion_id) : undefined;
  const words = q.get("caption") === "0" ? "" : caption(cur, events, tips, new Set(tips.keys()));
  const branchName = (id: string) => (id === "root" ? ROOT : [...TOP, ...SUB].find((b) => b.id === id)!.name);
  const branchCap = (id: string) => [...TOP, ...SUB].find((b) => b.id === id)?.caption;

  return (
    <main className="t-stage">
      <div className="t-frame" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div className="t-canvas" style={{ transform: `translateY(${ty}px) scale(${s})` }}>
          <svg className="t-links" width={W} height={Math.max(height, AVAIL)} aria-hidden="true">
            {[...pos, ...leaves].filter((p) => p.parent).map((p) => {
              const par = byId.get(p.parent!)!;
              const a = tips.has(par.id) ? { x: par.x + TIP_OUT, y: par.y } : par;
              const d = `M ${a.x} ${a.y} ${curve(a, p)}`;
              const tipId = tips.has(p.id) ? p.id : (p as Leaf).tip;
              const tip = tipId ? tips.get(tipId) : undefined;
              const cls = tip ? `tip${tip.expired || tip.superseded_by || retracted.has(tip.assertion_id) ? " gone" : ""}${(p as Leaf).fall ? " fall" : ""}` : filled.has(p.id) ? "on" : "empty";
              return <path key={p.id} className={`t-link ${cls}${dim(p.id)}`} d={d} pathLength={1} style={{ d: `path("${d}")` } as React.CSSProperties} />;
            })}
          </svg>

          {pos.filter((p) => !tips.has(p.id)).map((p) => (
            <div key={p.id} className={`t-node t-branch ${p.id === "root" ? "root" : SUB.some((b) => b.id === p.id) ? "sub" : "top"}${filled.has(p.id) ? "" : " empty"}${dim(p.id)}`}
              style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
              <span className="t-dot" />
              <span className="t-name">{branchName(p.id)}</span>
              {branchCap(p.id) && <span className="t-cap">{branchCap(p.id)}</span>}
            </div>
          ))}

          {shown.map((t) => {
            const p = byId.get(t.assertion_id)!;
            const gone = t.expired ? `expired ${day(t.valid_to!)}` : retracted.has(t.assertion_id) ? `${t.said_by.split(" ")[0]} took it back` : "";
            const replaced = !!t.superseded_by;
            const isTarget = target?.assertion_id === t.assertion_id;
            return (
              <div key={t.assertion_id} className={`t-node t-tip${gone ? " gone" : ""}${replaced ? " replaced" : ""}${isTarget ? ` hit ${r!.outcome}` : ""}${dim(t.assertion_id)}`}
                style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
                <span className="t-dot" />
                <span className="t-name">{tipWords(t)}</span>
                <span className="t-sources">{t.sources.map((src) => <i key={src} />)}</span>
                {(gone || (isTarget && reason && !stopLeaf)) && <span className="t-status">{gone || reason}</span>}
              </div>
            );
          })}

          {leaves.map((l, i) => {
            const res = l.tip === r?.assertion_id ? results[l.c.predicate] : undefined;
            const tip = tips.get(l.tip)!;
            const gone = tip.expired || retracted.has(tip.assertion_id) || tip.superseded_by;
            return (
              <div key={l.id} className={`t-node t-leaf${res ? ` r-${res}` : ""}${gone ? " gone" : ""}${l.fall ? " fall" : ""}${l.tip === r?.assertion_id ? (res ? "" : " dim") : dim(l.id)}`}
                style={{ transform: `translate(${l.x}px, ${l.y}px)`, "--i": i % 6 } as React.CSSProperties}>
                <span className="t-dot" />
                <span className="t-label">{leafWords(l.c)}</span>
                {stopLeaf?.id === l.id && reason && <span className="t-reason">{reason}</span>}
              </div>
            );
          })}

          {pulse && <span key={`p${inc!.index}`} className="t-pulse" style={{ offsetPath: `path("${pulse}")` }} />}
        </div>

        {cur?.kind === "capture" && quoteTo && (
          <blockquote key={cur.index} className="t-quote"
            style={{ "--tx": `${quoteTo.x * s - 60}px`, "--ty": `${(quoteTo.y * s + ty) - 60}px` } as React.CSSProperties}>
            <p>&ldquo;{cur.this_excerpt}&rdquo;</p>
            <cite>{cur.said_by}</cite>
          </blockquote>
        )}

        {words && <p key={`c${at}`} className="t-caption">{words}</p>}
        {!clean && <p className="t-footer">{FOOTER} &middot; {at} / {last}</p>}
      </div>
    </main>
  );
}
