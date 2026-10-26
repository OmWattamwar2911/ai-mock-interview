import React, { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  headerSlot?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  divided?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  action,
  headerSlot,
  children,
  className,
  bodyClassName,
  divided = false,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-5 sm:p-6 space-y-4",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/[0.05] dark:border-white/[0.06] pb-3.5">
        <div>
          <h2 className="text-base sm:text-lg font-jetbrains font-bold tracking-tight text-foreground capitalize">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {headerSlot}
          {action && (
            action.href ? (
              <Link
                href={action.href}
                className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#F64302] hover:underline"
              >
                <span>{action.label}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#F64302] hover:underline"
              >
                <span>{action.label}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      <div className={cn(divided ? "divide-y divide-black/[0.04] dark:divide-white/[0.06]" : "space-y-3", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
