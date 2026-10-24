"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

export function About() {
  const { ref, revealed } = useReveal(0.1);

  return (
    <section
      ref={ref}
      id="about"
      className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden bg-[#f0eded] dark:bg-[#111114] px-6 py-20 sm:px-10 lg:px-16"
    >
      {/* Video & Poster Fallback Background Layer */}
      <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply dark:mix-blend-screen dark:opacity-25">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster="/assets/rehearse/about-poster.webp"
          className="h-full w-full object-cover"
        >
          <source src="/assets/rehearse/about-clouds.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Top Left Content */}
      <div
        className={`relative z-10 max-w-sm transition-all duration-800 ${
          revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
        style={{ transitionDelay: "100ms" }}
      >
        <p className="font-mono text-xs sm:text-sm leading-relaxed text-black/80 dark:text-white/80">
          Rehearse turns your resume and a job description into a complete, personalised interview, covering HR, behavioural and technical rounds, so you walk in already warmed up.
        </p>

        <div
          className={`mt-6 transition-all duration-800 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "250ms" }}
        >
          <Link
            href="/onboarding"
            className="group inline-flex items-center gap-3 rounded-xl bg-white p-1 pl-4 text-xs font-mono font-semibold text-black shadow-sm transition-all hover:scale-[1.02] border border-black/5"
          >
            <span>Upload Your Resume</span>
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-black transition-transform group-hover:translate-x-0.5">
              <ChevronRight className="h-4 w-4 text-white" />
            </span>
          </Link>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between pt-16">
        {/* Bottom Left */}
        <div
          className={`max-w-md transition-all duration-800 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "400ms" }}
        >
          <h2 className="font-mono text-2xl sm:text-3xl lg:text-4xl font-medium leading-snug tracking-tight text-black dark:text-white">
            Meet Rehearse. Built to{" "}
            <span className="text-black/40 dark:text-white/40">read your resume</span> and{" "}
            <span className="text-black dark:text-white font-semibold">make practice feel real.</span>
          </h2>
        </div>

        {/* Bottom Right */}
        <div
          className={`max-w-lg md:text-right transition-all duration-800 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "550ms" }}
        >
          <p className="font-mono text-lg sm:text-2xl lg:text-3xl font-medium leading-snug tracking-tight text-black dark:text-white">
            Follow one answer and see how{" "}
            <span className="text-black/40 dark:text-white/40">small improvements</span> become{" "}
            <strong className="font-bold text-black dark:text-white">interview-ready confidence.</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
