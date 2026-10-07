// send-push: called by the database each time a notification row is
// added. It looks up who did what, then sends a push to every device the
// recipient has turned notifications on for. Devices the push service no
// longer knows (the app was deleted, permission was revoked) are removed.
//
// Secrets (Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// PUSH_HOOK_SECRET. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// provided by Supabase automatically.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SAYS: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  reply: "replied to you",
  follow: "followed you",
  repost: "reposted your post",
  message: "sent you a message",
};

const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

Deno.serve(async (req) => {
  if (req.headers.get("x-push-secret") !== Deno.env.get("PUSH_HOOK_SECRET")) {
    return new Response("unauthorized", { status: 401 });
  }
  const { record: n } = await req.json().catch(() => ({ record: null }));
  if (!n || !n.user_id || n.user_id === n.actor_id) return new Response("skip");

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: subs } = await db.from("push_subscriptions")
    .select("id,endpoint,p256dh,auth").eq("user_id", n.user_id);
  if (!subs || !subs.length) return new Response("no devices");

  const { data: actor } = await db.from("profiles")
    .select("display_name,title").eq("id", n.actor_id).maybeSingle();
  const name = actor?.display_name || "A member";
  const who = actor?.title && actor.title !== "Other" ? actor.title + " " + name : name;

  // A short line of context: the comment, or the post it is about.
  // Message text is never put on the lock screen.
  let about = "";
  try {
    if (n.comment_id && (n.kind === "comment" || n.kind === "reply")) {
      const { data: c } = await db.from("comments").select("content").eq("id", n.comment_id).maybeSingle();
      about = c?.content || "";
    }
    if (!about && n.post_id && n.kind !== "message") {
      const { data: p } = await db.from("posts").select("title,content").eq("id", n.post_id).maybeSingle();
      about = p?.title || p?.content || "";
    }
  } catch (_) { /* context is optional */ }

  const payload = JSON.stringify({
    title: who,
    body: (SAYS[n.kind] || "sent you a notification") + (about ? ": " + clip(about, 90) : ""),
    tag: n.kind + ":" + (n.actor_id || "") + ":" + (n.post_id || ""),
    url: "/?open=notifications",
  });

  webpush.setVapidDetails("https://translators-guild.vercel.app",
    Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload, { TTL: 60 * 60 * 24 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
    }
  }));
  return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
});
