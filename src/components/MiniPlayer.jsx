import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AudioEngine } from '../services/AudioEngine';
import FullScreenPlayer from './player/FullScreenPlayer';
import { Play, Pause, SkipBack, SkipForward, Heart } from 'lucide-react';

export default function MiniPlayer() {
  const { currentTrack, status, progress, duration } = useAppStore(state => state.playbackState);
  const likedSongs = useAppStore(state => state.library.likedSongs);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  if (!currentTrack) return null;

  const isPlaying = status === 'PLAYING';
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const isLiked = likedSongs.some(t => t.id === currentTrack.id);

  const formatImage = (image) => {
    if (Array.isArray(image)) return image.find(i => i.quality === '150x150')?.url || image[0]?.url;
    return image || 'https://via.placeholder.com/150';
  };

  const toggleLike = (e) => {
    e.stopPropagation(); // prevent opening full screen
    useAppStore.getState().toggleLikeTrack(currentTrack);
  };

  return (
    <>
      <div 
        onClick={() => setIsFullscreen(true)}
        className="fixed bottom-16 md:bottom-0 left-0 md:left-64 right-0 h-[72px] bg-[#181818] border-t border-[#282828] flex items-center px-4 z-[60] shadow-[0_-10px_20px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-[#202020] transition-colors"
      >
        {/* Progress Bar */}
        <div className="absolute top-[-1px] left-0 right-0 h-1 bg-[#282828]" onClick={(e) => { 
            e.stopPropagation(); 
            const rect = e.currentTarget.getBoundingClientRect(); 
            AudioEngine.seekTo(((e.clientX - rect.left) / rect.width) * duration); 
        }}>
          <div className="h-full bg-primary transition-all duration-100" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="flex items-center w-full gap-4">
          {/* Track Info & Like */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img src={formatImage(currentTrack.image)} alt="Artwork" className="w-12 h-12 rounded-md object-cover shadow-md" />
            <div className="truncate pr-2">
              <h4 className="text-white text-sm font-bold truncate">{currentTrack.name || currentTrack.title}</h4>
              <p className="text-grayText text-xs truncate">{currentTrack.primaryArtists || currentTrack.artist}</p>
            </div>
            <button onClick={toggleLike} className="hidden md:block p-2 ml-2">
              <Heart size={20} className={isLiked ? "fill-primary text-primary" : "text-grayText hover:text-white"} />
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 md:gap-6 justify-center flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => useAppStore.getState().playPrevious()} className="text-grayText hover:text-white transition-colors">
              <SkipBack size={20} className="fill-current" />
            </button>
            
            <button onClick={() => AudioEngine.togglePlayPause()} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-1" />}
            </button>
            
            <button onClick={() => useAppStore.getState().playNext()} className="text-grayText hover:text-white transition-colors">
              <SkipForward size={20} className="fill-current" />
            </button>
          </div>
          
          {/* Symmetrical Spacing Desktop */}
          <div className="hidden md:flex flex-1 justify-end"></div>
        </div>
      </div>

      <FullScreenPlayer isOpen={isFullscreen} onClose={() => setIsFullscreen(false)} />
    </>
  );
}
