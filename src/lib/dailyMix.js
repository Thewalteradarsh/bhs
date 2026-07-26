// Daily Mix generation — Driven purely by local device history and settings

import { loadSettings } from './settings';

const HISTORY_KEY  = 'saavn_play_history';
const DAILY_MIX_CACHE_KEY = 'hear_daily_mix_cache';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
};

export const MIX_THEMES = [
  {
    id: 1,
    label: 'Latest from Favorites',
    gradient: 'linear-gradient(135deg, #4a1e9e 0%, #1a0a3c 100%)',
    accentColor: '#9b59f5',
    description: 'Newest tracks from your selected artists',
    emoji: '🔥',
  },
  {
    id: 2,
    label: 'Latest from Most Heard',
    gradient: 'linear-gradient(135deg, #1a5c3a 0%, #0a1a12 100%)',
    accentColor: '#1db954',
    description: 'New releases from artists you stream the most',
    emoji: '⭐',
  },
  {
    id: 3,
    label: 'Your Top Tracks',
    gradient: 'linear-gradient(135deg, #8b1a1a 0%, #2a0808 100%)',
    accentColor: '#e74c3c',
    description: 'Songs you keep coming back to',
    emoji: '⚡',
  },
  {
    id: 4,
    label: 'Discover Hits',
    gradient: 'linear-gradient(135deg, #1a4a6b 0%, #081c2a 100%)',
    accentColor: '#3498db',
    description: 'Popular music in your language',
    emoji: '🌙',
  },
  {
    id: 5,
    label: 'Trending Now',
    gradient: 'linear-gradient(135deg, #6b2d8b 0%, #1a0a22 100%)',
    accentColor: '#e056fd',
    description: 'What everyone is listening to',
    emoji: '🔥',
  },
  {
    id: 6,
    label: 'Classic Hits',
    gradient: 'linear-gradient(135deg, #8b5a1a 0%, #2a1a08 100%)',
    accentColor: '#f39c12',
    description: 'Evergreen nostalgic favorites',
    emoji: '🌟',
  },
];

function generateLocalMixQueries(history, settings) {
  const { primaryLang, secondaryLang, favoriteArtists = [] } = settings;
  const langDisplay = primaryLang || 'hindi';
  
  // Extract top artists and songs from history
  const artistCounts = {};
  const songCounts = {};
  
  history.forEach(item => {
    if (item.artist) artistCounts[item.artist] = (artistCounts[item.artist] || 0) + 1;
    if (item.title) songCounts[item.title] = (songCounts[item.title] || 0) + 1;
  });
  
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([a]) => a);
    
  const topSongs = Object.entries(songCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);

  // Mix 1: Latest from Favorites
  let favoritesQueries = [];
  if (favoriteArtists.length > 0) {
    favoritesQueries = favoriteArtists.slice(0, 5).map(a => `latest ${a} songs`);
  } else if (topArtists.length > 0) {
    favoritesQueries = topArtists.slice(0, 5).map(a => `latest ${a} songs`);
  } else {
    favoritesQueries = [`latest ${langDisplay} hits`];
  }

  // Mix 2: Latest from Most Heard
  let mostHeardQueries = [];
  if (topArtists.length > 0) {
    mostHeardQueries = topArtists.slice(0, 5).map(a => `latest ${a}`);
  } else if (favoriteArtists.length > 0) {
    mostHeardQueries = favoriteArtists.slice(0, 5).map(a => `latest ${a}`);
  } else {
    mostHeardQueries = [`new ${langDisplay} songs`];
  }

  // Mix 3: Your Top Tracks
  let topTracksQueries = [];
  if (topSongs.length > 0) {
    topTracksQueries = topSongs.slice(0, 5).map(t => `${t}`);
  } else {
    topTracksQueries = [`top ${langDisplay} songs`];
  }

  // Mix 4: Discover Hits
  const discoverQueries = [`${langDisplay} hit songs`, `popular ${langDisplay} music`];

  // Mix 5: Trending Now
  const trendingLang = secondaryLang || langDisplay;
  const trendingQueries = [`trending ${trendingLang} songs`, `viral ${trendingLang}`];

  // Mix 6: Classic Hits
  const classicQueries = [`classic ${langDisplay} hits`, `retro ${langDisplay} songs`, `old ${langDisplay} songs`];

  return [
    { mixId: 1, title: 'Latest from Favorites', queries: favoritesQueries },
    { mixId: 2, title: 'Latest from Most Heard', queries: mostHeardQueries },
    { mixId: 3, title: 'Your Top Tracks', queries: topTracksQueries },
    { mixId: 4, title: `Discover ${langDisplay.charAt(0).toUpperCase() + langDisplay.slice(1)} Hits`, queries: discoverQueries },
    { mixId: 5, title: 'Trending Now', queries: trendingQueries },
    { mixId: 6, title: 'Classic Hits', queries: classicQueries },
  ];
}

export async function getDailyMixData() {
  try {
    const cached = JSON.parse(localStorage.getItem(DAILY_MIX_CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      console.log('[DailyMix] Using cached mix data');
      return cached.mixes;
    }
  } catch {}

  const history = loadHistory();
  const settings = loadSettings();

  const mixes = generateLocalMixQueries(history, settings);

  try {
    localStorage.setItem(DAILY_MIX_CACHE_KEY, JSON.stringify({ ts: Date.now(), mixes }));
  } catch {}

  return mixes;
}

export function invalidateDailyMixCache() {
  try { localStorage.removeItem(DAILY_MIX_CACHE_KEY); } catch {}
}
