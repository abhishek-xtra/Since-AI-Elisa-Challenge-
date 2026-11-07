import { describe, expect, it } from 'vitest';
import { createMockSource } from './data/mockSource';
import type { Beat, ContextResult, Notification, Question, Thread } from './data/types';
import { AGENT_NAME, buildChannels, itemsOf, notificationBeat, questionBeat, type Item, type ModelInput } from './model';
import questions from './data/mock/questions.json';
import notifications from './data/mock/notifications.json';

const src = createMockSource();
const THREADS = ['thread-001', 'email-001', 'email-12_barrier', 'thread-12b_barrier_update', 'thread-13_second_technician',
  'thread-14_road_closed', 'thread-15_retraction'];
const BEATS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

async function input(): Promise<ModelInput> {
  const beats: Record<number, Beat> = {};
  for (const n of BEATS) beats[n] = await src.getBeat(n);
  const threads: Record<string, Thread> = {};
  for (const id of THREADS) threads[id] = await src.getThread(id);
  return { beats, threads, fillers: await src.listFillerThreads(), reports: await src.listReportThreads(), live: [], answers: {} };
}

const channel = (inp: ModelInput, beat: number | null, id: string) => buildChannels(inp, beat).find((c) => c.id === id)!;
const agents = (items: Item[], kind: string) => items.filter((i): i is Extract<Item, { kind: 'agent' }> => i.kind === 'agent' && i.agent === kind);

describe('replay filters', () => {
  it('maps questions to beats by entity_id and notifications by at', () => {
    expect((questions as Question[]).map(questionBeat)).toEqual([3, 4]);
    expect((notifications as Notification[]).map(notificationBeat)).toEqual([3, 5, 5, 7, 8]);
  });

  it('beat 1: only the TRN-087 fault with the no-context line, plus the filler chats', async () => {
    const inp = await input();
    const chans = buildChannels(inp, 1);
    expect(channel(inp, 1, 'experts').posts).toHaveLength(0);
    expect(channel(inp, 1, 'site-access').posts).toHaveLength(0);
    const faults = itemsOf(channel(inp, 1, 'faults'));
    expect(agents(faults, 'proposal').map((i) => i.text)).toEqual([inp.beats[1].data.agent_text]);
    expect(faults.some((i) => i.kind === 'message' && i.text === 'Counters moving. Thanks.')).toBe(false);
    expect(chans.find((c) => c.id === 'field-chat')!.posts).toHaveLength(7);
  });

  it('beat 2: thread-001 with the capture line under message 8, no questions or notices', async () => {
    const inp = await input();
    const items = itemsOf(channel(inp, 2, 'experts'));
    expect(items.filter((i) => i.kind === 'message' && i.captured).map((i) => i.id)).toEqual(['teams:thread-001:8']);
    expect(items.filter((i) => i.kind === 'agent')).toHaveLength(0);
    expect(channel(inp, 2, 'faults').posts).toHaveLength(0);
  });

  it('beat 3: question 0 answered with option 0, one notice, TRN-087 status then proposal', async () => {
    const inp = await input();
    const items = itemsOf(channel(inp, 3, 'experts'));
    const qs = agents(items, 'question');
    expect(qs.map((q) => [q.text, q.answeredLabel])).toEqual([[inp.beats[3].data.question!.text, 'All older units']]);
    expect(agents(items, 'notice').map((n) => n.text)).toEqual(['Your tip from 2026-11-01 was proposed for TRN-087 today.']);
    const fault = channel(inp, 3, 'faults').posts[0];
    expect(fault.replies.map((r) => r.kind === 'agent' ? r.agent : r.kind)).toEqual(['status', 'proposal', 'message']);
    expect(fault.replies[0].text).toContain(inp.beats[3].data.results_before![0].reason);
  });

  it('beat 4: edge question answered No and the decline reason; beat 7 adds the TRN-105 notice and proposal', async () => {
    const inp = await input();
    expect(agents(itemsOf(channel(inp, 4, 'experts')), 'question').map((q) => q.answeredLabel)).toEqual(['All older units', 'No']);
    const trn101 = channel(inp, 4, 'faults').posts[1];
    expect(trn101.replies.some((r) => r.kind === 'status' && r.text.includes(inp.beats[4].data.results![0].reason))).toBe(true);
    expect(agents(trn101.replies, 'proposal')).toHaveLength(0);

    expect(agents(itemsOf(channel(inp, 7, 'experts')), 'notice')).toHaveLength(2);
    const sami = channel(inp, 7, 'faults').posts[2];
    expect(sami.replies.map((r) => r.ts)).toEqual(['2026-11-08T14:00:00+02:00', '2026-11-08T14:03:00+02:00']);
    expect(sami.replies[0].text).toBe(inp.beats[7].data.agent_text);
    expect(channel(inp, 6, 'faults').posts).toHaveLength(2);
  });

  it('beats 5 and 6: the dispatch shows the key location; beat 6 strikes the old fact through', async () => {
    const inp = await input();
    const d5 = channel(inp, 5, 'site-access');
    expect(agents(itemsOf(d5), 'proposal').map((p) => p.text)).toEqual(['at the neighbouring farm, ask for Mäkelä']);
    expect(agents(itemsOf(d5), 'notice').map((n) => n.to)).toEqual(['Kalle Niskanen']);
    const d6 = itemsOf(channel(inp, 6, 'site-access'));
    expect(agents(d6, 'proposal').map((p) => p.text)).toEqual(['in the site cabinet']);
    const struck = d6.find((i) => i.kind === 'status' && i.struck);
    expect(struck && struck.kind === 'status' && struck.struck).toEqual({ text: 'at the neighbouring farm, ask for Mäkelä', until: '2026-11-07T10:15:00+02:00' });
  });
});

describe('beats 8 and 9', () => {
  it('beat 8: road-closed thread captured, OULU-11 dispatch proposed on 15 Nov and declined as expired on 21 Nov', async () => {
    const inp = await input();
    expect(channel(inp, 7, 'site-access').posts).toHaveLength(3);
    const site = channel(inp, 8, 'site-access');
    const items = itemsOf(site);
    expect(items.filter((i) => i.kind === 'message' && i.captured).map((i) => i.id)).toContain('teams:thread-14_road_closed:1');
    expect(agents(items, 'notice').map((n) => n.text)).toContain('Your tip from 2026-11-09 was proposed for OULU-11 today.');
    const [d15, d21] = site.posts.filter((p) => p.entity === 'OULU-11');
    expect(d15.root.ts).toBe('2026-11-15T08:00:00+02:00');
    expect(agents(d15.replies, 'proposal').map((p) => p.text)).toEqual(['use the forest track from the north side']);
    expect(d15.replies.filter((r) => r.kind === 'status')).toHaveLength(0); // unrelated CA-0002/CA-0003 declines are not this beat's story
    expect(d21.root.ts).toBe('2026-11-21T08:00:00+02:00');
    expect(agents(d21.replies, 'proposal')).toHaveLength(0);
    const status = d21.replies.filter((r) => r.kind === 'status');
    expect(status.map((s) => s.kind === 'status' && [s.reason, s.struck])).toEqual([
      ['expired 2026-11-20', { text: 'use the forest track from the north side', until: '2026-11-20T23:59:59+02:00' }],
    ]);
  });

  it('beat 9: retraction thread in Experts with the under-review line, and a declined TRN-087 post on 11 Nov', async () => {
    const inp = await input();
    expect(itemsOf(channel(inp, 8, 'experts')).some((i) => i.id.startsWith('teams:thread-15'))).toBe(false);
    const experts = channel(inp, 9, 'experts');
    const retraction = experts.posts.find((p) => p.root.id === 'teams:thread-15_retraction:1')!;
    expect(retraction.root.kind === 'message' && retraction.root.note).toBe("Erkki's tip does not apply: under review.");
    const faults = channel(inp, 9, 'faults');
    const last = faults.posts.at(-1)!;
    expect([last.entity, last.root.ts]).toEqual(['TRN-087', '2026-11-11T10:00:00+02:00']);
    expect(last.replies.map((r) => r.kind === 'status' && [r.outcome, r.reason])).toEqual([['declined', 'under review']]);
    // question 0 stays at its own incident, not the later one
    expect(agents(itemsOf(experts), 'question')[0].ts).toBe('2026-11-07T10:00:00+02:00');
    expect(agents(itemsOf(experts), 'notice')).toHaveLength(2);
  });
});

describe('the agent posts only three message kinds, all backend strings', () => {
  it('holds for every beat and for live mode', async () => {
    const inp = await input();
    const backend = new Set<string>();
    for (const b of Object.values(inp.beats)) {
      if (b.data.agent_text) backend.add(b.data.agent_text);
      const after = (b.data.results_after ?? []) as ContextResult[];
      for (const r of [...(b.data.results ?? []), ...(b.data.results_before ?? []), ...after]) backend.add(r.assertion.action_text);
    }
    for (const q of questions as Question[]) backend.add(q.text);
    for (const n of notifications as Notification[]) backend.add(n.text);

    for (const beat of [...BEATS, null]) {
      for (const item of buildChannels(inp, beat).flatMap(itemsOf)) {
        if (item.kind === 'message') expect(item.author).not.toBe(AGENT_NAME);
        if (item.kind !== 'agent') continue;
        expect(['proposal', 'question', 'notice']).toContain(item.agent);
        expect(backend.has(item.text)).toBe(true);
        if (item.question) for (const o of item.question.options) expect((questions as Question[]).some((q) => q.options.some((x) => x.label === o.label))).toBe(true);
      }
    }
  });
});

describe('mock source answer()', () => {
  it('rejects an already answered question like the API (409)', async () => {
    await expect(createMockSource().answer('CA-0001', 0)).rejects.toThrow('409');
  });
});
