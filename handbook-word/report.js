// Builds Handbook-Editorial-Report.docx: a plain black-and-white report for the supervisor, from report_content.js.
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat, PageNumber, Footer,
  TableOfContents, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');

const PDF = !!process.env.PDF;
const FONT = PDF ? 'Liberation Sans' : 'Arial', ARABIC = PDF ? 'Noto Naskh Arabic' : 'Arial';
const mm = x => Math.round(x * 56.7);
const PAGE_W = mm(210), MARGIN = mm(25), CONTENT_W = PAGE_W - 2 * MARGIN;

// inline text: **bold**, _italic_, {{Arabic}}
function runs(text, base = {}) {
  const out = []; const re = /(\*\*[^*]+\*\*|\{\{[^}]+\}\}|(?<![A-Za-z0-9])_[^_]+_(?![A-Za-z0-9]))/g; let last = 0, m;
  const plain = t => { if (t) out.push(new TextRun({ text: t, font: FONT, ...base })); };
  while ((m = re.exec(text))) {
    plain(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(...runs(tok.slice(2, -2), { ...base, bold: true }));
    else if (tok.startsWith('_')) out.push(...runs(tok.slice(1, -1), { ...base, italics: true }));
    else out.push(new TextRun({ text: tok.slice(2, -2), rightToLeft: true, font: { ascii: ARABIC, hAnsi: ARABIC, cs: ARABIC }, size: base.size, sizeComplexScript: base.size ? base.size + 1 : 23, bold: base.bold, boldComplexScript: base.bold }));
    last = m.index + tok.length;
  }
  plain(text.slice(last));
  return out;
}

const body = []; let inst = 0;
const P = (children, opts = {}) => body.push(new Paragraph({ children, spacing: { after: 140, line: 300 }, ...opts }));
const line = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: line, bottom: line, left: line, right: line };

function block([kind, a, b, c]) {
  switch (kind) {
    case 'h1': body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: a })] })); break;
    case 'h1p': body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun({ text: a })] })); break;   // starts on a new page
    case 'h2': body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: a })] })); break;
    case 'p': P(runs(a), { alignment: AlignmentType.JUSTIFIED }); break;
    case 'ul': case 'ol': {
      const k = kind === 'ol' ? ++inst : undefined;
      a.forEach(t => P(runs(t), { numbering: { reference: kind, level: 0, ...(k ? { instance: k } : {}) }, spacing: { after: 80, line: 290 } }));
      body.push(new Paragraph({ spacing: { after: 60 }, children: [] })); break;
    }
    case 'redul': {   // items the team must still verify, in red
      a.forEach(t => P(runs(t, { color: 'C00000' }), { numbering: { reference: 'ul', level: 0 }, spacing: { after: 80, line: 290 } }));
      body.push(new Paragraph({ spacing: { after: 60 }, children: [] })); break;
    }
    case 'table': {
      const widths = c.map(p => Math.round(CONTENT_W * p / 100));
      widths[widths.length - 1] += CONTENT_W - widths.reduce((x, y) => x + y, 0);
      const cell = (t, i, hdr) => new TableCell({ borders, width: { size: widths[i], type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ spacing: { after: 0, line: 260 }, children: runs(t, { size: 19, bold: hdr || undefined }) })] });
      body.push(new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths,
        rows: [new TableRow({ tableHeader: true, children: a.map((h, i) => cell(h, i, true)) }), ...b.map(r => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, i)) }))] }));
      body.push(new Paragraph({ spacing: { after: 160 }, children: [] })); break;
    }
    default: throw new Error('unknown block ' + kind);
  }
}

// title page
const tp = (t, size, opts = {}) => body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, ...opts, children: runs(t, { size, bold: opts.bold }) }));
tp(process.env.TITLE || 'Editorial Report', 44, { bold: true, spacing: { before: 3200, after: 300 } });
tp('Translation Handbook ({{دليل الترجمة}})', 30, { spacing: { after: 120 } });
tp(process.env.EDITION || 'First edition', 24, { spacing: { after: 1600 } });
tp(process.env.PREPARED || 'Prepared for the supervisor of the Translation Team', 22);
if (process.env.NOTE) tp(process.env.NOTE, 20, { spacing: { after: 160 } });
tp('Translation Team, Guild Professional Club', 22);
tp('September 2026', 22, { spacing: { after: 160 } });

// contents
if (!process.env.NOTOC) {   // short reports skip the contents page
  body.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 240 }, children: [new TextRun({ text: 'Contents', font: FONT, size: 30, bold: true })] }));
  body.push(new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }));
}
body.push(new Paragraph({ pageBreakBefore: true, children: [] }));

// CONTENT, TITLE and OUT let the same layout build the correction log as well
require(process.env.CONTENT || './report_content.js').forEach(block);

const doc = new Document({
  creator: 'Guild Translation Team', title: (process.env.TITLE || 'Editorial Report') + ': Translation Handbook', features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 22, color: '000000' } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 28, bold: true, color: '000000' }, paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0, keepNext: true } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 24, bold: true, color: '000000' }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1, keepNext: true } },
    ],
  },
  numbering: { config: [
    { reference: 'ol', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 454, hanging: 340 } } } }] },
    { reference: 'ul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 454, hanging: 340 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: mm(297) }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } }, titlePage: true },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 })] })] }),
               first: new Footer({ children: [new Paragraph({ children: [] })] }) },
    children: body,
  }],
});
Packer.toBuffer(doc).then(buf => { const OUT = process.env.OUT || 'Handbook-Editorial-Report';
  fs.writeFileSync(OUT + (PDF ? '-pdf.docx' : '.docx'), buf); console.log('written'); });
