import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  getPublicCompaniesHref,
  getSignInHref,
} from "@/lib/public-destinations";
import { titleCase } from "@/lib/utils";
import { getCompanyBySlug } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function PublicCompanyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);

  if (!company) {
    notFound();
  }

  const difficultyData = [
    {
      label: "Easy",
      count: company.problemTags.filter((tag) => tag.problem.difficulty === "EASY").length,
    },
    {
      label: "Medium",
      count: company.problemTags.filter((tag) => tag.problem.difficulty === "MEDIUM").length,
    },
    {
      label: "Hard",
      count: company.problemTags.filter((tag) => tag.problem.difficulty === "HARD").length,
    },
  ];

  return (
    <main className="page-shell py-10 sm:py-12">
      <div className="space-y-8">
        <PageHeader
          eyebrow="Company prep preview"
          title={company.name}
          description={company.overview}
          actions={
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href={getPublicCompaniesHref()}>All companies</Link>
              </Button>
              <Button asChild>
                <Link href={getSignInHref(`/companies/${company.slug}`)}>Unlock the full prep track</Link>
              </Button>
            </div>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="glass-panel-strong">
            <CardHeader>
              <CardTitle>What this company usually rewards</CardTitle>
              <CardDescription>Focus topics, OA patterns, and interview signals students should prioritize.</CardDescription>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Difficulty distribution</CardTitle>
              <CardDescription>Current tagged-question mix for this company path.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {difficultyData.map((entry) => (
                <div className="flex items-center justify-between rounded-2xl border border-border bg-background/50 px-4 py-3" key={entry.label}>
                  <span>{entry.label}</span>
                  <span className="font-semibold">{entry.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tagged question preview</CardTitle>
            <CardDescription>Open the full platform to solve these questions with tracking, notes, and commitment scoring.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {company.problemTags.map((tag) => (
              <Link
                className="block h-full rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={getSignInHref(`/problems/${tag.problem.id}`)}
                key={tag.id}
              >
                <div className="h-full rounded-2xl border border-border bg-background/50 p-4 transition-transform duration-200 hover:-translate-y-1 hover:border-primary/30">
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
    </main>
  );
}
