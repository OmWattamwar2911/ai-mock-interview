"use client";

import { useReveal } from "@/hooks/useReveal";

const steps = [
  {
    step: "01",
    title: "Parse",
    description: "Your resume and the job description become editable skill chips.",
  },
  {
    step: "02",
    title: "Gap",
    description: "Matched, partial and missing skills with a written summary.",
  },
  {
    step: "03",
    title: "Interview",
    description: "A voice interview with live follow-ups, a coding round and a behavioural round.",
  },
  {
    step: "04",
    title: "Report",
    description: "A scored report with strengths, fixes and a practice plan.",
  },
];

export function HowItWorks() {
  const { ref, revealed } = useReveal(0.1);

  return (
    <section
      ref={ref}
      id="how-it-works"
      className="w-full bg-[#f0eded] dark:bg-[#0f0f12] px-6 py-24 sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-12">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-black/50 dark:text-white/50">
            Pipeline Architecture
          </p>
          <h2 className="mt-2 font-mono text-3xl sm:text-4xl font-semibold tracking-tight text-black dark:text-white">
            How It Works
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {steps.map((s, idx) => (
            <div
              key={s.step}
              style={{ transitionDelay: `${150 + idx * 100}ms` }}
              className={`flex flex-col justify-between rounded-2xl bg-[#EBE8EB] dark:bg-[#18181c] p-6 border border-black/5 transition-all duration-700 ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <div>
                <span className="font-bubbledot text-4xl sm:text-5xl font-bold text-black/80 dark:text-white/80">
                  {s.step}
                </span>
                <h3 className="mt-4 font-mono text-xl font-bold tracking-tight text-black dark:text-white">
                  {s.title}
                </h3>
              </div>
              <p className="mt-6 font-mono text-xs sm:text-sm leading-relaxed text-black/60 dark:text-white/60">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
