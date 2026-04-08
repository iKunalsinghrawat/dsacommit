import { redirect } from "next/navigation";

import { Role, UserPortal } from "@/generated/prisma/enums";
import { GroupEditorForm } from "@/components/communication/group-editor-form";
import { PageHeader } from "@/components/ui/page-header";
import { requirePortalAccess, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CreateGroupPage() {
  await requirePortalAccess(UserPortal.GROUPS);
  const user = await requireUser();

  if (user.role !== Role.STUDENT && user.role !== Role.ADMIN) {
    redirect("/groups");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="New group"
        title="Start a study room that people actually return to."
        description="Keep the promise small and clear: what topic, what schedule, what accountability, and who gets access."
      />

      <GroupEditorForm mode="create" />
    </div>
  );
}
