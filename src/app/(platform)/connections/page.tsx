import { Role, UserPortal } from "@/generated/prisma/enums";
import {
  BlockUserButton,
  RemoveConnectionButton,
  RespondConnectionRequestButtons,
  SendConnectionRequestButton,
  StartConversationButton,
} from "@/components/communication/communication-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePortalAccess, requireUser } from "@/lib/auth";
import { formatRelative } from "@/lib/utils";
import { getConnectionsPageData } from "@/server/communication-service";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  await requirePortalAccess(UserPortal.CONNECTIONS);
  const user = await requireUser();
  const data = await getConnectionsPageData(user.id);
  const isStudent = user.role === Role.STUDENT;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Connections"
        title="Build a prep network that is actually accountable."
        description="Connection requests unlock focused student-to-student chat. Blocking stays available so communication never turns into noise."
      />

      {!isStudent ? (
        <Card className="glass-panel-strong">
          <CardContent className="p-6 text-sm leading-7 text-muted">
            Student connection requests are student-only right now. Admin accounts can still review the social surface here, but send/accept actions stay disabled outside student profiles.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="glass-panel-strong">
          <CardHeader>
            <CardTitle>Active connections</CardTitle>
            <CardDescription>
              Direct student chat opens only after both sides accept.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.connections.length ? (
              data.connections.map((connection) => (
                <div
                  className="rounded-[24px] border border-border bg-background/50 p-4"
                  key={connection.id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{connection.user.name}</p>
                        <Badge variant="outline">{connection.user.role.toLowerCase()}</Badge>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted">
                        {connection.user.headline ?? "Active student connection"}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        Connected {formatRelative(connection.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StartConversationButton
                        targetUserId={connection.user.id}
                        variant="secondary"
                      >
                        Message
                      </StartConversationButton>
                      <RemoveConnectionButton targetUserId={connection.user.id} />
                      <BlockUserButton targetUserId={connection.user.id} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-5 text-sm leading-7 text-muted">
                No active student connections yet. Send a few focused requests instead of waiting for the perfect accountability partner to magically appear.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Incoming requests</CardTitle>
              <CardDescription>
                Approve only the students you genuinely want in your direct inbox.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.incomingRequests.length ? (
                data.incomingRequests.map((request) => (
                  <div
                    className="rounded-[24px] border border-border bg-background/50 p-4"
                    key={request.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{request.sender.name}</p>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {request.sender.headline ?? "Wants to connect for prep accountability"}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      Sent {formatRelative(request.createdAt)}
                    </p>
                    {isStudent ? (
                      <div className="mt-4">
                        <RespondConnectionRequestButtons requestId={request.id} />
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-4 text-sm leading-7 text-muted">
                  No incoming connection requests right now.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Outgoing requests</CardTitle>
              <CardDescription>
                Pending requests you can still cancel before they are reviewed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.outgoingRequests.length ? (
                data.outgoingRequests.map((request) => (
                  <div
                    className="rounded-[24px] border border-border bg-background/50 p-4"
                    key={request.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{request.receiver.name}</p>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {request.receiver.headline ?? "Waiting for their response"}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      Sent {formatRelative(request.createdAt)}
                    </p>
                    {isStudent ? (
                      <div className="mt-4">
                        <RespondConnectionRequestButtons canCancel requestId={request.id} />
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-4 text-sm leading-7 text-muted">
                  No outgoing requests waiting right now.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Discover students</CardTitle>
            <CardDescription>
              Suggested students you can connect with for mutual practice.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {data.discoverableStudents.length ? (
              data.discoverableStudents.map((student) => (
                <div
                  className="rounded-[24px] border border-border bg-background/50 p-4"
                  key={student.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{student.name}</p>
                    <Badge variant="outline">
                      {student.studentProfile?.currentLevel.toLowerCase() ?? "student"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {student.headline ?? "Focused on consistent DSA prep"}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    Commitment score {student.studentProfile?.commitmentScore ?? 0}
                  </p>
                  {isStudent ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <SendConnectionRequestButton size="sm" targetUserId={student.id} />
                      <BlockUserButton size="sm" targetUserId={student.id} variant="outline" />
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-4 text-sm leading-7 text-muted md:col-span-2">
                No suggested students right now. Your current network already covers the obvious matches.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blocked users</CardTitle>
            <CardDescription>
              Blocking stops messaging, connection requests, and call attempts both ways.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.blockedUsers.length ? (
              data.blockedUsers.map((block) => (
                <div
                  className="rounded-[24px] border border-border bg-background/50 p-4"
                  key={block.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">{block.blocked.name}</p>
                      <p className="mt-1 text-sm leading-6 text-muted">
                        {block.blocked.headline ?? "Currently blocked from direct interaction"}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        Blocked {formatRelative(block.createdAt)}
                      </p>
                    </div>
                    <BlockUserButton blocked targetUserId={block.blocked.id} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-4 text-sm leading-7 text-muted">
                Your blocked list is empty.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
