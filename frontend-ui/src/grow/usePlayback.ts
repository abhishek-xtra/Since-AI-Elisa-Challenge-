// Timeline loading and playback shared by /grow and /tree.
// ?t=N shows event N still. ?play=1 plays on; ?from=A&to=B&play=1 plays A..B and stops at B. Arrows step.
// Space plays/pauses on /grow; with spaceSteps (/tree) Space steps forward like the Teams clone.
import { useCallback, useEffect, useState } from "react";
import { getSource } from "../data";
import { useQuery } from "../router";
import { useAsync } from "../useAsync";
import { duration, type TimelineEvent } from "./timeline";

const num = (v: string | null) => (v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);

export function usePlayback(stepMs: (e: TimelineEvent) => number = duration, { spaceSteps = false } = {}) {
  const q = useQuery();
  // ?src=<name> loads out/video_timeline_<name>.json (a short-clip variant); only plain names reach the data layer
  const src = /^[a-z]+$/.test(q.get("src") ?? "") ? q.get("src")! : undefined;
  const [state] = useAsync(() => getSource().getVideoTimeline!(src), `video:${src ?? ""}`);
  const events = state.status === "ready" ? state.value.events : [];
  const from = num(q.get("from"));
  const to = num(q.get("to"));
  const [t, setT] = useState(from ?? num(q.get("t")) ?? 0);
  const [playing, setPlaying] = useState(q.get("play") === "1");
  const [speed, setSpeed] = useState(1);
  const last = events.length - 1;
  const stop = Math.min(to ?? last, last);
  const at = Math.max(0, Math.min(t, last));

  useEffect(() => {
    if (!playing || at >= stop || !events.length) return;
    const id = setTimeout(() => setT(at + 1), stepMs(events[at]) / speed);
    return () => clearTimeout(id);
  }, [playing, at, stop, speed, events, stepMs]);

  const next = useCallback(() => setT((x) => Math.min(x + 1, last)), [last]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (spaceSteps) next();
        else setPlaying((p) => !p);
      }
      if (e.code === "ArrowRight") next();
      if (e.code === "ArrowLeft") setT((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [last, next, spaceSteps]);

  return { state, events, at, last, setT, next, playing, setPlaying, speed, setSpeed, clean: q.get("clean") === "1", q };
}
