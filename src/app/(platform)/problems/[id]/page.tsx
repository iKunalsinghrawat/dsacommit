import { notFound } from "next/navigation";

import { ChangeRequestHistoryCard } from "@/components/approvals/change-request-history-card";
import { ProblemRequestSection } from "@/components/approvals/problem-request-section";
import { ProblemWorkspace } from "@/components/problems/problem-workspace";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  ChangeRequestEntityType,
  ChangeRequestOperationType,
  Role,
  SubmissionState,
  UserPortal,
} from "@/generated/prisma/enums";
import {
  toggleBookmarkAction,
  toggleRevisionAction,
  updateProblemStatusAction,
} from "@/lib/actions/platform-actions";
import { requirePortalAccess, requireUser } from "@/lib/auth";
import { titleCase } from "@/lib/utils";
import {
  getProblemChangeRequestRecord,
  getUserChangeRequests,
} from "@/server/content-change-requests";
import { getCatalogMeta, getProblemById } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePortalAccess(UserPortal.PROBLEMS);
  const user = await requireUser();
  const [data, meta, requestableProblem, requests] = await Promise.all([
    getProblemById(id, user.id),
    getCatalogMeta(),
    getProblemChangeRequestRecord(id),
    getUserChangeRequests({
      userId: user.id,
      entityTypes: [ChangeRequestEntityType.PROBLEM],
      entityId: id,
      limit: 6,
    }),
  ]);

  if (!data || !requestableProblem) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Problem detail"
        title={data.problem.title}
        description={`${data.problem.topic.name} - ${titleCase(data.problem.difficulty)} - ${data.problem.estimatedMinutes} mins`}
      />

      {user.role === Role.STUDENT ? (
        <Card className="glass-panel-strong">
          <CardHeader>
            <CardTitle>Tracking actions</CardTitle>
            <CardDescription>Mark progress, save for later, or add to revision.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <form action={updateProblemStatusAction}>
              <input name="problemId" type="hidden" value={data.problem.id} />
              <input name="status" type="hidden" value={SubmissionState.SOLVED} />
              <button
                className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                type="submit"
              >
                Mark solved
              </button>
            </form>
            <form action={updateProblemStatusAction}>
              <input name="problemId" type="hidden" value={data.problem.id} />
              <input name="status" type="hidden" value={SubmissionState.ATTEMPTED} />
              <button className="rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold" type="submit">
                Mark attempted
              </button>
            </form>
            <form action={toggleBookmarkAction}>
              <input name="problemId" type="hidden" value={data.problem.id} />
              <button className="rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold" type="submit">
                {data.isBookmarked ? "Remove bookmark" : "Bookmark"}
              </button>
            </form>
            <form action={toggleRevisionAction}>
              <input name="problemId" type="hidden" value={data.problem.id} />
              <button className="rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold" type="submit">
                {data.inRevisionQueue ? "Remove from revision" : "Revision later"}
              </button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{data.problem.topic.name}</Badge>
              <Badge variant="outline">{titleCase(data.problem.difficulty)}</Badge>
              {data.problem.companyTags.map((tag) => (
                <Badge key={tag.id}>{tag.company.name}</Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted">Problem statement</p>
              <p className="mt-3 text-sm leading-8 text-muted">{data.problem.problemStatement}</p>
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted">Examples</p>
              <div className="mt-3 space-y-3">
                {(data.problem.examples as Array<{ input: string; output: string; explanation: string }>).map((example) => (
                  <div className="rounded-2xl border border-border bg-background/50 p-4" key={example.input}>
                    <p className="font-medium">Input: {example.input}</p>
                    <p className="mt-2">Output: {example.output}</p>
                    <p className="mt-2 text-sm leading-7 text-muted">{example.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted">Constraints</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.problem.constraints.map((constraint) => (
                  <Badge key={constraint} variant="outline">
                    {constraint}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {data.problem.codeExecutionEnabled && data.problem.starterCode ? (
            <ProblemWorkspace
              codeDrafts={data.codeDrafts}
              latestCodeSubmissions={data.latestCodeSubmissions}
              problemId={data.problem.id}
              problemTitle={data.problem.title}
              problemExamples={data.problem.examples as Array<{ input: string; output: string; explanation: string }>}
              starterCode={data.problem.starterCode}
              starterLanguage={data.problem.starterLanguage}
              visibleTestCases={data.problem.testCases}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Code workspace</CardTitle>
                <CardDescription>
                  This problem currently supports progress tracking, notes, and revision workflows, but its executable
                  judge is not configured yet.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Hints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.problem.hints.map((hint) => (
                <div className="rounded-2xl border border-border bg-background/50 p-4 text-sm leading-7 text-muted" key={hint}>
                  {hint}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Editorial</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-8 text-muted">{data.problem.editorial}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Similar questions</CardTitle>
          <CardDescription>Use these to deepen the pattern, not to collect shallow repetitions.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.similarProblems.map((problem) => (
            <div className="rounded-2xl border border-border bg-background/50 p-4" key={problem.id}>
              <p className="font-medium">{problem.title}</p>
              <p className="mt-2 text-sm text-muted">{problem.topic.name}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ProblemRequestSection
          availableModes={[ChangeRequestOperationType.UPDATE, ChangeRequestOperationType.DELETE]}
          companies={meta.companies.map((company) => ({
            id: company.id,
            name: company.name,
          }))}
          currentProblem={requestableProblem}
          topics={meta.topics.map((topic) => ({
            id: topic.id,
            name: topic.name,
          }))}
        />
        <ChangeRequestHistoryCard
          description="Requests for this live problem. The catalog and student view stay untouched until admin approval."
          emptyLabel="No change requests have been submitted for this problem yet."
          requests={requests}
          title="Problem request status"
        />
      </div>
    </div>
  );
}
