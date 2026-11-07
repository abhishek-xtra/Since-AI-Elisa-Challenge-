import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../motion";
import { navigate, useQuery, withQuery } from "../router";

/** Time per beat while playing; slower under reduced motion, where each change lands without animation. */
export const PLAY_MS = 1500;

interface Props {
  title?: string;
  /** The beats that exist (read from the source until one is missing), so the count is never hardcoded. */
  beats: { beat: number; title: string }[];
  /** On the map: one step per beat and a Play button. */
  timeline?: boolean;
}

/** Previous / next beat buttons for reproducible video shots. Hidden with ?clean=1. No global key handlers. */
export function BeatControls({ title, beats, timeline = false }: Props) {
  const q = useQuery();
  const beat = Number(q.get("beat")) || 0;
  const last = beats.length ? beats[beats.length - 1].beat : 0;
  const [playing, setPlaying] = useState(false);
  const go = (n: number, replace = false) => navigate(withQuery({ beat: n >= 1 ? String(n) : null }), { transition: "none", replace });

  useEffect(() => {
    if (!playing) return;
    if (beat >= last) return setPlaying(false);
    const t = setTimeout(() => go(beat + 1, true), prefersReducedMotion() ? PLAY_MS * 2 : PLAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, beat, last]);

  if (q.get("clean") === "1") return null;

  function play() {
    if (playing) return setPlaying(false);
    if (beat >= last) go(1, true); // from the end, start over
    setPlaying(true);
  }

  return (
    <nav className={`beat-controls${timeline ? " timeline" : ""}`} aria-label="Beat replay">
      {timeline && (
        <button type="button" onClick={play} disabled={!last} aria-pressed={playing}>
          {playing ? "Pause" : "Play"}
        </button>
      )}
      <button type="button" onClick={() => go(beat - 1)} disabled={beat <= 0}>
        Previous beat
      </button>
      {timeline && (
        <ol className="beat-steps" aria-label="Beats">
          {beats.map((b) => (
            <li key={b.beat} className={b.beat <= beat ? "done" : undefined}>
              <button
                type="button"
                className="beat-step"
                aria-current={b.beat === beat ? "step" : undefined}
                aria-label={`Beat ${b.beat}: ${b.title}`}
                title={b.title}
                onClick={() => go(b.beat)}
              >
                {b.beat}
              </button>
            </li>
          ))}
        </ol>
      )}
      <button type="button" onClick={() => go(beat + 1)} disabled={beat >= last}>
        Next beat
      </button>
      <span className="beat-label" aria-live="polite">
        {beat ? `Beat ${beat}${title ? `: ${title}` : ""}` : "Live"}
      </span>
    </nav>
  );
}
