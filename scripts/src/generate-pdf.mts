import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(__dirname, "../../../docs/housin-investment-brief.html");
const pdfPath  = path.resolve(__dirname, "../../../docs/housin-investment-brief.pdf");

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage();
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0", timeout: 60000 });

// Wait for Google Fonts
await new Promise(r => setTimeout(r, 2500));

await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
  displayHeaderFooter: false,
});

await browser.close();
console.log("PDF saved to:", pdfPath);
const stat = fs.statSync(pdfPath);
console.log("Size:", Math.round(stat.size / 1024), "KB");
