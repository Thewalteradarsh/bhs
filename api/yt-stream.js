import ytdl from '@distube/ytdl-core';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing YouTube video ID parameter' });
  }

  try {
    const info = await ytdl.getInfo(id);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    
    if (!audioFormats.length) {
      return res.status(404).json({ error: 'No audio formats found' });
    }

    // Try to get mp4a (m4a) format first for best compatibility with HTML5 Audio on mobile
    let bestFormat = audioFormats.find(f => f.mimeType && f.mimeType.includes('audio/mp4'));
    if (!bestFormat) {
      bestFormat = audioFormats[0];
    }

    // Return the URL for the frontend to play directly
    res.status(200).json({ 
      url: bestFormat.url,
      mimeType: bestFormat.mimeType,
      bitrate: bestFormat.audioBitrate
    });
  } catch (error) {
    console.error('YouTube Stream Error:', error.message);
    res.status(500).json({ error: 'Failed to extract stream URL', details: error.message });
  }
}
