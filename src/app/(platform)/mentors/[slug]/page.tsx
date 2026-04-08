import Link from "next/link";
import { notFound } from "next/navigation";

import { Role, UserPortal } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { requirePortalAccess, requireUser } from "@/lib/auth";
import { createMentorQuestionAction, toggleMentorFollowAction } from "@/lib/actions/platform-actions";
import { getMentorBySlug } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function MentorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requirePortalAccess(UserPortal.MENTORS);
  const user = await requireUser();
  const data = await getMentorBySlug(slug, user.role === Role.STUDENT ? user.id : undefined);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Mentor profile"
        title={data.mentor.user.name}
        description={`${data.mentor.roleTitle} at ${data.mentor.company?.name} • ${data.mentor.experienceYears} years experience`}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="glass-panel-strong">
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              {data.mentor.expertiseTags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
            <CardTitle className="mt-4">{data.mentor.recommendedSetTitle}</CardTitle>
            <CardDescription>{data.mentor.recommendedSetSummary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-8 text-muted">{data.mentor.bio}</p>
            {user.role === Role.STUDENT ? (
              <form action={toggleMentorFollowAction}>
                <input name="mentorId" type="hidden" value={data.mentor.userId} />
                <button className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground" type="submit">
                  {data.isFollowing ? "Following mentor" : "Follow mentor"}
                </button>
              </form>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ask a doubt</CardTitle>
            <CardDescription>Mentor Q&A is lightweight in MVP but fully wired.</CardDescription>
          </CardHeader>
          <CardContent>
            {user.role === Role.STUDENT ? (
              <form action={createMentorQuestionAction} className="space-y-4">
                <input name="mentorId" type="hidden" value={data.mentor.userId} />
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="title">
                    Title
                  </label>
                  <Input id="title" name="title" placeholder="How do I transition from brute force?" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="question">
                    Question
                  </label>
                  <Textarea id="question" name="question" placeholder="I can find the brute-force solution, but I freeze when I need to optimize..." />
                </div>
                <SubmitButton className="w-full" pendingLabel="Sending your question...">
                  Ask mentor
                </SubmitButton>
              </form>
            ) : (
              <p className="text-sm leading-7 text-muted">Student accounts can ask mentor questions and follow guidance threads from this page.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guidance posts</CardTitle>
          <CardDescription>High-signal advice that keeps prep focused.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {data.mentor.mentorPosts.map((post) => (
            <div className="rounded-2xl border border-border bg-background/50 p-4" key={post.id}>
              <p className="font-medium">{post.title}</p>
              <p className="mt-2 text-sm leading-7 text-muted">{post.excerpt}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended problem set</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.recommendedProblems.map((problem) => (
            <Link className="block h-full" href={`/problems/${problem.id}`} key={problem.id}>
              <div className="h-full rounded-2xl border border-border bg-background/50 p-4 hover:border-primary/30">
                <p className="font-medium">{problem.title}</p>
                <p className="mt-2 text-sm text-muted">{problem.topic.name}</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
