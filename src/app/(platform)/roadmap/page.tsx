import { UserPortal } from "@/generated/prisma/enums";
import Link from "next/link";

import { requirePortalAccess } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getRoadmapData } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  await requirePortalAccess(UserPortal.ROADMAP);
  const roadmap = await getRoadmapData();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Roadmap"
        title="A beginner-to-advanced path built for placement outcomes, not random grinding."
        description="Each topic comes with notes, difficulty progression, quizzes, revision checklists, and recommended internal questions so students always know the next useful step."
        actions={
          <Button asChild variant="secondary">
            <Link href="/topics">Browse topic library</Link>
          </Button>
        }
      />

      <div className="grid gap-6">
        {Object.entries(roadmap).map(([level, topics]) => (
          <Card key={level}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Badge variant="secondary">{level}</Badge>
                  <CardTitle className="mt-4 text-3xl">
                    {level === "BEGINNER"
                      ? "Start with logic, arrays, strings, and recursion."
                      : level === "INTERMEDIATE"
                        ? "Build reliable pattern recognition and cleaner implementation."
                        : "Move into interview-heavy advanced decision patterns."}
                  </CardTitle>
                </div>
                <CardDescription>{topics.length} topics in this stage</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              {topics.map((topic) => (
                <Link href={`/topics/${topic.slug}`} key={topic.id}>
                  <div className="rounded-[28px] border border-border bg-background/50 p-5 hover:border-primary/30">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-lg font-semibold">{topic.name}</p>
                      <Badge variant="outline">{topic.problems.length} problems</Badge>
                    </div>
                    <p className="text-sm leading-7 text-muted">{topic.conceptSummary}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
