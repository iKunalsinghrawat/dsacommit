import Link from "next/link";

import { SignInForm } from "@/components/auth/signin-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <main className="page-shell flex min-h-[calc(100vh-96px)] items-center py-12">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <span className="section-kicker">Sign back into your routine</span>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Resume your roadmap, streaks, company prep, and today&apos;s focused DSA task.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted">
            The platform is free for students and built to remove decision fatigue. Sign in to continue your commitment-based preparation flow.
          </p>
        </section>

        <Card className="glass-panel-strong p-0">
          <CardHeader className="border-b border-border/80 p-6">
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Use the seeded demo credentials or your own account to enter the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <SignInForm />
            <p className="text-sm text-muted">
              New here?{" "}
              <Link className="font-semibold text-primary" href="/auth/signup">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
