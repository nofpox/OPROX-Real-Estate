/**
 * Server-side caching layer.
 *
 * Architecture: a CacheDriver interface lets callers stay decoupled from the
 * backing store. Two implementations are provided:
 *
 *   MemoryCache        — single-process TTL Map; zero-dependency, always present.
 *   RedisBackedCache   — write-through L1/L2 cache; L1 = MemoryCache (sync fast
 *                        path), L2 = Redis (cross-worker consistency + restart
 *                        persistence). L2 operations are fire-and-forget so the
 *                        synchronous CacheDriver interface is preserved.
 *
 * At boot, if REDIS_URL is set the singleton caches use RedisBackedCache;
 * otherwise they fall back to MemoryCache (zero config, no crashes).
 */

import type { Redis as RedisClient } from "ioredis";

// ── Driver interface (synchronous — callers need no await) ────────────────────

export interface CacheDriver {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
  /** Remove all keys whose name starts with `prefix`. Returns count deleted. */
  invalidatePrefix(prefix: string): number;
  /** Current number of entries (may include stale ones not yet evicted). */
  readonly size: number;
}

// ── In-process memory implementation ─────────────────────────────────────────

interface CacheEntry<T> {
  value:     T;
  expiresAt: number;
}

class MemoryCache implements CacheDriver {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  get size(): number {
    return this.store.size;
  }

  /** Evict all entries that have already expired. */
  purgeExpired(): number {
    const now  = Date.now();
    let   purged = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        purged++;
      }
    }
    return purged;
  }
}

// ── Redis-backed write-through cache ─────────────────────────────────────────
//
// L1 (MemoryCache) is always checked first — sync, sub-ms.
// L2 (Redis) is used for cross-worker consistency:
//   • GET:  on L1 miss, schedule a background Redis fetch to warm L1 for the
//           NEXT request.  The current request falls through to the DB.
//   • SET:  write to L1 immediately; write to Redis asynchronously.
//   • DEL:  invalidate L1 immediately; delete from Redis asynchronously.
//
// All Redis I/O is wrapped in .catch(() => {}) so a Redis outage degrades
// gracefully to pure in-memory caching — no errors surface to callers.

class RedisBackedCache implements CacheDriver {
  private mem = new MemoryCache();

  constructor(private redis: RedisClient) {}

  get<T>(key: string): T | undefined {
    const hit = this.mem.get<T>(key);
    if (hit !== undefined) return hit;

    // Background: warm L1 from Redis for the next request
    this.redis.get(key).then((raw) => {
      if (!raw) return;
      try {
        const payload = JSON.parse(raw) as { v: T; exp: number };
        const remaining = payload.exp - Date.now();
        if (remaining > 0) this.mem.set(key, payload.v, remaining);
      } catch { /* corrupt entry — ignore */ }
    }).catch(() => {});

    return undefined;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.mem.set(key, value, ttlMs);
    const payload = JSON.stringify({ v: value, exp: Date.now() + ttlMs });
    this.redis.set(key, payload, "PX", ttlMs).catch(() => {});
  }

  invalidatePrefix(prefix: string): number {
    const count = this.mem.invalidatePrefix(prefix);
    this.redis.keys(`${prefix}*`).then((keys) => {
      if (keys.length) this.redis.del(...keys).catch(() => {});
    }).catch(() => {});
    return count;
  }

  get size(): number {
    return this.mem.size;
  }
}

// ── Redis client singleton ────────────────────────────────────────────────────

function makeDriver(): CacheDriver {
  const url = process.env.REDIS_URL;
  if (!url) return new MemoryCache();

  try {
    // Dynamic import so the module resolves even if ioredis isn't installed
    // (shouldn't happen in prod, but protects dev environments).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: Redis } = require("ioredis") as { default: typeof import("ioredis").default };
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: false,
    });
    client.on("error", () => { /* swallow — graceful degradation */ });
    return new RedisBackedCache(client);
  } catch {
    return new MemoryCache();
  }
}

// ── Singleton caches ───────────────────────────────────────────────────────────

/** Listings list + detail (public, filterable). */
export const listingsCache     = makeDriver();

/** Portal property summaries (authenticated). */
export const portalCache       = makeDriver();

/** Room availability windows (authenticated, short TTL). */
export const availabilityCache = makeDriver();

// ── TTL constants (milliseconds) ──────────────────────────────────────────────

export const TTL = {
  LISTINGS_LIST:    60_000,   //  60 s — varies by filter combo
  LISTINGS_ITEM:    60_000,   //  60 s — view-count is fire-and-forget
  PORTAL_PROPS:    120_000,   // 120 s — occupancy stats (N+1 queries)
  PORTAL_BOOKINGS:  30_000,   //  30 s — recent mutations should surface quickly
  AVAILABILITY:     30_000,   //  30 s — must stay near-real-time for bookings
  FINANCIALS:      300_000,   // 300 s —  5 min, historical aggregations
  PROPERTIES:      120_000,   // 120 s — property list (mutates infrequently)
} as const;

// ── Cache key builders ─────────────────────────────────────────────────────────

/** Build a stable cache key from a query-param map (order-independent). */
export function queryCacheKey(
  prefix: string,
  query:  Record<string, unknown>,
): string {
  const sorted = Object.keys(query)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      if (query[k] !== undefined && query[k] !== "") acc[k] = query[k];
      return acc;
    }, {});
  return `${prefix}:${JSON.stringify(sorted)}`;
}

/** Availability key — property-scoped so invalidation can target one property. */
export function availKey(propId: number, checkIn: string, checkOut: string): string {
  return `avail:${propId}:${checkIn}:${checkOut}`;
}

/** Financials key. */
export function financialsKey(tenantId: number | null, propertyId: string | undefined, months: number): string {
  return `fin:${tenantId ?? "all"}:${propertyId ?? "all"}:${months}`;
}

/** Properties list key. */
export function propertiesCacheKey(tenantId: number | null): string {
  return `props:${tenantId ?? "pub"}`;
}

// ── Cache statistics ───────────────────────────────────────────────────────────

/** Snapshot of all cache stores — useful for a /api/cache/stats debug route. */
export function cacheStats() {
  return {
    listings:     { size: listingsCache.size },
    portal:       { size: portalCache.size },
    availability: { size: availabilityCache.size },
  };
}

// ── Background eviction (MemoryCache instances only) ──────────────────────────
// Runs every 5 minutes to free memory from stale entries without a GC scan
// on every get(). RedisBackedCache uses Redis TTL for automatic eviction.

setInterval(() => {
  if (listingsCache     instanceof MemoryCache) (listingsCache     as unknown as { purgeExpired(): number }).purgeExpired?.();
  if (portalCache       instanceof MemoryCache) (portalCache       as unknown as { purgeExpired(): number }).purgeExpired?.();
  if (availabilityCache instanceof MemoryCache) (availabilityCache as unknown as { purgeExpired(): number }).purgeExpired?.();
}, 5 * 60_000).unref();
