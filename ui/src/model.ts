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
};
export const CAPTURED_BEAT: Record<string, number> = { 'thread-001': 2, 'email-12_barrier': 5, 'thread-12b_barrier_update': 6 };
/** First beat a backend thread is on screen (beat 1: empty rail apart from the filler chats). */
export const THREAD_BEAT: Record<string, number> = { 'thread-001': 2, 'email-001': 2, 'email-12_barrier': 5, 'thread-12b_barrier_update': 6 };

/** Replay incidents. `until`: a later beat re-runs the same incident against a newer store and replaces it. */
const REPLAY_INCIDENTS = [
  { entity: 'TRN-087', beat: 1, until: 1, event: 'sfp_replaced', channel: 'faults' },
  { entity: 'TRN-087', beat: 3, event: 'sfp_replaced', channel: 'faults' },
  { entity: 'TRN-101', beat: 4, event: 'sfp_replaced', channel: 'faults' },
  { entity: 'OULU-03', beat: 5, until: 5, event: 'dispatch_created', channel: 'site-access' },
  { entity: 'OULU-03', beat: 6, event: 'dispatch_created', channel: 'site-access' },
  { entity: 'TRN-105', beat: 7, event: 'sfp_replaced', channel: 'faults' },
];
const SECOND_TECHNICIAN = 'thread-13_second_technician'; // Sami's report for beat_7.data.incident

export const questionBeat = (q: Question) => (q.entity_id ? QUESTION_BEAT[q.entity_id] : undefined);
export const notificationBeat = (n: Notification) => NOTIFICATION_BEAT[n.at];

/** beat null = live mode: everything the backend has, plus replay incidents as of beat 7. */
const shows = (b: number | undefined, beat: number | null) => (b === undefined ? beat === null : b <= (beat ?? 7));

// ---- View model --------------------------------------------------------------------------------------
export type AgentKind = 'proposal' | 'question' | 'notice';

export type Item =
  | { kind: 'message'; id: string; ts: string; author: string; text: string; captured: boolean; email: boolean }
  | { kind: 'agent'; agent: AgentKind; id: string; ts: string; text: string; to?: string; question?: Question; answeredLabel?: string | null }
  | { kind: 'status'; id: string; ts: string; text: string; struck?: { text: string; until: string | null } }
  | { kind: 'event'; id: string; ts: string; text: string };

export interface Post { id: string; root: Item; replies: Item[] }
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
};

const firstName = (s: string) => s.split(' ')[0];
const byTime = (a: Item, b: Item) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0); // ISO strings, same offset

/** The fixed STATUS templates; `reason` is the backend's string, verbatim. Proposed results get no STATUS. */
export function statusText(r: ContextResult, question?: Question | null): string | null {
  const who = `${firstName(r.assertion.evidence.said_by)}'s tip`;
  if (r.outcome === 'declined') return `${who} does not apply: ${r.reason}.`;
  if (r.outcome === 'ambiguous') {
    const q = r.question ?? question;
    return q ? `${who} may apply: ${r.reason}. Question sent to ${q.to}.` : `${who} may apply: ${r.reason}.`;
  }
  return null;
}

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
    const text = statusText(r, run.question);
    if (text && r.outcome === 'ambiguous') items.push({ kind: 'status', id: `${run.id}:before:${i}`, ts: at, text });
  });
  run.results.forEach((r, i) => {
    const text = statusText(r, run.question);
    if (!text) return;
    const old = r.assertion.superseded_by ? { text: r.assertion.action_text, until: r.assertion.valid_to } : undefined;
    items.push({ kind: 'status', id: `${run.id}:status:${i}`, ts: at, text, struck: old });
  });
  if (!waiting) {
    // shortcut: beats 5 and 6 carry no agent_text, so the proposal is the assertion's own action_text; ask the backend.
    const texts = run.agentText ? [run.agentText] : proposed.map((r) => r.assertion.action_text);
    texts.forEach((text, i) => items.push({ kind: 'agent', agent: 'proposal', id: `${run.id}:proposal:${i}`, ts: at, text }));
  }
  return toPost(items);
}

export function buildChannels(input: ModelInput, beat: number | null): Channel[] {
  const posts: Record<string, Post[]> = Object.fromEntries(CHANNELS.map(([id]) => [id, []]));
  const allNotifications = Object.values(input.threads).flatMap((t) => t.notifications);
  const sami = input.threads[SECOND_TECHNICIAN];
  const reportFor = (entity: string): Message[] =>
    input.reports.find((r) => r.entity_id === entity)?.messages
    ?? (sami && input.beats[7]?.data.incident?.entity_id === entity ? sami.messages : []);
  const atFor: Record<string, string> = {};

  // Fault and dispatch posts
  const runs: IncidentRun[] = [];
  for (const spec of REPLAY_INCIDENTS) {
    const b = input.beats[spec.beat];
    if (!b || spec.beat > (beat ?? 7) || (spec.until !== undefined && (beat ?? 7) > spec.until)) continue;
    const d = b.data;
    const report = reportFor(spec.entity);
    const at = d.incident?.at ?? report[0]?.timestamp ?? allNotifications.find((n) => n.entity_id === spec.entity)?.at ?? '';
    runs.push({
      id: `beat${spec.beat}:${spec.entity}`, entity: spec.entity, event: spec.event, at, channel: spec.channel, report,
      resultsBefore: d.results_before ?? [], results: d.results ?? [], agentText: d.agent_text, question: d.question,
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
    atFor[run.entity] = run.at;
    posts[run.channel].push(incidentPost(run));
  }

  // Backend threads: one post each, questions and notices as replies in the expert's own thread
  const answerFor = (q: Question): number | undefined =>
    input.answers[q.key] ?? Object.values(input.beats).find((b) => b.data.question?.key === q.key)?.data.answer?.option_index;
  for (const [id, channel] of Object.entries(CHANNEL_OF)) {
    const t = input.threads[id];
    if (!t || !shows(THREAD_BEAT[id], beat)) continue;
    const capturedIds = new Set(shows(CAPTURED_BEAT[id], beat) ? t.captured.map((c) => c.message_id) : []);
    const items: Item[] = t.messages.map((m) => messageItem(m, capturedIds.has(m.id)));
    t.questions.forEach((q, i) => {
      if (!shows(questionBeat(q), beat)) return;
      const idx = answerFor(q);
      items.push({
        kind: 'agent', agent: 'question', id: `${id}:q:${i}`, ts: (q.entity_id && atFor[q.entity_id]) || '9999', text: q.text, to: q.to, question: q,
        answeredLabel: q.answered ? (idx !== undefined ? q.options[idx]?.label ?? '' : '') : null,
      });
    });
    t.notifications.forEach((n, i) => {
      if (shows(notificationBeat(n), beat)) items.push({ kind: 'agent', agent: 'notice', id: `${id}:n:${i}`, ts: n.at, text: n.text, to: n.to });
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
