---
name: gpt-5-mini token limit quirk
description: Replit AI proxy gpt-5-mini rejects max_tokens and silently returns empty string for max_completion_tokens — omit both for reliable completions.
---

# gpt-5-mini Token Limit Quirk (Replit AI Proxy)

## The Rule
When using `gpt-5-mini` via `resolveAiClient()` + Replit AI integration proxy, **omit all token limit parameters**.

## What Happens

- `max_tokens: N` → **Hard 400 error**: "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead."
- `max_completion_tokens: N` → **Silent failure**: call succeeds (HTTP 200), but `choices[0].message.content` is `""` (empty string). No error thrown.
- No token limit → Works correctly, returns full structured JSON response.

**Why:** The Replit AI proxy layer translates model calls; `gpt-5-mini` through this proxy does not forward either token-limit parameter correctly.

## How to Apply
Any new route that calls `resolveAiClient()` with `gpt-5-mini` (the default fallback in `resolveAiModel`): use `chat.completions.create({ model, messages })` with no token limit field. The system prompt should be concise enough that the model naturally stops at a reasonable length.

## Debugging Pattern
If an AI route returns all-default values (e.g. `eligibility_score: 0`, empty strings), add `req.log.info({ raw }, "debug")` to inspect `choices[0]?.message?.content`. An empty `raw: ""` means token-limit truncation or a silent proxy rejection — try removing the limit parameter.
