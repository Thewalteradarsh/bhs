import { appCache } from './lruCache';

// Configuration
const BASE_URL = import.meta.env.VITE_API_URL || 'https://saavn.dev/api';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500; // 500ms, 1s, 2s

/**
 * Helper to delay execution for exponential backoff
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Advanced API Client with caching, retry logic, and abort control.
 * Designed to prevent race conditions and excessive API calls.
 */
class ApiClient {
  constructor() {
    this.abortControllers = new Map();
  }

  /**
   * Core fetch method with exponential backoff and caching.
   * @param {string} endpoint - API endpoint (e.g. /search/songs)
   * @param {object} options - Fetch options, query params, etc.
   * @param {object} config - Custom config { disableCache: boolean, abortKey: string }
   */
  async fetch(endpoint, options = {}, config = {}) {
    const { disableCache = false, abortKey = null, retries = MAX_RETRIES } = config;
    
    // 1. Build URL and query parameters
    const url = new URL(endpoint, BASE_URL);
    if (options.params) {
      Object.entries(options.params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
      });
      delete options.params; // Cleanup before passing to native fetch
    }

    const isGet = !options.method || options.method.toUpperCase() === 'GET';
    const cacheKey = url.toString();

    // 2. Check LRU Cache for GET requests
    if (isGet && !disableCache) {
      const cached = appCache.get(cacheKey);
      if (cached) {
        console.debug(`[Cache Hit] ${cacheKey}`);
        return cached;
      }
    }

    // 3. Setup AbortController to prevent race conditions
    // If a request with the same abortKey (or URL) is pending, cancel it.
    const reqKey = abortKey || cacheKey;
    if (this.abortControllers.has(reqKey)) {
      this.abortControllers.get(reqKey).abort("Cancelled by subsequent request");
    }
    
    const controller = new AbortController();
    this.abortControllers.set(reqKey, controller);
    
    // Combine with external signals if provided
    const signal = options.signal || controller.signal;
    const finalOptions = { ...options, signal };

    // 4. Exponential Backoff Retry Loop
    let attempt = 0;
    while (attempt <= retries) {
      try {
        const response = await fetch(url.toString(), finalOptions);
        
        if (!response.ok) {
          // If status is 4xx (client error), don't retry (unless 429 Too Many Requests)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
             const errorData = await response.json().catch(() => ({}));
             throw new Error(errorData.message || `Client error: ${response.status}`);
          }
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        
        // Success: Cache and return
        if (isGet && !disableCache) {
          appCache.set(cacheKey, data);
        }
        
        this.abortControllers.delete(reqKey);
        return data;

      } catch (error) {
        // Do not retry on explicit aborts
        if (error.name === 'AbortError' || error === "Cancelled by subsequent request") {
          console.debug(`[Request Aborted] ${cacheKey}`);
          throw error;
        }

        attempt++;
        if (attempt > retries) {
           this.abortControllers.delete(reqKey);
           console.error(`[API Error] Failed after ${retries} retries: ${cacheKey}`, error);
           throw error;
        }

        // Calculate backoff delay: 500ms, 1000ms, 2000ms...
        const waitTime = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[API Retry] Attempt ${attempt}/${retries} after ${waitTime}ms for ${cacheKey}`);
        await delay(waitTime);
      }
    }
  }

  // --- Convenience Methods ---

  get(endpoint, params = {}, config = {}) {
    return this.fetch(endpoint, { method: 'GET', params }, config);
  }

  post(endpoint, body, config = {}) {
    return this.fetch(endpoint, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }, config);
  }
}

export const api = new ApiClient();
