import React from 'react';
import { Play, Pause, Heart } from 'lucide-react';
import usePlayerStore from '../store/usePlayerStore';

export default function MiniPlayer({ onExpand }) {
  const { currentSong, isPlaying, setIsPlaying, likedSongs, toggleLike } = usePlayerStore();
  if (!currentSong) return null;

  const isLiked = likedSongs.has(currentSong.id);

  return (
    <div className="mini-player" id="mini-player" onClick={onExpand}>
      {/* Album art */}
      <div className="mini-player-art">
        {currentSong.image
          ? <img src={currentSong.image} alt={currentSong.name} />
          : <span>🎵</span>}
      </div>

      {/* Track info */}
      <div className="mini-player-info">
        <div className="mini-player-title">{currentSong.name}</div>
        <div className="mini-player-artist">{currentSong.primaryArtists}</div>
      </div>

      {/* Like */}
      <button
        id="mini-like-btn"
        className={`mini-player-btn ${isLiked ? 'liked' : ''}`}
        onClick={e => { e.stopPropagation(); toggleLike(currentSong.id); }}
        aria-label="Like"
      >
        <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
      </button>

      {/* Play / Pause */}
      <button
        id="mini-play-btn"
        className="mini-player-btn accent-btn"
        onClick={e => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={22} /> : <Play size={22} />}
      </button>
    </div>
  );
}
