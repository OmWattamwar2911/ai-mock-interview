"use client";

import { useState, useEffect, type ReactNode } from "react";
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
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  ExternalLink,
  Search,
} from "lucide-react";
import { WindRoseMark } from "@/components/landing/Navbar";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { cn } from "@/lib/utils";

interface NavGroup {
  group: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const navGroups: NavGroup[] = [
  {
    group: "Practice",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/onboarding", label: "Prep", icon: Sparkles },
      { href: "/interview", label: "Interview", icon: Video },
      { href: "/oa", label: "OA Practice", icon: Code2 },
    ],
  },
  {
    group: "Improve",
    items: [
      { href: "/analyzer", label: "Analyzer", icon: Sparkles },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    group: "Library",
    items: [{ href: "/documents", label: "Documents", icon: FileText }],
  },
  {
    group: "Account",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

const mobileBottomNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/interview", label: "Interview", icon: Video },
  { href: "/analyzer", label: "Analyzer", icon: Sparkles },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Remember collapsed preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rehearse_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("rehearse_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Determine current page name for header breadcrumb
  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.startsWith("/onboarding")) return "Interview Prep";
    if (pathname.startsWith("/documents")) return "Documents";
    if (pathname.startsWith("/interview")) {
      if (pathname.includes("/report")) return "Interview Report";
      return "Interview";
    }
    if (pathname.startsWith("/oa")) return "OA Practice";
    if (pathname.startsWith("/analyzer")) return "Analyzer";
    if (pathname.startsWith("/analytics")) return "Analytics";
    if (pathname.startsWith("/settings")) return "Settings";
    if (pathname.startsWith("/ui-kit")) return "UI Kit";
    if (pathname.startsWith("/admin")) return "Admin Panel";
    return "Rehearse";
  };

  const candidateName = session?.user?.name || "Candidate";
  const candidateEmail = session?.user?.email || "candidate@rehearse.app";
  const initials = candidateName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#f0eded] dark:bg-[#0b0b0b] font-mono text-foreground">
      {/* ── Desktop Floating Black Rounded Sidebar ────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex flex-col justify-between shrink-0 m-3 rounded-2xl bg-black p-3.5 text-white shadow-xl border border-white/10 transition-all duration-300 z-30",
          collapsed ? "w-18" : "w-64"
        )}
      >
        <div className="space-y-6">
          {/* Logo & Collapse Toggle */}
          <div className="flex items-center justify-between px-1 pt-1">
            <Link
              href="/dashboard"
              className={cn("flex items-center gap-2.5 group overflow-hidden", collapsed && "justify-center w-full")}
              title="Rehearse Home"
            >
              <WindRoseMark className="w-6 h-6 text-white group-hover:rotate-45 transition-transform duration-300 shrink-0" />
              {!collapsed && (
                <span className="font-mono text-base font-bold tracking-tight text-white truncate">
                  rehearse
                </span>
              )}
            </Link>

            {!collapsed && (
              <button
                type="button"
                onClick={toggleCollapse}
                aria-label="Collapse sidebar"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-white/15 transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {collapsed && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={toggleCollapse}
                aria-label="Expand sidebar"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-white/15 transition-colors"
                title="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Grouped Navigation Links */}
          <nav className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-220px)]">
            {navGroups.map((group) => (
              <div key={group.group} className="space-y-1">
                {!collapsed && (
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/40">
                    {group.group}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-mono transition-all duration-200",
                          collapsed && "justify-center px-2 py-2.5",
                          active
                            ? "bg-white/15 text-white font-semibold"
                            : "text-white/65 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.label}</span>}
                        </div>
                        {active && !collapsed && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#F64302] shadow-[0_0_8px_#F64302]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {isAdmin && (
              <div className="space-y-1 pt-1 border-t border-white/10">
                {!collapsed && (
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Administration
                  </p>
                )}
                <Link
                  href="/admin"
                  title={collapsed ? "Admin" : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-mono transition-all duration-200",
                    collapsed && "justify-center px-2 py-2.5",
                    pathname.startsWith("/admin")
                      ? "bg-white/15 text-white font-semibold"
                      : "text-white/65 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Shield className="h-4 w-4 text-[#F64302] shrink-0" />
                    {!collapsed && <span>Admin</span>}
                  </div>
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/* Bottom Profile Block */}
        <div className="pt-3 border-t border-white/10">
          <div
            className={cn(
              "flex items-center justify-between rounded-xl p-2 transition-colors",
              collapsed ? "flex-col gap-2" : "gap-2.5"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F64302] text-white text-xs font-bold">
                {initials || "C"}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-white truncate leading-tight">
                    {candidateName}
                  </p>
                  <p className="text-[10px] text-white/40 truncate">{candidateEmail}</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Sign out"
              aria-label="Sign out"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Hamburger Drawer Overlay ───────────────────────────────── */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          <div className="relative flex flex-col justify-between w-72 max-w-[80vw] bg-black text-white p-5 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <Link href="/dashboard" className="flex items-center gap-2.5">
                  <WindRoseMark className="w-6 h-6 text-white" />
                  <span className="font-mono text-base font-bold text-white">rehearse</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close menu"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="space-y-4">
                {navGroups.map((group) => (
                  <div key={group.group} className="space-y-1">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
                      {group.group}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-mono transition-colors",
                              active
                                ? "bg-white/15 text-white font-semibold"
                                : "text-white/65 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="h-4 w-4 text-[#F64302]" />
                              <span>{item.label}</span>
                            </div>
                            {active && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#F64302]" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F64302] text-white text-xs font-bold">
                  {initials || "C"}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-white truncate">{candidateName}</p>
                  <p className="text-[10px] text-white/40 truncate">{candidateEmail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-xs font-mono font-semibold text-white hover:bg-white/20"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Viewport Area ────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky Top Bar with Backdrop Blur */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] bg-[#f0eded]/80 dark:bg-[#0b0b0b]/80 backdrop-blur-md px-4 py-3 sm:px-6 transition-colors">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation drawer"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10 text-foreground md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Breadcrumb / Page Identifier */}
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground hidden sm:inline">
                rehearse /
              </span>
              <span className="text-xs sm:text-sm font-jetbrains font-bold text-foreground">
                {getPageTitle()}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <CommandPalette />
            <ThemeToggle />

            {/* User Avatar Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="User account menu"
                className="flex items-center gap-2 rounded-xl p-1 bg-white/60 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 border border-black/5 dark:border-white/10 transition-all select-none"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F64302] text-white text-[11px] font-bold">
                  {initials || "C"}
                </div>
                <span className="hidden sm:inline font-mono text-xs font-semibold text-foreground pr-1 truncate max-w-[120px]">
                  {candidateName.split(" ")[0]}
                </span>
              </button>

              {/* Avatar Dropdown */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/10 dark:border-white/10 p-2 shadow-2xl z-40 space-y-1 animate-in fade-in-50 zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-black/[0.05] dark:border-white/[0.06]">
                      <p className="font-jetbrains font-bold text-xs text-foreground truncate">
                        {candidateName}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground truncate">
                        {candidateEmail}
                      </p>
                    </div>

                    <Link
                      href="/settings"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-mono text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#F64302]" />
                      <span>Account Settings</span>
                    </Link>

                    <Link
                      href="/ui-kit"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-mono text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#F64302]" />
                      <span>Design System Kit</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-mono text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-8 overflow-x-hidden pb-20 md:pb-8">
          {children}
        </main>

        {/* ── Mobile Compact Bottom Tab Bar ─────────────────────────────────── */}
        <nav
          aria-label="Mobile Navigation"
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#101010]/95 backdrop-blur-lg py-2 px-3 md:hidden shadow-lg"
        >
          {mobileBottomNav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-1.5 font-mono text-[10px] transition-colors min-w-[64px]",
                  active ? "text-[#F64302] font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="h-4 w-4" />
                  {active && (
                    <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-[#F64302]" />
                  )}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
