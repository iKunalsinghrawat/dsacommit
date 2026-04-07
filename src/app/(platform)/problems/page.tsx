import Link from "next/link";

import {
  ChangeRequestEntityType,
  ChangeRequestOperationType,
  Role,
  UserPortal,
} from "@/generated/prisma/enums";
import { ChangeRequestHistoryCard } from "@/components/approvals/change-request-history-card";
import { ProblemRequestSection } from "@/components/approvals/problem-request-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { requirePortalAccess, requireUser } from "@/lib/auth";
import { titleCase } from "@/lib/utils";
import { getUserChangeRequests } from "@/server/content-change-requests";
import { getCatalogMeta, getProblemsList, getStudentProblemState } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePortalAccess(UserPortal.PROBLEMS);
  const [user, meta, rawSearchParams] = await Promise.all([requireUser(), getCatalogMeta(), searchParams]);

  const topic = typeof rawSearchParams.topic === "string" ? rawSearchParams.topic : undefined;
  const company = typeof rawSearchParams.company === "string" ? rawSearchParams.company : undefined;
  const difficulty =
    typeof rawSearchParams.difficulty === "string" ? rawSearchParams.difficulty : undefined;

  const [problems, state] = await Promise.all([
    getProblemsList({
      topic,
      company,
      difficulty: difficulty as "EASY" | "MEDIUM" | "HARD" | undefined,
    }),
    user.role === Role.STUDENT ? getStudentProblemState(user.id) : null,
  ]);
  const requests = await getUserChangeRequests({
    userId: user.id,
    entityTypes: [ChangeRequestEntityType.PROBLEM],
    limit: 6,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Problems"
        title="Solve with strategy instead of random tabs."
        description="Filter by topic, company, and difficulty. The point is not maximum volume. The point is measurable, placement-relevant progress."
      />

      <Card>
        <CardContent className="p-6">
          <form className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="topic">
                Topic
              </label>
              <Select defaultValue={topic} id="topic" name="topic">
                <option value="">All topics</option>
                {meta.topics.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="company">
                Company
              </label>
              <Select defaultValue={company} id="company" name="company">
                <option value="">All companies</option>
                {meta.companies.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="difficulty">
                Difficulty
              </label>
              <Select defaultValue={difficulty} id="difficulty" name="difficulty">
                <option value="">All levels</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </Select>
            </div>
            <Button className="md:col-span-3 md:justify-self-start" type="submit" variant="secondary">
              Apply filters
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {problems.map((problem) => {
          const solved = state?.solved.has(problem.id) ?? false;
          const attempted = state?.attempted.has(problem.id) ?? false;

          return (
            <Link href={`/problems/${problem.id}`} key={problem.id}>
              <Card className="hover:border-primary/30">
                <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-semibold">{problem.title}</p>
                      <Badge variant="outline">{titleCase(problem.difficulty)}</Badge>
                      <Badge variant="secondary">{problem.topic.name}</Badge>
                      {solved ? <Badge variant="success">Solved</Badge> : attempted ? <Badge>Attempted</Badge> : null}
                    </div>
                    <p className="text-sm leading-7 text-muted">{problem.problemStatement}</p>
                    <div className="flex flex-wrap gap-2">
                      {problem.companyTags.slice(0, 4).map((tag) => (
                        <Badge key={tag.id}>{tag.company.name}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">{problem.frequency}/5</p>
                    <p className="text-sm text-muted">frequency score</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ProblemRequestSection
          availableModes={[ChangeRequestOperationType.CREATE]}
          companies={meta.companies.map((companyItem) => ({
            id: companyItem.id,
            name: companyItem.name,
          }))}
          topics={meta.topics.map((topicItem) => ({
            id: topicItem.id,
            name: topicItem.name,
          }))}
        />
        <ChangeRequestHistoryCard
          description="Create requests from the problem catalog appear here and stay pending until an admin reviews them."
          requests={requests}
          title="Problem request history"
        />
      </div>
    </div>
  );
}
