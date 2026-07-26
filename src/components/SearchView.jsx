import React, { useState, useRef, useEffect } from 'react';
import { Search as SearchIcon, X, Music2, MoreVertical, Mic2, BadgeCheck } from 'lucide-react';
import { searchSongs, formatTime } from '../services/saavnService';
import usePlayerStore from '../store/usePlayerStore';
import { Play, Pause } from 'lucide-react';
import TrackOptionsMenu from './TrackOptionsMenu';
import ArtistView from './ArtistView';
import SeeAllView from './SeeAllView';
import { fetchTrending } from '../lib/trending';
import malayalamClassicsData from '../lib/malayalam_classics_data.json';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Given search results, extract unique artists ranked by frequency.
 * Returns an array of { name, image } objects (top 5).
 */
function extractArtists(results) {
  const map = new Map();
  for (const song of results) {
    const names = (song.primaryArtists || '').split(/[,&]/).map(n => n.trim()).filter(Boolean);
    for (const name of names) {
      if (!map.has(name)) {
        map.set(name, { name, image: song.image, count: 1 });
      } else {
        map.get(name).count += 1;
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export default function SearchView() {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [artistView, setArtistView] = useState(null); // { name, image } or null
  const [playlistView, setPlaylistView] = useState(null); // { label, songs } or null
  const [playlistMatch, setPlaylistMatch] = useState(null);
  const inputRef  = useRef(null);
  const dotsRefs  = useRef({});
  const debouncedQuery = useDebounce(query, 400);

  const { currentSong, isPlaying, playSong, setIsPlaying } = usePlayerStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = debouncedQuery.trim().toLowerCase();
    
    let match = null;
    if (q === 'trending now malayalam' || q === 'malayalam trending') {
      match = { label: 'Trending Now Malayalam 🔥', fetchFn: () => fetchTrending('malayalam') };
    } else if (q === 'trending now tamil' || q === 'tamil trending') {
      match = { label: 'Trending Now Tamil 🎵', fetchFn: () => fetchTrending('tamil') };
    } else if (q === 'malayalam classics' || q === 'classic malayalam songs') {
      match = { label: 'Malayalam Classics 🌴', fetchFn: async () => malayalamClassicsData };
    }
    setPlaylistMatch(match);

    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    searchSongs(debouncedQuery)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const handlePlay = (song) => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      playSong(song, results);
    }
  };

  const toggleMenu = (e, songId) => {
    e.stopPropagation();
    setOpenMenuId(prev => (prev === songId ? null : songId));
  };

  /* ── If a playlist page is open, show it ── */
  if (playlistView) {
    return (
      <SeeAllView
        section={playlistView}
        onClose={() => setPlaylistView(null)}
      />
    );
  }

  /* ── If an artist page is open, show it ── */
  if (artistView) {
    return (
      <ArtistView
        artistName={artistView.name}
        artistImage={artistView.image}
        onBack={() => setArtistView(null)}
      />
    );
  }

  /* ── Extract artist suggestions from results ── */
  const artists = results.length > 0 ? extractArtists(results) : [];

  /* ── Check if the top result looks like an exact artist match ── */
  const topArtist = artists[0];
  const isArtistSearch =
    topArtist &&
    debouncedQuery.trim().toLowerCase().split(/\s+/).every(word =>
      topArtist.name.toLowerCase().includes(word)
    );

  return (
    <div>
      <div className="search-container">
        <div className="search-bar">
          <SearchIcon size={18} className="search-icon" />
          <input
            ref={inputRef}
            id="search-input"
            type="text"
            placeholder="Search songs, artists…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button
              id="search-clear"
              onClick={() => setQuery('')}
              style={{
                position: 'absolute', right: 16, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="search-results">
        {loading && (
          <div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton skeleton-row" />
            ))}
          </div>
        )}

        {!loading && debouncedQuery && results.length === 0 && !playlistMatch && (
          <div className="empty-state">
            <Music2 size={48} strokeWidth={1} />
            <p>No results found for "<strong>{debouncedQuery}</strong>"</p>
          </div>
        )}

        {!loading && !debouncedQuery && (
          <div className="empty-state">
            <SearchIcon size={48} strokeWidth={1} />
            <p>Find songs, artists, and albums</p>
          </div>
        )}

        {/* ── PLAYLIST CARD (custom matches) ── */}
        {playlistMatch && (
          <div className="artist-search-section">
            <div className="search-results-title">Playlists</div>
            <div
              className="artist-search-card"
              onClick={async () => {
                setLoading(true);
                const songs = await playlistMatch.fetchFn();
                setLoading(false);
                setPlaylistView({ label: playlistMatch.label, songs });
              }}
              role="button"
            >
              <div className="artist-search-avatar" style={{ borderRadius: '8px', background: '#333' }}>
                <Music2 size={32} />
              </div>
              <div className="artist-search-info">
                <div className="artist-search-name">{playlistMatch.label}</div>
                <div className="artist-search-label">Playlist</div>
              </div>
              <div className="artist-search-chevron">›</div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <>
            {/* ── ARTIST CARD (shown when query looks like an artist) ── */}
            {isArtistSearch && (
              <div className="artist-search-section">
                <div className="search-results-title">Artist</div>
                <div
                  className="artist-search-card"
                  id={`artist-card-${topArtist.name.replace(/\s+/g, '-')}`}
                  onClick={() => setArtistView(topArtist)}
                  role="button"
                  aria-label={`View artist ${topArtist.name}`}
                >
                  <div className="artist-search-avatar">
                    {topArtist.image
                      ? <img src={topArtist.image} alt={topArtist.name} />
                      : <Mic2 size={32} />}
                  </div>
                  <div className="artist-search-info">
                    <div className="artist-search-name">{topArtist.name}</div>
                    <div className="artist-search-label">Artist</div>
                  </div>
                  <div className="artist-search-chevron">›</div>
                </div>
              </div>
            )}

            {/* ── ALL ARTIST BUBBLES (when multiple artists detected) ── */}
            {!isArtistSearch && artists.length > 1 && (
              <div className="artist-chips-section">
                <div className="search-results-title">Artists</div>
                <div className="artist-chips-scroll">
                  {artists.map(a => (
                    <button
                      key={a.name}
                      className="artist-chip"
                      id={`artist-chip-${a.name.replace(/\s+/g, '-')}`}
                      onClick={() => setArtistView(a)}
                      aria-label={`View artist ${a.name}`}
                    >
                      <div className="artist-chip-avatar">
                        {a.image
                          ? <img src={a.image} alt={a.name} />
                          : <Mic2 size={20} />}
                      </div>
                      <span className="artist-chip-name">{a.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── SONGS LIST ── */}
            <div className="search-results-title">Songs</div>
            <div className="result-list">
              {results.map((song) => {
                const isCurrent    = currentSong?.id === song.id;
                const isCurPlaying = isCurrent && isPlaying;
                const menuOpen     = openMenuId === song.id;
                if (!dotsRefs.current[song.id]) {
                  dotsRefs.current[song.id] = React.createRef();
                }
                return (
                  <div
                    key={song.id}
                    id={`result-${song.id}`}
                    className={`result-item ${isCurrent ? 'playing' : ''}`}
                    onClick={() => handlePlay(song)}
                    role="button"
                    aria-label={`Play ${song.name}`}
                    style={{ position: 'relative' }}
                  >
                    <div className="result-thumb">
                      {song.image
                        ? <img src={song.image} alt={song.name} loading="lazy" />
                        : '🎵'}
                    </div>
                    <div className="result-info">
                      <div className="result-title" style={{ color: isCurrent ? 'var(--accent)' : undefined, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {song.name}
                        {song.source === 'jiosaavn' && <BadgeCheck size={14} color="#4CAF50" aria-label="Verified Source" />}
                      </div>
                      <div className="result-artist">{song.primaryArtists}</div>
                    </div>
                    {isCurPlaying && (
                      <div className="result-playing-icon">
                        <Pause size={16} />
                      </div>
                    )}
                    {!isCurPlaying && isCurrent && (
                      <div className="result-playing-icon">
                        <Play size={16} />
                      </div>
                    )}
                    <div className="result-duration">{formatTime(song.duration)}</div>

                    <button
                      ref={dotsRefs.current[song.id]}
                      className="row-dots-btn"
                      id={`search-dots-${song.id}`}
                      onClick={(e) => toggleMenu(e, song.id)}
                      aria-label="More options"
                      aria-expanded={menuOpen}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {menuOpen && (
                      <TrackOptionsMenu
                        song={song}
                        onClose={() => setOpenMenuId(null)}
                        anchorRef={dotsRefs.current[song.id]}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
