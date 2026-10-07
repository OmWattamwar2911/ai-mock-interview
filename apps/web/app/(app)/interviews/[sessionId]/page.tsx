"use client";

import { useRouter, useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function InterviewSessionPage() {
  const router = useRouter();
  const { sessionId } = useParams() as { sessionId: string };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Interview Session: {sessionId}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">Placeholder for interview UI (camera, mic, transcription, AI scoring).</p>
        <Button onClick={() => router.push("/interviews")}>End Interview</Button>
      </CardContent>
    </Card>
  );
}
