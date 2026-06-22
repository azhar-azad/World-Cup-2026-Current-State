"use client";

import { flagUrl, teamsById } from "@wc26/data";

export function Flag({ teamId, size = 20 }: { teamId: string; size?: number }) {
  const team = teamsById.get(teamId);
  if (!team) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={flagUrl(team.iso2)}
      alt=""
      width={size}
      height={Math.round(size * 0.7)}
      style={{ width: size, height: Math.round(size * 0.7) }}
      className="inline-block rounded-[2px] object-cover ring-1 ring-white/10"
    />
  );
}

/**
 * Renders a participant: a resolved team (flag + name) or, while unresolved, the
 * muted slot label (e.g. "1A", "W73", "3rd A/B/C/D/F").
 */
export function TeamLabel({
  teamId,
  fallback,
  size = 20,
  muted = false,
  className = "",
}: {
  teamId: string | null | undefined;
  fallback?: string;
  size?: number;
  muted?: boolean;
  className?: string;
}) {
  if (!teamId) {
    return (
      <span className={`text-neutral-500 italic ${className}`}>
        {fallback ?? "TBD"}
      </span>
    );
  }
  const team = teamsById.get(teamId);
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Flag teamId={teamId} size={size} />
      <span className={muted ? "text-neutral-400" : ""}>
        {team?.name ?? teamId}
      </span>
    </span>
  );
}
