import Link from "next/link";

export default function HomePage() {
  return (
    <section className="relative overflow-hidden">
      <div className="grid-dot pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex max-w-3xl flex-col gap-6 px-6 py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Mock interviews from your resume</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
          Practice the interview you&apos;ll actually get.
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted">
          Upload a resume and a job description. Rehearse maps the skill gap, runs a timed session, and scores
          answers with an in-browser compiler.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
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
        <ol id="how" className="mt-8 grid gap-4 border-t border-border pt-10 font-mono text-sm text-muted">
          <li>1. Upload resume and job description</li>
          <li>2. Review the skill gap</li>
          <li>3. Sit a timed interview</li>
          <li>4. Read the scored report</li>
        </ol>
      </div>
    </section>
  );
}
