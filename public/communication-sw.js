self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  const targetUrl = event.notification?.data?.url || "/";

  event.notification.close();

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url === targetUrl || client.url.startsWith(targetUrl)) {
            await client.focus();
            return;
          }
        }
      }

      const fallbackClient = clientList.find((client) => "focus" in client);

      if (fallbackClient) {
        if ("navigate" in fallbackClient) {
          await fallbackClient.navigate(targetUrl);
        }
        await fallbackClient.focus();
        return;
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
