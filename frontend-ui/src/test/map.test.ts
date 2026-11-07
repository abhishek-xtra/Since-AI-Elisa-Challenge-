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
    expect(badges).toEqual(["2 more sites nearby · 1 tip", "Uusimaa, Lapland · 2 tips"]);
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
    expect(by("TRN-088")).toMatchObject({ quiet: true, label: "TX-250 · 2018" });
    expect(by("OULU-11").label).toBe("Oulu north mast");
    expect(by("region:north_ostrobothnia").label).toBe("North Ostrobothnia");
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
    expect(v.nodes.map((n) => `${n.label}: ${n.badge?.text}`)).toEqual(["Lapland: 1 tip", "North Ostrobothnia: 3 tips", "Uusimaa: 2 tips"]);
  });
});

describe("Finland map", () => {
  it("shows regions with live tip counts, and no individual tips", async () => {
    const { finlandRegions } = await import("../map/geo");
    const { graph, assertions } = await fixtures();
    const regions = finlandRegions(graph, assertions, { showHunches: false, at: AT });
    expect(regions.map((r) => `${r.name}: ${r.tips}`)).toEqual(["Lapland: 1", "North Ostrobothnia: 3", "Uusimaa: 2"]);
  });

  it("a tip bound to two regions counts in both", async () => {
    const { finlandRegions } = await import("../map/geo");
    const { graph, assertions } = await fixtures();
    const tips = (key: string) => finlandRegions(graph, assertions, { showHunches: false, at: AT }).find((r) => r.key === key)!.tips;
    // The winter power-cut tip ("up north") touches Lapland and North Ostrobothnia.
    expect(tips("lapland")).toBe(1);
    expect(tips("north_ostrobothnia")).toBe(3);
  });

  it("knows every region by key, English or Finnish name, and splits Finland into 18 cells", async () => {
    const { findRegion, regionCells, REGIONS } = await import("../map/regions");
    expect(findRegion("region:north_ostrobothnia")?.name).toBe("North Ostrobothnia");
    expect(findRegion("Pohjois-Pohjanmaa")?.key).toBe("north_ostrobothnia");
    expect(findRegion("Päijät-Häme")?.key).toBe("paijat_hame");
    // The demo backend's fixed values: "north" lights North Ostrobothnia, "south" Uusimaa.
    expect(findRegion("north")?.key).toBe("north_ostrobothnia");
    expect(findRegion("region:south")?.key).toBe("uusimaa");
    expect(findRegion("east")?.name).toBe("Eastern Finland"); // older broad values still read well
    expect(findRegion("atlantis")).toBeUndefined();
    const cells = regionCells();
    expect(cells.size).toBe(REGIONS.length);
    for (const poly of cells.values()) expect(poly.length).toBeGreaterThan(2);
  });

  it("projects Finland the right way up", async () => {
    const { fitFinland, TOWNS } = await import("../map/finland");
    const at = fitFinland(800, 600);
    const town = (n: string) => at(TOWNS.find((t) => t.name === n)!.at);
    expect(town("Oulu").y).toBeLessThan(town("Helsinki").y);
  });
});

describe("clean wires", () => {
  const views: [string, string[]][] = [
    ["TRN-087", []],
    ["TRN-087", ["OULU-03", "OULU-07"]],
    ["OULU-03", []],
    ["TRN-101", []],
    ["region:north_ostrobothnia", []],
    ["region:lapland", []],
  ];
  it.each(views)("around %s (expanded: %j): no wires cross, none run through text", async (focus, expanded) => {
    const { countCrossings, wiresThroughLabels } = await import("../map/layout");
    const { graph, assertions } = await fixtures();
    // The page lays out with hunches included, then hides them; check that picture.
    const v = localView(graph, assertions, { focus, showHunches: true, expanded, at: AT });
    const pos = layout(v);
    expect(countCrossings(v.edges, pos)).toBe(0);
    expect(wiresThroughLabels(v, pos)).toBe(0);
  });
});

describe("zoom maths", () => {
  it("fits a box inside the viewport and zooms around a fixed point", async () => {
    const { fitView, zoomAround } = await import("../map/usePanZoom");
    const v = fitView({ minX: -300, minY: -200, width: 600, height: 400 }, { width: 1000, height: 800 });
    // The box's centre (0, 0 in world terms) lands in the middle of the usable area.
    expect(v.x).toBeCloseTo(500);
    expect(v.k).toBeLessThanOrEqual(1.1);
    const z = zoomAround(v, 2, 300, 300);
    // The point under the pointer stays put.
    expect((300 - v.x) / v.k).toBeCloseTo((300 - z.x) / z.k);
    expect(zoomAround(v, 100, 0, 0).k).toBe(3);
  });
});
