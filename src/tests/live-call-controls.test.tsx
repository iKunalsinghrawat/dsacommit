import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LiveCallControls } from "@/components/communication/live-call-controls";
import {
  CallParticipantStatus,
  CallSessionStatus,
  CallType,
} from "@/generated/prisma/enums";

const {
  routerRefresh,
  startCallAction,
  updateCallParticipantAction,
  requestCallMediaStream,
} = vi.hoisted(() => ({
  routerRefresh: vi.fn(),
  startCallAction: vi.fn(),
  updateCallParticipantAction: vi.fn(),
  requestCallMediaStream: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/actions/communication-actions", () => ({
  startCallAction,
  updateCallParticipantAction,
}));

vi.mock("@/components/communication/call-browser", () => ({
  getWebRtcConfiguration: () => ({
    iceServers: [],
  }),
  requestCallMediaStream,
  stopMediaStream: vi.fn(),
  describeCallMediaError: (error: unknown, callType: CallType) =>
    error instanceof Error
      ? error.message
      : callType === CallType.VIDEO
        ? "Camera or microphone permission denied."
        : "Microphone permission denied.",
}));

vi.mock("@/components/communication/communication-realtime-provider", () => ({
  useCommunicationRealtimeSubscription: vi.fn(),
}));

function createMockStream(options?: { video?: boolean }) {
  const audioTrack = {
    enabled: true,
    stop: vi.fn(),
    kind: "audio",
    id: "audio-1",
  };
  const videoTrack = {
    enabled: true,
    stop: vi.fn(),
    kind: "video",
    id: "video-1",
  };

  return {
    getTracks: () => (options?.video ? [audioTrack, videoTrack] : [audioTrack]),
    getAudioTracks: () => [audioTrack],
    getVideoTracks: () => (options?.video ? [videoTrack] : []),
  } as unknown as MediaStream;
}

describe("LiveCallControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    startCallAction.mockResolvedValue({
      ok: true,
      message: "Call started.",
    });
    updateCallParticipantAction.mockResolvedValue({
      ok: true,
      message: "Call updated.",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests microphone access before starting an audio call", async () => {
    requestCallMediaStream.mockResolvedValue(createMockStream());

    const user = userEvent.setup();

    render(
      <LiveCallControls
        activeCall={null}
        conversationId="conversation-1"
        currentUserId="user-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Voice call" }));

    await waitFor(() => {
      expect(requestCallMediaStream).toHaveBeenCalledWith(CallType.AUDIO);
      expect(startCallAction).toHaveBeenCalledTimes(1);
    });
  });

  it("requests camera and microphone access before starting a video call", async () => {
    requestCallMediaStream.mockResolvedValue(createMockStream({ video: true }));

    const user = userEvent.setup();

    render(
      <LiveCallControls
        activeCall={null}
        conversationId="conversation-1"
        currentUserId="user-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Video call" }));

    await waitFor(() => {
      expect(requestCallMediaStream).toHaveBeenCalledWith(CallType.VIDEO);
      expect(startCallAction).toHaveBeenCalledTimes(1);
    });
  });

  it("shows a permission error and avoids starting the call when media access fails", async () => {
    requestCallMediaStream.mockRejectedValue(new Error("Microphone permission denied."));

    const user = userEvent.setup();

    render(
      <LiveCallControls
        activeCall={null}
        conversationId="conversation-1"
        currentUserId="user-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Voice call" }));

    await waitFor(() => {
      expect(startCallAction).not.toHaveBeenCalled();
      expect(
        screen.getAllByText("Microphone permission denied.").length,
      ).toBeGreaterThan(0);
    });
  });

  it("requests media permission before accepting an incoming video call", async () => {
    requestCallMediaStream.mockResolvedValue(createMockStream({ video: true }));

    const user = userEvent.setup();

    render(
      <LiveCallControls
        activeCall={{
          id: "call-1",
          callType: CallType.VIDEO,
          status: CallSessionStatus.RINGING,
          initiatedById: "user-2",
          createdAt: new Date().toISOString(),
          participants: [
            {
              userId: "user-1",
              status: CallParticipantStatus.INVITED,
              user: {
                id: "user-1",
                name: "Receiver",
              },
            },
            {
              userId: "user-2",
              status: CallParticipantStatus.JOINED,
              user: {
                id: "user-2",
                name: "Caller",
              },
            },
          ],
        }}
        conversationId="conversation-1"
        currentUserId="user-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => {
      expect(requestCallMediaStream).toHaveBeenCalledWith(CallType.VIDEO);
      expect(updateCallParticipantAction).toHaveBeenCalledTimes(1);
    });
  });
});
