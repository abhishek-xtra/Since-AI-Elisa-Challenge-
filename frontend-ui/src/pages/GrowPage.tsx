// /grow: the video's context tree. Chat on the left, the stored assertions drawn as a growing tree in the centre, the
// agent's answers as Teams-style cards on the right. Every word comes from out/video_timeline.json; the system has no tree.
import { useEffect, useMemo, useState } from "react";
import { getSource } from "../data";
import { useAsync } from "../useAsync";
import { useQuery, withQuery } from "../router";
import { useScale } from "./TitleCard";
import { COL, duration, fold, layout, type IncidentEv, type LaidNode, type MessageEv, type Result, type Tip, type TimelineEvent } from "../grow/timeline";
import "../grow/grow.css";

const W = 1920;
const H = 1080;
const TREE_W = COL.cand + 210;
const TREE_H = 860;
const TREE_AVAIL_W = W - 48 - 440 - 470 - 32;
const SPEEDS = [0.5, 1, 2];
const FOOTER = "Visualisation for the video. The tree is drawn from the stored assertions; the system itself has no tree.";

// Wall-clock parts straight from the ISO string, so the page shows the time the data says on any machine.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function when(iso: string, weekday = false) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const day = weekday ? `${DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ` : "";
  return `${day}${d} ${MONTHS[m - 1]} ${iso.slice(11, 16)}`;
}
const date = (iso: string) => iso.slice(0, 10);
const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const hue = (name: string) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

function Avatar({ name, ai = false }: { name: string; ai?: boolean }) {
  return (
    <span className={`g-avatar${ai ? " ai" : ""}`} style={ai ? undefined : { background: `hsl(${hue(name)} 28% 38%)` }} aria-hidden="true">
      {ai ? "AI" : initials(name)}
    </span>
  );
}

// ---------- left: the chat feed ----------

function Feed({ messages, captured, quiet, current, t }: {
  messages: MessageEv[]; captured: Map<string, string>; quiet: Map<string, { reason: string | null; index: number }>; current?: TimelineEvent; t: number;
}) {
  const shown = messages.slice(-28);
  const hot = new Set(current && (current.kind === "capture" || current.kind === "retract") ? current.message_ids : []);
  return (
    <section className="g-feed" aria-label="Team chats">
      <div className="g-feed-scroll">
        {shown.map((m, i) => {
          const head = i === 0 || shown[i - 1].thread_id !== m.thread_id;
          const last = i === shown.length - 1 || shown[i + 1].thread_id !== m.thread_id;
          const q = quiet.get(m.thread_id);
          const tip = captured.get(m.id);
          return (
            <div key={m.id} className="g-feed-item">
              {head && <p className="g-thread">{m.channel === "email" ? "Email" : "Teams"} · {m.thread_id}</p>}
              <article className={`g-post${tip ? " captured" : ""}${hot.has(m.id) ? " hot" : ""}`}>
                <Avatar name={m.author} />
                <div className="g-post-main">
                  <p className="g-post-head">
                    <span className="g-name">{m.author}</span>
                    <span className="g-time">{when(m.timestamp)}</span>
                  </p>
                  <p className="g-text">{m.text}</p>
                  {tip && <p className="g-saved">Captured · {tip}</p>}
                </div>
              </article>
              {last && q && q.index <= t && <p className="g-quiet">Read, nothing captured. {q.reason}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------- centre: the tree ----------

function link(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
}
const tipOut = (n: { x: number; y: number }) => ({ x: n.x + 246, y: n.y });

function tipState(tip: Tip) {
  if (tip.expired) return "expired";
  if (tip.superseded_by) return "superseded";
  if (tip.status === "review") return "review";
  if (tip.trust === "hunch") return "hunch";
  return tip.status;
}

/** The incident whose pathway is lit: the current event, or the one its notifications and answers follow. */
function activeIncident(events: TimelineEvent[], t: number): IncidentEv | undefined {
  for (let i = t; i >= 0; i--) {
    const e = events[i];
    if (e.kind === "incident") return e;
    if (!["notification", "answer", "expire"].includes(e.kind)) return undefined;
  }
  return undefined;
}

function Tree({ tips, inc, current }: { tips: Tip[]; inc?: IncidentEv; current?: TimelineEvent }) {
  const { nodes, height } = useMemo(() => layout(tips), [tips]);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const tipById = new Map(tips.map((t) => [t.assertion_id, t]));
  const results = new Map<string, Result>((inc?.results ?? []).map((r) => [r.assertion_id, r]));
  const scale = Math.min(1, TREE_H / Math.max(height + 20, 1), TREE_AVAIL_W / TREE_W);

  const lit = new Set<string>();
  if (inc) {
    const ev = `e:incident:${inc.event}`;
    const wf = `e:workflow:${inc.event}`;
    for (const id of [ev, wf]) if (byId.has(id)) lit.add(id).add(byId.get(id)!.parent!).add("root");
    for (const r of results.values()) {
      const tn = byId.get(`t:${r.assertion_id}`);
      if (tn) lit.add(tn.id).add(tn.parent!);
    }
  }
  const pathTo = (n: LaidNode) => {
    const chain: LaidNode[] = [];
    for (let c: LaidNode | undefined = n; c; c = c.parent ? byId.get(c.parent) : undefined) chain.unshift(c);
    return chain.slice(1).reduce((d, c, i) => d + " " + link(chain[i], c).replace(/^M [^C]+/, ""), `M ${chain[0].x} ${chain[0].y}`);
  };

  const quoteFor = current && (current.kind === "capture" || current.kind === "retract") ? byId.get(`t:${current.assertion_id}`) : undefined;
  const quote = current?.kind === "capture" ? current.this_excerpt : current?.kind === "retract" ? current.excerpt : "";
  const disputes = tips.flatMap((t) => t.dispute_with.filter((o) => o > t.assertion_id && tipById.has(o)).map((o) => [t.assertion_id, o] as const));

  return (
    <section className="g-tree" aria-label="Context tree">
      <div className="g-canvas" style={{ width: TREE_W, height: Math.max(height, 200), transform: `scale(${scale})` }}>
        <svg className="g-links" width={TREE_W} height={Math.max(height, 200)} aria-hidden="true">
          {nodes.filter((n) => n.parent && byId.has(n.parent)).map((n) => {
            const p = byId.get(n.parent!)!;
            const d = link(n.kind === "cand" ? tipOut(p) : p, n);
            const tip = n.tipId ? tipById.get(n.tipId) : undefined;
            const r = n.tipId ? results.get(n.tipId) : undefined;
            const on = n.kind === "cand" ? !!(r && n.cand && n.cand.predicate in r.candidates) : lit.has(n.id) && lit.has(p.id);
            return (
              <g key={n.id}>
                <path className={`g-link ${tip ? tipState(tip) : ""}`} d={d} pathLength={1} style={{ d: `path("${d}")` } as React.CSSProperties} />
                {on && <path key={`f${inc?.index}`} className={`g-flow ${n.kind === "cand" && r ? r.candidates[n.cand!.predicate] : ""}`} d={d} pathLength={1} />}
              </g>
            );
          })}
          {disputes.map(([a, b]) => {
            const na = byId.get(`t:${a}`), nb = byId.get(`t:${b}`);
            if (!na || !nb) return null;
            const x = na.x - 16;
            return <path key={`d${a}${b}`} className="g-dispute" d={`M ${x + 8} ${na.y} H ${x} V ${nb.y} H ${x + 8}`} />;
          })}
        </svg>

        {nodes.map((n) => {
          const style = { transform: `translate(${n.x}px, ${n.y}px)` };
          if (n.kind === "tip") {
            const tip = tipById.get(n.tipId!)!;
            const r = results.get(tip.assertion_id);
            const state = tipState(tip);
            return (
              <div key={n.id} className={`g-node g-tipnode ${state}${r ? ` hit ${r.outcome}` : ""}`} style={style}>
                <span className="g-dot" />
                <div className="g-tip">
                  <p className="g-tip-label">{tip.action_text}</p>
                  <p className="g-tip-meta">{tip.said_by} · {tip.trust} · {tip.assertion_id}</p>
                  <p className="g-marks">
                    {tip.cases.map((c, i) => <span key={`c${i}`} className={`g-case ${c.outcome ?? "none"}`} title={`${c.entity} ${c.outcome ?? ""}`} />)}
                    {tip.sources.map((s) => <span key={s} className="g-source" title={s} />)}
                    {tip.status === "disputed" && <span className="g-tag disputed">disputed</span>}
                    {state === "superseded" && <span className="g-tag">replaced by {tip.superseded_by} {date(tip.valid_to!)}</span>}
                    {state === "expired" && <span className="g-tag">{tip.expired}</span>}
                    {tip.status === "review" && <span className="g-tag">under review</span>}
                    {tip.trust === "hunch" && !tip.superseded_by && <span className="g-tag">hunch</span>}
                    {r && <span className={`g-outcome ${r.outcome}`}>{r.outcome}</span>}
                  </p>
                </div>
              </div>
            );
          }
          if (n.kind === "cand") {
            const c = n.cand!;
            const tip = tipById.get(n.tipId!)!;
            const r = results.get(n.tipId!)?.candidates[c.predicate];
            const decided = tip.decided?.predicate === c.predicate;
            return (
              <div key={n.id} className={`g-node g-cand ${tipState(tip)}${c.against > 0 ? " out" : ""}${decided ? " decided" : ""}${r ? ` r-${r}` : ""}`} style={style}>
                <span className="g-dot" />
                <span className="g-pred">{c.predicate}</span>
                {c.edge === "open" && <span className="g-open" title="open edge">open ↗</span>}
                <span className="g-count">+{c.support}{c.against ? ` −${c.against}` : ""}</span>
                {r && <span className="g-res">{r}</span>}
              </div>
            );
          }
          return (
            <div key={n.id} className={`g-node g-group ${n.kind}${lit.has(n.id) ? " lit" : ""}`} style={style}>
              <span className="g-dot" />
              <span className="g-glabel">{n.label}</span>
            </div>
          );
        })}

        {inc && [...results.values()].map((r) => {
          const tn = byId.get(`t:${r.assertion_id}`);
          return tn ? <span key={`p${inc.index}${r.assertion_id}`} className="g-pulse" style={{ offsetPath: `path("${pathTo(tn)}")` }} /> : null;
        })}

        {quoteFor && quote && (
          <blockquote key={current!.index} className={`g-quote${quoteFor.y < 180 ? " below" : ""}`} style={{ transform: `translate(${Math.max(quoteFor.x - 300, 0)}px, ${quoteFor.y}px)` }}>
            <p>“{quote}”</p>
            <cite>{current!.kind === "capture" ? current!.said_by : current!.kind === "retract" ? current!.said_by : ""}</cite>
          </blockquote>
        )}
      </div>
    </section>
  );
}

// ---------- right: the agent's cards ----------

function IncidentCard({ e, tapped }: { e: IncidentEv; tapped: Map<string, number> }) {
  return (
    <>
      <p className="g-card-what">
        <b>{e.event}</b> on <b>{e.entity}</b>
        {e.symptoms.length > 0 && <span className="g-chips">{e.symptoms.map((s) => <span key={s}>{s}</span>)}</span>}
      </p>
      {e.agent_text && <p className="g-proposal">{e.agent_text}</p>}
      {e.results.length === 0 && <p className="g-none">get_context returned nothing: no trigger matched.</p>}
      <ul className="g-results">
        {e.results.map((r) => (
          <li key={r.assertion_id} className={r.outcome}>
            <span className={`g-outcome ${r.outcome}`}>{r.outcome}</span> <b>{r.assertion_id}</b> {r.action_text}
            <span className="g-reason">{r.reason}</span>
          </li>
        ))}
      </ul>
      {e.results.filter((r) => r.question).map((r) => {
        const q = r.question!;
        const tap = tapped.get(`${q.assertion_id}|${q.key}`);
        return (
          <div key={q.key} className="g-question">
            <p className="g-q-to">Question to {q.to} in {q.thread_id}</p>
            <p className="g-q-text">{q.text}</p>
            <p className="g-options">
              {q.options.map((o, i) => <span key={o.label} className={`g-option${tap === i ? " tapped" : ""}`}>{o.label}</span>)}
            </p>
          </div>
        );
      })}
    </>
  );
}

function Card({ e, current, tapped }: { e: TimelineEvent; current: boolean; tapped: Map<string, number> }) {
  const titles: Record<string, string> = {
    incident: "Context AI", answer: "Answer", notification: "Notification", supersede: "Replaced", expire: "Expired",
    retract: "Taken back", dispute: "Disputed",
  };
  const ai = e.kind === "incident";
  return (
    <article className={`g-card ${e.kind}${current ? " current" : ""}`}>
      <header>
        <Avatar name={ai ? "AI" : titles[e.kind]} ai={ai || e.kind === "notification"} />
        <span className="g-name">{titles[e.kind]}</span>
        <span className="g-time">{when(e.at, true)}</span>
      </header>
      {e.kind === "incident" && <IncidentCard e={e} tapped={tapped} />}
      {e.kind === "answer" && <p>{e.to} tapped <span className="g-option tapped">{e.option_label}</span> on {e.assertion_id}{e.decided ? `: decided ${e.decided.predicate} (${e.decided.edge} edge)` : ""}</p>}
      {e.kind === "notification" && <p>To {e.to}: {e.text}</p>}
      {e.kind === "supersede" && <p><s>{e.action_text}</s> → {e.new_action_text}. {e.assertion_id} valid to {date(e.valid_to)}, replaced by {e.superseded_by}.</p>}
      {e.kind === "expire" && <p>{e.assertion_id} “{e.action_text}”: {e.reason}.</p>}
      {e.kind === "retract" && <p>{e.said_by}: “{e.excerpt}” {e.assertion_id} is {e.status === "review" ? "under review" : e.status}.</p>}
      {e.kind === "dispute" && <p>{e.said_by[0]}: “{e.action_texts[0]}” ({e.trust[0]}) vs {e.said_by[1]}: “{e.action_texts[1]}” ({e.trust[1]}).</p>}
    </article>
  );
}

// ---------- page ----------

export function GrowPage() {
  const q = useQuery();
  const scale = useScale();
  const clean = q.get("clean") === "1";
  const [state] = useAsync(() => getSource().getVideoTimeline!(), "video");
  const events = state.status === "ready" ? state.value.events : [];
  const start = Number(q.get("t") ?? 0);
  const [t, setT] = useState(Number.isFinite(start) ? start : 0);
  const [playing, setPlaying] = useState(q.get("play") === "1");
  const [speed, setSpeed] = useState(1);
  const last = events.length - 1;
  const at = Math.max(0, Math.min(t, last));

  useEffect(() => {
    if (!playing || at >= last || !events.length) return;
    const id = setTimeout(() => setT(at + 1), duration(events[at]) / speed);
    return () => clearTimeout(id);
  }, [playing, at, last, speed, events]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.code === "ArrowRight") setT((x) => Math.min(x + 1, last));
      if (e.code === "ArrowLeft") setT((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [last]);

  const view = useMemo(() => fold(events, at), [events, at]);
  if (state.status === "error") return <main className="thread-page"><p>Could not load the video timeline: {state.error.message}</p></main>;
  if (state.status === "loading") return <main className="g-stage" />;

  const inc = activeIncident(events, at);
  const tapped = new Map(view.answers.map((a) => [`${a.assertion_id}|${a.key}`, a.option_index]));
  const cards = view.cards.slice(-5).reverse();
  const now = view.current?.at ?? events[0]?.at ?? "";

  return (
    <main className={`g-stage${clean ? " clean" : ""}`}>
      <div className="g-frame" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <header className="g-top">
          <h1>Context</h1>
          <p className="g-clock">{now && when(now, true)} <span>{now.slice(0, 4)}</span></p>
          <p className="g-stats">{view.messages.length} messages read · {view.tips.length} tips stored</p>
        </header>
        <Feed messages={view.messages} captured={view.captured} quiet={view.quiet} current={view.current} t={at} />
        <Tree tips={view.tips} inc={inc} current={view.current} />
        <section className="g-cards" aria-label="Context AI">
          {cards.map((e) => <Card key={e.index} e={e} current={e.index === at || e.index === inc?.index} tapped={tapped} />)}
        </section>
        {!clean && (
          <nav className="g-controls" aria-label="Playback">
            <button type="button" onClick={() => (at >= last ? (setT(0), setPlaying(true)) : setPlaying(!playing))}>{playing ? "Pause" : "Play"}</button>
            {SPEEDS.map((s) => (
              <button key={s} type="button" className={s === speed ? "on" : ""} aria-pressed={s === speed} onClick={() => setSpeed(s)}>{s}x</button>
            ))}
            <input type="range" min={0} max={last} value={at} aria-label="Event" onChange={(e) => { setT(Number(e.target.value)); window.history.replaceState(null, "", withQuery({ t: e.target.value })); }} />
            <span className="g-index">{at} / {last} · {view.current?.kind}</span>
          </nav>
        )}
        <p className="g-footer">{FOOTER}</p>
      </div>
    </main>
  );
}
