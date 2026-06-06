---
name: Date-only storage UTC shift
description: Why date-only YYYY-MM-DD math must use a local formatter, never toISOString().slice(0,10)
---

# Date-only arithmetic must stay in local time

When computing/storing date-only values (e.g. lease next-due dates, "today" for
day-diff alerts), do NOT round-trip through `toISOString().slice(0, 10)`.

**Why:** `new Date(dateStr + "T00:00:00")` builds a *local* midnight. `toISOString()`
converts to UTC, so in UTC+ locales (KSA = UTC+3) a local midnight becomes the
previous day at 21:00 UTC, and `.slice(0,10)` yields the wrong calendar date.
This produced off-by-one due dates / alert windows in the rkz lease tool.

**How to apply:** Use a local formatter:
```ts
function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
```
Keep YYYY-MM-DD semantics end-to-end. This pairs with the existing project rule
to always parse date-only strings with `new Date(dateStr + "T00:00:00")`.

Related: date-string validation must also reject auto-normalized impossible dates
(e.g. 2026-02-31 silently rolls to Mar 3) by re-comparing parsed Y/M/D back to the
input parts.
