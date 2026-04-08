"use client";

const COMMUNICATION_SERVICE_WORKER_PATH = "/communication-sw.js";

let serviceWorkerRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null =
  null;

export function supportsBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function supportsServiceWorkerNotifications() {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

export async function registerCommunicationServiceWorker() {
  if (!supportsServiceWorkerNotifications()) {
    return null;
  }

  if (!serviceWorkerRegistrationPromise) {
    serviceWorkerRegistrationPromise = navigator.serviceWorker
      .register(COMMUNICATION_SERVICE_WORKER_PATH, {
        scope: "/",
      })
      .catch(() => null);
  }

  return serviceWorkerRegistrationPromise;
}

export async function ensureCommunicationNotificationPermission() {
  if (!supportsBrowserNotifications()) {
    return "unsupported" as const;
  }

  if (Notification.permission !== "default") {
    return Notification.permission;
  }

  await registerCommunicationServiceWorker();

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showCommunicationNotification(input: {
  title: string;
  body: string;
  url?: string | null;
  tag: string;
  requireInteraction?: boolean;
}) {
  if (!supportsBrowserNotifications() || Notification.permission !== "granted") {
    return false;
  }

  const options: NotificationOptions & { renotify?: boolean } = {
    body: input.body,
    tag: input.tag,
    data: {
      url: input.url,
    },
    badge: "/favicon.ico",
    icon: "/favicon.ico",
    renotify: true,
    requireInteraction: input.requireInteraction ?? false,
  };

  const registration = await registerCommunicationServiceWorker();

  if (registration && "showNotification" in registration) {
    await registration.showNotification(input.title, options);
    return true;
  }

  const notification = new Notification(input.title, options);
  notification.onclick = () => {
    notification.close();
    window.focus();

    if (input.url) {
      window.location.assign(input.url);
    }
  };

  return true;
}
