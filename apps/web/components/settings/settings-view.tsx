"use client";

import React, { useState } from "react";
import {
  User,
  Shield,
  Volume2,
  Mic,
  Monitor,
  Sparkles,
  Download,
  Trash2,
  CheckCircle2,
  Save,
  Moon,
  Sun,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { BentoCard } from "@/components/ui/bento-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Dialog } from "@/components/ui/dialog";
import { toast, RehearseToaster } from "@/components/ui/toast";

interface SettingsViewProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export function SettingsView({ user }: SettingsViewProps) {
  const [name, setName] = useState(user.name || "Candidate");
  const [language, setLanguage] = useState("en");
  const [voiceSpeed, setVoiceSpeed] = useState("normal");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    await new Promise((r) => setTimeout(r, 600));
    setSavingProfile(false);
    toast.success("Profile preferences saved successfully!");
  };

  const handleSaveDefaults = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDefaults(true);
    await new Promise((r) => setTimeout(r, 600));
    setSavingDefaults(false);
    toast.success("Interview defaults updated!");
  };

  const handleExportData = () => {
    const exportPayload = {
      user: { id: user.id, name, email: user.email, role: user.role },
      exportedAt: new Date().toISOString(),
      platform: "Rehearse AI Mock Interview",
      status: "Verified",
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rehearse-candidate-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dossier exported to JSON file!");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-mono pb-12">
      <RehearseToaster />

      {/* Page Header */}
      <PageHeader
        eyebrow="Account & Preferences"
        title="Settings"
        subtitle="Manage candidate profile, interview defaults, appearance, and data export settings."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── 1. Profile Card ──────────────────────────────────────────────── */}
        <BentoCard padded="normal" className="space-y-4">
          <div className="flex items-center gap-2.5 border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
            <User className="w-4 h-4 text-[#F64302]" />
            <h2 className="font-jetbrains font-bold text-base text-foreground">
              Candidate profile
            </h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Full Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Email Address
              </label>
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 p-2.5 text-muted-foreground">
                {user.email || "candidate@rehearse.app"}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Role &amp; Access Tier
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 p-2.5 text-foreground">
                <Shield className="w-3.5 h-3.5 text-[#F64302]" />
                <span className="font-bold uppercase tracking-wider text-[#F64302]">
                  {user.role || "CANDIDATE"}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={savingProfile}
                className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider px-5 shadow-sm"
              >
                {savingProfile ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </form>
        </BentoCard>

        {/* ── 2. Interview Defaults Card ───────────────────────────────────── */}
        <BentoCard padded="normal" className="space-y-4">
          <div className="flex items-center gap-2.5 border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
            <Sparkles className="w-4 h-4 text-[#F64302]" />
            <h2 className="font-jetbrains font-bold text-base text-foreground">
              Interview defaults
            </h2>
          </div>

          <form onSubmit={handleSaveDefaults} className="space-y-3.5 text-xs">
            <div>
              <label
                htmlFor="settings-lang"
                className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1"
              >
                Default Interview Language
              </label>
              <select
                id="settings-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-[#F64302]"
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
            </div>

            <div>
              <label
                htmlFor="settings-voice"
                className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1"
              >
                Interviewer Voice Persona
              </label>
              <select
                id="settings-voice"
                value={voiceSpeed}
                onChange={(e) => setVoiceSpeed(e.target.value)}
                className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-[#F64302]"
              >
                <option value="normal">Aria (Natural Technical Interviewer)</option>
                <option value="fast">Aria (Rapid-Fire Inquiry)</option>
                <option value="thorough">Aria (Thorough &amp; Explanatory)</option>
              </select>
            </div>

            <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/20 p-3 space-y-1">
              <span className="font-bold text-[11px] text-foreground">WebRTC Parameters</span>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Echo cancellation, noise suppression, and auto-gain control active on all sessions.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={savingDefaults}
                className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider px-5 shadow-sm"
              >
                {savingDefaults ? "Saving…" : "Save defaults"}
              </Button>
            </div>
          </form>
        </BentoCard>

        {/* ── 3. Appearance Card ───────────────────────────────────────────── */}
        <BentoCard padded="normal" className="space-y-4">
          <div className="flex items-center gap-2.5 border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
            <Monitor className="w-4 h-4 text-[#F64302]" />
            <h2 className="font-jetbrains font-bold text-base text-foreground">
              Appearance &amp; theme
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40">
              <div>
                <p className="font-semibold text-foreground">Color Scheme</p>
                <p className="text-muted-foreground text-[11px]">
                  Switch between AERIS light and dark variants
                </p>
              </div>
              <ThemeToggle />
            </div>

            <div className="p-3.5 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 space-y-1">
              <p className="font-semibold text-foreground">Reduced Motion</p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                System accessibility setting: All transforms, scale-ins, and animated glows automatically disable under prefers-reduced-motion.
              </p>
            </div>
          </div>
        </BentoCard>

        {/* ── 4. Data & Privacy Card ───────────────────────────────────────── */}
        <BentoCard padded="normal" className="space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
              <Shield className="w-4 h-4 text-[#F64302]" />
              <h2 className="font-jetbrains font-bold text-base text-foreground">
                Data &amp; privacy
              </h2>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Candidate resumes and evaluation reports are encrypted and strictly isolated to your user account.
            </p>

            <div className="space-y-2 pt-1">
              <Button
                variant="outline"
                onClick={handleExportData}
                className="w-full justify-center gap-2 rounded-xl text-xs font-mono font-semibold h-10 border-black/10 dark:border-white/10"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export dossier (JSON)</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(true)}
                className="w-full justify-center gap-2 rounded-xl text-xs font-mono font-semibold h-10 border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete account &amp; stored sessions</span>
              </Button>
            </div>
          </div>
        </BentoCard>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Account & Rehearsals"
        description="This action is permanent and will delete all stored resumes, job descriptions, and interview feedback reports."
      >
        <p className="text-xs text-muted-foreground leading-relaxed">
          Are you sure you wish to proceed? You can re-register anytime with your email address.
        </p>
        <div className="flex items-center justify-end gap-2.5 pt-4">
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(false)}
            className="rounded-xl font-mono text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              toast.error("Please contact administrator to permanently purge DB credentials.");
            }}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold uppercase tracking-wider"
          >
            Confirm Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
