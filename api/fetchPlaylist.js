export default async function handler(req, res) {
  // Setup CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { playlistUrl } = req.query;

  if (!playlistUrl || !playlistUrl.includes('spotify.com/')) {
    return res.status(400).json({ error: 'Invalid or missing Spotify URL' });
  }

  try {
    let embedUrl = playlistUrl;
    if (playlistUrl.includes('open.spotify.com/playlist/')) {
        embedUrl = playlistUrl.replace('open.spotify.com/playlist/', 'open.spotify.com/embed/playlist/');
    } else if (playlistUrl.includes('open.spotify.com/album/')) {
        embedUrl = playlistUrl.replace('open.spotify.com/album/', 'open.spotify.com/embed/album/');
    }
    embedUrl = embedUrl.split('?')[0];

    console.log("Server API fetching:", embedUrl);
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Spotify API blocked the request: ${response.status} ${response.statusText}` });
    }

    const html = await response.text();
    const tagStart = '<script id="__NEXT_DATA__" type="application/json">';
    const startIdx = html.indexOf(tagStart);

    if (startIdx === -1) {
      return res.status(500).json({ error: 'Metadata block not found in Spotify response' });
    }

    const jsonStart = startIdx + tagStart.length;
    const jsonEnd = html.indexOf('</script>', jsonStart);
    const rawJson = html.substring(jsonStart, jsonEnd);

    const parsed = JSON.parse(rawJson);
    const trackList = parsed?.props?.pageProps?.state?.data?.entity?.trackList || [];

    if (trackList.length === 0) {
      return res.status(404).json({ error: 'No tracks found in the playlist' });
    }

    // Format the tracks into a clean string directly on the server to save client processing
    const formattedTracks = trackList.map(t => `${t.title} - ${t.subtitle}`).filter(t => t !== ' - ').join('\n');

    return res.status(200).json({ tracks: formattedTracks });

  } catch (error) {
    console.error("Server API Error:", error);
    return res.status(500).json({ error: 'Internal server error while fetching playlist' });
  }
}
