"use client";

import { Check, Loader2, LogOut, MessageSquareText, Phone, ShieldBan, ShieldCheck, Trash2, UserMinus, UserPlus, Video, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  CallParticipantStatus,
  CallSessionStatus,
  CallType,
} from "@/generated/prisma/enums";
import type { CommunicationActionState } from "@/lib/actions/communication-actions";
import {
  blockUserAction,
  joinGroupAction,
  leaveGroupAction,
  markNotificationReadAction,
  removeConnectionAction,
  removeGroupMemberAction,
  respondConnectionRequestAction,
  reviewGroupJoinRequestAction,
  sendConnectionRequestAction,
  sendMessageAction,
  startCallAction,
  startDirectConversationAction,
  unblockUserAction,
  updateCallParticipantAction,
} from "@/lib/actions/communication-actions";

import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ServerActionRunner = (formData: FormData) => Promise<CommunicationActionState>;

function MutationButton({
  action,
  buildFormData,
  children,
  pendingLabel,
  confirmMessage,
  onSuccess,
  ...props
}: ButtonProps & {
  action: ServerActionRunner;
  buildFormData: () => FormData;
  pendingLabel: string;
  confirmMessage?: string;
  onSuccess?: (result: CommunicationActionState) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      {...props}
      disabled={isPending || props.disabled}
      onClick={() => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          return;
        }

        startTransition(async () => {
          const result = await action(buildFormData());

          if (!result.ok) {
            toast.error(result.error ?? "This action could not be completed.");
            return;
          }

          toast.success(result.message ?? "Done.");
          if (result.redirectTo) {
            router.push(result.redirectTo);
          } else {
            router.refresh();
          }
          onSuccess?.(result);
        });
      }}
      type="button"
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
      {isPending ? pendingLabel : children}
    </Button>
  );
}

export function StartConversationButton({
  targetUserId,
  children = "Message",
  ...props
}: Omit<ButtonProps, "onClick" | "type"> & {
  targetUserId: string;
  children?: ReactNode;
}) {
  return (
    <MutationButton
      action={startDirectConversationAction}
      buildFormData={() => {
        const formData = new FormData();
        formData.set("targetUserId", targetUserId);
        return formData;
      }}
      pendingLabel="Opening..."
      {...props}
    >
      {children}
    </MutationButton>
  );
}

export function SendConnectionRequestButton({
  targetUserId,
  ...props
}: Omit<ButtonProps, "onClick" | "type"> & {
  targetUserId: string;
}) {
  return (
    <MutationButton
      action={sendConnectionRequestAction}
      buildFormData={() => {
        const formData = new FormData();
        formData.set("targetUserId", targetUserId);
        return formData;
      }}
      pendingLabel="Sending..."
      {...props}
    >
      <UserPlus className="size-4" />
      Connect
    </MutationButton>
  );
}

export function RespondConnectionRequestButtons({
  requestId,
  canCancel = false,
}: {
  requestId: string;
  canCancel?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {canCancel ? (
        <MutationButton
          action={respondConnectionRequestAction}
          buildFormData={() => {
            const formData = new FormData();
            formData.set("requestId", requestId);
            formData.set("action", "CANCEL");
            return formData;
          }}
          pendingLabel="Cancelling..."
          size="sm"
          variant="outline"
        >
          Cancel request
        </MutationButton>
      ) : (
        <>
          <MutationButton
            action={respondConnectionRequestAction}
            buildFormData={() => {
              const formData = new FormData();
              formData.set("requestId", requestId);
              formData.set("action", "ACCEPT");
              return formData;
            }}
            pendingLabel="Accepting..."
            size="sm"
          >
            <Check className="size-4" />
            Accept
          </MutationButton>
          <MutationButton
            action={respondConnectionRequestAction}
            buildFormData={() => {
              const formData = new FormData();
              formData.set("requestId", requestId);
              formData.set("action", "REJECT");
              return formData;
            }}
            pendingLabel="Rejecting..."
            size="sm"
            variant="outline"
          >
            <X className="size-4" />
            Reject
          </MutationButton>
        </>
      )}
    </div>
  );
}

export function RemoveConnectionButton({
  targetUserId,
  ...props
}: Omit<ButtonProps, "onClick" | "type"> & {
  targetUserId: string;
}) {
  return (
    <MutationButton
      action={removeConnectionAction}
      buildFormData={() => {
        const formData = new FormData();
        formData.set("targetUserId", targetUserId);
        return formData;
      }}
      confirmMessage="Remove this connection?"
      pendingLabel="Removing..."
      variant="outline"
      {...props}
    >
      <UserMinus className="size-4" />
      Remove connection
    </MutationButton>
  );
}

export function BlockUserButton({
  targetUserId,
  blocked = false,
  ...props
}: Omit<ButtonProps, "onClick" | "type"> & {
  targetUserId: string;
  blocked?: boolean;
}) {
  return blocked ? (
    <MutationButton
      action={unblockUserAction}
      buildFormData={() => {
        const formData = new FormData();
        formData.set("targetUserId", targetUserId);
        return formData;
      }}
      pendingLabel="Unblocking..."
      variant="outline"
      {...props}
    >
      <ShieldCheck className="size-4" />
      Unblock
    </MutationButton>
  ) : (
    <MutationButton
      action={blockUserAction}
      buildFormData={() => {
        const formData = new FormData();
        formData.set("targetUserId", targetUserId);
        return formData;
      }}
      confirmMessage="Block this user? They will lose access to direct communication with you."
      pendingLabel="Blocking..."
      variant="danger"
      {...props}
    >
      <ShieldBan className="size-4" />
      Block
    </MutationButton>
  );
}

export function JoinGroupButton({
  groupId,
  ...props
}: Omit<ButtonProps, "onClick" | "type"> & {
  groupId: string;
}) {
  return (
    <MutationButton
      action={joinGroupAction}
      buildFormData={() => {
        const formData = new FormData();
        formData.set("groupId", groupId);
        return formData;
      }}
      pendingLabel="Joining..."
      {...props}
    >
      Join group
    </MutationButton>
  );
}

export function ReviewGroupJoinButtons({ requestId }: { requestId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <MutationButton
        action={reviewGroupJoinRequestAction}
        buildFormData={() => {
          const formData = new FormData();
          formData.set("requestId", requestId);
          formData.set("status", "APPROVED");
          return formData;
        }}
        pendingLabel="Approving..."
        size="sm"
      >
        <Check className="size-4" />
        Approve
      </MutationButton>
      <MutationButton
        action={reviewGroupJoinRequestAction}
        buildFormData={() => {
          const formData = new FormData();
          formData.set("requestId", requestId);
          formData.set("status", "REJECTED");
          return formData;
        }}
        pendingLabel="Rejecting..."
        size="sm"
        variant="outline"
      >
        <X className="size-4" />
        Reject
      </MutationButton>
    </div>
  );
}

export function LeaveGroupButton({
  groupId,
  ...props
}: Omit<ButtonProps, "onClick" | "type"> & {
  groupId: string;
}) {
  return (
    <MutationButton
      action={leaveGroupAction}
      buildFormData={() => {
        const formData = new FormData();
        formData.set("groupId", groupId);
        return formData;
      }}
      confirmMessage="Leave this group?"
      pendingLabel="Leaving..."
      variant="outline"
      {...props}
    >
      <LogOut className="size-4" />
      Leave group
    </MutationButton>
  );
}

export function RemoveGroupMemberButton({
  groupId,
  memberId,
  ...props
}: Omit<ButtonProps, "onClick" | "type"> & {
  groupId: string;
  memberId: string;
}) {
  return (
    <MutationButton
      action={removeGroupMemberAction}
      buildFormData={() => {
        const formData = new FormData();
        formData.set("groupId", groupId);
        formData.set("memberId", memberId);
        return formData;
      }}
      confirmMessage="Remove this member from the group?"
      pendingLabel="Removing..."
      size="sm"
      variant="outline"
      {...props}
    >
      <Trash2 className="size-4" />
      Remove
    </MutationButton>
  );
}

export function NotificationReadButton({
  notificationId,
}: {
  notificationId: string;
}) {
  return (
    <MutationButton
      action={markNotificationReadAction}
      buildFormData={() => {
        const formData = new FormData();
        formData.set("notificationId", notificationId);
        return formData;
      }}
      pendingLabel="Saving..."
      size="sm"
      variant="ghost"
    >
      Mark read
    </MutationButton>
  );
}

export function MessageComposer({
  conversationId,
  disabledReason,
}: {
  conversationId: string;
  disabledReason?: string | null;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <Textarea
        disabled={Boolean(disabledReason) || isPending}
        onChange={(event) => setContent(event.target.value)}
        placeholder={
          disabledReason
            ? disabledReason
            : "Keep it crisp. Ask the real blocker or share the next step."
        }
        value={content}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-6 text-muted">
          {disabledReason ?? "Messages are stored with timestamps and read state tracking."}
        </p>
        <Button
          disabled={Boolean(disabledReason) || isPending || content.trim().length === 0}
          onClick={() => {
            startTransition(async () => {
              const formData = new FormData();
              formData.set("conversationId", conversationId);
              formData.set("content", content);
              const result = await sendMessageAction(formData);

              if (!result.ok) {
                toast.error(result.error ?? "Unable to send the message.");
                return;
              }

              setContent("");
              toast.success(result.message ?? "Message sent.");
              router.refresh();
            });
          }}
          type="button"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareText className="size-4" />}
          {isPending ? "Sending..." : "Send message"}
        </Button>
      </div>
    </div>
  );
}

type CallSummary = {
  id: string;
  callType: CallType;
  status: CallSessionStatus;
  initiatedById: string;
  startedAt?: Date | string | null;
  createdAt?: Date | string;
  participants: Array<{
    userId: string;
    status: CallParticipantStatus;
    user: {
      id: string;
      name: string;
    };
  }>;
};

export function CallControls({
  conversationId,
  currentUserId,
  activeCall,
  disabledReason,
}: {
  conversationId: string;
  currentUserId: string;
  activeCall: CallSummary | null;
  disabledReason?: string | null;
}) {
  const currentParticipant = activeCall?.participants.find(
    (participant) => participant.userId === currentUserId,
  );
  const isInitiator = activeCall?.initiatedById === currentUserId;

  if (disabledReason) {
    return (
      <div className="rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm text-muted">
        {disabledReason}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[24px] border border-border bg-background/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Call controls</p>
          <p className="text-xs leading-6 text-muted">
            Audio/video session status is tracked here. Signaling is ready for a WebRTC layer.
          </p>
        </div>
        {activeCall ? (
          <Badge variant={activeCall.status === CallSessionStatus.ACTIVE ? "success" : "secondary"}>
            {activeCall.callType === CallType.VIDEO ? "Video" : "Audio"} {activeCall.status.toLowerCase()}
          </Badge>
        ) : null}
      </div>

      {activeCall ? (
        <div className="flex flex-wrap gap-2">
          {activeCall.status === CallSessionStatus.RINGING &&
          currentParticipant?.status === CallParticipantStatus.INVITED ? (
            <>
              <MutationButton
                action={updateCallParticipantAction}
                buildFormData={() => {
                  const formData = new FormData();
                  formData.set("callSessionId", activeCall.id);
                  formData.set("action", "ACCEPT");
                  return formData;
                }}
                pendingLabel="Accepting..."
              >
                <Check className="size-4" />
                Accept
              </MutationButton>
              <MutationButton
                action={updateCallParticipantAction}
                buildFormData={() => {
                  const formData = new FormData();
                  formData.set("callSessionId", activeCall.id);
                  formData.set("action", "DECLINE");
                  return formData;
                }}
                pendingLabel="Declining..."
                variant="outline"
              >
                <X className="size-4" />
                Decline
              </MutationButton>
            </>
          ) : null}

          {activeCall.status === CallSessionStatus.RINGING && isInitiator ? (
            <MutationButton
              action={updateCallParticipantAction}
              buildFormData={() => {
                const formData = new FormData();
                formData.set("callSessionId", activeCall.id);
                formData.set("action", "END");
                return formData;
              }}
              pendingLabel="Cancelling..."
              variant="outline"
            >
              Cancel call
            </MutationButton>
          ) : null}

          {activeCall.status === CallSessionStatus.ACTIVE ? (
            <>
              {currentParticipant?.status !== CallParticipantStatus.JOINED ? (
                <MutationButton
                  action={updateCallParticipantAction}
                  buildFormData={() => {
                    const formData = new FormData();
                    formData.set("callSessionId", activeCall.id);
                    formData.set("action", "JOIN");
                    return formData;
                  }}
                  pendingLabel="Joining..."
                >
                  Join call
                </MutationButton>
              ) : (
                <MutationButton
                  action={updateCallParticipantAction}
                  buildFormData={() => {
                    const formData = new FormData();
                    formData.set("callSessionId", activeCall.id);
                    formData.set("action", "LEAVE");
                    return formData;
                  }}
                  pendingLabel="Leaving..."
                  variant="outline"
                >
                  Leave call
                </MutationButton>
              )}
              <MutationButton
                action={updateCallParticipantAction}
                buildFormData={() => {
                  const formData = new FormData();
                  formData.set("callSessionId", activeCall.id);
                  formData.set("action", "END");
                  return formData;
                }}
                pendingLabel="Ending..."
                variant="outline"
              >
                End for everyone
              </MutationButton>
            </>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <MutationButton
            action={startCallAction}
            buildFormData={() => {
              const formData = new FormData();
              formData.set("conversationId", conversationId);
              formData.set("callType", CallType.AUDIO);
              return formData;
            }}
            pendingLabel="Starting..."
          >
            <Phone className="size-4" />
            Voice call
          </MutationButton>
          <MutationButton
            action={startCallAction}
            buildFormData={() => {
              const formData = new FormData();
              formData.set("conversationId", conversationId);
              formData.set("callType", CallType.VIDEO);
              return formData;
            }}
            pendingLabel="Starting..."
            variant="secondary"
          >
            <Video className="size-4" />
            Video call
          </MutationButton>
        </div>
      )}
    </div>
  );
}
