// A tiny path router: three routes do not need a dependency.
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { prefersReducedMotion } from "./motion";

export type Route =
  | { page: "map" }
  | { page: "thread"; id: string }
  | { page: "title"; chapter: string }
  | { page: "notfound" };

export function parseRoute(pathname: string): Route {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { page: "map" };
  if (parts[0] === "thread" && parts[1]) return { page: "thread", id: parts[1] };
  if (parts[0] === "title" && parts[1]) return { page: "title", chapter: parts[1] };
  return { page: "notfound" };
}

const EVENT = "app:navigate";

/** "page" for a new screen, "zoom-in" / "zoom-out" for the map, "none" to skip the transition. */
export type Transition = "page" | "fade" | "zoom-in" | "zoom-out" | "none";

interface NavigateOptions {
  replace?: boolean;
  transition?: Transition;
  /** Where a zoom-in heads, in canvas pixels. */
  origin?: { x: number; y: number };
}

type ViewTransitionDoc = Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } };

export function navigate(url: string, opts: NavigateOptions | boolean = {}) {
  const { replace = false, transition, origin } = typeof opts === "boolean" ? { replace: opts } : opts;
  const update = () => {
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    window.dispatchEvent(new Event(EVENT));
  };
  const samePath = new URL(url, window.location.href).pathname === window.location.pathname;
  const kind = transition ?? (samePath ? "fade" : "page");
  const doc = document as ViewTransitionDoc;
  if (kind === "none" || !doc.startViewTransition || prefersReducedMotion()) return update();

  const root = document.documentElement;
  root.dataset.transition = kind;
  if (origin) {
    root.style.setProperty("--vt-x", `${origin.x}px`);
    root.style.setProperty("--vt-y", `${origin.y}px`);
  }
  doc.startViewTransition(update).finished.finally(() => {
    if (root.dataset.transition === kind) delete root.dataset.transition;
  });
}

/** Current location; re-renders on navigate() and back/forward. */
export function useLocation() {
  const read = () => ({ pathname: window.location.pathname, search: window.location.search });
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    // Synchronous, so a view transition captures the new screen.
    const on = () => flushSync(() => setLoc(read()));
    window.addEventListener("popstate", on);
    window.addEventListener(EVENT, on);
    return () => {
      window.removeEventListener("popstate", on);
      window.removeEventListener(EVENT, on);
    };
  }, []);
  return loc;
}

export function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

/** Returns a URL for the current path with some query params changed (null removes). */
export function withQuery(changes: Record<string, string | null>): string {
  const q = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(changes)) {
    if (v === null) q.delete(k);
    else q.set(k, v);
  }
  const s = q.toString();
  return `${window.location.pathname}${s ? `?${s}` : ""}`;
}
