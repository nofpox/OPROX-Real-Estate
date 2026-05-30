---
name: i18n locale compact format pitfall
description: Non-English locale files use single-line compact objects; {{id}} inside values breaks [^}]+ regex patterns
---

Most non-English locale files (bn, hi, id, ml, ne, th, tl, ur) store each section as a compact single-line object, unlike en.ts and ar.ts which use multi-line format.

**The trap:** `taskLabel: "Task #{{id}}"` contains `}` characters, so any regex using `[^}]+?` to find context within the detail block will stop prematurely at the `{{id}}` `}` before reaching the key you want to replace.

**How to apply:** When editing a specific key in a compact locale file's detail block, operate line-by-line — find the line that contains a unique anchor (`taskLabel:` for tasks detail), then do a targeted string replace on that line only. Never rely on `[^}]+?` for spanning context within a compact block.

**Why:** The compact format packs an entire nested object onto one line, making cross-block regex unreliable whenever a value contains `{` or `}`.

Example safe approach:
```js
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('taskLabel:')) {
    lines[i] = lines[i].replace(/(assignedTo: "[^"]*")(, dueDate:)/, '$1, supervisor: "Supervisor"$2');
  }
}
```
