"use client";

import {
  Check,
  Loader2,
  LogOut,
  MessageSquareText,
  Paperclip,
  SendHorizontal,
  ShieldBan,
  ShieldCheck,
  SmilePlus,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
  startDirectConversationAction,
  unblockUserAction,
} from "@/lib/actions/communication-actions";
import {
  LiveCallControls,
  type CallSummary,
} from "@/components/communication/live-call-controls";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
  helperText,
  placeholder,
  refreshOnSuccess = true,
  variant = "default",
}: {
  conversationId: string;
  disabledReason?: string | null;
  helperText?: string;
  placeholder?: string;
  refreshOnSuccess?: boolean;
  variant?: "default" | "chat";
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const isChatVariant = variant === "chat";
  const resolvedPlaceholder =
    disabledReason ??
    placeholder ??
    "Keep it crisp. Ask the real blocker or share the next step.";
  const resolvedHelperText =
    disabledReason ??
    helperText ??
    "Messages are stored with timestamps and read state tracking.";

  return (
    <div
      className={cn(
        "space-y-3",
        isChatVariant &&
          "rounded-[26px] border border-border/70 bg-background/95 p-3 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]",
      )}
    >
      <Textarea
        disabled={Boolean(disabledReason) || isPending}
        className={cn(
          isChatVariant &&
            "min-h-[3.5rem] border-none bg-transparent px-0 py-2 shadow-none focus-visible:ring-0",
        )}
        onChange={(event) => setContent(event.target.value)}
        placeholder={resolvedPlaceholder}
        value={content}
      />
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3",
          isChatVariant && "gap-2",
        )}
      >
        {isChatVariant ? (
          <div className="flex items-center gap-1">
            <Button disabled size="icon" type="button" variant="ghost">
              <SmilePlus className="size-4" />
            </Button>
            <Button disabled size="icon" type="button" variant="ghost">
              <Paperclip className="size-4" />
            </Button>
            <p className="hidden text-xs leading-6 text-muted sm:block">
              {resolvedHelperText}
            </p>
          </div>
        ) : (
          <p className="text-xs leading-6 text-muted">{resolvedHelperText}</p>
        )}
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

              if (refreshOnSuccess) {
                router.refresh();
              }
            });
          }}
          size={isChatVariant ? "icon" : "default"}
          type="button"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isChatVariant ? (
            <SendHorizontal className="size-4" />
          ) : (
            <MessageSquareText className="size-4" />
          )}
          {isChatVariant ? null : isPending ? "Sending..." : "Send message"}
        </Button>
      </div>
    </div>
  );
}

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
  return (
    <LiveCallControls
      activeCall={activeCall}
      conversationId={conversationId}
      currentUserId={currentUserId}
      disabledReason={disabledReason}
    />
  );
}
