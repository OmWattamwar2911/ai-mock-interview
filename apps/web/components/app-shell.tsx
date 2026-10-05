"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ClipboardCheck, LayoutDashboard, LogOut, Settings, Sparkles, BarChart3, Shield, FileText } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/onboarding", label: "Prep", icon: Sparkles },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/assessment", label: "Assessment", icon: ClipboardCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data } = useSession();
  const isAdmin = data?.user.role === "ADMIN";

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-border md:flex md:flex-col">
        <div className="border-b border-border px-4 py-4">
          <Link href="/dashboard">
            <Logo pulse />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors duration-150",
                  active ? "bg-elevated text-foreground" : "text-muted hover:bg-elevated hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
          {isAdmin ? (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors duration-150",
                pathname.startsWith("/admin") ? "bg-elevated text-foreground" : "text-muted hover:bg-elevated hover:text-foreground",
              )}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          ) : null}
        </nav>
        <div className="border-t border-border p-3">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-muted hover:bg-elevated hover:text-foreground"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
          <p className="truncate text-sm text-muted">{data?.user.email}</p>
          <div className="flex items-center gap-2">
            <CommandPalette />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
