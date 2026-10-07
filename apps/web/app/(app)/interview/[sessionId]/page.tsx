"use client";

import { useRouter, useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function InterviewActiveSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId as string;

  // Note: camera, mic, real-time transcription, and AI scoring will be added later.

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Interview in Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-mono text-muted uppercase tracking-wider">Active Session ID</p>
            <p className="font-mono text-sm mt-1">{sessionId}</p>
          </div>
          <p className="text-sm text-muted">
            Live mock interview in progress. (Camera, microphone, transcription, and real-time AI scoring will be integrated here).
          </p>
          <div className="pt-4">
            <Button variant="outline" onClick={() => router.push("/interview")}>
              End Interview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
