"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, RefreshCw, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportStatusChecker({
    sessionId,
    initialStatus = "IN_PROGRESS",
    initialError = null,
}: {
    sessionId: string;
    initialStatus?: string;
    initialError?: string | null;
}) {
    const router = useRouter();
    const [status, setStatus] = useState(initialStatus);
    const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
    const [retrying, setRetrying] = useState(false);

    useEffect(() => {
        if (status === "COMPLETED") {
            router.refresh();
            return;
        }

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/interview/${sessionId}`);
                if (res.ok) {
                    const data = await res.json();
                    const currentStatus = data?.status || data?.session?.status;
                    if (currentStatus) {
                        setStatus(currentStatus);
                        if (data?.session?.errorMessage) {
                            setErrorMessage(data.session.errorMessage);
                        }
                        if (currentStatus === "COMPLETED") {
                            clearInterval(interval);
                            router.refresh();
                        }
                    }
                }
            } catch (err) {
                console.warn("Failed to poll session status:", err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [sessionId, status, router]);

    const handleRetry = async () => {
        setRetrying(true);
        try {
            const res = await fetch(`/api/interview/${sessionId}/retry`, {
                method: "POST",
            });
            if (res.ok) {
                setStatus("EVALUATING");
                setErrorMessage(null);
                setTimeout(() => {
                    router.refresh();
                }, 2000);
            } else {
                const err = await res.json().catch(() => ({}));
                setErrorMessage(err?.error?.message || "Retry failed");
            }
        } catch (e: any) {
            setErrorMessage(e?.message || "Network error while retrying evaluation");
        } finally {
            setRetrying(false);
        }
    };

    if (status === "FAILED") {
        return (
            <div className="mx-auto max-w-xl py-16 px-4 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
                    <AlertCircle className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold">Evaluation Failed</h2>
                <p className="text-sm text-muted">
                    {errorMessage || "An error occurred while evaluating the interview session."}
                </p>
                <div className="pt-2">
                    <Button onClick={handleRetry} disabled={retrying} className="gap-2">
                        {retrying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        Retry Evaluation
                    </Button>
                </div>
            </div>
        );
    }

    if (status === "EVALUATING") {
        return (
            <div className="mx-auto max-w-xl py-16 px-4 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <h2 className="text-xl font-semibold">Evaluating Your Interview</h2>
                <p className="text-sm text-muted">
                    Aria is analyzing your conversation transcript, coding solutions, and performance metrics.
                    Your report will load automatically in just a moment...
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-xl py-16 px-4 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
                <Clock className="h-6 w-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-semibold">Interview In Progress</h2>
            <p className="text-sm text-muted">
                This interview session is currently active. Once the session ends or you finish, the feedback report
                will be generated automatically.
            </p>
            <div className="pt-2">
                <Button variant="outline" onClick={() => router.push(`/interview/${sessionId}`)}>
                    Return to Live Interview
                </Button>
            </div>
        </div>
    );
}
