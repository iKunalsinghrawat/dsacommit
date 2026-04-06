"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Role, UserPortal } from "@/generated/prisma/enums";
import { signOutAction } from "@/lib/actions/auth-actions";
import { getNavigationItems } from "@/lib/access-control";
import { roleLabels } from "@/lib/constants";
import { cn, getInitials } from "@/lib/utils";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ShellUser = {
  name: string;
  role: Role;
  headline: string | null;
  accessGrants: UserPortal[];
};

export function AppShell({
  children,
  user,
}: {
  children: ReactNode;
  user: ShellUser;
}) {
  const currentPath = usePathname();
  const navItems = getNavigationItems(user.role, user.accessGrants);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="page-shell flex h-20 items-center justify-between gap-4">
          <Logo />
          <div className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <Link
                className={cn(
                  "rounded-full px-4 py-2 text-sm text-muted",
                  currentPath.startsWith(item.href) ? "bg-card text-foreground" : "hover:bg-card",
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden items-center gap-3 rounded-full border border-border bg-card px-4 py-2 sm:flex">
              <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {getInitials(user.name)}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs uppercase tracking-[0.22em] text-muted">{roleLabels[user.role]}</p>
              </div>
            </div>
            <form action={signOutAction}>
              <Button size="sm" variant="secondary" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="page-shell grid gap-8 py-8 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="glass-panel sticky top-28 p-5">
            <Badge>{roleLabels[user.role]}</Badge>
            <h2 className="mt-4 text-xl font-semibold">{user.name}</h2>
            <p className="mt-2 text-sm leading-7 text-muted">
              {user.headline ?? "Stay disciplined, stay visible, and keep moving forward."}
            </p>
            <div className="mt-6 space-y-2">
              {navItems.map((item) => (
                <Link
                  className={cn(
                    "block rounded-2xl px-4 py-3 text-sm",
                    currentPath.startsWith(item.href)
                      ? "bg-primary/10 font-medium text-foreground"
                      : "text-muted hover:bg-card hover:text-foreground",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-8">
          <div className="flex gap-2 overflow-x-auto lg:hidden">
            {navItems.map((item) => (
              <Link
                className={cn(
                  "rounded-full border border-border px-4 py-2 text-sm whitespace-nowrap",
                  currentPath.startsWith(item.href) ? "bg-card text-foreground" : "text-muted",
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
