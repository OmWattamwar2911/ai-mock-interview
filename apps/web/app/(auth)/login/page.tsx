import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-1">
        <span className="font-bubbledot text-xs text-[#F64302] tracking-wider uppercase">01 / AUTHENTICATION</span>
        <h1 className="text-2xl sm:text-3xl font-bubbledot font-bold tracking-tight text-foreground">
          CANDIDATE SIGN IN
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground font-mono">
          Enter your credentials to resume your rehearsal session.
        </p>
      </div>
      <Suspense fallback={<p className="mt-8 text-xs font-mono text-muted-foreground">Loading session…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
