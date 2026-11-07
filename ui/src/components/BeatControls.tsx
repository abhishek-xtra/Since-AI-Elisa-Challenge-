import { navigate, useQuery, withQuery } from "../router";

export const BEAT_COUNT = 6;

/** Previous / next beat buttons for reproducible video shots. Hidden with ?clean=1. No global key handlers. */
export function BeatControls({ title }: { title?: string }) {
  const q = useQuery();
  if (q.get("clean") === "1") return null;
  const beat = Number(q.get("beat")) || 0;
  const go = (n: number) => navigate(withQuery({ beat: n >= 1 ? String(n) : null }));

  return (
    <nav className="beat-controls" aria-label="Beat replay">
      <button type="button" onClick={() => go(beat - 1)} disabled={beat <= 0}>
        Previous beat
      </button>
      <span className="beat-label" aria-live="polite">
        {beat ? `Beat ${beat}${title ? `: ${title}` : ""}` : "Live"}
      </span>
      <button type="button" onClick={() => go(beat + 1)} disabled={beat >= BEAT_COUNT}>
        Next beat
      </button>
    </nav>
  );
}
