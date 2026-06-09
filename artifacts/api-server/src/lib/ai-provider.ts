/**
 * Swappable AI Provider Resolver
 *
 * Architecture: each tenant can configure their own AI provider (api_key, base_url, model)
 * stored in the settings table. If none is configured, the request falls back to the
 * internal proprietary Replit-managed client — whose key is never stored in the DB
 * and never exposed via any API endpoint.
 *
 * This makes Rozoz PMS white-label ready: licensed copies use their own AI key;
 * the internal Rozoz intelligence remains a secure, private asset.
 */

import OpenAI from "openai";
import { openai as internalOpenAI } from "@workspace/integrations-openai-ai-server";
import { db, settingsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const PROVIDER_KEYS = ["ai_api_key", "ai_base_url", "ai_model"] as const;
type ProviderKey = (typeof PROVIDER_KEYS)[number];

interface TenantAiConfig {
  apiKey?:  string;
  baseURL?: string;
  model?:   string;
}

// ── Per-tenant client cache (TTL: 5 min) ────────────────────────────────────
const cache = new Map<number, { client: OpenAI; cfg: TenantAiConfig; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

/** Force-expire a tenant's cached client — call after saving new provider settings */
export function invalidateTenantAiCache(tenantId: number): void {
  cache.delete(tenantId);
}

async function loadConfig(tenantId: number): Promise<TenantAiConfig> {
  const rows = await db
    .select({ key: settingsTable.key, value: settingsTable.value })
    .from(settingsTable)
    .where(and(eq(settingsTable.tenantId, tenantId), inArray(settingsTable.key, [...PROVIDER_KEYS])));
  const s = Object.fromEntries(rows.map(r => [r.key as ProviderKey, r.value]));
  return { apiKey: s.ai_api_key || undefined, baseURL: s.ai_base_url || undefined, model: s.ai_model || undefined };
}

/**
 * Resolve the OpenAI-compatible client for a tenant.
 *
 * - Tenant has ai_api_key configured → custom client (their own AI subscription)
 * - No key set → internal proprietary Rozoz AI (env-managed, never exposed)
 *
 * Supports any OpenAI-compatible provider: OpenAI, Azure OpenAI, Anthropic
 * (via their compatibility layer), Gemini, Groq, Mistral, Ollama, etc.
 * Just set ai_base_url to the provider's API endpoint.
 */
export async function resolveAiClient(tenantId: number): Promise<OpenAI> {
  const now = Date.now();
  const cached = cache.get(tenantId);
  if (cached && cached.expiresAt > now) return cached.client;

  const cfg = await loadConfig(tenantId);

  if (cfg.apiKey) {
    const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL ?? undefined });
    cache.set(tenantId, { client, cfg, expiresAt: now + CACHE_TTL });
    return client;
  }

  // No custom key — use internal AI; don't cache (internal client never changes)
  return internalOpenAI as unknown as OpenAI;
}

/**
 * Resolve the AI model for a tenant.
 * Returns tenant-configured model, or the provided fallback if none is set.
 */
export async function resolveAiModel(tenantId: number, fallback: string): Promise<string> {
  const now = Date.now();
  const cached = cache.get(tenantId);
  if (cached && cached.expiresAt > now && cached.cfg.model) return cached.cfg.model;

  const rows = await db
    .select({ value: settingsTable.value })
    .from(settingsTable)
    .where(and(eq(settingsTable.tenantId, tenantId), eq(settingsTable.key, "ai_model")))
    .limit(1);

  return rows[0]?.value ?? fallback;
}

/**
 * Read the current tenant AI provider configuration.
 * Returns the key masked (last 4 chars only) for safe display.
 */
export async function readAiProviderConfig(tenantId: number): Promise<{
  hasCustomKey: boolean;
  maskedKey:    string | null;
  baseURL:      string | null;
  model:        string | null;
  provider:     "internal" | "custom";
}> {
  const cfg = await loadConfig(tenantId);
  const hasCustomKey = !!cfg.apiKey;
  return {
    hasCustomKey,
    maskedKey: cfg.apiKey ? `••••••••${cfg.apiKey.slice(-4)}` : null,
    baseURL:   cfg.baseURL ?? null,
    model:     cfg.model   ?? null,
    provider:  hasCustomKey ? "custom" : "internal",
  };
}
