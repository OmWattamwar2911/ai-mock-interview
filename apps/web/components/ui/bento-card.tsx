import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  padded?: boolean | "dense" | "normal" | "spacious";
  variant?: "card" | "secondary" | "dark" | "ghost";
}

export function BentoCard({
  children,
  className,
  interactive = false,
  padded = "normal",
  variant = "card",
  ...props
}: BentoCardProps) {
  const paddingClass = {
    false: "p-0",
    true: "p-6",
    dense: "p-4 sm:p-5",
    normal: "p-6 sm:p-7",
    spacious: "p-7 sm:p-8 md:p-10",
  }[padded === true ? "normal" : padded === false ? "false" : padded];

  const variantClass = {
    card: "bg-[#EBE8EB] dark:bg-[#141414] text-foreground border border-black/[0.04] dark:border-white/[0.08]",
    secondary: "bg-[#E8E5E9] dark:bg-[#1a1a1a] text-foreground border border-black/[0.03] dark:border-white/[0.06]",
    dark: "bg-black text-white border border-white/10 shadow-xl",
    ghost: "bg-transparent border border-black/[0.06] dark:border-white/[0.08]",
  }[variant];

  return (
    <div
      className={cn(
        "rounded-2xl relative overflow-hidden transition-all duration-300",
        variantClass,
        paddingClass,
        interactive &&
          "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/40 hover:border-[#F64302]/30 active:scale-[0.99] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
