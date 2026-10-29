/* ═══════════ STUDY HELPER KNOWLEDGE ═══════════
   Builds api/_kb.json, the only material the Study Helper may answer
   from. It reads the site's own Learn and Practice content out of
   index.html (in a headless browser, so every constant is read exactly
   as the page sees it) and the three Library files, and cuts them into
   short passages, each labelled with where it lives on the site and the
   published source it comes from.

   Run it again whenever that content changes:
     node tools/build-kb.js
   It needs Playwright with Chromium on the machine that runs it; the
   site itself does not depend on either.

   Quiz options that are wrong are left out, so a wrong answer can never
   be quoted back as a fact. The classical Arabic books in books/ are left
   out on purpose. */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "api", "_kb.json");

/* constant -> [where it is on the site, the source it rests on] */
const CONSTS = {
  GLOSSARY:       ["Learn › Glossary of the Field", "The Translator's Compass handbook"],
  GLOSSARY_BOOKS: ["Learn › Glossary of the Field", ""],
  GUIDE_MEANING:  ["Learn › The Translator and Equivalence", "Bassnett (2014); Husni & Newman (2015)"],
  GUIDE_PHRASE:   ["Learn › Collocations, Idioms and Proverbs", "Husni & Newman (2015), ch. 1"],
  GUIDE_VARIETY:  ["Learn › Register, Dialect and Diglossia", "Husni & Newman (2015), ch. 2; Husni & Newman (2013)"],
  GUIDE_FIELDS:   ["Learn › Specialised Fields", "Husni & Newman (2015), chs. 3–4"],
  PROCEDURES:     ["Learn › The Seven Procedures", "Vinay & Darbelnet"],
  TEXT_WORLDS:    ["Learn › Text Types and Genres", ""],
  THEORIES:       ["Learn › Theories", ""],
  TH_MORE:        ["Learn › Theories", ""],
  THEORISTS:      ["Learn › Theories › Theorists", ""],
  LINEAGE:        ["Learn › Through time", ""],
  ERAS:           ["Learn › Through time", ""],
  DISCIPLINE:     ["Learn › Through time › The discipline", ""],
  KU_MINOR:       ["Learn › Kuwait University · Translation Minor", ""],
  ENGL180:        ["Learn › Translation Minor › ENGL 180 Principles of Translation", ""],
  ENGL182:        ["Learn › Translation Minor › ENGL 182 Terminology", ""],
  ENGL284:        ["Learn › Translation Minor › ENGL 284", ""],
  KU_COURSE_MORE: ["Learn › Translation Minor › cases", ""],
  PHRASE_SETS:    ["Practice › Collocations", "Husni & Newman (2015), ch. 1"],
  KUWAITI:        ["Practice › Kuwaiti Proverbs", ""],
  SUBTITLE:       ["Practice › Subtitling", ""],
  BOOTH_GENRES:   ["Interpreting › Booth", ""],
  WORKBENCH:      ["Learn › Translation and Commentary", ""],
  NAME_PROC:      ["Practice › Name the Procedure", ""],
  HUMAN:          ["Practice › Equivalence and False Friends", ""],
  PROVERBS:       ["Practice › Proverbs", ""],
  COURTESY:       ["Practice › Speech Acts", ""],
  CULTURAL:       ["Practice › Idioms and Similes", ""],
  COLLOC:         ["Practice › Collocations", ""],
  AZ_Q:           ["Practice › A to Z trial", "Husni & Newman (2013)"],
  LEGAL_Q:        ["Practice › Legal trial", "Husni & Newman (2015), ch. 3"],
  BAS_Q:          ["Practice › Bassnett trial", "Bassnett (2014)"],
  CONCEPT_Q:      ["Practice › Key Concepts trial", "Husni & Newman (2015)"],
};
/* pages whose text is written straight into their render function:
   these are opened in the page and read tab by tab */
const PAGES = {
  toolkit: ["Learn › Method, Procedure and Strategy", ""],
  errors:  ["Learn › Revision and Common Errors", ""],
  modes:   ["Learn › The Modes of Interpreting", ""],
};
const LIBRARY = {
  "atoz.json":     "Library › A to Z",
  "legal.json":    "Library › Legal Translation",
  "bassnett.json": "Library › Translation Studies (Bassnett)",
};

const SKIP = new Set(["icon", "img", "thumb", "wiki", "mono", "c", "pct", "meta", "credit",
  "srcDir", "outDir", "dir", "g", "y", "n", "key", "lib", "secs", "lines", "fig", "figs", "video"]);

const clean = s => String(s)
  .replace(/<[^>]+>/g, "")
  .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&amp;/g, "&")
  .replace(/&ldquo;|&rdquo;/g, "\"").replace(/&lsquo;|&rsquo;/g, "’").replace(/&nbsp;/g, " ")
  .replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

/* every string a reader would see, in order; wrong quiz answers dropped */
function flat(v, out) {
  if (v == null) return out;
  if (typeof v === "string") { const c = clean(v); if (c && !/^[0-9a-f-]{8,}$/i.test(c)) out.push(c); return out; }
  if (typeof v === "number" || typeof v === "boolean") return out;
  if (Array.isArray(v)) {
    const quiz = v.length && v.every(x => x && typeof x === "object" && "ok" in x);
    v.forEach(x => { if (!quiz || x.ok) flat(x, out); });
    return out;
  }
  if (Array.isArray(v.o) && typeof v.a === "number") {
    flat(v.q, out); out.push("Answer: " + clean(v.o[v.a])); flat(v.why, out);
    return out;
  }
  if (Array.isArray(v.opts)) {
    const keep = Object.assign({}, v); delete keep.opts;
    flat(keep, out);
    v.opts.filter(o => o && o.ok).forEach(o => out.push("Answer: " + clean(o.t) + (o.tag ? " (" + clean(o.tag) + ")" : "")));
    return out;
  }
  for (const [k, x] of Object.entries(v)) {
    if (SKIP.has(k)) continue;
    if (k === "id" && typeof x === "string" && x.length < 20) continue;
    if (k === "ok" && Array.isArray(x)) { out.push("English: " + x.map(clean).join(" / ")); continue; }
    flat(x, out);
  }
  return out;
}

const titleOf = (x, i) => clean((x && (x.en || x.h || x.name || x.t || x.src || x.title)) || "#" + (i + 1));

const chunks = [];
function add(where, src, title, parts) {
  let text = "", n = 0;
  const push = () => {
    if (!text.trim()) return;
    chunks.push({ id: chunks.length, where, src, title: n ? title + " (cont.)" : title, text: text.trim() });
    text = ""; n++;
  };
  for (const p of parts) {
    if (text.length + p.length > 1600) push();
    text += (text ? " " : "") + p;
  }
  push();
}

function addCollection(where, src, v) {
  if (Array.isArray(v)) v.forEach((x, i) => add(where, (x && x.src && typeof x.src === "string" && /\(\d{4}\)|\d{4}\)/.test(x.src)) ? x.src : src, titleOf(x, i), flat(x, [])));
  else if (v && typeof v === "object") {
    const ks = Object.keys(v);
    if (ks.every(k => v[k] && typeof v[k] === "object")) ks.forEach(k => add(where, src, clean(k), flat(v[k], [])));
    else add(where, src, titleOf(v, 0), flat(v, []));
  }
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const page = await browser.newPage();
  await page.route(/^https?:\/\//, r => r.abort());
  await page.goto("file://" + path.join(ROOT, "index.html")).catch(() => {});
  await page.waitForTimeout(2500);
  for (const [name, [where, src]] of Object.entries(CONSTS)) {
    const v = await page.evaluate(n => { try { return JSON.parse(JSON.stringify(eval(n))); } catch (e) { return undefined; } }, name);
    if (v === undefined) { console.warn("missing", name); continue; }
    addCollection(where, src, v);
  }
  for (const [id, [where, src]] of Object.entries(PAGES)) {
    const tabs = await page.evaluate(async id => {
      const wait = () => new Promise(r => setTimeout(r, 250));
      openItem(ITEMS.find(x => x.id === id)); await wait();
      const st = document.getElementById("stage");
      /* the live text keeps its line breaks; button labels are dropped */
      const read = () => {
        const skip = new Set([...st.querySelectorAll("button")].map(b => b.innerText.trim()));
        return st.innerText.split("\n").filter(l => !skip.has(l.trim())).join("\n");
      };
      const chips = [...st.querySelectorAll("button.chip")].map(b => b.textContent.trim());
      if (!chips.length) return [["", read()]];
      const out = [];
      for (const label of chips) {
        const b = [...st.querySelectorAll("button.chip")].find(x => x.textContent.trim() === label);
        if (b) { b.click(); await wait(); }
        out.push([label, read()]);
      }
      return out;
    }, id);
    /* a paragraph every tab repeats (an introduction) is kept once */
    const seen = new Set();
    for (const [label, text] of tabs) {
      const paras = text.split(/\n+/).map(clean).filter(p => p && !seen.has(p));
      paras.forEach(p => seen.add(p));
      if (!paras.length) continue;
      add(where, src, label || where.split(" › ").pop(), paras);
    }
  }
  await browser.close();

  for (const [file, where] of Object.entries(LIBRARY)) {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, "library", file), "utf8"));
    const src = Array.isArray(d) ? "Husni, R. & Newman, D. L. (2013). A to Z of Arabic–English–Arabic Translation. Saqi." : d.src;
    const list = Array.isArray(d) ? d : d.sections;
    list.forEach((x, i) => add(where, src + (x.pg ? ", pp. " + x.pg : ""), titleOf(x, i), flat(x, [])));
  }

  fs.writeFileSync(OUT, JSON.stringify({ built: new Date().toISOString().slice(0, 10), chunks }));
  console.log(chunks.length, "passages,", Math.round(fs.statSync(OUT).size / 1024), "KB ->", path.relative(ROOT, OUT));
})();
