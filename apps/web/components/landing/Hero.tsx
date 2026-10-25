"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";

export function Hero() {
  const { data: session } = useSession();

  return (
    <section
      id="hero"
      className="relative flex min-h-screen w-full flex-col justify-between px-6 pt-32 pb-12 sm:px-10 lg:px-16"
    >
      {/* Top / Main Title Region */}
      <div className="max-w-5xl pt-12 md:pt-20">
        <p
          style={{ animationDelay: "300ms" }}
          className="animate-fade-up font-mono text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-white/70"
        >
          AI MOCK INTERVIEW PLATFORM
        </p>
        <h1
          style={{ animationDelay: "500ms" }}
          className="mt-6 animate-fade-up font-jetbrains text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]"
        >
          Rehearse the Interview.
          <br />
          Own the Room.
        </h1>
      </div>

      {/* Bottom Row */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between pb-4 sm:pb-8">
        <p
          style={{ animationDelay: "700ms" }}
          className="animate-fade-up max-w-sm font-mono text-xs sm:text-sm leading-relaxed text-white/60"
        >
          Upload your resume and a job description. Rehearse runs a voice interview, a live coding round and a scored report, built around you.
        </p>

        <div style={{ animationDelay: "900ms" }} className="animate-fade-up shrink-0">
          <Link
            href={session ? "/dashboard" : "/login"}
            className="group inline-flex items-center gap-4 rounded-xl bg-black p-1.5 pl-5 text-sm font-mono font-medium text-white transition-all hover:scale-[1.02] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
          >
            <span>Start a Mock Interview</span>
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F64302] transition-transform group-hover:translate-x-0.5">
              <ChevronRight className="h-5 w-5 text-white" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
