"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Check, Loader2, PhoneIncoming, Video } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import type {
  CommunicationRealtimeCall,
  CommunicationRealtimeEvent,
} from "@/lib/communication-realtime";
import {
  ensureCommunicationNotificationPermission,
  registerCommunicationServiceWorker,
  showCommunicationNotification,
  supportsBrowserNotifications,
} from "@/lib/browser-notifications";
import { isCommunicationRealtimeEvent } from "@/lib/communication-realtime";
import { updateCallParticipantAction } from "@/lib/actions/communication-actions";
import {
  describeCallMediaError,
  requestCallMediaStream,
  stopMediaStream,
} from "@/components/communication/call-browser";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CommunicationRealtimeContextValue = {
  incomingCall: CommunicationRealtimeCall | null;
  isConnected: boolean;
  unreadNotificationCount: number;
  subscribe: (listener: (event: CommunicationRealtimeEvent) => void) => () => void;
};

const CommunicationRealtimeContext =
  createContext<CommunicationRealtimeContextValue | null>(null);

function useRingtone() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const playTone = useCallback((frequency: number, duration = 0.22) => {
    const context = audioContextRef.current;

    if (!context || context.state !== "running") {
      return;
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;
    gainNode.gain.value = 0.0001;
    gainNode.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, []);

  const unlock = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    const AudioContextCtor =
      window.AudioContext ??
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    audioContextRef.current ??= new AudioContextCtor();

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume().catch(() => undefined);
    }

    setIsUnlocked(audioContextRef.current.state === "running");
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    timeoutRefs.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutRefs.current = [];
  }, []);

  const start = useCallback(() => {
    if (!isUnlocked || intervalRef.current) {
      return;
    }

    playTone(880, 0.2);
    timeoutRefs.current.push(window.setTimeout(() => playTone(660, 0.18), 180));
    intervalRef.current = window.setInterval(() => {
      playTone(880, 0.2);
      timeoutRefs.current.push(window.setTimeout(() => playTone(660, 0.18), 180));
    }, 1500);
  }, [isUnlocked, playTone]);

  useEffect(() => {
    const handleUnlock = () => {
      void unlock();
    };

    window.addEventListener("pointerdown", handleUnlock, { passive: true });
    window.addEventListener("keydown", handleUnlock, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handleUnlock);
      window.removeEventListener("keydown", handleUnlock);
      stop();
    };
  }, [stop, unlock]);

  return {
    isUnlocked,
    start,
    stop,
    unlock,
  };
}

function IncomingCallPanel({
  call,
  isAudioUnlocked,
  onAccept,
  onDecline,
  isPending,
}: {
  call: CommunicationRealtimeCall;
  isAudioUnlocked: boolean;
  onAccept: () => void;
  onDecline: () => void;
  isPending: boolean;
}) {
  const caller = call.initiatedBy;

  return (
    <div className="fixed right-4 bottom-4 z-[80] w-[min(92vw,24rem)] rounded-[28px] border border-border/80 bg-background/95 p-5 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.7)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Incoming call</Badge>
            <Badge variant={call.callType === "VIDEO" ? "outline" : "secondary"}>
              {call.callType === "VIDEO" ? "Video" : "Audio"}
            </Badge>
          </div>
          <h3 className="mt-3 text-lg font-semibold">{caller.name}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            {caller.headline ?? "Wants to connect right now."}
          </p>
        </div>
        {call.callType === "VIDEO" ? (
          <Video className="mt-1 size-5 text-primary" />
        ) : (
          <PhoneIncoming className="mt-1 size-5 text-primary" />
        )}
      </div>
      <p className="mt-4 text-xs leading-6 text-muted">
        {isAudioUnlocked
          ? "Ringtone is active until you accept, decline, or the call ends."
          : "Browser audio is still locked. Tap anywhere once to enable ringtone next time."}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={isPending} onClick={onAccept} type="button">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Accept
        </Button>
        <Button disabled={isPending} onClick={onDecline} type="button" variant="outline">
          Decline
        </Button>
      </div>
    </div>
  );
}

export function CommunicationRealtimeProvider({
  children,
  currentUserId,
  initialIncomingCall,
  initialUnreadNotificationCount,
  isEnabled,
}: {
  children: ReactNode;
  currentUserId: string;
  initialIncomingCall: CommunicationRealtimeCall | null;
  initialUnreadNotificationCount: number;
  isEnabled: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const listenersRef = useRef(new Set<(event: CommunicationRealtimeEvent) => void>());
  const seenEventIdsRef = useRef(new Set<string>());
  const refreshTimeoutRef = useRef<number | null>(null);
  const incomingCallRef = useRef<CommunicationRealtimeCall | null>(initialIncomingCall);
  const [incomingCall, setIncomingCall] = useState<CommunicationRealtimeCall | null>(
    initialIncomingCall,
  );
  const [isConnected, setIsConnected] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(
    initialUnreadNotificationCount,
  );
  const [isCallActionPending, startCallActionTransition] = useTransition();
  const notificationPermissionRequestedRef = useRef(false);
  const incomingCallTimeoutRef = useRef<number | null>(null);
  const {
    isUnlocked: isRingtoneUnlocked,
    start: startRingtone,
    stop: stopRingtone,
  } = useRingtone();

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  const subscribe = useCallback((listener: (event: CommunicationRealtimeEvent) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const maybeRequestNotificationPermission = useCallback(() => {
    if (
      notificationPermissionRequestedRef.current ||
      !supportsBrowserNotifications() ||
      Notification.permission !== "default" ||
      (!pathname.startsWith("/messages") &&
        !pathname.startsWith("/groups") &&
        !pathname.startsWith("/connections"))
    ) {
      return;
    }

    notificationPermissionRequestedRef.current = true;
    void ensureCommunicationNotificationPermission();
  }, [pathname]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = window.setTimeout(() => {
      router.refresh();
      refreshTimeoutRef.current = null;
    }, 120);
  }, [router]);

  const emitEvent = useCallback((event: CommunicationRealtimeEvent) => {
    listenersRef.current.forEach((listener) => listener(event));
  }, []);

  const showSystemNotification = useCallback(
    async (input: {
      title: string;
      body: string;
      url?: string | null;
      tag: string;
      requireInteraction?: boolean;
    }) => {
      if (
        typeof document === "undefined" ||
        !supportsBrowserNotifications() ||
        (document.visibilityState === "visible" && document.hasFocus())
      ) {
        return;
      }

      if (Notification.permission === "default") {
        await ensureCommunicationNotificationPermission();
      }

      if (Notification.permission !== "granted") {
        return;
      }

      await showCommunicationNotification(input);
    },
    [],
  );

  const handleRealtimeEvent = useCallback((event: CommunicationRealtimeEvent) => {
    if (seenEventIdsRef.current.has(event.id)) {
      return;
    }

    seenEventIdsRef.current.add(event.id);
    emitEvent(event);

    switch (event.type) {
      case "notification:new": {
        const notification = event.payload?.notification;
        if (notification && !notification.isRead) {
          setUnreadNotificationCount((current) => current + 1);
          void showSystemNotification({
            title: notification.title,
            body: notification.body,
            url: notification.actionUrl,
            tag: `notification-${notification.id}`,
            requireInteraction: notification.type === "INCOMING_CALL",
          });
        }
        break;
      }
      case "notification:read": {
        setUnreadNotificationCount((current) => Math.max(0, current - 1));
        break;
      }
      case "call:incoming": {
        if (event.payload?.call) {
          setIncomingCall(event.payload.call);
          startRingtone();
          toast.info(
            `${event.payload.call.initiatedBy.name} is calling you.`,
          );
        }
        break;
      }
      case "call:accepted":
      case "call:declined":
      case "call:ended":
      case "call:missed": {
        const eventCall = event.payload?.call;
        if (
          incomingCallRef.current &&
          (!eventCall || incomingCallRef.current.id === eventCall.id)
        ) {
          setIncomingCall(null);
        }
        stopRingtone();

        if (event.type === "call:accepted") {
          toast.success("Call connected.");
        } else if (event.type === "call:declined") {
          toast.error("The call was declined.");
        } else if (event.type === "call:missed") {
          toast.error("The call was missed.");
        } else {
          toast.message("Call ended.");
        }
        break;
      }
      case "message:new": {
        const message = event.payload?.message;
        if (
          message &&
          pathname !== `/messages/${message.conversationId}` &&
          message.senderId &&
          message.senderId !== currentUserId
        ) {
          toast.message(`${message.sender.name}: ${message.content.slice(0, 72)}`);
        }
        break;
      }
      default:
        break;
    }

    if (
      pathname.startsWith("/messages") ||
      pathname.startsWith("/groups/")
    ) {
      if (
        event.type === "message:new" ||
        event.type === "conversation:update" ||
        event.type === "notification:new" ||
        event.type === "notification:read"
      ) {
        scheduleRefresh();
      }
    }
  }, [currentUserId, emitEvent, pathname, scheduleRefresh, showSystemNotification, startRingtone, stopRingtone]);

  useEffect(() => {
    if (!incomingCall) {
      stopRingtone();
      if (incomingCallTimeoutRef.current) {
        window.clearTimeout(incomingCallTimeoutRef.current);
        incomingCallTimeoutRef.current = null;
      }
      return;
    }

    startRingtone();
    incomingCallTimeoutRef.current = window.setTimeout(() => {
      const activeIncomingCall = incomingCallRef.current;

      if (!activeIncomingCall) {
        return;
      }

      startCallActionTransition(async () => {
        const formData = new FormData();
        formData.set("callSessionId", activeIncomingCall.id);
        formData.set("action", "MISS");
        await updateCallParticipantAction(formData);
        stopRingtone();
        setIncomingCall(null);
      });
    }, 30000);

    return () => {
      if (incomingCallTimeoutRef.current) {
        window.clearTimeout(incomingCallTimeoutRef.current);
        incomingCallTimeoutRef.current = null;
      }
    };
  }, [incomingCall, startCallActionTransition, startRingtone, stopRingtone]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    void registerCommunicationServiceWorker();

    const handleWarmPermissions = () => {
      maybeRequestNotificationPermission();
    };

    window.addEventListener("pointerdown", handleWarmPermissions, { passive: true });
    window.addEventListener("keydown", handleWarmPermissions, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handleWarmPermissions);
      window.removeEventListener("keydown", handleWarmPermissions);
    };
  }, [isEnabled, maybeRequestNotificationPermission]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const eventSource = new EventSource("/api/realtime/communication");

    const handleMessage = (rawEvent: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(rawEvent.data) as unknown;

        if (!isCommunicationRealtimeEvent(parsed)) {
          return;
        }

        setIsConnected(true);
        handleRealtimeEvent(parsed);
      } catch (error) {
        console.error("Unable to parse communication realtime event.", error);
      }
    };

    const handleError = () => {
      setIsConnected(false);
    };

    eventSource.addEventListener("communication", handleMessage as EventListener);
    eventSource.onerror = handleError;

    return () => {
      eventSource.removeEventListener("communication", handleMessage as EventListener);
      eventSource.close();
      setIsConnected(false);
      stopRingtone();

      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [handleRealtimeEvent, isEnabled, stopRingtone]);

  const handleIncomingCallAction = useCallback((action: "ACCEPT" | "DECLINE") => {
    const activeIncomingCall = incomingCallRef.current;

    if (!activeIncomingCall) {
      return;
    }

    startCallActionTransition(async () => {
      if (action === "ACCEPT") {
        try {
          const previewStream = await requestCallMediaStream(activeIncomingCall.callType);
          stopMediaStream(previewStream);
        } catch (error) {
          const message = describeCallMediaError(error, activeIncomingCall.callType);
          toast.error(message);
          return;
        }
      }

      const formData = new FormData();
      formData.set("callSessionId", activeIncomingCall.id);
      formData.set("action", action);
      const result = await updateCallParticipantAction(formData);

      if (!result.ok) {
        toast.error(result.error ?? "Unable to update the call.");
        return;
      }

      stopRingtone();
      setIncomingCall(null);
      toast.success(result.message ?? "Call updated.");

      if (action === "ACCEPT") {
        router.push(`/messages/${activeIncomingCall.conversationId}`);
      }
    });
  }, [router, stopRingtone]);

  return (
    <CommunicationRealtimeContext.Provider
      value={{
        incomingCall,
        isConnected,
        unreadNotificationCount,
        subscribe,
      }}
    >
      {children}
      {incomingCall ? (
        <IncomingCallPanel
          call={incomingCall}
          isAudioUnlocked={isRingtoneUnlocked}
          isPending={isCallActionPending}
          onAccept={() => handleIncomingCallAction("ACCEPT")}
          onDecline={() => handleIncomingCallAction("DECLINE")}
        />
      ) : null}
    </CommunicationRealtimeContext.Provider>
  );
}

export function useCommunicationRealtime() {
  const context = useContext(CommunicationRealtimeContext);

  if (!context) {
    throw new Error("useCommunicationRealtime must be used within CommunicationRealtimeProvider.");
  }

  return context;
}

export function useCommunicationRealtimeSubscription(
  listener: (event: CommunicationRealtimeEvent) => void,
) {
  const { subscribe } = useCommunicationRealtime();

  useEffect(() => subscribe(listener), [listener, subscribe]);
}
