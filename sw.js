/* Guild service worker: shows phone and computer notifications and opens
   the right screen when one is tapped. It does not cache pages, so the
   site always loads fresh. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil((async () => {
    /* the same like or follow twice replaces the first instead of stacking */
    if (d.tag && self.registration.getNotifications) {
      try { (await self.registration.getNotifications({ tag: d.tag })).forEach(n => n.close()); } catch (_) {}
    }
    /* Guild open on screen: show it inside the site as well, since the
       phone keeps its own banner quiet for the app in front */
    try {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      wins.forEach(w => { if (w.visibilityState === "visible") w.postMessage({ toast: d }); });
    } catch (_) {}
    await self.registration.showNotification(d.title || "Guild", {
      body: d.body || "You have a new notification",
      icon: "/icons/icon-192.png?v=4",
      badge: "/icons/badge-96.png",
      tag: d.tag || undefined,
      renotify: !!d.tag,
      timestamp: Date.now(),
      data: { url: d.url || "/#go=notifs" }
    });
    if (d.badge && self.navigator && self.navigator.setAppBadge) {
      try { await self.navigator.setAppBadge(d.badge); } catch (_) {}
    }
  })());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).origin === self.location.origin) {
        await w.focus();
        w.postMessage({ go: new URL(url, self.location.origin).hash });
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
