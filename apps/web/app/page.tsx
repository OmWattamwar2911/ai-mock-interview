import Link from "next/link";
import { MarketingHeader } from "@/components/marketing-header";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader
        extra={
          <Link href="/login" className="text-sm text-muted hover:text-foreground">
            Sign in
          </Link>
        }
      />
      <section className="relative overflow-hidden">
        <div className="grid-dot pointer-events-none absolute inset-0" />
        <div className="relative mx-auto flex max-w-3xl flex-col gap-6 px-6 py-24">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Mock interviews from your resume</p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            Practice the interview you&apos;ll actually get.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted">
            Upload a resume and a job description. Rehearse maps the skill gap, generates personalised questions, runs a
            timed session with an in-browser compiler, and scores every answer.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded bg-accent px-4 text-sm font-medium text-background transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              Get started
            </Link>
            <Link
              href="#how"
              className="inline-flex h-10 items-center justify-center rounded border border-border-strong px-4 text-sm font-medium transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>
      <section id="how" className="mx-auto w-full max-w-4xl px-6 pb-24">
        <ol className="grid gap-4 border-t border-border pt-10 sm:grid-cols-2">
          {[
            ["01", "Parse", "Resume and JD become editable skill chips."],
            ["02", "Gap", "Matched, partial, and missing skills with a written summary."],
            ["03", "Interview", "Timed conceptual, behavioural, and coding questions."],
            ["04", "Report", "Rubric scores, compiler results, and an improvement plan."],
          ].map(([n, title, copy]) => (
            <li key={n} className="rounded border border-border bg-surface p-5">
              <p className="font-mono text-xs text-muted">{n}</p>
              <h2 className="mt-2 text-lg font-medium">{title}</h2>
              <p className="mt-2 text-sm text-muted">{copy}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
