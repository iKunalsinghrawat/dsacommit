import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ensureCommunicationNotificationPermission,
  registerCommunicationServiceWorker,
  showCommunicationNotification,
} from "@/lib/browser-notifications";

describe("browser notifications", () => {
  const requestPermission = vi.fn();
  const showNotification = vi.fn();
  const register = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("Notification", class NotificationMock {
      static permission: NotificationPermission = "default";
      static requestPermission = requestPermission;
      onclick: (() => void) | null = null;

      constructor(public title: string) {}

      close() {}
    } as unknown as typeof Notification);

    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: {
        register,
      },
    });

    requestPermission.mockReset();
    showNotification.mockReset();
    register.mockReset();
    register.mockResolvedValue({
      showNotification,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests notification permission and registers the service worker", async () => {
    requestPermission.mockResolvedValue("granted");

    const permission = await ensureCommunicationNotificationPermission();

    expect(permission).toBe("granted");
    expect(register).toHaveBeenCalled();
    expect(requestPermission).toHaveBeenCalled();
  });

  it("uses the service worker notification bridge when permission is granted", async () => {
    Object.defineProperty(Notification, "permission", {
      configurable: true,
      value: "granted",
    });

    await registerCommunicationServiceWorker();
    const shown = await showCommunicationNotification({
      title: "Incoming Call",
      body: "A mentor is calling you",
      url: "/messages/conversation-1",
      tag: "call-1",
      requireInteraction: true,
    });

    expect(shown).toBe(true);
    expect(showNotification).toHaveBeenCalledWith(
      "Incoming Call",
      expect.objectContaining({
        body: "A mentor is calling you",
        tag: "call-1",
        requireInteraction: true,
      }),
    );
  });
});
