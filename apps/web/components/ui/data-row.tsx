import React, { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataRowProps {
  icon?: ReactNode;
  title: string;
  meta?: ReactNode;
  trailingBadge?: ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: ReactNode;
  };
  onClick?: () => void;
  className?: string;
}

export function DataRow({
  icon,
  title,
  meta,
  trailingBadge,
  action,
  onClick,
  className,
}: DataRowProps) {
  const content = (
    <div
      onClick={onClick}
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white/70 dark:bg-black/40 border border-black/[0.04] dark:border-white/[0.06] p-3.5 sm:p-4 transition-all duration-200",
        onClick && "cursor-pointer hover:border-[#F64302]/40 hover:-translate-y-0.5 hover:shadow-sm motion-reduce:transform-none",
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EBE8EB] dark:bg-white/5 text-[#F64302]">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-jetbrains font-semibold text-sm text-foreground truncate">
            {title}
          </p>
          {meta && (
            <div className="font-mono text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
              {meta}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-black/[0.03] dark:border-white/[0.04]">
        {trailingBadge}

        {action && (
          action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold bg-black/5 dark:bg-white/10 hover:bg-[#F64302] hover:text-white text-foreground transition-all duration-200 group-hover:bg-[#F64302] group-hover:text-white"
            >
              <span>{action.label}</span>
              {action.icon || <ChevronRight className="w-3.5 h-3.5" />}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold bg-black/5 dark:bg-white/10 hover:bg-[#F64302] hover:text-white text-foreground transition-all duration-200 group-hover:bg-[#F64302] group-hover:text-white"
            >
              <span>{action.label}</span>
              {action.icon || <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )
        )}
      </div>
    </div>
  );

  return content;
}
