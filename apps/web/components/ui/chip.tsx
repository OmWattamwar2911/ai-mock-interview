"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Chip({
  label,
  onRemove,
  className,
}: {
  label: string;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border border-border px-2.5 py-1 text-xs",
        className,
      )}
    >
      {label}
      {onRemove ? (
        <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className="text-muted hover:text-foreground">
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}
