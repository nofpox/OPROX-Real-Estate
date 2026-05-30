---
name: i18n language architecture
description: How to add new languages; what files to touch; RTL detection; generation script.
---

## Central config
`artifacts/hotel-dashboard/src/i18n/languages.ts` — single source of truth for all supported languages. Contains code, name, nativeName, flag emoji, and dir (ltr/rtl).

## Adding a new language (3 steps)
1. Add entry to `languages.ts` LANGUAGES array
2. Run: `cd /home/runner/workspace && scripts/node_modules/.bin/tsx scripts/src/generate-locale.ts <code>`
3. Import the generated file in `src/i18n/index.ts` and add to RESOURCES map

## Locale files
- `src/i18n/locales/en.ts` — master (type source, `export type Translations = typeof en`)
- `src/i18n/locales/ar.ts` — fully translated Arabic
- `src/i18n/locales/ur.ts` and `hi/tl/id/bn/ml/ne/th.ts` — auto-generated English placeholders (need translation)
- New locale files are TypeScript satisfying `Translations` type

## RTL detection
`RTL_LANGS` set in `languages.ts` (currently: ar, ur). `language-context.tsx` sets `document.documentElement.dir` when language changes.

## Language switcher
`src/components/language-switcher.tsx` — dropdown showing flag + native name + English name. Shows a check mark on active language. Scrollable for 10+ languages.

**Why:** The old binary toggle (en ↔ ar) couldn't scale beyond 2 languages. The new system uses a dropdown driven by the LANGUAGES array, so adding to the config auto-populates the UI.

**How to apply:** Whenever a new language is requested, follow the 3-step process above. Never hardcode language lists in the switcher or context — everything derives from `languages.ts`.
