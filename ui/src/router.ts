// A tiny path router: three routes do not need a dependency.
import { useEffect, useState } from "react";

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

export function navigate(url: string, replace = false) {
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
  window.dispatchEvent(new Event(EVENT));
}

/** Current location; re-renders on navigate() and back/forward. */
export function useLocation() {
  const read = () => ({ pathname: window.location.pathname, search: window.location.search });
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const on = () => setLoc(read());
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
