"use client";

import { useEffect, useRef, useState } from "react";
import type { AppData } from "@/lib/appData";

/**
 * Holds the live AppData. Seeds from the server-rendered `initial` snapshot and
 * then replaces it whenever the SSE stream pushes a newer version. Falls back to
 * a one-off fetch if EventSource isn't available.
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
    const es = new EventSource("/api/stream");
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        apply(JSON.parse(e.data) as AppData);
      } catch {
        /* ignore malformed frame */
      }
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, connected, apply };
}
