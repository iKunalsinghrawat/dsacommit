import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  getPublicRoadmapHref,
  getSignInHref,
} from "@/lib/public-destinations";
import { titleCase } from "@/lib/utils";
import { getRoadmapData } from "@/server/public-data";

export const dynamic = "force-dynamic";

const roadmapLevels = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
type RoadmapLevelKey = (typeof roadmapLevels)[number];

export default async function PublicRoadmapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = await searchParams;
  const requestedLevel =
    typeof rawSearchParams.level === "string" &&
    roadmapLevels.includes(rawSearchParams.level as (typeof roadmapLevels)[number])
      ? (rawSearchParams.level as (typeof roadmapLevels)[number])
      : undefined;

  const roadmap = await getRoadmapData();
  const roadmapEntries: Array<[RoadmapLevelKey, (typeof roadmap)[RoadmapLevelKey]]> = requestedLevel
    ? [[requestedLevel, roadmap[requestedLevel]]]
    : roadmapLevels.map((level) => [level, roadmap[level]]);

  return (
    <main className="page-shell py-10 sm:py-12">
      <div className="space-y-8">
        <PageHeader
          eyebrow="Roadmap preview"
          title="See the structure before you commit to the system."
          description="The public roadmap preview shows the exact progression students follow from fundamentals to advanced interview topics."
          actions={
            <Button asChild>
              <Link href={getSignInHref("/roadmap")}>Sign in for the full roadmap</Link>
            </Button>
          }
        />

        <div className="flex flex-wrap gap-3">
          {roadmapLevels.map((level) => {
            const active = requestedLevel ? requestedLevel === level : false;

            return (
              <Button asChild key={level} variant={active ? "default" : "secondary"}>
                <Link href={getPublicRoadmapHref(level)}>{titleCase(level)}</Link>
              </Button>
            );
          })}
          {requestedLevel ? (
            <Button asChild variant="ghost">
              <Link href={getPublicRoadmapHref()}>Show all levels</Link>
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {roadmapEntries.map(([level, items]) => (
            <Card key={level}>
              <CardHeader>
                <CardTitle>{titleCase(level)}</CardTitle>
                <CardDescription>
                  {items.length} checkpoints with concept notes, quizzes, and revision guidance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item) => (
                  <Link
                    className="block rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={getSignInHref(item.topic ? `/topics/${item.topic.slug}` : "/roadmap")}
                    key={item.id}
                  >
                    <div className="rounded-2xl border border-border bg-background/50 px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary/30">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm leading-6 text-muted">{item.summary}</p>
                        </div>
                        <Badge variant="outline">{item.topic?.problems.length ?? 0} problems</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
