/* ═══════════ SPEECH TO TEXT ═══════════
   The interpreting practice records what a member says and sends the
   recording here, to be written out word for word. Phones cannot always
   do this themselves: an iPhone will not let a website use its speech to
   text from a Home Screen app, and its keyboard microphone silences the
   speaker in simultaneous mode. A recording sent here has neither limit.

     POST /api/stt  { audio: <base64>, mime: "audio/mp4" | "audio/webm" | …, lang: "ar" | "en" }
       -> { text }
       or 503 { error: "no-key" } until the key is set

   The transcription is done by OpenAI's speech to text (whisper-1, or the
   model named in STT_MODEL). The key is never in this file or the page: it
   lives in the Vercel project as the environment variable OPENAI_API_KEY,
   set by the owner in the Vercel dashboard. The recording is not stored. */

const MAX_BYTES = 3.2 * 1024 * 1024;   // about seven minutes of speech at 64 kbps
const PER_HOUR = 120;                  // recordings per address per hour, per instance
const seen = new Map();

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  const key = process.env.OPENAI_API_KEY;
  if (!key) { res.status(503).json({ error: "no-key" }); return; }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
  const now = Date.now(), hour = 3600e3;
  const list = (seen.get(ip) || []).filter(t => now - t < hour);
  if (list.length >= PER_HOUR) { res.status(429).json({ error: "Too many recordings this hour. Try again later." }); return; }
  list.push(now); seen.set(ip, list);

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body.audio !== "string") { res.status(400).json({ error: "No recording." }); return; }
  const buf = Buffer.from(body.audio, "base64");
  if (!buf.length) { res.status(400).json({ error: "Empty recording." }); return; }
  if (buf.length > MAX_BYTES) { res.status(413).json({ error: "The recording is too long." }); return; }
  const mime = /^audio\/[\w.+-]+$/.test(String(body.mime || "")) ? body.mime.split(";")[0] : "audio/webm";
  const ext = /mp4|m4a|aac/.test(mime) ? "m4a" : /ogg/.test(mime) ? "ogg" : /wav/.test(mime) ? "wav" : /mpeg|mp3/.test(mime) ? "mp3" : "webm";
  const lang = body.lang === "ar" ? "ar" : "en";

  try {
    const form = new FormData();
    form.append("file", new Blob([buf], { type: mime }), "speech." + ext);
    form.append("model", process.env.STT_MODEL || "whisper-1");
    form.append("language", lang);
    form.append("response_format", "json");
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: "Bearer " + key }, body: form
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { res.status(502).json({ error: "The speech service could not read the recording." }); return; }
    res.status(200).json({ text: String(j.text || "").trim() });
  } catch (e) {
    res.status(502).json({ error: "The speech service could not be reached." });
  }
};
