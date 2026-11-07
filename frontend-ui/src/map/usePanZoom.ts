// Zoom and drag for the map. Wheel or pinch zooms around the pointer, dragging pans (also when the drag
// starts on a node), and +, − and "Fit" buttons do the same for keyboards. A drag never counts as a click.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface View {
  k: number;
  x: number;
  y: number;
}

export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 3;
const DRAG_THRESHOLD = 4;

const clamp = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

/** The view that fits a box of world coordinates into the viewport, centred, never zoomed in past 1.1. */
export function fitView(
  box: { minX?: number; minY?: number; width: number; height: number },
  viewport: { width: number; height: number },
  margin = { top: 96, bottom: 76, side: 24 },
): View {
  const availW = viewport.width - 2 * margin.side;
  const availH = viewport.height - margin.top - margin.bottom;
  const k = clamp(Math.min(availW / box.width, availH / box.height, 1.1));
  return {
    k,
    x: margin.side + (availW - box.width * k) / 2 - (box.minX ?? 0) * k,
    y: margin.top + (availH - box.height * k) / 2 - (box.minY ?? 0) * k,
  };
}

/** Zooms by a factor around a point in viewport pixels, keeping that point still. */
export function zoomAround(v: View, factor: number, px: number, py: number): View {
  const k = clamp(v.k * factor);
  const f = k / v.k;
  return { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
}

export function usePanZoom(initial: View, resetKey: string) {
  const [view, setView] = useState<View>(initial);
  const [smooth, setSmooth] = useState(false);
  // A callback ref, so the wheel listener attaches whenever the element appears (it isn't there while loading).
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => {
    elRef.current = node;
    setEl(node);
  }, []);
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ start: View; sx: number; sy: number; dist?: number; mx?: number; my?: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  // A new view (other focus, zoom level, window size) starts from its fitted framing.
  const initialRef = useRef(initial);
  initialRef.current = initial;
  useLayoutEffect(() => {
    setSmooth(false);
    setView(initialRef.current);
  }, [resetKey]);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = elRef.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };

  useEffect(() => {
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      // Trackpad pinch arrives as ctrl+wheel with small deltas; a mouse wheel sends bigger ones.
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      setSmooth(false);
      setView((v) => zoomAround(v, factor, p.x, p.y));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [el]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    setSmooth(false);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { start: viewRef.current, sx: 0, sy: 0, dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, moved: true };
    } else {
      gesture.current = { start: viewRef.current, sx: p.x, sy: p.y, moved: false };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (pointers.current.size >= 2 && g.dist) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const zoomed = zoomAround(g.start, dist / g.dist, g.mx!, g.my!);
      setView({ ...zoomed, x: zoomed.x + (mx - g.mx!), y: zoomed.y + (my - g.my!) });
      return;
    }
    const dx = p.x - g.sx;
    const dy = p.y - g.sy;
    if (!g.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!g.moved) {
      g.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    setView({ ...g.start, x: g.start.x + dx, y: g.start.y + dy });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (gesture.current?.moved) suppressClick.current = true;
    if (pointers.current.size === 0) gesture.current = null;
  };

  /** Swallows the click that ends a drag, so dragging across a node doesn't open it. */
  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const zoomBy = useCallback((factor: number) => {
    const r = elRef.current?.getBoundingClientRect();
    setSmooth(true);
    setView((v) => zoomAround(v, factor, (r?.width ?? 0) / 2, (r?.height ?? 0) / 2));
  }, []);

  const reset = useCallback(() => {
    setSmooth(true);
    setView(initialRef.current);
  }, []);

  const panTo = useCallback((v: View) => {
    setSmooth(true);
    setView(v);
  }, []);

  return {
    view,
    ref,
    smooth,
    zoomBy,
    reset,
    panTo,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture },
  };
}
