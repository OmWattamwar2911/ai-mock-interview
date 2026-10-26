"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setPending(false);
    if (result?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push(params.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 font-mono">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Email Address
        </label>
        <Input
          className="h-11 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/50 text-foreground font-mono text-sm focus:border-[#F64302] focus:ring-2 focus:ring-[#F64302]/30 outline-none transition-all"
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
          Password
        </label>
        <Input
          className="h-11 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/50 text-foreground font-mono text-sm focus:border-[#F64302] focus:ring-2 focus:ring-[#F64302]/30 outline-none transition-all"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error ? (
        <div className="rounded-xl bg-[#F64302]/10 border border-[#F64302]/30 p-3 text-xs text-[#F64302]">
          {error}
        </div>
      ) : null}
      <Button
        type="submit"
        disabled={pending}
        className="w-full h-11 rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-md shadow-[#F64302]/20"
      >
        {pending ? "Signing in…" : "Sign In →"}
      </Button>
      <p className="pt-2 text-center text-xs text-muted-foreground font-mono">
        New candidate?{" "}
        <Link href="/register" className="text-foreground hover:text-[#F64302] underline font-semibold transition-colors">
          Register new account
        </Link>
      </p>
    </form>
  );
}
