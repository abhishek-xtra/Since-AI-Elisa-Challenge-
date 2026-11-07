export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Waits for an exit animation, or not at all when motion is reduced. */
export function afterExit(ms: number): Promise<void> {
  return prefersReducedMotion() ? Promise.resolve() : new Promise((r) => setTimeout(r, ms));
}
