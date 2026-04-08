import { describe, expect, it } from "vitest";

import { CallParticipantStatus } from "@/generated/prisma/enums";
import {
  shouldApplyRemoteAnswer,
  shouldApplyRemoteOffer,
  shouldCreateLocalOffer,
} from "@/lib/call-signaling";

describe("call-signaling guards", () => {
  it("ignores duplicate or late answers once the peer is already stable", () => {
    const result = shouldApplyRemoteAnswer({
      currentUserId: "user-1",
      initiatedById: "user-1",
      signalingState: "stable",
      remoteDescription: {
        type: "answer",
        sdp: "same-answer",
      },
      incomingDescription: {
        type: "answer",
        sdp: "same-answer",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Duplicate remote answer");
  });

  it("accepts a remote answer only while waiting on a local offer", () => {
    const result = shouldApplyRemoteAnswer({
      currentUserId: "user-1",
      initiatedById: "user-1",
      signalingState: "have-local-offer",
      remoteDescription: null,
      incomingDescription: {
        type: "answer",
        sdp: "fresh-answer",
      },
    });

    expect(result.ok).toBe(true);
  });

  it("blocks remote offers on the initiator side", () => {
    const result = shouldApplyRemoteOffer({
      currentUserId: "user-1",
      initiatedById: "user-1",
      signalingState: "stable",
      remoteDescription: null,
      incomingDescription: {
        type: "offer",
        sdp: "incoming-offer",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Initiator");
  });

  it("does not create another offer while already awaiting an answer", () => {
    const result = shouldCreateLocalOffer({
      currentUserId: "user-1",
      initiatedById: "user-1",
      signalingState: "stable",
      connectionState: "connecting",
      hasLocalStream: true,
      hasRemoteStream: false,
      hasRemoteReady: true,
      hasSentReady: true,
      awaitingAnswer: true,
      currentParticipantStatus: CallParticipantStatus.JOINED,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("waiting for an answer");
  });
});
