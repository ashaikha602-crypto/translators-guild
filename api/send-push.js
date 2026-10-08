// send-push: called by the database each time a notification row is
// added. The database sends everything needed in the request (the
// recipient's devices, who acted, and a line of context), so this
// function holds no database key. It only needs the push keys, kept in
// Vercel's environment variables: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and
// PUSH_HOOK_SECRET.
const webpush = require("web-push");

const SUPABASE_URL = "https://bldqausimrsusdzfbubk.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_kyHEHTc00jWi5wN2nyiD0w_NtLbVHy_";

const SAYS = {
  like: "liked your post",
  comment: "commented on your post",
  reply: "replied to you",
  follow: "followed you",
  repost: "reposted your post",
  message: "sent you a message",
};

const clip = (t, n) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  if (!process.env.PUSH_HOOK_SECRET ||
      req.headers["x-push-secret"] !== process.env.PUSH_HOOK_SECRET) {
    return res.status(401).end();
  }
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const subs = Array.isArray(b.subs) ? b.subs : [];
  if (!subs.length) return res.status(200).json({ sent: 0 });

  const name = b.actor_name || "A member";
  const who = b.actor_title && b.actor_title !== "Other" ? b.actor_title + " " + name : name;
  // Message text is never put on the lock screen.
  const about = b.kind === "message" ? "" : (b.about || "").trim();
  const payload = JSON.stringify({
    title: who,
    body: (SAYS[b.kind] || "sent you a notification") + (about ? ": " + clip(about, 90) : ""),
    tag: [b.kind, b.actor_id || "", b.post_id || ""].join(":"),
    url: "/?open=notifications",
  });

  webpush.setVapidDetails("https://translators-guild.vercel.app",
    process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload, { TTL: 60 * 60 * 24 });
      sent++;
    } catch (e) {
      // The push service no longer knows this device (the app was removed
      // or permission was taken back), so the database forgets it too.
      if (e.statusCode === 404 || e.statusCode === 410) {
        await fetch(SUPABASE_URL + "/rest/v1/rpc/prune_push_subscription", {
          method: "POST",
          headers: { apikey: SUPABASE_PUBLIC_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ p_endpoint: s.endpoint, p_secret: process.env.PUSH_HOOK_SECRET }),
        }).catch(() => {});
      }
    }
  }));
  res.status(200).json({ sent });
};
