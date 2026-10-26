import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-[#F64302] tracking-widest uppercase">
          Welcome back
        </span>
        <h1 className="text-3xl font-jetbrains font-bold tracking-tight text-foreground">
          Sign in to your account
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground font-mono">
          Enter your credentials to resume your rehearsal session.
        </p>
      </div>
      <Suspense fallback={<p className="text-xs font-mono text-muted-foreground">Loading session…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
