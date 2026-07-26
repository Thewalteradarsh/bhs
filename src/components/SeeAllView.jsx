import React, { useState, useRef } from 'react';
import { ArrowLeft, Play, Pause, MoreVertical, Search, BadgeCheck } from 'lucide-react';
import usePlayerStore from '../store/usePlayerStore';
import { formatTime } from '../services/saavnService';
import TrackOptionsMenu from './TrackOptionsMenu';

export default function SeeAllView({ section, onClose }) {
  const { currentSong, isPlaying, playSong, setIsPlaying } = usePlayerStore();
  const [openMenuId, setOpenMenuId] = useState(null);
  const dotsRefs = useRef({});

  const [searchQuery, setSearchQuery] = useState('');

  if (!section) return null;

  const handleSongClick = (song) => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      playSong(song, section.songs);
    }
  };

  const toggleMenu = (e, songId) => {
    e.stopPropagation();
    setOpenMenuId(prev => (prev === songId ? null : songId));
  };

  const filteredSongs = section.songs.filter(song => 
    song.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    song.primaryArtists.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSeconds = section.songs.reduce((acc, song) => acc + (Number(song.duration) || 0), 0);
  let durationStr = '';
  if (totalSeconds > 0) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) durationStr = ` • ${h} hr ${m} min`;
    else if (m > 0) durationStr = ` • ${m} min`;
  }

  return (
    <div className="see-all-view" id="see-all-view">
      {/* Header */}
      <div className="see-all-header">
        <button
          className="see-all-back"
          onClick={onClose}
          aria-label="Go back"
          id="see-all-back-btn"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="see-all-header-text">
          <h1 className="see-all-title">{section.label}</h1>
          <span className="see-all-count">{section.songs.length} songs{durationStr}</span>
        </div>
      </div>

      {/* Play All button */}
      <div className="see-all-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          className="see-all-play-all"
          onClick={() => filteredSongs[0] && playSong(filteredSongs[0], filteredSongs)}
          id="see-all-play-all-btn"
          disabled={filteredSongs.length === 0}
          style={{ flexShrink: 0, opacity: filteredSongs.length === 0 ? 0.5 : 1, cursor: filteredSongs.length === 0 ? 'not-allowed' : 'pointer' }}
        >
          <Play size={16} fill="currentColor" />
          Play All
        </button>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input 
            type="text" 
            placeholder="Search in playlist..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px 10px 10px 40px', 
              borderRadius: '20px', 
              border: 'none', 
              background: '#282828', 
              color: 'white',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Song List */}
      <div className="see-all-list">
        {filteredSongs.map((song, i) => {
          const isCurrent = currentSong?.id === song.id;
          const isActive  = isCurrent && isPlaying;
          const menuOpen  = openMenuId === song.id;
          if (!dotsRefs.current[song.id]) {
            dotsRefs.current[song.id] = React.createRef();
          }
          return (
            <div
              key={song.id + i}
              className={`see-all-row ${isCurrent ? 'see-all-row--active' : ''}`}
              onClick={() => handleSongClick(song)}
              id={`see-all-row-${song.id}`}
              role="button"
              aria-label={`Play ${song.name}`}
              style={{ position: 'relative' }}
            >
              {/* Rank / Playing indicator */}
              <div className="see-all-rank">
                {isActive
                  ? <span className="see-all-eq">▶</span>
                  : <span className="see-all-num">{i + 1}</span>
                }
              </div>

              {/* Thumbnail */}
              <div className="see-all-thumb">
                {song.image
                  ? <img src={song.image} alt={song.name} loading="lazy" />
                  : <span>🎵</span>
                }
                {/* Hover play overlay */}
                <div className="see-all-thumb-overlay">
                  {isActive
                    ? <Pause size={16} color="#000" fill="#000" />
                    : <Play  size={16} color="#000" fill="#000" />
                  }
                </div>
              </div>

              <div className="see-all-info">
                <div className="see-all-song-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {song.name}
                  {song.source === 'jiosaavn' && <BadgeCheck size={14} color="#4CAF50" aria-label="Verified Source" />}
                </div>
                <div className="see-all-song-artist">{song.primaryArtists}</div>
              </div>

              {/* Duration */}
              {song.duration > 0 && (
                <div className="see-all-duration">{formatTime(song.duration)}</div>
              )}

              {/* Three-dots button */}
              <button
                ref={dotsRefs.current[song.id]}
                className="row-dots-btn"
                id={`seeall-dots-${song.id}`}
                onClick={(e) => toggleMenu(e, song.id)}
                aria-label="More options"
                aria-expanded={menuOpen}
              >
                <MoreVertical size={16} />
              </button>

              {/* Context menu */}
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
    </div>
  );
}
