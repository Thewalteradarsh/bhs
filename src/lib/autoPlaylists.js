import { generateMixesFromCandidates } from '../services/recommendationService';
import { searchSongs } from '../services/saavnService';

const CACHE_KEY = 'hear_auto_playlists';

export const loadAutoPlaylists = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load auto playlists', e);
  }
  return [];
};

export const saveAutoPlaylists = (playlists) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify(playlists));
};

export const buildAutoPlaylists = async (artists, onProgress) => {
  if (onProgress) onProgress('Scanning live music catalogs...');
  
  // 1. Load Local Play Logs
  let playLogs = [];
  try {
    playLogs = JSON.parse(localStorage.getItem('saavn_play_history') || '[]');
  } catch (e) {}

  // 2. Fetch Live Candidate Pool (to bypass 2024 AI cutoff)
  const candidatePool = [];
  const seenIds = new Set();

  // Search top tracks for each selected artist
  const fetchPromises = artists.map(async (artist) => {
    try {
      const results = await searchSongs(artist);
      if (results) {
        // Take top 30 live songs per artist to give AI a huge pool
        results.slice(0, 30).forEach(song => {
          if (!seenIds.has(song.id)) {
            seenIds.add(song.id);
            candidatePool.push(song);
          }
        });
      }
    } catch (e) {
      console.warn('Failed to fetch candidates for', artist);
    }
  });

  await Promise.all(fetchPromises);

  if (candidatePool.length === 0) {
    if (onProgress) onProgress('Failed to fetch live tracks.');
    return [];
  }

  if (onProgress) onProgress('AI is reading logs & mixing tracks...');

  // 3. RAG AI Execution
  const mixes = await generateMixesFromCandidates(artists, playLogs, candidatePool);
  if (!mixes || mixes.length === 0) return [];

  // 4. Construct Final Playlists
  const completedPlaylists = [];
  
  for (let i = 0; i < mixes.length; i++) {
    const mix = mixes[i];
    
    // Map AI's selected IDs back to full song objects
    const mixSongs = (mix.songIds || [])
      .map(id => candidatePool.find(s => s.id === id))
      .filter(Boolean); // remove nulls

    if (mixSongs.length > 0) {
      completedPlaylists.push({
        id: `auto-mix-${Date.now()}-${i}`,
        title: mix.title,
        subtitle: mix.subtitle,
        songs: mixSongs
      });
    }
  }

  // Cache them permanently
  saveAutoPlaylists(completedPlaylists);
  return completedPlaylists;
};
