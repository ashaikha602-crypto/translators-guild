/* ═══════════ ENROL ═══════════
   Same-origin door to the Guild's enrolment function on Supabase.

   The function creates the account already confirmed, so a new member
   needs no email code. Browsers could not reach it directly: it only
   allows calls from translators-guild.vercel.app, while the site lives at
   translators-guild-web.vercel.app, so every phone was refused and sign-up
   fell back to Supabase's email confirmation, whose messages rarely
   arrived. Called from here, server to server, there is no browser origin
   check. It holds no secret: the function does its own validation. */
const SB = "https://bldqausimrsusdzfbubk.supabase.co";
const ANON = "sb_publishable_kyHEHTc00jWi5wN2nyiD0w_NtLbVHy_";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const pick = k => (typeof body[k] === "string" ? body[k].slice(0, 320) : "");
  try {
    const r = await fetch(SB + "/functions/v1/guild-enrol", {
      method: "POST",
      headers: { apikey: ANON, Authorization: "Bearer " + ANON, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: pick("email"), password: pick("password"),
        first_name: pick("first_name"), last_name: pick("last_name"),
      }),
    });
    const text = await r.text();
    res.status(r.status).setHeader("Content-Type", "application/json");
    return res.send(text || "{}");
  } catch (e) {
    return res.status(502).json({ error: "unreachable", message: "Enrolment is unavailable." });
  }
};
