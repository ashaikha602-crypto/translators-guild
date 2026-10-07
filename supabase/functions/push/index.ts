// ═══════════ PUSH ═══════════
// Sends a phone or computer notification for each new row in
// public.notifications. No libraries: the encryption (RFC 8291) and the
// signed server identity (VAPID, RFC 8292) are done with the Web Crypto
// that Deno already has, so this file can be pasted into the Supabase
// dashboard as it is.
//
//   GET  /functions/v1/push  -> { publicKey }   (makes the keys the first time)
//   POST /functions/v1/push  -> called by the database trigger in push.sql
//
// Deploy with "Verify JWT" turned OFF: the database proves itself with
// the secret in push_config, and GET only ever returns a public key.

const SITE = "https://translators-guild-web.vercel.app";
const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  (() => { try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default; } catch { return ""; } })();

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const db = (path: string, init: RequestInit = {}) =>
  fetch(URL_ + "/rest/v1/" + path, {
    ...init,
    headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", ...(init.headers || {}) },
  });

// ── bytes ──
const enc = new TextEncoder();
const cat = (...a: Uint8Array[]) => {
  const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0));
  let o = 0; for (const x of a) { out.set(x, o); o += x.length; }
  return out;
};
export const b64u = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const unb64u = (s: string) => {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(t + "===".slice((t.length + 3) % 4)), (c) => c.charCodeAt(0));
};
const hmac = async (key: Uint8Array, data: Uint8Array) =>
  new Uint8Array(await crypto.subtle.sign("HMAC",
    await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), data));

// ── keys ──
type Keys = { publicKey: string; jwk: JsonWebKey };
let cached: { keys: Keys; secret: string } | null = null;

async function config(): Promise<{ keys: Keys; secret: string }> {
  if (cached) return cached;
  const r = await db("push_config?id=eq.1&select=vapid_public,vapid_private,hook_secret");
  const row = (await r.json())[0];
  if (!row) throw new Error("push_config is empty: run push.sql");
  if (row.vapid_public && row.vapid_private) {
    cached = { keys: { publicKey: row.vapid_public, jwk: row.vapid_private }, secret: row.hook_secret };
    return cached;
  }
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  const publicKey = b64u(raw);
  // only fill an empty row, so two first calls cannot end up with two key pairs
  await db("push_config?id=eq.1&vapid_public=is.null", {
    method: "PATCH", body: JSON.stringify({ vapid_public: publicKey, vapid_private: jwk }),
  });
  cached = null;
  const again = (await (await db("push_config?id=eq.1&select=vapid_public,vapid_private,hook_secret")).json())[0];
  cached = { keys: { publicKey: again.vapid_public, jwk: again.vapid_private }, secret: again.hook_secret };
  return cached;
}

// ── VAPID: a short signed note saying who is sending ──
export async function vapidHeader(endpoint: string, keys: Keys) {
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SITE })));
  const key = await crypto.subtle.importKey("jwk", { ...keys.jwk, key_ops: ["sign"] },
    { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(head + "." + body)));
  return "vapid t=" + head + "." + body + "." + b64u(sig) + ", k=" + keys.publicKey;
}

// ── RFC 8291 aes128gcm: only the device can read the message ──
export async function encrypt(payload: Uint8Array, p256dh: string, authSecret: string) {
  const uaPublic = unb64u(p256dh);
  const auth = unb64u(authSecret);
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));
  const prkKey = await hmac(auth, shared);
  const ikm = await hmac(prkKey, cat(enc.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, cat(payload, new Uint8Array([2]))));
  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = 65;
  return cat(header, asPublic, sealed);
}

// ── the words on the notification ──
const clean = (s: string | null) => (s || "")
  .replace(/^↩ Replied to your story(?: \[s:[^\]]*\])?(?: \([^)]*\))?:? ?/, "Replied to your story: ")
  .replace(/^(\S+) Reacted to your story.*$/, "Reacted $1 to your story")
  .replace(/⁣p:[A-Za-z0-9-]+⁣/g, "").replace(/\s+/g, " ").trim();
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export function word(p: Record<string, any>) {
  const name = p.title && p.title !== "Other" ? p.title + " " + p.name : p.name;
  const post = p.post ? " “" + cut(clean(p.post), 60) + "”" : "";
  const text = cut(clean(p.text), 160);
  const to = (path: string) => SITE + "/" + path;
  switch (p.kind) {
    case "message":
      return { title: name, body: "💬 " + (text || "Sent you a message"), url: to("#go=chat:" + p.actor_id), tag: "msg-" + p.actor_id };
    case "like":
      return { title: "New like", body: "❤️ " + name + " liked your post" + post, url: to("#go=post:" + p.post_id), tag: "like-" + p.post_id };
    case "comment":
      return { title: "New comment", body: "💭 " + name + (text ? ": “" + text + "”" : " commented on your post" + post), url: to("#go=post:" + p.post_id) };
    case "reply":
      return { title: "New reply", body: "↩️ " + name + (text ? " replied: “" + text + "”" : " replied to you"), url: to("#go=post:" + p.post_id) };
    case "follow":
      return { title: "New follower", body: "👤 " + name + " started following you", url: to("#go=member:" + p.actor_id), tag: "follow-" + p.actor_id };
    case "repost":
      return { title: "New repost", body: "🔁 " + name + " reposted your post" + post, url: to("#go=post:" + p.post_id) };
    default:
      return { title: "Guild", body: name + " interacted with you", url: to("#go=notifs") };
  }
}

async function send(sub: { endpoint: string; p256dh: string; auth: string }, msg: unknown, keys: Keys) {
  const body = await encrypt(enc.encode(JSON.stringify(msg)), sub.p256dh, sub.auth);
  const r = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidHeader(sub.endpoint, keys),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high",
    },
    body,
  });
  // the device unsubscribed or the app was removed: forget it
  if (r.status === 404 || r.status === 410) {
    await db("push_subscriptions?endpoint=eq." + encodeURIComponent(sub.endpoint), { method: "DELETE" });
  }
  return r.status;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const cfg = await config();
    if (req.method === "GET") return json({ publicKey: cfg.keys.publicKey });
    if (req.method !== "POST") return json({ error: "method" }, 405);
    if (req.headers.get("x-hook-secret") !== cfg.secret) return json({ error: "forbidden" }, 403);

    const { record } = await req.json();
    const r = await db("rpc/push_payload", { method: "POST", body: JSON.stringify({ n: record }) });
    const p = await r.json();
    if (!p || !p.subs || !p.subs.length) return json({ sent: 0 });

    const msg = { ...word(p), badge: Number(p.unread) || 0 };
    const results = await Promise.all(p.subs.map((s: any) => send(s, msg, cfg.keys).catch(() => 0)));
    return json({ sent: results.filter((s) => s >= 200 && s < 300).length, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
