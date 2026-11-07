// The adapter against byte-for-byte copies of the backend's real out/ files (src/data/mock/real-out/).
import { describe, expect, it } from "vitest";
import { adaptBeat, adaptGraph, adaptThread, beatFocus, beatState, loadBeats, threadAtBeat } from "../data/adapt";
import { createApiSource } from "../data/apiSource";
import realGraph from "../data/mock/real-out/graph.json";
import realThread from "../data/mock/real-out/thread_thread-001.json";
import mockBeat3 from "../data/mock/beats/beat_3.json";
import type { Beat, Graph } from "../data/types";
import { finlandRegions } from "../map/geo";
import { localView, regionView } from "../map/view";

const files = import.meta.glob<Record<string, unknown>>("../data/mock/real-out/beat_*.json", { eager: true, import: "default" });
const raw = (n: number) => files[`../data/mock/real-out/beat_${n}.json`];
const beats: Beat[] = [1, 2, 3, 4, 5, 6, 7].map((n) => adaptBeat(raw(n)));
const graph = adaptGraph(realGraph as Graph);
const ids = (b: Beat) => b.assertions.map((a) => a.id).sort();

describe("adaptBeat on the real beat files", () => {
  it("finds each beat's entity, tips and thread", () => {
    expect(beats.map((b) => b.incident?.entity_id)).toEqual(["TRN-087", undefined, "TRN-087", "TRN-101", "OULU-03", "OULU-03", "TRN-105"]);
    expect(beats.map(beatFocus)).toEqual(["TRN-087", "TRN-042", "TRN-087", "TRN-101", "OULU-03", "OULU-03", "TRN-105"]);
    expect(beats.map(ids)).toEqual([[], ["CA-0001"], ["CA-0001"], ["CA-0001"], ["CA-0002"], ["CA-0002", "CA-0003"], ["CA-0001"]]);
    expect(beats.map((b) => b.thread_id)).toEqual([
      undefined,
      "thread-001",
      "thread-001",
      "thread-001",
      "email-12_barrier",
      "thread-12b_barrier_update",
      "thread-001",
    ]);
  });

  it("flattens decided to its predicate and keeps results, agent text and notifications", () => {
    expect(beats[1].assertions[0].applies_to.decided).toBeNull();
    expect(beats[2].assertions[0].applies_to.decided).toBe("install_year <= 2019");
    expect(beats[2].results?.[0].outcome).toBe("proposed");
    expect(beats[2].agent_text).toMatch(/Disable the interface/);
    expect(beats[3].results?.[0].reason).toBe("install_year 2023 fails install_year <= 2019");
    expect(beats[6].notifications?.[0].entity_id).toBe("TRN-105");
    expect(beats[6].incident?.at_time).toBe("2026-11-08T14:00:00+02:00");
    expect(beats[0].agent_text).toMatch(/nothing to add/);
  });

  it("leaves a mock beat as it is", () => {
    expect(adaptBeat(mockBeat3)).toBe(mockBeat3);
  });
});

describe("beat state grows over time", () => {
  it("is cumulative, and the replaced tip is marked stale", () => {
    expect(beatState(beats, 6)!.assertions.map((a) => a.id).sort()).toEqual(["CA-0001", "CA-0002", "CA-0003"]);
    expect(beatState(beats, 9)).toBeNull();
    const s = beatState(beats, 6)!;
    const v = localView(graph, s.assertions, { focus: "OULU-03", showHunches: false, expanded: [], at: s.at, keepStale: true });
    expect(v.nodes.find((n) => n.id === "CA-0002")?.stale).toBe("Replaced");
    expect(v.nodes.find((n) => n.id === "CA-0003")?.stale).toBeUndefined();
  });

  it("draws candidate scope edges at capture and drops them once decided", () => {
    const at2 = beatState(beats, 2)!;
    const v2 = localView(graph, at2.assertions, { focus: "TRN-042", showHunches: false, expanded: [], at: at2.at, keepStale: true });
    expect(v2.edges.filter((e) => e.kind === "scope").map((e) => e.to).sort()).toEqual(["OULU-07", "model:TX-200", "region:north"]);
    const at3 = beatState(beats, 3)!;
    const v3 = localView(graph, at3.assertions, { focus: "TRN-042", showHunches: false, expanded: [], at: at3.at, keepStale: true });
    expect(v3.edges.filter((e) => e.kind === "scope")).toEqual([]);
    expect(v3.edges.filter((e) => e.kind === "tip").map((e) => e.to)).toEqual(["TRN-042"]);
  });

  it("region counts grow beat by beat, and north / south land on real regions", () => {
    const north = (n: number) => {
      const s = beatState(beats, n)!;
      return regionView(graph, s.assertions, { showHunches: false, at: s.at }).nodes.find((r) => r.id === "region:north")?.badge?.tips;
    };
    expect([1, 2, 5, 6, 7].map(north)).toEqual([0, 1, 2, 2, 2]);
    const marks = finlandRegions(graph, [], { showHunches: false, at: new Date() });
    expect(marks.map((m) => [m.id, m.key, m.name])).toEqual([
      ["region:north", "north_ostrobothnia", "North Ostrobothnia"],
      ["region:south", "uusimaa", "Uusimaa"],
    ]);
  });
});

describe("adaptThread and replay on the real thread-001", () => {
  const thread = adaptThread(realThread);
  const kinds = (n: number) => threadAtBeat(thread, beats, n).items.filter((i) => i.type !== "message");

  it("turns messages, questions and notifications into items, with the capture line's message", () => {
    expect(thread.items.filter((i) => i.type === "message")).toHaveLength(12);
    expect(thread.items.filter((i) => i.type !== "message").map((i) => i.type)).toEqual(["question", "notification", "question", "notification"]);
    expect(thread.captured).toEqual([{ message_id: "teams:thread-001:8", assertion_id: "CA-0001" }]);
  });

  it("shows each question and notice only from its beat, with the recorded answer afterwards", () => {
    expect(kinds(2)).toEqual([]);
    expect(kinds(3).map((i) => [i.type, i.beat, i.type === "question" ? i.answer : undefined])).toEqual([
      ["question", 3, null],
      ["notification", 3, undefined],
    ]);
    const at4 = kinds(4);
    expect(at4.map((i) => i.type)).toEqual(["question", "notification", "question"]);
    expect(at4[0].type === "question" && at4[0].answer?.label).toBe("All older units");
    expect(kinds(7).map((i) => i.type)).toEqual(["question", "notification", "question", "notification"]);
  });
});

describe("apiSource on the real files", () => {
  it("adapts every beat and reads beats until the first missing one", async () => {
    const fetchImpl = (async (url: string) => {
      const m = /beat_?s?\/?(\d+)/.exec(url);
      const body = m && raw(Number(m[1]));
      return new Response(body ? JSON.stringify(body) : "", { status: body ? 200 : 404 });
    }) as typeof fetch;
    const got = await loadBeats(createApiSource("http://x", fetchImpl));
    expect(got.map((b) => b.beat)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(got[6].incident?.entity_id).toBe("TRN-105");
  });
});
