"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronRight, Menu, X } from "lucide-react";

export function WindRoseMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* North wing */}
      <polygon points="16,2 16,16 11,16" fill="currentColor" opacity="0.9" />
      <polygon points="16,2 21,16 16,16" fill="currentColor" opacity="0.4" />
      {/* East wing */}
      <polygon points="30,16 16,16 16,11" fill="currentColor" opacity="0.9" />
      <polygon points="30,16 16,21 16,16" fill="currentColor" opacity="0.4" />
      {/* South wing */}
      <polygon points="16,30 16,16 21,16" fill="currentColor" opacity="0.9" />
      <polygon points="16,30 11,16 16,16" fill="currentColor" opacity="0.4" />
      {/* West wing */}
      <polygon points="2,16 16,16 16,21" fill="currentColor" opacity="0.9" />
      <polygon points="2,16 16,11 16,16" fill="currentColor" opacity="0.4" />
      {/* Central core */}
      <circle cx="16" cy="16" r="2" fill="#F64302" />
    </svg>
  );
}

const navLinks = [
  { name: "Overview", href: "#hero" },
  { name: "How it works", href: "#how-it-works" },
  { name: "Features", href: "#features" },
  { name: "FAQ", href: "#faq" },
  { name: "Contact", href: "#contact" },
];

export function Navbar() {
  const { data: session } = useSession();
  const [isDarkSection, setIsDarkSection] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // isDark flips after scrollY > innerHeight * 0.7 (over pale sections)
      const threshold = window.innerHeight * 0.7;
      setIsDarkSection(window.scrollY > threshold);

      // Section spy
      const sections = ["hero", "how-it-works", "features", "faq", "contact"];
      const cur = sections.find((id) => {
        const el = document.getElementById(id);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.top <= 200 && rect.bottom >= 200;
      });
      if (cur) {
        const match = navLinks.find((l) => l.href === `#${cur}`);
        if (match) setActiveTab(match.name);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-10 py-3.5 transition-all duration-300 ${
          isDarkSection
            ? "bg-[#f0eded]/80 dark:bg-black/80 backdrop-blur-md border-b border-black/5 dark:border-white/10 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Left: Wind-rose brand */}
          <Link
            href="/"
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
              isDarkSection
                ? "text-black dark:text-white bg-white/70 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm"
                : "text-white"
            }`}
          >
            <WindRoseMark className="w-7 h-7" />
            <span className="font-mono text-base font-bold tracking-tight">rehearse</span>
          </Link>

          {/* Center Pill (hidden below lg) */}
          <nav
            aria-label="Main Navigation"
            className="hidden lg:flex items-center gap-1 rounded-full bg-white/95 p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-black/5 backdrop-blur-md"
          >
            {navLinks.map((link) => {
              const isActive = activeTab === link.name;
              return (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleSmoothScroll(e, link.href)}
                  className={`rounded-full px-4 py-1.5 text-xs font-mono transition-all duration-200 ${
                    isActive
                      ? "bg-black text-white shadow-sm font-semibold"
                      : "text-black/70 hover:text-black hover:bg-black/5"
                  }`}
                >
                  {link.name}
                </a>
              );
            })}
          </nav>

          {/* Right Action Button & Mobile Hamburger */}
          <div className="flex items-center gap-3">
            {session ? (
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-mono font-medium text-white transition-transform hover:scale-[1.02] shadow-sm border border-white/10"
              >
                <span>Open Dashboard</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10">
                  <ChevronRight className="h-3.5 w-3.5 text-white" />
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-mono font-medium text-white transition-transform hover:scale-[1.02] shadow-sm border border-white/10"
              >
                <span>Start Practicing</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10">
                  <ChevronRight className="h-3.5 w-3.5 text-white" />
                </span>
              </Link>
            )}

            {/* Mobile Hamburger (40px rounded, backdrop blur, white/10 border) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
              aria-label="Toggle navigation menu"
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl border backdrop-blur-md transition-colors lg:hidden ${
                isDarkSection
                  ? "border-black/10 bg-black/5 text-black hover:bg-black/10 dark:border-white/20 dark:bg-white/10 dark:text-white"
                  : "border-white/20 bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <Menu
                className={`absolute h-5 w-5 transition-all duration-300 ${
                  mobileMenuOpen ? "scale-50 opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0"
                }`}
              />
              <X
                className={`absolute h-5 w-5 transition-all duration-300 ${
                  mobileMenuOpen ? "scale-100 opacity-100 rotate-0" : "scale-50 opacity-0 -rotate-90"
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fullscreen Overlay (fixed inset-0 z-40 black/95) */}
      <div
        id="mobile-nav"
        className={`fixed inset-0 z-40 flex flex-col justify-between bg-black/95 p-6 backdrop-blur-xl transition-all duration-700 lg:hidden ${
          mobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="pt-24 space-y-6">
          {navLinks.map((link, idx) => (
            <div
              key={link.name}
              style={{
                transitionDelay: mobileMenuOpen ? `${150 + idx * 70}ms` : `${(navLinks.length - idx) * 30}ms`,
              }}
              className={`transform transition-all duration-500 ${
                mobileMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <a
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className="font-mono text-2xl font-medium tracking-tight text-white/90 hover:text-white"
              >
                {link.name}
              </a>
            </div>
          ))}
        </div>

        <div className="pb-8 space-y-3">
          <Link
            href={session ? "/dashboard" : "/login"}
            onClick={() => setMobileMenuOpen(false)}
            className="flex w-full items-center justify-center rounded-xl bg-white py-3.5 font-mono text-sm font-semibold text-black transition-transform active:scale-[0.98]"
          >
            {session ? "Open Dashboard" : "Start Practicing"}
          </Link>
          <p className="text-center font-mono text-xs text-white/30">
            Practice the interview before it counts.
          </p>
        </div>
      </div>
    </>
  );
}
