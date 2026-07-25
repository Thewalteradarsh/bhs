export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      }
    });
  }

  let endpoint = url.searchParams.get('endpoint');
  if (!endpoint) {
    return Response.json({ error: 'Missing Deezer endpoint path' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // Reconstruct full query params to pass to Deezer
  url.searchParams.delete('endpoint');
  const queryString = url.searchParams.toString();
  
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
      return Response.json({ error: `Deezer API blocked the request: ${response.statusText}` }, { status: response.status, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const data = await response.json();
    
    if (data.error) {
       return Response.json({ error: data.error.message || 'Deezer API internal error' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    return Response.json(data, { headers: { 'Access-Control-Allow-Origin': '*' } });

  } catch (error) {
    console.error("Deezer Proxy API Error:", error);
    return Response.json({ error: 'Internal server error while fetching Deezer data' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}
