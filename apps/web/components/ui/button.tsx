import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "solid" | "outline" | "ghost";

export function Button({
  className,
  variant = "solid",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40",
        variant === "solid" && "bg-accent text-background hover:opacity-90",
        variant === "outline" && "border border-border-strong bg-transparent hover:bg-elevated",
        variant === "ghost" && "hover:bg-elevated",
        className,
      )}
      {...props}
    />
  );
}
