"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const json = (await res.json()) as { error?: { message: string } };
    if (!res.ok) {
      setPending(false);
      setError(json.error?.message ?? "Could not register");
      return;
    }
    const result = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (result?.error) {
      router.push("/login");
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4 font-mono">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Full Name
        </label>
        <Input
          className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 text-foreground font-mono text-sm focus:border-[#F64302] focus:ring-1 focus:ring-[#F64302] transition-colors"
          placeholder="Candidate Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Email Address
        </label>
        <Input
          className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 text-foreground font-mono text-sm focus:border-[#F64302] focus:ring-1 focus:ring-[#F64302] transition-colors"
          type="email"
          autoComplete="email"
          placeholder="candidate@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Password (min 8 characters)
        </label>
        <Input
          className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 text-foreground font-mono text-sm focus:border-[#F64302] focus:ring-1 focus:ring-[#F64302] transition-colors"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error ? (
        <div className="rounded-xl bg-[#F64302]/10 border border-[#F64302]/20 p-2.5 text-xs text-[#F64302]">
          {error}
        </div>
      ) : null}
      <Button
        type="submit"
        disabled={pending}
        className="w-full h-11 rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md shadow-[#F64302]/20"
      >
        {pending ? "Creating Account…" : "Create Rehearse Account →"}
      </Button>
      <p className="pt-2 text-center text-xs text-muted-foreground font-mono">
        Already registered?{" "}
        <Link href="/login" className="text-foreground hover:text-[#F64302] underline transition-colors">
          Sign in
        </Link>
      </p>
    </form>
  );
}
