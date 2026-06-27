"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { SyncButton } from "./SyncButton";

const LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/groups", label: "Groups" },
  { href: "/matches", label: "Matches" },
  { href: "/knockout", label: "Knockout" },
];

export function Nav() {
  const pathname = usePathname();
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        const res = await fetch("/api/snapshot");
        if (!cancelled) setConnected(res.ok);
      } catch {
        if (!cancelled) setConnected(false);
      }
      if (!cancelled) timer = setTimeout(check, 5000);
    };
    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-0.5 min-w-0">
          <span className="text-sm font-bold text-white mr-3 hidden sm:block shrink-0">
            WC 2026
          </span>
          {LINKS.map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-2.5 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                  active
                    ? "bg-white/10 text-white font-medium"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-emerald-500" : "bg-neutral-600"
              }`}
            />
            {connected ? "Live" : "Offline"}
          </span>
          <SyncButton />
          <Link
            href="/admin"
            className="text-xs rounded-md border border-white/15 px-2.5 py-1.5 hover:bg-white/5 transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
}
