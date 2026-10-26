import React from "react";
import { CheckCircle2, Clock, AlertCircle, AlertTriangle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusType =
  | "completed"
  | "in_progress"
  | "failed"
  | "partial"
  | "not_analysed"
  | "neutral";

export interface StatusChipProps {
  status: StatusType | string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusChip({ status, label, size = "md", className }: StatusChipProps) {
  const normStatus = (status || "").toLowerCase().replace(/\s+/g, "_") as StatusType;

  const config: Record<
    string,
    { label: string; icon: React.ReactNode; classes: string }
  > = {
    completed: {
      label: "Completed",
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />,
      classes: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    },
    in_progress: {
      label: "In Progress",
      icon: <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-spin" />,
      classes: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    },
    failed: {
      label: "Needs Review",
      icon: <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />,
      classes: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    },
    partial: {
      label: "Partial",
      icon: <AlertTriangle className="w-3 h-3 text-orange-600 dark:text-orange-400" />,
      classes: "bg-[#F64302]/10 text-[#F64302] border-[#F64302]/20",
    },
    not_analysed: {
      label: "Not Analysed",
      icon: <HelpCircle className="w-3 h-3 text-muted-foreground" />,
      classes: "bg-black/5 dark:bg-white/5 text-muted-foreground border-black/10 dark:border-white/10",
    },
  };

  const current = config[normStatus] || {
    label: label || status || "Unknown",
    icon: <HelpCircle className="w-3 h-3 text-muted-foreground" />,
    classes: "bg-black/5 dark:bg-white/5 text-muted-foreground border-black/10 dark:border-white/10",
  };

  const displayLabel = label || current.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-mono font-medium border tracking-wider uppercase",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        current.classes,
        className
      )}
    >
      {current.icon}
      <span>{displayLabel}</span>
    </span>
  );
}
