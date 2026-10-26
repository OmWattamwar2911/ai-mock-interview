import React, { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: {
    value: string | number;
    trend: "up" | "down" | "neutral";
    label?: string;
  };
  icon?: ReactNode;
  hint?: string;
  className?: string;
}

export function StatTile({
  label,
  value,
  unit,
  delta,
  icon,
  hint,
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm motion-reduce:hover:translate-y-0",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </span>
        {icon && <div className="text-[#F64302] shrink-0">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-bubbledot text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-none">
            {value}
          </span>
          {unit && (
            <span className="font-mono text-xs text-muted-foreground font-medium">{unit}</span>
          )}
        </div>

        {delta && (
          <div
            className={cn(
              "flex items-center gap-1 text-[11px] font-mono font-semibold rounded-md px-1.5 py-0.5",
              delta.trend === "up" && "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
              delta.trend === "down" && "text-rose-600 dark:text-rose-400 bg-rose-500/10",
              delta.trend === "neutral" && "text-muted-foreground bg-black/5 dark:bg-white/5"
            )}
          >
            {delta.trend === "up" && <TrendingUp className="w-3 h-3" />}
            {delta.trend === "down" && <TrendingDown className="w-3 h-3" />}
            {delta.trend === "neutral" && <Minus className="w-3 h-3" />}
            <span>{delta.value}</span>
          </div>
        )}
      </div>

      {hint && (
        <p className="mt-2 text-[11px] text-muted-foreground/80 font-mono truncate">{hint}</p>
      )}
    </div>
  );
}
