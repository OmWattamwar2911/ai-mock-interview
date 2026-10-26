import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-[#F64302] tracking-widest uppercase">
          New Candidate
        </span>
        <h1 className="text-3xl font-jetbrains font-bold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground font-mono">
          Upload your resume and target JD to calculate your skill gap map.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
