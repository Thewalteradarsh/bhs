import { useAppStore } from '../../store/useAppStore';
import { AudioEngine } from '../../services/AudioEngine';
import useSwipe from '../../hooks/useSwipe';
import { Play, Pause, SkipBack, SkipForward, ChevronDown, Heart } from 'lucide-react';

export default function FullScreenPlayer({ isOpen, onClose }) {
  const { currentTrack, status, progress, duration } = useAppStore(state => state.playbackState);
  const likedSongs = useAppStore(state => state.library.likedSongs);
  
  if (!currentTrack) return null;

  const isPlaying = status === 'PLAYING';
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const isLiked = likedSongs.some(t => t.id === currentTrack.id);

  const formatImage = (track) => {
    return track.album?.cover_xl || track.album?.cover_medium || track.album?.cover || 'https://via.placeholder.com/500';
  };

  const imageUrl = formatImage(currentTrack);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    AudioEngine.seekTo(percent * duration);
  };

  const toggleLike = () => {
    useAppStore.getState().toggleLikeTrack(currentTrack);
  };

  // Phase 5: Hardware-Accelerated Gesture Bindings
  const swipeHandlers = useSwipe({
    onSwipeDown: onClose, 
    onSwipeLeft: () => useAppStore.getState().playNext(), 
    onSwipeRight: () => useAppStore.getState().playPrevious(), 
    threshold: 50 // Responsive pixel threshold
  });

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-black transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
    >
      {/* Background Blur */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl scale-110"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/80 to-black pointer-events-none" />

      {/* Touch Target Container */}
      <div className="relative z-10 flex flex-col h-full px-6 py-8" {...swipeHandlers}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={onClose} className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer rounded-full bg-black/20">
            <ChevronDown size={28} />
          </button>
          <span className="text-xs uppercase font-bold tracking-widest text-white/70 text-center">Now Playing</span>
          <div className="w-10"></div> 
        </div>

        {/* Swipeable Artwork */}
        <div className="flex-1 flex items-center justify-center mb-8">
          <img 
            src={imageUrl} 
            alt="Album Art" 
            className="w-full max-w-[340px] aspect-square object-cover rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.6)]" 
          />
        </div>

        {/* Metadata & Liked Toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="min-w-0 pr-4">
            <h2 className="text-2xl font-bold text-white truncate mb-1">{currentTrack.title}</h2>
            <p className="text-lg text-white/70 truncate">{currentTrack.artist?.name}</p>
          </div>
          <button onClick={toggleLike} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <Heart size={28} className={isLiked ? "fill-primary text-primary" : "text-white/70"} />
          </button>
        </div>

        {/* Seek Bar */}
        <div className="mb-8">
          <div className="h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden group py-2 -my-2" onClick={handleSeek}>
            <div 
              className="h-1.5 bg-white group-hover:bg-primary transition-all duration-100 ease-linear rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/50 mt-2 font-medium tracking-wide">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-8 mb-4 pb-8">
          <button onClick={() => useAppStore.getState().playPrevious()} className="text-white/80 hover:text-white transition-colors p-2">
            <SkipBack size={36} className="fill-current" />
          </button>
          
          <button 
            onClick={() => AudioEngine.togglePlayPause()} 
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            {isPlaying ? <Pause size={36} className="fill-current" /> : <Play size={36} className="fill-current ml-2" />}
          </button>
          
          <button onClick={() => useAppStore.getState().playNext()} className="text-white/80 hover:text-white transition-colors p-2">
            <SkipForward size={36} className="fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
