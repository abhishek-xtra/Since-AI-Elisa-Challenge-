// Turns the backend's real out/ shapes (docs/process/TEAMS_CLONE_HANDOFF.md section 2 in the backend repo) into
// the types this UI was built on. Every function passes the mock shapes through unchanged.
import type { Assertion, Beat, ContextResult, DataSource, Graph, Notification, Question, Thread, ThreadItem } from "./types";

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Real assertions carry `decided` as {predicate, edge} and `questions_asked` as a list of keys. */
export function adaptAssertion(raw: Raw): Assertion {
  const decided = raw.applies_to?.decided;
  return {
    ...raw,
    applies_to: { ...raw.applies_to, decided: decided && typeof decided === "object" ? decided.predicate ?? null : decided ?? null },
    question_asked: raw.question_asked ?? (Array.isArray(raw.questions_asked) ? raw.questions_asked.length > 0 : false),
  } as Assertion;
}

export function adaptResult(raw: Raw): ContextResult {
  return { ...raw, assertion: typeof raw.assertion === "string" ? raw.assertion : adaptAssertion(raw.assertion) } as ContextResult;
}

export function adaptGraph(raw: Graph): Graph {
  return { ...raw, nodes: raw.nodes.map((n) => (n.kind === "transmission_node" ? { ...n, kind: "node" } : n)) };
}

// shortcut: the beat's entity if neither its data nor its printed lines name one; add a row if a new beat needs one.
const BEAT_ENTITY: Record<number, string> = { 1: "TRN-087", 3: "TRN-087", 4: "TRN-101", 5: "OULU-03", 6: "OULU-03", 7: "TRN-105" };

const INCIDENT_LINE = /^(?:Incident: )?([a-z_]+) (?:on|for) ([A-Z]+-\d+)\b(?:.*? at ([^\s,]+))?(?:, symptoms (.+))?$/;

const sourceThread = (source?: string) => source?.replace(/^[a-z_]+:/, "");

/** One real beat file ({beat, title, lines, data}) as the UI's Beat. A mock beat comes back as it is. */
export function adaptBeat(raw: Raw): Beat {
  if (!raw.data) return raw as Beat;
  const d: Raw = raw.data;
  const results: ContextResult[] = (d.results ?? []).map(adaptResult);
  const full = (r: ContextResult) => (typeof r.assertion === "string" ? [] : [r.assertion]);

  // The state after the beat: results first, then the beat's own assertion(s), which win.
  const byId = new Map<string, Assertion>();
  for (const a of [...results.flatMap(full), ...[d.assertions ?? [], d.assertion ?? []].flat().map(adaptAssertion)]) byId.set(a.id, a);
  const assertions = [...byId.values()];
  // The main tip: the beat's own, else the one it proposed, else its first result.
  const main = d.assertion ?? [...results.filter((r) => r.outcome === "proposed"), ...results].flatMap(full)[0] ?? assertions[assertions.length - 1];

  // An incident is any beat that ran get_context. Only beat 7 has data.incident; the others print it as a line,
  // e.g. "Incident: sfp_replaced on TRN-087 at <time>, symptoms a, b" or "dispatch_created for OULU-03 at <time>".
  const line = (raw.lines ?? []).map((l: string) => INCIDENT_LINE.exec(l)).find(Boolean);
  const inc = d.incident ?? (line && { event: line[1], entity_id: line[2], at: line[3], symptoms: line[4]?.split(/,\s*/) });
  const incident =
    inc || d.results
      ? { entity_id: inc?.entity_id ?? BEAT_ENTITY[raw.beat] ?? "", event: inc?.event ?? "", symptoms: inc?.symptoms ?? [], at_time: inc?.at }
      : undefined;

  // The beat's time: the latest moment its data names (never valid_to, which can lie ahead). Only used for "is it still live".
  const times: string[] = [incident?.at_time, ...(d.notifications ?? []).map((n: Notification) => n.at)];
  for (const a of assertions) times.push(a.valid_from, a.recorded_at, ...a.evidence.cases.map((c) => c.at));
  const at_time = times.filter(Boolean).sort((x, y) => Date.parse(x!) - Date.parse(y!)).pop() ?? "";

  return {
    beat: raw.beat,
    title: raw.title,
    at_time,
    incident,
    results,
    agent_text: d.agent_text,
    assertions,
    thread_id: sourceThread(main?.evidence?.sources?.[0]),
    notifications: d.notifications,
    question: d.question,
    answer: d.answer,
  };
}

/** A real thread ({messages, questions, notifications, captured}) as the UI's items list. */
export function adaptThread(raw: Raw): Thread {
  if (raw.items) return raw as Thread;
  const items: ThreadItem[] = (raw.messages ?? []).map((m: Raw) => ({ type: "message", ...m, incident: m.incident ?? undefined }));
  const notes: Notification[] = [...(raw.notifications ?? [])];
  // The files carry no time for questions: each goes after the messages, followed by its own notification.
  for (const q of (raw.questions ?? []) as (Question & { answered?: boolean; entity_id?: string })[]) {
    items.push({ type: "question", ...q, answer: q.answered ? { option_index: -1, label: "" } : null });
    const i = notes.findIndex((n) => n.entity_id === q.entity_id);
    if (i >= 0) items.push({ type: "notification", ...notes.splice(i, 1)[0] });
  }
  for (const n of notes) items.push({ type: "notification", ...n });
  return { thread_id: raw.thread_id, items, captured: raw.captured ?? [], cumulative: true };
}

/** Beats 1, 2, ... until the first one that doesn't load. Beat 1 failing is a real error. */
export async function loadBeats(src: DataSource): Promise<Beat[]> {
  const out: Beat[] = [];
  if (!src.getBeat) return out;
  for (let n = 1; n <= 99; n++) {
    try {
      out.push(await src.getBeat(n));
    } catch (e) {
      if (n === 1) throw e;
      break;
    }
  }
  return out;
}

export interface BeatState {
  beat: Beat;
  /** Every tip known by this beat, each in its latest version. */
  assertions: Assertion[];
  at: Date;
}

/** Beat state is cumulative: beat n shows everything from beats 1..n. Null when there is no beat n. */
export function beatState(beats: Beat[], n: number): BeatState | null {
  const beat = beats.find((b) => b.beat === n);
  if (!beat) return null;
  const byId = new Map<string, Assertion>();
  let at = 0;
  for (const b of beats.filter((b) => b.beat <= n)) {
    for (const a of b.assertions) byId.set(a.id, a);
    if (b.at_time) at = Math.max(at, Date.parse(b.at_time));
  }
  return { beat, assertions: [...byId.values()], at: at ? new Date(at) : new Date() };
}

/** The entity a beat is about: its incident, else its first tip's case. */
export function beatFocus(beat: Beat): string | undefined {
  return beat.incident?.entity_id || beat.assertions[0]?.evidence.cases[0]?.entity;
}

const resultIds = (b: Beat, outcome: string) =>
  (b.results ?? []).filter((r) => r.outcome === outcome).map((r) => (typeof r.assertion === "string" ? r.assertion : r.assertion.id));

/** The beat a real thread item belongs to: a question by its key, a notification by the beat that proposed its tip for its entity. */
function itemBeat(item: ThreadItem, beats: Beat[]): number | undefined {
  if (item.type === "question") return beats.find((b) => b.question?.key && b.question.key === (item as { key?: string }).key)?.beat;
  if (item.type === "notification")
    return beats.find((b) => beatFocus(b) === item.entity_id && resultIds(b, "proposed").includes(item.assertion_id ?? ""))?.beat;
  return undefined;
}

/**
 * A cumulative (real) thread as it stood at beat n: later questions and notifications are left out, earlier
 * questions show the answer their beat recorded, and this beat's question waits for a tap. Mock threads pass through.
 */
export function threadAtBeat(thread: Thread, beats: Beat[], n: number): Thread {
  if (!thread.cumulative) return thread;
  const items: ThreadItem[] = [];
  for (const item of thread.items) {
    if (item.type === "message") {
      items.push(item);
      continue;
    }
    const b = itemBeat(item, beats);
    if (b === undefined || b > n) continue;
    if (item.type === "question") {
      const beat = beats.find((x) => x.beat === b)!;
      const opt = beat.answer && item.options[beat.answer.option_index];
      items.push({ ...item, beat: b, answer: b < n && opt ? { option_index: beat.answer!.option_index, label: opt.label } : null });
    } else items.push({ ...item, beat: b });
  }
  return { ...thread, items };
}
