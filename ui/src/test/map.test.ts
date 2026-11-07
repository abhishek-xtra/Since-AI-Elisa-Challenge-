import { describe, expect, it } from "vitest";
import { loadAssertions } from "../data";
import { createMockSource } from "../data/mockSource";
import { layout } from "../map/layout";
import { localView, regionView } from "../map/view";

const AT = new Date("2026-11-07T12:00:00Z");

async function fixtures() {
  const src = createMockSource({ delay: 0 });
  const graph = await src.getGraph();
  return { graph, assertions: await loadAssertions(src, graph) };
}

describe("context map, local view", () => {
  it("around TRN-087: live tips drawn, superseded never, hunch only with the toggle", async () => {
    const { graph, assertions } = await fixtures();
    const off = localView(graph, assertions, { focus: "TRN-087", showHunches: false, expanded: [], at: AT });
    const tipIds = off.tips.map((t) => t.id).sort();
    expect(tipIds).toEqual(["CA-0001", "CA-0004"]);
    expect(off.nodes.some((n) => n.id === "CA-0002")).toBe(false);

    const on = localView(graph, assertions, { focus: "TRN-087", showHunches: true, expanded: [], at: AT });
    expect(on.tips.map((t) => t.id)).toContain("CA-0005");
    expect(on.nodes.find((n) => n.id === "CA-0005")?.hunch).toBe(true);
  });

  it("badge counts match the fixtures", async () => {
    const { graph, assertions } = await fixtures();
    const v = localView(graph, assertions, { focus: "TRN-087", showHunches: false, expanded: [], at: AT });
    const badges = v.nodes.filter((n) => n.kind === "badge").map((n) => n.label);
    expect(badges).toEqual(["2 more sites nearby · 1 tip", "Southern Finland · 2 tips"]);
  });

  it("expanding a site badge brings its nodes and tips into view", async () => {
    const { graph, assertions } = await fixtures();
    const v = localView(graph, assertions, { focus: "TRN-087", showHunches: false, expanded: ["OULU-03", "OULU-07"], at: AT });
    expect(v.nodes.map((n) => n.id)).toEqual(expect.arrayContaining(["OULU-03", "TRN-031", "CA-0003"]));
    expect(v.nodes.some((n) => n.id === "CA-0002")).toBe(false);
  });

  it("the focus is pinned at the centre and the same data gives the same positions", async () => {
    const { graph, assertions } = await fixtures();
    const opts = { focus: "TRN-087", showHunches: false, expanded: [], at: AT };
    const a = layout(localView(graph, assertions, opts));
    const b = layout(localView(graph, assertions, opts));
    expect(a.get("TRN-087")).toEqual({ x: 0, y: 0 });
    expect([...a.entries()]).toEqual([...b.entries()]);
  });

  it("labels in plain words: only the focus and tip devices show IDs", async () => {
    const { graph, assertions } = await fixtures();
    const v = localView(graph, assertions, { focus: "TRN-087", showHunches: false, expanded: [], at: AT });
    const by = (id: string) => v.nodes.find((n) => n.id === id)!;
    expect(by("TRN-087").sublabel).toBe("TX-200 · installed 2018");
    expect(by("TRN-042").sublabel).toBe("Fixed here 1 Nov");
    expect(by("TRN-088").quiet).toBe(true);
    expect(by("OULU-11").label).toBe("Oulu north mast");
    expect(by("region:north").label).toBe("Northern Finland");
    expect(by("model:TX-200").label).toBe("TX-200 units");
  });

  it("TRN-101 (2023): Erkki's tip does not apply", async () => {
    const { graph, assertions } = await fixtures();
    const v = localView(graph, assertions, { focus: "TRN-101", showHunches: false, expanded: [], at: AT });
    expect(v.tips.map((t) => t.id)).not.toContain("CA-0001");
  });
});

describe("zoom out", () => {
  it("shows regions only, with live tip counts", async () => {
    const { graph, assertions } = await fixtures();
    const v = regionView(graph, assertions, { showHunches: false, at: AT });
    expect(v.nodes.map((n) => `${n.label}: ${n.badge?.text}`)).toEqual(["Northern Finland: 3 tips", "Southern Finland: 2 tips"]);
  });
});
