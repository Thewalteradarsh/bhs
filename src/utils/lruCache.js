/**
 * LRUCache
 * A robust Least Recently Used cache implementation using a JavaScript Map.
 * Maps maintain insertion order, making O(1) evictions possible.
 */
export class LRUCache {
  constructor(maxSize = 100, ttlMs = 15 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const item = this.cache.get(key);
    
    // Evaluate TTL
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position to mark as recently used (moveToEnd)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first item in the Map iterator)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttlMs
    });
  }

  clear() {
    this.cache.clear();
  }
}

// Singleton instance for the application
export const appCache = new LRUCache();
