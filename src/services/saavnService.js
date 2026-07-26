import apiClient, { fetchWithFallback, fetchWithTimeout, safeJson, API_ENDPOINTS } from './apiClient';
import malayalamClassicsData from '../lib/malayalam_classics_data.json';
import CryptoJS from 'crypto-js';

const tryGet = async (path, params) => {
  try {
    const { data } = await apiClient.get(path, { params });
    return data;
  } catch (err) {
    console.error(`API Error for ${path}:`, err.message);
    return null;
  }
};

// Decode HTML entities safely
const decode = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};

// Force a URL to https:// safely
const forceHttps = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (!url.startsWith('http://') && !url.startsWith('https://')) return '';
  return url.replace(/^http:\/\//i, 'https://');
};

const decryptUrl = (url) => {
  if (!url) return '';
  try {
    const key = CryptoJS.enc.Utf8.parse('38346591');
    const decrypted = CryptoJS.DES.decrypt({
      ciphertext: CryptoJS.enc.Base64.parse(url)
    }, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    console.error('Failed to decrypt URL', err);
    return '';
  }
};

/**
 * Normalizes a song from the raw API response to the app's standard format.
 */
export const normalizeSongFull = (song) => {
  if (!song || typeof song !== 'object') return null;

  let rawMediaUrl = song.media_url || song.encrypted_media_url || '';
  if (Array.isArray(song.downloadUrl) && song.downloadUrl.length > 0) {
    rawMediaUrl = song.downloadUrl[song.downloadUrl.length - 1].link; // highest quality
  }
  if (song.encrypted_media_url && !song.media_url) {
    rawMediaUrl = decryptUrl(song.encrypted_media_url);
  }

  const streamUrl = forceHttps(rawMediaUrl);
  
  let rawImageUrl = song.image || '';
  if (Array.isArray(song.image) && song.image.length > 0) {
    rawImageUrl = song.image[song.image.length - 1].link; // highest quality
  }
  const imageUrl  = forceHttps(rawImageUrl);
  
  const artistStr = song.primary_artists || song.singers || song.primaryArtists || 'Unknown Artist';
  const albumName = (typeof song.album === 'object' ? song.album?.name : song.album) || '';

  return {
    id: song.id || `fallback-${Date.now()}-${Math.random()}`,
    name: decode(song.song || song.title || song.name || 'Unknown Song'),
    primaryArtists: decode(artistStr),
    album: decode(albumName),
    image: imageUrl,
    streamUrl,
    duration: Number(song.duration) || 0,
    language: song.language || 'unknown',
    source: 'jiosaavn'
  };
};

export const normalizeSongLite = normalizeSongFull;
export const getBestStreamUrl = (song) => forceHttps(song?.media_url || '');

export const searchYouTube = async (query) => {
  if (!query) return [];
  try {
    const res = await apiClient.get('/api/yt-search', { params: { q: query } });
    return Array.isArray(res?.data) ? res.data : [];
  } catch (err) {
    console.error('YouTube search error:', err.message);
    return [];
  }
};

const isValidSaavnResults = (results, query, options = {}) => {
  if (!Array.isArray(results) || results.length === 0) return false;
  
  const badWords = ['karaoke', 'cover', 'sped up', 'tribute', 'lofi', 'zzang', 'nightcore', 'techno', '8d', 'slowed', 'reverb', 'instrumental'];
  const queryLower = query.toLowerCase();
  const expectedArtist = options.artist ? options.artist.toLowerCase().replace(/[^a-z0-9]/g, '') : null;

  return results.some(r => {
    const rTitle = (r?.name || r?.title || '').toString().toLowerCase();
    const rArtistStr = (r?.primaryArtists || r?.singers || r?.artist || '').toString().toLowerCase();
    
    if (badWords.some(bw => rTitle.includes(bw) || rArtistStr.includes(bw)) && !badWords.some(bw => queryLower.includes(bw))) {
      return false;
    }
    
    if (expectedArtist) {
      const svArtists = rArtistStr.split(/,|&/).map(a => (a || '').replace(/[^a-z0-9]/g, '')).filter(Boolean);
      if (svArtists.length > 0 && !svArtists.some(sv => expectedArtist.includes(sv) || sv.includes(expectedArtist))) {
        return false;
      }
    }
    return true;
  });
};

const extractSongFromResponse = (json) => {
  if (!json) return null;
  
  let songData = null;
  if (Array.isArray(json.data) && json.data.length > 0) {
    songData = json.data[0];
  } else if (json.data && typeof json.data === 'object' && !Array.isArray(json.data)) {
    songData = json.data;
  } else if (Array.isArray(json.results) && json.results.length > 0) {
    songData = json.results[0];
  } else if (json.results && typeof json.results === 'object' && !Array.isArray(json.results)) {
    songData = json.results;
  } else if (Array.isArray(json) && json.length > 0) {
    songData = json[0];
  }
  
  return songData;
};

const tryGetWithFallback = async (query, lang = '', limit = 30) => {
  try {
    // 1. Try primary
    const data = await tryGet('/result/', { query, type: 'song', lang, n: limit });
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn(`[saavnService] tryGetWithFallback primary fail for "${query}":`, err.message);
  }

  // 2. Try all mirrors concurrently
  const encoded = encodeURIComponent(query);
  const externalUrls = API_ENDPOINTS.flatMap(base => [
    `${base}/api/search/songs?query=${encoded}&limit=${limit}`,
    `${base}/search/songs?query=${encoded}&limit=${limit}`
  ]);

  const fetchMirror = async (url) => {
    const res = await fetchWithTimeout(url, {}, 4000);
    if (!res.ok) throw new Error('Not ok');
    const json = await safeJson(res);
    let results = [];
    if (json.data && Array.isArray(json.data.results)) results = json.data.results;
    else if (json.data && Array.isArray(json.data)) results = json.data;
    else if (Array.isArray(json.results)) results = json.results;
    else if (Array.isArray(json)) results = json;

    if (results.length > 0) return results;
    throw new Error('No results');
  };

  try {
    return await Promise.any(externalUrls.map(fetchMirror));
  } catch (e) {
    return [];
  }
};

export const searchSongs = async (query, options = {}) => {
  if (!query) return [];
  const limit = options.limit || 30;
  let saavnResults = [];

  // 1. Try primary worker
  try {
    const data = await tryGet('/result/', { query, type: 'song', n: limit });
    if (Array.isArray(data) && data.length > 0) {
      const normalized = data.map(normalizeSongFull).filter(Boolean);
      if (isValidSaavnResults(normalized, query, options)) {
        saavnResults = normalized;
      }
    }
  } catch (err) {
    console.warn('[saavnService] searchSongs primary worker error:', err.message);
  }

  // 2. Try mirrors if primary failed or only returned covers
  if (saavnResults.length === 0) {
    const encoded = encodeURIComponent(query);
    const externalUrls = API_ENDPOINTS.flatMap(base => [
      `${base}/api/search/songs?query=${encoded}&limit=${limit}`,
      `${base}/search/songs?query=${encoded}&limit=${limit}`
    ]);

    const fetchMirrorWithValidation = async (url) => {
      const res = await fetchWithTimeout(url, {}, 4000);
      if (!res.ok) throw new Error('Not ok');
      const json = await safeJson(res);
      
      let results = [];
      if (json.data && Array.isArray(json.data.results)) results = json.data.results;
      else if (json.data && Array.isArray(json.data)) results = json.data;
      else if (Array.isArray(json.results)) results = json.results;
      else if (Array.isArray(json)) results = json;

      if (results.length > 0) {
        const normalized = results.map(normalizeSongFull).filter(Boolean);
        if (isValidSaavnResults(normalized, query, options)) {
          return normalized;
        }
      }
      throw new Error('No valid results');
    };

    try {
      saavnResults = await Promise.any(externalUrls.map(fetchMirrorWithValidation));
      console.info(`[saavnService] Got ${saavnResults.length} valid results from mirrors`);
    } catch (e) {
      console.warn(`[saavnService] All mirrors failed or returned invalid results.`);
    }
  }

  // 3. YouTube Fallback
  if (saavnResults.length === 0) {
    try {
      console.info(`[saavnService] Falling back to YouTube for "${query}"`);
      const ytResults = await searchYouTube(query);
      if (Array.isArray(ytResults) && ytResults.length > 0) {
        return ytResults;
      }
    } catch (ytErr) {
      console.warn('[saavnService] YouTube fallback error:', ytErr.message);
    }
  }

  // 4. iTunes Fallback
  if (saavnResults.length === 0) {
    try {
      const itunesUrl =
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`;
      const res = await fetchWithTimeout(itunesUrl, {}, 8000);
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json') || ct.includes('text/javascript')) {
          const json = await res.json();
          const items = Array.isArray(json.results) ? json.results : [];
          saavnResults = items
            .filter(t => t.kind === 'song')
            .map(t => ({
              id: `itunes-${t.trackId}`,
              name: t.trackName || 'Unknown Song',
              primaryArtists: t.artistName || 'Unknown Artist',
              album: t.collectionName || '',
              image: (t.artworkUrl100 || '').replace('100x100bb', '500x500bb'),
              streamUrl: t.previewUrl || '',   // 30-sec preview only
              duration: Math.round((t.trackTimeMillis || 0) / 1000),
              language: 'unknown',
              source: 'itunes',
            }));
          if (saavnResults.length > 0) {
            console.info(`[saavnService] iTunes fallback returned ${saavnResults.length} results for "${query}"`);
          }
        }
      }
    } catch (e) {
      console.warn('[saavnService] iTunes fallback failed:', e.message);
    }
  }

  if (saavnResults.length === 0) {
    console.info(`[saavnService] All tiers exhausted for "${query}", returning empty.`);
  }

  return saavnResults;
};

export const getSongById = async (id) => {
  if (!id) return null;
  
  // 1. Try primary worker
  try {
    const data = await tryGet('/result/', { query: id, type: 'song', n: 1 });
    if (Array.isArray(data) && data.length > 0) {
      const song = normalizeSongFull(data[0]);
      if (song && song.streamUrl) return song;
    }
  } catch (err) {
    console.warn('[saavnService] getSongById primary worker error:', err.message);
  }

  // 2. Try mirrors
  const externalUrls = API_ENDPOINTS.flatMap(base => [
    `${base}/api/songs?ids=${id}`,
    `${base}/api/songs?id=${id}`,
    `${base}/songs?ids=${id}`,
    `${base}/songs?id=${id}`
  ]);

  for (const url of externalUrls) {
    try {
      const res = await fetchWithTimeout(url, {}, 5000);
      if (!res.ok) continue;

      const json = await safeJson(res);
      const songData = extractSongFromResponse(json);

      if (songData) {
        const song = normalizeSongFull(songData);
        if (song && song.streamUrl) {
          console.info(`[saavnService] Found song by ID ${id} using mirror ${url}`);
          return song;
        }
      }
    } catch (e) {
      console.warn(`[saavnService] Mirror ID fetch fail: ${url} — ${e.message}`);
    }
  }

  return null;
};

export const getFullSong = async (liteOrId) => {
  if (!liteOrId) return null;
  const id = typeof liteOrId === 'string' ? liteOrId : liteOrId.id;
  const full = await getSongById(id);
  if (!full) return typeof liteOrId === 'object' ? liteOrId : null;
  return { ...(typeof liteOrId === 'object' ? liteOrId : {}), ...full };
};

export const getHomeRows = async () => {
  let primaryLang = 'malayalam';
  let secondaryLang = 'tamil';
  try {
    const s = JSON.parse(localStorage.getItem('hear_settings') || 'null');
    if (s?.primaryLang) primaryLang = s.primaryLang;
    if (s?.secondaryLang && s.secondaryLang !== s.primaryLang) secondaryLang = s.secondaryLang;
    else if (!s?.secondaryLang) secondaryLang = primaryLang;
  } catch {}

  const cap = (s) => typeof s === 'string' && s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  const queries = [
    { label: `${cap(primaryLang)} Hits 🎵`,         q: `${primaryLang} hits 2024`,     lang: primaryLang   },
    { label: `${cap(primaryLang)} Classics 🌴`,     q: `classic ${primaryLang} songs`, lang: primaryLang   },
    { label: `${cap(secondaryLang)} Bangers 🔥`,    q: `${secondaryLang} hits 2024`,   lang: secondaryLang },
    { label: `${cap(secondaryLang)} Love Songs 💕`, q: `${secondaryLang} love songs`,  lang: secondaryLang },
  ];

  const results = await Promise.allSettled(
    queries.map(({ q, lang }) => tryGetWithFallback(q, lang, 30))
  );

  return queries.map(({ label }, i) => {
    if (primaryLang === 'malayalam' && label === 'Malayalam Classics 🌴') {
      return { label, songs: Array.isArray(malayalamClassicsData) ? malayalamClassicsData : [] };
    }
    const data = results[i].status === 'fulfilled' ? results[i].value : null;
    const raw = Array.isArray(data) ? data : [];
    return { label, songs: raw.map(normalizeSongFull).filter(Boolean) };
  });
};

export const getSongsByArtist = async (artist) => {
  if (!artist) return [];
  return searchSongs(artist);
};

export const formatTime = (secs) => {
  const s = Math.floor(Number(secs) || 0);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const getSmartDiscoverTracks = async (signals) => {
  if (!signals || typeof signals !== 'object') return [];
  if (!Array.isArray(signals.keywords) && !Array.isArray(signals.similar_artists)) return [];

  const keywords = Array.isArray(signals.keywords) ? signals.keywords : [];
  const similar_artists = Array.isArray(signals.similar_artists) ? signals.similar_artists : [];
  
  const queries = [...keywords, ...similar_artists].filter(Boolean).slice(0, 5);
  if (queries.length === 0) return [];

  try {
    const results = await Promise.allSettled(
      queries.map(q => tryGetWithFallback(q, '', 10))
    );

    const combinedTracks = [];
    const seenIds = new Set();

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        const songs = Array.isArray(data) ? data : [];
        songs.forEach(rawSong => {
          if (rawSong && !seenIds.has(rawSong.id)) {
            seenIds.add(rawSong.id);
            const full = normalizeSongFull(rawSong);
            if (full) combinedTracks.push(full);
          }
        });
      }
    });

    combinedTracks.sort(() => Math.random() - 0.5);
    return combinedTracks.slice(0, 30);
  } catch (err) {
    console.error('SmartDiscover failed:', err.message);
    return [];
  }
};

export const getCandidateSongs = async (history) => {
  if (!Array.isArray(history) || history.length === 0) {
    const home = await getHomeRows().catch(() => []);
    let candidates = [];
    (Array.isArray(home) ? home : []).forEach(row => {
      if (row && Array.isArray(row.songs)) {
        candidates = candidates.concat(row.songs.slice(0, 5));
      }
    });
    return candidates.slice(0, 30);
  }

  const artistCounts = {};
  history.forEach(item => {
    if (item && item.artist) {
      artistCounts[item.artist] = (artistCounts[item.artist] || 0) + 1;
    }
  });
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([a]) => a);

  if (topArtists.length === 0) return [];

  try {
    const results = await Promise.allSettled(
      topArtists.map(artist => tryGetWithFallback(artist, '', 10))
    );

    const combinedTracks = [];
    const seenIds = new Set();

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        const songs = Array.isArray(data) ? data : [];
        songs.forEach(rawSong => {
          if (rawSong && !seenIds.has(rawSong.id)) {
            seenIds.add(rawSong.id);
            const full = normalizeSongFull(rawSong);
            if (full) combinedTracks.push(full);
          }
        });
      }
    });

    combinedTracks.sort(() => Math.random() - 0.5);
    return combinedTracks.slice(0, 30);
  } catch (err) {
    console.error('getCandidateSongs failed:', err.message);
    return [];
  }
};
