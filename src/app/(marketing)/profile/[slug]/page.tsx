import Link from "next/link";
import { notFound } from "next/navigation";

import { ProfileVisibility, Role } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth";
import { formatPercent } from "@/lib/utils";
import { getProfileViewData } from "@/server/app-data";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const viewer = await getCurrentUser();
  const { slug } = await params;
  const profileView = await getProfileViewData({
    slug,
    viewerId: viewer?.id,
    viewerRole: viewer?.role,
  });

  if (!profileView) {
    notFound();
  }

  const { profile, canViewFullProfile, isOwner, isAdmin } = profileView;

  if (!canViewFullProfile) {
    return (
      <main className="page-shell py-10 sm:py-12">
        <div className="space-y-8">
          <PageHeader
            eyebrow="Profile"
            title={profile.name}
            description="This user chose to keep their profile private."
            actions={
              <Badge variant="outline">
                {profile.profileVisibility === ProfileVisibility.PRIVATE ? "Private profile" : "Public profile"}
              </Badge>
            }
          />

          <Card className="glass-panel-strong">
            <CardHeader>
              <CardTitle>This profile is private</CardTitle>
              <CardDescription>
                Public visitors can only view profiles that are explicitly shared. The owner can still see full details
                from profile settings, and admins retain access for moderation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/">Back to home</Link>
              </Button>
              {!viewer ? (
                <Button asChild>
                  <Link href="/auth/signin">Sign in</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell py-10 sm:py-12">
      <div className="space-y-8">
        <PageHeader
          eyebrow="Profile"
          title={profile.name}
          description={profile.headline ?? "Public profile summary on DSA Commit."}
          actions={
            <div className="flex flex-wrap gap-3">
              <Badge variant={profile.profileVisibility === ProfileVisibility.PUBLIC ? "success" : "outline"}>
                {profile.profileVisibility === ProfileVisibility.PUBLIC ? "Public profile" : "Private profile"}
              </Badge>
              {isOwner ? (
                <Button asChild variant="secondary">
                  <Link href="/profile">Edit settings</Link>
                </Button>
              ) : null}
              {isAdmin ? <Badge variant="outline">Admin access</Badge> : null}
            </div>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="glass-panel-strong">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{profile.role}</Badge>
                {profile.userBadges.slice(0, 3).map((userBadge) => (
                  <Badge key={userBadge.id} variant="outline">
                    {userBadge.badge.name}
                  </Badge>
                ))}
              </div>
              <CardTitle>{profile.name}</CardTitle>
              <CardDescription>{profile.location ?? "Remote learner"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-7 text-muted">{profile.bio ?? "No public bio added yet."}</p>

              {profile.role === Role.STUDENT && profile.studentProfile ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background/50 p-4">
                    <p className="text-sm text-muted">Level</p>
                    <p className="text-lg font-semibold">{profile.studentProfile.currentLevel}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/50 p-4">
                    <p className="text-sm text-muted">Target</p>
                    <p className="text-lg font-semibold">{profile.studentProfile.target}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/50 p-4">
                    <p className="text-sm text-muted">Weekly consistency</p>
                    <p className="text-lg font-semibold">
                      {formatPercent(profile.studentProfile.weeklyConsistencyScore)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/50 p-4">
                    <p className="text-sm text-muted">Commitment score</p>
                    <p className="text-lg font-semibold">{Math.round(profile.studentProfile.commitmentScore)}</p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Achievements and activity</CardTitle>
                <CardDescription>
                  Public summary of badges, recent commitment posts, and visible study momentum.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.userBadges.length ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.userBadges.map((userBadge) => (
                      <Badge key={userBadge.id} variant="secondary">
                        {userBadge.badge.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No public badges yet.</p>
                )}

                {profile.commitmentPosts.length ? (
                  <div className="space-y-3">
                    {profile.commitmentPosts.map((post) => (
                      <div className="rounded-2xl border border-border bg-background/50 p-4" key={post.id}>
                        <p className="text-sm leading-7 text-muted">{post.caption}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted">
                          {post.minutesCommitted} minutes committed
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No public activity shared yet.</p>
                )}
              </CardContent>
            </Card>

            {profile.role === Role.STUDENT && profile.studentProfile ? (
              <Card>
                <CardHeader>
                  <CardTitle>Public study focus</CardTitle>
                  <CardDescription>Visible target companies and weak areas shared by this learner.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium">Target companies</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.studentProfile.targetCompanies.length ? (
                        profile.studentProfile.targetCompanies.map((company) => (
                          <Badge key={company.id} variant="outline">
                            {company.company.name}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted">No companies shared yet.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">Weak topics</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.studentProfile.weakTopics.length ? (
                        profile.studentProfile.weakTopics.map((topic) => (
                          <Badge key={topic.id} variant="secondary">
                            {topic.topic.name}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted">No weak topics shared yet.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
