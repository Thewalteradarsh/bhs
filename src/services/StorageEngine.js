import { get, set, del } from 'idb-keyval';

/**
 * StorageEngine: Asynchronous IndexedDB wrapper for Zustand.
 * Provides high-capacity storage escaping the 5MB localStorage limit.
 * Implements a 50MB hard-cap defensive pruning strategy.
 */
export const StorageEngine = {
  getItem: async (name) => {
    try {
      const value = await get(name);
      return value || null;
    } catch (e) {
      console.warn('[StorageEngine] getItem Error:', e);
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      // Hard cap logic: ~50MB string length is roughly 50,000,000 characters
      if (typeof value === 'string' && value.length > 50000000) {
        console.warn('[StorageEngine] 50MB Cap Exceeded! Implementing emergency LRU pruning...');
        
        try {
           const parsed = JSON.parse(value);
           // Aggressively prune the history array if it exists
           if (parsed?.state?.recentHistory) {
              parsed.state.recentHistory = parsed.state.recentHistory.slice(0, 10);
           }
           // Re-serialize the pruned state
           const prunedValue = JSON.stringify(parsed);
           await set(name, prunedValue);
           return;
        } catch(parseErr) {
           console.error('[StorageEngine] Prune failed, falling back to raw save:', parseErr);
        }
      }
      
      await set(name, value);
    } catch (e) {
      console.error('[StorageEngine] setItem Error:', e);
    }
  },
  removeItem: async (name) => {
    try {
      await del(name);
    } catch (e) {
      console.error('[StorageEngine] removeItem Error:', e);
    }
  }
};
