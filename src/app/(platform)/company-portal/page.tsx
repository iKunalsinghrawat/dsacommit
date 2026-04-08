import { Role, UserPortal } from "@/generated/prisma/enums";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { requireRoleAndPortal } from "@/lib/auth";
import {
  createCompanyContentAction,
  createCompanyRoleAction,
} from "@/lib/actions/platform-actions";
import { getCompanyPortalData } from "@/server/app-data";

export const dynamic = "force-dynamic";

export default async function CompanyPortalPage() {
  const user = await requireRoleAndPortal([Role.COMPANY, Role.ADMIN], UserPortal.COMPANY_PORTAL);
  const data = await getCompanyPortalData(user.id);

  if (!data) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Company portal"
          title="Company portal data is temporarily unavailable."
          description="We could not load the company profile or talent list right now."
        />
        <Card className="glass-panel-strong">
          <CardContent className="p-6 text-sm leading-7 text-muted">
            Refresh after checking database access and runtime configuration. The company portal will load again as soon as that connection is healthy.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Company portal"
        title={`${data.company.name} portal`}
        description="Publish roles, guidance, and events while browsing the students already preparing for your company."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="glass-panel-strong">
          <CardHeader>
            <CardTitle>Company profile</CardTitle>
            <CardDescription>{data.company.overview}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {data.company.hiringFocusAreas.map((focus) => (
                <Badge key={focus} variant="secondary">
                  {focus}
                </Badge>
              ))}
            </div>
            <div className="grid gap-3">
              {data.company.contents.map((content) => (
                <div className="rounded-2xl border border-border bg-background/50 p-4" key={content.id}>
                  <p className="font-medium">{content.title}</p>
                  <p className="mt-2 text-sm leading-7 text-muted">{content.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top committed students</CardTitle>
            <CardDescription>Students who target your company and maintain visible discipline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topStudents.map((student) => (
              <div className="rounded-2xl border border-border bg-background/50 p-4" key={student.id}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted">{student.headline}</p>
                  </div>
                  <Badge>{Math.round(student.studentProfile?.commitmentScore ?? 0)} score</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Add a role</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createCompanyRoleAction} className="space-y-4">
              <Input name="title" placeholder="SDE Intern" />
              <Input name="roleType" placeholder="Campus" />
              <Input name="focusAreas" placeholder="Arrays, Hashing, Trees" />
              <Input name="location" placeholder="Bengaluru - Hybrid" />
              <SubmitButton className="w-full" pendingLabel="Publishing role...">
                Publish role
              </SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publish guidance or event</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createCompanyContentAction} className="space-y-4">
              <Input name="title" placeholder="What we look for in the OA" />
              <Select name="category" defaultValue="GUIDANCE">
                <option value="GUIDANCE">Guidance</option>
                <option value="EVENT">Event</option>
              </Select>
              <Textarea name="content" placeholder="Share what students should prioritize before applying." />
              <SubmitButton className="w-full" pendingLabel="Publishing content...">
                Publish content
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
