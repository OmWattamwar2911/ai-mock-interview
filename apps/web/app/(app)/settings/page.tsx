import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Settings, User, Shield, Volume2, Mic, Monitor, Save } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");

  return (
    <div className="space-y-3 font-mono">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="font-bubbledot text-xs text-[#F64302] tracking-wider uppercase">01 / PREFERENCES</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#F64302] animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bubbledot font-bold tracking-tight text-foreground mt-1">
          SYSTEM SETTINGS
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Configure candidate profile, evaluation preferences, audio capture parameters, and theme appearance.
        </p>
      </div>

      {/* Bento Grid Row 1: Profile & Theme */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
        {/* Profile Card (7 cols) */}
        <div className="md:col-span-7 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/10 pb-3">
            <span className="font-bubbledot text-xs text-[#F64302]">02</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Candidate Profile
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-1">
                Full Name
              </label>
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 p-2.5 text-foreground font-semibold">
                {user.name || "Candidate"}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-1">
                Registered Email
              </label>
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 p-2.5 text-foreground">
                {user.email || "candidate@rehearse.app"}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-1">
                Access Level
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 p-2.5 text-foreground">
                <Shield className="w-3.5 h-3.5 text-[#F64302]" />
                <span className="uppercase font-bold text-[#F64302]">{user.role || "CANDIDATE"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* System & Audio Controls (5 cols) */}
        <div className="md:col-span-5 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bubbledot text-xs text-[#F64302]">03</span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Appearance
                </h2>
              </div>
              <ThemeToggle />
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-[#F64302]" />
                  <span>Noise Suppression</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold">ACTIVE</span>
              </div>

              <div className="p-3 rounded-xl bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[#F64302]" />
                  <span>Echo Cancellation</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold">ACTIVE</span>
              </div>

              <div className="p-3 rounded-xl bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-[#F64302]" />
                  <span>LiveKit WebRTC Low Latency</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#F64302]/15 text-[#F64302] font-bold">300MS</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground pt-2 border-t border-black/5 dark:border-white/10">
            REHEARSE SYSTEM CONFIGURATION · V/01
          </div>
        </div>
      </div>
    </div>
  );
}
