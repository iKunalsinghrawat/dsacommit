import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  getPublicMentorHref,
  getSignInHref,
} from "@/lib/public-destinations";
import { getInitials } from "@/lib/utils";
import { getMentorsList } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function PublicMentorsPage() {
  const mentors = await getMentorsList();

  return (
    <main className="page-shell py-10 sm:py-12">
      <div className="space-y-8">
        <PageHeader
          eyebrow="Mentor preview"
          title="Meet the mentors behind the discipline system."
          description="Browse public mentor profiles, expertise tags, and guidance previews before you create an account."
          actions={
            <Button asChild>
              <Link href={getSignInHref("/mentors")}>Sign in to follow mentors</Link>
            </Button>
          }
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {mentors.map((mentor) => (
            <Link
              className="block h-full rounded-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={getPublicMentorHref(mentor.user.slug)}
              key={mentor.userId}
            >
              <Card className="h-full cursor-pointer transition-transform duration-200 hover:-translate-y-1 hover:border-primary/30">
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
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
