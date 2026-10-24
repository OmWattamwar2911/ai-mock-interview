"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

const faqItems = [
  {
    q: "What is Rehearse?",
    a: "Rehearse is an automated mock interview platform designed to simulate real technical, behavioural, and HR interview rounds using speech-to-speech AI, real-time code execution, and rubric-driven evaluations.",
  },
  {
    q: "What inputs does Rehearse need to generate an interview?",
    a: "You provide your resume and target job description (as text or PDF/DOCX). Rehearse parses both documents into normalized skills, computes your skill gaps, and tailors the question roadmap directly to your background.",
  },
  {
    q: "How does the live coding round work?",
    a: "The interview includes an embedded Monaco code editor synchronized in real time with the interviewer via WebRTC data channels. An integrated sandbox runs your code against visible and hidden test cases in Python, C, C++, and Java.",
  },
  {
    q: "What does the post-interview report include?",
    a: "Every session generates an evaluation report featuring an overall score out of 10, category ratings, transcript citations, test execution metrics, identified strengths, areas to improve, and a 7-day practice plan.",
  },
  {
    q: "Which browsers support the voice interview?",
    a: "WebRTC microphone streaming and automated speech recognition operate best on Google Chrome and Microsoft Edge on desktop.",
  },
  {
    q: "How is user data stored and handled?",
    a: "Resumes, job descriptions, and interview transcripts are stored securely in a PostgreSQL database using Prisma ORM. Private interview reference solutions are never sent to candidate browser sessions.",
  },
];

export function Faq() {
  const { ref, revealed } = useReveal(0.1);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx((cur) => (cur === idx ? null : idx));
  };

  return (
    <section
      ref={ref}
      id="faq"
      className="w-full bg-[#f0eded] dark:bg-[#0f0f12] px-6 py-20 sm:px-10 lg:px-16 border-t border-black/5"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-12">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-black/50 dark:text-white/50">
            Common Inquiries
          </p>
          <h2 className="mt-2 font-mono text-3xl sm:text-4xl font-semibold tracking-tight text-black dark:text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-2">
          {faqItems.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                style={{ transitionDelay: `${idx * 60}ms` }}
                className={`overflow-hidden rounded-2xl bg-[#EBE8EB] dark:bg-[#18181c] border border-black/5 transition-all duration-500 ${
                  revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between p-5 sm:p-6 text-left font-mono text-sm sm:text-base font-semibold text-black dark:text-white transition-colors hover:text-black/70 dark:hover:text-white/70"
                >
                  <span>{item.q}</span>
                  <span
                    className={`ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/10 transition-transform duration-300 ${
                      isOpen ? "rotate-180 bg-[#F64302] text-white" : ""
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 sm:px-6 font-mono text-xs sm:text-sm leading-relaxed text-black/70 dark:text-white/70 border-t border-black/5 pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
