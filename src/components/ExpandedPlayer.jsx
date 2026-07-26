import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronDown, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Heart, Volume2, MoreHorizontal,
} from 'lucide-react';
import usePlayerStore from '../store/usePlayerStore';
import { formatTime } from '../services/saavnService';
import SleepTimer from './SleepTimer';

export default function ExpandedPlayer({ onClose }) {
  const {
    currentSong, isPlaying, setIsPlaying,
    playNext, playPrev, isShuffle, toggleShuffle,
    isRepeat, toggleRepeat, volume, setVolume,
    likedSongs, toggleLike,
  } = usePlayerStore();

  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressRef = useRef(null);
  const rafRef = useRef(null);

  const tick = useCallback(() => {
    const audio = window.__audioEngine;
    if (audio && !isNaN(audio.duration)) {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration);
      setProgress(audio.duration > 0 ? audio.currentTime / audio.duration : 0);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // Swipe down to close
  const startY = useRef(null);
  const handleTouchStart = (e) => { startY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    if (startY.current !== null) {
      const dy = e.changedTouches[0].clientY - startY.current;
      if (dy > 80) onClose();
      startY.current = null;
    }
  };

  const handleProgressClick = (e) => {
    const audio = window.__audioEngine;
    if (!audio || !audio.duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
    setProgress(pct);
  };

  const isLiked = currentSong ? likedSongs.has(currentSong.id) : false;
  if (!currentSong) return null;

  return (
    <div
      className="expanded-player"
      id="expanded-player"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="ep-header">
        <button id="ep-close" className="ep-icon-btn" onClick={onClose} aria-label="Close">
          <ChevronDown size={28} />
        </button>
        <div className="ep-header-center">
          <span className="ep-mini-label">Now Playing</span>
          <span className="ep-album">{currentSong.album || 'Single'}</span>
        </div>
        <button className="ep-icon-btn" aria-label="More options">
          <MoreHorizontal size={24} />
        </button>
      </div>

      {/* Album art */}
      <div className="ep-art-wrapper">
        <div className="ep-art">
          {currentSong.image
            ? <img src={currentSong.image} alt={currentSong.name} />
            : <span className="ep-art-emoji">🎵</span>}
        </div>
      </div>

      {/* Title + Like */}
      <div className="ep-title-row">
        <div className="ep-title-info">
          <div className="ep-title">{currentSong.name}</div>
          <div className="ep-artist">{currentSong.primaryArtists}</div>
        </div>
        <button
          id="ep-like-btn"
          className={`ep-icon-btn ep-like ${isLiked ? 'liked' : ''}`}
          onClick={() => toggleLike(currentSong.id)}
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Progress */}
      <div className="ep-progress-section">
        <div
          ref={progressRef}
          className="ep-progress-bar"
          onClick={handleProgressClick}
          role="slider"
          aria-label="Song progress"
        >
          <div className="ep-progress-track">
            <div className="ep-progress-fill" style={{ width: `${progress * 100}%` }}>
              <div className="ep-progress-thumb" />
            </div>
          </div>
        </div>
        <div className="ep-time-row">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="ep-controls">
        <button
          id="ep-shuffle"
          className={`ep-ctrl ${isShuffle ? 'active' : ''}`}
          onClick={toggleShuffle}
          aria-label="Shuffle"
        >
          <Shuffle size={20} />
        </button>
        <button id="ep-prev" className="ep-ctrl" onClick={playPrev} aria-label="Previous">
          <SkipBack size={28} />
        </button>
        <button
          id="ep-play"
          className="ep-play-btn"
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={30} /> : <Play size={30} />}
        </button>
        <button id="ep-next" className="ep-ctrl" onClick={playNext} aria-label="Next">
          <SkipForward size={28} />
        </button>
        <button
          id="ep-repeat"
          className={`ep-ctrl ${isRepeat ? 'active' : ''}`}
          onClick={toggleRepeat}
          aria-label="Repeat"
        >
          <Repeat size={20} />
        </button>
      </div>

      {/* Volume + Sleep Timer */}
      <div className="ep-volume-row">
        <Volume2 size={16} color="var(--text-muted)" />
        <input
          type="range"
          className="ep-volume-slider"
          min="0" max="1" step="0.01"
          value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          aria-label="Volume"
        />
        <SleepTimer />
      </div>
    </div>
  );
}
