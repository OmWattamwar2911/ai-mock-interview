"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, Mic, Video, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InterviewPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const loading = status === "loading";

  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !session?.user) {
      router.replace("/login");
    }
  }, [loading, session, router]);

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

      // Cache the token so the session page doesn't need to re-fetch
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
      <div className="flex min-h-[60vh] items-center justify-center font-mono">
        <Loader2 className="h-6 w-6 animate-spin text-[#F64302]" />
      </div>
    );
  }

  return (
    <div className="space-y-3 font-mono">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="font-bubbledot text-xs text-[#F64302] tracking-wider uppercase">01 / LIVE REHEARSAL</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#F64302] animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-jetbrains font-bold tracking-tight text-foreground mt-1">
          INTERVIEW LAUNCHPAD
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Connect to Aria, our conversational AI interviewer powered by Deepgram streaming STT and Groq inference.
        </p>
      </div>

      {/* Main Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
        <div className="md:col-span-8 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 sm:p-6 space-y-5">
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F64302]" /> Protocol & Instructions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40 flex items-start gap-2.5">
                <Mic className="w-4 h-4 text-[#F64302] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-foreground">Voice First</span>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Real-time full-duplex WebRTC with immediate turn endpointing.</p>
                </div>
              </div>
              <div className="p-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40 flex items-start gap-2.5">
                <Video className="w-4 h-4 text-[#F64302] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-foreground">Video Stream</span>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Camera feed analyzed for candidate engagement and presence.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/10">
            <label htmlFor="interview-lang" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Interview Evaluation Language
            </label>
            <select
              id="interview-lang"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full bg-white/70 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-foreground font-mono focus:outline-none focus:border-[#F64302] focus:ring-1 focus:ring-[#F64302]"
            >
              <option value="en">English (US / UK / Global)</option>
              <option value="es">Spanish (Español)</option>
              <option value="fr">French (Français)</option>
              <option value="de">German (Deutsch)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="zh">Mandarin Chinese (中文)</option>
              <option value="ja">Japanese (日本語)</option>
              <option value="pt">Portuguese (Português)</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Aria will conduct technical inquiry, hints, and feedback in this language.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-[#F64302]/30 bg-[#F64302]/10 p-3 text-xs text-[#F64302]">
              {error}
            </div>
          )}

          <Button
            className="w-full h-12 rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md shadow-[#F64302]/20 flex items-center justify-center gap-2"
            onClick={handleStart}
            disabled={starting}
          >
            {starting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Initializing LiveKit Room & Agent Session…</span>
              </>
            ) : (
              <>
                <span>Enter Rehearsal with Aria</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        <div className="md:col-span-4 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="font-bubbledot text-xs text-[#F64302]">02 / AGENT DETAILS</span>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="p-3 rounded-xl bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/10 space-y-1">
                <span className="font-bold text-foreground block uppercase text-[10px] tracking-wider">Interviewer</span>
                <p className="text-foreground font-semibold">Aria (Voice Agent)</p>
                <p className="text-[11px]">B.Tech Capstone Model · Manipal University Jaipur</p>
              </div>
              <div className="p-3 rounded-xl bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/10 space-y-1">
                <span className="font-bold text-foreground block uppercase text-[10px] tracking-wider">Round Structure</span>
                <p className="text-foreground">Introduction → Behavioral → Technical Coding → Candidate Q&A</p>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secure WebRTC Session</span>
          </div>
        </div>
      </div>
    </div>
  );
}
