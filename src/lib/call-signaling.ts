import { CallParticipantStatus } from "@/generated/prisma/enums";

type SessionDescriptionLike = {
  type?: RTCSdpType | null;
  sdp?: string | null;
} | null | undefined;

export function isSameSessionDescription(
  left: SessionDescriptionLike,
  right: SessionDescriptionLike,
) {
  if (!left || !right) {
    return false;
  }

  return left.type === right.type && left.sdp === right.sdp;
}

export function shouldApplyRemoteOffer(input: {
  currentUserId: string;
  initiatedById: string;
  signalingState: RTCSignalingState;
  remoteDescription: SessionDescriptionLike;
  incomingDescription: SessionDescriptionLike;
}) {
  if (input.currentUserId === input.initiatedById) {
    return {
      ok: false,
      reason: "Initiator should not apply a remote offer in this call flow.",
    };
  }

  if (isSameSessionDescription(input.remoteDescription, input.incomingDescription)) {
    return {
      ok: false,
      reason: "Duplicate remote offer received.",
    };
  }

  if (input.signalingState !== "stable") {
    return {
      ok: false,
      reason: `Remote offer ignored because signalingState is ${input.signalingState}.`,
    };
  }

  return {
    ok: true,
    reason: "Apply remote offer.",
  };
}

export function shouldApplyRemoteAnswer(input: {
  currentUserId: string;
  initiatedById: string;
  signalingState: RTCSignalingState;
  remoteDescription: SessionDescriptionLike;
  incomingDescription: SessionDescriptionLike;
}) {
  if (input.currentUserId !== input.initiatedById) {
    return {
      ok: false,
      reason: "Only the initiator applies remote answers in this call flow.",
    };
  }

  if (isSameSessionDescription(input.remoteDescription, input.incomingDescription)) {
    return {
      ok: false,
      reason: "Duplicate remote answer received.",
    };
  }

  if (input.signalingState !== "have-local-offer") {
    return {
      ok: false,
      reason: `Remote answer ignored because signalingState is ${input.signalingState}.`,
    };
  }

  return {
    ok: true,
    reason: "Apply remote answer.",
  };
}

export function shouldCreateLocalOffer(input: {
  currentUserId: string;
  initiatedById: string;
  signalingState: RTCSignalingState;
  connectionState: RTCPeerConnectionState;
  hasLocalStream: boolean;
  hasRemoteStream: boolean;
  hasRemoteReady: boolean;
  hasSentReady: boolean;
  awaitingAnswer: boolean;
  currentParticipantStatus?: CallParticipantStatus;
}) {
  if (input.currentUserId !== input.initiatedById) {
    return {
      ok: false,
      reason: "Only the initiator creates offers.",
    };
  }

  if (input.currentParticipantStatus !== CallParticipantStatus.JOINED) {
    return {
      ok: false,
      reason: "Caller is not joined yet.",
    };
  }

  if (!input.hasLocalStream || !input.hasRemoteReady || !input.hasSentReady) {
    return {
      ok: false,
      reason: "Offer prerequisites are incomplete.",
    };
  }

  if (input.awaitingAnswer) {
    return {
      ok: false,
      reason: "Already waiting for an answer.",
    };
  }

  if (input.signalingState !== "stable") {
    return {
      ok: false,
      reason: `Cannot create offer while signalingState is ${input.signalingState}.`,
    };
  }

  if (input.connectionState === "connected" && input.hasRemoteStream) {
    return {
      ok: false,
      reason: "Peer connection is already live.",
    };
  }

  return {
    ok: true,
    reason: "Create a local offer.",
  };
}

export function describeSignalingState(input: {
  signalingState: RTCSignalingState;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
}) {
  return `${input.signalingState}/${input.connectionState}/${input.iceConnectionState}`;
}

export function getPresenceLabel(lastActiveAt?: Date | string | null) {
  if (!lastActiveAt) {
    return "Last seen recently";
  }

  const timestamp = new Date(lastActiveAt);

  if (Number.isNaN(timestamp.getTime())) {
    return "Last seen recently";
  }

  const diffMs = Date.now() - timestamp.getTime();

  if (diffMs <= 2 * 60 * 1000) {
    return "Online";
  }

  if (diffMs <= 10 * 60 * 1000) {
    return "Active a few minutes ago";
  }

  if (diffMs <= 60 * 60 * 1000) {
    return "Active within the last hour";
  }

  return "Last seen earlier";
}
