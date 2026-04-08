import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  getPublicProfileHref,
  getSignInHref,
} from "@/lib/public-destinations";
import { formatPercent } from "@/lib/utils";
import { getLeaderboard } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function PublicLeaderboardPage() {
  const leaderboard = await getLeaderboard();

  return (
    <main className="page-shell py-10 sm:py-12">
      <div className="space-y-8">
        <PageHeader
          eyebrow="Leaderboard preview"
          title="Consistency outranks chaos."
          description="This board rewards streaks, weekly consistency, and commitment scores, not random bursts of solving."
          actions={
            <Button asChild>
              <Link href={getSignInHref("/dashboard")}>Sign in to climb the board</Link>
            </Button>
          }
        />

        <div className="grid gap-4">
          {leaderboard.map((student, index) => (
            <Link
              className="block rounded-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={getPublicProfileHref(student.slug)}
              id={`student-${student.id}`}
              key={student.id}
            >
              <Card className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary/30">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 font-semibold text-primary">
                      #{index + 1}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{student.name}</p>
                        {student.isVerified ? <Badge variant="success">Verified</Badge> : null}
                      </div>
                      <p className="text-sm text-muted">{student.headline}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-semibold">
                      {student.studentProfile ? Math.round(student.studentProfile.commitmentScore) : 0}
                    </p>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted">
                      {formatPercent(student.studentProfile?.weeklyConsistencyScore ?? 0)} weekly consistency
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
