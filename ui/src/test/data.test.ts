import { describe, expect, it, vi } from "vitest";
import { ADD_NOT_CONNECTED, contextFromGraph, loadAssertions, sendChat, sourceFromEnv } from "../data";
import { createApiSource, NotAvailable } from "../data/apiSource";
import {
  adviceSentence,
  attachments,
  evaluate,
  isHunch,
  isLive,
  labelFor,
  trustInWords,
  withNetworkEdges,
} from "../data/derive";
import { createMockSource } from "../data/mockSource";
import type { Assertion, Graph } from "../data/types";

const mock = () => createMockSource({ delay: 0 });

describe("fixtures load through mockSource", () => {
  it("graph, assertions, threads and beats 1-6", async () => {
    const src = mock();
    const graph = await src.getGraph();
    expect(graph.nodes.filter((n) => n.kind === "node").length).toBeGreaterThanOrEqual(14);
    const all = await loadAssertions(src, graph);
    expect(all.map((a) => a.id)).toEqual(["CA-0001", "CA-0002", "CA-0003", "CA-0004", "CA-0005", "CA-0006", "CA-0007"]);
    expect((await src.getThread("thread-001")).items.filter((i) => i.type === "message")).toHaveLength(12);
    expect((await src.getThread("thread-002")).items.length).toBeGreaterThan(0);
    for (let n = 1; n <= 6; n++) expect((await src.getBeat!(n)).beat).toBe(n);
  });

  it("uses no ticket numbers anywhere", async () => {
    const src = mock();
    const text = JSON.stringify([await src.getGraph(), await src.getThread("thread-001"), await loadAssertions(src)]);
    expect(text).not.toMatch(/\b(INC|TKT|TICKET|CHG|REQ)[-# ]?\d+/i);
  });

  it("answer() decides the tip and releases the notification", async () => {
    const src = mock();
    await src.answer("CA-0001", 0);
    const t = await src.getThread("thread-001");
    const q = t.items.find((i) => i.type === "question");
    expect(q && q.type === "question" && q.answer?.label).toBe("All older units");
    expect(t.items.at(-1)?.type).toBe("notification");
  });
});

describe("derive.ts", () => {
  const graph: Graph = {
    nodes: [
      { id: "S1", label: "S1", kind: "site", attrs: { region: "north" } },
      { id: "N1", label: "N1", kind: "node", attrs: { site: "S1", model: "TX-200", install_year: 2018, firmware: "4.1" } },
      { id: "N2", label: "N2", kind: "node", attrs: { site: "S2", model: "TX-300", region: "south" } },
    ],
    edges: [],
  };

  it("builds network edges from attrs when the graph has none", () => {
    const g = withNetworkEdges(graph);
    const kinds = (k: string) => g.edges.filter((e) => e.kind === k).map((e) => `${e.from}>${e.to}`);
    expect(kinds("IN_SITE")).toEqual(["N1>S1", "N2>S2"]);
    expect(kinds("IN_REGION").sort()).toEqual(["S1>region:north", "S2>region:south"]);
    expect(kinds("OF_MODEL")).toEqual(["N1>model:TX-200", "N2>model:TX-300"]);
  });

  it("leaves the graph alone when the backend sends network edges (B1)", () => {
    const g = { ...graph, edges: [{ from: "N1", to: "S1", kind: "IN_SITE" }] };
    expect(withNetworkEdges(g)).toBe(g);
  });

  it("label templates (B2)", async () => {
    const all = await loadAssertions(mock());
    const by = (id: string) => all.find((a) => a.id === id)!;
    expect(labelFor(by("CA-0001"))).toBe("Bounce, don't reboot");
    expect(labelFor(by("CA-0003"))).toBe("Site access");
    expect(labelFor(by("CA-0005"))).toBe("Upgrade firmware to 5.0");
    expect(labelFor({ ...by("CA-0001"), label: "From backend" })).toBe("From backend");
  });

  it("live / superseded / hunch filters", async () => {
    const all = await loadAssertions(mock());
    const by = (id: string) => all.find((a) => a.id === id)!;
    const now = new Date("2026-11-07T12:00:00Z");
    expect(isLive(by("CA-0002"), now)).toBe(false);
    expect(isLive(by("CA-0003"), now)).toBe(true);
    expect(isLive({ ...by("CA-0004"), valid_to: "2026-11-01T00:00:00Z" }, now)).toBe(false);
    expect(isHunch(by("CA-0005"))).toBe(true);
    expect(trustInWords("hunch")).toMatch(/hunch/i);
  });

  it("evaluates predicates, firmware as a version tuple", () => {
    const n = withNetworkEdges(graph).nodes.find((x) => x.id === "N1")!;
    expect(evaluate("install_year <= 2019", n)).toBe(true);
    expect(evaluate("firmware >= '4.10'", n)).toBe(false);
    expect(evaluate("model == 'TX-200'", n)).toBe(true);
    expect(evaluate("peer.model == 'X'", n)).toBe(null);
  });

  it("attachments use CASE edges and bound scope", async () => {
    const src = mock();
    const g = await src.getGraph();
    const all = await loadAssertions(src, g);
    const by = (id: string) => all.find((a) => a.id === id)!;
    expect(attachments(by("CA-0001"), g).sort()).toEqual(["TRN-042", "TRN-087"]);
    expect(attachments(by("CA-0004"), g)).toEqual(["region:north"]);
    expect(adviceSentence(by("CA-0003"))).toBe("Key: in the site cabinet.");
  });
});

describe("degrading when backend extras are missing", () => {
  it("B3 fallback finds the barrier key for OULU-03 and not the superseded one", async () => {
    const tips = await contextFromGraph(mock(), "OULU-03");
    const ids = tips.map((a: Assertion) => a.id);
    expect(ids).toContain("CA-0003");
    expect(ids).not.toContain("CA-0002");
    expect(ids).not.toContain("CA-0005");
  });

  it("B4 fallback: ask uses the tips found, add says it isn't connected", async () => {
    const src = createMockSource({ delay: 0, withChat: false });
    const ask = await sendChat(src, "Anything about OULU-03?");
    expect(ask.reply).toContain("in the site cabinet");
    expect(ask.reply).toContain("replacing earlier info from 2 Oct");
    expect(ask.assertion_ids).toContain("CA-0003");
    const add = await sendChat(src, "The key moved, it's in the site cabinet now");
    expect(add.reply).toBe(ADD_NOT_CONNECTED);
  });
});

describe("apiSource", () => {
  function stub(routes: Record<string, unknown>) {
    return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const key = `${init?.method ?? "GET"} ${String(url)}`;
      if (!(key in routes)) return new Response("not found", { status: 404 });
      return new Response(JSON.stringify(routes[key]), { status: 200 });
    });
  }

  it("calls the backend endpoints", async () => {
    const f = stub({
      "GET http://api/graph": { nodes: [], edges: [] },
      "GET http://api/threads/thread-001": { thread_id: "thread-001", items: [] },
      "GET http://api/assertions": [{ id: "CA-0001" }, { id: "CA-0002" }],
      "POST http://api/incident": { results: [], agent_text: "ok" },
      "POST http://api/answer": {},
    });
    const src = createApiSource("http://api/", f as unknown as typeof fetch);
    expect(await src.getGraph()).toEqual({ nodes: [], edges: [] });
    expect((await src.getThread("thread-001")).thread_id).toBe("thread-001");
    expect((await src.getAssertion("CA-0002")).id).toBe("CA-0002");
    expect((await src.reportIncident({ entity_id: "TRN-087", event: "sfp_replaced", symptoms: [], at_time: "x" })).agent_text).toBe("ok");
    await src.answer("CA-0001", 0);
    const answerCall = f.mock.calls.find((c) => String(c[0]).endsWith("/answer"))!;
    expect(JSON.parse(String(answerCall[1]!.body))).toEqual({ assertion_id: "CA-0001", option_index: 0 });
  });

  it("missing optional endpoints throw NotAvailable and the helpers fall back", async () => {
    const graph = (await mock().getGraph()) as Graph;
    const all = await loadAssertions(mock());
    const f = stub({ "GET http://api/graph": graph, "GET http://api/assertions": all });
    const src = createApiSource("http://api", f as unknown as typeof fetch);
    await expect(src.getContextFor!("OULU-03")).rejects.toBeInstanceOf(NotAvailable);
    const r = await sendChat(src, "Anything about OULU-03?");
    expect(r.assertion_ids).toContain("CA-0003");
  });

  it("the env switch picks the source", () => {
    expect(sourceFromEnv({}).chat).toBeTypeOf("function"); // mock
    expect(sourceFromEnv({ VITE_DATA_SOURCE: "api", VITE_API_URL: "http://x" }).getContextFor).toBeTypeOf("function");
  });
});
