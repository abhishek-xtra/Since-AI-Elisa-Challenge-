// Timeline loading and playback shared by /grow and /tree: ?t=N start, ?play=1 autoplay, Space plays, arrows step.
import { useEffect, useState } from "react";
import { getSource } from "../data";
import { useQuery } from "../router";
import { useAsync } from "../useAsync";
import { duration, type TimelineEvent } from "./timeline";

export function usePlayback(stepMs: (e: TimelineEvent) => number = duration) {
  const q = useQuery();
  const [state] = useAsync(() => getSource().getVideoTimeline!(), "video");
  const events = state.status === "ready" ? state.value.events : [];
  const start = Number(q.get("t") ?? 0);
  const [t, setT] = useState(Number.isFinite(start) ? start : 0);
  const [playing, setPlaying] = useState(q.get("play") === "1");
  const [speed, setSpeed] = useState(1);
  const last = events.length - 1;
  const at = Math.max(0, Math.min(t, last));

  useEffect(() => {
    if (!playing || at >= last || !events.length) return;
    const id = setTimeout(() => setT(at + 1), stepMs(events[at]) / speed);
    return () => clearTimeout(id);
  }, [playing, at, last, speed, events, stepMs]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.code === "ArrowRight") setT((x) => Math.min(x + 1, last));
      if (e.code === "ArrowLeft") setT((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [last]);

  return { state, events, at, last, setT, playing, setPlaying, speed, setSpeed, clean: q.get("clean") === "1", q };
}
