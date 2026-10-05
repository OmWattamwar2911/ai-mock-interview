import Link from "next/link";
import { requireAdmin } from "@/lib/session";

export default async function AssessmentBankPage() {
  const { error } = await requireAdmin();
  if (error) return <div className="rounded border border-border p-6">Admin access required.</div>;
  return <main className="max-w-4xl space-y-6"><header><p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">Admin / question bank</p><h1 className="mt-3 text-3xl font-medium">Assessment bank</h1><p className="mt-2 text-sm text-muted">Manage MCQ, multi-select, numeric, and coding-ready assessment prompts through the protected API.</p></header><div className="rounded border border-border bg-surface p-5"><p className="text-sm">The bank API supports search, CRUD, hidden-test editing, and soft deletion at <code>/api/admin/question-bank</code>.</p><Link href="/admin" className="mt-4 inline-block text-sm underline">Back to admin</Link></div></main>;
}