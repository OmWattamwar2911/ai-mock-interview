"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  BarChart3,
  Shield,
  FileText,
  Video,
  Code2,
} from "lucide-react";
import { WindRoseMark } from "@/components/landing/Navbar";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/onboarding", label: "Prep", icon: Sparkles },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/interview", label: "Interview", icon: Video },
  { href: "/oa", label: "OA Practice", icon: Code2 },
  { href: "/analyzer", label: "Analyzer", icon: Sparkles },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data } = useSession();
  const isAdmin = data?.user?.role === "ADMIN";

  return (
    <div className="flex min-h-screen bg-[#f0eded] dark:bg-[#0b0b0b] font-mono text-foreground">
      {/* ── Black Rounded-2xl Sidebar ────────────────────────────────────── */}
      <aside className="hidden w-64 shrink-0 m-2 sm:m-3 rounded-2xl bg-black p-3.5 text-white shadow-lg border border-white/10 md:flex md:flex-col justify-between">
        <div className="space-y-6">
          {/* Logo */}
          <div className="px-2 pt-1 flex items-center gap-2.5">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <WindRoseMark className="w-6 h-6 text-white group-hover:rotate-45 transition-transform duration-300" />
              <span className="font-mono text-base font-bold tracking-tight text-white">rehearse</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-mono transition-all duration-200",
                    active
                      ? "bg-white/15 text-white font-semibold"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </div>
                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F64302] shadow-[0_0_8px_#F64302]" />
                  )}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-mono transition-all duration-200",
                  pathname.startsWith("/admin")
                    ? "bg-white/15 text-white font-semibold"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="h-4 w-4 text-[#F64302]" />
                  <span>Admin</span>
                </div>
              </Link>
            )}
          </nav>
        </div>

        {/* Footer / User Sign out */}
        <div className="pt-4 border-t border-white/10">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-mono text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between border-b border-black/5 dark:border-white/10 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="truncate text-xs font-mono text-muted">{data?.user?.email || "Candidate Mode"}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <CommandPalette />
            <ThemeToggle />
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-3 sm:p-5 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
