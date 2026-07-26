import React, { useState, useEffect, useRef, useCallback } from 'react';
import usePlayerStore from '../store/usePlayerStore';
import {
  SkipBack, SkipForward, Play, Pause, Volume2, VolumeX,
  Shuffle, Repeat, Heart, BadgeCheck
} from 'lucide-react';
import { formatTime } from '../services/saavnService';
import SleepTimer from './SleepTimer';

export default function Player() {
  const {
    currentSong,
    isPlaying,
    setIsPlaying,
    playNext,
    playPrev,
    volume,
    setVolume,
    isShuffle,
    toggleShuffle,
    isRepeat,
    toggleRepeat,
    likedSongs,
    toggleLike,
  } = usePlayerStore();

  const [progress, setProgress] = useState(0); // 0-1
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressRef = useRef(null);
  const rafRef = useRef(null);

  // Update progress bar from audio element
  const tick = useCallback(() => {
    const audio = window.__audioEngine;
    if (audio && !isNaN(audio.duration)) {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration);
      setProgress(audio.currentTime / audio.duration);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const handleProgressClick = (e) => {
    const audio = window.__audioEngine;
    if (!audio || !audio.duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
    setProgress(pct);
  };

  const isLiked = currentSong ? likedSongs.has(currentSong.id) : false;

  const EmptyPlayer = () => (
    <div className="player">
      <div className="player-left">
        <div className="player-art" style={{ background: 'var(--bg-card)' }}>🎵</div>
        <div className="player-track">
          <div className="player-track-title" style={{ color: 'var(--text-muted)' }}>Nothing playing</div>
          <div className="player-track-artist">Select a song to start</div>
        </div>
      </div>
      <div className="player-center">
        <div className="player-controls">
          <button className="ctrl-btn" disabled><Shuffle size={16} /></button>
          <button className="ctrl-btn" disabled><SkipBack size={18} /></button>
          <button className="play-btn" disabled><Play size={18} /></button>
          <button className="ctrl-btn" disabled><SkipForward size={18} /></button>
          <button className="ctrl-btn" disabled><Repeat size={16} /></button>
        </div>
        <div className="progress-row">
          <span className="progress-time">0:00</span>
          <div className="progress-bar"><div className="progress-fill" style={{ width: '0%' }} /></div>
          <span className="progress-time right">0:00</span>
        </div>
      </div>
      <div className="player-right">
        <div className="volume-row">
          <Volume2 size={18} color="var(--text-muted)" />
          <input type="range" className="volume-slider" min="0" max="1" step="0.01" defaultValue="0.8" />
        </div>
      </div>
    </div>
  );

  if (!currentSong) return <EmptyPlayer />;

  return (
    <div className="player">
      {/* LEFT – song info */}
      <div className="player-left">
        <div className="player-art">
          {currentSong.image
            ? <img src={currentSong.image} alt={currentSong.name} />
            : '🎵'}
        </div>
        <div className="player-track" style={{ flex: 1, minWidth: 0 }}>
          <div className="player-track-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {currentSong.name}
            {currentSong.source === 'jiosaavn' && <BadgeCheck size={14} color="#4CAF50" aria-label="Verified Source" />}
          </div>
          <div className="player-track-artist">{currentSong.primaryArtists}</div>
        </div>
        <button
          id="like-btn"
          className={`player-heart ${isLiked ? 'liked' : ''}`}
          onClick={() => toggleLike(currentSong.id)}
          title={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* CENTER – controls + progress */}
      <div className="player-center">
        <div className="player-controls">
          <button
            id="shuffle-btn"
            className={`ctrl-btn ${isShuffle ? 'active' : ''}`}
            onClick={toggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={16} />
          </button>
          <button id="prev-btn" className="ctrl-btn" onClick={playPrev} title="Previous">
            <SkipBack size={18} />
          </button>
          <button
            id="play-pause-btn"
            className="play-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button id="next-btn" className="ctrl-btn" onClick={playNext} title="Next">
            <SkipForward size={18} />
          </button>
          <button
            id="repeat-btn"
            className={`ctrl-btn ${isRepeat ? 'active' : ''}`}
            onClick={toggleRepeat}
            title="Repeat"
          >
            <Repeat size={16} />
          </button>
        </div>

        <div className="progress-row">
          <span className="progress-time">{formatTime(currentTime)}</span>
          <div
            ref={progressRef}
            className="progress-bar"
            onClick={handleProgressClick}
            role="slider"
            aria-label="Song progress"
          >
            <div className="progress-fill" style={{ width: `${progress * 100}%` }}>
              <div
                className="progress-thumb"
                style={{ left: '100%' }}
              />
            </div>
          </div>
          <span className="progress-time right">{formatTime(duration)}</span>
        </div>
      </div>

      {/* RIGHT – volume + sleep timer */}
      <div className="player-right">
        <div className="volume-row">
          <button
            id="mute-btn"
            className="ctrl-btn"
            onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
            title="Mute"
          >
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            id="volume-slider"
            className="volume-slider"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
          />
          <SleepTimer />
        </div>
      </div>
    </div>
  );
}
