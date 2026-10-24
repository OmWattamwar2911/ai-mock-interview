"use client";

import { useEffect, useRef } from "react";
import { SplashScreen } from "@/components/landing/SplashScreen";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { About } from "@/components/landing/About";
import { Products } from "@/components/landing/Products";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Faq } from "@/components/landing/Faq";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  // Pause video when tab is hidden or off-screen for performance
  useEffect(() => {
    const handleVisibility = () => {
      if (!bgVideoRef.current) return;
      if (document.hidden) {
        bgVideoRef.current.pause();
      } else {
        bgVideoRef.current.play().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return (
    <div className="relative w-full overflow-x-hidden selection:bg-[#F64302] selection:text-white">
      {/* ── Fixed Background Video Layer ───────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video
          ref={bgVideoRef}
          autoPlay
          muted
          loop
          playsInline
          poster="/assets/rehearse/hero-poster.webp"
          className="h-full w-full object-cover"
        >
          <source src="/assets/rehearse/hero-atmosphere.mp4" type="video/mp4" />
        </video>
        {/* Absolute 30% black veil overlay */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* ── Splash Screen (SessionStorage once-only) ───────────────────────── */}
      <SplashScreen />

      {/* ── Fixed Navigation Bar ─────────────────────────────────────────── */}
      <Navbar />

      {/* ── Landing Sections (relative z-10) ──────────────────────────────── */}
      <main className="relative z-10">
        <Hero />
        <About />
        <Products />
        <HowItWorks />
        <Faq />
      </main>

      {/* ── Minimal Black Footer ─────────────────────────────────────────── */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
