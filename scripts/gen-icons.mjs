import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = '/home/runner/workspace';
const ICON_IN  = resolve(ROOT, '/tmp/rozoz-icon-nobg.png');
const ICON_OUT  = resolve(ROOT, 'artifacts/rkz/assets/images/rozoz-icon.png');
const SPLASH_OUT = resolve(ROOT, 'artifacts/rkz/assets/images/rozoz-splash.png');

const NAVY  = { r: 10,  g: 26,  b: 47,  alpha: 255 };
const SPLASH_W = 2048;
const SPLASH_H = 2732;
const LOGO_SIZE = 680;

// ── 1. App Icon – transparent 1024×1024 ─────────────────────────────────────
await sharp(ICON_IN)
  .resize(1024, 1024, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(ICON_OUT);
console.log('✅ Icon  →', ICON_OUT);

// ── 2. Splash  – navy bg + logo + Arabic / English text ─────────────────────

// 2a. Resize logo for splash (still transparent)
const logoBuffer = await sharp(ICON_IN)
  .resize(LOGO_SIZE, LOGO_SIZE, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

// Centre positions
const logoLeft = Math.round((SPLASH_W - LOGO_SIZE) / 2);
const logoTop  = Math.round(SPLASH_H / 2 - LOGO_SIZE / 2 - 120);

// 2b. SVG text overlay (Arabic + English) – placed below logo
const textTop  = logoTop + LOGO_SIZE + 60;
const textSvg  = Buffer.from(`
<svg width="${SPLASH_W}" height="${SPLASH_H}" xmlns="http://www.w3.org/2000/svg">
  <!-- Arabic: روزوز الذكية -->
  <text
    x="${SPLASH_W / 2}" y="${textTop + 90}"
    font-family="Arial, sans-serif"
    font-size="110"
    font-weight="bold"
    fill="#C9A84C"
    text-anchor="middle"
    dominant-baseline="auto"
  >روزوز الذكية</text>

  <!-- English: ROZOZ Smart Real Estate -->
  <text
    x="${SPLASH_W / 2}" y="${textTop + 230}"
    font-family="Arial, sans-serif"
    font-size="68"
    fill="#C9A84C"
    text-anchor="middle"
    dominant-baseline="auto"
    letter-spacing="3"
  >ROZOZ Smart Real Estate</text>
</svg>`);

// 2c. Compose: navy bg → logo → text
await sharp({
  create: {
    width:    SPLASH_W,
    height:   SPLASH_H,
    channels: 4,
    background: NAVY,
  },
})
  .composite([
    { input: logoBuffer, top: logoTop,  left: logoLeft },
    { input: textSvg,   top: 0,         left: 0        },
  ])
  .png()
  .toFile(SPLASH_OUT);

console.log('✅ Splash →', SPLASH_OUT);
console.log('Done.');
