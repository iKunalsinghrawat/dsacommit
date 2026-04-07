import { ChangeRequestStatus } from "@/generated/prisma/enums";

import { Badge } from "@/components/ui/badge";

export function ChangeRequestStatusBadge({
  status,
}: {
  status: ChangeRequestStatus;
}) {
  if (status === ChangeRequestStatus.APPROVED) {
    return <Badge variant="success">Approved</Badge>;
  }

  if (status === ChangeRequestStatus.REJECTED) {
    return <Badge variant="outline">Rejected</Badge>;
  }

  return <Badge variant="secondary">Pending</Badge>;
}
