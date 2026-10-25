import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-1">
        <span className="font-bubbledot text-xs text-[#F64302] tracking-wider uppercase">01 / REGISTRATION</span>
        <h1 className="text-2xl sm:text-3xl font-jetbrains font-bold tracking-tight text-foreground">
          CREATE ACCOUNT
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground font-mono">
          Upload your resume and target JD to calculate your skill gap map.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
