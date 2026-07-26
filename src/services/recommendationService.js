import Groq from 'groq-sdk';
import apiClient from './apiClient';

const rawKeys = import.meta.env.VITE_GROQ_API_KEYS || import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_API_KEYS = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

const getRandomGroqKey = () => {
  if (GROQ_API_KEYS.length === 0) return '';
  return GROQ_API_KEYS[Math.floor(Math.random() * GROQ_API_KEYS.length)];
};

export const rerankCandidateTracks = async (history = [], candidatePool = []) => {
  if (!Array.isArray(candidatePool) || candidatePool.length === 0) return [];
  const apiKey = getRandomGroqKey();
  if (!apiKey || apiKey === 'your_groq_api_key_here') return candidatePool;
  if (!Array.isArray(history)) history = [];

  const recentHistoryText = history.slice(-15).map(s => `${s?.title || ''} by ${s?.artist || ''}`).join(', ');
  
  const candidateMetadata = candidatePool.map((song, index) => ({
    index,
    id: song?.id,
    title: song?.name,
    artist: song?.primaryArtists,
    album: song?.album
  }));

  const systemPrompt = `You are a music curation engine. Analyze the user's listening history and re-rank the provided JSON list of candidate songs. Return ONLY a valid JSON array of re-ranked candidate song objects or IDs that match the sonic vibe. Do not alter song metadata or invent new songs.`;

  const userPrompt = `
USER LISTENING HISTORY:
${recentHistoryText || 'No history available.'}

CANDIDATE SONGS:
${JSON.stringify(candidateMetadata, null, 2)}

Output ONLY a JSON array of string IDs representing the re-ranked order (best matches first). Example: ["id1", "id2", "id3"]
`;

  try {
    const res = await apiClient.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const content = res.data?.choices?.[0]?.message?.content?.trim() || '';
    const match = content.match(/\[[\s\S]*?\]/);
    if (!match) throw new Error('No JSON array in Groq response');

    const rerankedIds = JSON.parse(match[0]);
    if (!Array.isArray(rerankedIds)) throw new Error('Invalid JSON format');

    const rerankedTracks = [];
    const idSet = new Set();
    
    rerankedIds.forEach(id => {
      const track = candidatePool.find(c => c?.id === id);
      if (track && !idSet.has(track.id)) {
        rerankedTracks.push(track);
        idSet.add(track.id);
      }
    });

    candidatePool.forEach(track => {
      if (track && !idSet.has(track.id)) {
        rerankedTracks.push(track);
      }
    });

    return rerankedTracks;
  } catch (err) {
    // 401 / 403 = invalid or expired key — fall back silently, don't spam the console.
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      console.warn('[Groq Rerank] Unauthorized (check VITE_GROQ_API_KEYS). Falling back to standard order.');
    } else {
      console.warn('[Groq Rerank] Failed:', err.message);
    }
    return candidatePool; // always return the unranked pool — never throw
  }
};

export const invalidateGroqCache = () => {};

export const generateMadeForYouMixes = async (artists = []) => {
  if (!Array.isArray(artists)) artists = [];
  const safeArtists = artists.filter(Boolean);
  
  if (safeArtists.length === 0) return [];
  const apiKey = getRandomGroqKey();
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return [
      {
        title: "Your Favorites Mix",
        subtitle: `Hits from ${safeArtists.slice(0, 2).join(', ')} and more`,
        queries: safeArtists.map(a => `${a} top hits`)
      }
    ];
  }

  const systemPrompt = `You are an expert Music AI DJ for a modern streaming app. The user has selected their favorite artists.
Your job is to generate 3 distinct "Made for You" playlist concepts based strictly on these artists' musical styles and genres. 
Return ONLY a valid JSON array of objects. Do not wrap in markdown tags or add any text outside the JSON.

JSON Schema:
[
  {
    "title": "Short catchy playlist name",
    "subtitle": "Short descriptive subtitle",
    "broadQueries": ["3 broad search terms"]
  }
]`;

  const userPrompt = `USER FAVORITE ARTISTS: ${safeArtists.join(', ')}`;

  try {
    const res = await apiClient.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const content = res.data?.choices?.[0]?.message?.content?.trim() || '';
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found in Groq response');

    let mixes = JSON.parse(match[0]);
    if (!Array.isArray(mixes)) throw new Error('Parsed Groq response is not an array');
    
    return mixes.slice(0, 4);
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      console.warn('[Groq] generateMadeForYouMixes: Unauthorized (check VITE_GROQ_API_KEYS). Using fallback mix.');
    } else {
      console.warn('[Groq] Failed to generate mixes:', err.message);
    }
    // Always return a safe fallback — never re-throw from here.
    return [
      {
        title: 'Your Favorites Mix',
        subtitle: `Hits from ${safeArtists.slice(0, 2).join(', ')} and more`,
        broadQueries: safeArtists.map(a => `${a} top hits`).slice(0, 3)
      }
    ];
  }
};

export const generateMixesFromCandidates = async (artists = [], playLogs = [], candidatePool = []) => {
  if (!Array.isArray(candidatePool) || candidatePool.length === 0) return [];
  const apiKey = getRandomGroqKey();
  // No API key — return empty gracefully instead of throwing an uncaught rejection.
  if (!apiKey || apiKey === 'your_groq_api_key_here') return [];
  
  const safeArtists = Array.isArray(artists) ? artists.filter(Boolean) : [];
  const safeLogs = Array.isArray(playLogs) ? playLogs : [];

  const liveMetadata = candidatePool.map(song => ({
    id: song?.id,
    title: song?.name,
    artist: song?.primaryArtists,
    year: song?.year
  }));

  const recentHistoryText = safeLogs.slice(-20).map(s => `${s?.title || ''} by ${s?.artist || ''}`).join(', ');

  const systemPrompt = `You are an expert Music AI DJ.
You are given a pool of LIVE, current songs.
Your job is to read the user's play history and curate 3 distinct "Made for You" playlists ONLY using the provided LIVE candidate songs.

Return ONLY a valid JSON array matching this schema:
[
  {
    "title": "Short catchy playlist name",
    "subtitle": "Short descriptive subtitle",
    "songIds": ["id1", "id2", "id3"]
  }
]`;

  const userPrompt = `USER FAVORITE ARTISTS: ${safeArtists.join(', ')}
RECENT LISTENING HISTORY: ${recentHistoryText || 'No history yet.'}

LIVE CANDIDATE POOL (Do not invent outside this list):
${JSON.stringify(liveMetadata)}`;

  try {
    const res = await apiClient.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const content = res.data?.choices?.[0]?.message?.content?.trim() || '';
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found in Groq response');

    let mixes = JSON.parse(match[0]);
    if (!Array.isArray(mixes)) throw new Error('Parsed Groq response is not an array');
    
    return mixes.slice(0, 4);
  } catch (err) {
    console.error('[Groq] RAG mix generation failed:', err);
    return [
      {
        title: "Your Top Mix",
        subtitle: "Based on your selected artists",
        songIds: candidatePool.slice(0, 10).map(s => s?.id).filter(Boolean)
      },
      {
        title: "Discovery Mix",
        subtitle: "New tracks for you",
        songIds: candidatePool.slice(10, 20).map(s => s?.id).filter(Boolean)
      }
    ];
  }
};

export const getAIDiscoverRecommendations = async (history = []) => {
  const apiKey = getRandomGroqKey();
  const safeHistory = Array.isArray(history) ? history : [];
  
  const fallback = {
    playlist_name: "Discover: Handpicked",
    visual_theme_hint: "Chill vibes",
    recommendations: safeHistory.slice(0, 5).map(h => ({
      title: h.title,
      artist: h.artist,
      search_query: `${h.title} ${h.artist}`
    }))
  };

  if (!apiKey || apiKey === 'your_groq_api_key_here') return fallback;

  const groq = new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const recentHistoryText = safeHistory.slice(-20).map(s => `${s?.title || s?.name || ''} by ${s?.artist || s?.primaryArtists || ''}`).join(', ');

  const systemPrompt = `You are an expert music recommendation engine.
Analyze the user's recent listening history and generate exactly 5 highly accurate song recommendations. 
CRUCIAL: You must heavily favor the regional vibe of the listening history.

Output Schema:
{
  "playlist_name": "String",
  "visual_theme_hint": "String",
  "recommendations": [
    {
      "title": "String",
      "artist": "String",
      "search_query": "String"
    }
  ]
}`;

  const userPrompt = `USER LISTENING HISTORY:\n${recentHistoryText || 'No history available.'}\n\nGenerate 5 recommendations.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      response_format: { type: 'json_object' }
    });

    const content = chatCompletion.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from Groq');

    const result = JSON.parse(content);
    if (result && Array.isArray(result.recommendations) && result.recommendations.length > 5) {
      result.recommendations = result.recommendations.slice(0, 5);
    }
    return result;
  } catch (error) {
    console.error('[Groq] AI Discover generation failed:', error.message);
    return fallback;
  }
};

export const getDynamicHomeMixes = async (languages = [], playHistory = []) => {
  const apiKey = getRandomGroqKey();
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return [];
  }

  const groq = new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const recentHistoryText = Array.isArray(playHistory) 
    ? playHistory.slice(-20).map(s => `${s?.title || ''} by ${s?.artist || ''}`).join(', ')
    : '';

  const systemPrompt = `You are an expert AI music curator for a streaming app.
Your task is to generate 3-4 personalized playlist categories (Daily Mixes) based on the user's preferred languages and recent listening history.

CRITICAL: Return ONLY a valid JSON object matching the exact schema below. Do not include markdown formatting, backticks, or conversational text.

Output Schema:
{
  "mixes": [
    {
      "title": "String (e.g. 'Late Night Melodies')",
      "subtitle": "String (e.g. 'Chill tracks for the evening')",
      "tracks": [
        {
          "title": "String (Song name)",
          "artist": "String (Artist name)",
          "query": "String (Search query combining song and artist)"
        }
      ]
    }
  ]
}

Ensure there are 5-6 tracks per category. The tracks must match the vibe and user preferences.`;

  const userPrompt = `USER PREFERRED LANGUAGES: ${languages.join(', ')}
USER LISTENING HISTORY:
${recentHistoryText || 'No history available.'}

Generate the personalized mixes in JSON format.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.6,
      response_format: { type: 'json_object' }
    });

    const content = chatCompletion.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from Groq');

    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found in Groq response');

    const result = JSON.parse(match[0]);
    if (!result || !Array.isArray(result.mixes)) {
      throw new Error('Parsed Groq response is missing the mixes array');
    }

    return result.mixes;
  } catch (error) {
    console.error('[Groq] Dynamic Home Mixes generation failed:', error.message);
    return [];
  }
};
