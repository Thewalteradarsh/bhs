export default async function handler(req, res) {
  // Setup CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract the endpoint and any other query params passed by the client
  const { endpoint, ...queryParams } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint parameter' });
  }

  // The queue of unofficial JioSaavn APIs.
  // Ranked generally by reliability.
  const API_QUEUE = [
    'https://saavn.dev/api',
    'https://jiosaavn-api-privatecvc2.vercel.app',
    'https://saavn.me',
    'https://jiosaavn-api-v3.vercel.app'
  ];

  let lastError = null;

  // Try each API in the queue sequentially until one succeeds
  for (let i = 0; i < API_QUEUE.length; i++) {
    const baseUrl = API_QUEUE[i];
    
    // Construct the full URL
    const url = new URL(baseUrl);
    // Append the endpoint (e.g. 'search/songs', 'playlists')
    url.pathname = `${url.pathname === '/' ? '' : url.pathname}/${endpoint.startsWith('/') ? endpoint.slice(1) : endpoint}`;
    
    // Pass through all other query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    console.log(`[JioSaavn Queue] Attempting API ${i + 1}/${API_QUEUE.length}: ${url.toString()}`);

    try {
      const controller = new AbortController();
      // Set a strict timeout so a hanging API doesn't block the queue forever
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // If the API returns rate-limited (429) or server error (5xx), throw and rotate
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`API returned HTTP ${response.status}`);
      }

      if (!response.ok) {
        // Some APIs might return 404 for valid reasons (e.g. song not found). 
        // We shouldn't rotate on 404, we should just return it.
        if (response.status === 404) {
           return res.status(404).json({ error: 'Not found' });
        }
        throw new Error(`API returned HTTP ${response.status}`);
      }

      const text = await response.text();
      
      // Some unofficial APIs return HTML on error pages instead of JSON
      if (text.startsWith('<')) {
        throw new Error('API returned HTML instead of JSON (likely Vercel Error page)');
      }

      const data = JSON.parse(text);

      // If the API returns success, proxy it immediately back to the client!
      console.log(`[JioSaavn Queue] Success with ${baseUrl}`);
      return res.status(200).json(data);

    } catch (err) {
      console.warn(`[JioSaavn Queue] API ${baseUrl} failed:`, err.message);
      lastError = err.message;
      // Continue to the next iteration of the loop
    }
  }

  // If the loop finishes without returning, all APIs in the queue failed.
  console.error('[JioSaavn Queue] All APIs in the queue failed.');
  return res.status(502).json({ 
    error: 'All unofficial JioSaavn APIs failed to respond.',
    lastError 
  });
}
