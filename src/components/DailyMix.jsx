import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getDailyMixData, MIX_THEMES, invalidateDailyMixCache } from '../lib/dailyMix';
import { searchSongs } from '../services/saavnService';
import usePlayerStore from '../store/usePlayerStore';
import { Play, RefreshCw, Loader2 } from 'lucide-react';
import SeeAllView from './SeeAllView';

// ── Simple in-memory cache so navigating away/back doesn't re-fetch ───────────
const SONGS_CACHE = new Map();
const SONGS_CACHE_KEY = 'hear_daily_mix_songs_v2';
const GLOBAL_SEEN_MIX_SONGS = new Set();
const SONGS_TTL = 12 * 60 * 60 * 1000;

function loadSongsFromStorage() {
  try {
    const raw = localStorage.getItem(SONGS_CACHE_KEY);
    if (!raw) return;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > SONGS_TTL) {
      localStorage.removeItem(SONGS_CACHE_KEY);
      return;
    }
    Object.entries(data).forEach(([k, v]) => SONGS_CACHE.set(k, v));
  } catch {}
}

function saveSongsToStorage() {
  try {
    const obj = {};
    SONGS_CACHE.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(SONGS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: obj }));
  } catch {}
}

// Load persisted songs on first import
loadSongsFromStorage();

// Staggered fetch: fire queries for one mix, with a delay before starting
async function fetchMixSongs(queries, cacheKey) {
  if (SONGS_CACHE.has(cacheKey)) {
    const cached = SONGS_CACHE.get(cacheKey);
    cached.forEach(s => GLOBAL_SEEN_MIX_SONGS.add(s.id));
    return cached;
  }

  const seen = new Set();
  const results = [];

  // Fire queries one at a time with a small gap to avoid 429
  for (const q of queries) {
    try {
      const songs = await searchSongs(q);
      songs.forEach(s => {
        // Prevent duplicates within this mix AND across other daily mixes
        if (!seen.has(s.id) && !GLOBAL_SEEN_MIX_SONGS.has(s.id)) { 
          seen.add(s.id); 
          results.push(s); 
        }
      });
      // Small pause between queries within a mix
      await new Promise(r => setTimeout(r, 150));
    } catch {
      // ignore individual query failures
    }
  }

  const shuffled = results.sort(() => Math.random() - 0.5).slice(0, 30);
  shuffled.forEach(s => GLOBAL_SEEN_MIX_SONGS.add(s.id));
  
  SONGS_CACHE.set(cacheKey, shuffled);
  saveSongsToStorage();
  return shuffled;
}

// ── Individual Mix Card ────────────────────────────────────────────────────────
function MixCard({ theme, mixData, onOpenMix, loadDelay }) {
  const { currentSong, isPlaying, playSong, setIsPlaying } = usePlayerStore();
  const [songs, setSongs]     = useState(() => SONGS_CACHE.get(`mix_${theme.id}`) || []);
  const [loading, setLoading] = useState(!SONGS_CACHE.has(`mix_${theme.id}`));
  const [thumbs, setThumbs]   = useState(() => {
    const cached = SONGS_CACHE.get(`mix_${theme.id}`) || [];
    return cached.filter(s => s.image).slice(0, 4).map(s => s.image);
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!mixData?.queries?.length) { setLoading(false); return; }

    // If already cached, use it
    const cacheKey = `mix_${theme.id}`;
    if (SONGS_CACHE.has(cacheKey)) {
      const cached = SONGS_CACHE.get(cacheKey);
      setSongs(cached);
      setThumbs(cached.filter(s => s.image).slice(0, 4).map(s => s.image));
      setLoading(false);
      return;
    }

    // Stagger start by card index to avoid simultaneous bursts
    const timer = setTimeout(async () => {
      if (!mountedRef.current) return;
      setLoading(true);
      try {
        const loaded = await fetchMixSongs(mixData.queries, cacheKey);
        if (!mountedRef.current) return;
        setSongs(loaded);
        setThumbs(loaded.filter(s => s.image).slice(0, 4).map(s => s.image));
      } catch {
        if (mountedRef.current) setSongs([]);
      }
      if (mountedRef.current) setLoading(false);
    }, loadDelay);

    return () => clearTimeout(timer);
  }, [mixData, theme.id, loadDelay]);

  const isAnyPlaying = songs.some(s => s.id === currentSong?.id) && isPlaying;

  const handlePlay = (e) => {
    e.stopPropagation();
    if (!songs.length) return;
    if (isAnyPlaying) { setIsPlaying(false); return; }
    const firstPlaying = songs.find(s => s.id === currentSong?.id);
    if (firstPlaying) { setIsPlaying(true); return; }
    playSong(songs[0], songs);
  };

  return (
    <div
      className="daily-mix-card"
      onClick={() => songs.length && onOpenMix({ label: mixData.title || theme.label, songs })}
      id={`daily-mix-${theme.id}`}
      role="button"
      aria-label={`Open ${theme.label}`}
    >
      {/* Cover: mosaic / single image / gradient+emoji */}
      <div className="daily-mix-cover" style={{ background: theme.gradient }}>
        {loading ? (
          <div className="daily-mix-cover-loader">
            <Loader2 size={22} className="daily-mix-spin" style={{ color: theme.accentColor }} />
          </div>
        ) : thumbs.length >= 4 ? (
          <div className="daily-mix-mosaic">
            {thumbs.slice(0, 4).map((src, i) => (
              <img key={i} src={src} alt="" className="daily-mix-mosaic-img" loading="lazy" />
            ))}
          </div>
        ) : thumbs.length > 0 ? (
          <img src={thumbs[0]} alt="" className="daily-mix-cover-single" loading="lazy" />
        ) : (
          <span className="daily-mix-cover-emoji">{theme.emoji}</span>
        )}

        {/* Gradient overlay for readability */}
        {(thumbs.length > 0) && (
          <div className="daily-mix-cover-overlay" />
        )}

        {/* Play / Pause button */}
        {!loading && songs.length > 0 && (
          <button
            className={`daily-mix-play-btn ${isAnyPlaying ? 'daily-mix-play-btn--playing' : ''}`}
            onClick={handlePlay}
            aria-label={isAnyPlaying ? 'Pause' : 'Play'}
            style={{ '--mix-accent': theme.accentColor }}
          >
            {isAnyPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />
            )}
          </button>
        )}
      </div>

      {/* Labels */}
      <div className="daily-mix-info">
        <div className="daily-mix-label">{theme.label}</div>
        <div className="daily-mix-title">{loading ? '…' : (mixData.title || theme.description)}</div>
        <div className="daily-mix-count">
          {loading
            ? <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Loading…</span>
            : songs.length > 0
              ? `${songs.length} songs`
              : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Tap to explore</span>
          }
        </div>
      </div>
    </div>
  );
}

// ── DailyMix Section ──────────────────────────────────────────────────────────
export default function DailyMix({ onSeeAll }) {
  const [mixDataList, setMixDataList] = useState([]);
  const [metaStatus, setMetaStatus]   = useState('loading');
  const [seeAllSection, setSeeAllSection] = useState(null);

  const load = useCallback(async (forceRefresh = false) => {
    setMetaStatus('loading');
    GLOBAL_SEEN_MIX_SONGS.clear(); // Reset cross-mix duplicate tracker on reload
    if (forceRefresh) {
      invalidateDailyMixCache();
      SONGS_CACHE.clear();
      try { localStorage.removeItem(SONGS_CACHE_KEY); } catch {}
    }
    try {
      const data = await getDailyMixData();
      setMixDataList(data);
      setMetaStatus('done');
    } catch {
      setMetaStatus('error');
    }
  }, []);

  useEffect(() => { load(false); }, [load]);

  const handleOpenMix = (section) => {
    if (onSeeAll) onSeeAll(section);
    else setSeeAllSection(section);
  };

  if (seeAllSection) {
    return <SeeAllView section={seeAllSection} onClose={() => setSeeAllSection(null)} />;
  }

  return (
    <div className="section daily-mix-section">
      <div className="section-header">
        <h2 className="section-title">
          🎛️ Daily Mixes
          <span className="daily-mix-badge">Personalized</span>
        </h2>
        <button
          className="rec-refresh-btn"
          onClick={() => load(true)}
          aria-label="Refresh Daily Mixes"
          title="Refresh mixes"
          disabled={metaStatus === 'loading'}
        >
          <RefreshCw size={14} className={metaStatus === 'loading' ? 'daily-mix-spin' : ''} />
        </button>
      </div>

      {/* Show skeletons while metadata loads */}
      {metaStatus === 'loading' && !mixDataList.length ? (
        <div className="daily-mix-scroll">
          {MIX_THEMES.map(theme => (
            <div key={theme.id} className="daily-mix-card-skeleton">
              <div
                className="skeleton"
                style={{
                  width: '100%', aspectRatio: '1', borderRadius: 12,
                  background: theme.gradient, opacity: 0.5,
                }}
              />
              <div className="skeleton" style={{ height: 12, borderRadius: 6, marginTop: 10, width: '60%' }} />
              <div className="skeleton" style={{ height: 14, borderRadius: 6, marginTop: 6, width: '80%' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="daily-mix-scroll">
          {MIX_THEMES.map((theme, idx) => (
            <MixCard
              key={theme.id}
              theme={theme}
              // Stagger each card by 800ms to prevent simultaneous API bursts
              loadDelay={idx * 800}
              mixData={mixDataList[idx] || { title: theme.description, queries: [] }}
              onOpenMix={handleOpenMix}
            />
          ))}
        </div>
      )}
    </div>
  );
}
