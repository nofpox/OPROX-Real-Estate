/**
 * Lightweight in-process TTL cache.
 *
 * Purpose: avoid redundant DB round-trips for hot public endpoints
 * (listings list, listing detail, portal property stats).
 *
 * Not shared across cluster workers — each worker keeps its own copy.
 * That is intentional: the working set per worker is small and the TTL
 * is short enough that minor cross-worker inconsistency is acceptable.
 */

interface CacheEntry<T> {
  value:     T;
  expiresAt: number;
}

class TtlCache {
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

  /** Remove all keys that start with the given prefix. Returns count deleted. */
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
}

// ── Singleton caches ──────────────────────────────────────────────────────────
export const listingsCache = new TtlCache();
export const portalCache   = new TtlCache();

export const TTL = {
  LISTINGS_LIST:  60_000,  //  60 s — public list, varies by filter combo
  LISTINGS_ITEM:  60_000,  //  60 s — view-count increment is fire-and-forget
  PORTAL_PROPS:  120_000,  // 120 s — per-property occupancy stats (N+1 queries)
} as const;

/** Build a stable cache key from a query-param map (order-independent). */
export function queryCacheKey(prefix: string, query: Record<string, unknown>): string {
  const sorted = Object.keys(query)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      if (query[k] !== undefined && query[k] !== "") acc[k] = query[k];
      return acc;
    }, {});
  return `${prefix}:${JSON.stringify(sorted)}`;
}
