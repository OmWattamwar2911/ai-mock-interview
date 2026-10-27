import React from "react";
import { cn } from "@/lib/utils";

export interface ScoreNumeralProps {
  score: number;
  maxScore?: number;
  label?: string;
  verdict?: string;
  verdictType?: "positive" | "warning" | "neutral" | "negative";
  variant?: "ring" | "bar" | "minimal";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ScoreNumeral({
  score,
  maxScore = 100,
  label = "Overall Score",
  verdict,
  verdictType = "positive",
  variant = "ring",
  size = "md",
  className,
}: ScoreNumeralProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((score / maxScore) * 100)));
  const radius = size === "lg" ? 54 : size === "md" ? 42 : 30;
  const stroke = size === "lg" ? 8 : size === "md" ? 6 : 5;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (percentage / 100) * circ;

  const fontScoreClass = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl sm:text-6xl",
  }[size];

  const verdictColorClass = {
    positive: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    neutral: "bg-black/5 dark:bg-white/10 text-muted-foreground border-black/10 dark:border-white/10",
    negative: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
  }[verdictType];

  return (
    <div
      className={cn(
        "rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-6 flex flex-col justify-between",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {label && (
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        )}
        {verdict && (
          <span
            className={cn(
              "font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
              verdictColorClass
            )}
          >
            {verdict}
          </span>
        )}
      </div>

      <div className="my-4 flex items-center justify-between gap-6">
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "font-bubbledot font-bold tracking-tight text-[#F64302] leading-none",
                fontScoreClass
              )}
            >
              {score}
            </span>
            <span className="font-mono text-xs text-muted-foreground font-semibold">
              / {maxScore}
            </span>
          </div>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            {percentage}% Achieved
          </p>
        </div>

        {variant === "ring" && (
          <div className="relative shrink-0 flex items-center justify-center">
            <svg
              className="-rotate-90"
              width={radius * 2 + stroke * 2}
              height={radius * 2 + stroke * 2}
            >
              <circle
                cx={radius + stroke}
                cy={radius + stroke}
                r={radius}
                className="stroke-black/10 dark:stroke-white/10"
                strokeWidth={stroke}
                fill="none"
              />
              <circle
                cx={radius + stroke}
                cy={radius + stroke}
                r={radius}
                className="stroke-[#F64302] transition-all duration-1000 ease-out"
                strokeWidth={stroke}
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <span className="absolute font-bubbledot text-xs font-bold text-foreground">
              {percentage}%
            </span>
          </div>
        )}
      </div>

      {variant === "bar" && (
        <div className="w-full space-y-1.5 pt-1">
          <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#F64302] transition-all duration-700 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
