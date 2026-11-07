import { useEffect, useState } from "react";
import { useQuery } from "../router";

export const CHAPTERS = [
  { slug: "capture", word: "Capture", line: "Knowledge pulled from a normal conversation. Nobody fills in a form." },
  { slug: "bind", word: "Bind", line: "Linked to the right place in the network, and nowhere else." },
  { slug: "recall", word: "Recall", line: "Used the moment the same fault comes back." },
  { slug: "stay-true", word: "Stay true", line: "Replaced when it changes. Dropped where it no longer holds." },
] as const;

const W = 1920;
const H = 1080;

export function useScale() {
  const read = () => Math.min(window.innerWidth / W, window.innerHeight / H);
  const [s, setS] = useState(read);
  useEffect(() => {
    const on = () => setS(read());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return s;
}

/** A 1920×1080 chapter title for screen recording, scaled to fit the window. */
export function TitleCard({ chapter }: { chapter: string }) {
  const q = useQuery();
  const scale = useScale();
  // Click anywhere to play the entrance again, for another take.
  const [take, setTake] = useState(0);
  const index = CHAPTERS.findIndex((c) => c.slug === chapter);
  if (index < 0) return <main className="title-missing"><p>No chapter "{chapter}". Try capture, bind, recall or stay-true.</p></main>;
  const c = CHAPTERS[index];

  return (
    <main className="title-stage" onClick={() => setTake((t) => t + 1)}>
      <div key={take} className="title-card" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <p className="title-chapter">Chapter {index + 1} of 4</p>
        <h1 className="title-word">
          <span>{c.word}</span>
        </h1>
        <p className="title-line">{c.line}</p>
        <div className="title-track" aria-hidden="true">
          <span className="title-rail" />
          {CHAPTERS.map((s, i) => (
            <span
              key={s.slug}
              className={`title-stop${i === index ? " current" : ""}${i < index ? " done" : ""}`}
              style={{ left: `${(i / 3) * 100}%`, "--i": i } as React.CSSProperties}
            >
              <span className="title-stop-label">{s.word}</span>
            </span>
          ))}
        </div>
        {q.get("counter") === "1" && <p className="title-counter">0 forms · 1 tap</p>}
      </div>
    </main>
  );
}
