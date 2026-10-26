import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonCardProps {
  lines?: number;
  hasHeader?: boolean;
  hasLeadingIcon?: boolean;
  className?: string;
}

export function SkeletonCard({
  lines = 3,
  hasHeader = true,
  hasLeadingIcon = false,
  className,
}: SkeletonCardProps) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading content"
      className={cn(
        "rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 sm:p-6 space-y-4 animate-pulse motion-reduce:animate-none",
        className
      )}
    >
      {hasHeader && (
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] dark:border-white/[0.06]">
          <div className="h-5 w-1/3 rounded-lg bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-16 rounded-md bg-black/5 dark:bg-white/5" />
        </div>
      )}

      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl bg-white/60 dark:bg-black/30 p-3.5 border border-black/[0.02] dark:border-white/[0.04]"
          >
            {hasLeadingIcon && (
              <div className="h-9 w-9 shrink-0 rounded-lg bg-black/10 dark:bg-white/10" />
            )}
            <div className="flex-1 space-y-2">
              <div
                className="h-4 rounded bg-black/10 dark:bg-white/10"
                style={{ width: `${Math.max(45, 90 - i * 15)}%` }}
              />
              <div className="h-3 w-1/2 rounded bg-black/5 dark:bg-white/5" />
            </div>
            <div className="h-7 w-20 rounded-lg bg-black/10 dark:bg-white/10 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
