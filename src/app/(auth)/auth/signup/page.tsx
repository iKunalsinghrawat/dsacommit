import Link from "next/link";

import { SignUpForm } from "@/components/auth/signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSafeRedirectPath, getSignInHref } from "@/lib/public-destinations";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = await searchParams;
  const nextPath = getSafeRedirectPath(
    typeof rawSearchParams.next === "string" ? rawSearchParams.next : undefined,
  );

  return (
    <main className="page-shell py-12">
      <div className="mb-8 max-w-3xl space-y-4">
        <span className="section-kicker">Free forever for students</span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Create your DSA Commit workspace and start with a roadmap instead of random pressure.
        </h1>
        <p className="text-lg leading-8 text-muted">
          Students get a personalized discipline dashboard, mentors get public guidance profiles, and companies get a focused portal for prep signals and outreach.
        </p>
      </div>

      <Card className="glass-panel-strong p-0">
        <CardHeader className="border-b border-border/80 p-6">
          <CardTitle>Build your account</CardTitle>
          <CardDescription>
            Choose a role, complete the essentials, and we&apos;ll route you into the right experience immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <SignUpForm nextPath={nextPath ?? undefined} />
          <p className="mt-6 text-sm text-muted">
            Already have an account?{" "}
            <Link className="font-semibold text-primary" href={getSignInHref(nextPath)}>
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
