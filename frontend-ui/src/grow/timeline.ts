// The video's "context tree": folds out/video_timeline.json (scripts/video_timeline.py) up to an event index and lays
// the stored assertions out as a left-to-right dendrogram. A picture for the video; the backend has no tree.

export interface Candidate { predicate: string; edge: string; support: number; against: number; basis: string }
export interface Case { entity: string; at: string; outcome: string | null }
export interface Decided { predicate: string; edge: string }
export interface Question {
  assertion_id: string; key: string; to: string; thread_id: string; text: string;
  options: { label: string; sets_decided: string | null; edge: string | null; edge_answer: string | null }[];
}
export interface Result {
  assertion_id: string; trigger_matched: boolean; validity: string | null; candidates: Record<string, string>;
  decided: string | null; outcome: string; reason: string; question: Question | null; action_text: string;
  said_by: string; trust: string; status: string;
}

interface Base { index: number; at: string }
export interface MessageEv extends Base { kind: "message"; id: string; author: string; role: string; channel: string; thread_id: string; timestamp: string; text: string }
export interface CaptureEv extends Base {
  kind: "capture"; how: "new" | "new_case" | "new_source"; thread_id: string; source: string; this_excerpt: string;
  message_ids: string[]; status_before: string | null; dispute_with: string[]; assertion_id: string;
  trigger: { kind: string; event: string; symptoms: string[] }; action: string; action_text: string; avoid: string[];
  excerpt: string; said_by: string; said_by_role: string; trust: string; status: string; entity_type: string;
  candidates: Candidate[]; decided: Decided | null; cases: Case[]; sources: string[]; valid_from: string;
  valid_to: string | null; supersedes: string | null; superseded_by: string | null;
}
export interface NoCaptureEv extends Base { kind: "no_capture"; thread_id: string; source: string; reason: string | null }
export interface IncidentEv extends Base { kind: "incident"; entity: string; entity_site: string; entity_region: string; event: string; symptoms: string[]; source: string; results: Result[]; not_matched: string[]; agent_text: string | null }
export interface AnswerEv extends Base { kind: "answer"; assertion_id: string; to: string; thread_id: string; key: string; option_index: number; option_label: string; decided: Decided | null; status: string; candidates: { predicate: string; edge: string }[] }
export interface NotificationEv extends Base { kind: "notification"; to: string; text: string; assertion_id: string; entity_id: string }
export interface SupersedeEv extends Base { kind: "supersede"; assertion_id: string; superseded_by: string; valid_to: string; action_text: string; new_action_text: string }
export interface ExpireEv extends Base { kind: "expire"; assertion_id: string; reason: string; valid_to: string; action_text: string }
export interface RetractEv extends Base { kind: "retract"; assertion_id: string; thread_id: string; said_by: string; excerpt: string; message_ids: string[]; status_before: string; status: string }
export interface DisputeEv extends Base { kind: "dispute"; assertions: string[]; action_texts: string[]; said_by: string[]; trust: string[] }

export type TimelineEvent = MessageEv | CaptureEv | NoCaptureEv | IncidentEv | AnswerEv | NotificationEv | SupersedeEv | ExpireEv | RetractEv | DisputeEv;
export interface VideoTimeline { note: string; events: TimelineEvent[] }

export interface Tip extends Omit<CaptureEv, "kind" | "index" | "at" | "how"> {
  bornAt: number;
  expired: string | null;
  supersededText: string | null;
}

export interface View {
  tips: Tip[];
  messages: MessageEv[];
  /** Thread id -> the no_capture event that read it. */
  quiet: Map<string, NoCaptureEv>;
  /** Message id -> assertion id whose excerpt it holds. */
  captured: Map<string, string>;
  cards: TimelineEvent[];
  answers: AnswerEv[];
  current: TimelineEvent | undefined;
}

const CARD_KINDS = new Set(["incident", "answer", "notification", "supersede", "expire", "retract", "dispute"]);

/** State after events[0..t] (inclusive). */
export function fold(events: TimelineEvent[], t: number): View {
  const tips = new Map<string, Tip>();
  const v: View = { tips: [], messages: [], quiet: new Map(), captured: new Map(), cards: [], answers: [], current: events[t] };
  for (const e of events.slice(0, t + 1)) {
    if (CARD_KINDS.has(e.kind)) v.cards.push(e);
    switch (e.kind) {
      case "message":
        v.messages.push(e);
        break;
      case "no_capture":
        v.quiet.set(e.thread_id, e);
        break;
      case "capture": {
        const { kind: _k, index: _i, at: _a, how: _h, ...rest } = e;
        const old = tips.get(e.assertion_id);
        tips.set(e.assertion_id, { ...rest, bornAt: old?.bornAt ?? e.index, expired: old?.expired ?? null, supersededText: old?.supersededText ?? null });
        e.message_ids.forEach((m) => v.captured.set(m, e.assertion_id));
        break;
      }
      case "dispute":
        e.assertions.forEach((id) => {
          const tip = tips.get(id);
          if (tip) {
            tip.status = "disputed";
            tip.dispute_with = [...new Set([...tip.dispute_with, ...e.assertions.filter((x) => x !== id)])];
          }
        });
        break;
      case "supersede": {
        const tip = tips.get(e.assertion_id);
        if (tip) Object.assign(tip, { superseded_by: e.superseded_by, valid_to: e.valid_to, supersededText: e.new_action_text });
        break;
      }
      case "retract": {
        const tip = tips.get(e.assertion_id);
        if (tip) tip.status = e.status;
        e.message_ids.forEach((m) => v.captured.set(m, e.assertion_id));
        break;
      }
      case "expire": {
        const tip = tips.get(e.assertion_id);
        if (tip) tip.expired = e.reason;
        break;
      }
      case "answer": {
        v.answers.push(e);
        const tip = tips.get(e.assertion_id);
        if (tip) {
          tip.decided = e.decided;
          tip.status = e.status;
          tip.candidates = tip.candidates.map((c, i) => ({ ...c, ...(e.candidates[i] ?? {}) }));
        }
        break;
      }
    }
  }
  v.tips = [...tips.values()];
  return v;
}

// ---------- layout ----------

export const COL = { root: 18, kind: 110, event: 215, symptoms: 345, tip: 495, cand: 755 } as const;
export const ROW = 22;
const GAP = 14;
const TOP = 30;

export type NodeKind = "root" | "kind" | "event" | "symptoms" | "tip" | "cand";
export interface LaidNode { id: string; kind: NodeKind; x: number; y: number; label: string; parent?: string; tipId?: string; cand?: Candidate; bornAt: number }

export const symptomsKey = (t: { trigger: { kind: string; event: string; symptoms: string[] } }) =>
  `s:${t.trigger.kind}:${t.trigger.event}:${[...t.trigger.symptoms].sort().join("+")}`;

/** Deterministic dendrogram: groups by trigger kind, event and symptom set; tips in capture order; one row per candidate. */
export function layout(tips: Tip[]): { nodes: LaidNode[]; height: number } {
  const kindRank = (k: string) => (k === "incident" ? 0 : 1);
  const sorted = [...tips].sort(
    (a, b) =>
      kindRank(a.trigger.kind) - kindRank(b.trigger.kind) ||
      a.trigger.event.localeCompare(b.trigger.event) ||
      symptomsKey(a).localeCompare(symptomsKey(b)) ||
      a.bornAt - b.bornAt,
  );
  const nodes: LaidNode[] = [];
  let y = TOP;
  const groups = new Map<string, { ys: number[]; label: string; kind: NodeKind; parent: string; x: number; bornAt: number }>();
  const group = (id: string, kind: NodeKind, x: number, parent: string, label: string, ty: number, bornAt: number) => {
    const g = groups.get(id) ?? { ys: [], label, kind, parent, x, bornAt };
    g.ys.push(ty);
    g.bornAt = Math.min(g.bornAt, bornAt);
    groups.set(id, g);
  };
  for (const t of sorted) {
    // once decided, get_context evaluates only the decided predicate: the other candidates leave the picture
    const cands = t.decided ? t.candidates.filter((c) => c.predicate === t.decided!.predicate) : t.candidates;
    const rows = Math.max(cands.length, 4);
    const top = y;
    cands.forEach((c, i) =>
      nodes.push({ id: `c:${t.assertion_id}:${i}`, kind: "cand", x: COL.cand, y: top + i * ROW + ROW / 2, label: c.predicate, parent: `t:${t.assertion_id}`, tipId: t.assertion_id, cand: c, bornAt: t.bornAt }),
    );
    const ty = top + (rows * ROW) / 2;
    const k = `k:${t.trigger.kind}`;
    const ev = `e:${t.trigger.kind}:${t.trigger.event}`;
    const sk = symptomsKey(t);
    nodes.push({ id: `t:${t.assertion_id}`, kind: "tip", x: COL.tip, y: ty, label: t.action_text, parent: sk, tipId: t.assertion_id, bornAt: t.bornAt });
    group(sk, "symptoms", COL.symptoms, ev, t.trigger.symptoms.length ? [...t.trigger.symptoms].sort().join(" + ") : "event only", ty, t.bornAt);
    group(ev, "event", COL.event, k, t.trigger.event, ty, t.bornAt);
    group(k, "kind", COL.kind, "root", t.trigger.kind, ty, t.bornAt);
    y = top + rows * ROW + GAP;
  }
  for (const [id, g] of groups) {
    nodes.push({ id, kind: g.kind, x: g.x, y: (Math.min(...g.ys) + Math.max(...g.ys)) / 2, label: g.label, parent: g.parent, bornAt: g.bornAt });
  }
  const ys = nodes.filter((n) => n.kind === "kind").map((n) => n.y);
  nodes.push({ id: "root", kind: "root", x: COL.root, y: ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : TOP + 40, label: "Context", bornAt: -1 });
  return { nodes, height: y };
}

/** How long an event stays on screen at 1x, in ms. */
export function duration(e: TimelineEvent): number {
  switch (e.kind) {
    case "message": return 700;
    case "capture": return 2800;
    case "no_capture": return 1400;
    case "incident": return 5200;
    case "notification": return 1600;
    default: return 2600;
  }
}
