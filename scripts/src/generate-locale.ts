/**
 * generate-locale.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates placeholder locale files for the hotel-dashboard from the English
 * master translation. All values start as English — send to a translator.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run generate-locale <lang-code> [...]
 *   pnpm --filter @workspace/scripts run generate-locale ur
 *   pnpm --filter @workspace/scripts run generate-locale hi bn tl id ml ne th
 *
 * Adding a new language in 3 steps:
 *   1. Add it to   src/i18n/languages.ts  (code, name, dir)
 *   2. Run this script with the lang code
 *   3. Import the new file in src/i18n/index.ts
 */

import { writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const WORKSPACE  = resolve(__dirname, "../..");
const LOCALE_DIR = resolve(WORKSPACE, "artifacts/hotel-dashboard/src/i18n/locales");

// ─── Value renderer (produces TypeScript-compatible object literal) ───────────

function renderValue(val: unknown): string {
  if (typeof val === "string") {
    return JSON.stringify(val);
  }
  if (typeof val !== "object" || val === null) {
    return JSON.stringify(val);
  }
  const obj = val as Record<string, unknown>;
  const entries = Object.entries(obj).map(([k, v]) => {
    const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
    return `  ${key}: ${renderValue(v)}`;
  });
  return `{\n${entries.join(",\n")},\n}`;
}

function generateFile(lang: string, en: Record<string, unknown>): string {
  const rendered = renderValue(en);
  return [
    `import type { Translations } from "./en";`,
    ``,
    `// ⚠  Auto-generated placeholder — values are English until translated.`,
    `// Send this file to a ${lang.toUpperCase()} translator; replace each string value.`,
    `// Regenerate:  pnpm --filter @workspace/scripts run generate-locale ${lang}`,
    ``,
    `const ${lang}: Translations = ${rendered};`,
    ``,
    `export default ${lang};`,
    ``,
  ].join("\n");
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2).filter(Boolean);
  if (args.length === 0) {
    console.error("Usage: generate-locale <lang-code> [lang-code2 ...]");
    console.error("Example: pnpm --filter @workspace/scripts run generate-locale ur hi bn");
    process.exit(1);
  }

  console.log("Loading English translations…");
  // tsx handles .ts imports natively — no compilation step needed
  const enPath = resolve(LOCALE_DIR, "en.ts");
  const { default: en } = await import(enPath) as { default: Record<string, unknown> };
  console.log(`  ✓ ${Object.keys(en).length} top-level namespaces\n`);

  for (const lang of args) {
    const outPath = resolve(LOCALE_DIR, `${lang}.ts`);
    if (existsSync(outPath)) {
      console.log(`⚠  Skipping ${lang}.ts — already exists. Delete it first to regenerate.`);
      continue;
    }
    const content = generateFile(lang, en);
    writeFileSync(outPath, content, "utf-8");
    console.log(`✓  Generated locales/${lang}.ts`);
  }

  console.log("\nNext steps:");
  console.log("  1. Import the new locale(s) in src/i18n/index.ts");
  console.log("  2. Typecheck: pnpm --filter @workspace/hotel-dashboard run typecheck");
}

main().catch((err) => { console.error(err); process.exit(1); });
