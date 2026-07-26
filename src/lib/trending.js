/**
 * Trending tracks client-side cache layer.
 *
 * Strategy:
 *   1. On first load  → fetch from /api/trending, store in localStorage
 *   2. On re-open     → serve instantly from localStorage (no network call)
 *   3. After 24 hours → silently re-fetch in background and update cache
 *
 * Cache keys: hear_trending_[lang]
 */

const CACHE_TTL_MS  = 12 * 60 * 60 * 1000; // 12 hours
const getCacheKey = (lang) => `hear_trending_${lang}`;

// ── localStorage helpers ──────────────────────────────────────────────────────

function readCache(lang) {
  try {
    const raw = localStorage.getItem(getCacheKey(lang));
    if (!raw) return null;
    const { tracks, savedAt } = JSON.parse(raw);
    if (!Array.isArray(tracks) || !savedAt) return null;
    return { tracks, savedAt, isStale: (Date.now() - savedAt) > CACHE_TTL_MS };
  } catch {
    return null;
  }
}

function writeCache(lang, tracks) {
  try {
    localStorage.setItem(
      getCacheKey(lang),
      JSON.stringify({ tracks, savedAt: Date.now() })
    );
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

// ── Network fetch ─────────────────────────────────────────────────────────────

async function fetchFromServer(lang, forceRefresh = false) {
  const baseUrl = 'https://hear.beatzadgaming.workers.dev';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  
  try {
    const res = await fetch(`${baseUrl}/api/top-charts?lang=${lang}${forceRefresh ? '&force=true' : ''}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`/api/top-charts?lang=${lang} returned ${res.status}`);

    const json   = await res.json();
    const tracks = Array.isArray(json.tracks) ? json.tracks : [];

    if (json.source)  console.info(`[trending:${lang}] source=${json.source} count=${json.count}`);
    if (json.warning) console.warn(`[trending:${lang}] server warning:`, json.warning);

    return tracks;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ── Main fetch function ───────────────────────────────────────────────────────

/**
 * Returns trending tracks for the given language.
 *
 * - Instant if cached and fresh (< 24h)
 * - Background refresh if cached but stale (returns old data immediately, updates cache silently)
 * - Network fetch if no cache at all
 */
async function fetchTrending(lang, forceRefresh = false) {
  const cached = readCache(lang);

  // ── Fresh cache: return immediately, no network call ─────────────────────
  if (!forceRefresh && cached && !cached.isStale) {
    console.info(`[trending:${lang}] served from localStorage cache`);
    return cached.tracks;
  }

  // ── Stale cache: return old data NOW, refresh in background ──────────────
  if (!forceRefresh && cached && cached.isStale) {
    console.info(`[trending:${lang}] stale cache — returning immediately, refreshing in background`);

    // Background refresh (don't await)
    fetchFromServer(lang, false)
      .then(tracks => {
        if (tracks.length > 0) {
          writeCache(lang, tracks);
          console.info(`[trending:${lang}] background cache refreshed (${tracks.length} tracks)`);
        }
      })
      .catch(err => console.warn(`[trending:${lang}] background refresh failed:`, err.message));

    return cached.tracks; // return stale data instantly
  }

  // ── No cache (or force refresh): fetch from server, save, return ──────────────
  try {
    console.info(`[trending:${lang}] no cache or force refresh — fetching from server`);
    const tracks = await fetchFromServer(lang, forceRefresh);
    if (tracks.length > 0) writeCache(lang, tracks);
    return tracks;
  } catch (err) {
    console.warn(`[trending:${lang}] fetch failed:`, err.message);
    return forceRefresh && cached ? cached.tracks : [];
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────
export const fetchTrendingMalayalam = () => fetchTrending('malayalam');
export const fetchTrendingTamil = () => fetchTrending('tamil');

export { fetchTrending };

/** Call this to force a cache clear (e.g. from Settings) */
export function clearTrendingCache(lang) {
  try {
    if (lang) {
      localStorage.removeItem(getCacheKey(lang));
    } else {
      // Clear all trending caches
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('hear_trending_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch {}
}
