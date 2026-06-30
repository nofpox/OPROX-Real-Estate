---
name: Tripo3D model_version format
description: Tripo3D text_to_model API rejects bare version strings; requires date-suffixed enum value
---

`model_version` in the Tripo3D `/v2/openapi/task` request body must be a date-suffixed enum string (e.g. `v2.5-20250123`), not a bare string like `v2.5`. A bare value fails with `The version value is invalid`.

**Why:** Tripo3D's API schema defines `ModelVersion` as a string enum of exact dated values (`v2.5-20250123`, `v3.0-20250812`, `v3.1-20260211`, `Turbo-v1.0-20250506`, `P1-20260311`, etc.), not semantic-version-style strings.

**How to apply:** When setting/changing `model_version` for Tripo3D `text_to_model` (or any) tasks, always use the full dated value. Current working value in `artifacts/rkz/components/AIArchitectViewImpl.tsx` is `v2.5-20250123`. If Tripo3D updates which versions are valid, re-check via web search before hardcoding — do not guess a bare string.
