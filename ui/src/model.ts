// Builds what the screen shows from backend data. Pure: no fetching, no React. Every agent sentence is copied
// from a backend field; the only frontend copy is the STATUS template and the capture line (handoff 2.1, 5).
import type { Beat, ContextResult, Message, Notification, Question, ReportThread, Thread } from './data/types';

export const AGENT_NAME = 'Context layer';
export const CAPTURE_LINE = 'Saved as a tip. Nothing for you to do.';

// ---- Replay filters (handoff section 4) -------------------------------------------------------------
export const QUESTION_BEAT: Record<string, number> = { 'TRN-087': 3, 'TRN-101': 4 };
export const NOTIFICATION_BEAT: Record<string, number> = {
  '2026-11-07T10:00:00+02:00': 3,
  '2026-11-08T08:00:00+02:00': 5,
  '2026-11-08T14:00:00+02:00': 7,
  '2026-11-15T08:00:00+02:00': 8,
};
export const CAPTURED_BEAT: Record<string, number> = {
  'thread-001': 2, 'email-12_barrier': 5, 'thread-12b_barrier_update': 6, 'thread-14_road_closed': 8,
};
/** First beat a backend thread is on screen (beat 1: empty rail apart from the filler chats). */
export const THREAD_BEAT: Record<string, number> = {
  'thread-001': 2, 'email-001': 2, 'email-12_barrier': 5, 'thread-12b_barrier_update': 6, 'thread-14_road_closed': 8, 'thread-15_retraction': 9,
};
/** A thread that changes a tip's status (retraction): its author's message gets the STATUS line of that beat's result. */
export const REVIEW_BEAT: Record<string, number> = { 'thread-15_retraction': 9 };

interface IncidentSpec {
  entity: string; beat: number; until?: number; event: string; channel: string;
  /** which result list of the beat this run is (beat 8 has two dispatches); default `results` with `results_before` as pre-answer */
  list?: 'results_before' | 'results_after';
  /** only the beat's own new assertions (`data.assertions`), not every unrelated decline */
  ownOnly?: boolean;
  /** incident time when the beat data has none; shortcut: beats 8 and 9 print it only in `lines`, ask the backend for `incident` */
  at?: string;
  noReport?: boolean;
}

/** Replay incidents. `until`: a later beat re-runs the same incident against a newer store and replaces it. */
const REPLAY_INCIDENTS: IncidentSpec[] = [
  { entity: 'TRN-087', beat: 1, until: 1, event: 'sfp_replaced', channel: 'faults' },
  { entity: 'TRN-087', beat: 3, event: 'sfp_replaced', channel: 'faults' },
  { entity: 'TRN-101', beat: 4, event: 'sfp_replaced', channel: 'faults' },
  { entity: 'OULU-03', beat: 5, until: 5, event: 'dispatch_created', channel: 'site-access' },
  { entity: 'OULU-03', beat: 6, event: 'dispatch_created', channel: 'site-access' },
  { entity: 'TRN-105', beat: 7, event: 'sfp_replaced', channel: 'faults' },
  { entity: 'OULU-11', beat: 8, event: 'dispatch_created', channel: 'site-access', list: 'results_before', ownOnly: true, at: '2026-11-15T08:00:00+02:00' },
  { entity: 'OULU-11', beat: 8, event: 'dispatch_created', channel: 'site-access', list: 'results_after', ownOnly: true, at: '2026-11-21T08:00:00+02:00' },
  { entity: 'TRN-087', beat: 9, event: 'sfp_replaced', channel: 'faults', at: '2026-11-11T10:00:00+02:00', noReport: true },
];
const SECOND_TECHNICIAN = 'thread-13_second_technician'; // Sami's report for beat_7.data.incident

export const questionBeat = (q: Question) => (q.entity_id ? QUESTION_BEAT[q.entity_id] : undefined);
export const notificationBeat = (n: Notification) => NOTIFICATION_BEAT[n.at];

// ---- View model --------------------------------------------------------------------------------------
export type AgentKind = 'proposal' | 'question' | 'notice';

export type Item =
  | { kind: 'message'; id: string; ts: string; author: string; text: string; captured: boolean; email: boolean; note?: string }
  | { kind: 'agent'; agent: AgentKind; id: string; ts: string; text: string; to?: string; question?: Question; answeredLabel?: string | null }
  | { kind: 'status'; id: string; ts: string; text: string; outcome: ContextResult['outcome']; lead: string; reason: string;
      struck?: { text: string; until: string | null } }
  | { kind: 'event'; id: string; ts: string; text: string };

export interface Post { id: string; root: Item; replies: Item[]; entity?: string }
export interface Channel { id: string; name: string; posts: Post[] }

export interface LiveIncident {
  id: string;
  entity_id: string;
  event: string;
  symptoms: string[];
  at: string;
  results: ContextResult[];
  agent_text: string;
}

export interface ModelInput {
  beats: Record<number, Beat>;
  threads: Record<string, Thread>;
  fillers: Thread[];
  reports: ReportThread[];
  live: LiveIncident[];
  /** option index chosen per question key, from live clicks; replay answers come from beat data */
  answers: Record<string, number>;
}

export const CHANNELS: [string, string][] = [
  ['general', 'General'], ['faults', 'Faults'], ['experts', 'Experts'], ['site-access', 'Site access'], ['field-chat', 'Field chat'],
];
const CHANNEL_OF: Record<string, string> = {
  'thread-001': 'experts', 'email-001': 'experts', 'email-12_barrier': 'site-access', 'thread-12b_barrier_update': 'site-access',
  'thread-14_road_closed': 'site-access', 'thread-15_retraction': 'experts',
};

const firstName = (s: string) => s.split(' ')[0];
const byTime = (a: Item, b: Item) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0); // ISO strings, same offset

/** The fixed STATUS template, split for the card: a lead line, then the backend `reason` verbatim.
 *  Proposed results get no STATUS (DEMO_CHAT scenes 2 and 3 show only the proposal). */
export function statusParts(r: ContextResult, question?: Question | null): { lead: string; text: string } | null {
  const who = `${firstName(r.assertion.evidence.said_by)}'s tip`;
  const q = r.question ?? question;
  const lead = r.outcome === 'declined' ? `${who} does not apply`
    : r.outcome === 'ambiguous' ? `${who} may apply${q ? ` · question sent to ${q.to}` : ''}` : null;
  return lead ? { lead, text: `${lead}: ${r.reason}.` } : null;
}
export const statusText = (r: ContextResult, question?: Question | null) => statusParts(r, question)?.text ?? null;

const statusItem = (id: string, ts: string, r: ContextResult, question?: Question): Item | null => {
  const parts = statusParts(r, question);
  if (!parts) return null;
  // superseded, or expired before this incident: the old fact shown struck through with its valid_to
  const a = r.assertion;
  const struck = a.superseded_by || (r.outcome === 'declined' && a.valid_to && a.valid_to < ts) ? { text: a.action_text, until: a.valid_to } : undefined;
  return { kind: 'status', id, ts, outcome: r.outcome, reason: r.reason, struck, ...parts };
};

const messageItem = (m: Message, captured: boolean): Item => ({
  kind: 'message', id: m.id, ts: m.timestamp, author: m.author, text: m.text, captured, email: m.channel === 'email',
});

const toPost = (items: Item[]): Post => {
  const sorted = [...items].sort(byTime);
  return { id: sorted[0].id, root: sorted[0], replies: sorted.slice(1) };
};

interface IncidentRun {
  id: string; entity: string; event: string; at: string; channel: string;
  report: Message[]; resultsBefore: ContextResult[]; results: ContextResult[]; agentText?: string; question?: Question;
}

function incidentPost(run: IncidentRun): Post {
  const items: Item[] = [];
  const at = run.at;
  const proposed = run.results.filter((r) => r.outcome === 'proposed');
  const waiting = run.results.some((r) => r.outcome === 'ambiguous'); // proposal only after the expert answers
  // When the agent proposes nothing, the technician carries on; later report lines would imply the tip helped.
  for (const m of run.report) if (m.timestamp <= at || proposed.length) items.push(messageItem(m, false));
  if (!run.report.length) items.push({ kind: 'event', id: `${run.id}:event`, ts: at, text: `${run.event} · ${run.entity}` });
  run.resultsBefore.forEach((r, i) => {
    const s = r.outcome === 'ambiguous' && statusItem(`${run.id}:before:${i}`, at, r, run.question);
    if (s) items.push(s);
  });
  run.results.forEach((r, i) => {
    const s = statusItem(`${run.id}:status:${i}`, at, r, run.question);
    if (s) items.push(s);
  });
  if (!waiting) {
    // shortcut: beats 5 and 6 carry no agent_text, so the proposal is the assertion's own action_text; ask the backend.
    const texts = run.agentText ? [run.agentText] : proposed.map((r) => r.assertion.action_text);
    texts.forEach((text, i) => items.push({ kind: 'agent', agent: 'proposal', id: `${run.id}:proposal:${i}`, ts: at, text }));
  }
  return { ...toPost(items), entity: run.entity };
}

export function buildChannels(input: ModelInput, beat: number | null): Channel[] {
  const posts: Record<string, Post[]> = Object.fromEntries(CHANNELS.map(([id]) => [id, []]));
  const allNotifications = Object.values(input.threads).flatMap((t) => t.notifications);
  const sami = input.threads[SECOND_TECHNICIAN];
  const reportFor = (entity: string): Message[] =>
    input.reports.find((r) => r.entity_id === entity)?.messages
    ?? (sami && input.beats[7]?.data.incident?.entity_id === entity ? sami.messages : []);
  const atFor: Record<string, string> = {};
  // Live mode shows everything as of the last beat on file.
  const upTo = beat ?? Math.max(0, ...Object.keys(input.beats).map(Number));
  /** b undefined: not a replay item, so only live mode shows it */
  const shows = (b: number | undefined) => (b === undefined ? beat === null : b <= upTo);

  // Fault and dispatch posts
  const runs: IncidentRun[] = [];
  for (const spec of REPLAY_INCIDENTS) {
    const b = input.beats[spec.beat];
    if (!b || spec.beat > upTo || (spec.until !== undefined && upTo > spec.until)) continue;
    const d = b.data;
    const report = spec.noReport ? [] : reportFor(spec.entity);
    const at = spec.at ?? d.incident?.at ?? report[0]?.timestamp ?? allNotifications.find((n) => n.entity_id === spec.entity)?.at ?? '';
    const own = new Set((d.assertions ?? []).map((a) => a.id));
    const pick = (rs: ContextResult[] = []) => (spec.ownOnly ? rs.filter((r) => own.has(r.assertion.id)) : rs);
    runs.push({
      id: `beat${spec.beat}:${spec.entity}${spec.list ? `:${spec.list}` : ''}`, entity: spec.entity, event: spec.event, at, channel: spec.channel, report,
      resultsBefore: spec.list ? [] : pick(d.results_before), results: pick(spec.list ? d[spec.list] as ContextResult[] : d.results),
      agentText: d.agent_text, question: d.question,
    });
  }
  if (beat === null) {
    for (const l of input.live) {
      const report: Message[] = [{
        id: `${l.id}:report`, author: 'You', role: 'field_engineer', timestamp: l.at, channel: 'teams', thread_id: l.id,
        text: `${l.entity_id}: ${l.event}${l.symptoms.length ? ` (${l.symptoms.join(', ')})` : ''}`, incident: null,
      }];
      runs.push({ id: l.id, entity: l.entity_id, event: l.event, at: l.at, channel: 'faults', report, resultsBefore: [], results: l.results, agentText: l.agent_text });
    }
  }
  for (const run of runs) {
    atFor[run.entity] ??= run.at; // a question sits at the first incident on its entity
    posts[run.channel].push(incidentPost(run));
  }

  // Backend threads: one post each, questions and notices as replies in the expert's own thread
  const answerFor = (q: Question): number | undefined =>
    input.answers[q.key] ?? Object.values(input.beats).find((b) => b.data.question?.key === q.key)?.data.answer?.option_index;
  for (const [id, channel] of Object.entries(CHANNEL_OF)) {
    const t = input.threads[id];
    if (!t || !shows(THREAD_BEAT[id])) continue;
    const capturedIds = new Set(shows(CAPTURED_BEAT[id]) ? t.captured.map((c) => c.message_id) : []);
    const items: Item[] = t.messages.map((m) => messageItem(m, capturedIds.has(m.id)));
    if (REVIEW_BEAT[id] && shows(REVIEW_BEAT[id])) {
      // the retraction: the STATUS of that beat's result for a tip sourced from this thread, under its author's message
      const r = (input.beats[REVIEW_BEAT[id]]?.data.results ?? []).find((x) => x.assertion.evidence.sources.includes(`${t.channel}:${id}`));
      const msg = r && items.find((m) => m.kind === 'message' && m.author === r.assertion.evidence.said_by);
      const note = r && statusText(r);
      if (msg && msg.kind === 'message' && note) msg.note = note;
    }
    t.questions.forEach((q, i) => {
      if (!shows(questionBeat(q))) return;
      const idx = answerFor(q);
      items.push({
        kind: 'agent', agent: 'question', id: `${id}:q:${i}`, ts: (q.entity_id && atFor[q.entity_id]) || '9999', text: q.text, to: q.to, question: q,
        answeredLabel: q.answered ? (idx !== undefined ? q.options[idx]?.label ?? '' : '') : null,
      });
    });
    t.notifications.forEach((n, i) => {
      if (shows(notificationBeat(n))) items.push({ kind: 'agent', agent: 'notice', id: `${id}:n:${i}`, ts: n.at, text: n.text, to: n.to });
    });
    posts[channel].push(toPost(items));
  }

  for (const t of input.fillers) posts['field-chat'].push(toPost(t.messages.map((m) => messageItem(m, false))));

  // Teams orders conversations by latest activity, then by start
  const last = (p: Post) => p.replies.at(-1) ?? p.root;
  return CHANNELS.map(([id, name]) => ({ id, name, posts: posts[id].sort((a, b) => byTime(last(a), last(b)) || byTime(a.root, b.root)) }));
}

/** Every item in a channel, roots and replies. */
export const itemsOf = (c: Channel): Item[] => c.posts.flatMap((p) => [p.root, ...p.replies]);
