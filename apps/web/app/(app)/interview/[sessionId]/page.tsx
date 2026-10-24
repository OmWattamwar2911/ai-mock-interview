"use client";

/**
 * Interview active session page – Upgraded LiveKit real-time AI interviewer with:
 *  1. Natural Human Interviewer (Aria) with turn detection and immediate responsiveness.
 *  2. Speaking glow on avatars (Aria purple, Candidate emerald) with status labels (Speaking, Listening, Thinking)
 *     and 300ms silence fade, respecting prefers-reduced-motion.
 *  3. Live transcript panel with chat-style utterances, interim updating, auto-scroll toggle & pause button,
 *     pre-loading past transcripts on refresh, and development debug counter.
 *  4. Seamless multi-layout modes (Video/Conversation, Technical Round, Split View) with agent-driven auto-switching.
 *  5. WebRTC audio capture constraints (echoCancellation, noiseSuppression, autoGainControl) preventing feedback loops.
 *  6. Real-time debounced code streaming over LiveKit data channel with execution via @rehearse/compiler.
 */

import { useEffect, useState, useCallback, useRef } from "react";
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
import {
  Loader2,
  PhoneOff,
  Code2,
  Video,
  Columns,
  CheckCircle2,
  MessageSquare,
  Pause,
  Play,
  User,
  Sparkles,
} from "lucide-react";
import { CodeEditorPanel, type Language, type Result } from "@/components/code-editor/code-editor-panel";

// ── Types ─────────────────────────────────────────────────────────────────
export interface TranscriptItem {
  id: string;
  speaker: "bot" | "candidate";
  name: string;
  timestamp: string;
  text: string;
  isInterim?: boolean;
  confidence?: number;
  lowConfidence?: boolean;
}

// ── Speaking Avatar Glow Ring for Aria ────────────────────────────────────
function AriaAvatar({
  speaking,
  thinking,
  mini = false,
}: {
  speaking: boolean;
  thinking: boolean;
  mini?: boolean;
}) {
  let statusText = "Listening";
  let statusColor = "text-muted";
  let ringClasses = "border-border shadow-none";

  if (speaking) {
    statusText = "Speaking";
    statusColor = "text-[#F64302] font-semibold";
    ringClasses =
      "border-[#F64302] shadow-[0_0_30px_rgba(246,67,2,0.6)] ring-4 ring-[#F64302]/30 animate-pulse motion-reduce:animate-none motion-reduce:ring-4";
  } else if (thinking) {
    statusText = "Thinking...";
    statusColor = "text-amber-400 font-semibold";
    ringClasses =
      "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)] ring-2 ring-amber-400/30 animate-pulse motion-reduce:animate-none";
  }

  if (mini) {
    return (
      <div className="flex items-center gap-2.5">
        <div
          className={`relative flex items-center justify-center rounded-full border bg-elevated transition-all duration-300 ${
            speaking ? "w-9 h-9" : "w-8 h-8"
          } ${ringClasses}`}
        >
          <span className="text-sm select-none">🎙️</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium leading-none">Aria</span>
          <span className={`text-[10px] font-mono mt-0.5 ${statusColor}`}>{statusText}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`relative flex items-center justify-center rounded-full border bg-elevated transition-all duration-300 ${
          speaking ? "w-28 h-28" : "w-24 h-24"
        } ${ringClasses}`}
      >
        {speaking && (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F64302]/20 motion-reduce:hidden" />
            <span className="absolute inline-flex h-3/4 w-3/4 animate-ping rounded-full bg-[#F64302]/10 delay-150 motion-reduce:hidden" />
          </>
        )}
        {thinking && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 motion-reduce:hidden" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-[9px] text-black font-bold items-center justify-center">
              •
            </span>
          </span>
        )}
        <span className="relative text-4xl select-none">🎙️</span>
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold tracking-tight">Aria (AI Interviewer)</p>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              speaking
                ? "bg-[#F64302] animate-pulse motion-reduce:animate-none"
                : thinking
                ? "bg-amber-400 animate-bounce motion-reduce:animate-none"
                : "bg-muted/60"
            }`}
          />
          <span className={`text-xs font-mono capitalize ${statusColor}`}>{statusText}</span>
        </div>
      </div>
    </div>
  );
}

// ── Candidate video tile with Speaking Glow Ring ──────────────────────────
function CandidateTile({
  speaking,
  mini = false,
}: {
  speaking: boolean;
  mini?: boolean;
}) {
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera], {
    onlySubscribed: false,
  }).filter((t) => t.participant.identity === localParticipant?.identity);

  const ringClasses = speaking
    ? "border-white shadow-[0_0_25px_rgba(255,255,255,0.6)] ring-4 ring-white/30 animate-pulse motion-reduce:animate-none motion-reduce:ring-4"
    : "border-border shadow-none";

  const statusLabel = speaking ? "Speaking" : "Listening";
  const statusColor = speaking ? "text-white font-semibold" : "text-muted";

  if (!tracks.length) {
    return (
      <div className="flex flex-col items-center">
        <div
          className={`flex items-center justify-center rounded-xl border bg-elevated text-muted text-xs transition-all duration-300 ${
            mini ? "w-28 h-20" : "aspect-video w-full max-h-[260px]"
          } ${ringClasses}`}
        >
          <div className="flex flex-col items-center gap-1 text-muted">
            <User className="h-6 w-6 opacity-60" />
            <span className="text-[11px]">Camera off</span>
          </div>
        </div>
        {!mini && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                speaking ? "bg-white animate-pulse shadow-[0_0_8px_white] motion-reduce:animate-none" : "bg-muted/60"
              }`}
            />
            <span className={`text-xs font-mono ${statusColor}`}>You ({statusLabel})</span>
          </div>
        )}
      </div>
    );
  }

  const { publication } = (tracks[0] as any) || {};

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
          mini ? "w-28 h-20" : "aspect-video w-full max-h-[260px]"
        } ${ringClasses}`}
      >
        <video
          ref={(el) => {
            if (el && publication?.track) publication.track.attach(el);
          }}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover bg-black"
        />
      </div>
      {!mini && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              speaking ? "bg-white animate-pulse shadow-[0_0_8px_white] motion-reduce:animate-none" : "bg-muted/60"
            }`}
          />
          <span className={`text-xs font-mono ${statusColor}`}>You ({statusLabel})</span>
        </div>
      )}
    </div>
  );
}

// ── Live Transcript Panel Component ───────────────────────────────────────
function LiveTranscriptPanel({
  entries,
  visible,
  eventCount,
  onToggleVisible,
}: {
  entries: TranscriptItem[];
  visible: boolean;
  eventCount: number;
  onToggleVisible: () => void;
}) {
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 30;
    if (autoScroll && !atBottom) {
      setAutoScroll(false);
    } else if (!autoScroll && atBottom) {
      setAutoScroll(true);
    }
  };

  if (!visible) {
    return (
      <Button
        variant="outline"
        onClick={onToggleVisible}
        className="h-8 gap-2 text-xs border-border bg-surface hover:bg-elevated text-muted hover:text-foreground"
      >
        <MessageSquare className="h-3.5 w-3.5 text-primary" /> Show Transcript ({entries.length})
      </Button>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[340px] max-h-[460px] rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
      {/* Transcript Header */}
      <div className="flex items-center justify-between border-b border-border bg-elevated/50 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold tracking-wide uppercase text-muted">
            Live Dialogue Transcript
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary font-bold">
            {entries.length}
          </span>
          {process.env.NODE_ENV !== "production" && (
            <span className="text-[10px] font-mono text-muted/70 ml-1">
              (events: {eventCount})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            onClick={() => setAutoScroll((prev) => !prev)}
            className="h-7 px-2 text-[11px] gap-1 text-muted hover:text-foreground"
            title={autoScroll ? "Pause auto-scrolling" : "Resume auto-scrolling"}
          >
            {autoScroll ? (
              <>
                <Pause className="h-3 w-3 text-amber-400" /> Auto-scroll on
              </>
            ) : (
              <>
                <Play className="h-3 w-3 text-emerald-400" /> Auto-scroll paused
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={onToggleVisible}
            className="h-7 px-2 text-[11px] text-muted hover:text-foreground"
          >
            Hide
          </Button>
        </div>
      </div>

      {/* Transcript Messages Body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 space-y-2.5 overflow-y-auto p-3 text-xs"
      >
        {entries.length === 0 ? (
          <div className="flex h-44 flex-col items-center justify-center text-center text-muted gap-2">
            <Sparkles className="h-5 w-5 opacity-40 text-primary animate-pulse" />
            <p className="text-xs font-medium">Waiting for speech...</p>
            <p className="text-[11px] opacity-70">
              Spoken conversation and questions will appear here in real time.
            </p>
          </div>
        ) : (
          entries.map((item) => {
            const isBot = item.speaker === "bot";
            const hintMatch = item.text.match(/^\[Hint Level (\d)\]\s*([\s\S]*)$/);
            return (
              <div
                key={item.id}
                className={`rounded-xl p-3 transition-all ${
                  hintMatch
                    ? "bg-[#F64302]/15 border border-[#F64302]/40 mr-4"
                    : isBot
                    ? "bg-[#F64302]/10 border border-[#F64302]/25 mr-4"
                    : "bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/20 ml-4 text-foreground"
                } ${item.isInterim ? "opacity-75 italic" : ""}`}
              >
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider mb-1">
                  <div className="flex items-center gap-1.5">
                    {hintMatch ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#F64302]/20 text-[#F64302] font-mono text-[9px] font-bold border border-[#F64302]/40">
                        <Sparkles className="h-2.5 w-2.5" /> Hint Level {hintMatch[1]}
                      </span>
                    ) : (
                      <span className={isBot ? "text-[#F64302] font-bold" : "text-foreground font-bold"}>
                        {item.name}
                      </span>
                    )}
                    {item.lowConfidence && !isBot && (
                      <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[8px] font-mono text-amber-300 border border-amber-500/30">
                        Low Confidence
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-muted/60 text-[9px]">{item.timestamp}</span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {hintMatch ? hintMatch[2] : item.text}
                </p>
                {item.isInterim && (
                  <span className="mt-1 inline-block text-[9px] font-mono text-primary animate-pulse">
                    speaking...
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Inner Room Component ──────────────────────────────────────────────────
function RoomContent({
  sessionId,
  onEnd,
}: {
  sessionId: string;
  onEnd: () => void;
}) {
  const room = useRoomContext();
  const remoteParticipants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();

  // Find Aria participant
  const botParticipant =
    remoteParticipants.find(
      (p) =>
        p.isAgent ||
        (p as any).kind === "agent" ||
        (p as any).kind === 2 ||
        p.identity.startsWith("agent") ||
        p.identity.startsWith("interview-bot") ||
        p.identity.startsWith("AW_") ||
        p.identity.startsWith("AJ_")
    ) || (remoteParticipants.length === 1 ? remoteParticipants[0] : undefined);

  // Bot & candidate speaking states with 300ms silence removal
  const [agentState, setAgentState] = useState<"speaking" | "listening" | "thinking">("listening");
  const [botSpeakingSmooth, setBotSpeakingSmooth] = useState(false);
  const [candidateSpeakingSmooth, setCandidateSpeakingSmooth] = useState(false);
  const botSilenceTimer = useRef<NodeJS.Timeout | null>(null);
  const candidateSilenceTimer = useRef<NodeJS.Timeout | null>(null);

  // Track Bot speaking
  useEffect(() => {
    const isSpeaking = !!botParticipant?.isSpeaking || agentState === "speaking";
    if (isSpeaking) {
      if (botSilenceTimer.current) clearTimeout(botSilenceTimer.current);
      setBotSpeakingSmooth(true);
    } else {
      botSilenceTimer.current = setTimeout(() => {
        setBotSpeakingSmooth(false);
      }, 300);
    }
    return () => {
      if (botSilenceTimer.current) clearTimeout(botSilenceTimer.current);
    };
  }, [botParticipant?.isSpeaking, agentState]);

  // Track Candidate speaking
  useEffect(() => {
    const isSpeaking = !!localParticipant?.isSpeaking;
    if (isSpeaking) {
      if (candidateSilenceTimer.current) clearTimeout(candidateSilenceTimer.current);
      setCandidateSpeakingSmooth(true);
    } else {
      candidateSilenceTimer.current = setTimeout(() => {
        setCandidateSpeakingSmooth(false);
      }, 300);
    }
    return () => {
      if (candidateSilenceTimer.current) clearTimeout(candidateSilenceTimer.current);
    };
  }, [localParticipant?.isSpeaking]);

  // Transcript state & debug counter
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptItem[]>([]);
  const [showTranscript, setShowTranscript] = useState(true);
  const [eventCount, setEventCount] = useState(0);

  // Pre-load saved transcript from database on mount (refresh support)
  useEffect(() => {
    fetch(`/api/interview/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        const savedList = data?.transcript || data?.session?.transcript;
        if (Array.isArray(savedList) && savedList.length > 0) {
          const loaded: TranscriptItem[] = savedList.map((item: any, idx: number) => {
            const isBot = item.role === "assistant" || item.speaker === "bot" || item.speaker === "Aria";
            return {
              id: `db_${idx}_${item.timestamp || idx}`,
              speaker: isBot ? "bot" : "candidate",
              name: isBot ? "Aria" : "You",
              timestamp: item.timestamp || "Past",
              text: item.text,
              isInterim: false,
            };
          });
          setTranscriptEntries((prev) => (prev.length === 0 ? loaded : prev));
        }
      })
      .catch((err) => console.debug("Could not pre-load transcript:", err));
  }, [sessionId]);

  // Caption overlay state
  const [caption, setCaption] = useState<string>("");

  // Layout mode: conversation | technical | split
  const [layout, setLayout] = useState<"conversation" | "technical" | "split">("conversation");

  // Coding problem state & Technical Coach sync
  const [codingProblem, setCodingProblem] = useState<any>(null);
  const [codeSynced, setCodeSynced] = useState(false);
  const [ariaProblemSynced, setAriaProblemSynced] = useState(false);
  const [ariaCodingStatus, setAriaCodingStatus] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const continuousTimerRef = useRef<NodeJS.Timeout | null>(null);
  const seqCounterRef = useRef<number>(0);
  const cursorLineRef = useRef<number>(1);
  const lastCodeSentRef = useRef<string>("");
  const lastSentTimeRef = useRef<number>(0);
  const latestCodeRef = useRef<{ lang: Language; code: string }>({ lang: "python", code: "" });

  // 20s Bot Timeout tracking
  const [botWaitTimeout, setBotWaitTimeout] = useState(false);
  // Rate limit delay notice from provider
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);

  useEffect(() => {
    if (botParticipant) {
      setBotWaitTimeout(false);
      return;
    }
    const timer = setTimeout(() => {
      if (!botParticipant) {
        setBotWaitTimeout(true);
      }
    }, 20000);
    return () => clearTimeout(timer);
  }, [botParticipant]);

  // Audio unlock: Browser autoplay policy requires user gesture
  useEffect(() => {
    const unlockAudio = () => {
      if (room && typeof (room as any).startAudio === "function") {
        (room as any).startAudio().catch((err: any) => {
          console.warn("[LiveKit] Audio unlock warning:", err);
        });
      }
    };
    window.addEventListener("click", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [room]);

  // Listen for data messages from Aria (transcript, agent_state, switch_layout, caption)
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant?: any, kind?: any, topic?: string) => {
      try {
        const text = new TextDecoder().decode(payload);
        const msg = JSON.parse(text);

        // 1. Transcript line (handles topic "transcript" or standard payload)
        if (topic === "transcript" || msg.topic === "transcript" || msg.role || msg.type === "transcript" || msg.type === "transcript_entry") {
          setEventCount((prev) => prev + 1);

          const isBot =
            msg.role === "assistant" ||
            msg.speaker === "Aria" ||
            msg.speaker === "bot" ||
            msg.entry?.speaker === "bot";

          const id = msg.id || msg.entry?.id || `t_${Date.now()}`;
          const content = msg.text || msg.entry?.text || "";
          const isFinal =
            msg.isFinal !== undefined
              ? !!msg.isFinal
              : msg.entry?.interim !== undefined
              ? !msg.entry.interim
              : true;

          const timestamp =
            msg.timestamp ||
            msg.entry?.timestamp ||
            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

          const speakerName = isBot ? "Aria" : "You";
          const confidence = msg.confidence !== undefined ? msg.confidence : msg.entry?.confidence;
          const lowConfidence =
            msg.lowConfidence !== undefined
              ? !!msg.lowConfidence
              : msg.entry?.lowConfidence !== undefined
              ? !!msg.entry.lowConfidence
              : confidence !== undefined && confidence < 0.65;

          if (!content) return;

          setTranscriptEntries((prev) => {
            const existingIdx = prev.findIndex((e) => e.id === id);
            if (existingIdx !== -1) {
              const updated = [...prev];
              updated[existingIdx] = {
                ...updated[existingIdx],
                text: content,
                isInterim: !isFinal,
                confidence,
                lowConfidence,
                timestamp,
              };
              return updated;
            }

            // If the last entry was interim from the same speaker, replace it
            const last = prev[prev.length - 1];
            if (last && last.speaker === (isBot ? "bot" : "candidate") && last.isInterim) {
              const updated = [...prev];
              updated[updated.length - 1] = {
                id,
                speaker: isBot ? "bot" : "candidate",
                name: speakerName,
                timestamp,
                text: content,
                isInterim: !isFinal,
                confidence,
                lowConfidence,
              };
              return updated;
            }

            // Otherwise append new line
            return [
              ...prev,
              {
                id,
                speaker: isBot ? "bot" : "candidate",
                name: speakerName,
                timestamp,
                text: content,
                isInterim: !isFinal,
                confidence,
                lowConfidence,
              },
            ];
          });
          return;
        }

        // 2. Agent state change
        if (msg.type === "agent_state") {
          if (msg.state === "speaking" || msg.state === "thinking" || msg.state === "listening") {
            setAgentState(msg.state);
          }
        } else if (msg.type === "switch_layout") {
          if (msg.layout === "split" || msg.layout === "technical" || msg.layout === "conversation") {
            setLayout(msg.layout);
          }
        } else if (msg.type === "caption") {
          setCaption(msg.text || "");
          setTimeout(() => setCaption(""), 6000);
        } else if (msg.type === "rate_limit_notice" || msg.type === "llm_notice") {
          setRateLimitNotice(msg.message || "Replies may be slightly delayed due to provider rate limits.");
          setTimeout(() => setRateLimitNotice(null), 8000);
        } else if (msg.type === "problem_sync_ack" || topic === "problem_sync_ack") {
          if (msg.synced) {
            setAriaProblemSynced(true);
          }
        } else if (msg.type === "aria_coding_status" || topic === "aria_coding_status") {
          setAriaCodingStatus(msg.status || "Aria is reading your code");
          setTimeout(() => setAriaCodingStatus(null), 3500);
        }
      } catch (err) {
        console.warn("[LiveKit] Error handling data packet:", err);
      }
    };

    (room as any).on("dataReceived", handleDataReceived);
    return () => {
      (room as any).off("dataReceived", handleDataReceived);
    };
  }, [room]);

  // Fetch coding problem for this interview
  useEffect(() => {
    fetch(`/api/interview/${sessionId}/code`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.problem) {
          setCodingProblem(data.problem);
        }
      })
      .catch(() => {});
  }, [sessionId]);

  // Helper to compute deterministic hash of problem statement matching Python TechnicalCoach
  const computeStatementHash = useCallback(async (stmt: string): Promise<string> => {
    const norm = stmt.trim().replace(/\s+/g, " ");
    const msgBuffer = new TextEncoder().encode(norm);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
  }, []);

  // Confirm problem shown and broadcast initial starter code with Aria on data channel (PART 1 & 2)
  useEffect(() => {
    if (!room || !codingProblem?.id) return;
    let active = true;

    computeStatementHash(codingProblem.statement || "").then((statementHash) => {
      if (!active) return;
      const payload = JSON.stringify({
        type: "problem_shown",
        problemId: codingProblem.id,
        statementHash,
      });
      const encoder = new TextEncoder();
      const raw = encoder.encode(payload);
      try {
        (room as any).localParticipant?.publishData(raw, { reliable: true, topic: "problem_shown" });
        (room as any).localParticipant?.publishData(raw, { reliable: true });
      } catch (e) {
        console.warn("Could not dispatch problem_shown event:", e);
      }
    });

    // Also dispatch initial code state (starter code) so Aria has instant vision before first keystroke
    const initialLang = "python";
    const initialCode = codingProblem.starterCode?.[initialLang] || "";
    if (initialCode) {
      setTimeout(() => {
        if (!active) return;
        const codePayload = JSON.stringify({
          type: "code_update",
          problemId: codingProblem.id,
          language: initialLang,
          code: initialCode,
          cursorLine: 1,
          timestamp: Date.now(),
          seq: 1,
        });
        const encoder = new TextEncoder();
        const codeRaw = encoder.encode(codePayload);
        try {
          (room as any).localParticipant?.publishData(codeRaw, { reliable: true, topic: "code_update" });
          (room as any).localParticipant?.publishData(codeRaw, { reliable: true });
        } catch (e) {
          console.warn("Could not dispatch initial code_update event:", e);
        }
      }, 500);
    }

    return () => {
      active = false;
    };
  }, [room, codingProblem, computeStatementHash]);

  // Broadcast code updates to LiveKit with topic="code_update" (PART 2)
  const sendLiveCodeUpdate = useCallback(
    (language: Language, sourceCode: string, cursorLine: number = 1, force: boolean = false) => {
      if (!room) return;
      let code = sourceCode;
      if (code.length > 6000) {
        console.warn(`[Code Update] Truncated code exceeding 6000 chars (len=${code.length})`);
        code = code.slice(0, 6000) + "\n# [TRUNCATED BEYOND 6000 CHARS]";
      }

      const now = Date.now();
      if (!force && now - lastSentTimeRef.current < 2000) {
        return;
      }

      seqCounterRef.current += 1;
      const seq = seqCounterRef.current;
      lastSentTimeRef.current = now;
      lastCodeSentRef.current = code;

      const payload = {
        type: "code_update",
        problemId: codingProblem?.id || "prob_two_sum_001",
        language,
        code,
        cursorLine: cursorLine || cursorLineRef.current || 1,
        timestamp: now,
        seq,
      };

      try {
        const encoder = new TextEncoder();
        const raw = encoder.encode(JSON.stringify(payload));
        (room as any).localParticipant?.publishData(raw, { reliable: true, topic: "code_update" });
        (room as any).localParticipant?.publishData(raw, { reliable: true });
        setCodeSynced(true);
        setTimeout(() => setCodeSynced(false), 2000);
      } catch (err) {
        console.warn("Could not broadcast code_update:", err);
      }
    },
    [room, codingProblem]
  );

  const handleRunCode = async (language: Language, sourceCode: string, input?: string): Promise<Result> => {
    // Send immediate code snapshot before running
    sendLiveCodeUpdate(language, sourceCode, cursorLineRef.current, true);

    const res = await fetch(`/api/interview/${sessionId}/code`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        language,
        sourceCode,
        submit: false,
        customInput: input,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || "Execution failed");
    }

    // Broadcast test run result to Aria (topic="run_result" PART 3)
    if (room) {
      try {
        const failures = (data.tests || [])
          .filter((t: any) => !t.passed)
          .map((t: any) => ({
            input: t.input,
            expected: t.expected,
            actual: t.stdout || t.stderr || t.status,
          }));

        const runResultPayload = {
          type: "run_result",
          problemId: codingProblem?.id || "prob_two_sum_001",
          passed: data.passedCount ?? 0,
          total: data.totalCount ?? 0,
          failures,
          runtimeMs: data.timeMs || 0,
          errorType: data.status,
          errorMessage: data.stderr || data.compileError || null,
          line: data.compileError ? 1 : undefined,
          isSubmit: false,
        };

        const encoder = new TextEncoder();
        const raw = encoder.encode(JSON.stringify(runResultPayload));
        (room as any).localParticipant?.publishData(raw, { reliable: true, topic: "run_result" });
        (room as any).localParticipant?.publishData(raw, { reliable: true });
      } catch (err) {
        console.warn("Could not broadcast run_result:", err);
      }
    }

    return data;
  };

  const handleSubmitCode = async (language: Language, sourceCode: string): Promise<Result> => {
    // Send immediate code snapshot before submit
    sendLiveCodeUpdate(language, sourceCode, cursorLineRef.current, true);

    const res = await fetch(`/api/interview/${sessionId}/code`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        language,
        sourceCode,
        submit: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || "Submission failed");
    }

    // Broadcast submission result to Aria (topic="run_result" PART 3)
    if (room) {
      try {
        const failures = (data.tests || [])
          .filter((t: any) => !t.passed)
          .map((t: any) => ({
            input: t.input,
            expected: t.expected,
            actual: t.stdout || t.stderr || t.status,
          }));

        const runResultPayload = {
          type: "run_result",
          problemId: codingProblem?.id || "prob_two_sum_001",
          passed: data.passedCount ?? 0,
          total: data.totalCount ?? 0,
          failures,
          runtimeMs: data.timeMs || 0,
          errorType: data.status,
          errorMessage: data.stderr || data.compileError || null,
          line: data.compileError ? 1 : undefined,
          isSubmit: true,
        };

        const encoder = new TextEncoder();
        const raw = encoder.encode(JSON.stringify(runResultPayload));
        (room as any).localParticipant?.publishData(raw, { reliable: true, topic: "run_result" });
        (room as any).localParticipant?.publishData(raw, { reliable: true });
      } catch (err) {
        console.warn("Could not broadcast run_result:", err);
      }
    }

    return data;
  };

  const handleCodeChange = (language: Language, sourceCode: string, cursorLine: number = 1) => {
    latestCodeRef.current = { lang: language, code: sourceCode };
    cursorLineRef.current = cursorLine;

    // Reset 2-second typing debounce timer
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      sendLiveCodeUpdate(language, sourceCode, cursorLine, false);
    }, 2000);

    // Continuous 10-second snapshot timer if editing continues
    if (!continuousTimerRef.current) {
      continuousTimerRef.current = setInterval(() => {
        const latest = latestCodeRef.current;
        if (latest.code && latest.code !== lastCodeSentRef.current) {
          sendLiveCodeUpdate(latest.lang, latest.code, cursorLineRef.current, false);
        } else {
          if (continuousTimerRef.current) {
            clearInterval(continuousTimerRef.current);
            continuousTimerRef.current = null;
          }
        }
      }, 10000);
    }
  };

  // Ask Aria for a hint (topic="request_hint" PART 5)
  const handleRequestHint = () => {
    if (!room || hintsUsed >= 3) return;
    try {
      const payload = {
        type: "request_hint",
        problemId: codingProblem?.id || "prob_two_sum_001",
        timestamp: Date.now(),
      };
      const encoder = new TextEncoder();
      const raw = encoder.encode(JSON.stringify(payload));
      (room as any).localParticipant?.publishData(raw, { reliable: true, topic: "request_hint" });
      (room as any).localParticipant?.publishData(raw, { reliable: true });
      setHintsUsed((prev) => Math.min(3, prev + 1));
    } catch (err) {
      console.warn("Could not request hint:", err);
    }
  };

  // Explain my approach button handler (PART 5)
  const handleExplainApproach = () => {
    if (!room) return;
    try {
      const payload = {
        type: "explain_approach",
        message: "Candidate requested to explain approach",
        timestamp: Date.now(),
      };
      const encoder = new TextEncoder();
      const raw = encoder.encode(JSON.stringify(payload));
      (room as any).localParticipant?.publishData(raw, { reliable: true });
    } catch (err) {
      console.warn("Could not send explain approach:", err);
    }
  };

  // Status text for header
  let statusText = "connecting to room";
  if (room?.state === "connected") {
    if (!botParticipant) {
      statusText = "waiting for Aria";
    } else if (botSpeakingSmooth) {
      statusText = "Aria speaking";
    } else if (agentState === "thinking") {
      statusText = "Aria thinking";
    } else if (candidateSpeakingSmooth) {
      statusText = "You speaking";
    } else {
      statusText = "Aria listening";
    }
  }

  return (
    <div className={`mx-auto flex flex-col gap-6 px-4 py-6 ${layout === "split" ? "max-w-7xl" : "max-w-6xl"}`}>
      {/* Top Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">AI Mock Interview Session</h1>
            {codeSynced && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                <CheckCircle2 className="h-3 w-3" /> Code Synced with Aria
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5 capitalize">
            Status: <span className="text-foreground font-mono font-medium">{statusText}</span>
          </p>
        </div>

        {/* View Layout Controls, Transcript Toggle & End Button */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setShowTranscript((prev) => !prev)}
            className="h-8 gap-1.5 text-xs border-border"
          >
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            {showTranscript ? "Hide Transcript" : "Show Transcript"}
          </Button>

          <div className="flex rounded-lg border border-border bg-surface p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setLayout("conversation")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                layout === "conversation" ? "bg-elevated text-foreground shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              <Video className="h-3.5 w-3.5" /> Video
            </button>
            <button
              type="button"
              onClick={() => setLayout("technical")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                layout === "technical" ? "bg-elevated text-foreground shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              <Code2 className="h-3.5 w-3.5" /> Technical
            </button>
            <button
              type="button"
              onClick={() => setLayout("split")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                layout === "split" ? "bg-elevated text-foreground shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              <Columns className="h-3.5 w-3.5" /> Split
            </button>
          </div>

          <Button
            variant="outline"
            className="gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs h-9"
            onClick={onEnd}
          >
            <PhoneOff className="h-3.5 w-3.5" /> End Interview
          </Button>
        </div>
      </div>

      {/* 20s Bot Timeout Alert */}
      {botWaitTimeout && !botParticipant && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-300 flex items-start gap-2.5">
          <div className="text-base select-none">⚠️</div>
          <div>
            <p className="font-semibold">Aria has not joined yet</p>
            <p className="text-amber-300/80 mt-0.5">
              The interview bot worker might not be running or dispatched. Check that the bot worker is started (e.g.{" "}
              <code className="bg-amber-500/20 px-1 py-0.5 rounded font-mono">python agent.py dev</code>) and connected to LiveKit.
            </p>
          </div>
        </div>
      )}

      {/* Rate Limit Notice Alert */}
      {rateLimitNotice && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-center gap-2.5 animate-in fade-in">
          <span className="text-base select-none">⏳</span>
          <p className="font-medium">{rateLimitNotice}</p>
        </div>
      )}

      {/* Mode 1: Conversation / Video View */}
      {layout === "conversation" && (
        <div className="space-y-6">
          <div className={`grid gap-6 ${showTranscript ? "lg:grid-cols-[1fr_360px]" : "grid-cols-1"}`}>
            {/* Left Column: Avatars */}
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-10 min-h-[300px]">
                  <AriaAvatar speaking={botSpeakingSmooth} thinking={agentState === "thinking"} />
                </div>

                <div className="rounded-xl border border-border bg-surface p-4 flex flex-col items-center justify-center min-h-[300px]">
                  <CandidateTile speaking={candidateSpeakingSmooth} />
                </div>
              </div>

              {caption && (
                <div className="rounded-lg border border-border bg-elevated px-4 py-3 text-sm font-mono text-muted">
                  &ldquo;{caption}&rdquo;
                </div>
              )}

              {codingProblem && (
                <div className="rounded-xl border border-border/80 bg-surface/80 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase font-semibold tracking-wider text-primary">Technical Problem Ready</p>
                    <p className="text-sm font-medium">{codingProblem.title || "Coding Challenge"}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setLayout("split")}
                    className="gap-1.5 text-xs py-1 px-3 h-8"
                  >
                    <Code2 className="h-3.5 w-3.5" /> Open Code Editor
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column: Live Transcript Panel */}
            {showTranscript && (
              <div className="h-full">
                <LiveTranscriptPanel
                  entries={transcriptEntries}
                  visible={showTranscript}
                  eventCount={eventCount}
                  onToggleVisible={() => setShowTranscript(false)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Full Technical Round View */}
      {layout === "technical" && (
        <div className="space-y-4">
          {/* Mini bot status & video bar */}
          <div className="flex flex-wrap items-center justify-between rounded-lg border border-border bg-surface p-3 gap-3">
            <AriaAvatar speaking={botSpeakingSmooth} thinking={agentState === "thinking"} mini />
            {caption && (
              <span className="text-xs font-mono text-muted max-w-md truncate">
                &ldquo;{caption}&rdquo;
              </span>
            )}
            <CandidateTile speaking={candidateSpeakingSmooth} mini />
          </div>

          {codingProblem ? (
            <CodeEditorPanel
              title={codingProblem.title}
              statement={codingProblem.statement}
              constraints={codingProblem.constraints}
              examples={codingProblem.examples}
              difficulty={codingProblem.difficulty}
              topicTags={codingProblem.topicTags}
              starterCode={codingProblem.starterCode || {}}
              tests={codingProblem.testCases || []}
              synced={ariaProblemSynced}
              statusMessage={ariaCodingStatus}
              hintsUsed={hintsUsed}
              maxHints={3}
              onRun={handleRunCode}
              onSubmit={handleSubmitCode}
              onChange={handleCodeChange}
              onCursorChange={(line) => {
                cursorLineRef.current = line;
              }}
              onRequestHint={handleRequestHint}
              onExplainApproach={handleExplainApproach}
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded border border-border bg-surface text-muted text-sm">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Preparing technical coding problem...
            </div>
          )}

          {showTranscript && (
            <div className="mt-4">
              <LiveTranscriptPanel
                entries={transcriptEntries}
                visible={showTranscript}
                eventCount={eventCount}
                onToggleVisible={() => setShowTranscript(false)}
              />
            </div>
          )}
        </div>
      )}

      {/* Mode 3: Split Screen View */}
      {layout === "split" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            {/* Left Column: Avatars & mini transcript */}
            <div className="space-y-4 flex flex-col">
              <div className="rounded-xl border border-border bg-surface p-6 flex flex-col items-center justify-center">
                <AriaAvatar speaking={botSpeakingSmooth} thinking={agentState === "thinking"} />
              </div>

              <div className="rounded-xl border border-border bg-surface p-3">
                <CandidateTile speaking={candidateSpeakingSmooth} />
              </div>

              {caption && (
                <div className="rounded-lg border border-border bg-elevated p-3 text-xs font-mono text-muted">
                  &ldquo;{caption}&rdquo;
                </div>
              )}
            </div>

            {/* Right Column: Code Editor */}
            <div>
              {codingProblem ? (
                <CodeEditorPanel
                  title={codingProblem.title}
                  statement={codingProblem.statement}
                  constraints={codingProblem.constraints}
                  examples={codingProblem.examples}
                  difficulty={codingProblem.difficulty}
                  topicTags={codingProblem.topicTags}
                  starterCode={codingProblem.starterCode || {}}
                  tests={codingProblem.testCases || []}
                  synced={ariaProblemSynced}
                  statusMessage={ariaCodingStatus}
                  hintsUsed={hintsUsed}
                  maxHints={3}
                  onRun={handleRunCode}
                  onSubmit={handleSubmitCode}
                  onChange={handleCodeChange}
                  onCursorChange={(line) => {
                    cursorLineRef.current = line;
                  }}
                  onRequestHint={handleRequestHint}
                  onExplainApproach={handleExplainApproach}
                />
              ) : (
                <div className="flex h-96 items-center justify-center rounded border border-border bg-surface text-muted text-sm">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading coding problem...
                </div>
              )}
            </div>
          </div>

          {/* Bottom Docked Transcript in Split Mode */}
          {showTranscript && (
            <div className="pt-2">
              <LiveTranscriptPanel
                entries={transcriptEntries}
                visible={showTranscript}
                eventCount={eventCount}
                onToggleVisible={() => setShowTranscript(false)}
              />
            </div>
          )}
        </div>
      )}

      {/* Audio renderer (plays bot voice) */}
      <RoomAudioRenderer />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function InterviewSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    async function init() {
      const cached = sessionStorage.getItem(`lk-token-${sessionId}`);
      const cachedUrl = sessionStorage.getItem(`lk-url-${sessionId}`);
      if (cached && cachedUrl) {
        setToken(cached);
        setWsUrl(cachedUrl);
        return;
      }
      setError("Session token not found. Please go back and start a new interview.");
    }
    init();
  }, [sessionId]);

  const handleEnd = useCallback(async () => {
    if (ending) return;
    setEnding(true);
    try {
      await fetch(`/api/interview/${sessionId}/end`, { method: "POST" });
    } catch {}
    let attempts = 0;
    while (attempts < 20) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await fetch(`/api/interview/${sessionId}`);
        const data = await res.json();
        if (data?.status === "COMPLETED" || data?.session?.status === "COMPLETED") break;
      } catch {}
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
      audio={{
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }}
      onError={(err) => {
        console.error("[LiveKit] Room connection error:", err);
      }}
      onDisconnected={() => {
        router.push(`/interview/${sessionId}/report`);
      }}
    >
      <RoomContent sessionId={sessionId} onEnd={handleEnd} />
    </LiveKitRoom>
  );
}
