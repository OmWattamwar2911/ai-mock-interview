"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Loader2,
  Mic,
  Video,
  ShieldCheck,
  ArrowRight,
  Play,
  Volume2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Briefcase,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { BentoCard } from "@/components/ui/bento-card";
import { SkeletonCard } from "@/components/ui/skeleton-card";

export default function InterviewPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const loading = status === "loading";

  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Configuration options
  const [targetRole, setTargetRole] = useState("Full Stack Software Engineer");
  const [targetCompany, setTargetCompany] = useState("Tech Industry Standard");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [duration, setDuration] = useState("45");

  // Mic & Camera Check State
  const [testingMedia, setTestingMedia] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !session?.user) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  // Handle live media check (Mic & Camera)
  const toggleMediaCheck = async () => {
    if (testingMedia) {
      // Stop media tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setTestingMedia(false);
      setCameraActive(false);
      setMicLevel(0);
      return;
    }

    try {
      setTestingMedia(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);

      // Web Audio API for Live Mic Level Meter
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        if (!mediaStreamRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicLevel(normalized);
        requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch (err: any) {
      console.warn("Could not access camera/mic:", err?.message);
      setError("Please allow camera and microphone permissions to run the rehearsal check.");
      setTestingMedia(false);
    }
  };

  // Cleanup media on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleStart = async () => {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: selectedLanguage }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || `Failed to start interview (${res.status})`);
      }

      const { sessionId, token, wsUrl } = data;

      sessionStorage.setItem(`lk-token-${sessionId}`, token);
      sessionStorage.setItem(`lk-url-${sessionId}`, wsUrl);

      router.push(`/interview/${sessionId}`);
    } catch (err: any) {
      setError(err.message || "Failed to start interview. Please try again.");
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <SkeletonCard lines={4} hasHeader />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-mono pb-12">
      {/* Page Header */}
      <PageHeader
        eyebrow="Interactive AI Rehearsal"
        title="Interview setup"
        subtitle="Calibrate your session parameters, test your audio and video feed, and launch your voice evaluation with Aria."
      />

      {/* Focused Setup Card */}
      <BentoCard padded="spacious" className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-jetbrains font-bold text-foreground">
            Session parameters
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Configure the target role and language. Aria adapts difficulty dynamically based on your spoken answers.
          </p>
        </div>

        {/* Configuration Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Target Role */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#F64302]" />
              Target Role
            </label>
            <Input
              className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs"
              placeholder="e.g. Senior Backend Engineer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              disabled={starting}
            />
          </div>

          {/* Target Company */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#F64302]" />
              Target Company
            </label>
            <Input
              className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs"
              placeholder="e.g. Stripe, Google, or Startup"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              disabled={starting}
            />
          </div>

          {/* Evaluation Language */}
          <div>
            <label
              htmlFor="interview-lang"
              className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F64302]" />
              Interview Language
            </label>
            <select
              id="interview-lang"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              disabled={starting}
              className="w-full bg-white/70 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-[#F64302] focus:ring-1 focus:ring-[#F64302]"
            >
              <option value="en">English (Global / Tech)</option>
              <option value="es">Spanish (Español)</option>
              <option value="fr">French (Français)</option>
              <option value="de">German (Deutsch)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="zh">Mandarin Chinese (中文)</option>
              <option value="ja">Japanese (日本語)</option>
              <option value="pt">Portuguese (Português)</option>
            </select>
          </div>

          {/* Session Duration */}
          <div>
            <label
              htmlFor="duration-select"
              className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-[#F64302]" />
              Session Duration
            </label>
            <select
              id="duration-select"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={starting}
              className="w-full bg-white/70 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-[#F64302] focus:ring-1 focus:ring-[#F64302]"
            >
              <option value="30">30 Minutes (Rapid Evaluation)</option>
              <option value="45">45 Minutes (Standard Technical &amp; System)</option>
              <option value="60">60 Minutes (Comprehensive Deep Dive)</option>
            </select>
          </div>
        </div>

        {/* ── Microphone & Camera Live Check ──────────────────────────────── */}
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-jetbrains font-bold text-sm text-foreground">
                Camera &amp; microphone check
              </p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                Verify your audio levels and camera feed before entering the LiveKit room.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={toggleMediaCheck}
              className="rounded-xl font-mono text-xs font-semibold shrink-0 gap-2 border-black/10 dark:border-white/10"
            >
              {testingMedia ? "Stop test" : "Test mic & camera"}
            </Button>
          </div>

          {testingMedia && (
            <div className="grid sm:grid-cols-2 gap-4 pt-2 animate-in fade-in-50 duration-200">
              {/* Mic Level Meter */}
              <div className="rounded-xl bg-black/5 dark:bg-white/5 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-foreground">
                    <Mic className="w-4 h-4 text-[#F64302]" />
                    Microphone Input
                  </span>
                  <span className="font-bubbledot font-bold text-xs text-[#F64302]">{micLevel}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#F64302] transition-all duration-75"
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Speak aloud to verify turn endpointing. Green signal indicates clear audio.
                </p>
              </div>

              {/* Camera Preview */}
              <div className="rounded-xl bg-black/5 dark:bg-white/5 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-foreground">
                    <Video className="w-4 h-4 text-[#F64302]" />
                    Camera Feed
                  </span>
                  <span className="text-[10px] text-emerald-500 font-bold uppercase">Live</span>
                </div>
                <div className="relative h-28 w-full rounded-lg bg-black overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 3 Short Steps: What will happen ─────────────────────────────── */}
        <div className="space-y-3 pt-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            What will happen in your interview
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/70 dark:bg-black/30 border border-black/5 dark:border-white/10 p-3.5 space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F64302] text-white text-[10px] font-bubbledot font-bold">
                  1
                </span>
                <span className="font-jetbrains font-bold text-xs text-foreground">
                  Greeting &amp; Intro
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Aria introduces herself, confirms your preferred name, and conducts brief warm-up inquiry.
              </p>
            </div>

            <div className="rounded-xl bg-white/70 dark:bg-black/30 border border-black/5 dark:border-white/10 p-3.5 space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F64302] text-white text-[10px] font-bubbledot font-bold">
                  2
                </span>
                <span className="font-jetbrains font-bold text-xs text-foreground">
                  Adaptive Inquiry
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                You work through technical problems and code implementation with live compiler tests and hints.
              </p>
            </div>

            <div className="rounded-xl bg-white/70 dark:bg-black/30 border border-black/5 dark:border-white/10 p-3.5 space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F64302] text-white text-[10px] font-bubbledot font-bold">
                  3
                </span>
                <span className="font-jetbrains font-bold text-xs text-foreground">
                  Feedback Report
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Immediate comprehensive scoring across technical depth, communication, and actionable next steps.
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-500 flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Single Primary Action Button */}
        <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
          <Button
            onClick={handleStart}
            disabled={starting}
            className="w-full h-12 rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#F64302]/25 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            {starting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Initializing LiveKit WebRTC Session…</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Start interview now →</span>
              </>
            )}
          </Button>
        </div>
      </BentoCard>
    </div>
  );
}
