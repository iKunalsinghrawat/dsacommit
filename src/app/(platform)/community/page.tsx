import { Role, UserPortal } from "@/generated/prisma/enums";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { requirePortalAccess, requireUser } from "@/lib/auth";
import { createCommunityPostAction } from "@/lib/actions/platform-actions";
import { getCatalogMeta, getCommunityFeed } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  await requirePortalAccess(UserPortal.COMMUNITY);
  const user = await requireUser();
  const [feed, meta] = await Promise.all([getCommunityFeed(), getCatalogMeta()]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Community"
        title="A place for doubts, company prep discussion, and visible accountability."
        description="Keep it useful. Ask focused questions, share real blockers, and leave the timepass energy outside."
      />

      <Card className="glass-panel-strong">
        <CardHeader>
          <CardTitle>Create a post</CardTitle>
          <CardDescription>Start a discussion, ask a doubt, or open a company-prep thread.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCommunityPostAction} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="type">
                  Post type
                </label>
                <Select id="type" name="type" defaultValue="DISCUSSION">
                  <option value="DISCUSSION">Discussion</option>
                  <option value="DOUBT">Doubt</option>
                  <option value="COMPANY_PREP">Company prep</option>
                  <option value="UPDATE">Update</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="topicId">
                  Topic
                </label>
                <Select id="topicId" name="topicId" defaultValue="">
                  <option value="">General</option>
                  {meta.topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="companyId">
                  Company
                </label>
                <Select id="companyId" name="companyId" defaultValue="">
                  <option value="">General</option>
                  {meta.companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="title">
                Title
              </label>
              <Input id="title" name="title" placeholder="How are you revising binary search boundaries?" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="content">
                Content
              </label>
              <Textarea
                id="content"
                name="content"
                placeholder="Explain the real blocker, what you already tried, and where you want feedback."
              />
            </div>
            <SubmitButton pendingLabel="Publishing..." className="w-full md:w-auto">
              Publish post
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {feed.map((post) => (
          <CommunityPostCard
            commentPlaceholder={
              user.role === Role.STUDENT ? "Add a helpful comment..." : "Leave a reply..."
            }
            companies={meta.companies.map((company) => ({ id: company.id, name: company.name }))}
            key={post.id}
            post={post}
            topics={meta.topics.map((topic) => ({ id: topic.id, name: topic.name }))}
            viewer={{ id: user.id, role: user.role }}
          />
        ))}
      </div>
    </div>
  );
}
