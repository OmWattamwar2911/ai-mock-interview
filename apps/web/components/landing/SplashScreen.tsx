"use client";

import { useEffect, useRef, useState } from "react";

export function SplashScreen({ onComplete }: { onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fading, setFading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show only once per browser session
    if (typeof window !== "undefined") {
      const shown = sessionStorage.getItem("rehearse_splash_seen");
      if (shown) {
        setDismissed(true);
        onComplete?.();
        return;
      }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check prefers-reduced-motion
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setFading(true);
      const timer = setTimeout(() => {
        sessionStorage.setItem("rehearse_splash_seen", "1");
        setDismissed(true);
        onComplete?.();
      }, 200);
      return () => clearTimeout(timer);
    }

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const blockSize = 10;
    const maxRadius = Math.sqrt(width * width + height * height) / 2;
    const duration = 1800; // ms

    // Pre-generate 360 ring blocks
    const ring1 = Array.from({ length: 360 }, (_, i) => ({
      angle: ((2 * Math.PI) / 360) * i + (Math.random() - 0.5) * 0.02,
      offsetFactor: 0.85 + Math.random() * 0.3, // 0.85 to 1.15
    }));

    // Second ring of 180 blocks
    const ring2 = Array.from({ length: 180 }, (_, i) => ({
      angle: ((2 * Math.PI) / 180) * i + (Math.random() - 0.5) * 0.03,
      radiusFactor: 0.92 + Math.random() * 0.12, // 0.92 to 1.04
    }));

    let startTime: number | null = null;
    let animId: number;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const render = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / duration);
      const currentRadius = easeOutCubic(progress) * maxRadius;

      // Clear & fill black
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // Punch expanding circular hole with destination-out
      ctx.globalCompositeOperation = "destination-out";

      // 1. Punch main filled circle
      const innerRadius = Math.max(0, currentRadius - blockSize * 2);
      if (innerRadius > 0) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#000000";
        ctx.fill();
      }

      // 2. Punch 360 ring blocks
      ctx.fillStyle = "#000000";
      for (let i = 0; i < ring1.length; i++) {
        const { angle, offsetFactor } = ring1[i];
        const r = currentRadius * offsetFactor;
        const x = width / 2 + Math.cos(angle) * r - blockSize / 2;
        const y = height / 2 + Math.sin(angle) * r - blockSize / 2;
        ctx.fillRect(x, y, blockSize, blockSize);
      }

      // 3. Punch second ring of 180 blocks
      const s2 = blockSize * 0.8;
      for (let i = 0; i < ring2.length; i++) {
        const { angle, radiusFactor } = ring2[i];
        const r = currentRadius * radiusFactor;
        const x = width / 2 + Math.cos(angle) * r - s2 / 2;
        const y = height / 2 + Math.sin(angle) * r - s2 / 2;
        ctx.fillRect(x, y, s2, s2);
      }

      if (progress < 1) {
        animId = requestAnimationFrame(render);
      } else {
        // Finish with 400ms opacity fade
        setFading(true);
        setTimeout(() => {
          sessionStorage.setItem("rehearse_splash_seen", "1");
          setDismissed(true);
          onComplete?.();
        }, 400);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [onComplete]);

  if (dismissed) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-400 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full block" />
    </div>
  );
}
