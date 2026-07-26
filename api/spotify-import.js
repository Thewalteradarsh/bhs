import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { url } = req.body;
  if (!url || !url.includes('spotify.com/playlist/')) {
    return res.status(400).json({ error: 'Invalid Spotify playlist URL' });
  }

  try {
    // Extract playlist ID
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Could not extract playlist ID' });
    }
    const playlistId = match[1];
    
    // Use the embed URL which SSRs the tracklist
    const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;

    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Spotify page: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let tracks = [];

    let playlistName = 'Imported from Spotify';
    let playlistImage = null;

    const nextData = $('#__NEXT_DATA__').html();
    if (nextData) {
      try {
        const data = JSON.parse(nextData);
        const entity = data.props?.pageProps?.state?.data?.entity;
        
        if (entity?.name) {
          playlistName = entity.name;
        }
        if (entity?.coverArt?.sources?.[0]?.url) {
          playlistImage = entity.coverArt.sources[0].url;
        }

        const trackList = entity?.trackList;
        if (Array.isArray(trackList)) {
          tracks = trackList.map(t => ({
            title: t.title,
            artist: t.subtitle
          }));
        }
      } catch (err) {
        console.error('Error parsing __NEXT_DATA__:', err);
      }
    }

    // Unofficial API Fallback for playlists > 100 songs
    if (tracks.length >= 100) {
      try {
        console.log("Reached 100 track limit. Attempting unofficial API fallback...");
        // Placeholder for any unofficial Spotify scraper API you prefer (e.g. spotifydown, spotisearch).
        // Public scraper APIs change frequently, so you can swap this URL if it goes down.
        const unofficialRes = await fetch(`https://api.spotifydown.com/metadata/playlist/${playlistId}`, {
          headers: { 
            'User-Agent': 'Mozilla/5.0',
            'Origin': 'https://spotifydown.com',
            'Referer': 'https://spotifydown.com/'
          }
        });
        
        if (unofficialRes.ok) {
           const data = await unofficialRes.json();
           if (data.success && data.trackList && data.trackList.length > tracks.length) {
             tracks = data.trackList.map(t => ({
               title: t.title,
               artist: t.artists || t.subtitle || ''
             }));
             console.log(`Successfully fetched ${tracks.length} tracks via unofficial API`);
           }
        }
      } catch (err) {
        console.log("Unofficial API fallback failed or blocked, returning first 100 songs.");
      }
    }

    res.status(200).json({ tracks, name: playlistName, image: playlistImage });
  } catch (error) {
    console.error('Spotify import error:', error);
    res.status(500).json({ error: 'Failed to process Spotify playlist' });
  }
}

