import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { WindRoseMark } from "@/components/landing/Navbar";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f0eded] dark:bg-[#000000] text-foreground font-mono transition-colors">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="Rehearse home">
          <WindRoseMark className="w-5 h-5 text-foreground group-hover:rotate-45 transition-transform duration-300" />
          <span className="font-mono text-sm font-bold tracking-tight">rehearse</span>
        </Link>
        <div className="flex items-center gap-4 text-xs font-mono">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            ← Home
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
          {/* Visual Showcase Card */}
          <div className="relative hidden md:flex md:col-span-5 rounded-2xl overflow-hidden bg-black text-white p-8 flex-col justify-between border border-white/10 shadow-2xl">
            <Image
              src="/assets/rehearse/topography.webp"
              alt="Elevation contours"
              fill
              className="object-cover opacity-25 mix-blend-screen pointer-events-none"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

            <div className="relative z-10 space-y-3">
              <span className="font-bubbledot text-xs tracking-widest text-[#F64302] uppercase">
                V/01 CANDIDATE ACCESS
              </span>
              <h2 className="font-bubbledot text-2xl font-bold tracking-tight text-white leading-tight">
                REAL-TIME CONVERSATIONAL EVALUATION.
              </h2>
            </div>

            <div className="relative z-10 pt-12 space-y-4">
              <div className="border-l-2 border-[#F64302] pl-3 text-xs text-white/70 space-y-1">
                <p>Voice-first technical assessment platform.</p>
                <p>Adaptive difficulty via Deepgram + Groq + LiveKit.</p>
              </div>
              <div className="text-[10px] text-white/40 tracking-wider font-mono">
                B.TECH CAPSTONE · MANIPAL UNIVERSITY JAIPUR
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="md:col-span-7 flex flex-col justify-center rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-6 sm:p-10 shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
