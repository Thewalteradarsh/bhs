import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Play, Pause, Shuffle, MoreVertical, Music2, CheckCircle2, BadgeCheck } from 'lucide-react';
import { getSongsByArtist, formatTime } from '../services/saavnService';
import usePlayerStore from '../store/usePlayerStore';
import TrackOptionsMenu from './TrackOptionsMenu';

/* ─── tiny avatar → initials ─────────────────────────────────── */
function ArtistAvatar({ name, image }) {
  const [imgOk, setImgOk] = useState(true);
  const initials = name
    ? name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  if (image && imgOk) {
    return (
      <img
        src={image}
        alt={name}
        className="artist-hero-img"
        onError={() => setImgOk(false)}
      />
    );
  }
  return (
    <div className="artist-hero-initials">
      {initials}
    </div>
  );
}

export default function ArtistView({ artistName, artistImage, onBack }) {
  const [songs, setSongs]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const dotsRefs = useRef({});

  const { currentSong, isPlaying, playSong, setIsPlaying } = usePlayerStore();

  /* fetch songs */
  useEffect(() => {
    setLoading(true);
    getSongsByArtist(artistName)
      .then(setSongs)
      .catch(() => setSongs([]))
      .finally(() => setLoading(false));
  }, [artistName]);

  const handlePlay = (song) => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      playSong(song, songs);
    }
  };

  const handlePlayAll = () => {
    if (songs.length) playSong(songs[0], songs);
  };

  const handleShuffle = () => {
    if (!songs.length) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled);
  };

  const toggleMenu = (e, songId) => {
    e.stopPropagation();
    setOpenMenuId(prev => (prev === songId ? null : songId));
  };

  return (
    <div className="artist-view">
      {/* ── HERO ── */}
      <div className="artist-hero">
        <div className="artist-hero-art">
          <ArtistAvatar name={artistName} image={artistImage} />
          {/* gradient fade from bottom of art */}
          <div className="artist-hero-fade" />
        </div>

        {/* back btn */}
        <button className="artist-back-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>

        {/* Artist info overlaid on the hero */}
        <div className="artist-hero-info">
          <div className="artist-verified">
            <CheckCircle2 size={16} className="artist-verified-icon" />
            <span>Verified Artist</span>
          </div>
          <h1 className="artist-name">{artistName}</h1>
          {!loading && (
            <p className="artist-song-count">
              {songs.length} songs
            </p>
          )}
        </div>
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div className="artist-actions">
        <button className="artist-play-btn" onClick={handlePlayAll} id="artist-play-all">
          <Play size={22} fill="currentColor" />
        </button>
        <button className="artist-shuffle-btn" onClick={handleShuffle} id="artist-shuffle">
          <Shuffle size={18} />
        </button>
      </div>

      {/* ── SONG LIST ── */}
      <div className="artist-songs-section">
        <div className="artist-songs-label">Popular</div>

        {loading && (
          <div className="artist-skeleton-list">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton skeleton-row" style={{ marginBottom: 4 }} />
            ))}
          </div>
        )}

        {!loading && songs.length === 0 && (
          <div className="empty-state">
            <Music2 size={48} strokeWidth={1} />
            <p>No songs found for <strong>{artistName}</strong></p>
          </div>
        )}

        {!loading && songs.length > 0 && (
          <div className="artist-song-list">
            {songs.map((song, idx) => {
              const isCurrent   = currentSong?.id === song.id;
              const isCurPlaying = isCurrent && isPlaying;
              const menuOpen    = openMenuId === song.id;
              if (!dotsRefs.current[song.id]) {
                dotsRefs.current[song.id] = React.createRef();
              }
              return (
                <div
                  key={song.id}
                  id={`artist-song-${song.id}`}
                  className={`artist-song-row ${isCurrent ? 'artist-song-row--playing' : ''}`}
                  onClick={() => handlePlay(song)}
                  role="button"
                  aria-label={`Play ${song.name}`}
                >
                  {/* rank / equalizer */}
                  <div className="artist-song-rank">
                    {isCurPlaying
                      ? <span className="artist-song-eq">▶</span>
                      : <span className="artist-song-num">{idx + 1}</span>
                    }
                  </div>

                  {/* thumb */}
                  <div className="artist-song-thumb">
                    {song.image
                      ? <img src={song.image} alt={song.name} loading="lazy" />
                      : '🎵'}
                  </div>

                  {/* info */}
                  <div className="artist-song-info">
                    <div className="artist-song-name" style={{ color: isCurrent ? 'var(--accent)' : undefined, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {song.name}
                      {song.source === 'jiosaavn' && <BadgeCheck size={14} color="#4CAF50" aria-label="Verified Source" />}
                    </div>
                    <div className="artist-song-meta">{song.album || song.primaryArtists}</div>
                  </div>

                  {/* duration */}
                  <div className="artist-song-duration">{formatTime(song.duration)}</div>

                  {/* three-dots */}
                  <button
                    ref={dotsRefs.current[song.id]}
                    className="row-dots-btn"
                    id={`artist-dots-${song.id}`}
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
        )}
      </div>
    </div>
  );
}
