"use client";

import { useEffect, useState } from "react";
import {
  History,
  X,
  Trash2,
  TrendingUp,
  ArrowRight,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { AnalyzerType, UnifiedAnalyzerResult } from "@/lib/analyzer/types";
import { Button } from "@/components/ui/button";

interface AnalyzerHistoryDrawerProps {
  type: AnalyzerType;
  isOpen: boolean;
  onClose: () => void;
  onSelectRun: (run: UnifiedAnalyzerResult) => void;
}

export function AnalyzerHistoryDrawer({
  type,
  isOpen,
  onClose,
  onSelectRun,
}: AnalyzerHistoryDrawerProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analyzer/history?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      setSelectedForCompare([]);
      setComparing(false);
    }
  }, [isOpen, type]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this analysis record?")) return;

    try {
      const res = await fetch(`/api/analyzer/history/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setSelectedForCompare((prev) => prev.filter((i) => i !== id));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const toggleCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  if (!isOpen) return null;

  const compareA = items.find((i) => i.id === selectedForCompare[0]);
  const compareB = items.find((i) => i.id === selectedForCompare[1]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm font-mono animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#EBE8EB] dark:bg-[#141414] border-l border-black/10 dark:border-white/10 h-full p-6 overflow-y-auto space-y-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#F64302]" />
            <div>
              <h2 className="text-base font-bold text-foreground">{type} Audit History</h2>
              <p className="text-xs text-muted-foreground">Compare past runs and track score trajectory.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compare Action Bar */}
        {selectedForCompare.length > 0 && (
          <div className="rounded-xl border border-[#F64302]/30 bg-[#F64302]/10 p-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              Selected {selectedForCompare.length} of 2 runs for comparison
            </span>
            <div className="flex items-center gap-2">
              {selectedForCompare.length === 2 && (
                <button
                  type="button"
                  onClick={() => setComparing(!comparing)}
                  className="px-3 py-1 rounded-lg bg-[#F64302] text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>{comparing ? "Hide Comparison" : "Compare Runs Side-by-Side"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedForCompare([])}
                className="text-muted-foreground hover:underline text-[11px]"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Side-by-Side Comparison View */}
        {comparing && compareA && compareB && (
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#F64302]">
              <GitCompare className="w-4 h-4" />
              <span>Side-by-Side Trajectory Comparison</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Run A */}
              <div className="space-y-2 p-3 rounded-xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Earlier Run</span>
                <div className="font-bubbledot text-3xl font-bold text-foreground">{compareA.score}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(compareA.createdAt).toLocaleDateString()}</div>
                <div className="pt-2 border-t border-black/5 dark:border-white/10 space-y-1">
                  {(compareA.resultJson?.breakdown || []).map((b: any, i: number) => (
                    <div key={i} className="flex justify-between text-[10px]">
                      <span className="truncate max-w-[120px]">{b.name}</span>
                      <span className="font-bold">{b.score}/{b.max}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Run B */}
              <div className="space-y-2 p-3 rounded-xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Later Run</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-bubbledot text-3xl font-bold text-[#F64302]">{compareB.score}</span>
                  <span className={`text-xs font-bold ${compareB.score >= compareA.score ? "text-emerald-500" : "text-rose-500"}`}>
                    {compareB.score >= compareA.score ? `+${compareB.score - compareA.score}` : compareB.score - compareA.score}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">{new Date(compareB.createdAt).toLocaleDateString()}</div>
                <div className="pt-2 border-t border-black/5 dark:border-white/10 space-y-1">
                  {(compareB.resultJson?.breakdown || []).map((b: any, i: number) => (
                    <div key={i} className="flex justify-between text-[10px]">
                      <span className="truncate max-w-[120px]">{b.name}</span>
                      <span className="font-bold">{b.score}/{b.max}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History List */}
        {loading ? (
          <p className="text-center text-xs text-muted-foreground py-8">Loading history logs...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-black/10 dark:border-white/10 space-y-2">
            <History className="w-8 h-8 text-muted-foreground mx-auto" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">No Recorded Runs Yet</h4>
            <p className="text-[11px] text-muted-foreground">Complete your first analysis to see historical records here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => {
              const isSelected = selectedForCompare.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.resultJson) {
                      onSelectRun(item.resultJson as UnifiedAnalyzerResult);
                      onClose();
                    }
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "border-[#F64302] bg-white dark:bg-black/60 shadow-sm"
                      : "border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 hover:border-[#F64302]/40"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bubbledot text-xl font-bold text-foreground">{item.score}</span>
                      <span className="text-xs text-muted-foreground">/ 100</span>
                      <span className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                        {item.subject}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>{new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {item.targetRole && <span>· Role: {item.targetRole}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="Select for comparison"
                      onClick={(e) => toggleCompare(item.id, e)}
                      className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                        isSelected
                          ? "bg-[#F64302] text-white"
                          : "bg-black/5 dark:bg-white/10 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete record"
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
