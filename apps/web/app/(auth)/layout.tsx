import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing-header";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader
        extra={
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            Home
          </Link>
        }
      />
      <div className="flex flex-1 items-center justify-center px-4 py-16">{children}</div>
    </div>
  );
}
