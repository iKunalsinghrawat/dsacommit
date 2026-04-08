import { ChangeRequestEntityType, UserPortal } from "@/generated/prisma/enums";
import Link from "next/link";

import { RoadmapApprovalPanel } from "@/components/approvals/roadmap-approval-panel";
import { requirePortalAccess } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getUserChangeRequests } from "@/server/content-change-requests";
import { getRoadmapData } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const user = await requirePortalAccess(UserPortal.ROADMAP);
  const [roadmap, requests] = await Promise.all([
    getRoadmapData(),
    getUserChangeRequests({
      userId: user.id,
      entityTypes: [ChangeRequestEntityType.ROADMAP_ITEM],
      limit: 6,
    }),
  ]);
  const roadmapEntries = Object.entries(roadmap) as Array<
    [keyof typeof roadmap, (typeof roadmap)[keyof typeof roadmap]]
  >;
  const flatItems = roadmapEntries.flatMap(([, items]) =>
    items.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      level: item.level,
      summary: item.summary,
      details: item.details,
      sortOrder: item.sortOrder,
      topicId: item.topic?.id ?? null,
      topicName: item.topic?.name ?? null,
    })),
  );
  const topicOptions = Array.from(
    new Map(
      flatItems
        .filter((item) => item.topicId && item.topicName)
        .map((item) => [item.topicId!, { id: item.topicId!, name: item.topicName! }]),
    ).values(),
  );

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
        {roadmapEntries.map(([level, items]) => (
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
                <CardDescription>{items.length} roadmap items in this stage</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              {items.map((item) => {
                const content = (
                  <div className="rounded-[28px] border border-border bg-background/50 p-5 hover:border-primary/30">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">{item.title}</p>
                        {item.topic ? (
                          <p className="text-xs uppercase tracking-[0.24em] text-muted">{item.topic.name}</p>
                        ) : null}
                      </div>
                      <Badge variant="outline">{item.topic?.problems.length ?? 0} problems</Badge>
                    </div>
                    <p className="text-sm leading-7 text-muted">{item.summary}</p>
                  </div>
                );

                if (!item.topic?.slug) {
                  return <div key={item.id}>{content}</div>;
                }

                return (
                  <Link href={`/topics/${item.topic.slug}`} key={item.id}>
                    {content}
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <RoadmapApprovalPanel items={flatItems} requests={requests} topics={topicOptions} />
    </div>
  );
}
