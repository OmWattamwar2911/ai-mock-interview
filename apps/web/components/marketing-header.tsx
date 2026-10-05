import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function MarketingHeader({ extra }: { extra?: ReactNode }) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Link href="/" aria-label="Rehearse home">
        <Logo pulse />
      </Link>
      <div className="flex items-center gap-3">
        {extra}
        <ThemeToggle />
      </div>
    </header>
  );
}
