// Talks to the backend's api/app.py (BACKEND_PROMPT section 8). Same shapes as the out/ files.
import { adaptAssertion, adaptBeat, adaptGraph, adaptResult, adaptThread } from "./adapt";
import type { Assertion, Beat, ChatReply, ContextResult, DataSource, Graph, Thread } from "./types";

/** Thrown when an optional backend endpoint (B3, B4, beats) does not exist. */
export class NotAvailable extends Error {}

type FetchLike = typeof fetch;

export function createApiSource(baseUrl: string, fetchImpl: FetchLike = (...a) => fetch(...a)): DataSource {
  const base = baseUrl.replace(/\/+$/, "");

  async function call<T>(path: string, init?: RequestInit, url = `${base}${path}`): Promise<T> {
    const res = await fetchImpl(url, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
    if (res.status === 404 || res.status === 405 || res.status === 501) throw new NotAvailable(`${path}: ${res.status}`);
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  let assertionsCache: Promise<Assertion[]> | null = null;
  const allAssertions = () => (assertionsCache ??= call<Assertion[]>("/assertions").then((all) => all.map(adaptAssertion)).catch((e) => {
    assertionsCache = null;
    throw e;
  }));

  return {
    getGraph: () => call<Graph>("/graph").then(adaptGraph),
    getThread: (id) => call<Thread>(`/threads/${encodeURIComponent(id)}`).then(adaptThread),
    async getAssertion(id) {
      const found = (await allAssertions()).find((a) => a.id === id);
      if (!found) throw new Error(`No assertion ${id}`);
      return found;
    },
    async reportIncident(args) {
      const r = await call<{ results: ContextResult[]; agent_text: string }>("/incident", { method: "POST", body: JSON.stringify(args) });
      assertionsCache = null;
      return { ...r, results: r.results.map(adaptResult) };
    },
    async answer(assertion_id, option_index) {
      await call<unknown>("/answer", { method: "POST", body: JSON.stringify({ assertion_id, option_index }) });
      assertionsCache = null;
    },
    getContextFor: (entity_id) => call<Assertion[]>(`/context/${encodeURIComponent(entity_id)}`),
    async chat(text) {
      const reply = await call<ChatReply>("/chat", { method: "POST", body: JSON.stringify({ text }) });
      assertionsCache = null;
      return reply;
    },
    async getBeat(n) {
      try {
        return adaptBeat(await call<Beat>(`/beats/${n}`));
      } catch (e) {
        if (!(e instanceof NotAvailable)) throw e;
        // Fallback: the backend's out/beat_N.json copied into frontend-ui/public/out/.
        return adaptBeat(await call<Beat>(`/out/beat_${n}.json`, undefined, `/out/beat_${n}.json`));
      }
    },
  };
}
