import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jdParsedSchema, resumeParsedSchema } from "@rehearse/shared";
import { Chip } from "@/components/ui/chip";
import { FileText, ArrowRight, Plus, Sparkles } from "lucide-react";

type DocumentResume = Awaited<ReturnType<typeof prisma.resume.findMany>>[number];
type DocumentJobDescription = Awaited<ReturnType<typeof prisma.jobDescription.findMany>>[number];

export default async function DocumentsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [resumes, jds] = await Promise.all([
    prisma.resume.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.jobDescription.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-3 font-mono">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 sm:p-6 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bubbledot text-xs text-[#F64302] tracking-wider uppercase">01 / DOSSIER</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#F64302] animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-jetbrains font-bold tracking-tight text-foreground">
            DOCUMENT REGISTRY
          </h1>
          <p className="text-xs text-muted-foreground">
            Stored resumes and job descriptions used to personalize technical interview rounds.
          </p>
        </div>

        <Link
          href="/onboarding"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#F64302] hover:bg-[#d93800] px-4 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md shadow-[#F64302]/20 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Upload Document</span>
        </Link>
      </div>

      {/* Resumes Section */}
      <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-bubbledot text-xs text-[#F64302]">02</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Candidate Resumes ({resumes.length})
            </h2>
          </div>
        </div>

        {resumes.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">No resumes saved yet. Upload one via prep onboarding.</p>
        ) : (
          <ul className="grid gap-2.5 md:grid-cols-2">
            {resumes.map((r: DocumentResume) => {
              const parsed = resumeParsedSchema.safeParse(r.parsed);
              const skills = parsed.success ? parsed.data.skills : [];
              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-4 flex flex-col justify-between hover:border-[#F64302]/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#F64302]" />
                        <p className="font-semibold text-sm text-foreground truncate max-w-[200px]">{r.fileName}</p>
                      </div>
                      {(r as any).atsAnalysis?.overallAtsScore !== undefined && (
                        <span className="rounded-md bg-[#F64302]/10 border border-[#F64302]/20 px-2 py-0.5 text-[10px] font-mono font-bold text-[#F64302]">
                          ATS {(r as any).atsAnalysis.overallAtsScore}%
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      Added: {r.createdAt.toISOString().slice(0, 10)} · <span className="text-[#F64302] font-semibold"><span className="font-bubbledot font-bold">{skills.length}</span> skills</span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {skills.slice(0, 8).map((s) => (
                        <Chip key={s} label={s} />
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/10 flex justify-end">
                    <Link
                      href="/analyzer/resume"
                      className="text-xs text-[#F64302] hover:underline font-semibold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      {(r as any).atsAnalysis ? "View ATS Breakdown →" : "Run ATS Analysis →"}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Job Descriptions Section */}
      <div className="rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/5 dark:border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-bubbledot text-xs text-[#F64302]">03</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Target Job Descriptions ({jds.length})
            </h2>
          </div>
        </div>

        {jds.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">No job descriptions saved yet.</p>
        ) : (
          <ul className="grid gap-2.5 md:grid-cols-2">
            {jds.map((j: DocumentJobDescription) => {
              const parsed = jdParsedSchema.safeParse(j.parsed);
              const skills = parsed.success ? parsed.data.requiredSkills : [];
              return (
                <li
                  key={j.id}
                  className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 p-4 hover:border-[#F64302]/40 transition-colors"
                >
                  <p className="font-semibold text-sm text-foreground">{j.title}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    Added: {j.createdAt.toISOString().slice(0, 10)} · <span className="text-[#F64302] font-semibold"><span className="font-bubbledot font-bold">{skills.length}</span> requirements</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {skills.slice(0, 8).map((s) => (
                      <Chip key={s} label={s} />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
