import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const exportsDir = path.resolve(root, 'exports');

const studies = [
  {
    html: path.join(exportsDir, 'rozoz-feasibility-study.html'),
    pdf:  path.join(exportsDir, 'rozoz-feasibility-study.pdf'),
    name: 'دراسة الجدوى الاقتصادية',
  },
  {
    html: path.join(exportsDir, 'rozoz-platform-study.html'),
    pdf:  path.join(exportsDir, 'rozoz-platform-study.pdf'),
    name: 'دراسة المنصة',
  },
];

async function main() {
  console.log('🚀 تشغيل المتصفح...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });

  for (const study of studies) {
    if (!fs.existsSync(study.html)) {
      console.error(`❌ ملف HTML غير موجود: ${study.html}`);
      continue;
    }

    console.log(`\n📄 جاري توليد: ${study.name}`);
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ar-SA,ar;q=0.9' });

    const fileUrl = `file://${study.html}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    await page.waitForTimeout(2000);

    await page.pdf({
      path: study.pdf,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: false,
    });

    const size = fs.statSync(study.pdf).size;
    console.log(`✅ تم الحفظ: ${study.pdf} (${Math.round(size / 1024)} KB)`);
    await page.close();
  }

  await browser.close();
  console.log('\n🎉 اكتمل توليد جميع الملفات!');
}

main().catch((err) => {
  console.error('❌ خطأ:', err.message);
  process.exit(1);
});
