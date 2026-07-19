import { appCache } from './lruCache';

// Configuration
// Pointing to our new serverless Deezer proxy route
const API_ENDPOINTS = [
  '/api/deezer'
];

const MAX_RETRIES = 1;
const BASE_DELAY_MS = 500;

/**
 * Helper to delay execution for exponential backoff
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Advanced API Client with caching, retry logic, abort control, and API fallback pool.
 */
class ApiClient {
  constructor() {
    this.abortControllers = new Map();
    this.currentApiIndex = 0;
  }

  // Gets the current working base URL
  getBaseUrl() {
    return API_ENDPOINTS[this.currentApiIndex];
  }

  // Switches to the next API in the pool
  switchToNextApi() {
    // Only one endpoint now, but keeping structure for future scaling
    this.currentApiIndex = (this.currentApiIndex + 1) % API_ENDPOINTS.length;
  }

  async fetch(endpointPath, options = {}) {
    const { disableCache = false, abortKey = null, retries = MAX_RETRIES, params, ...nativeFetchOptions } = options;
    
    let attempt = 0;
    
    while (attempt <= retries) {
      const baseUrl = this.getBaseUrl();
      // We pass the target Deezer endpoint via query parameter to our local proxy
      const url = new URL(baseUrl, window.location.origin);
      url.searchParams.append('endpoint', endpointPath.startsWith('/') ? endpointPath.slice(1) : endpointPath);
      
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
        });
      }

      const isGet = !nativeFetchOptions.method || nativeFetchOptions.method.toUpperCase() === 'GET';
      const cacheKey = url.toString();

      // 2. Check LRU Cache for GET requests
      if (isGet && !disableCache) {
        const cached = appCache.get(cacheKey);
        if (cached) {
          console.debug(`[Cache Hit] ${cacheKey}`);
          return cached;
        }
      }

      // 3. Setup AbortController
      const reqKey = abortKey || cacheKey;
      if (this.abortControllers.has(reqKey)) {
        this.abortControllers.get(reqKey).abort("Cancelled by subsequent request");
      }
      
      const controller = new AbortController();
      this.abortControllers.set(reqKey, controller);
      
      const signal = nativeFetchOptions.signal || controller.signal;
      const finalOptions = { ...nativeFetchOptions, signal };

      try {
        const response = await fetch(url.toString(), finalOptions);
        
        if (!response.ok) {
          if (response.status >= 400 && response.status < 500 && response.status !== 429 && response.status !== 404) {
             const errorData = await response.json().catch(() => ({}));
             throw new Error(errorData.message || errorData.error || `Client error: ${response.status}`);
          }
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        
        // Wrap Deezer data if it isn't wrapped in a 'data' array to maintain consistency
        // Deezer often returns { data: [...] } which is fine.
        
        if (isGet && !disableCache) {
          appCache.set(cacheKey, data);
        }
        
        this.abortControllers.delete(reqKey);
        return data;

      } catch (error) {
        if (error.name === 'AbortError' || error === "Cancelled by subsequent request") {
          console.debug(`[Request Aborted] ${cacheKey}`);
          throw error;
        }

        attempt++;
        this.abortControllers.delete(reqKey);
        
        console.error(`[API Error] Request failed on ${baseUrl}. Attempt ${attempt}/${retries}. Error:`, error);
        
        if (attempt > retries) {
           throw error;
        }
        
        this.switchToNextApi();

        const waitTime = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[API Retry] Retrying with ${this.getBaseUrl()} after ${waitTime}ms...`);
        await delay(waitTime);
      }
    }
  }

  // --- Convenience Methods ---

  get(endpointPath, config = {}) {
    return this.fetch(endpointPath, { method: 'GET', ...config });
  }

  post(endpointPath, data, config = {}) {
    return this.fetch(endpointPath, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      ...config
    });
  }
}

export const api = new ApiClient();

