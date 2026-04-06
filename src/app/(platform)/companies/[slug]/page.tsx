import Link from "next/link";
import { notFound } from "next/navigation";

import { UserPortal } from "@/generated/prisma/enums";
import { DifficultyDonut } from "@/components/charts/difficulty-donut";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePortalAccess } from "@/lib/auth";
import { getCompanyBySlug } from "@/server/public-data";
import { titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requirePortalAccess(UserPortal.COMPANIES);
  const company = await getCompanyBySlug(slug);

  if (!company) {
    notFound();
  }

  const difficultyData = [
    {
      name: "Easy",
      value: company.problemTags.filter((tag) => tag.problem.difficulty === "EASY").length,
    },
    {
      name: "Medium",
      value: company.problemTags.filter((tag) => tag.problem.difficulty === "MEDIUM").length,
    },
    {
      name: "Hard",
      value: company.problemTags.filter((tag) => tag.problem.difficulty === "HARD").length,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Company prep"
        title={company.name}
        description={company.overview}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="glass-panel-strong">
          <CardHeader>
            <CardTitle>What this company usually rewards</CardTitle>
            <CardDescription>Focus topics, rounds, and prep habits that matter most.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {company.commonFocusTopics.map((topic) => (
                <Badge key={topic} variant="secondary">
                  {topic.replace(/-/g, " ")}
                </Badge>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/50 p-4">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted">OA pattern</p>
                <div className="mt-3 space-y-2 text-sm leading-7 text-muted">
                  {company.oaPattern.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background/50 p-4">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted">Interview rounds</p>
                <div className="mt-3 space-y-2 text-sm leading-7 text-muted">
                  {company.interviewRounds.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted">Preparation tips</p>
              {company.preparationTips.map((tip) => (
                <div className="rounded-2xl border border-border bg-background/50 p-4 text-sm leading-7 text-muted" key={tip}>
                  {tip}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Difficulty distribution</CardTitle>
            <CardDescription>What the current tagged set looks like.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DifficultyDonut data={difficultyData} />
            <div className="grid gap-3">
              {difficultyData.map((entry) => (
                <div className="flex items-center justify-between rounded-2xl border border-border bg-background/50 px-4 py-3" key={entry.name}>
                  <span>{entry.name}</span>
                  <span className="font-semibold">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tagged question list</CardTitle>
          <CardDescription>Use this set when you want focused reps for {company.name}.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {company.problemTags.map((tag) => (
            <Link href={`/problems/${tag.problem.id}`} key={tag.id}>
              <div className="rounded-2xl border border-border bg-background/50 p-4 hover:border-primary/30">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium">{tag.problem.title}</p>
                  <Badge variant="outline">{titleCase(tag.problem.difficulty)}</Badge>
                </div>
                <p className="text-sm text-muted">{tag.problem.topic.name}</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
