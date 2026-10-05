import Link from "next/link";
import { requireAdmin } from "@/lib/session";

export default async function AdminPage() {
  const { error } = await requireAdmin();
  if (error) return <div className="rounded border border-border p-6">Admin access required.</div>;
  return <main className="max-w-3xl space-y-6"><header><p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">Admin</p><h1 className="mt-3 text-3xl font-medium">Question operations</h1></header><Link href="/admin/assessment-bank" className="inline-block rounded border border-border px-4 py-2 text-sm hover:bg-elevated">Open assessment bank</Link></main>;
}