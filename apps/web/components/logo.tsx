"use client";

import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  pulse?: boolean;
};

export function Logo({ className, pulse = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-sans text-lg font-semibold tracking-tighter", className)}>
      <span>rehearse</span>
      <span
        aria-hidden
        className={cn(
          "inline-block size-1.5 rounded-[1px] bg-accent",
          pulse && "motion-safe:animate-pulse",
        )}
      />
    </span>
  );
}
