import { appCache } from './lruCache';

// Configuration
const API_ENDPOINTS = [
  import.meta.env.VITE_API_URL,
  'https://saavn.me',
  'https://jiosaavn-api-privatecvc2.vercel.app',
  'https://saavn.dev/api'
].filter(Boolean); // Remove empty/undefined

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500; // 500ms, 1s, 2s

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
    this.currentApiIndex = (this.currentApiIndex + 1) % API_ENDPOINTS.length;
    console.warn(`[API Switch] Now using fallback API: ${this.getBaseUrl()}`);
  }

  async fetch(endpoint, options = {}) {
    const { disableCache = false, abortKey = null, retries = MAX_RETRIES, params, ...nativeFetchOptions } = options;
    
    // We will attempt across retries AND across API endpoints.
    // So total attempts could be higher.
    let attempt = 0;
    
    while (attempt <= retries) {
      const baseUrl = this.getBaseUrl();
      const url = new URL(endpoint, baseUrl);
      
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
          // If 404 or 5xx, or network failure, we will retry/switch API
          if (response.status >= 400 && response.status < 500 && response.status !== 429 && response.status !== 404) {
             const errorData = await response.json().catch(() => ({}));
             throw new Error(errorData.message || `Client error: ${response.status}`);
          }
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        
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
        
        // If we hit an error, rotate the API for the next attempt
        console.error(`[API Error] Request failed on ${baseUrl}. Attempt ${attempt}/${retries}. Error:`, error);
        
        if (attempt > retries) {
           throw error;
        }
        
        // Switch API endpoint on failure
        this.switchToNextApi();

        const waitTime = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[API Retry] Retrying with ${this.getBaseUrl()} after ${waitTime}ms...`);
        await delay(waitTime);
      }
    }
  }

  // --- Convenience Methods ---

  get(endpoint, config = {}) {
    return this.fetch(endpoint, { method: 'GET', ...config });
  }

  post(endpoint, data, config = {}) {
    return this.fetch(endpoint, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      ...config
    });
  }
}

export const api = new ApiClient();
