import React, { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  action,
  secondaryAction,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5",
        className
      )}
    >
      <div className="space-y-1.5 max-w-3xl">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mb-2">
            {breadcrumbs.map((b, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />}
                {b.href ? (
                  <Link href={b.href} className="hover:text-foreground transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {eyebrow && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-[#F64302]">
              {eyebrow}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#F64302]" />
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-jetbrains font-bold tracking-tight text-foreground capitalize">
          {title}
        </h1>

        {subtitle && (
          <p className="text-sm sm:text-base text-muted-foreground font-mono leading-relaxed max-w-2xl pt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0">
          {secondaryAction}
          {action}
        </div>
      )}
    </div>
  );
}
