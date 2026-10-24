"use client";

/**
 * /interview – Entry page for starting a new interview session.
 *
 * Calls POST /api/interview/start which:
 *   1. Creates an InterviewSession row in the DB
 *   2. Creates a LiveKit room
 *   3. Returns a participant token for the browser
 *
 * The token is stored in sessionStorage so the [sessionId]/page.tsx
 * can retrieve it without making a second API call.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-16 px-4">
      <Card>
        <CardHeader>
          <CardTitle>AI Mock Interview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 text-sm text-muted">
            <p>
              You are about to start a live AI-powered mock interview with <strong>Aria</strong>,
              your personal interview coach.
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>Grant camera &amp; microphone access when prompted</li>
              <li>Aria will conduct the interview in real time using your resume and target JD</li>
              <li>The session is recorded for feedback — results appear at the end</li>
              <li>Default duration: 20 minutes</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="interview-lang" className="text-xs font-semibold uppercase tracking-wider text-muted">
              Interview Language
            </label>
            <select
              id="interview-lang"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
            <p className="text-[11px] text-muted">
              Aria will greet you, conduct the conversation, ask questions, and evaluate your responses in this language.
            </p>
          </div>

          {error && (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleStart}
            disabled={starting}
          >
            {starting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing your interview room...
              </>
            ) : (
              "Start Interview with Aria"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
