import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  getPublicCompanyHref,
  getSignInHref,
} from "@/lib/public-destinations";
import { getCompaniesList } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function PublicCompaniesPage() {
  const companies = await getCompaniesList();

  return (
    <main className="page-shell py-10 sm:py-12">
      <div className="space-y-8">
        <PageHeader
          eyebrow="Company preview"
          title="Explore company-wise preparation before you even sign in."
          description="See the companies, topics, and tagged question patterns students prepare against on DSA Commit."
          actions={
            <Button asChild>
              <Link href={getSignInHref("/companies")}>Sign in for full company prep</Link>
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((company) => (
            <Link
              className="block h-full rounded-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={getPublicCompanyHref(company.slug)}
              key={company.id}
            >
              <Card className="h-full cursor-pointer transition-transform duration-200 hover:-translate-y-1 hover:border-primary/30">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <CardTitle>{company.name}</CardTitle>
                      <CardDescription>{company.overview}</CardDescription>
                    </div>
                    {company.featured ? <Badge variant="success">Featured</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {company.commonFocusTopics.slice(0, 4).map((topic) => (
                      <Badge key={topic} variant="outline">
                        {topic.replace(/-/g, " ")}
                      </Badge>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-background/50 p-4">
                      <p className="text-sm text-muted">Tagged problems</p>
                      <p className="text-lg font-semibold">{company.problemTags.length}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background/50 p-4">
                      <p className="text-sm text-muted">Mentors</p>
                      <p className="text-lg font-semibold">{company.mentors.length}</p>
                    </div>
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
