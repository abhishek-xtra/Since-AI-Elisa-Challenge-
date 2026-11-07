import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { setSource } from "../data";
import { createMockSource } from "../data/mockSource";
import timeline from "../data/mock/video_timeline.json";
import { fold, layout, type TimelineEvent } from "../grow/timeline";

const events = timeline.events as unknown as TimelineEvent[];

beforeEach(() => setSource(createMockSource({ delay: 0 })));

describe("video timeline fold", () => {
  it("ends with every tip and its later state from the log", () => {
    const v = fold(events, events.length - 1);
    const tip = (id: string) => v.tips.find((t) => t.assertion_id === id)!;
    expect(v.tips).toHaveLength(events.filter((e) => e.kind === "capture" && e.how === "new").length);
    expect(tip("CA-0007").expired).toMatch(/^expired /);
    expect(tip("CA-0001").superseded_by).toBe("CA-0006");
    expect(tip("CA-0002").status).toBe("review");
    expect(tip("CA-0003").dispute_with).toContain("CA-0002");
    expect(v.messages).toHaveLength(events.filter((e) => e.kind === "message").length);
  });

  it("lays every tip on its own rows, children right of parents", () => {
    const { nodes } = layout(fold(events, events.length - 1).tips);
    const tips = nodes.filter((n) => n.kind === "tip");
    expect(new Set(tips.map((n) => n.y)).size).toBe(tips.length);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const n of nodes) if (n.parent) expect(byId.get(n.parent)!.x).toBeLessThan(n.x);
  });

  it("is empty before the first event", () => {
    expect(fold(events, -1).tips).toHaveLength(0);
  });
});

describe("grow page", () => {
  it("shows the agent's words verbatim at an incident and the footer note", async () => {
    const i = events.findIndex((e) => e.kind === "incident" && !!e.agent_text);
    window.history.pushState(null, "", `/grow?t=${i}&clean=1`);
    render(<App />);
    const inc = events[i] as Extract<TimelineEvent, { kind: "incident" }>;
    expect(await screen.findByText(inc.agent_text!)).toBeTruthy();
    expect(screen.getByText(timeline.note)).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Playback" })).toBeNull();
  });
});
