export default async function handler(req, res) {
  // Setup CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Expecting a query parameter `endpoint` (e.g. `search?q=eminem`)
  let { endpoint } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing Deezer endpoint path' });
  }

  // Reconstruct full query params to pass to Deezer
  const searchParams = new URLSearchParams(req.query);
  searchParams.delete('endpoint');
  const queryString = searchParams.toString();
  
  if (queryString) {
    endpoint += (endpoint.includes('?') ? '&' : '?') + queryString;
  }

  try {
    const deezerUrl = `https://api.deezer.com/${endpoint}`;
    
    const response = await fetch(deezerUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Deezer API blocked the request: ${response.statusText}` });
    }

    const data = await response.json();
    
    // Deezer wraps errors in the 200 response sometimes
    if (data.error) {
       return res.status(500).json({ error: data.error.message || 'Deezer API internal error' });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("Deezer Proxy API Error:", error);
    return res.status(500).json({ error: 'Internal server error while fetching Deezer data' });
  }
}
