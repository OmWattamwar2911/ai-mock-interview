"use client";

import { Search, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function TopNav() {
  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 -ml-2 text-muted hover:text-foreground">
          <Menu className="w-5 h-5" />
        </button>
        <button className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-muted bg-background border border-border rounded-md hover:border-foreground/20 transition-colors">
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-4 font-mono text-[10px] bg-elevated px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
        </button>
      </div>
      
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="w-8 h-8 rounded-full bg-elevated border border-border overflow-hidden">
          {/* Avatar placeholder */}
        </div>
      </div>
    </header>
  );
}
