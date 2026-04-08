import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ChangeRequestEntityType,
  ChangeRequestOperationType,
  UserPortal,
} from "@/generated/prisma/enums";
import { ChangeRequestHistoryCard } from "@/components/approvals/change-request-history-card";
import { TopicRequestSection } from "@/components/approvals/topic-request-section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePortalAccess } from "@/lib/auth";
import { getUserChangeRequests } from "@/server/content-change-requests";
import { getTopicBySlug } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requirePortalAccess(UserPortal.TOPICS);
  const topic = await getTopicBySlug(slug);

  if (!topic) {
    notFound();
  }

  const requests = await getUserChangeRequests({
    userId: user.id,
    entityTypes: [ChangeRequestEntityType.TOPIC],
    entityId: topic.id,
    limit: 6,
  });

  const companyTags = Array.from(
    new Set(
      topic.problems.flatMap((problem) =>
        problem.companyTags.map((companyTag) => companyTag.company.name),
      ),
    ),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${topic.level} topic`}
        title={topic.name}
        description={topic.conceptSummary}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="glass-panel-strong">
          <CardHeader>
            <CardTitle>Concept notes</CardTitle>
            <CardDescription>What to internalize before you start chasing volume.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-8 text-muted">{topic.notes}</p>
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted">
                Difficulty progression
              </p>
              {topic.difficultyProgression.map((step) => (
                <div className="rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm" key={step}>
                  {step}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revision checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topic.revisionChecklist.map((item) => (
                <div className="rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm" key={item}>
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company tags</CardTitle>
              <CardDescription>Frequently associated with these target companies.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {companyTags.map((company) => (
                <Badge key={company} variant="outline">
                  {company}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Quiz</CardTitle>
            <CardDescription>Quick self-check before moving deeper.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(topic.quiz as Array<{ question: string; answer: string }>).map((item) => (
              <div className="rounded-2xl border border-border bg-background/50 p-4" key={item.question}>
                <p className="font-medium">{item.question}</p>
                <p className="mt-2 text-sm leading-7 text-muted">{item.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended questions</CardTitle>
            <CardDescription>Start easy, then move into interview-relevant depth.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topic.problems.map((problem) => (
              <Link className="block h-full" href={`/problems/${problem.id}`} key={problem.id}>
                <div className="h-full rounded-2xl border border-border bg-background/50 p-4 hover:border-primary/30">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-medium">{problem.title}</p>
                    <Badge variant="outline">{problem.difficulty}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {problem.companyTags.slice(0, 3).map((tag) => (
                      <Badge key={tag.id}>{tag.company.name}</Badge>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <TopicRequestSection
          availableModes={[ChangeRequestOperationType.UPDATE, ChangeRequestOperationType.DELETE]}
          currentTopic={{
            id: topic.id,
            name: topic.name,
            slug: topic.slug,
            level: topic.level,
            sortOrder: topic.sortOrder,
            conceptSummary: topic.conceptSummary,
            notes: topic.notes,
            difficultyProgression: topic.difficultyProgression,
            revisionChecklist: topic.revisionChecklist,
            quiz: topic.quiz as Array<{ question: string; answer: string }>,
            estimatedHours: topic.estimatedHours,
            icon: topic.icon,
            accentColor: topic.accentColor,
          }}
        />
        <ChangeRequestHistoryCard
          description="Requests for this live topic. The public version stays unchanged until an admin approves the update."
          emptyLabel="No topic-specific change requests have been submitted for this topic yet."
          requests={requests}
          title="Topic request status"
        />
      </div>
    </div>
  );
}
