import { UserPortal } from "@/generated/prisma/enums";
import Link from "next/link";

import { requirePortalAccess } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getInitials } from "@/lib/utils";
import { getMentorsList } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function MentorsPage() {
  await requirePortalAccess(UserPortal.MENTORS);
  const mentors = await getMentorsList();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Mentors"
        title="Guidance from people who know what disciplined prep actually looks like."
        description="Follow mentors, read their guidance posts, and use recommended sets to stop solving without a strategy."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {mentors.map((mentor) => (
          <Link className="block h-full" href={`/mentors/${mentor.user.slug}`} key={mentor.userId}>
            <Card className="h-full hover:border-primary/30">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 font-semibold text-primary">
                    {getInitials(mentor.user.name)}
                  </div>
                  <div className="space-y-2">
                    <CardTitle>{mentor.user.name}</CardTitle>
                    <CardDescription>
                      {mentor.roleTitle} at {mentor.company?.name}
                    </CardDescription>
                    <div className="flex flex-wrap gap-2">
                      {mentor.expertiseTags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-7 text-muted">{mentor.bio}</p>
                <p className="text-sm text-muted">{mentor.followers.length} followers</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
