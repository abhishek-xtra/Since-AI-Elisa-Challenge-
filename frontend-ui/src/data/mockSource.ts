// Hand-written stand-ins for the backend's out/ files. Never shown in the final video.
import assertionsJson from "./mock/assertions.json";
import graphJson from "./mock/graph.json";
import notificationsJson from "./mock/notifications.json";
import type { VideoTimeline } from "../grow/timeline";
import type { Assertion, Beat, ChatReply, DataSource, Graph, Thread, ThreadItem } from "./types";

const threadFiles = import.meta.glob<Thread>("./mock/threads/*.json", { eager: true, import: "default" });
const beatFiles = import.meta.glob<Beat>("./mock/beats/*.json", { eager: true, import: "default" });
const videoFiles = import.meta.glob("./mock/video_timeline*.json", { eager: true, import: "default" });

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface MockOptions {
  delay?: number;
  /** Leave out the optional chat() to exercise the fallback (addendum B4 missing). */
  withChat?: boolean;
  /** Leave out the optional getContextFor() (addendum B3 missing). */
  withContextFor?: boolean;
}

export const BARRIER_REPLY =
  "Locked barrier on the private road. Key: in the site cabinet. Updated 7 Nov, replacing an email from 2 Oct.";
export const KEY_ADDED_REPLY = "Got it. Added to OULU-03. The earlier info is kept with the date it stopped being true.";

export function createMockSource({ delay = 150, withChat = true, withContextFor = false }: MockOptions = {}): DataSource {
  const assertions = new Map<string, Assertion>((clone(assertionsJson) as Assertion[]).map((a) => [a.id, a]));
  const graph = clone(graphJson) as Graph;
  const threads = new Map<string, Thread>();
  for (const t of Object.values(threadFiles)) threads.set(t.thread_id, clone(t));
  const pending = clone(notificationsJson) as { thread_id: string; item: ThreadItem }[];
  const beats = new Map<number, Beat>();
  for (const b of Object.values(beatFiles)) beats.set(b.beat, b);

  const wait = () => (delay > 0 ? sleep(delay) : Promise.resolve());

  const source: DataSource = {
    async getGraph() {
      await wait();
      return clone(graph);
    },
    async getThread(id) {
      await wait();
      const t = threads.get(id);
      if (!t) throw new Error(`No thread ${id}`);
      return clone(t);
    },
    async getAssertion(id) {
      await wait();
      const a = assertions.get(id);
      if (!a) throw new Error(`No assertion ${id}`);
      return clone(a);
    },
    async reportIncident(args) {
      await wait();
      // The mock replays the matching beat; the real decision is the backend's get_context.
      const beat = [...beats.values()].find((b) => b.incident?.entity_id === args.entity_id && b.incident.event === args.event);
      return { results: clone(beat?.results ?? []), agent_text: beat?.agent_text ?? "No context found." };
    },
    async answer(assertion_id, option_index) {
      await wait();
      for (const t of threads.values()) {
        for (const item of t.items) {
          if (item.type === "question" && item.assertion_id === assertion_id && !item.answer) {
            const opt = item.options[option_index];
            if (!opt) throw new Error(`No option ${option_index}`);
            item.answer = { option_index, label: opt.label };
            const a = assertions.get(assertion_id);
            if (a) {
              a.applies_to.decided = opt.sets_decided;
              a.status = "decided";
              a.question_asked = true;
            }
            for (const p of pending.filter((p) => p.thread_id === t.thread_id)) t.items.push(p.item);
          }
        }
      }
    },
    async getBeat(n) {
      await wait();
      const b = beats.get(n);
      if (!b) throw new Error(`No beat ${n}`);
      return clone(b);
    },
    // Byte-for-byte copy of the backend's out/video_timeline.json: the real events, not hand-written.
    async getVideoTimeline(name) {
      await wait();
      const file = videoFiles[`./mock/video_timeline${name ? `_${name}` : ""}.json`];
      if (!file) throw new Error(`No video timeline ${name}`);
      return clone(file) as VideoTimeline;
    },
  };

  if (withChat) {
    source.chat = async (text): Promise<ChatReply> => {
      await wait();
      const t = text.toLowerCase();
      if (/oulu-?03/.test(t) && t.includes("?")) return { kind: "ask", reply: BARRIER_REPLY, assertion_ids: ["CA-0003"] };
      if (/key/.test(t) && /(moved|cabinet)/.test(t)) return { kind: "add", reply: KEY_ADDED_REPLY, assertion_ids: ["CA-0003"] };
      return {
        kind: "ask",
        reply: "Nothing saved about that yet. Name a device or site, for example TRN-087 or OULU-03.",
        assertion_ids: [],
      };
    };
  }

  if (withContextFor) {
    source.getContextFor = async (entity_id) => {
      const { contextFromGraph } = await import("./index");
      return contextFromGraph(source, entity_id);
    };
  }

  return source;
}
