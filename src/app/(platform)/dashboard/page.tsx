import Link from "next/link";

import { Role, UserPortal } from "@/generated/prisma/enums";
import { ConsistencyChart } from "@/components/charts/consistency-chart";
import { HeatmapGrid } from "@/components/dashboard/heatmap-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { hasPortalAccess } from "@/lib/access-control";
import { requirePortalAccess, requireUser } from "@/lib/auth";
import { submitDailyCheckinAction } from "@/lib/actions/platform-actions";
import { formatPercent, titleCase } from "@/lib/utils";
import { getDashboardData } from "@/server/app-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requirePortalAccess(UserPortal.DASHBOARD);
  const user = await requireUser();
  const data = await getDashboardData(user.id, user.role);
  const socialQuickActions = [
    hasPortalAccess(user, UserPortal.MESSAGES)
      ? {
          href: "/messages",
          title: "Messages",
          description:
            user.role === Role.MENTOR
              ? "Reply to students, continue mentor conversations, and manage incoming call requests."
              : "Open direct chats, group threads, and active audio/video call conversations.",
        }
      : null,
    hasPortalAccess(user, UserPortal.GROUPS)
      ? {
          href: "/groups",
          title: "Groups",
          description:
            "Create study groups, review join requests, and keep group accountability visible.",
        }
      : null,
    hasPortalAccess(user, UserPortal.CONNECTIONS)
      ? {
          href: "/connections",
          title: "Connections",
          description:
            "Manage connection requests, blocked users, and student-to-student access before chatting.",
        }
      : null,
  ].filter(Boolean) as Array<{
    href: string;
    title: string;
    description: string;
  }>;

  if (!data) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Dashboard"
          title="Dashboard data is temporarily unavailable."
          description="We could not load your live progress right now. Your account shell is still available while the runtime connection is checked."
        />
        <Card className="glass-panel-strong">
          <CardContent className="p-6 text-sm leading-7 text-muted">
            Try refreshing in a moment. If this keeps happening, verify your runtime environment variables and database migration state.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role === Role.MENTOR && "mentorProfile" in data) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Mentor dashboard"
          title="Mentor signal, follower activity, and open student questions."
          description="Use this space to track the students who rely on your guidance and keep your advice sets sharp."
        />
      <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardTitle>{data.mentorProfile?.followers.length ?? 0}</CardTitle>
            <CardDescription>Total student followers</CardDescription>
          </Card>
          <Card>
            <CardTitle>{data.mentorProfile?.mentorPosts.length ?? 0}</CardTitle>
            <CardDescription>Published guidance posts</CardDescription>
          </Card>
          <Card>
            <CardTitle>{data.mentorProfile?.questions.length ?? 0}</CardTitle>
            <CardDescription>Open student questions</CardDescription>
          </Card>
        </div>
        {socialQuickActions.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {socialQuickActions.map((item) => (
              <Link className="block h-full" href={item.href} key={item.href}>
                <Card className="h-full hover:border-primary/30">
                  <CardContent className="p-6">
                    <p className="text-lg font-semibold">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-muted">{item.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Recent mentor questions</CardTitle>
            <CardDescription>Students asking for help right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.mentorProfile?.questions.map((question) => (
              <div className="rounded-2xl border border-border bg-background/50 p-4" key={question.id}>
                <p className="font-medium">{question.title}</p>
                <p className="mt-2 text-sm leading-7 text-muted">{question.question}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted">
                  {question.student.user.name}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role === Role.COMPANY && "ownedCompany" in data && "topStudents" in data) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Company dashboard"
          title="See committed students and keep your prep signal high."
          description="Your portal is built for hiring-focused updates, role publishing, and discovering disciplined students who already target your company."
          actions={
            <Button asChild>
              <Link href="/company-portal">Open company portal</Link>
            </Button>
          }
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardTitle>{data.ownedCompany?.roles.length ?? 0}</CardTitle>
            <CardDescription>Active company roles</CardDescription>
          </Card>
          <Card>
            <CardTitle>{data.ownedCompany?.contents.length ?? 0}</CardTitle>
            <CardDescription>Published company posts</CardDescription>
          </Card>
          <Card>
            <CardTitle>{data.topStudents?.length ?? 0}</CardTitle>
            <CardDescription>Students targeting your company</CardDescription>
          </Card>
        </div>
      </div>
    );
  }

  if (user.role === Role.ADMIN && "users" in data) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Admin dashboard"
          title="Moderation, featured content, and platform health."
          description="Use the admin panel to manage users, content, reports, badges, and growth loops."
          actions={
            <Button asChild>
              <Link href="/admin">Open admin panel</Link>
            </Button>
          }
        />
      <div className="grid gap-4 lg:grid-cols-4">
          <Card><CardTitle>{data.users}</CardTitle><CardDescription>Total users</CardDescription></Card>
          <Card><CardTitle>{data.companies}</CardTitle><CardDescription>Company profiles</CardDescription></Card>
          <Card><CardTitle>{data.mentors}</CardTitle><CardDescription>Mentor profiles</CardDescription></Card>
          <Card><CardTitle>{data.problems}</CardTitle><CardDescription>Problem records</CardDescription></Card>
        </div>
        {socialQuickActions.length ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {socialQuickActions.map((item) => (
              <Link className="block h-full" href={item.href} key={item.href}>
                <Card className="h-full hover:border-primary/30">
                  <CardContent className="p-6">
                    <p className="text-lg font-semibold">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-muted">{item.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (!("heatmap" in data) || !data.heatmap || !("user" in data) || !data.user) {
    return null;
  }

  const studentData = data;
  const chartData = studentData.heatmap.slice(-7).map((entry) => ({
    label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(entry.date),
    minutes: entry.minutesCommitted,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Student dashboard"
        title="Stay disciplined today, and placement-ready sooner."
        description="Your dashboard is built to remove indecision: one clear task, one visible streak, and one roadmap that keeps moving."
        actions={
          <Button asChild variant="secondary">
            <Link href="/problems">Continue solving</Link>
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="glass-panel-strong">
          <CardHeader>
            <Badge variant="success">Today&apos;s task</Badge>
            <CardTitle className="mt-4 text-3xl">
              {studentData.todayTask ? studentData.todayTask.title : "Review your weakest topic and log a check-in."}
            </CardTitle>
            <CardDescription>
              {studentData.todayTask
                ? `${studentData.todayTask.topic.name} • ${titleCase(studentData.todayTask.difficulty)} • ${studentData.todayTask.estimatedMinutes} mins`
                : "If you have already solved today, use the revision queue next."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-7 text-muted">
              {studentData.todayTask
                ? "This recommendation is chosen from your weak areas and unsolved company-tagged practice."
                : "Once you solve or revise something, the dashboard will refresh your next best task automatically."}
            </p>
            {studentData.todayTask ? (
              <Button asChild>
                <Link href={`/problems/${studentData.todayTask.id}`}>Open problem</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily check-in</CardTitle>
            <CardDescription>Log today&apos;s effort and keep the public wall honest.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={submitDailyCheckinAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="targetMinutes">
                    Target minutes
                  </label>
                  <Input
                    defaultValue={studentData.user.studentProfile?.dailyAvailableHours ? studentData.user.studentProfile.dailyAvailableHours * 60 : 120}
                    id="targetMinutes"
                    name="targetMinutes"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="minutesCommitted">
                    Minutes committed
                  </label>
                  <Input id="minutesCommitted" name="minutesCommitted" type="number" defaultValue={90} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="note">
                  What did you finish today?
                </label>
                <Textarea
                  id="note"
                  name="note"
                  placeholder="Solved one medium, revised binary search boundaries, and closed the day without skipping."
                />
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm">
                <input className="accent-[var(--primary)]" id="shareToWall" name="shareToWall" type="checkbox" />
                Share today&apos;s note on the public commitment wall
              </label>
              <SubmitButton className="w-full" pendingLabel="Logging today...">
                Complete daily check-in
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardTitle>{studentData.user.streak?.currentStreak ?? 0} days</CardTitle><CardDescription>Current streak</CardDescription></Card>
        <Card><CardTitle>{formatPercent(studentData.user.studentProfile?.weeklyConsistencyScore ?? 0)}</CardTitle><CardDescription>Weekly consistency</CardDescription></Card>
        <Card><CardTitle>{formatPercent(studentData.user.studentProfile?.monthlyCommitmentScore ?? 0)}</CardTitle><CardDescription>Monthly commitment</CardDescription></Card>
        <Card><CardTitle>{Math.round(studentData.user.studentProfile?.commitmentScore ?? 0)}</CardTitle><CardDescription>Overall commitment score</CardDescription></Card>
      </div>

      {socialQuickActions.length ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {socialQuickActions.map((item) => (
            <Link className="block h-full" href={item.href} key={item.href}>
              <Card className="h-full hover:border-primary/30">
                <CardContent className="p-6">
                  <p className="text-lg font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-muted">{item.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Consistency heatmap</CardTitle>
            <CardDescription>Your recent check-in rhythm, weighted by actual minutes committed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <HeatmapGrid entries={studentData.heatmap} />
            <ConsistencyChart data={chartData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Roadmap progress</CardTitle>
            <CardDescription>Close weak areas before random hard-question chasing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {studentData.progress.slice(0, 6).map((progress) => (
              <div className="space-y-2" key={progress.id}>
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium">{progress.topic.name}</p>
                  <span className="text-sm text-muted">{formatPercent(progress.completionPercentage)}</span>
                </div>
                <Progress value={progress.completionPercentage} />
              </div>
            ))}
            {studentData.nextTopic ? (
              <div className="rounded-2xl border border-border bg-background/50 p-4 text-sm leading-7 text-muted">
                Continue learning: <span className="font-medium text-foreground">{studentData.nextTopic.name}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Weak areas</CardTitle>
            <CardDescription>Topics you asked the onboarding flow to prioritize.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {studentData.user.studentProfile?.weakTopics.map((weakTopic) => (
              <div className="rounded-2xl border border-border bg-background/50 px-4 py-3" key={weakTopic.id}>
                {weakTopic.topic.name}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bookmarks</CardTitle>
            <CardDescription>Problems you marked to revisit intentionally.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {studentData.bookmarks.map((bookmark) => (
              <Link className="block rounded-2xl border border-border bg-background/50 px-4 py-3" href={`/problems/${bookmark.problemId}`} key={bookmark.id}>
                <p className="font-medium">{bookmark.problem.title}</p>
                <p className="text-sm text-muted">{bookmark.problem.topic.name}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revision reminders</CardTitle>
            <CardDescription>Scheduled spaced repetition for sticky problems.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {studentData.revisionQueue.map((revision) => (
              <Link className="block rounded-2xl border border-border bg-background/50 px-4 py-3" href={`/problems/${revision.problemId}`} key={revision.id}>
                <p className="font-medium">{revision.problem.title}</p>
                <p className="text-sm text-muted">{revision.reason}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Target company tracker</CardTitle>
            <CardDescription>Your progress across the companies you care about most.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {studentData.targetCompanyTracker.map((item) => (
              <div key={item.company.id}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium">{item.company.name}</p>
                  <span className="text-sm text-muted">{item.solved}/{item.total || 1}</span>
                </div>
                <Progress value={item.total ? (item.solved / item.total) * 100 : 0} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Challenges</CardTitle>
            <CardDescription>Discipline sprints that keep momentum visible.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {studentData.participations.map((participation) => (
              <div className="rounded-2xl border border-border bg-background/50 p-4" key={participation.id}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium">{participation.challenge.title}</p>
                  <Badge variant="outline">{participation.progressDays} days</Badge>
                </div>
                <Progress value={participation.completionPercentage} />
              </div>
            ))}
            {studentData.participations.length === 0 ? <p className="text-sm text-muted">Join a challenge to start tracking it here.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended next questions</CardTitle>
            <CardDescription>Picked from your weak topics and unsolved company-tagged problems.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {studentData.recommendedProblems.map((problem) => (
              <Link className="block rounded-2xl border border-border bg-background/50 px-4 py-3" href={`/problems/${problem.id}`} key={problem.id}>
                <p className="font-medium">{problem.title}</p>
                <p className="text-sm text-muted">
                  {problem.topic.name} • {titleCase(problem.difficulty)}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
