"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const order = ["system", "light", "dark"] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={cn("h-9 w-9 rounded border border-border", className)} aria-hidden />;
  }

  const current = (theme as (typeof order)[number]) ?? "system";
  const Icon = current === "dark" ? Moon : current === "light" ? Sun : Monitor;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded border border-border text-foreground transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
        className,
      )}
      aria-label={`Theme: ${current}. Click to cycle.`}
      onClick={() => {
        const next = order[(order.indexOf(current) + 1) % order.length];
        setTheme(next);
      }}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
