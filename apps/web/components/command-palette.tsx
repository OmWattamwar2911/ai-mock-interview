"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useSession } from "next-auth/react";

const routes = [
  { href: "/dashboard", label: "Dashboard", hint: "overview" },
  { href: "/analyzer", label: "Analyzer", hint: "resume linkedin github coding portfolio profile" },
  { href: "/oa", label: "OA Practice", hint: "coding online assessment problems" },
  { href: "/documents", label: "Documents", hint: "resumes job descriptions" },
  { href: "/analytics", label: "Analytics", hint: "scores history" },
  { href: "/settings", label: "Settings", hint: "profile theme export" },
  { href: "/interview/new", label: "Configure interview", hint: "session start" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const { data } = useSession();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo(() => {
    const extra = data?.user.role === "ADMIN" ? [{ href: "/admin", label: "Admin", hint: "question bank" }] : [];
    const all = [...routes, ...extra];
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter((r) => `${r.label} ${r.hint}`.toLowerCase().includes(term));
  }, [q, data?.user.role]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded border border-border px-3 font-mono text-xs text-muted hover:bg-elevated"
      >
        <Search className="h-3.5 w-3.5" />
        ⌘K
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80" onClick={() => setOpen(false)}>
      <div
        className="mx-auto mt-24 max-w-lg rounded border border-border bg-surface p-3 shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Jump to…"
          className="h-10 w-full rounded border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        />
        <ul className="mt-2 max-h-64 overflow-auto">
          {items.map((item) => (
            <li key={item.href}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-elevated"
                onClick={() => {
                  setOpen(false);
                  router.push(item.href);
                }}
              >
                <span>{item.label}</span>
                <span className="font-mono text-xs text-muted">{item.href}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
