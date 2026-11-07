// Files that live only in the mock folder and are read in both modes: filler chats, hand-written reports, topology.
import type { Message, ReportThread, Thread, Topology } from './types';
import topology from './mock/topology.json';

interface RawThread {
  channel: string;
  date: string;
  entity_id?: string;
  messages: { seq: number; time: string; author: string; role: string; text: string }[];
}

const fillerFiles = import.meta.glob<RawThread>('./mock/filler/*.json', { eager: true, import: 'default' });
const reportFiles = import.meta.glob<RawThread>('./mock/reports/*.json', { eager: true, import: 'default' });

/** Raw fixture format (data/scenarios/NN/thread.json) to the out/ Thread shape. */
export function fromRaw(threadId: string, raw: RawThread): Thread {
  const messages: Message[] = raw.messages.map((m) => ({
    id: `${raw.channel}:${threadId}:${m.seq}`,
    author: m.author,
    role: /expert/i.test(m.role) ? 'expert' : 'field_engineer',
    timestamp: `${raw.date}T${m.time}:00+02:00`,
    channel: raw.channel,
    thread_id: threadId,
    text: m.text,
    incident: null,
  }));
  return { thread_id: threadId, channel: raw.channel, messages, questions: [], notifications: [], captured: [] };
}

const baseName = (p: string) => p.split('/').pop()!.replace('.json', '');

export const fillerThreads = (): Thread[] =>
  Object.entries(fillerFiles).map(([p, raw]) => fromRaw(`filler-${baseName(p)}`, raw));

export const reportThreads = (): ReportThread[] =>
  Object.entries(reportFiles).map(([p, raw]) => ({ ...fromRaw(`report-${baseName(p)}`, raw), entity_id: raw.entity_id! }));

export const topologyData = (): Topology => topology as Topology;
