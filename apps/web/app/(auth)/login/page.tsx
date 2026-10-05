import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to continue a rehearsal.</p>
      <Suspense fallback={<p className="mt-8 text-sm text-muted">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
