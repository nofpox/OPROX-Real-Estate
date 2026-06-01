/**
 * Server-side caching layer.
 *
 * Architecture: a CacheDriver interface lets callers stay decoupled from the
 * backing store. The default implementation is a single-process TTL Map — fast,
 * zero-dependency, and adequate for the current single-worker deployment.
 *
 * Redis upgrade path: set REDIS_URL and swap `new MemoryCache()` for
 * `new RedisCache(redisClient)` — the interface is identical and no callers
 * need to change.
 *
 * Cross-worker note: each worker keeps its own in-memory store. Minor
 * cross-worker inconsistency is acceptable; TTLs are short and mutations
 * invalidate immediately in the worker that handled the write.
 */

// ── Driver interface ───────────────────────────────────────────────────────────

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

// ── Singleton caches ───────────────────────────────────────────────────────────

/** Listings list + detail (public, filterable). */
export const listingsCache     = new MemoryCache();

/** Portal property summaries (authenticated). */
export const portalCache       = new MemoryCache();

/** Room availability windows (authenticated, short TTL). */
export const availabilityCache = new MemoryCache();

// ── TTL constants (milliseconds) ──────────────────────────────────────────────

export const TTL = {
  LISTINGS_LIST:    60_000,   //  60 s — varies by filter combo
  LISTINGS_ITEM:    60_000,   //  60 s — view-count is fire-and-forget
  PORTAL_PROPS:    120_000,   // 120 s — occupancy stats (N+1 queries)
  PORTAL_BOOKINGS:  30_000,   //  30 s — recent mutations should surface quickly
  AVAILABILITY:     30_000,   //  30 s — must stay near-real-time for bookings
  FINANCIALS:      300_000,   // 300 s —  5 min, historical aggregations
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

// ── Cache statistics ───────────────────────────────────────────────────────────

/** Snapshot of all cache stores — useful for a /api/cache/stats debug route. */
export function cacheStats() {
  return {
    listings:     { size: listingsCache.size },
    portal:       { size: portalCache.size },
    availability: { size: availabilityCache.size },
  };
}

// ── Background eviction ────────────────────────────────────────────────────────
// Runs every 5 minutes to free memory from stale entries without a GC scan
// on every get().

setInterval(() => {
  listingsCache.purgeExpired();
  portalCache.purgeExpired();
  availabilityCache.purgeExpired();
}, 5 * 60_000).unref();
