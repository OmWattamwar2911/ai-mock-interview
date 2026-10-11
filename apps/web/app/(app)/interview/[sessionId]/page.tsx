"use client";

/**
 * Interview active session page – LiveKit real-time bot interview.
 *
 * Flow:
 *  1. On mount, call POST /api/interview/start to get a LiveKit token + wsUrl
 *  2. Connect to the room via @livekit/components-react
 *  3. The bot joins automatically as "interview-bot"
 *  4. Show: candidate video, bot audio-reactive orb, live captions, End Interview button
 *  5. On end: poll until session status = COMPLETED, then navigate to /report
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  LiveKitRoom,
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Loader2, PhoneOff } from "lucide-react";

// ── Audio-reactive orb (pure CSS animation) ───────────────────────────────
function BotOrb({ speaking }: { speaking: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`relative flex items-center justify-center rounded-full border border-border
          ${speaking ? "w-28 h-28 shadow-lg shadow-accent/30" : "w-24 h-24"} 
          transition-all duration-300 bg-elevated`}
      >
        {/* Pulsing rings when speaking */}
        {speaking && (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/20" />
            <span className="absolute inline-flex h-3/4 w-3/4 animate-ping rounded-full bg-accent/10 delay-150" />
          </>
        )}
        <span className="relative text-4xl select-none">🎙️</span>
      </div>
      <p className="text-xs text-muted font-mono">
        {speaking ? "Aria is speaking..." : "Aria is listening"}
      </p>
    </div>
  );
}

// ── Candidate video tile ───────────────────────────────────────────────────
function CandidateVideo() {
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera], {
    onlySubscribed: false,
  }).filter((t) => t.participant.identity === localParticipant?.identity);

  if (!tracks.length)
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded border border-border bg-elevated text-muted text-sm">
        No camera feed
      </div>
    );

  const { ElementType = "video", publication } = tracks[0] as any;
  return (
    <video
      ref={(el) => {
        if (el && publication?.track) publication.track.attach(el);
      }}
      autoPlay
      muted
      playsInline
      className="aspect-video w-full rounded border border-border object-cover bg-black"
    />
  );
}

// ── Live captions (from bot data messages) ────────────────────────────────
function useLiveCaptions() {
  const [caption, setCaption] = useState("");
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;
    const handler = (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const msg = JSON.parse(text);
        if (msg.type === "caption") {
          setCaption(msg.text);
          setTimeout(() => setCaption(""), 6000);
        }
      } catch { }
    };
    (room as any).on("dataReceived", handler);
    return () => {
      (room as any).off("dataReceived", handler);
    };
  }, [room]);

  return caption;
}

// ── Inner room component (needs to be a child of <LiveKitRoom>) ───────────
function RoomContent({
  sessionId,
  onEnd,
}: {
  sessionId: string;
  onEnd: () => void;
}) {
  const remoteParticipants = useRemoteParticipants();
  const botParticipant = remoteParticipants.find((p) =>
    p.identity.startsWith("interview-bot")
  );
  const isBotSpeaking = !!botParticipant?.isSpeaking;
  const caption = useLiveCaptions();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">AI Mock Interview</h1>
          <p className="text-sm text-muted">
            {botParticipant ? "Aria has joined · interview in progress" : "Waiting for Aria to join..."}
          </p>
        </div>
        <Button variant="outline" className="gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10" onClick={onEnd}>
          <PhoneOff className="h-4 w-4" />
          End Interview
        </Button>
      </div>

      {/* Video grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Bot orb */}
        <div className="flex flex-col items-center justify-center rounded border border-border bg-surface p-8">
          <BotOrb speaking={isBotSpeaking} />
        </div>

        {/* Candidate camera */}
        <div className="rounded border border-border bg-surface p-2">
          <CandidateVideo />
          <p className="mt-2 text-center text-xs text-muted font-mono">You</p>
        </div>
      </div>

      {/* Live captions */}
      {caption && (
        <div className="rounded border border-border bg-elevated px-4 py-3 text-sm font-mono text-muted">
          {caption}
        </div>
      )}

      {/* Audio renderer (plays bot voice) */}
      <RoomAudioRenderer />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function InterviewSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  // On mount, fetch (or reuse) the token for this session
  useEffect(() => {
    async function init() {
      // The session was already created by /interview/page.tsx via POST /api/interview/start
      // We just need the token for this session – fetch it from session storage if present
      const cached = sessionStorage.getItem(`lk-token-${sessionId}`);
      const cachedUrl = sessionStorage.getItem(`lk-url-${sessionId}`);
      if (cached && cachedUrl) {
        setToken(cached);
        setWsUrl(cachedUrl);
        return;
      }

      // Shouldn't normally reach here, but safe fallback
      setError("Session token not found. Please go back and start a new interview.");
    }
    init();
  }, [sessionId]);

  const handleEnd = useCallback(async () => {
    if (ending) return;
    setEnding(true);
    // Trigger bot to end the interview and post results
    try {
      await fetch(`/api/interview/${sessionId}/end`, { method: "POST" });
    } catch { }
    // Poll for COMPLETED status then navigate to report
    let attempts = 0;
    while (attempts < 20) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/interview/${sessionId}`);
        const data = await res.json();
        if (data?.status === "COMPLETED") break;
      } catch { }
      attempts++;
    }
    router.push(`/interview/${sessionId}/report`);
  }, [sessionId, router, ending]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-sm text-red-400 mb-4">{error}</p>
        <Button onClick={() => router.push("/interview")}>Back to Interview</Button>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div className="flex h-screen items-center justify-center gap-3 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Connecting to interview room...</span>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={wsUrl}
      token={token}
      connect={true}
      video={true}
      audio={true}
      onDisconnected={() => {
        // Bot disconnected or interview ended
        router.push(`/interview/${sessionId}/report`);
      }}
    >
      <RoomContent sessionId={sessionId} onEnd={handleEnd} />
    </LiveKitRoom>
  );
}
