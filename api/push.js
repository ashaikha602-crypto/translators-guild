/* ═══════════ PUSH ═══════════
   Sends a phone or computer notification for each new row in
   public.notifications. Runs on Vercel with the site, so nothing has to
   be deployed anywhere else. No libraries: the encryption (RFC 8291) and
   the signed server identity (VAPID, RFC 8292) use Web Crypto.

     GET  /api/push  -> { publicKey }   (makes the key pair the first time)
     POST /api/push  -> called by the database trigger in supabase/push.sql

   It holds no secret of its own. The database sends its secret with
   each request, and every read goes through a function that checks it. */
const SITE = "https://translators-guild-web.vercel.app";
const SB = "https://bldqausimrsusdzfbubk.supabase.co";
const ANON = "sb_publishable_kyHEHTc00jWi5wN2nyiD0w_NtLbVHy_";
const subtle = globalThis.crypto.subtle;

const rpc = async (fn, args) => {
  const r = await fetch(SB + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: { apikey: ANON, Authorization: "Bearer " + ANON, "Content-Type": "application/json" },
    body: JSON.stringify(args || {}),
  });
  if (!r.ok) throw new Error(fn + " " + r.status + " " + (await r.text()));
  const t = await r.text();
  return t ? JSON.parse(t) : null;
};

const enc = new TextEncoder();
const cat = (...a) => {
  const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0));
  let o = 0; for (const x of a) { out.set(x, o); o += x.length; }
  return out;
};
const b64u = b => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = s => new Uint8Array(Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64"));
const hmac = async (key, data) =>
  new Uint8Array(await subtle.sign("HMAC", await subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), data));

async function publicKey() {
  const have = await rpc("push_public_key");
  if (have) return have;
  const kp = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await subtle.exportKey("jwk", kp.privateKey);
  const pub = b64u(new Uint8Array(await subtle.exportKey("raw", kp.publicKey)));
  // stored only if the row is still empty; whatever is stored wins
  return await rpc("push_init_keys", { p_public: pub, p_private: jwk });
}

async function vapid(endpoint, pub, jwk) {
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SITE })));
  const key = await subtle.importKey("jwk", { ...jwk, key_ops: ["sign"] }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(head + "." + body)));
  return "vapid t=" + head + "." + body + "." + b64u(sig) + ", k=" + pub;
}

async function encrypt(payload, p256dh, authSecret) {
  const uaPublic = unb64u(p256dh), auth = unb64u(authSecret);
  const local = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await subtle.exportKey("raw", local.publicKey));
  const uaKey = await subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));
  const ikm = await hmac(await hmac(auth, shared), cat(enc.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1])));
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const aes = await subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const sealed = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, cat(payload, new Uint8Array([2]))));
  const header = new Uint8Array(21);
  header.set(salt, 0); new DataView(header.buffer).setUint32(16, 4096); header[20] = 65;
  return cat(header, asPublic, sealed);
}

const clean = s => (s || "")
  .replace(/^↩ Replied to your story(?: \[s:[^\]]*\])?(?: \([^)]*\))?:? ?/, "Replied to your story: ")
  .replace(/^(\S+) Reacted to your story.*$/, "Reacted $1 to your story")
  .replace(/⁣p:[A-Za-z0-9-]+⁣/g, "").replace(/\s+/g, " ").trim();
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

function word(p) {
  const name = p.title && p.title !== "Other" ? p.title + " " + p.name : p.name;
  const post = p.post ? " “" + cut(clean(p.post), 60) + "”" : "";
  const text = cut(clean(p.text), 160);
  const to = h => SITE + "/#go=" + h;
  switch (p.kind) {
    case "message": return { title: name, body: "💬 " + (text || "Sent you a message"), url: to("chat:" + p.actor_id), tag: "msg-" + p.actor_id };
    case "like":    return { title: "New like", body: "❤️ " + name + " liked your post" + post, url: to("post:" + p.post_id), tag: "like-" + p.post_id };
    case "comment": return { title: "New comment", body: "💭 " + name + (text ? ": “" + text + "”" : " commented on your post" + post), url: to("post:" + p.post_id) };
    case "reply":   return { title: "New reply", body: "↩️ " + name + (text ? " replied: “" + text + "”" : " replied to you"), url: to("post:" + p.post_id) };
    case "follow":  return { title: "New follower", body: "👤 " + name + " started following you", url: to("member:" + p.actor_id), tag: "follow-" + p.actor_id };
    case "repost":  return { title: "New repost", body: "🔁 " + name + " reposted your post" + post, url: to("post:" + p.post_id) };
    default:        return { title: "Guild", body: name + " interacted with you", url: to("notifs") };
  }
}

async function send(sub, msg, keys, secret) {
  const r = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapid(sub.endpoint, keys.public, keys.private),
      "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream",
      TTL: "86400", Urgency: "high",
    },
    body: await encrypt(enc.encode(JSON.stringify(msg)), sub.p256dh, sub.auth),
  });
  if (r.status === 404 || r.status === 410) {
    await rpc("push_gone", { p_secret: secret, p_endpoint: sub.endpoint }).catch(() => {});
  }
  return r.status;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") return res.status(200).json({ publicKey: await publicKey() });
    if (req.method !== "POST") return res.status(405).json({ error: "method" });
    const secret = req.headers["x-hook-secret"] || "";
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const p = await rpc("push_payload_s", { p_secret: secret, n: body && body.record });
    if (!p || !p.subs || !p.subs.length || !p.keys) return res.status(200).json({ sent: 0 });
    const msg = { ...word(p), badge: Number(p.unread) || 0 };
    const results = await Promise.all(p.subs.map(s => send(s, msg, p.keys, secret).catch(() => 0)));
    return res.status(200).json({ sent: results.filter(s => s >= 200 && s < 300).length, results });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
};
module.exports.word = word; module.exports.encrypt = encrypt; module.exports.vapid = vapid;
