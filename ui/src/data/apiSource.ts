import type { DataSource } from './types';
import { fillerThreads, reportThreads, topologyData } from './fixtures';

/** Calls the backend routes of docs/TEAMS_CLONE_HANDOFF.md 2.5. Filler chats, reports and topology stay local. */
export function createApiSource(base: string): DataSource {
  const call = async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await fetch(base + path, body === undefined ? undefined : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  };
  return {
    getThread: (id) => call(`/threads/${encodeURIComponent(id)}`),
    getBeat: (n) => call(`/beats/${n}`),
    getAssertions: () => call('/assertions'),
    getTopology: async () => topologyData(),
    listFillerThreads: async () => fillerThreads(),
    listReportThreads: async () => reportThreads(),
    reportIncident: (body) => call('/incident', body),
    answer: async (assertion_id, option_index) => {
      await call('/answer', { assertion_id, option_index });
    },
  };
}
