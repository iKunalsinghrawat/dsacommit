import Link from "next/link";

import { Role, UserPortal, UserStatus } from "@/generated/prisma/enums";
import { AdminUserManagementPanel } from "@/components/admin/admin-user-management-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { requireRoleAndPortal } from "@/lib/auth";
import {
  resolveReportedPostAction,
  toggleFeatureEntityAction,
} from "@/lib/actions/platform-actions";
import { createSearchParams } from "@/lib/utils";
import { getAdminPanelData } from "@/server/app-data";
import { getAdminUserManagementData } from "@/server/user-management";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireRoleAndPortal([Role.ADMIN], UserPortal.ADMIN_PORTAL);
  const rawSearchParams = await searchParams;
  const search = typeof rawSearchParams.search === "string" ? rawSearchParams.search : "";
  const role = typeof rawSearchParams.role === "string" ? rawSearchParams.role : "ALL";
  const status = typeof rawSearchParams.status === "string" ? rawSearchParams.status : "ALL";
  const userId = typeof rawSearchParams.userId === "string" ? rawSearchParams.userId : undefined;

  const [data, management] = await Promise.all([
    getAdminPanelData(),
    getAdminUserManagementData({
      search,
      role: role as Role | "ALL",
      status: status as UserStatus | "ALL",
      userId,
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin panel"
        title="Manage users, access rights, moderation, and featured platform content."
        description="This control room now covers full user lifecycle operations, module access, moderation, and featured visibility from one place."
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/approvals">Open approval queue</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card><CardTitle>{management.totals.totalUsers}</CardTitle><CardDescription>Total users</CardDescription></Card>
        <Card><CardTitle>{management.totals.activeUsers}</CardTitle><CardDescription>Active</CardDescription></Card>
        <Card><CardTitle>{management.totals.blockedUsers}</CardTitle><CardDescription>Blocked</CardDescription></Card>
        <Card><CardTitle>{management.totals.deactivatedUsers}</CardTitle><CardDescription>Deactivated</CardDescription></Card>
        <Card><CardTitle>{management.totals.removedUsers}</CardTitle><CardDescription>Removed</CardDescription></Card>
        <Card><CardTitle>{data.pendingChangeRequests}</CardTitle><CardDescription>Pending approvals</CardDescription></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User search and filters</CardTitle>
              <CardDescription>Filter by identity, role, or account status before opening the detail panel.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4">
                <Input defaultValue={management.filters.search} name="search" placeholder="Search name, email, or handle" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select defaultValue={management.filters.role} name="role">
                    <option value="ALL">All roles</option>
                    {Object.values(Role).map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {roleOption}
                      </option>
                    ))}
                  </Select>
                  <Select defaultValue={management.filters.status} name="status">
                    <option value="ALL">All statuses</option>
                    {Object.values(UserStatus).map((statusOption) => (
                      <option key={statusOption} value={statusOption}>
                        {statusOption}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button className="justify-self-start" type="submit" variant="secondary">
                  Apply filters
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-panel-strong">
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>{management.users.length} matching accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {management.users.length === 0 ? (
                <div className="rounded-2xl border border-border bg-background/50 px-4 py-6 text-sm text-muted">
                  No users matched the current filters.
                </div>
              ) : null}

              {management.users.map((user) => (
                <Link
                  className={`block rounded-[24px] border p-4 transition ${
                    management.filters.userId === user.id
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-background/50 hover:border-primary/20"
                  }`}
                  href={createSearchParams({
                    search: management.filters.search,
                    role: management.filters.role,
                    status: management.filters.status,
                    userId: user.id,
                  })}
                  key={user.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted">{user.email}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{user.role}</Badge>
                        <Badge variant={user.status === UserStatus.ACTIVE ? "success" : "outline"}>
                          {user.status}
                        </Badge>
                        {user.passwordResetRequired ? <Badge variant="outline">Reset required</Badge> : null}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted">
                      <p>{user.slug}</p>
                      <p>{user.accessGrants.length} access grants</p>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          {management.selectedUser ? (
            <AdminUserManagementPanel
              companies={management.companies}
              key={management.selectedUser.id}
              managedUser={management.selectedUser}
              topics={management.topics}
              viewerId={admin.id}
            />
          ) : (
            <Card className="glass-panel-strong">
              <CardHeader>
                <CardTitle>No user selected</CardTitle>
                <CardDescription>Pick a user from the list to inspect and manage the account.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Featured content controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.mentors.slice(0, 4).map((mentor) => (
              <form action={toggleFeatureEntityAction} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/50 p-4" key={mentor.userId}>
                <input name="entityType" type="hidden" value="mentor" />
                <input name="entityId" type="hidden" value={mentor.userId} />
                <div>
                  <p className="font-medium">{mentor.user.name}</p>
                  <p className="text-sm text-muted">Mentor visibility and landing placement</p>
                </div>
                <button className="rounded-full border border-border px-4 py-2 text-sm font-medium" type="submit">
                  {mentor.featured ? "Unfeature" : "Feature"}
                </button>
              </form>
            ))}
            {data.companies.map((company) => (
              <form action={toggleFeatureEntityAction} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/50 p-4" key={company.id}>
                <input name="entityType" type="hidden" value="company" />
                <input name="entityId" type="hidden" value={company.id} />
                <div>
                  <p className="font-medium">{company.name}</p>
                  <p className="text-sm text-muted">Company visibility on landing and listings</p>
                </div>
                <button className="rounded-full border border-border px-4 py-2 text-sm font-medium" type="submit">
                  {company.featured ? "Unfeature" : "Feature"}
                </button>
              </form>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reported posts</CardTitle>
            <CardDescription>Moderation queue for the community feed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.reportedPosts.map((post) => (
              <form action={resolveReportedPostAction} className="rounded-2xl border border-border bg-background/50 p-4" key={post.id}>
                <input name="postId" type="hidden" value={post.id} />
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="font-medium">{post.title}</p>
                  <Badge variant="secondary">Reported</Badge>
                </div>
                <p className="text-sm leading-7 text-muted">{post.content}</p>
                <button className="mt-4 rounded-full border border-border px-4 py-2 text-sm font-medium" type="submit">
                  Resolve report
                </button>
              </form>
            ))}
            {data.reportedPosts.length === 0 ? (
              <div className="rounded-2xl border border-border bg-background/50 px-4 py-6 text-sm text-muted">
                Nothing is waiting in the moderation queue right now.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
