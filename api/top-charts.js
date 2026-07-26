/**
 * /api/trending — Live Spotify Playlist → JioSaavn resolution
 *
 * Fetches live track lists from Spotify's "Trending Now" playlists every 24h,
 * then resolves each track on JioSaavn for 320kbps stream URLs.
 *
 * GET /api/trending?lang=malayalam  → Malayalam trending
 * GET /api/trending?lang=tamil      → Tamil trending
 *
 * Requires env vars: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
 * Falls back to hardcoded list if Spotify credentials are missing or API fails.
 *
 * Vercel Cron refreshes both languages daily at midnight UTC.
 */

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const SAAVN_BASE   = 'https://saavnapi-nine.vercel.app';

// Spotify playlist IDs
const PLAYLIST_IDS = {
  malayalam: '37i9dQZF1DWTYKFynxp6Fs',
  tamil:     '37i9dQZF1DX4Im4BTs2WMg',
  hindi:     '4nqbYFYZOCospBb4miwHWy',
  kannada:   '4TvxxFHYjBvRtaOrGl25N8',
  english:   '3Zu0J0JzSRzAT32LgFyg7i',
  telugu:    '37i9dQZF1DX4FofZ1AMKst',
  punjabi:   '37i9dQZF1DX5cZuAHLNjGz',
};

// Per-language in-memory cache
const cache = {
  malayalam: { data: null, updatedAt: 0 },
  tamil:     { data: null, updatedAt: 0 },
  hindi:     { data: null, updatedAt: 0 },
  kannada:   { data: null, updatedAt: 0 },
  english:   { data: null, updatedAt: 0 },
  telugu:    { data: null, updatedAt: 0 },
  punjabi:   { data: null, updatedAt: 0 },
};

// Spotify access token cache (tokens last 1 hour)
let spotifyToken = { value: null, expiresAt: 0 };

// ── Fallback hardcoded lists (used if Spotify creds missing / API fails) ──────

const FALLBACK = {
  malayalam: [
    { title: 'Ada Bommale',         artist: 'Rzee, Chinmayi Sripada' },
    { title: 'Amsham',              artist: 'Aksomaniac, M.H.R, Bhumi' },
    { title: 'Kinginichar',         artist: 'M.H.R, JOKER390P' },
    { title: 'Koodappirannor',      artist: 'Parvatish Pradeep, Sooraj Santhosh' },
    { title: 'Eelam Kili',          artist: 'Project Malabaricus, B.K. Harinarayanan' },
    { title: 'Chillara Flex',       artist: 'ARJN, KDS, FIFTY4, RONN' },
    { title: 'ZILL',                artist: 'M.H.R, Shafi Kollam, JOKER390P' },
    { title: 'Thooki',              artist: 'Arcado, Maalavika Sundar, Shabareesh Varma' },
    { title: 'Kaattuchembakam',     artist: 'Jakes Bejoy, Vishal Mishra, Aavani Malhar' },
    { title: 'Akale',               artist: 'Nevin Thomas, Akhil Jifroom, Deepu Antos' },
    { title: 'Chembarathi',         artist: 'Lil PAYYAN, AZWIN' },
    { title: 'Chambakka',           artist: 'Eechuu, Muthu' },
    { title: 'Saroja',              artist: 'Farhash, Muthu, Cee Vee, Ashley Milred' },
    { title: 'Kalyani',             artist: 'ARJN, KDS, FIFTY4, RONN' },
    { title: 'Vellarathaaram',      artist: 'Justin Prabhakaran, Vineeth Sreenivasan' },
    { title: 'Komala Thaamara',     artist: 'Varkey, Pranavam Sasi, Anil Lal' },
    { title: 'Cringe Paattu',       artist: 'Eechuu, E3Y, Suhas' },
    { title: 'Vayojana Zombie',     artist: 'Bibin Ashok, Hanan Sheah, Suhail Koya' },
    { title: 'Belyol',              artist: 'Dabzee, Edappal Bappu, Rishi Roy' },
    { title: 'Kunjikkavil Meghame', artist: 'Johnpaul George, Sooraj Santhosh' },
    { title: 'Shaadi Masti',        artist: 'Hanan Shaah, Sreehari K, Sharfu' },
    { title: 'Hope Song',           artist: 'Govind Vasantha, Kapil Kapilan, Anwar Ali' },
    { title: 'Delulu Delulu',       artist: 'Bibin Ashok, Fejo, Heykarthil' },
    { title: 'Puthu Mazha',         artist: 'Justin Prabhakaran, Shakthisree Gopalan' },
  ],
  tamil: [
    { title: 'Pavazha Malli',           artist: 'Sai Abhyankkar, Shruti Haasan' },
    { title: 'God Mode',                artist: 'Sai Abhyankkar, Gana Muthu' },
    { title: 'Raga of Revenge',         artist: 'Anirudh Ravichander' },
    { title: 'Mutta Kalakki',           artist: 'G. V. Prakash, Ken Karunaas' },
    { title: 'Raathu Raasan',           artist: 'Sai Abhyankkar, V.M. Mahalingam' },
    { title: 'Raavana Mavandaa',        artist: 'Anirudh Ravichander, Vivek' },
    { title: 'Dheema',                  artist: 'Anirudh Ravichander, Vignesh Shivan' },
    { title: 'Aura 10/10',             artist: 'Hiphop Tamizha, Thamizh Aadhavan' },
    { title: 'Verappa',                 artist: 'Sai Abhyankkar, Arivu' },
    { title: 'Singari',                 artist: 'Sai Abhyankkar, Pradeep Ranganathan' },
    { title: 'ICEBOY',                  artist: 'Asal Kolaar' },
    { title: 'Neelothi',               artist: 'Sooraj Santhosh, Chinmayi' },
    { title: 'Vari Vari',              artist: 'Dhee' },
    { title: 'Karuppa Kooda Va',       artist: 'Sai Abhyankkar, V.M. Mahalingam' },
    { title: 'Aaja Raja',              artist: 'Anirudh Ravichander' },
    { title: 'Naanga Naalu Peru',      artist: 'Sai Abhyankkar, Silambarasan TR' },
    { title: 'Aiyo Kadhaley',          artist: 'Sean Roldan, Vijaynarain' },
    { title: 'Oorum Blood',            artist: 'Sai Abhyankkar, Paal Dabba' },
    { title: 'Kannae Kanmaniye',       artist: 'A.R. Rahman, Mashook Rahman' },
    { title: 'Enakenna Yaarum Illaye', artist: 'Anirudh Ravichander, Vignesh Shivan' },
    { title: 'Thalapathy Kacheri',     artist: 'Anirudh Ravichander, Thalapathy Vijay' },
    { title: 'Marandhu Poche',         artist: 'Sean Roldan, Adithya RK' },
    { title: 'Monica',                 artist: 'Anirudh Ravichander' },
    { title: 'Othaiyadi Pathayila',    artist: 'Dhibu Ninan Thomas, Anirudh Ravichander' },
    { title: 'Maname',                 artist: 'Sarah Black' },
    { title: 'Aathi',                  artist: 'Anirudh Ravichander, Vishal Dadlani' },
    { title: 'Arjunar Villu',          artist: 'Vidyasagar, Sukhwinder Singh' },
    { title: 'Oru Pere Varalaaru',     artist: 'Anirudh Ravichander, Vishal Mishra' },
    { title: 'Machi Open the Bottle',  artist: 'Yuvan Shankar Raja, Mano' },
    { title: 'Kanimaa',                artist: 'Santhosh Narayanan' },
  ],
  hindi: [
    { title: 'Chaleya', artist: 'Anirudh Ravichander, Arijit Singh' },
    { title: 'Heeriye', artist: 'Jasleen Royal, Arijit Singh' },
    { title: 'O Maahi', artist: 'Arijit Singh, Pritam' },
    { title: 'Tum Kya Mile', artist: 'Arijit Singh, Shreya Ghoshal' },
    { title: 'Apna Bana Le', artist: 'Arijit Singh, Sachin-Jigar' }
  ],
  kannada: [
    { title: 'Singara Siriye', artist: 'Vijay Prakash, Ananya Bhat' },
    { title: 'Bombe Helutaite', artist: 'Vijay Prakash' },
    { title: 'Neenire Saniha', artist: 'Shreya Ghoshal' },
    { title: 'Belageddu', artist: 'Vijay Prakash' },
    { title: 'Garm Garam', artist: 'Sanjith Hegde' }
  ],
  english: [
    { title: 'Cruel Summer', artist: 'Taylor Swift' },
    { title: 'Blinding Lights', artist: 'The Weeknd' },
    { title: 'Watermelon Sugar', artist: 'Harry Styles' },
    { title: 'As It Was', artist: 'Harry Styles' },
    { title: 'Flowers', artist: 'Miley Cyrus' }
  ],
  telugu: [
    { title: 'Oo Antava Mava', artist: 'Indravathi Chauhan' },
    { title: 'Srivalli', artist: 'Sid Sriram' }
  ],
  punjabi: [
    { title: 'Excuses', artist: 'AP Dhillon' },
    { title: 'Brown Munde', artist: 'AP Dhillon' }
  ]
};

// ── Spotify API ───────────────────────────────────────────────────────────────

async function getSpotifyToken() {
  if (spotifyToken.value && Date.now() < spotifyToken.expiresAt) {
    return spotifyToken.value;
  }

  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET missing)');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body:   'grant_type=client_credentials',
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`Spotify token request failed: HTTP ${res.status}`);

  const data = await res.json();
  spotifyToken = {
    value:     data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // 60s buffer
  };

  console.log('[trending] Spotify token acquired');
  return spotifyToken.value;
}

/**
 * Fetch all tracks from a Spotify playlist (handles pagination, max 50/page).
 * Returns [{ title, artist }]
 */
async function fetchSpotifyPlaylist(playlistId) {
  const token  = await getSpotifyToken();
  const tracks = [];
  let   url    = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&fields=next,items(track(name,artists(name)))`;

  while (url) {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal:  AbortSignal.timeout(15_000),
    });

    if (!res.ok) throw new Error(`Spotify playlist fetch failed: HTTP ${res.status}`);
    const data = await res.json();

    for (const item of (data.items || [])) {
      const track = item?.track;
      if (!track || track.is_local) continue;
      tracks.push({
        title:  track.name,
        artist: track.artists.map(a => a.name).join(', '),
      });
    }

    url = data.next || null; // paginate
  }

  console.log(`[trending] Spotify returned ${tracks.length} tracks for playlist ${playlistId}`);
  return tracks;
}

// ── JioSaavn resolution ───────────────────────────────────────────────────────

function decodeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g,  '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>');
}

function forceHttps(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.startsWith('http')) return null;
  return url.replace(/^http:\/\//i, 'https://');
}

function normalizeSaavnSong(song, lang) {
  if (!song || !song.media_url) return null;
  return {
    id:             song.id,
    name:           decodeHtml(song.song || song.name || ''),
    primaryArtists: decodeHtml(song.primary_artists || song.singers || 'Unknown Artist'),
    album:          decodeHtml(
                      typeof song.album === 'object'
                        ? (song.album?.name || '')
                        : (song.album || '')
                    ),
    image:          forceHttps(song.image || null),
    streamUrl:      forceHttps(song.media_url),
    duration:       Number(song.duration) || 0,
    language:       song.language || lang,
  };
}

async function searchOneTrack({ title, artist }, lang) {
  const queries = [
    `${title} ${artist.split(',')[0].trim()}`,
    title,
  ];

  for (const q of queries) {
    const url = `${SAAVN_BASE}/result/?query=${encodeURIComponent(q)}&type=song&n=5`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data)) continue;
      for (const song of data) {
        const norm = normalizeSaavnSong(song, lang);
        if (norm) return norm;
      }
    } catch { /* try next query */ }
  }
  return null;
}

async function resolveOnJioSaavn(tracks, lang) {
  const results = [];
  const seen    = new Set();

  for (let i = 0; i < tracks.length; i += 5) {
    const batch   = tracks.slice(i, i + 5);
    const settled = await Promise.allSettled(batch.map(t => searchOneTrack(t, lang)));

    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value && !seen.has(r.value.id)) {
        seen.add(r.value.id);
        results.push(r.value);
      }
    }

    if (i + 5 < tracks.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log(`[trending:${lang}] JioSaavn resolved ${results.length}/${tracks.length} tracks`);
  return results;
}

// ── Full pipeline ─────────────────────────────────────────────────────────────

async function runPipeline(lang) {
  let spotifyTracks = null;

  // Try live Spotify fetch first
  try {
    spotifyTracks = await fetchSpotifyPlaylist(PLAYLIST_IDS[lang]);
    console.log(`[trending:${lang}] Using live Spotify data (${spotifyTracks.length} tracks)`);
  } catch (err) {
    console.warn(`[trending:${lang}] Spotify fetch failed, using fallback:`, err.message);
  }

  const tracks = (spotifyTracks && spotifyTracks.length > 0)
    ? spotifyTracks
    : FALLBACK[lang];

  const resolved = await resolveOnJioSaavn(tracks, lang);
  if (resolved.length === 0) throw new Error('No tracks resolved — JioSaavn API may be down');

  return resolved;
}

// ── Vercel serverless handler ─────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  const lang = (req.query?.lang || 'malayalam').toLowerCase();
  const force = req.query?.force === 'true';

  if (!PLAYLIST_IDS[lang]) {
    return res.status(400).json({
      error: `Unsupported language: ${lang}.`,
    });
  }

  const langCache = cache[lang];
  const now       = Date.now();
  const isCron    = req.headers['x-vercel-cron'] === '1';
  const isStale   = !langCache.data || (now - langCache.updatedAt) > CACHE_TTL_MS || force;

  if (isCron || isStale) {
    try {
      const tracks        = await runPipeline(lang);
      langCache.data      = tracks;
      langCache.updatedAt = now;
    } catch (err) {
      console.error(`[trending:${lang}] Pipeline failed:`, err.message);

      if (langCache.data) {
        return res.status(200).json({
          tracks:    langCache.data,
          updatedAt: langCache.updatedAt,
          source:    'stale',
          count:     langCache.data.length,
          warning:   `Pipeline failed: ${err.message}`,
        });
      }

      return res.status(500).json({ error: 'Trending pipeline failed', detail: err.message });
    }
  }

  res.status(200).json({
    tracks:    langCache.data,
    updatedAt: langCache.updatedAt,
    source:    isStale ? 'fresh' : 'cache',
    count:     langCache.data?.length || 0,
    lang,
  });
}
