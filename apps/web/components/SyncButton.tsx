"use client";

import { useState, useEffect } from "react";
import { SYNC_MAX_PER_WINDOW } from "@/lib/syncConstants";

interface SyncResponse {
  ok?: boolean;
  error?: string;
  updated?: number;
  remaining?: number;
  resetIn?: number;
}

function formatAge(seconds: number): string {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<number | null>(null);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (resetAt === null && syncedAt === null) return;
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (resetAt !== null && current >= resetAt) {
        setRemaining(SYNC_MAX_PER_WINDOW);
        setResetAt(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [resetAt, syncedAt]);

  const resetIn = resetAt ? Math.max(0, Math.ceil((resetAt - now) / 1000)) : null;
  const syncAge = syncedAt ? Math.round((now - syncedAt) / 1000) : null;
  const disabled = loading || remaining === 0;

  async function handleSync() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = (await res.json()) as SyncResponse;

      if (data.remaining !== undefined) setRemaining(data.remaining);
      if (data.resetIn !== undefined) setResetAt(Date.now() + data.resetIn * 1000);

      if (!res.ok) {
        setError(data.error ?? "Sync failed");
      } else {
        setSyncedAt(Date.now());
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={disabled}
        className="text-sm rounded-md border border-white/15 px-3 py-1.5 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Syncing…" : "Sync Results"}
      </button>

      {remaining !== null && (
        <span className="text-xs text-neutral-500">
          {remaining} of {SYNC_MAX_PER_WINDOW} syncs left
          {resetIn !== null && resetIn > 0 && ` · resets in ${resetIn}s`}
        </span>
      )}
      {syncAge !== null && (
        <span className="text-xs text-neutral-600">
          synced {formatAge(syncAge)}
        </span>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
