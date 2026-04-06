import Link from "next/link";

import { Logo } from "@/components/layout/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 py-10">
      <div className="page-shell grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-2xl text-sm leading-7 text-muted">
            DSA Commit helps students move from random problem solving to a disciplined placement system with accountability, roadmap clarity, and company-aware preparation.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-muted">
          <Link href="/auth/signup">Create account</Link>
          <Link href="/auth/signin">Sign in</Link>
          <Link href="/roadmap">Roadmap</Link>
          <Link href="/community">Community</Link>
        </div>
      </div>
    </footer>
  );
}
