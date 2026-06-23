"use client";

import { useEffect, useRef, useState } from "react";
import type { AppData } from "@/lib/appData";

const POLL_INTERVAL_MS = 3000;

/**
 * Keeps AppData fresh by polling /api/snapshot every 3 seconds.
 * Seeds from the server-rendered `initial` snapshot; the `apply` function lets
 * callers immediately apply a PATCH response without waiting for the next poll.
 */
export function useLiveData(initial: AppData): {
  data: AppData;
  connected: boolean;
  apply: (next: AppData) => void;
} {
  const [data, setData] = useState<AppData>(initial);
  const [connected, setConnected] = useState(false);
  const versionRef = useRef(initial.version);

  const apply = (next: AppData) => {
    if (next.version >= versionRef.current) {
      versionRef.current = next.version;
      setData(next);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch("/api/snapshot");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const next = (await res.json()) as AppData;
        if (!cancelled) {
          apply(next);
          setConnected(true);
        }
      } catch {
        if (!cancelled) setConnected(false);
      }
      if (!cancelled) {
        timerId = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, connected, apply };
}
