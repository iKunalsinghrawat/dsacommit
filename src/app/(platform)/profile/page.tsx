import Link from "next/link";

import { ProfileVisibility, Role, UserPortal } from "@/generated/prisma/enums";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePortalAccess, requireUser } from "@/lib/auth";
import { getProfileData } from "@/server/app-data";
import { getCatalogMeta } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  await requirePortalAccess(UserPortal.PROFILE);
  const user = await requireUser();
  const [profile, meta] = await Promise.all([getProfileData(user.id), getCatalogMeta()]);

  if (!profile) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Profile"
          title="Profile data is temporarily unavailable."
          description="The app could not load your saved profile details right now, but your session is still active."
        />
        <Card className="glass-panel-strong">
          <CardContent className="p-6 text-sm leading-7 text-muted">
            Refresh after checking runtime configuration or database connectivity. Once the data source is available again, your profile view will return automatically.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Profile"
        title={profile.name}
        description={profile.headline ?? "Update your DSA Commit profile, study metadata, and account security from one place."}
        actions={
          <div className="flex flex-wrap gap-3">
            <Badge variant={profile.profileVisibility === ProfileVisibility.PUBLIC ? "success" : "outline"}>
              {profile.profileVisibility === ProfileVisibility.PUBLIC ? "Public profile" : "Private profile"}
            </Badge>
            <Button asChild variant="secondary">
              <Link href={`/profile/${profile.slug}`}>Preview public view</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="glass-panel-strong">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{profile.role}</Badge>
              {profile.userBadges.slice(0, 2).map((userBadge) => (
                <Badge key={userBadge.id} variant="outline">
                  {userBadge.badge.name}
                </Badge>
              ))}
            </div>
            <CardTitle>{profile.name}</CardTitle>
            <CardDescription>{profile.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-7 text-muted">{profile.bio ?? "Add a short bio so mentors, companies, and admins understand your current focus."}</p>

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
              </div>
            ) : null}

            {profile.role === Role.STUDENT && profile.studentProfile ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Bookmarked questions</p>
                {profile.bookmarks.map((bookmark) => (
                  <Link className="block h-full" href={`/problems/${bookmark.problemId}`} key={bookmark.id}>
                    <div className="h-full rounded-2xl border border-border bg-background/50 p-4">
                      <p className="font-medium">{bookmark.problem.title}</p>
                      <p className="text-sm text-muted">{bookmark.problem.topic.name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <ProfileSettingsForm companies={meta.companies} profile={profile} topics={meta.topics} />
      </div>

      {profile.role === Role.STUDENT && profile.studentProfile ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Target companies</CardTitle>
              <CardDescription>These companies drive your dashboard recommendations and leaderboard prep context.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {profile.studentProfile.targetCompanies.map((company) => (
                <Badge key={company.id} variant="secondary">
                  {company.company.name}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Badges earned</CardTitle>
              <CardDescription>Visible proof of discipline, mastery, and consistency.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {profile.userBadges.map((userBadge) => (
                <div className="rounded-2xl border border-border bg-background/50 p-4" key={userBadge.id}>
                  <p className="font-medium">{userBadge.badge.name}</p>
                  <p className="mt-2 text-sm leading-7 text-muted">{userBadge.badge.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
