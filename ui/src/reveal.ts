// Reveal mode (?reveal=1): a beat's new items appear one by one, for recording the demo like a live chat.
// Pure apart from urlReveal/motionOK; App.tsx drives the timing, app.css the motion.
import type { Channel, Item } from './model';

/** Every duration in ms; tune here. App.tsx turns them into the --rv-* CSS variables. */
export const TIMING = {
  typing: 900,   // "<Name> is typing" row before a human message or reply
  enter: 220,    // post or reply slides up 12 px and fades in
  expand: 260,   // Context layer card (STATUS or proposal) grows from 0 height
  cursor: 700,   // cursor glides from the question card's corner to the chosen option
  press: 150,    // the option shows pressed
  collapse: 260, // card collapses to "Answered: <label>"
  drop: 220,     // notice drops in from above
  badge: 300,    // Activity badge scale pulse
  reaction: 400, // delay before the 👍 1 pill pops in
  pop: 250,      // the pill's pop
  dim: 600,      // older items dim to 70% while a new one lands
  scroll: 500,   // list eases so the newest item sits in the lower third
};
export const EASE = 'cubic-bezier(0.1, 0.9, 0.2, 1)'; // Teams (Fluent) decelerate
export const CURSOR_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

export const motionOK = () => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** `?reveal=1` (keys / click) or `?reveal=auto&every=1400`; null when absent. */
export function urlReveal(search = window.location.search): { auto: number | null } | null {
  const q = new URLSearchParams(search);
  const r = q.get('reveal');
  if (!r || r === '0') return null;
  return { auto: r === 'auto' ? Number(q.get('every')) || 1400 : null };
}

/** One press: show an item, or (answer) play the tap on a question shown by the step before. */
export interface Step { item: Item; post: string; root: boolean; answer?: boolean }

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Items of the channel not on screen at the previous beat, oldest first; an answered question gets a second step. */
export function revealSteps(c: Channel, prev: Set<string>): Step[] {
  const fresh = c.posts
    .flatMap((p) => [p.root, ...p.replies].map((item) => ({ item, post: p.id, root: item === p.root })))
    .filter((s) => !prev.has(s.item.id))
    .sort((a, b) => cmp(a.item.ts, b.item.ts)); // stable: same-time items keep thread order
  return fresh.flatMap((s) => (s.item.kind === 'agent' && s.item.answeredLabel != null ? [s, { ...s, answer: true }] : [s]));
}

/** The channel after the first n steps: later items hidden, later answers still open. Posts by their first message's
 *  time, a stable order: a new post is appended at the bottom and nothing moves mid-recording (a move resets the scroll). */
export function applyReveal(c: Channel, steps: Step[], n: number): Channel {
  const later = steps.slice(n);
  const hidden = new Set(later.filter((s) => !s.answer).map((s) => s.item.id));
  const open = new Set(later.filter((s) => s.answer).map((s) => s.item.id));
  const show = (i: Item): Item => (open.has(i.id) ? { ...i, answeredLabel: null } as Item : i);
  const posts = c.posts.filter((p) => !hidden.has(p.root.id))
    .map((p) => ({ ...p, root: show(p.root), replies: p.replies.filter((r) => !hidden.has(r.id)).map(show) }))
    .sort((a, b) => cmp(a.root.ts, b.root.ts));
  return { ...c, posts };
}

/** First name of a human author who "types" before the step; none for emails and the Context layer. */
export const typist = (s: Step) =>
  !s.answer && s.item.kind === 'message' && !s.item.email ? s.item.author.split(' ')[0] : null;
