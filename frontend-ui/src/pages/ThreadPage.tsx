import { useState } from "react";
import { BeatControls } from "../components/BeatControls";
import { CheckIcon, NetworkIcon } from "../components/Icons";
import { getSource, loadAssertions } from "../data";
import { adviceSentence, formatDay, formatTime, normalise } from "../data/derive";
import type { Assertion, Beat, ContextResult, Notification, Thread, ThreadItem } from "../data/types";
import { useQuery } from "../router";
import { useAsync } from "../useAsync";

type MessageItem = Extract<ThreadItem, { type: "message" }>;
type QuestionItem = Extract<ThreadItem, { type: "question" }>;
type NotificationItem = Extract<ThreadItem, { type: "notification" }>;

interface Loaded {
  thread: Thread;
  assertions: Assertion[];
  beat: Beat | null;
}

async function load(id: string, beatN: number): Promise<Loaded> {
  const src = getSource();
  if (beatN && src.getBeat) {
    const beat = await src.getBeat(beatN);
    const thread = beat.thread && beat.thread.thread_id === id ? beat.thread : await src.getThread(id);
    return { thread, assertions: beat.assertions, beat };
  }
  const [thread, assertions] = await Promise.all([src.getThread(id), loadAssertions(src)]);
  return { thread, assertions, beat: null };
}

/** Message id → the tips whose excerpt it holds. One line per tip, on one message only. */
export function captureLines(thread: Thread, assertions: Assertion[]): Map<string, Assertion[]> {
  const out = new Map<string, Assertion[]>();
  const messages = thread.items.filter((i): i is MessageItem => i.type === "message");
  for (const a of assertions) {
    if (!a.evidence.sources.some((s) => s === `teams:${thread.thread_id}` || s === thread.thread_id)) continue;
    const excerpt = normalise(a.evidence.excerpt);
    if (!excerpt) continue;
    const head = excerpt.slice(0, 40);
    const hit = messages.find((m) => normalise(m.text).includes(excerpt)) ?? messages.find((m) => normalise(m.text).includes(head));
    if (hit) out.set(hit.id, [...(out.get(hit.id) ?? []), a]);
  }
  return out;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const firstName = (name: string) => name.split(/\s+/)[0];

function entityOf(n: Notification): string | undefined {
  return n.entity_id ?? /used on ([A-Z0-9-]+)/i.exec(n.text)?.[1];
}

const resultId = (r: ContextResult) => (typeof r.assertion === "string" ? r.assertion : r.assertion.id);

function NotificationBanner({ n, result, assertions }: { n: Notification; result?: ContextResult; assertions: Assertion[] }) {
  const entity = entityOf(n);
  const aId = n.assertion_id ?? (result ? resultId(result) : undefined);
  const a = assertions.find((x) => x.id === aId) ?? (result && typeof result.assertion !== "string" ? result.assertion : undefined);
  const title = entity ? `${firstName(n.to)}, your tip was used on ${entity} today` : `${firstName(n.to)}, your tip was used today`;
  let detail = n.text;
  if (a && (!result || result.outcome === "proposed")) detail = `The agent proposed it on ${entity ?? "the device"}: ${adviceSentence(a)}`;
  return (
    <div className="notice pop" role="status">
      <p className="notice-title">{title}</p>
      <p className="notice-detail">{detail}</p>
    </div>
  );
}

function QuestionCard({
  item,
  answered,
  onAnswer,
  busy,
}: {
  item: QuestionItem;
  answered: { label: string } | null;
  onAnswer: (i: number) => void;
  busy: boolean;
}) {
  return (
    <article className="msg" aria-label="Question from Context layer">
      <div className="avatar avatar-system" aria-hidden="true">
        <NetworkIcon />
      </div>
      <div className="msg-body">
        <header className="msg-head">
          <span className="msg-author">Context layer</span>
          {item.at && <time dateTime={item.at}>{formatTime(item.at)}</time>}
        </header>
        <div className={`question-card${answered ? " is-answered" : ""}`}>
          <p className="question-text">{item.text}</p>
          {answered ? (
            <p className="question-answered pop">
              <CheckIcon /> Answered: {answered.label}
            </p>
          ) : (
            <>
              <div className="question-options">
                {item.options.map((o, i) => (
                  <button key={o.label} type="button" className="option" disabled={busy} onClick={() => onAnswer(i)}>
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="muted small">Asked once. Your answer is remembered.</p>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function Message({ m, tips }: { m: MessageItem; tips?: Assertion[] }) {
  return (
    <article className="msg">
      <div className="avatar" aria-hidden="true">
        {initials(m.author)}
      </div>
      <div className="msg-body">
        <header className="msg-head">
          <span className="msg-author">{m.author}</span>
          <time dateTime={m.timestamp}>{formatTime(m.timestamp)}</time>
        </header>
        <p className="msg-text">{m.text}</p>
        {tips?.map((t) => (
          <p key={t.id} className="capture-line">
            <CheckIcon /> Saved as a tip. Nothing for you to do.
          </p>
        ))}
      </div>
    </article>
  );
}

function itemDate(i: ThreadItem): string | undefined {
  if (i.type === "message") return i.timestamp;
  return i.at;
}

export function ThreadPage({ id }: { id: string }) {
  const q = useQuery();
  const beatN = Number(q.get("beat")) || 0;
  const [state, reload] = useAsync(() => load(id, beatN), `${id}|${beatN}`);
  const [busy, setBusy] = useState(false);
  // In beat replay, answers stay local: a replay must never write to the backend.
  const [localAnswers, setLocalAnswers] = useState<Record<string, { label: string }>>({});

  if (state.status === "loading")
    return (
      <main className="thread-page">
        <p className="sr-only" role="status">Loading the thread</p>
      </main>
    );
  if (state.status === "error")
    return (
      <main className="thread-page">
        <p role="alert">Couldn't load this thread. {state.error.message}</p>
      </main>
    );

  const { thread, assertions, beat } = state.value;
  const lines = captureLines(thread, assertions);
  const participants =
    thread.participants ?? [...new Set(thread.items.filter((i): i is MessageItem => i.type === "message").map((m) => m.author))];

  const answerOf = (item: QuestionItem) => item.answer ?? localAnswers[`${beatN}:${item.assertion_id}`] ?? null;

  async function onAnswer(item: QuestionItem, index: number) {
    if (beat) {
      setLocalAnswers((s) => ({ ...s, [`${beatN}:${item.assertion_id}`]: { label: item.options[index].label } }));
      return;
    }
    setBusy(true);
    try {
      await getSource().answer(item.assertion_id, index);
      reload();
    } finally {
      setBusy(false);
    }
  }

  // Beat notifications appear once that beat's question has been answered.
  const beatQuestionsAnswered = thread.items.every((i) => i.type !== "question" || answerOf(i));
  const extraNotices: Notification[] = beat && beatQuestionsAnswered ? (beat.notifications ?? []) : [];
  const findResult = (n: Notification) => beat?.results?.find((r) => resultId(r) === n.assertion_id);

  let lastDay = "";
  const rows: JSX.Element[] = [];
  thread.items.forEach((item, idx) => {
    const at = itemDate(item);
    const day = at ? formatDay(at) : "";
    if (day && day !== lastDay) {
      rows.push(
        <div key={`d-${idx}`} className="day-divider" role="separator">
          <span>{day}</span>
        </div>,
      );
      lastDay = day;
    }
    if (item.type === "message") rows.push(<Message key={item.id} m={item} tips={lines.get(item.id)} />);
    else if (item.type === "question")
      rows.push(
        <QuestionCard key={`q-${idx}`} item={item} answered={answerOf(item)} busy={busy} onAnswer={(i) => onAnswer(item, i)} />,
      );
    else rows.push(<NotificationBanner key={`n-${idx}`} n={item as NotificationItem} result={(item as NotificationItem).result} assertions={assertions} />);
  });
  extraNotices.forEach((n, i) =>
    rows.push(<NotificationBanner key={`bn-${i}`} n={n} result={findResult(n)} assertions={assertions} />),
  );

  return (
    <main className="thread-page">
      <header className="thread-head">
        <h1>{participants.join(", ")}</h1>
      </header>
      <div className="thread-list">
        {rows.map((row, i) => (
          // Rows rise in one after another on first load; later additions (answer, notice) animate on their own.
          <div key={row.key} className="rise" style={{ "--i": Math.min(i, 16) } as React.CSSProperties}>
            {row}
          </div>
        ))}
      </div>
      <BeatControls title={beat?.title} />
    </main>
  );
}
