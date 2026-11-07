// Node positions eased from where they were to where the layout puts them, one requestAnimationFrame loop for all.
// Nodes and links are both drawn from these positions in the same frame, so a link always meets its two node centres.
import { useLayoutEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../motion";

type XY = { x: number; y: number };
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

export function useTween(target: Map<string, XY>, ms: number): Map<string, XY> {
  const shown = useRef(target);
  const [, frame] = useState(0);
  const key = [...target].map(([id, p]) => `${id}:${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(";");

  useLayoutEffect(() => {
    const from = shown.current;
    const moving = [...target].some(([id, p]) => from.has(id) && (from.get(id)!.x !== p.x || from.get(id)!.y !== p.y));
    if (!moving || prefersReducedMotion() || ms <= 0) {
      shown.current = target;
      frame((f) => f + 1);
      return;
    }
    const start = performance.now();
    let id = 0;
    const tick = (now: number) => {
      const e = easeOut(Math.min(1, (now - start) / ms));
      // a node that is new appears in place (it pops in); a node that moves slides from where it was
      shown.current = new Map([...target].map(([k, p]) => {
        const f = from.get(k) ?? p;
        return [k, { x: f.x + (p.x - f.x) * e, y: f.y + (p.y - f.y) * e }];
      }));
      frame((f) => f + 1);
      if (e < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ms]);

  // ids that arrived this render are drawn at their target until the loop picks them up
  return new Map([...target].map(([k, p]) => [k, shown.current.get(k) ?? p]));
}
