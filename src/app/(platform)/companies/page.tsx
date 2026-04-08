import { UserPortal } from "@/generated/prisma/enums";
import Link from "next/link";

import { requirePortalAccess } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getCompaniesList } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  await requirePortalAccess(UserPortal.COMPANIES);
  const companies = await getCompaniesList();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Companies"
        title="Company-wise preparation paths that reduce randomness."
        description="See what each company tends to focus on, which topics appear repeatedly, and how the interview path usually feels."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {companies.map((company) => (
          <Link className="block h-full" href={`/companies/${company.slug}`} key={company.id}>
            <Card className="h-full hover:border-primary/30">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{company.name}</CardTitle>
                  {company.featured ? <Badge variant="success">Featured</Badge> : null}
                </div>
                <CardDescription>{company.overview}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {company.commonFocusTopics.slice(0, 4).map((topic) => (
                    <Badge key={topic} variant="outline">
                      {topic.replace(/-/g, " ")}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted">{company.problemTags.length} tagged problems</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
