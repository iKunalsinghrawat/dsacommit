import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-3 font-semibold", className)}>
      <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_18px_40px_-18px_rgba(15,118,110,0.8)]">
        DC
      </div>
      <div>
        <p className="text-sm uppercase tracking-[0.28em] text-muted">Discipline</p>
        <p className="text-base font-semibold tracking-tight">DSA Commit</p>
      </div>
    </Link>
  );
}
