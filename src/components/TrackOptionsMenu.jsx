import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Share2, ListPlus, Plus, ChevronLeft, PlaySquare, Music, Heart } from 'lucide-react';
import usePlayerStore from '../store/usePlayerStore';

export default function TrackOptionsMenu({ song, onClose, anchorRef }) {
  const { addToPlayNext, addToQueue, toggleLike, likedSongs, playlists, createPlaylist, addSongToPlaylist } = usePlayerStore();
  const isLiked = likedSongs.has(song.id);
  const [view, setView] = useState('main'); // 'main', 'playlists', 'new_playlist'
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, opacity: 0 });

  useEffect(() => {
    if (anchorRef && anchorRef.current && menuRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      
      let top = rect.bottom;
      let left = rect.right - menuRect.width;

      // Adjust if it goes off-screen
      if (top + menuRect.height > window.innerHeight) {
        top = rect.top - menuRect.height;
      }
      if (left < 0) {
        left = rect.left;
      }

      setPosition({ top, left, opacity: 1 });
    } else {
      // Fallback center screen
      setPosition({ top: window.innerHeight / 2 - 150, left: window.innerWidth / 2 - 120, opacity: 1 });
    }
  }, [anchorRef, view]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  const handle = (fn) => (e) => {
    e.stopPropagation();
    fn();
    onClose();
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    try {
      const shareData = {
        title: `Listen to ${song.name} by ${song.primaryArtists}`,
        text: `Check out ${song.name} on Hear Music Player!`,
        url: window.location.href // Fallback URL
      };
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`Listen to ${song.name} by ${song.primaryArtists}`);
        alert('Copied to clipboard!');
      }
    } catch (err) {
      console.log('Error sharing', err);
    }
    onClose();
  };

  const content = (
    <div
      ref={menuRef}
      className="fixed z-[10000] w-56 bg-[#282828] rounded-md shadow-2xl py-1 border border-white/5 text-neutral-200"
      style={{ top: position.top, left: position.left, opacity: position.opacity, visibility: position.opacity ? 'visible' : 'hidden' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col max-h-[60vh] overflow-y-auto">
        {view === 'main' && (
          <div className="flex flex-col">
            <button onClick={handleShare} className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-[14px] font-medium w-full">
              <Share2 className="w-[18px] h-[18px] text-neutral-400" /> Share
            </button>
            <button onClick={handle(() => addToPlayNext(song))} className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-[14px] font-medium w-full">
              <PlaySquare className="w-[18px] h-[18px] text-neutral-400" /> Play Next
            </button>
            <button onClick={handle(() => addToQueue(song))} className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-[14px] font-medium w-full">
              <ListPlus className="w-[18px] h-[18px] text-neutral-400" /> Add to queue
            </button>
            <button onClick={(e) => { e.stopPropagation(); setView('playlists'); }} className="flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors text-left text-[14px] font-medium w-full">
              <div className="flex items-center gap-3">
                <Music className="w-[18px] h-[18px] text-neutral-400" /> Add to playlist
              </div>
              <ChevronLeft className="w-[18px] h-[18px] text-neutral-400 rotate-180" />
            </button>
            <button onClick={handle(() => toggleLike(song.id))} className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-[14px] font-medium w-full">
              <Heart className={`w-[18px] h-[18px] ${isLiked ? 'fill-green-500 text-green-500' : 'text-neutral-400'}`} /> {isLiked ? 'Remove from Liked Songs' : 'Save to your Liked Songs'}
            </button>
          </div>
        )}

        {view === 'playlists' && (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 px-2 py-2 border-b border-white/10 mb-1">
              <button onClick={(e) => { e.stopPropagation(); setView('main'); }} className="p-1 rounded-full hover:bg-white/10 transition-colors text-neutral-300">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-bold text-neutral-100">Add to playlist</span>
            </div>
            
            <button onClick={(e) => { e.stopPropagation(); setView('new_playlist'); }} className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-[14px] font-medium w-full">
              <div className="w-6 h-6 rounded-sm bg-neutral-700 flex items-center justify-center">
                <Plus className="w-4 h-4 text-neutral-300" />
              </div>
              New playlist
            </button>

            {playlists.map(pl => (
              <button key={pl.id} onClick={handle(() => addSongToPlaylist(pl.id, song))} className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-[14px] font-medium w-full">
                <div className="w-6 h-6 rounded-sm bg-neutral-700 flex items-center justify-center text-[10px]">🎵</div>
                <span className="truncate">{pl.name}</span>
              </button>
            ))}
          </div>
        )}

        {view === 'new_playlist' && (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 px-2 py-2 border-b border-white/10 mb-1">
              <button onClick={(e) => { e.stopPropagation(); setView('playlists'); }} className="p-1 rounded-full hover:bg-white/10 transition-colors text-neutral-300">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-bold text-neutral-100">New playlist</span>
            </div>

            <div className="px-4 py-3 flex flex-col gap-3">
              <input
                type="text"
                placeholder="Name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className="w-full bg-neutral-700 border-none rounded-sm px-3 py-2 text-sm text-white placeholder-neutral-400 focus:ring-1 focus:ring-white outline-none"
              />
              <button
                onClick={handle(() => {
                  if (newPlaylistName.trim()) {
                    const pl = createPlaylist(newPlaylistName.trim());
                    addSongToPlaylist(pl.id, song);
                  }
                })}
                disabled={!newPlaylistName.trim()}
                className="w-full bg-white text-black font-bold py-2 rounded-full text-sm disabled:opacity-50 transition-colors hover:scale-105"
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
