import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { createMockSource } from './data/mockSource';
import { buildChannels, itemsOf, type ModelInput } from './model';
import { applyReveal, revealSteps, urlReveal } from './reveal';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function input(): Promise<ModelInput> {
  const s = createMockSource();
  const beats = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => s.getBeat(n)));
  const ids = ['thread-001', 'email-001', 'email-12_barrier', 'thread-12b_barrier_update', 'thread-13_second_technician', 'thread-14_road_closed', 'thread-15_retraction'];
  const threads = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await s.getThread(id)] as const)));
  return { beats: Object.fromEntries(beats.map((b) => [b.beat, b])), threads, fillers: await s.listFillerThreads(), reports: await s.listReportThreads(), live: [], answers: {} };
}
const stepsAt = (inp: ModelInput, beat: number, channel: string) => {
  const prev = new Set(buildChannels(inp, beat - 1).flatMap(itemsOf).map((i) => i.id));
  const c = buildChannels(inp, beat).find((x) => x.id === channel)!;
  return { c, steps: revealSteps(c, prev) };
};

describe('reveal order', () => {
  it('beat 2 experts: Elisa\'s 12 messages one by one, oldest first, from an empty channel', async () => {
    const inp = await input();
    const { c, steps } = stepsAt(inp, 2, 'experts');
    const elisa = inp.threads['thread-001'].messages;
    expect(elisa).toHaveLength(12);
    expect(steps.slice(0, 12).map((s) => s.item.id)).toEqual(elisa.map((m) => m.id));
    expect(steps.map((s) => s.item.ts)).toEqual([...steps.map((s) => s.item.ts)].sort());
    expect(applyReveal(c, steps, 0).posts).toHaveLength(0);
    // Erkki's 10:00 email comes after the chat's last message (09:27) and is appended below the chat as its own post
    const email = inp.threads['email-001'].messages[0];
    expect(steps.at(-1)!.item.id).toBe(email.id);
    expect(applyReveal(c, steps, steps.length).posts.map((p) => p.root.id)).toEqual([elisa[0].id, email.id]);
    expect(applyReveal(c, steps, 12).posts.map((p) => p.root.id)).toEqual([elisa[0].id]);
  });

  it('beat 3 experts: posts stay in first-message order while the question lands in the chat thread', async () => {
    const inp = await input();
    const { c, steps } = stepsAt(inp, 3, 'experts');
    const order = (n: number) => applyReveal(c, steps, n).posts.map((p) => p.root.id);
    expect(order(0)).toEqual(order(steps.length));
    expect(order(0)[0]).toBe(inp.threads['thread-001'].messages[0].id);
  });

  it('beat 3 experts: the question, then its answer as a separate step, then the notice; beat-2 items stay', async () => {
    const inp = await input();
    const { c, steps } = stepsAt(inp, 3, 'experts');
    expect(steps.map((s) => [s.item.kind === 'agent' && s.item.agent, !!s.answer])).toEqual([['question', false], ['question', true], ['notice', false]]);
    const open = applyReveal(c, steps, 1);
    const q = itemsOf(open).find((i) => i.id === steps[0].item.id)!;
    expect(q.kind === 'agent' && q.answeredLabel).toBe(null);
    expect(itemsOf(open).length).toBe(itemsOf(c).length - 1);
  });

  it('urlReveal reads ?reveal=1 and ?reveal=auto&every=N', () => {
    expect(urlReveal('?beat=3')).toBeNull();
    expect(urlReveal('?beat=3&reveal=1')).toEqual({ auto: null });
    expect(urlReveal('?reveal=auto&every=1200')).toEqual({ auto: 1200 });
  });
});

// multi-line message text, matched on the rendered paragraph
const text = (t: string) => (_: string, el: Element | null) => !!el?.classList.contains('msg-text') && el.textContent === t;

describe('reveal keys', () => {
  it('Right and Space reveal the next message, Left hides the last (reduced motion: instant)', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const source = createMockSource();
    const [m1, m2] = (await source.getThread('thread-001')).messages.map((m) => text(m.text));
    render(<App source={source} beat={2} reveal={{ auto: null }} />);
    expect(await screen.findByText('No posts yet.')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(await screen.findByText(m1)).toBeTruthy();
    fireEvent.keyDown(window, { key: ' ' });
    expect(await screen.findByText(m2)).toBeTruthy();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    await act(async () => {});
    expect(screen.queryByText(m2)).toBeNull();
    expect(screen.getByText(m1)).toBeTruthy();
  });

  it('a human message is preceded by "<First name> is typing"', async () => {
    const source = createMockSource();
    const [m] = (await source.getThread('thread-001')).messages, m1 = text(m.text);
    render(<App source={source} beat={2} reveal={{ auto: null }} />);
    await screen.findByText('No posts yet.');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(await screen.findByText(`${m.author.split(' ')[0]} is typing`)).toBeTruthy();
    expect(screen.queryByText(m1)).toBeNull();
    expect(await screen.findByText(m1, {}, { timeout: 2000 })).toBeTruthy();
    expect(screen.queryByText(/is typing/)).toBeNull();
  });
});
