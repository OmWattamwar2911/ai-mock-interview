"use client";

import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

export function Products() {
  const { ref, revealed } = useReveal(0.1);

  const scrollToHowItWorks = () => {
    const el = document.getElementById("how-it-works");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={ref}
      id="features"
      className="w-full min-h-screen md:h-screen bg-[#E8E5E9] dark:bg-[#141414] p-2 sm:p-3 pt-20 sm:pt-24 md:pt-24"
    >
      <div className="grid h-full w-full grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
        {/* ── COLUMN 1: Skill Gap & Topography ─────────────────────────────── */}
        <div
          style={{ transitionDelay: "100ms" }}
          className={`relative min-h-[500px] flex flex-col justify-between overflow-hidden rounded-2xl p-4 sm:p-6 transition-all duration-800 ${
            revealed ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          {/* Topography Background */}
          <Image
            src="/assets/rehearse/topography.webp"
            alt="Monochrome topographic field with layered contours"
            fill
            className="object-cover pointer-events-none"
            priority={false}
          />
          <div className="absolute inset-0 bg-white/10 dark:bg-black/20 pointer-events-none" />

          {/* Top Content */}
          <div className="relative z-10" style={{ transitionDelay: "300ms" }}>
            <span className="font-bubbledot text-5xl sm:text-6xl font-bold text-black/80 dark:text-white/80">
              01
            </span>
            <p className="mt-3 font-mono text-xs sm:text-sm text-black/70 dark:text-white/70 max-w-xs leading-relaxed">
              A skill-gap map that shows exactly where your resume and the role you want do not yet meet.
            </p>
          </div>

          {/* Bottom Stack */}
          <div className="relative z-10 space-y-2 mt-8">
            {/* Bar Card */}
            <div
              style={{ transitionDelay: "450ms" }}
              className="flex items-center justify-between rounded-xl bg-[#EBE8EB] dark:bg-[#1f1f23] p-3 text-xs font-mono text-black dark:text-white shadow-sm border border-black/5"
            >
              <span className="font-medium max-w-[210px] leading-snug">
                From a resume and a job description to a personalised interview
              </span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-black text-white">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>

            {/* 5-column Subgrid */}
            <div className="grid grid-cols-5 gap-2">
              <div
                style={{ transitionDelay: "550ms" }}
                className="col-span-3 flex flex-col justify-between rounded-xl bg-[#f0eded] dark:bg-[#1a1a1e] p-3.5 border border-black/5"
              >
                <p className="font-mono text-[11px] leading-snug text-black/70 dark:text-white/70">
                  The question is not whether you can code, but whether you can explain it.
                </p>
                <span className="mt-4 font-jetbrains text-2xl sm:text-3xl font-bold tracking-tight text-black dark:text-white">
                  Profile
                </span>
              </div>

              <div
                style={{ transitionDelay: "650ms" }}
                className="col-span-2 flex items-end justify-center rounded-xl bg-[#f0eded] dark:bg-[#1a1a1e] p-3 border border-black/5"
              >
                <span className="font-bubbledot text-2xl sm:text-3xl font-bold text-black/60 dark:text-white/60">
                  R/06
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── COLUMN 2: Real-time Audio & Vision ──────────────────────────── */}
        <div
          style={{ transitionDelay: "250ms" }}
          className={`relative min-h-[500px] flex flex-col justify-between overflow-hidden rounded-2xl bg-[#0d0d11] p-4 sm:p-6 transition-all duration-800 ${
            revealed ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          {/* Sensor Video / Poster */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              poster="/assets/rehearse/sensor-poster.webp"
              className="h-full w-full object-cover"
            >
              <source src="/assets/rehearse/sensor-field.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />

          {/* Top Text Content */}
          <div className="relative z-10" style={{ transitionDelay: "450ms" }}>
            <p className="font-mono text-xs sm:text-sm text-white/70 leading-relaxed max-w-sm">
              Rehearse talks with you like a real interviewer: voice in, voice out, a live transcript, and follow-up questions based on what you actually said.
            </p>
            <p className="mt-4 font-mono text-xs sm:text-sm text-white/60 leading-relaxed max-w-sm">
              A built-in code editor and compiler lets the interviewer see your solution, run it against tests and guide you without giving the answer away.
            </p>
            <div className="mt-8 font-bubbledot text-5xl sm:text-6xl font-bold text-white tracking-wider">
              V/01
            </div>
          </div>

          {/* Bottom: 48px Orange Arrow Button */}
          <div className="relative z-10 mt-6" style={{ transitionDelay: "600ms" }}>
            <button
              type="button"
              onClick={scrollToHowItWorks}
              aria-label="Scroll to how it works section"
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F64302] text-white transition-transform hover:scale-105 active:scale-95 shadow-md"
            >
              <ArrowDown className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── COLUMN 3: Scored Feedback ───────────────────────────────────── */}
        <div
          style={{ transitionDelay: "400ms" }}
          className={`flex min-h-[500px] flex-col gap-2 sm:gap-3 rounded-2xl bg-white dark:bg-[#18181c] p-2 sm:p-3 transition-all duration-800 ${
            revealed ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          {/* Top Tile Row */}
          <div className="flex-1 flex flex-col justify-between overflow-hidden rounded-xl bg-[#0a0a0c] p-4 text-white relative">
            <div className="absolute inset-0 pointer-events-none opacity-30">
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                poster="/assets/rehearse/radar-poster.webp"
                className="h-full w-full object-cover"
              >
                <source src="/assets/rehearse/radar-close.mp4" type="video/mp4" />
              </video>
            </div>

            <div className="relative z-10">
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">
                Live Evaluation
              </span>
            </div>

            <div
              style={{ transitionDelay: "650ms" }}
              className="relative z-10 flex items-center justify-between rounded-lg bg-[#EBE8EB] dark:bg-[#202024] p-3 text-xs font-mono text-black dark:text-white border border-black/5 shadow-sm"
            >
              <span className="font-medium">Scored feedback after every session</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-white">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>

          {/* Bottom Card */}
          <div
            style={{ transitionDelay: "750ms" }}
            className="flex-1 flex flex-col justify-end rounded-xl bg-[#EBE8EB] dark:bg-[#202024] p-5 sm:p-6 border border-black/5"
          >
            <span className="font-bubbledot text-4xl sm:text-5xl font-bold text-black dark:text-white">
              S/01
            </span>
            <p className="mt-3 font-mono text-lg sm:text-xl font-semibold text-black dark:text-white tracking-tight leading-snug">
              Know exactly what to fix
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
