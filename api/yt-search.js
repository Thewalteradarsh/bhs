import ytSearch from 'yt-search';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  try {
    let searchQuery = q;
    if (!/official|audio/i.test(searchQuery)) {
      searchQuery += ' official audio';
    }
    const results = await ytSearch(searchQuery);
    let videos = results.videos;
    
    const originalQueryLower = q.toLowerCase();
    const badWords = ['karaoke', 'cover', '8d', 'slowed', 'reverb', 'instrumental', 'remix', 'mashup', 'bass boosted', 'whatsapp status', 'ringtone'];
    
    videos = videos.filter(v => {
      const titleLower = v.title.toLowerCase();
      for (const word of badWords) {
        if (titleLower.includes(word) && !originalQueryLower.includes(word)) {
          return false;
        }
      }
      return true;
    });

    if (videos.length === 0) {
      videos = results.videos;
    }
    
    videos = videos.slice(0, 15);
    // Normalize to match JioSaavn song object structure
    const tracks = videos.map(v => ({
      id: v.videoId,
      name: v.title,
      primaryArtists: v.author.name,
      album: 'YouTube',
      image: v.thumbnail,
      duration: v.seconds,
      source: 'youtube'
    }));

    res.status(200).json(tracks);
  } catch (error) {
    console.error('YouTube Search Error:', error);
    res.status(500).json({ error: 'Failed to fetch YouTube results' });
  }
}
