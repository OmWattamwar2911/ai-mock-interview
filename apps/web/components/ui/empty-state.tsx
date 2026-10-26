import React, { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  withTexture?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  withTexture = true,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4",
        className
      )}
    >
      {withTexture && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.06] dark:opacity-[0.12] mix-blend-overlay">
          <Image
            src="/assets/rehearse/topography.webp"
            alt="Contour texture"
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 dark:bg-black/60 border border-black/[0.05] dark:border-white/10 shadow-sm text-[#F64302]">
        {icon || <Sparkles className="h-6 w-6" />}
      </div>

      <div className="relative z-10 max-w-md space-y-1">
        <h3 className="font-jetbrains text-base sm:text-lg font-bold text-foreground">
          {title}
        </h3>
        <p className="font-mono text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {(action || secondaryAction) && (
        <div className="relative z-10 flex items-center gap-3 pt-2">
          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 font-mono text-xs font-semibold bg-white/70 dark:bg-black/40 hover:bg-white text-foreground border border-black/10 dark:border-white/10 transition-colors"
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 font-mono text-xs font-semibold bg-white/70 dark:bg-black/40 hover:bg-white text-foreground border border-black/10 dark:border-white/10 transition-colors"
              >
                {secondaryAction.label}
              </button>
            )
          )}

          {action && (
            action.href ? (
              <Link
                href={action.href}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#F64302] hover:bg-[#d93800] px-5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-[#F64302]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#F64302] hover:bg-[#d93800] px-5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-[#F64302]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {action.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
