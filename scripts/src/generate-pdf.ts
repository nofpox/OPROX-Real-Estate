import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.resolve(__dirname, '../../attached_assets/rozoz-business-study.md');
const outPath = path.resolve(__dirname, '../../attached_assets/rozoz-business-study.pdf');

const md = fs.readFileSync(mdPath, 'utf-8');
const lines = md.split('\n');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: {
    Title: 'دراسة الأعمال الشاملة — منظومة روزوز',
    Author: 'Rozoz',
    Subject: 'Business Study',
  },
});

const out = fs.createWriteStream(outPath);
doc.pipe(out);

// Gold: #C8A951  Navy: #0F3460  Dark: #16213E
const NAVY = '#0F3460';
const GOLD = '#C8A951';
const DARK = '#16213E';
const GRAY = '#555555';
const LIGHT_BG = '#F8F5ED';

// Use built-in Helvetica (no Arabic shaping — we'll render words LTR reversed for basic RTL)
// For proper Arabic we'd need an Arabic font file; we'll use Helvetica and accept Latin rendering
// since pdfkit doesn't natively shape Arabic glyphs without a TTF.
// Best approach: download a free Arabic TTF at runtime or embed one.
// Let's try to find a system Arabic font first.
const FONT_CANDIDATES = [
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/home/runner/.fonts/NotoNaskhArabic-Regular.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf',
  '/nix/store',
];

// Find an available font that supports Arabic
function findFont(): string | null {
  for (const f of FONT_CANDIDATES) {
    if (f === '/nix/store') break;
    if (fs.existsSync(f)) return f;
  }
  return null;
}

const fontPath = findFont();
if (fontPath) {
  doc.registerFont('Arabic', fontPath);
}

// Helper: add styled text
function addLine(text: string, opts: {
  size?: number;
  color?: string;
  bold?: boolean;
  indent?: number;
  marginTop?: number;
  marginBottom?: number;
  background?: string;
  borderLeft?: string;
  align?: 'left' | 'right' | 'center';
} = {}) {
  const {
    size = 11,
    color = DARK,
    indent = 0,
    marginTop = 2,
    marginBottom = 2,
    align = 'right',
  } = opts;

  if (marginTop) doc.moveDown(marginTop / 14);

  if (opts.background) {
    const y = doc.y;
    doc.rect(45, y - 2, 505, size + 10).fill(opts.background);
    doc.fillColor(color);
  }

  doc
    .fontSize(size)
    .fillColor(color)
    .text(text, 50 + indent, doc.y, {
      width: 495 - indent,
      align,
      lineGap: 4,
    });

  if (marginBottom) doc.moveDown(marginBottom / 14);
}

function drawHRule(color = '#DDDDDD') {
  doc.moveDown(0.3);
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor(color)
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.3);
}

function drawAccentBar(text: string) {
  const y = doc.y;
  doc.rect(50, y, 5, 20).fill(GOLD);
  doc.rect(55, y, 490, 20).fill(LIGHT_BG);
  doc.fillColor(NAVY).fontSize(13).text(text, 65, y + 4, { width: 475, align: 'right' });
  doc.y = y + 26;
}

// ── Parse and render ──────────────────────────────────────────────────────────

let inTable = false;
let tableHeaders: string[] = [];
let tableRows: string[][] = [];
let inCode = false;
let codeLines: string[] = [];

function flushTable() {
  if (tableRows.length === 0) { inTable = false; tableHeaders = []; tableRows = []; return; }
  const colCount = tableHeaders.length;
  const colW = 495 / colCount;
  const startX = 50;

  // Header row
  let y = doc.y + 4;
  doc.rect(startX, y, 495, 18).fill(NAVY);
  tableHeaders.forEach((h, i) => {
    doc.fillColor('#FFFFFF').fontSize(10)
      .text(h.trim(), startX + (colCount - 1 - i) * colW, y + 3, { width: colW - 4, align: 'right' });
  });
  y += 18;

  // Data rows
  tableRows.forEach((row, ri) => {
    if (y > 750) { doc.addPage(); y = 50; }
    const bg = ri % 2 === 0 ? '#FFFFFF' : LIGHT_BG;
    doc.rect(startX, y, 495, 18).fill(bg);
    row.forEach((cell, i) => {
      doc.fillColor(DARK).fontSize(9.5)
        .text(cell.trim(), startX + (colCount - 1 - i) * colW, y + 3, { width: colW - 4, align: 'right' });
    });
    y += 18;
  });
  doc.y = y + 6;
  inTable = false; tableHeaders = []; tableRows = [];
}

function flushCode() {
  const text = codeLines.join('\n');
  const lineH = 13;
  const height = codeLines.length * lineH + 16;
  doc.rect(50, doc.y, 495, height).fill('#F0F0F0');
  doc.fillColor('#333333').fontSize(8.5).text(text, 55, doc.y + 8, {
    width: 485, align: 'left', lineGap: 2,
  });
  doc.y += height + 4;
  inCode = false; codeLines = [];
}

for (const raw of lines) {
  const line = raw;

  // Code fence
  if (line.startsWith('```')) {
    if (inCode) { flushCode(); }
    else { inCode = true; codeLines = []; }
    continue;
  }
  if (inCode) { codeLines.push(line); continue; }

  // HR
  if (/^---+$/.test(line.trim())) {
    if (inTable) flushTable();
    drawHRule();
    continue;
  }

  // Table detection
  if (line.trim().startsWith('|')) {
    const cells = line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
    if (/^[\s|:-]+$/.test(line)) { continue; } // separator row
    if (!inTable) {
      inTable = true;
      tableHeaders = cells;
    } else {
      tableRows.push(cells);
    }
    continue;
  } else if (inTable) {
    flushTable();
  }

  // Skip empty
  if (line.trim() === '') { doc.moveDown(0.4); continue; }

  // H1
  if (line.startsWith('# ')) {
    const text = line.replace(/^# /, '');
    doc.moveDown(0.5);
    doc.rect(50, doc.y, 495, 30).fill(NAVY);
    doc.fillColor('#FFFFFF').fontSize(16).text(text, 55, doc.y + 7, { width: 485, align: 'right' });
    doc.y += 36;
    doc.rect(50, doc.y, 495, 3).fill(GOLD);
    doc.y += 8;
    continue;
  }

  // H2
  if (line.startsWith('## ')) {
    const text = line.replace(/^## /, '');
    doc.moveDown(0.6);
    drawAccentBar(text);
    continue;
  }

  // H3
  if (line.startsWith('### ')) {
    const text = line.replace(/^### /, '').replace(/^[🏨📱🌐🔧🔴🟡🟢🔵]\s*/, '');
    const emoji = line.match(/^### ([🏨📱🌐🔧🔴🟡🟢🔵])/)?.[1] ?? '';
    doc.moveDown(0.4);
    doc.fillColor(NAVY).fontSize(13).text((emoji ? emoji + ' ' : '') + text, 50, doc.y, { width: 495, align: 'right' });
    doc.rect(50, doc.y + 2, 495, 1).fill(GOLD);
    doc.y += 6;
    continue;
  }

  // H4
  if (line.startsWith('#### ')) {
    const text = line.replace(/^#### /, '');
    doc.moveDown(0.3);
    doc.fillColor(GRAY).fontSize(11).text(text, 50, doc.y, { width: 495, align: 'right' });
    continue;
  }

  // Blockquote
  if (line.startsWith('> ')) {
    const text = line.replace(/^> /, '');
    const y = doc.y + 2;
    doc.rect(50, y, 4, 28).fill(GOLD);
    doc.rect(54, y, 491, 28).fill('#FFFBF0');
    doc.fillColor(GRAY).fontSize(10).text(text, 60, y + 6, { width: 480, align: 'right', lineGap: 3 });
    doc.y = y + 34;
    continue;
  }

  // List items
  if (/^[-*]\s/.test(line)) {
    const text = line.replace(/^[-*]\s/, '• ').replace(/\*\*(.+?)\*\*/g, '$1');
    doc.fillColor(DARK).fontSize(10.5).text(text, 60, doc.y, { width: 480, align: 'right', lineGap: 3 });
    continue;
  }

  // Numbered list
  if (/^\d+\.\s/.test(line)) {
    const text = line.replace(/\*\*(.+?)\*\*/g, '$1');
    doc.fillColor(DARK).fontSize(10.5).text(text, 60, doc.y, { width: 480, align: 'right', lineGap: 3 });
    continue;
  }

  // Normal paragraph (strip markdown bold/italic)
  const text = line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/^_(.+?)_$/, '$1');
  doc.fillColor(DARK).fontSize(10.5).text(text, 50, doc.y, { width: 495, align: 'right', lineGap: 3 });
}

if (inTable) flushTable();
if (inCode) flushCode();

doc.end();

out.on('finish', () => {
  console.log('✅ PDF saved to', outPath);
});
out.on('error', (e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
