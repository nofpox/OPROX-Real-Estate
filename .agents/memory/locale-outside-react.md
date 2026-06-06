---
name: Locale-aware strings outside React (rkz)
description: How to localize system-generated messages in AppContext where the useLocale hook can't run
---

# Locale-aware text outside React components (rkz Expo)

`useLocale()` is a hook — it can't be called in plain functions (context
callbacks, effects, module helpers). System-generated, user-facing strings
(e.g. auto tenant notifications, payment confirmations) must NOT be hardcoded in
one language or English-locale users see the wrong language.

**How to apply:** Replicate the hook's device-locale resolution directly:
```ts
import * as Localization from "expo-localization";
import { ar, en } from "@/constants/i18n";
function leaseStrings() {
  const lang = Localization.getLocales()[0]?.languageCode ?? "ar";
  return (lang === "ar" ? ar : en).lease;
}
```
Add the message templates as function-valued keys (e.g. `notifyDueMsg(name,
amount, days, due)`) in the i18n `lease` section of BOTH `ar` and `en`. Since
`Translations = typeof ar`, any key added to `ar` must be mirrored in `en`.

**Why:** `useLocale` itself just reads `Localization.getLocales()` — there is no
stored language preference in rkz, so this is a faithful mirror, not a hack.
