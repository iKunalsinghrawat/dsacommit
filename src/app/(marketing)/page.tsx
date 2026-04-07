import Link from "next/link";
import { ArrowRight, Flame, ShieldCheck, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/data/platform-content";
import { formatPercent, getInitials } from "@/lib/utils";
import {
  getLandingPageData,
  getLeaderboard,
  getRoadmapData,
} from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [landing, roadmap, leaderboard] = await Promise.all([
    getLandingPageData(),
    getRoadmapData(),
    getLeaderboard(),
  ]);
  const roadmapEntries = Object.entries(roadmap) as Array<
    [keyof typeof roadmap, (typeof roadmap)[keyof typeof roadmap]]
  >;

  return (
    <main>
      <section className="page-shell grid gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
        <div className="space-y-8">
          <span className="section-kicker">Free discipline system for DSA aspirants</span>
          <div className="space-y-6">
            <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
              {BRAND.headline}{" "}
              <span className="display-serif text-gradient">Go from confused beginner to placement-ready.</span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted">{BRAND.subheadline}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="/auth/signup">
                Start free <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/roadmap">Explore the roadmap</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <CardTitle className="text-3xl">21</CardTitle>
              <CardDescription>Roadmap topics from logic to segment trees.</CardDescription>
            </Card>
            <Card className="p-5">
              <CardTitle className="text-3xl">30+</CardTitle>
              <CardDescription>Seeded company-tagged problems for structured practice.</CardDescription>
            </Card>
            <Card className="p-5">
              <CardTitle className="text-3xl">100%</CardTitle>
              <CardDescription>Free for students, with streaks and accountability built in.</CardDescription>
            </Card>
          </div>
        </div>

        <div className="glass-panel-strong grid gap-4 p-6 grid-surface">
          <Card className="p-5">
            <CardHeader className="mb-0 p-0">
              <Badge variant="success">Today&apos;s focus</Badge>
              <CardTitle className="mt-3 text-2xl">Two medium problems, one revision, no skipped day.</CardTitle>
            </CardHeader>
            <CardContent className="mt-4 p-0 text-sm leading-7 text-muted">
              The platform always tells the student what to do next: solve, revise, check in, and stay accountable.
            </CardContent>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <Flame className="size-5 text-warning" />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted">Streak driven</p>
                  <p className="text-2xl font-semibold">18 days</p>
                </div>
              </div>
              <p className="text-sm leading-7 text-muted">
                Consistency matters more than random bursts of solving.
              </p>
            </Card>
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <ShieldCheck className="size-5 text-success" />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted">Company ready</p>
                  <p className="text-2xl font-semibold">Amazon track</p>
                </div>
              </div>
              <p className="text-sm leading-7 text-muted">
                Solve by company, topic, and frequency instead of guessing your prep plan.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="page-shell py-8" id="companies">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <span className="section-kicker">Featured companies</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Target the companies that actually matter to you.</h2>
          </div>
          <Button asChild variant="ghost">
            <Link href="/companies">See all companies</Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {landing.featuredCompanies.map((company) => (
            <Card key={company.id}>
              <CardHeader>
                <CardTitle>{company.name}</CardTitle>
                <CardDescription>{company.overview}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {company.commonFocusTopics.slice(0, 4).map((topic) => (
                    <Badge key={topic} variant="outline">
                      {topic.replace(/-/g, " ")}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="page-shell py-16" id="mentors">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <span className="section-kicker">Top mentors</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Mentor guidance that rewards discipline, not noise.</h2>
          </div>
          <Button asChild variant="ghost">
            <Link href="/mentors">Browse mentors</Link>
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {landing.featuredMentors.map((mentor) => (
            <Card key={mentor.userId}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 font-semibold text-primary">
                      {getInitials(mentor.user.name)}
                    </div>
                    <div>
                      <CardTitle>{mentor.user.name}</CardTitle>
                      <CardDescription>
                        {mentor.roleTitle} at {mentor.company?.name}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="success">{mentor.followers.length} followers</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-7 text-muted">{mentor.bio}</p>
                <div className="flex flex-wrap gap-2">
                  {mentor.expertiseTags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="page-shell py-8" id="roadmap">
        <div className="mb-6">
          <span className="section-kicker">Structured roadmap</span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">Students always know what to do next.</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {roadmapEntries.map(([level, topics]) => (
            <Card key={level}>
              <CardHeader>
                <CardTitle>{level.toLowerCase().replace(/^\w/, (char) => char.toUpperCase())}</CardTitle>
              <CardDescription>
                {topics.length} focused roadmap checkpoints with notes, quizzes, and revision checklists.
              </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topics.map((item) => (
                  <div className="flex items-center justify-between rounded-2xl border border-border bg-background/50 px-4 py-3" key={item.id}>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      {item.topic ? (
                        <p className="text-xs uppercase tracking-[0.24em] text-muted">{item.topic.name}</p>
                      ) : null}
                    </div>
                    <span className="text-xs uppercase tracking-[0.24em] text-muted">
                      {item.topic?.problems.length ?? 0} problems
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="page-shell py-16">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="glass-panel-strong">
            <CardHeader>
              <Badge variant="secondary">Commitment challenge</Badge>
              <CardTitle className="mt-4 text-3xl">Show up for 7 days, then build the 30-day identity shift.</CardTitle>
              <CardDescription>
                Leaderboards prioritize consistency, streaks, and commitment scores instead of raw solved counts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {landing.featuredChallenges.map((challenge) => (
                <div className="rounded-2xl border border-border bg-background/60 p-4" key={challenge.id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-semibold">{challenge.title}</p>
                    <Badge variant="success">{challenge.durationDays} days</Badge>
                  </div>
                  <p className="text-sm leading-7 text-muted">{challenge.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Public commitment wall</CardTitle>
              <CardDescription>Students can make their daily effort visible and accountable.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {landing.wallPosts.map((post) => (
                <div className="rounded-2xl border border-border bg-background/50 p-4" key={post.id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{post.user.name}</p>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted">
                        {post.minutesCommitted} mins committed
                      </p>
                    </div>
                    <Badge variant="outline">{post.solvedCount} solved</Badge>
                  </div>
                  <p className="text-sm leading-7 text-muted">{post.caption}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="page-shell py-8" id="leaderboard">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <span className="section-kicker">Leaderboard preview</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Consistency beats chaos.</h2>
          </div>
          <Trophy className="size-8 text-warning" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {leaderboard.slice(0, 6).map((student, index) => (
            <Card key={student.id}>
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-4">
                  <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 font-semibold text-primary">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-semibold">{student.name}</p>
                    <p className="text-sm text-muted">{student.headline}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold">
                    {student.studentProfile ? Math.round(student.studentProfile.commitmentScore) : 0}
                  </p>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted">
                    {formatPercent(student.studentProfile?.weeklyConsistencyScore ?? 0)} weekly consistency
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
