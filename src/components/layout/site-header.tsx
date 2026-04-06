import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

const links = [
  { href: "#roadmap", label: "Roadmap" },
  { href: "#mentors", label: "Mentors" },
  { href: "#companies", label: "Companies" },
  { href: "#leaderboard", label: "Leaderboard" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="page-shell flex h-20 items-center justify-between gap-6">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-muted lg:flex">
          {links.map((link) => (
            <Link className="hover:text-foreground" href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild size="sm" variant="secondary">
            <Link href="/auth/signin">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/auth/signup">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
