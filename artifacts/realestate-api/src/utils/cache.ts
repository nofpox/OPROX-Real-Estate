interface CacheEntry<T> { value: T; expiresAt: number; }

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) { this.store.delete(key); return undefined; }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) { this.store.delete(key); count++; }
    }
    return count;
  }

  get size() { return this.store.size; }
}

export const TTL = {
  LISTINGS_LIST: 60_000,
  LISTINGS_ITEM: 120_000,
  CMS:           300_000,
  PORTAL_PROPS:  60_000,
};

export const listingsCache = new MemoryCache();
export const cmsCache      = new MemoryCache();
export const portalCache   = new MemoryCache();

export function queryCacheKey(prefix: string, params: Record<string, unknown>): string {
  return `${prefix}:${JSON.stringify(params)}`;
}
