"use client";

import {
  AlertCircle,
  Check,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { CommunicationActionState } from "@/lib/actions/communication-actions";
import {
  startCallAction,
  updateCallParticipantAction,
} from "@/lib/actions/communication-actions";
import type { CommunicationRealtimeSignal } from "@/lib/communication-realtime";
import {
  CallParticipantStatus,
  CallSessionStatus,
  CallType,
  SignalingEventType,
} from "@/generated/prisma/enums";
import { cn, formatRelative } from "@/lib/utils";

import {
  describeCallMediaError,
  getWebRtcConfiguration,
  requestCallMediaStream,
  stopMediaStream,
} from "@/components/communication/call-browser";
import { useCommunicationRealtimeSubscription } from "@/components/communication/communication-realtime-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  describeSignalingState,
  shouldApplyRemoteAnswer,
  shouldApplyRemoteOffer,
  shouldCreateLocalOffer,
} from "@/lib/call-signaling";

export type CallSummary = {
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

type PendingCallAction =
  | "start-audio"
  | "start-video"
  | "accept"
  | "decline"
  | "join"
  | "leave"
  | "end"
  | "cancel"
  | null;

async function parseSignalResponse(response: Response) {
  const payload = await response.json().catch(() => null);
  return payload && typeof payload === "object" ? payload : null;
}

function buildCallActionFormData(callSessionId: string, action: string) {
  const formData = new FormData();
  formData.set("callSessionId", callSessionId);
  formData.set("action", action);
  return formData;
}

function buildStartCallFormData(conversationId: string, callType: CallType) {
  const formData = new FormData();
  formData.set("conversationId", conversationId);
  formData.set("callType", callType);
  return formData;
}

function getRemoteParticipant(
  activeCall: CallSummary | null,
  currentUserId: string,
) {
  return activeCall?.participants.find((participant) => participant.userId !== currentUserId) ?? null;
}

function logCallDebug(
  message: string,
  metadata?: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info",
) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const logger =
    level === "warn"
      ? console.warn
      : level === "error"
        ? console.error
        : console.info;

  logger("[LiveCallControls]", message, metadata ?? {});
}

function describeCallState(input: {
  activeCall: CallSummary | null;
  currentUserId: string;
  pendingAction: PendingCallAction;
  mediaError: string | null;
  hasRemoteStream: boolean;
  peerConnectionState: RTCPeerConnectionState | "idle";
}) {
  if (input.mediaError) {
    return input.mediaError;
  }

  if (input.pendingAction === "start-audio") {
    return "Requesting microphone access and opening the audio call.";
  }

  if (input.pendingAction === "start-video") {
    return "Requesting camera and microphone access and opening the video call.";
  }

  if (input.pendingAction === "accept" || input.pendingAction === "join") {
    return "Preparing local media and joining the live session.";
  }

  if (!input.activeCall) {
    return "Start an audio or video call. Permissions are checked before the session opens.";
  }

  const currentParticipant = input.activeCall.participants.find(
    (participant) => participant.userId === input.currentUserId,
  );

  if (
    input.activeCall.status === CallSessionStatus.RINGING &&
    currentParticipant?.status === CallParticipantStatus.INVITED
  ) {
    return "Incoming call. Accept to request media permissions and connect instantly.";
  }

  if (
    input.activeCall.status === CallSessionStatus.RINGING &&
    input.activeCall.initiatedById === input.currentUserId
  ) {
    return "Calling now. Your local media is ready while the other participant is ringing.";
  }

  if (input.activeCall.status === CallSessionStatus.ACTIVE) {
    if (input.peerConnectionState === "connected" || input.hasRemoteStream) {
      return "Call is live. Audio/video tracks are flowing in real time.";
    }

    if (currentParticipant?.status === CallParticipantStatus.JOINED) {
      return "Call accepted. Negotiating the secure WebRTC connection now.";
    }
  }

  if (input.activeCall.status === CallSessionStatus.DECLINED) {
    return "The other participant declined the call.";
  }

  if (input.activeCall.status === CallSessionStatus.MISSED) {
    return "This call timed out before both participants joined.";
  }

  if (input.activeCall.status === CallSessionStatus.CANCELLED) {
    return "This call was cancelled before it connected.";
  }

  if (input.activeCall.status === CallSessionStatus.ENDED) {
    return "Call ended. You can start another one whenever you're ready.";
  }

  return "Call state updated.";
}

export function LiveCallControls({
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
  const router = useRouter();
  const activeCallRef = useRef<CallSummary | null>(activeCall);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const processedSignalIdsRef = useRef(new Set<string>());
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const readyParticipantIdsRef = useRef(new Set<string>());
  const readySentForCallRef = useRef<string | null>(null);
  const awaitingAnswerRef = useRef(false);
  const bootstrappedSignalsForCallRef = useRef<string | null>(null);
  const lastSignalAtRef = useRef<string | null>(null);
  const callIdRef = useRef<string | null>(activeCall?.id ?? null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingCallAction>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [peerConnectionState, setPeerConnectionState] =
    useState<RTCPeerConnectionState | "idle">("idle");
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);

  const currentParticipant =
    activeCall?.participants.find((participant) => participant.userId === currentUserId) ?? null;
  const remoteParticipant = getRemoteParticipant(activeCall, currentUserId);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const replaceLocalStream = useCallback((stream: MediaStream | null) => {
    if (localStreamRef.current && localStreamRef.current !== stream) {
      stopMediaStream(localStreamRef.current);
    }

    localStreamRef.current = stream;
    setLocalStream(stream);
    setIsMicEnabled(
      stream ? stream.getAudioTracks().every((track) => track.enabled) : true,
    );
    setIsCameraEnabled(
      stream ? stream.getVideoTracks().every((track) => track.enabled) : true,
    );
  }, []);

  const replaceRemoteStream = useCallback((stream: MediaStream | null) => {
    if (remoteStreamRef.current && remoteStreamRef.current !== stream) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    remoteStreamRef.current = stream;
    setRemoteStream(stream);
  }, []);

  const cleanupPeerConnection = useCallback(
    (options?: { keepLocalStream?: boolean }) => {
      pendingIceCandidatesRef.current = [];
      readyParticipantIdsRef.current.clear();
      readySentForCallRef.current = null;
      awaitingAnswerRef.current = false;
      bootstrappedSignalsForCallRef.current = null;
      lastSignalAtRef.current = null;
      processedSignalIdsRef.current.clear();

      const peerConnection = peerConnectionRef.current;
      if (peerConnection) {
        logCallDebug("Destroying peer connection.", {
          callSessionId: callIdRef.current,
          state: describeSignalingState({
            signalingState: peerConnection.signalingState,
            connectionState: peerConnection.connectionState,
            iceConnectionState: peerConnection.iceConnectionState,
          }),
          keepLocalStream: options?.keepLocalStream ?? false,
        });
        peerConnection.onicecandidate = null;
        peerConnection.ontrack = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.oniceconnectionstatechange = null;
        peerConnection.onsignalingstatechange = null;
        peerConnection.close();
      }

      peerConnectionRef.current = null;
      setPeerConnectionState("idle");
      replaceRemoteStream(null);

      if (!options?.keepLocalStream) {
        replaceLocalStream(null);
      }
    },
    [replaceLocalStream, replaceRemoteStream],
  );

  useEffect(() => {
    const nextCallId = activeCall?.id ?? null;

    if (callIdRef.current && callIdRef.current !== nextCallId) {
      cleanupPeerConnection();
      setPendingAction(null);
      setMediaError(null);
    }

    callIdRef.current = nextCallId;

    if (!nextCallId) {
      setPendingAction(null);
      setMediaError(null);
      return;
    }

    if (activeCall?.status === CallSessionStatus.RINGING) {
      setMediaError(null);
    }
  }, [activeCall?.id, activeCall?.status, cleanupPeerConnection]);

  const sendSignal = useCallback(
    async (type: SignalingEventType, payload: unknown) => {
      const activeCallId = callIdRef.current;

      if (!activeCallId) {
        return null;
      }

      logCallDebug("Sending signaling event.", {
        callSessionId: activeCallId,
        type,
      });

      const response = await fetch(`/api/calls/${activeCallId}/signals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          payload,
        }),
      });

      const result = await parseSignalResponse(response);

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ?? "Unable to send the live call signal right now.",
        );
      }

      if (
        result.signal &&
        typeof result.signal === "object" &&
        typeof result.signal.createdAt === "string"
      ) {
        lastSignalAtRef.current = result.signal.createdAt;
      }

      logCallDebug("Signaling event persisted.", {
        callSessionId: activeCallId,
        type,
        signalId:
          result.signal &&
          typeof result.signal === "object" &&
          "id" in result.signal &&
          typeof result.signal.id === "string"
            ? result.signal.id
            : null,
      });

      return result.signal ?? null;
    },
    [],
  );

  const syncLocalTracksToPeerConnection = useCallback((stream: MediaStream | null) => {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection || !stream) {
      return;
    }

    for (const track of stream.getTracks()) {
      const existingSender = peerConnection
        .getSenders()
        .find((sender) => sender.track?.kind === track.kind);

      if (existingSender) {
        if (existingSender.track?.id !== track.id) {
          void existingSender.replaceTrack(track);
        }
      } else {
        peerConnection.addTrack(track, stream);
      }
    }
  }, []);

  const flushPendingIceCandidates = useCallback(async () => {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection || !peerConnection.remoteDescription) {
      return;
    }

    while (pendingIceCandidatesRef.current.length > 0) {
      const candidate = pendingIceCandidatesRef.current.shift();

      if (!candidate) {
        continue;
      }

      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const ensurePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    if (typeof RTCPeerConnection === "undefined") {
      throw new Error("WebRTC is unavailable in this browser.");
    }

    const peerConnection = new RTCPeerConnection(getWebRtcConfiguration());
    logCallDebug("Created peer connection.", {
      callSessionId: callIdRef.current,
    });

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      logCallDebug("Generated ICE candidate.", {
        callSessionId: callIdRef.current,
        candidate: event.candidate.candidate,
      });

      void sendSignal(
        SignalingEventType.ICE_CANDIDATE,
        event.candidate.toJSON
          ? event.candidate.toJSON()
          : {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
            },
      ).catch((error) => {
        setMediaError(
          error instanceof Error
            ? error.message
            : "Unable to share the network candidate for this call.",
        );
      });
    };

    peerConnection.ontrack = (event) => {
      logCallDebug("Received remote media track.", {
        callSessionId: callIdRef.current,
        kind: event.track.kind,
      });
      const nextRemoteStream =
        remoteStreamRef.current ??
        (typeof MediaStream !== "undefined" ? new MediaStream() : null);

      if (!nextRemoteStream) {
        return;
      }

      for (const track of event.streams[0]?.getTracks() ?? [event.track]) {
        const exists = nextRemoteStream
          .getTracks()
          .some((existingTrack) => existingTrack.id === track.id);

        if (!exists) {
          nextRemoteStream.addTrack(track);
        }
      }

      replaceRemoteStream(nextRemoteStream);
      setMediaError(null);
    };

    peerConnection.onconnectionstatechange = () => {
      setPeerConnectionState(peerConnection.connectionState);
      logCallDebug("Peer connection state changed.", {
        callSessionId: callIdRef.current,
        state: describeSignalingState({
          signalingState: peerConnection.signalingState,
          connectionState: peerConnection.connectionState,
          iceConnectionState: peerConnection.iceConnectionState,
        }),
      });

      if (peerConnection.connectionState === "failed") {
        setMediaError("The live call connection failed. Try joining again.");
      }

      if (peerConnection.connectionState === "connected") {
        awaitingAnswerRef.current = false;
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      logCallDebug("ICE connection state changed.", {
        callSessionId: callIdRef.current,
        state: describeSignalingState({
          signalingState: peerConnection.signalingState,
          connectionState: peerConnection.connectionState,
          iceConnectionState: peerConnection.iceConnectionState,
        }),
      });
      if (peerConnection.iceConnectionState === "failed") {
        setMediaError("Unable to complete ICE negotiation for this call.");
      }
    };

    peerConnection.onsignalingstatechange = () => {
      logCallDebug("Signaling state changed.", {
        callSessionId: callIdRef.current,
        state: describeSignalingState({
          signalingState: peerConnection.signalingState,
          connectionState: peerConnection.connectionState,
          iceConnectionState: peerConnection.iceConnectionState,
        }),
      });
    };

    peerConnectionRef.current = peerConnection;
    syncLocalTracksToPeerConnection(localStreamRef.current);

    return peerConnection;
  }, [replaceRemoteStream, sendSignal, syncLocalTracksToPeerConnection]);

  const ensureLocalMedia = useCallback(
    async (callType: CallType) => {
      const existingStream = localStreamRef.current;
      const existingHasVideo = Boolean(existingStream?.getVideoTracks().length);

      if (
        existingStream &&
        (callType === CallType.AUDIO || (callType === CallType.VIDEO && existingHasVideo))
      ) {
        syncLocalTracksToPeerConnection(existingStream);
        return existingStream;
      }

      const nextStream = await requestCallMediaStream(callType);
      replaceLocalStream(nextStream);
      setMediaError(null);
      syncLocalTracksToPeerConnection(nextStream);

      return nextStream;
    },
    [replaceLocalStream, syncLocalTracksToPeerConnection],
  );

  const maybeCreateOffer = useCallback(async () => {
    const liveCall = activeCallRef.current;

    if (!liveCall || liveCall.initiatedById !== currentUserId) {
      return;
    }

    if (liveCall.status !== CallSessionStatus.ACTIVE) {
      return;
    }

    const callerParticipant = liveCall.participants.find(
      (participant) => participant.userId === currentUserId,
    );
    const recipientParticipant = liveCall.participants.find(
      (participant) => participant.userId !== currentUserId,
    );

    if (
      callerParticipant?.status !== CallParticipantStatus.JOINED ||
      !recipientParticipant
    ) {
      return;
    }

    const peerConnection = ensurePeerConnection();
    const offerDecision = shouldCreateLocalOffer({
      currentUserId,
      initiatedById: liveCall.initiatedById,
      signalingState: peerConnection.signalingState,
      connectionState: peerConnection.connectionState,
      hasLocalStream: Boolean(localStreamRef.current),
      hasRemoteStream: Boolean(remoteStreamRef.current?.getTracks().length),
      hasRemoteReady: readyParticipantIdsRef.current.has(recipientParticipant.userId),
      hasSentReady: readySentForCallRef.current === liveCall.id,
      awaitingAnswer: awaitingAnswerRef.current,
      currentParticipantStatus: callerParticipant?.status,
    });

    if (!offerDecision.ok) {
      logCallDebug("Skipped local offer creation.", {
        callSessionId: liveCall.id,
        reason: offerDecision.reason,
      });
      return;
    }

    syncLocalTracksToPeerConnection(localStreamRef.current);
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: liveCall.callType === CallType.VIDEO,
    });
    await peerConnection.setLocalDescription(offer);
    awaitingAnswerRef.current = true;
    logCallDebug("Created local offer.", {
      callSessionId: liveCall.id,
      signalingState: peerConnection.signalingState,
    });
    await sendSignal(
      SignalingEventType.OFFER,
      peerConnection.localDescription?.toJSON
        ? peerConnection.localDescription.toJSON()
        : {
            type: offer.type,
            sdp: offer.sdp,
          },
    );
  }, [
    currentUserId,
    ensurePeerConnection,
    sendSignal,
    syncLocalTracksToPeerConnection,
  ]);

  const sendReadySignal = useCallback(async () => {
    const liveCall = activeCallRef.current;

    if (
      !liveCall ||
      liveCall.status !== CallSessionStatus.ACTIVE ||
      readySentForCallRef.current === liveCall.id
    ) {
      return;
    }

    await sendSignal(SignalingEventType.READY, {
      callType: liveCall.callType,
    });
    readyParticipantIdsRef.current.add(currentUserId);
    readySentForCallRef.current = liveCall.id;
    await maybeCreateOffer();
  }, [currentUserId, maybeCreateOffer, sendSignal]);

  const applySignal = useCallback(
    async (signal: CommunicationRealtimeSignal) => {
      if (signal.senderId === currentUserId) {
        return;
      }

      if (processedSignalIdsRef.current.has(signal.id)) {
        return;
      }

      processedSignalIdsRef.current.add(signal.id);
      lastSignalAtRef.current = signal.createdAt;
      logCallDebug("Processing remote signal.", {
        callSessionId: signal.callSessionId,
        signalId: signal.id,
        type: signal.type,
        senderId: signal.senderId,
      });

      switch (signal.type) {
        case SignalingEventType.READY: {
          readyParticipantIdsRef.current.add(signal.senderId);
          await maybeCreateOffer();
          return;
        }

        case SignalingEventType.OFFER: {
          const liveCall = activeCallRef.current;

          if (!liveCall) {
            return;
          }

          await ensureLocalMedia(liveCall.callType);
          const peerConnection = ensurePeerConnection();
          const sessionDescription = signal.payload as RTCSessionDescriptionInit;
          const offerDecision = shouldApplyRemoteOffer({
            currentUserId,
            initiatedById: liveCall.initiatedById,
            signalingState: peerConnection.signalingState,
            remoteDescription: peerConnection.remoteDescription,
            incomingDescription: sessionDescription,
          });

          if (!offerDecision.ok) {
            logCallDebug("Ignored remote offer.", {
              callSessionId: liveCall.id,
              signalId: signal.id,
              reason: offerDecision.reason,
            });
            return;
          }

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(sessionDescription),
          );
          logCallDebug("Applied remote offer.", {
            callSessionId: liveCall.id,
            signalId: signal.id,
            signalingState: peerConnection.signalingState,
          });
          await flushPendingIceCandidates();

          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          awaitingAnswerRef.current = false;
          logCallDebug("Created local answer.", {
            callSessionId: liveCall.id,
            signalId: signal.id,
            signalingState: peerConnection.signalingState,
          });

          await sendSignal(
            SignalingEventType.ANSWER,
            peerConnection.localDescription?.toJSON
              ? peerConnection.localDescription.toJSON()
              : {
                  type: answer.type,
                  sdp: answer.sdp,
                },
          );
          return;
        }

        case SignalingEventType.ANSWER: {
          const liveCall = activeCallRef.current;

          if (!liveCall) {
            return;
          }

          const peerConnection = ensurePeerConnection();
          const sessionDescription = signal.payload as RTCSessionDescriptionInit;
          const answerDecision = shouldApplyRemoteAnswer({
            currentUserId,
            initiatedById: liveCall.initiatedById,
            signalingState: peerConnection.signalingState,
            remoteDescription: peerConnection.remoteDescription,
            incomingDescription: sessionDescription,
          });

          if (!answerDecision.ok) {
            if (peerConnection.signalingState === "stable") {
              awaitingAnswerRef.current = false;
            }

            logCallDebug("Ignored remote answer.", {
              callSessionId: liveCall.id,
              signalId: signal.id,
              reason: answerDecision.reason,
            });
            return;
          }

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(sessionDescription),
          );
          awaitingAnswerRef.current = false;
          logCallDebug("Applied remote answer.", {
            callSessionId: liveCall.id,
            signalId: signal.id,
            signalingState: peerConnection.signalingState,
          });
          await flushPendingIceCandidates();
          return;
        }

        case SignalingEventType.ICE_CANDIDATE: {
          const peerConnection = ensurePeerConnection();
          const candidate = signal.payload as RTCIceCandidateInit | null;

          if (!candidate) {
            return;
          }

          if (!peerConnection.remoteDescription) {
            logCallDebug("Queued ICE candidate until remote description is ready.", {
              callSessionId: signal.callSessionId,
              signalId: signal.id,
            });
            pendingIceCandidatesRef.current.push(candidate);
            return;
          }

          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          logCallDebug("Applied ICE candidate.", {
            callSessionId: signal.callSessionId,
            signalId: signal.id,
          });
          return;
        }

        case SignalingEventType.HANGUP: {
          cleanupPeerConnection();
          router.refresh();
          return;
        }

        default:
          return;
      }
    },
    [
      cleanupPeerConnection,
      currentUserId,
      ensureLocalMedia,
      ensurePeerConnection,
      flushPendingIceCandidates,
      maybeCreateOffer,
      router,
      sendSignal,
    ],
  );

  const syncPersistedSignals = useCallback(async () => {
    const activeCallId = callIdRef.current;

    if (!activeCallId) {
      return;
    }

    const search = lastSignalAtRef.current
      ? `?since=${encodeURIComponent(lastSignalAtRef.current)}`
      : "";
    const response = await fetch(`/api/calls/${activeCallId}/signals${search}`, {
      cache: "no-store",
    });
    const result = await parseSignalResponse(response);

    if (!response.ok || !result?.ok || !Array.isArray(result.signals)) {
      return;
    }

    for (const signal of result.signals as CommunicationRealtimeSignal[]) {
      await applySignal(signal);
    }
  }, [applySignal]);

  useCommunicationRealtimeSubscription(
    useCallback(
      (event) => {
        const liveCall = activeCallRef.current;

        if (!liveCall || event.callSessionId !== liveCall.id) {
          return;
        }

        if (event.type === "call:signal" && event.payload?.signal) {
          void applySignal(event.payload.signal).catch((error) => {
            setMediaError(
              error instanceof Error
                ? error.message
                : "Unable to process the live signaling event.",
            );
          });
          return;
        }

        if (
          event.type === "call:declined" ||
          event.type === "call:ended" ||
          event.type === "call:missed"
        ) {
          cleanupPeerConnection();
          router.refresh();
          return;
        }

        if (event.type === "call:accepted") {
          void syncPersistedSignals();
        }
      },
      [applySignal, cleanupPeerConnection, router, syncPersistedSignals],
    ),
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncPersistedSignals();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncPersistedSignals]);

  useEffect(() => {
    if (
      !activeCall ||
      activeCall.status !== CallSessionStatus.ACTIVE ||
      currentParticipant?.status !== CallParticipantStatus.JOINED
    ) {
      return;
    }

    let isCancelled = false;

    const bootstrapLiveCall = async () => {
      try {
        await ensureLocalMedia(activeCall.callType);

        if (isCancelled) {
          return;
        }

        ensurePeerConnection();

        if (bootstrappedSignalsForCallRef.current !== activeCall.id) {
          bootstrappedSignalsForCallRef.current = activeCall.id;
          await syncPersistedSignals();
        }

        await sendReadySignal();
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setMediaError(describeCallMediaError(error, activeCall.callType));
      }
    };

    void bootstrapLiveCall();

    return () => {
      isCancelled = true;
    };
  }, [
    activeCall,
    currentParticipant?.status,
    ensureLocalMedia,
    ensurePeerConnection,
    sendReadySignal,
    syncPersistedSignals,
  ]);

  useEffect(() => {
    const localVideo = localVideoRef.current;

    if (!localVideo) {
      return;
    }

    localVideo.srcObject = localStream;

    if (localStream) {
      const playback = localVideo.play();
      if (playback && typeof playback.catch === "function") {
        void playback.catch(() => undefined);
      }
    }
  }, [localStream]);

  useEffect(() => {
    const remoteVideo = remoteVideoRef.current;
    const remoteAudio = remoteAudioRef.current;

    if (remoteVideo) {
      remoteVideo.srcObject = remoteStream;

      if (remoteStream) {
        const playback = remoteVideo.play();
        if (playback && typeof playback.catch === "function") {
          void playback.catch(() => undefined);
        }
      }
    }

    if (remoteAudio) {
      remoteAudio.srcObject = remoteStream;

      if (remoteStream) {
        const playback = remoteAudio.play();
        if (playback && typeof playback.catch === "function") {
          void playback.catch(() => undefined);
        }
      }
    }
  }, [remoteStream]);

  useEffect(() => {
    return () => {
      cleanupPeerConnection();
    };
  }, [cleanupPeerConnection]);

  const runCallAction = useCallback(
    async (
      actionKey: PendingCallAction,
      runner: () => Promise<CommunicationActionState>,
      options?: {
        cleanupOnFailure?: boolean;
        cleanupOnSuccess?: boolean;
        refreshOnSuccess?: boolean;
      },
    ) => {
      setPendingAction(actionKey);

      try {
        const result = await runner();

        if (!result.ok) {
          if (options?.cleanupOnFailure) {
            cleanupPeerConnection();
          }

          setMediaError(result.error ?? "Unable to complete this call action.");
          toast.error(result.error ?? "Unable to complete this call action.");
          return;
        }

        setMediaError(null);
        toast.success(result.message ?? "Call updated.");

        if (options?.cleanupOnSuccess) {
          try {
            await sendSignal(SignalingEventType.HANGUP, {
              reason: actionKey,
            });
          } catch {
            // Best-effort extra signal; the DB-backed session event still closes the call.
          }

          cleanupPeerConnection();
        }

        if (options?.refreshOnSuccess ?? true) {
          router.refresh();
        }
      } finally {
        setPendingAction(null);
      }
    },
    [cleanupPeerConnection, router, sendSignal],
  );

  const handleStartCall = useCallback(
    async (callType: CallType) => {
      try {
        await ensureLocalMedia(callType);
      } catch (error) {
        const nextError = describeCallMediaError(error, callType);
        setMediaError(nextError);
        toast.error(nextError);
        cleanupPeerConnection();
        return;
      }

      await runCallAction(
        callType === CallType.VIDEO ? "start-video" : "start-audio",
        () => startCallAction(buildStartCallFormData(conversationId, callType)),
        {
          cleanupOnFailure: true,
        },
      );
    },
    [cleanupPeerConnection, conversationId, ensureLocalMedia, runCallAction],
  );

  const handleAcceptOrJoin = useCallback(
    async (action: "ACCEPT" | "JOIN") => {
      const liveCall = activeCallRef.current;

      if (!liveCall) {
        return;
      }

      try {
        await ensureLocalMedia(liveCall.callType);
      } catch (error) {
        const nextError = describeCallMediaError(error, liveCall.callType);
        setMediaError(nextError);
        toast.error(nextError);
        cleanupPeerConnection();
        return;
      }

      await runCallAction(
        action === "ACCEPT" ? "accept" : "join",
        () => updateCallParticipantAction(buildCallActionFormData(liveCall.id, action)),
        {
          cleanupOnFailure: true,
        },
      );
    },
    [cleanupPeerConnection, ensureLocalMedia, runCallAction],
  );

  const handleCloseCall = useCallback(
    async (actionKey: PendingCallAction, action: "DECLINE" | "LEAVE" | "END") => {
      const liveCall = activeCallRef.current;

      if (!liveCall) {
        return;
      }

      await runCallAction(
        actionKey,
        () => updateCallParticipantAction(buildCallActionFormData(liveCall.id, action)),
        {
          cleanupOnSuccess: true,
        },
      );
    },
    [runCallAction],
  );

  const toggleTrack = useCallback((kind: "audio" | "video") => {
    const stream = localStreamRef.current;
    const track =
      kind === "audio"
        ? stream?.getAudioTracks()[0]
        : stream?.getVideoTracks()[0];

    if (!track) {
      return;
    }

    track.enabled = !track.enabled;

    if (kind === "audio") {
      setIsMicEnabled(track.enabled);
    } else {
      setIsCameraEnabled(track.enabled);
    }
  }, []);

  const stateDescription = useMemo(
    () =>
      describeCallState({
        activeCall,
        currentUserId,
        pendingAction,
        mediaError,
        hasRemoteStream: Boolean(remoteStream?.getTracks().length),
        peerConnectionState,
      }),
    [activeCall, currentUserId, mediaError, peerConnectionState, pendingAction, remoteStream],
  );

  const previewVisible = Boolean(activeCall || localStream || remoteStream || mediaError);
  const isPending = pendingAction !== null;
  const isIncomingInvite =
    activeCall?.status === CallSessionStatus.RINGING &&
    currentParticipant?.status === CallParticipantStatus.INVITED;
  const isInitiator = activeCall?.initiatedById === currentUserId;
  const isActiveCall = activeCall?.status === CallSessionStatus.ACTIVE;

  if (disabledReason) {
    return (
      <div className="rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm text-muted">
        {disabledReason}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-[28px] border border-border bg-background/60 p-4 shadow-[0_16px_45px_-26px_rgba(15,23,42,0.35)]">
      <audio className="hidden" playsInline ref={remoteAudioRef} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">Live call workspace</p>
            <Badge variant={activeCall?.callType === CallType.VIDEO ? "secondary" : "outline"}>
              {activeCall?.callType === CallType.VIDEO ? "Video" : "Audio"}
              {activeCall ? " call" : " ready"}
            </Badge>
            {activeCall ? (
              <Badge
                variant={
                  activeCall.status === CallSessionStatus.ACTIVE
                    ? "success"
                    : activeCall.status === CallSessionStatus.RINGING
                      ? "secondary"
                      : "outline"
                }
              >
                {activeCall.status.toLowerCase()}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            {stateDescription}
          </p>
          {activeCall?.createdAt ? (
            <p className="mt-2 text-xs text-muted">
              Session opened {formatRelative(activeCall.createdAt)}
            </p>
          ) : null}
        </div>
        {peerConnectionState !== "idle" ? (
          <Badge variant={peerConnectionState === "connected" ? "success" : "outline"}>
            {peerConnectionState}
          </Badge>
        ) : null}
      </div>

      {previewVisible ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] border border-border bg-card/80 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Your media</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isMicEnabled ? "success" : "outline"}>
                  {isMicEnabled ? "Mic on" : "Mic muted"}
                </Badge>
                {(activeCall?.callType === CallType.VIDEO ||
                  Boolean(localStream?.getVideoTracks().length)) && (
                  <Badge variant={isCameraEnabled ? "secondary" : "outline"}>
                    {isCameraEnabled ? "Camera on" : "Camera off"}
                  </Badge>
                )}
              </div>
            </div>
            <div className="mt-3 overflow-hidden rounded-[20px] border border-border bg-background/70">
              {localStream?.getVideoTracks().length ? (
                <video
                  autoPlay
                  className="aspect-video w-full bg-slate-950 object-cover"
                  muted
                  playsInline
                  ref={localVideoRef}
                />
              ) : (
                <div className="grid aspect-video place-items-center px-6 text-center text-sm leading-6 text-muted">
                  {localStream
                    ? "Microphone is live. Camera preview will appear automatically for video calls."
                    : "No local media captured yet. Starting or joining a call will request permission first."}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-border bg-card/80 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {remoteParticipant?.user.name ?? "Other participant"}
              </p>
              <Badge
                variant={
                  remoteStream?.getTracks().length
                    ? "success"
                    : activeCall?.status === CallSessionStatus.RINGING
                      ? "secondary"
                      : "outline"
                }
              >
                {remoteStream?.getTracks().length ? "Live" : "Waiting"}
              </Badge>
            </div>
            <div className="mt-3 overflow-hidden rounded-[20px] border border-border bg-background/70">
              {activeCall?.callType === CallType.VIDEO && remoteStream ? (
                <video
                  autoPlay
                  className="aspect-video w-full bg-slate-950 object-cover"
                  playsInline
                  ref={remoteVideoRef}
                />
              ) : (
                <div className="grid aspect-video place-items-center px-6 text-center text-sm leading-6 text-muted">
                  {remoteStream
                    ? "Remote audio is connected. Keep this page open while the call is active."
                    : "Remote media will appear here the moment signaling finishes and the other participant joins."}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {mediaError ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{mediaError}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {activeCall ? (
          <>
            {isIncomingInvite ? (
              <>
                <Button
                  disabled={isPending}
                  onClick={() => {
                    void handleAcceptOrJoin("ACCEPT");
                  }}
                  type="button"
                >
                  {pendingAction === "accept" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {pendingAction === "accept" ? "Accepting..." : "Accept"}
                </Button>
                <Button
                  disabled={isPending}
                  onClick={() => {
                    void handleCloseCall("decline", "DECLINE");
                  }}
                  type="button"
                  variant="outline"
                >
                  {pendingAction === "decline" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                  {pendingAction === "decline" ? "Declining..." : "Decline"}
                </Button>
              </>
            ) : null}

            {activeCall.status === CallSessionStatus.RINGING && isInitiator ? (
              <Button
                disabled={isPending}
                onClick={() => {
                  void handleCloseCall("cancel", "END");
                }}
                type="button"
                variant="outline"
              >
                {pendingAction === "cancel" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <PhoneOff className="size-4" />
                )}
                {pendingAction === "cancel" ? "Cancelling..." : "Cancel call"}
              </Button>
            ) : null}

            {isActiveCall ? (
              <>
                {currentParticipant?.status !== CallParticipantStatus.JOINED ? (
                  <Button
                    disabled={isPending}
                    onClick={() => {
                      void handleAcceptOrJoin("JOIN");
                    }}
                    type="button"
                  >
                    {pendingAction === "join" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {pendingAction === "join" ? "Joining..." : "Join call"}
                  </Button>
                ) : (
                  <>
                    <Button
                      disabled={!localStream?.getAudioTracks().length}
                      onClick={() => toggleTrack("audio")}
                      type="button"
                      variant="outline"
                    >
                      {isMicEnabled ? (
                        <MicOff className="size-4" />
                      ) : (
                        <Mic className="size-4" />
                      )}
                      {isMicEnabled ? "Mute mic" : "Unmute mic"}
                    </Button>
                    {activeCall.callType === CallType.VIDEO ? (
                      <Button
                        disabled={!localStream?.getVideoTracks().length}
                        onClick={() => toggleTrack("video")}
                        type="button"
                        variant="outline"
                      >
                        {isCameraEnabled ? (
                          <VideoOff className="size-4" />
                        ) : (
                          <Video className="size-4" />
                        )}
                        {isCameraEnabled ? "Hide camera" : "Show camera"}
                      </Button>
                    ) : null}
                    <Button
                      disabled={isPending}
                      onClick={() => {
                        void handleCloseCall("leave", "LEAVE");
                      }}
                      type="button"
                      variant="outline"
                    >
                      {pendingAction === "leave" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <PhoneOff className="size-4" />
                      )}
                      {pendingAction === "leave" ? "Leaving..." : "Leave call"}
                    </Button>
                  </>
                )}
                <Button
                  disabled={isPending}
                  onClick={() => {
                    void handleCloseCall("end", "END");
                  }}
                  type="button"
                  variant="outline"
                >
                  {pendingAction === "end" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <PhoneOff className="size-4" />
                  )}
                  {pendingAction === "end" ? "Ending..." : "End for everyone"}
                </Button>
              </>
            ) : null}
          </>
        ) : (
          <>
            <Button
              disabled={isPending}
              onClick={() => {
                void handleStartCall(CallType.AUDIO);
              }}
              type="button"
            >
              {pendingAction === "start-audio" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Phone className="size-4" />
              )}
              {pendingAction === "start-audio" ? "Starting..." : "Voice call"}
            </Button>
            <Button
              className={cn("transition")}
              disabled={isPending}
              onClick={() => {
                void handleStartCall(CallType.VIDEO);
              }}
              type="button"
              variant="secondary"
            >
              {pendingAction === "start-video" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Video className="size-4" />
              )}
              {pendingAction === "start-video" ? "Starting..." : "Video call"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
