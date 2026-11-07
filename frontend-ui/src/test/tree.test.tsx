import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { setSource } from "../data";
import { createMockSource } from "../data/mockSource";
import timeline from "../data/mock/video_timeline.json";
import { fold, type TimelineEvent } from "../grow/timeline";
import { SUB, branchOf, caption, leafWords, place, tipWords } from "../tree/words";

const events = timeline.events as unknown as TimelineEvent[];

beforeEach(() => setSource(createMockSource({ delay: 0 })));

describe("tree label templates", () => {
  it("files every tip under exactly one known branch, by its fields", () => {
    const tips = fold(events, events.length - 1).tips;
    for (const t of tips) expect(SUB.map((b) => b.id)).toContain(branchOf(t));
    expect(branchOf({ trigger: { kind: "incident", event: "sfp_replaced", symptoms: [] }, action: "interface.bounce" })).toBe("sfp_replaced");
    expect(branchOf({ trigger: { kind: "incident", event: "alarm_raised", symptoms: [] }, action: "other" })).toBe("alarm_raised");
    expect(branchOf({ trigger: { kind: "incident", event: "other", symptoms: [] }, action: "other" })).toBe("fault_other");
    expect(branchOf({ trigger: { kind: "workflow", event: "dispatch_created", symptoms: [] }, action: "site.access_key" })).toBe("keys");
    expect(branchOf({ trigger: { kind: "workflow", event: "dispatch_created", symptoms: [] }, action: "other" })).toBe("route");
    expect(branchOf({ trigger: { kind: "workflow", event: "other", symptoms: [] }, action: "other" })).toBe("unsorted");
  });

  it("says scopes and tips in plain words", () => {
    expect(leafWords({ predicate: "install_year <= 2019", edge: "open" })).toBe("older units");
    expect(leafWords({ predicate: "install_year <= 2019", edge: "closed" })).toBe("built 2019 or earlier");
    expect(leafWords({ predicate: "model == 'TX-200'", edge: "closed" })).toBe("TX-200");
    expect(leafWords({ predicate: "firmware == '4.1'", edge: "closed" })).toBe("firmware 4.1");
    expect(leafWords({ predicate: "site == 'OULU-07'", edge: "closed" })).toBe("Oulu 07");
    expect(leafWords({ predicate: "region == 'north'", edge: "closed" })).toBe("the north");
    expect(place("HEL-02")).toBe("Helsinki 02");
    expect(tipWords({ action: "interface.bounce", action_text: "x", avoid: ["sfp.replace", "node.reboot"], said_by: "Erkki Expert" }))
      .toBe("Bounce the port, don't reboot · Erkki");
    expect(tipWords({ action: "site.access_key", action_text: "in the site cabinet", avoid: [], said_by: "Veikko Vikkelä" }))
      .toBe("Key in the site cabinet · Veikko");
  });

  it("captions the story beats from the log", () => {
    const at = (i: number) => {
      const v = fold(events, i);
      const tips = new Map(v.tips.map((t) => [t.assertion_id, t]));
      return caption(events[i], events, tips, new Set(tips.keys()));
    };
    const idx = (p: (e: TimelineEvent) => boolean) => events.findIndex(p);
    expect(at(idx((e) => e.kind === "capture" && e.how === "new_source"))).toBe("Same fix, said twice: one tip");
    expect(at(idx((e) => e.kind === "incident" && e.results.some((r) => !!r.question)))).toBe("Asked Erkki once");
    expect(at(idx((e) => e.kind === "incident" && e.entity === "TRN-105"))).toBe("Reused in Helsinki, nobody asked");
    expect(at(idx((e) => e.kind === "incident" && e.entity === "TRN-101" && e.results[0].outcome === "declined"))).toBe("Doesn't apply here: too new");
    for (let i = 0; i < events.length; i++) expect(at(i).split(" ").length).toBeLessThanOrEqual(8);
  });
});

describe("tree page", () => {
  it("shows the empty filing system at the start and nothing but the tree", async () => {
    window.history.pushState(null, "", "/tree?t=0&clean=1");
    render(<App />);
    expect(await screen.findByText("What the team knows")).toBeTruthy();
    for (const b of SUB) expect(screen.getByText(b.name)).toBeTruthy();
    expect(screen.queryByText(/Visualisation for the video/)).toBeNull();
  });
});
