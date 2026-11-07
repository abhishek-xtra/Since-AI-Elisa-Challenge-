import { useCallback, useEffect, useState } from "react";

export type AsyncState<T> = { status: "loading" } | { status: "error"; error: Error } | { status: "ready"; value: T };

/** Runs a loader whenever `key` changes; `reload` runs it again. */
export function useAsync<T>(load: () => Promise<T>, key: string) {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    load().then(
      (value) => alive && setState({ status: "ready", value }),
      (error: Error) => alive && setState({ status: "error", error }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return [state, reload] as const;
}
