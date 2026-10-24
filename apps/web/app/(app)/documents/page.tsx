import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jdParsedSchema, resumeParsedSchema } from "@rehearse/shared";
import { Chip } from "@/components/ui/chip";

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
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-muted">Reusable resumes and job descriptions.</p>
        </div>
        <Link href="/onboarding" className="text-sm underline">
          Add more
        </Link>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-medium">Resumes</h2>
        {resumes.length === 0 ? (
          <p className="text-sm text-muted">No resumes yet.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {resumes.map((r: DocumentResume) => {
              const parsed = resumeParsedSchema.safeParse(r.parsed);
              const skills = parsed.success ? parsed.data.skills : [];
              return (
                <li key={r.id} className="rounded border border-border bg-surface p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{r.fileName}</p>
                      {(r as any).atsAnalysis?.overallAtsScore !== undefined && (
                        <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-mono font-semibold text-primary">
                          ATS {(r as any).atsAnalysis.overallAtsScore}%
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted">{r.createdAt.toISOString().slice(0, 10)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {skills.slice(0, 8).map((s) => (
                        <Chip key={s} label={s} />
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border flex justify-end">
                    <Link
                      href="/resume-analyzer"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      {(r as any).atsAnalysis ? "View ATS Breakdown →" : "Run ATS Analysis →"}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium">Job descriptions</h2>
        {jds.length === 0 ? (
          <p className="text-sm text-muted">No job descriptions yet.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {jds.map((j: DocumentJobDescription) => {
              const parsed = jdParsedSchema.safeParse(j.parsed);
              const skills = parsed.success ? parsed.data.requiredSkills : [];
              return (
                <li key={j.id} className="rounded border border-border bg-surface p-4">
                  <p className="font-medium">{j.title}</p>
                  <p className="mt-1 font-mono text-xs text-muted">{j.createdAt.toISOString().slice(0, 10)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skills.slice(0, 8).map((s) => (
                      <Chip key={s} label={s} />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
