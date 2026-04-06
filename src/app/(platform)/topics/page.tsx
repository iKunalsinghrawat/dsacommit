import { UserPortal } from "@/generated/prisma/enums";
import Link from "next/link";

import { requirePortalAccess } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getTopicsList } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  await requirePortalAccess(UserPortal.TOPICS);
  const topics = await getTopicsList();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Topics"
        title="Study by topic, not by random search history."
        description="Each topic page includes concept summaries, notes, company tags, quizzes, and question ladders that match the roadmap."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {topics.map((topic) => (
          <Link href={`/topics/${topic.slug}`} key={topic.id}>
            <Card className="h-full hover:border-primary/30">
              <CardHeader>
                <CardTitle>{topic.name}</CardTitle>
                <CardDescription>{topic.level} • {topic.estimatedHours}h estimated</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-7 text-muted">{topic.conceptSummary}</p>
                <p className="text-sm text-muted">{topic.problems.length} linked problems</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
