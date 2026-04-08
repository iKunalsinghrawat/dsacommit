"use client";

import { CallType } from "@/generated/prisma/enums";

const DEFAULT_STUN_URLS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
];

function parseEnvUrls(value?: string) {
  return value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function supportsCallMedia() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

export function getCallMediaConstraints(callType: CallType): MediaStreamConstraints {
  const audio: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  if (callType === CallType.VIDEO) {
    return {
      audio,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };
  }

  return {
    audio,
    video: false,
  };
}

export async function requestCallMediaStream(callType: CallType) {
  if (!supportsCallMedia()) {
    throw new Error("Media devices are unavailable in this browser.");
  }

  return navigator.mediaDevices.getUserMedia(getCallMediaConstraints(callType));
}

export async function primeCallMediaPermissions(callType: CallType) {
  const stream = await requestCallMediaStream(callType);
  stopMediaStream(stream);
}

export function stopMediaStream(stream?: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function describeCallMediaError(error: unknown, callType: CallType) {
  const message =
    error instanceof DOMException || error instanceof Error ? error.message : "";
  const name =
    error instanceof DOMException || error instanceof Error ? error.name : "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return callType === CallType.VIDEO
      ? "Camera or microphone permission denied."
      : "Microphone permission denied.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return callType === CallType.VIDEO
      ? "No usable camera or microphone was found."
      : "No usable microphone was found.";
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return callType === CallType.VIDEO
      ? "Camera or microphone is already in use by another app."
      : "Microphone is already in use by another app.";
  }

  if (name === "OverconstrainedError") {
    return "This device cannot satisfy the requested media constraints.";
  }

  if (name === "SecurityError") {
    return "Media permissions require a secure HTTPS connection.";
  }

  if (message) {
    return message;
  }

  return callType === CallType.VIDEO
    ? "Unable to access camera and microphone right now."
    : "Unable to access microphone right now.";
}

export function getWebRtcConfiguration(): RTCConfiguration {
  const stunUrls =
    parseEnvUrls(process.env.NEXT_PUBLIC_WEBRTC_STUN_URLS) ??
    DEFAULT_STUN_URLS;

  const turnUrl = process.env.NEXT_PUBLIC_WEBRTC_TURN_URL?.trim();
  const turnUsername = process.env.NEXT_PUBLIC_WEBRTC_TURN_USERNAME?.trim();
  const turnCredential = process.env.NEXT_PUBLIC_WEBRTC_TURN_CREDENTIAL?.trim();

  const iceServers: RTCIceServer[] = [
    {
      urls: stunUrls,
    },
  ];

  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
  };
}
