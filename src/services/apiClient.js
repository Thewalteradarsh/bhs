import axios from 'axios';

/**
 * Ordered list of known-active JioSaavn-compatible API mirrors.
 *
 * Rules for this list:
 *   - Only add hosts that serve a real JioSaavn API (song search, stream URLs).
 *   - Do NOT add hear-pwa.pages.dev — it is the Cloudflare *frontend*, not an API.
 *   - Do NOT add saavnapi-nine.vercel.app — it is dead (HTTP 500).
 *   - Prefer hosts that respond to both /api/search/songs and /search/songs paths.
 *   - Place the most reliable / fastest host first.
 */
// Clean up list of mirrors
const baseMirrors = [
  'https://saavn.sumit.co',
  'https://jiosaavn-api-2.vercel.app',
  'https://jio-saavn-api.vercel.app',
  'https://jiosaavn-api-v3.vercel.app'
];

// Prepend the user's custom API from .env if defined
const customApi = import.meta.env.VITE_JIOSAAVN_API_URL;
export const API_ENDPOINTS = customApi 
  ? [customApi.replace(/\/$/, ''), ...baseMirrors] 
  : baseMirrors;

/** Base URL for the Hear Cloudflare Worker — handles /result/, /api/yt-search, etc.
 *  During local dev, we proxy /result/ and /api/ locally to bypass CORS & geo-restrictions.
 */
export const HEAR_WORKER_BASE = import.meta.env.DEV ? '' : 'https://hear-pwa.pages.dev';

/** Default per-request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Primary axios client — kept pointing at the Hear worker for
 * internal endpoints (/result/, /api/yt-search, etc.) that are
 * served by the worker rather than the public mirrors.
 */
const apiClient = axios.create({
  baseURL: HEAR_WORKER_BASE,
  timeout: REQUEST_TIMEOUT_MS,
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Client Error:', error.message);
    return Promise.reject(error);
  }
);

/**
 * Wraps a fetch() call with an explicit timeout using Promise.race.
 * @param {string} url - Full URL to fetch
 * @param {RequestInit} options - fetch options
 * @param {number} timeoutMs - abort after this many milliseconds
 * @returns {Promise<Response>}
 */
export const fetchWithTimeout = (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};

/**
 * Retryable fetch across multiple base-URL mirrors.
 * Tries each endpoint in `API_ENDPOINTS` in order.
 * A request is retried when it:
 *   - Throws a network / abort error
 *   - Returns HTTP 503 / 429
 *
 * @param {string} path   - Relative path on each mirror, e.g. '/api/search/songs?query=...'
 *                          Do NOT pass /api/spotify-import — Saavn mirrors don't host that route.
 * @param {RequestInit} options - fetch options (method, headers, body …)
 * @param {number} timeoutMs - per-attempt timeout
 * @returns {Promise<Response>} The first successful Response
 */
export const fetchWithFallback = async (path, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  let lastError;
  for (const base of API_ENDPOINTS) {
    const url = `${base}${path}`;
    try {
      const res = await fetchWithTimeout(url, options, timeoutMs);
      // Retry on server errors (500 = dead/sleeping Vercel deployment) and
      // rate-limit / gateway errors (429, 503). All other statuses are returned
      // as-is so the caller can decide what to do (e.g. 404 = not found).
      if (res.status === 500 || res.status === 503 || res.status === 429) {
        console.warn(`[fetchWithFallback] ${base} returned ${res.status}, trying next mirror…`);
        lastError = new Error(`HTTP ${res.status} from ${base}`);
        continue;
      }
      return res;
    } catch (err) {
      console.warn(`[fetchWithFallback] ${base} failed (${err.message}), trying next mirror…`);
      lastError = err;
    }
  }
  throw lastError ?? new Error('All API mirrors exhausted');
};

/**
 * Safely parse a Response as JSON.
 * Guards against servers that return HTML error pages (e.g. Cloudflare 5xx,
 * nginx default pages) instead of JSON — which would otherwise throw:
 *   "SyntaxError: Unexpected token '<', "<!doctype..." is not valid JSON"
 *
 * @param {Response} res - A fetch Response object
 * @returns {Promise<any>} Parsed JSON body
 * @throws {Error} If the Content-Type is not application/json
 */
export const safeJson = async (res) => {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error(
      `Expected JSON but got "${ct || 'unknown content-type'}" from ${res.url}`
    );
  }
  return res.json();
};

export default apiClient;
