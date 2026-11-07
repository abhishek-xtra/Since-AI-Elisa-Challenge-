import type { Assertion, Beat, DataSource, Thread } from './types';
import { fillerThreads, reportThreads, topologyData } from './fixtures';

const outFiles = import.meta.glob('./mock/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const file = <T>(name: string): T => {
  const v = outFiles[`./mock/${name}`];
  if (v === undefined) throw new Error(`mock file ${name} not found`);
  return structuredClone(v) as T; // callers may mutate; the imported module stays pristine
};

/** Reads the byte-for-byte copy of out/. Answers are kept in memory; reportIncident has no backend to run. */
export function createMockSource(): DataSource {
  const threads = new Map<string, Thread>();
  const thread = (id: string) => {
    if (!threads.has(id)) threads.set(id, file<Thread>(`thread_${id}.json`));
    return threads.get(id)!;
  };
  return {
    getThread: async (id) => structuredClone(thread(id)),
    getBeat: async (n) => file<Beat>(`beat_${n}.json`),
    getAssertions: async () => file<Assertion[]>('assertions.json'),
    getTopology: async () => topologyData(),
    listFillerThreads: async () => fillerThreads(),
    listReportThreads: async () => reportThreads(),
    async reportIncident() {
      throw new Error('Report fault needs the backend: set VITE_DATA_SOURCE=api');
    },
    async answer(assertion_id, option_index) {
      for (const t of ['thread-001', ...threads.keys()]) {
        const qs = thread(t).questions.filter((q) => q.assertion_id === assertion_id);
        const q = qs[qs.length - 1]; // the API answers the latest question of that assertion
        if (!q) continue;
        if (q.answered) throw new Error(`409: no question pending for ${assertion_id}`);
        if (option_index < 0 || option_index >= q.options.length) throw new Error(`422: no option ${option_index}`);
        q.answered = true;
        return;
      }
      throw new Error(`404: unknown assertion ${assertion_id}`);
    },
  };
}
