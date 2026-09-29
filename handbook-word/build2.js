// Builds Translation-Handbook.docx (second edition of the draft) from c2a.js and c2b.js.
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat, PageNumber, Footer,
  TableOfContents, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, Tab, TabStopType,
  ImageRun, Header, SimpleField, NumberFormat, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType, SectionType } = require('docx');

const INK = '1F1A2E', ACCENT = '3D1591', GREY = '6B6680', LINE = 'CFC9DE';
// PDF=1 builds a copy with fonts installed on the build machine, for the PDF export only.
const PDF = !!process.env.PDF;
// COVER=midnight or COVER=light picks the cover design; each gets its own output files.
const COVER = process.env.COVER || 'midnight', NAME = 'Translation-Handbook-' + COVER[0].toUpperCase() + COVER.slice(1);
const LATIN = PDF ? 'Carlito' : 'Calibri', ARABIC = PDF ? 'Noto Naskh Arabic' : 'Arial', SERIF = PDF ? 'Noto Serif' : 'Georgia', BOX = 'ECE9F7';
const mm = x => Math.round(x * 56.7);
const PAGE_W = mm(176), MARGIN = mm(+(process.env.MARGIN || (process.env.LOOSE ? 22 : 20))), CONTENT_W = PAGE_W - 2 * MARGIN;

// ---------- inline text: **bold**, _italic_, {{Arabic}} ----------
function runs(text, base = {}) {
  const out = []; const re = /(\*\*[^*]+\*\*|\{\{[^}]+\}\}|(?<![A-Za-z0-9])_[^_]+_(?![A-Za-z0-9]))/g; let last = 0, m;
  const plain = t => { if (t) out.push(new TextRun({ text: t, font: LATIN, ...base })); };
  while ((m = re.exec(text))) {
    plain(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(...runs(tok.slice(2, -2), { ...base, bold: true }));
    else if (tok.startsWith('{{')) out.push(ar(tok.slice(2, -2), base));
    else out.push(...runs(tok.slice(1, -1), { ...base, italics: true }));
    last = m.index + tok.length;
  }
  plain(text.slice(last));
  return out;
}
function ar(t, o = {}) {
  return new TextRun({ text: t, rightToLeft: true, font: { ascii: ARABIC, hAnsi: ARABIC, cs: ARABIC }, size: o.size || 23, sizeComplexScript: o.size || 24, bold: o.bold, boldComplexScript: o.bold, color: o.color });
}

// a term's Arabic: 'preferred|alternative' shows the preferred equivalent first, then the alternative
const arTerm = a => { const [p, alt] = a.split('|'); return alt ? [ar(p), new TextRun({ text: '; also ', font: LATIN, italics: true }), ar(alt)] : [ar(p)]; };
// ---------- blocks ----------
// every chapter's Remember box ends with the next step on the reader's path
const TITLES = {}, NEXT = {}; let CLOSING = null;
{ const nav = [];
  [...require('./c2a.js'), ...require('./c2b.js')].forEach(b => {
    const m = b[0] === 'ch' && /^Chapter (\d+): (.*)$/.exec(b[1]); if (m) { TITLES[+m[1]] = m[2]; nav.push([+m[1], b[1]]); }
    if (b[0] === 'page') nav.push([null, b[1]]);
    if (b[0] === 'part' && b[2] === 'closing') { CLOSING = b[1]; nav.push([null, b[1]]); } });
  nav.forEach(([n], i) => { if (n && nav[i + 1]) NEXT[n] = nav[i + 1][1]; }); }
let inst = 0, afterPart = false, chapter = null, mainStart = null, pendingTerms = null;
const body = [], glossary = [];
// generous spacing so that pages are light for beginners
const LOOSE = !!process.env.LOOSE;  // LOOSE=1: the earlier layout, each chapter on a new page
const SHARE = !!process.env.SHARE, PA = +(process.env.PA || (LOOSE ? 200 : 170)), H3B = +(process.env.H3B || (LOOSE ? 380 : 300)), COLS = !LOOSE, FLOW = !LOOSE, LS = +(process.env.LS || 330);
const P = (children, opts = {}) => body.push(new Paragraph({ children, spacing: { after: PA, line: LS }, ...opts }));
const shade = { type: ShadingType.CLEAR, color: 'auto', fill: BOX };
const list = (items, ref, opts = {}) => { const k = ref === 'num' ? ++inst : undefined;
  items.forEach(t => P(runs(t, opts.run), { numbering: { reference: ref, level: 0, ...(k ? { instance: k } : {}) }, spacing: { after: opts.box ? 0 : 110, line: opts.box ? 300 : 320 }, ...(opts.box ? { shading: shade, keepNext: true, keepLines: true } : {}) }));
  body.push(new Paragraph({ spacing: { after: 40 }, children: [] })); };
const H = (lvl, t, extra = {}) => body.push(new Paragraph({ heading: lvl, children: [new TextRun({ text: t })], ...extra }));
const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };

function table(head, rows, pct) {
  const widths = pct.map(x => Math.round(CONTENT_W * x / 100));
  widths[widths.length - 1] += CONTENT_W - widths.reduce((a, b) => a + b, 0);
  const cell = (t, i, hdr) => new TableCell({ width: { size: widths[i], type: WidthType.DXA },
    shading: hdr ? { type: ShadingType.CLEAR, color: 'auto', fill: 'EFEBF8' } : undefined, margins: { top: 50, bottom: 50, left: 80, right: 80 },
    children: [new Paragraph({ spacing: { after: 0, line: 260 }, children: runs(t, { size: 18, bold: hdr || undefined, color: hdr ? ACCENT : undefined }) })] });
  body.push(new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths,
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
    rows: [new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, i, true)) }), ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false)) }))] }));
  body.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
}

// a lavender box, like the text boxes in Guild posts: a shaded title line, shaded items and a shaded closing line
function boxTitle(t) { body.push(new Paragraph({ keepNext: true, shading: shade, spacing: { before: 240, after: 0, line: 290 },
  children: [new TextRun({ text: t.toUpperCase(), bold: true, color: ACCENT, font: LATIN, size: 17, characterSpacing: 30 })] })); }
function boxEnd() { body.push(new Paragraph({ shading: shade, spacing: { after: 160, line: 120 }, children: [] })); }
function block(b) {
  const [kind, a, c, d] = b;
  switch (kind) {
    case 'front': H(HeadingLevel.HEADING_1, a, { pageBreakBefore: true }); break;
    case 'part':
      if (a.startsWith('Part 1:')) mainStart = body.length;
      // SHARE=1: short back-matter lists follow on the same page
      H(HeadingLevel.HEADING_1, a, { pageBreakBefore: mainStart !== body.length && !(SHARE && a === 'Further reading') && !(process.env.PARTFLOW && /^Part \d/.test(a)), ...(SHARE && a === 'Further reading' ? { spacing: { before: 480, after: 200 } } : {}) });
      if (c && c !== 'closing') P(runs(c, { italics: true, color: GREY }), { spacing: { after: 360, line: 290 } });
      if (c === 'closing') chapter = null;
      afterPart = true; break;
    case 'ch': {
      // FLOW=1: chapters follow on from each other; only parts start on a new page
      H(HeadingLevel.HEADING_2, a, FLOW ? { pageBreakBefore: false, spacing: { before: afterPart ? 0 : 600 } } : { pageBreakBefore: !afterPart }); afterPart = false;
      const m = /^Chapter (\d+)/.exec(a); chapter = m ? +m[1] : null; break;
    }
    case 'h': H(HeadingLevel.HEADING_3, a); break;
    case 'intro': P([new TextRun({ text: 'Where we are. ', bold: true, color: ACCENT, font: LATIN }), ...runs(a)], { spacing: { after: 280, line: 320 } }); break;
    case 'terms':
      // explain first, name later: the chapter's terms are shown at its end, inside the "Remember" box
      a.forEach(([t, arab, def]) => { if (chapter) glossary.push([t, arab, def, chapter]); });
      pendingTerms = a; break;
    case 'p': P(runs(a)); break;
    case 'ex': P(runs(a), { indent: { left: 567 } }); break;
    case 'ar': body.push(new Paragraph({ bidirectional: true, indent: { left: 567 }, spacing: { after: 200, line: 320 }, children: [ar(a)] })); break;
    case 'ol': list(a, 'num'); break;
    case 'ul': list(a, 'bul'); break;
    case 'check': list(a, 'box'); break;
    case 'lines': a.forEach(t => P([new TextRun({ text: t, font: LATIN }), new TextRun({ children: [new Tab()] })],
      { tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W, leader: 'underscore' }], spacing: { before: 200, after: 120 } })); break;
    case 'table': table(a, c, d); break;
    case 'try': {
      H(HeadingLevel.HEADING_3, 'Try it');
      list(a, 'num');
      P([new TextRun({ text: 'Check your answers', bold: true, color: GREY, font: LATIN })], { keepNext: true, spacing: { before: 200, after: 60, line: 290 }, border: { top: { style: BorderStyle.DOTTED, size: 6, color: LINE, space: 6 } } });
      list(c, 'num', { run: { color: GREY } });
      break;
    }
    case 'summary':
      boxTitle('Remember'); list(a, 'bul', { box: true }); body.pop();
      if (pendingTerms) {
        body.push(new Paragraph({ keepNext: true, shading: shade, spacing: { before: 160, after: 40, line: 290 },
          children: [new TextRun({ text: 'WORDS TO REMEMBER', bold: true, color: ACCENT, font: LATIN, size: 17, characterSpacing: 30 })] }));
        pendingTerms.forEach(([t, arab, def]) => P([...runs(`**${t}**`), new TextRun({ text: ' (', font: LATIN }), ...arTerm(arab), new TextRun({ text: '): ', font: LATIN }), ...runs(def)],
          { numbering: { reference: 'bul', level: 0 }, spacing: { after: 40, line: 300 }, shading: shade, keepNext: true, keepLines: true }));
        pendingTerms = null;
      }
      if (chapter) { const nx = NEXT[chapter] || CLOSING;
        if (nx) body.push(new Paragraph({ shading: shade, spacing: { before: 120, after: 0, line: 290 },
          children: [new TextRun({ text: 'NEXT  ', bold: true, color: ACCENT, font: LATIN, size: 17, characterSpacing: 30 }), new TextRun({ text: nx, italics: true, font: LATIN, size: 20 })] })); }
      boxEnd(); break;
    case 'page':   // a one-page guide between chapters, listed in the contents
      H(HeadingLevel.HEADING_1, a, { pageBreakBefore: true }); afterPart = false; chapter = null; break;
    case 'box':    // a titled shaded list, e.g. DO / DON'T
      boxTitle(a); c.forEach(t => P(runs(t), { shading: shade, keepNext: true, keepLines: true, indent: { left: 170 }, spacing: { after: 0, line: 300 } })); boxEnd(); break;
    case 'fact':   // a short, well-documented fact that shows why translation matters
      boxTitle('Did you know?');
      body.push(new Paragraph({ shading: shade, keepLines: true, spacing: { after: 0, line: 300 }, children: runs(a) }));
      boxEnd(); break;
    default: throw new Error('unknown block ' + kind);
  }
}

// ---------- title page ----------
const center = (children, spacing) => body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing, children }));
// The logo is cut from the club's own artwork by art/logo.py; the covers are rendered by art/render.sh.
const img = (file, w, h, extra = {}) => new ImageRun({ type: file.endsWith('.png') ? 'png' : 'jpg', data: fs.readFileSync(file), transformation: { width: w, height: h }, ...extra });
center([img('art/logo-dark.png', 228, 112)], { before: 900, after: 0 });
body.push(new Paragraph({ spacing: { after: 1200 }, children: [] }));
center([new TextRun({ text: 'Translation Handbook', font: SERIF, size: 56, bold: true, color: INK })], { after: 200 });
center([new TextRun({ text: 'A beginner’s guide to translating between English and Arabic', font: LATIN, size: 26, italics: true, color: INK })], { after: 160 });
center([new TextRun({ text: 'Learn. Practise. Revise. Translate.', font: LATIN, size: 22, bold: true, color: ACCENT, characterSpacing: 20 })], { after: 400 });
body.push(new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [ar('دليل الترجمة', { size: 44, bold: true, color: ACCENT })] }));
body.push(new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 2400 }, children: [ar('مرشدٌ للمبتدئين في الترجمة بين العربية والإنجليزية', { size: 26, color: INK })] }));
center([new TextRun({ text: 'First edition, 2026', font: LATIN, size: 20, color: GREY })], {});

// ---------- copyright page ----------
const small = (t, extra = {}) => P(runs(t, { size: 18, color: GREY }), { spacing: { after: 140, line: 270 }, ...extra });
small('**Translation Handbook: A Beginner’s Guide to Translating between English and Arabic**', { pageBreakBefore: true, spacing: { before: 3600, after: 140, line: 270 } });
small('First edition, 2026. Prepared by the Translation Team, Guild Professional Club.');
small('© 2026 Guild Professional Club, Translation Team. All rights reserved. No part of this handbook may be reproduced without permission, except for short quotations with acknowledgement.');
small('Quotations from published works are used for teaching purposes and are fully acknowledged in the References. Unless another source is given, examples come from the Translation Team’s course materials or were written for this handbook.');
small('AI assistance: an AI tool (Claude, by Anthropic) was used to help organise, draft and edit parts of this handbook. The selection of content, the translation decisions, the checking and the final approval were the responsibility of the Translation Team.');

// ---------- contents ----------
body.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 240 }, children: [new TextRun({ text: 'Contents', font: LATIN, size: 36, bold: true, color: ACCENT })] }));
body.push(new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }));
if (!PDF) body.push(new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: 'If the page numbers are missing, right-click the list and choose “Update Field”.', font: LATIN, size: 17, italics: true, color: GREY })] }));

require('./c2a.js').forEach(block);
body.splice(body.length, 0); // (front matter and Parts 1–4)
require('./c2b.js').forEach(block);

// acknowledgements go after the preface
// ---------- glossary (built from every Key terms list) ----------
// ---------- further reading: five books from the references, for readers who want to go further ----------
block(['part', 'Further reading', 'If you want to go further, start with these books. Full details are in the References.']);
block(['ul', [
  '**Baker (2018)**, _In other words_: the classic coursebook, with problems and strategies at word, grammar and text level.',
  '**Ghazala (2008)**, _Translation as problems and solutions_: English–Arabic examples of common problems, each with its solutions.',
  '**Dickins et al. (2016)**, _Thinking Arabic translation_: a practical course in translating from Arabic into English.',
  '**Newmark (1988)**, _A textbook of translation_: methods and procedures, with many examples.',
  '**Díaz Cintas and Remael (2021)**, _Subtitling_: a practical guide to the subtitler’s work, with many examples.',
]]);
block(['part', 'Glossary', 'All the key terms defined in this handbook, in alphabetical order, with the chapter where each one is explained. Where two Arabic equivalents are given, the first is the one this handbook prefers.']);
let glossStart = body.length, glossEnd;
const seen = new Map();
glossary.forEach(g => { const k = g[0].toLowerCase(); if (!seen.has(k)) seen.set(k, g); });
[...seen.values()].sort((x, y) => x[0].localeCompare(y[0])).forEach(([t, a, d, ch]) =>
  P([...runs(`**${t}**`), new TextRun({ text: '  ', font: LATIN }), ...arTerm(a), new TextRun({ text: '  ', font: LATIN }), ...runs(d + ' '), new TextRun({ text: `(Chapter ${ch})`, font: LATIN, color: GREY })].map(r => r), { spacing: { after: 90, line: COLS ? 262 : 280 } }));
glossEnd = body.length;

// ---------- references (APA 7) ----------
const R = [
  'Academy of the Arabic Language in Cairo. (n.d.). _Al-muʿjam al-wasīṭ_ [The intermediate dictionary].',
  'ALECSO & GIZ. (n.d.). _Arabterm_ [Online technical dictionary]. https://arabterm.org',
  'al-Jāḥiẓ. (1965). _Kitāb al-ḥayawān_ [The book of animals] (ʿA. M. Hārūn, Ed.; 2nd ed., Vol. 1). Muṣṭafā al-Bābī al-Ḥalabī. (Original work written 9th century CE)',
  'al-Mutanabbi. (n.d.). _Dīwān al-Mutanabbī_ [The collected poems of al-Mutanabbi]. (Original work written 10th century CE)',
  'Baalbaki, M. (n.d.). _Al-Mawrid: A modern English–Arabic dictionary_. Dar El-Ilm Lilmalayin.',
  'Baker, M. (2018). _In other words: A coursebook on translation_ (3rd ed.). Routledge.',
  'Baker, M., & Hanna, S. (2009). Arabic tradition. In M. Baker & G. Saldanha (Eds.), _Routledge encyclopedia of translation studies_ (2nd ed., pp. 328–337). Routledge.',
  'Cabré, M. T. (1999). _Terminology: Theory, methods and applications_ (J. C. Sager, Ed.; J. A. DeCesaris, Trans.). John Benjamins.',
  'Dickins, J., Hervey, S., & Higgins, I. (2016). _Thinking Arabic translation: A course in translation method: Arabic to English_ (2nd ed.). Routledge.',
  'Eco, U. (2003). _Dire quasi la stessa cosa: Esperienze di traduzione_ [Saying almost the same thing: Experiences of translation]. Bompiani.',
  'Fairclough, N. (1992). _Discourse and social change_. Polity Press.',
  'Fairclough, N. (2003). _Analysing discourse: Textual analysis for social research_. Routledge.',
  'Farghal, M., & Shunnaq, A. T. (2011). _Translation with reference to English and Arabic: A practical guide_. Dar Al-Hilal for Translation. (Original work published 1999)',
  'Firth, J. R. (1957). A synopsis of linguistic theory, 1930–1955. In _Studies in linguistic analysis_ (pp. 1–32). Blackwell.',
  'Ghazala, H. (2008). _Translation as problems and solutions: A textbook for university students and trainee translators_ (Special ed.). Dar El-Ilm Lilmalayin.',
  'Jakobson, R. (1959). On linguistic aspects of translation. In R. A. Brower (Ed.), _On translation_ (pp. 232–239). Harvard University Press.',
  'Jerome. (2012). Letter to Pammachius (K. Davis, Trans.). In L. Venuti (Ed.), _The translation studies reader_ (3rd ed., pp. 21–30). Routledge. (Original work written 395 CE)',
  'Johnson, S. (1897). Letter to Francesco Sastres, 21 August 1784. In G. B. Hill (Ed.), _Johnsonian miscellanies_ (Vol. 2, p. 309). Clarendon Press. (Original work written 1784)',
  'Kenny, D. (Ed.). (2022). _Machine translation for everyone: Empowering users in the age of artificial intelligence_. Language Science Press. https://doi.org/10.5281/zenodo.6653406',
  'Mossop, B. (2014). _Revising and editing for translators_ (3rd ed.). Routledge.',
  '_Muʿjam al-taʿābīr al-iṣṭilāḥiyya al-Kuwaytiyya al-muqārana_ [Dictionary of comparative Kuwaiti idiomatic expressions]. (n.d.).',
  'Newmark, P. (1988). _A textbook of translation_. Prentice Hall.',
  'Nida, E. A., & Taber, C. R. (1969). _The theory and practice of translation_. E. J. Brill.',
  'Nord, C. (1997). _Translating as a purposeful activity: Functionalist approaches explained_. St. Jerome.',
  'Nord, C. (2005). _Text analysis in translation: Theory, methodology, and didactic application of a model for translation-oriented text analysis_ (2nd ed.). Rodopi.',
  '_Oxford collocations dictionary for students of English_ (2nd ed.). (2009). Oxford University Press.',
  'Pym, A. (2015). Translating as risk management. _Journal of Pragmatics, 85_, 67–80. https://doi.org/10.1016/j.pragma.2015.06.010',
  'Reiss, K. (2000). _Translation criticism: The potentials and limitations. Categories and criteria for translation quality assessment_ (E. F. Rhodes, Trans.). St. Jerome. (Original work published 1971)',
  'Shakespeare, W. (1609). Sonnet 18. In _Shake-speares sonnets: Never before imprinted_. Thomas Thorpe.',
  'Translation Team. (n.d.). _Translation handbook: Course materials and notes_ [Unpublished manuscript]. Guild Professional Club.',
  'United Nations. (n.d.). _UNTERM: The United Nations terminology database_. https://unterm.un.org',
  'Venuti, L. (1995). _The translator’s invisibility: A history of translation_. Routledge.',
  'Vinay, J.-P., & Darbelnet, J. (1995). _Comparative stylistics of French and English: A methodology for translation_ (J. C. Sager & M.-J. Hamel, Eds. & Trans.). John Benjamins. (Original work published 1958)',
  'Díaz Cintas, J., & Remael, A. (2007). _Audiovisual translation: Subtitling_. St. Jerome.',
  'Díaz Cintas, J., & Remael, A. (2021). _Subtitling: Concepts and practices_. Routledge.',
  'Gambier, Y. (2003). Introduction: Screen transadaptation: Perception and reception. _The Translator, 9_(2), 171–189. https://doi.org/10.1080/13556509.2003.10799152',
  'Pedersen, J. (2011). _Subtitling norms for television: An exploration focussing on extralinguistic cultural references_. John Benjamins.',
  'Pérez-González, L. (2014). _Audiovisual translation: Theories, methods and issues_. Routledge.',
  'Reiss, K., & Vermeer, H. J. (1984). _Grundlegung einer allgemeinen Translationstheorie_ [Groundwork for a general theory of translation]. Niemeyer.',
  'Wehr, H. (1994). _A dictionary of modern written Arabic_ (J. M. Cowan, Ed.; 4th ed.). Spoken Language Services.',
];
const refKey = r => r.replace(/^_/, '').replace(/^al-/, '').normalize('NFD').replace(/[\u0300-\u036f’ʿ]/g, '').toLowerCase();
R.sort((x, y) => refKey(x).localeCompare(refKey(y)));
block(['part', 'References', 'All sources cited in this handbook, in APA style.']);
R.forEach(r => P(runs(r), { indent: { left: 567, hanging: 567 }, spacing: { after: 100, line: 280 } }));

// ---------- website page, the last page inside the book ----------
body.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 2600 }, children: [] }));
center([new TextRun({ text: 'Visit the Translation Team’s website', font: SERIF, size: 36, bold: true, color: ACCENT })], { after: 360 });
center([img('art/qr/website-qr.png', 250, 250)], { after: 300 });
center([new TextRun({ text: 'Scan the code, or type the address:', font: LATIN, size: 21, color: INK })], { after: 80 });
center([new TextRun({ text: 'translators-guild.vercel.app', font: LATIN, size: 23, bold: true, color: ACCENT })], { after: 0 });

// ---------- covers ----------
const pageSize = { width: PAGE_W, height: mm(250) };
const coverSection = file => ({
  properties: { page: { size: pageSize, margin: { top: 0, bottom: 0, left: 0, right: 0, header: 0, footer: 0 } } },
  headers: { default: new Header({ children: [new Paragraph({ children: [] })] }) },
  footers: { default: new Footer({ children: [new Paragraph({ children: [] })] }) },
  children: [new Paragraph({ children: [img(file, 665, 945, { floating: {
    horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
    verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
    behindDocument: true, allowOverlap: true, wrap: { type: TextWrappingType.NONE } } })] })],
});
const pageNum = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: LATIN, size: 17, color: GREY })] })] });
const margins = { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, header: mm(10), footer: mm(9) };
// running head: book title on the left, the current part on the right
const runningHead = new Header({ children: [new Paragraph({
  tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } },
  children: [new TextRun({ text: 'Translation Handbook', font: LATIN, size: 16, color: GREY, italics: true }), new TextRun({ children: [new Tab()], font: LATIN, size: 16 }),
    new SimpleField('STYLEREF "Heading 1"'),
  ] })] });

const doc = new Document({
  creator: 'Guild Translation Team', title: 'Translation Handbook', features: { updateFields: true },
  styles: {
    default: { document: { run: { font: LATIN, size: 22, color: INK } } },
    paragraphStyles: [
      // contents entries: compact, so that the list fits on one page
      { id: 'TOC1', name: 'toc 1', basedOn: 'Normal', next: 'Normal', run: { size: 18 }, paragraph: { spacing: { before: 14, after: 0, line: 222 } } },
      { id: 'TOC2', name: 'toc 2', basedOn: 'Normal', next: 'Normal', run: { size: 18 }, paragraph: { spacing: { before: 0, after: 0, line: 222 }, indent: { left: 280 } } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: SERIF, size: 40, bold: true, color: ACCENT }, paragraph: { spacing: { before: 600, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: SERIF, size: 30, bold: true, color: ACCENT }, paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 1, keepNext: true } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: LATIN, size: 23, bold: true, color: INK }, paragraph: { spacing: { before: H3B, after: 140 }, outlineLevel: 2, keepNext: true } },
    ],
  },
  numbering: { config: [
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 454, hanging: 340 } } } }] },
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 454, hanging: 340 } } } }] },
    { reference: 'box', levels: [{ level: 0, format: LevelFormat.BULLET, text: '□', alignment: AlignmentType.LEFT, style: { run: { font: 'Arial' }, paragraph: { indent: { left: 454, hanging: 340 } } } }] },
  ] },
  sections: [
    coverSection(`art/cover-front-${COVER}.jpg`),
    { properties: { page: { size: pageSize, margin: margins, pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN } } },
      headers: { default: new Header({ children: [new Paragraph({ children: [] })] }) }, footers: { default: pageNum }, children: body.slice(0, mainStart) },
    { properties: { page: { size: pageSize, margin: margins, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
      headers: { default: runningHead }, footers: { default: pageNum }, children: COLS ? body.slice(mainStart, glossStart) : body.slice(mainStart) },
    // COLS=1: the glossary entries in two columns, as in most handbooks
    ...(COLS ? [
      { properties: { type: SectionType.CONTINUOUS, page: { size: pageSize, margin: margins }, column: { count: 2, space: 454, equalWidth: true } },
        headers: { default: runningHead }, footers: { default: pageNum }, children: body.slice(glossStart, glossEnd) },
      { properties: { type: SectionType.CONTINUOUS, page: { size: pageSize, margin: margins } },
        headers: { default: runningHead }, footers: { default: pageNum }, children: body.slice(glossEnd) },
    ] : []),
    // blank left-hand page so that the back cover falls on an even page when printed (NOBLANK=1 leaves it out)
    ...(process.env.NOBLANK ? [] : [{ properties: { page: { size: pageSize, margin: margins } },
      headers: { default: new Header({ children: [new Paragraph({ children: [] })] }) }, footers: { default: new Footer({ children: [new Paragraph({ children: [] })] }) },
      children: [new Paragraph({ children: [] })] }]),
    coverSection(`art/cover-back-${COVER}.jpg`),
  ],
});
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(NAME + (PDF ? '-pdf.docx' : '.docx'), buf); console.log('written; glossary terms:', seen.size); });
