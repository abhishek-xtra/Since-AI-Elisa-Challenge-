import { describe, expect, it } from "vitest";
import timeline from "../data/mock/video_timeline.json";
import { fold, type TimelineEvent } from "../grow/timeline";
import { link, placeAll } from "../tree/layout";
import { MOTION, motionMs } from "../tree/motion";

const events = timeline.events as unknown as TimelineEvent[];

describe("tree layout", () => {
  it("every link starts at its parent's centre and ends at its child's centre (final default layout)", () => {
    const last = events.length - 1;
    const { pos, leaves } = placeAll(fold(events, last).tips, last, events);
    const byId = new Map([...pos, ...leaves].map((p) => [p.id, p]));
    const nodes = [...pos, ...leaves].filter((p) => p.parent);
    expect(nodes.length).toBeGreaterThan(10);
    for (const n of nodes) {
      const parent = byId.get(n.parent!)!;
      const nums = link(parent, n).match(/-?\d+(\.\d+)?/g)!.map(Number);
      const [x0, y0] = nums;
      const [x1, y1] = nums.slice(-2);
      expect(Math.hypot(x0 - parent.x, y0 - parent.y)).toBeLessThan(0.5);
      expect(Math.hypot(x1 - n.x, y1 - n.y)).toBeLessThan(0.5);
    }
  });

  it("keeps every motion under a second except the pulse, and holds on a new tip for 2.5 s", () => {
    for (const [k, v] of Object.entries(MOTION)) if (!["pulse", "gap", "captureGap", "quoteHold"].includes(k)) expect(v).toBeLessThanOrEqual(1000);
    expect(MOTION.quoteIn + MOTION.quoteHold).toBeLessThanOrEqual(3000);
    const capture = events.find((e) => e.kind === "capture")!;
    expect(motionMs(capture) + MOTION.captureGap).toBeGreaterThanOrEqual(2500);
  });
});
