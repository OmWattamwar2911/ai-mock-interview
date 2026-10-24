"use client";

import Link from "next/link";
import { WindRoseMark } from "./Navbar";

export function Footer() {
  return (
    <footer id="contact" className="w-full bg-black text-white px-6 py-16 sm:px-10 lg:px-16 border-t border-white/10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* Brand & info */}
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center gap-2.5">
              <WindRoseMark className="w-7 h-7 text-white" />
              <span className="font-mono text-lg font-bold tracking-tight">rehearse</span>
            </div>
            <p className="font-mono text-xs text-white/50 leading-relaxed">
              Automated AI mock interview platform featuring speech-to-speech interaction, live coding evaluation, and structured 7-day practice roadmaps.
            </p>
            <p className="font-mono text-[11px] text-white/30">
              Note: Any illustrative statistics or dashboard metrics represent fictional demo data for project demonstration.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 font-mono text-xs">
            <div className="space-y-3">
              <span className="font-semibold uppercase tracking-wider text-white/40">Navigation</span>
              <ul className="space-y-2">
                <li>
                  <a href="#hero" className="text-white/70 hover:text-white transition-colors">
                    Overview
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="text-white/70 hover:text-white transition-colors">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-white/70 hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#faq" className="text-white/70 hover:text-white transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="font-semibold uppercase tracking-wider text-white/40">Application</span>
              <ul className="space-y-2">
                <li>
                  <Link href="/login" className="text-white/70 hover:text-white transition-colors">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-white/70 hover:text-white transition-colors">
                    Get started
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-white/70 hover:text-white transition-colors">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3 col-span-2 sm:col-span-1">
              <span className="font-semibold uppercase tracking-wider text-white/40">Authors</span>
              <p className="text-white/70 leading-relaxed">
                Built by <strong>Om Wattamwar</strong> and <strong>Kavya Mittal</strong>
              </p>
              <p className="text-white/50 text-[11px]">
                Manipal University Jaipur
              </p>
              <p className="text-white/40 text-[10px]">
                Capstone Engineering Project
              </p>
            </div>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-white/40">
          <p>© {new Date().getFullYear()} Rehearse. Student project prototype.</p>
          <p className="text-[11px] text-white/30">Designed with AERIS aesthetic guidelines.</p>
        </div>
      </div>
    </footer>
  );
}
