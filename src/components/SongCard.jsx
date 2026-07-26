import React, { useState, useRef } from 'react';
import { Play, Pause, MoreVertical, BadgeCheck } from 'lucide-react';
import usePlayerStore from '../store/usePlayerStore';
import TrackOptionsMenu from './TrackOptionsMenu';

export default function SongCard({ song, queue = [], index = 0 }) {
  const { currentSong, isPlaying, playSong, setIsPlaying } = usePlayerStore();
  const isCurrentSong = currentSong?.id === song.id;
  const isCurrentPlaying = isCurrentSong && isPlaying;
  const [menuOpen, setMenuOpen] = useState(false);
  const dotsRef = useRef(null);

  const handleClick = () => {
    if (isCurrentSong) {
      setIsPlaying(!isPlaying);
    } else {
      playSong(song, queue);
    }
  };

  const handleDotsClick = (e) => {
    e.stopPropagation();
    setMenuOpen(v => !v);
  };

  return (
    <div
      className="song-card"
      id={`song-card-${song.id}`}
      onClick={handleClick}
      role="button"
      aria-label={`Play ${song.name} by ${song.primaryArtists}`}
      style={{ position: 'relative' }}
    >
      <div style={{ position: 'relative' }}>
        {song.image ? (
          <img
            className="song-card-thumb-img"
            src={song.image}
            alt={song.name}
            loading="lazy"
            style={{ width: '100%', aspectRatio: '1', borderRadius: 8, objectFit: 'cover', display: 'block', marginBottom: 12 }}
          />
        ) : (
          <div className="song-card-placeholder">🎵</div>
        )}
        <div className={`play-overlay ${isCurrentPlaying ? 'playing' : ''}`}>
          {isCurrentPlaying ? <Pause size={18} color="#000" /> : <Play size={18} color="#000" />}
        </div>
      </div>
      <div className="song-card-title" style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
        {song.name}
        {song.source === 'jiosaavn' && <BadgeCheck size={14} color="#4CAF50" aria-label="Verified Source" />}
      </div>
      <div className="song-card-artist">{song.primaryArtists}</div>

      {/* Three-dots button */}
      <button
        ref={dotsRef}
        className="song-card-dots"
        id={`dots-${song.id}`}
        onClick={handleDotsClick}
        aria-label="More options"
        aria-expanded={menuOpen}
      >
        <MoreVertical size={15} />
      </button>

      {menuOpen && (
        <TrackOptionsMenu
          song={song}
          onClose={() => setMenuOpen(false)}
          anchorRef={dotsRef}
        />
      )}
    </div>
  );
}
