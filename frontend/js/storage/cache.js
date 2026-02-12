/**
 * Client-side caching layer — localStorage/IndexedDB wrapper with TTL expiration.
 */

const CACHE_PREFIX = 'profiteer_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export const cache = {
  set(key, data, ttl = DEFAULT_TTL) {
    const entry = {
      data,
      expires: Date.now() + ttl,
    };
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // Storage full — clear expired entries and retry
      this.clearExpired();
      try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
      } catch {
        // Still full — give up silently
      }
    }
  },

  get(key) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (Date.now() > entry.expires) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  },

  remove(key) {
    localStorage.removeItem(CACHE_PREFIX + key);
  },

  clearExpired() {
    const now = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const entry = JSON.parse(localStorage.getItem(key));
          if (now > entry.expires) {
            localStorage.removeItem(key);
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
    }
  },

  clearAll() {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  },
};
