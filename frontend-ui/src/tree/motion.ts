// Every /tree timing in one place (ms). The CSS reads them as --m-* variables; playback reads them for step lengths.
import type { TimelineEvent } from "../grow/timeline";

export const MOTION = {
  camera: 420, // one decisive move when something happens, then hold
  cameraFinal: 600, // the last event: whole wheel in frame
  pop: 300, // a node appears with a small overshoot
  link: 300, // a link draws from parent to child
  leafStagger: 90, // leaves fan out one after another
  layout: 380, // nodes sliding to new places when the wheel changes
  fade: 300, // fades, dims, caption swaps
  quoteIn: 500, // the capture quote flies in
  quoteHold: 2200, // and leaves after this (in + hold stays under 3 s)
  pulse: 900, // centre to leaf
  gap: 700, // range play: pause between events (?gap= overrides)
  captureGap: 2500, // after a capture the camera holds on the new tip at least this long
} as const;

/** CSS custom properties for the stage element. */
export const motionVars = (): Record<string, string> =>
  Object.fromEntries(Object.entries(MOTION).map(([k, v]) => [`--m-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, `${v}ms`]));

/** How long an event's own motion runs before range play may move on (the gap comes on top). */
export function motionMs(e: TimelineEvent): number {
  switch (e.kind) {
    case "capture": return MOTION.pop + 4 * MOTION.leafStagger + MOTION.link;
    case "incident": return MOTION.pulse + MOTION.pop;
    case "message": return 0;
    default: return MOTION.pop;
  }
}
