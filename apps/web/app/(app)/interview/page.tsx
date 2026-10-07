"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function InterviewPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const loading = status === "loading";

  const [sessionId, setSessionId] = useState<string>("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetchingSession, setIsFetchingSession] = useState<boolean>(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !session?.user) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  // Fetch interview session via proxy API route
  useEffect(() => {
    if (loading || !session?.user) return;

    let mounted = true;
    async function fetchSession() {
      try {
        setIsFetchingSession(true);
        const res = await fetch("/api/interview/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          throw new Error(`Failed to initialize session (status ${res.status})`);
        }
        const data = await res.json();
        if (mounted) {
          setSessionId(data.sessionId);
          setQuestions(data.questions || []);
        }
      } catch (e: any) {
        if (mounted) {
          setError(e.message || "Failed to start interview session");
        }
      } finally {
        if (mounted) {
          setIsFetchingSession(false);
        }
      }
    }

    fetchSession();

    return () => {
      mounted = false;
    };
  }, [loading, session]);

  if (loading || isFetchingSession) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Preparing Interview...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">
              Generating tailored questions and setting up your mock interview session...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <Card className="border-red-500/50">
          <CardHeader>
            <CardTitle className="text-red-500">Failed to load interview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                setIsFetchingSession(true);
                window.location.reload();
              }}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>AI Mock Interview Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-xs font-mono text-muted uppercase tracking-wider">Session ID</p>
            <p className="font-mono text-sm mt-1">{sessionId}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Interview Questions:</h4>
            <ul className="list-decimal space-y-2 pl-5 text-sm">
              {questions.map((q, i) => (
                <li key={i} className="text-foreground leading-relaxed">
                  {q}
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-2">
            <Button
              className="w-full sm:w-auto"
              onClick={() => router.push(`/interview/${sessionId}`)}
            >
              Start Interview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
