/* Guild Translators: the background worker.
   It does one job: when the phone is locked or the app is closed, it
   receives a push from the server and shows it as a notification. It
   does not cache pages or intercept requests, so the site loads exactly
   as it does without it. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Guild Translators";
  const options = {
    body: data.body || "You have a new notification.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    /* One notification per tag: four likes on the same post replace each
       other instead of stacking four banners. */
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || "/?open=notifications" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/* A tap opens the app on the notifications screen. If the app is already
   open in a window, that window is brought forward and told where to go
   rather than opening a second copy. */
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/?open=notifications";
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).origin === self.location.origin) {
        await w.focus();
        w.postMessage({ open: "notifications" });
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
