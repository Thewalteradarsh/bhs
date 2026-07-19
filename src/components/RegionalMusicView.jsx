import { useEffect } from 'react';
import { useLiveCharts } from '../hooks/useLiveCharts';
import { useAppStore } from '../store/useAppStore';
import TrackCardSkeleton from './skeletons/TrackCardSkeleton';

export default function RegionalMusicView({ currentCategory }) {
  const { songs, playlistTitle, isLoading, error, refreshData } = useLiveCharts(currentCategory?.spotifyId);
  
  // Debug log requested by user
  console.log("RegionalMusicView fetched songs:", songs);

  const handlePlayContext = (track) => {
    // Map Spotify structure to our internal AudioEngine format
    const playTrack = {
      id: track.id,
      title: track.title,
      artist: { name: track.artists },
      album: { cover_xl: track.albumArt },
      preview: track.previewUrl
    };
    const playQueue = songs.map(s => ({
      id: s.id,
      title: s.title,
      artist: { name: s.artists },
      album: { cover_xl: s.albumArt },
      preview: s.previewUrl
    }));
    useAppStore.getState().playTrack(playTrack, playQueue);
  };

  if (error) {
    return (
      <section className="mb-10 w-full animate-in fade-in duration-500">
        <h2 className="text-2xl font-bold mb-6">{currentCategory?.category || 'Live Chart'}</h2>
        <div className="bg-[#181818] p-6 rounded-md flex flex-col items-center justify-center border border-red-500/20 shadow-md">
          <p className="text-grayText mb-4 text-center">{error}</p>
          <button 
            onClick={refreshData} 
            className="px-6 py-2 rounded-full border border-grayText text-grayText hover:border-white hover:text-white transition-colors text-sm font-bold"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10 w-full overflow-hidden animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-2xl font-bold hover:underline cursor-pointer">
          {playlistTitle || currentCategory?.category || 'Live Chart'}
        </h2>
        {currentCategory?.subtitle && (
          <p className="text-grayText text-sm mt-1">{currentCategory.subtitle}</p>
        )}
      </div>

      <div className="flex overflow-x-auto custom-scrollbar gap-6 pb-4 -mx-2 px-2 snap-x">
        {isLoading ? (
          [...Array(6)].map((_, i) => <TrackCardSkeleton key={i} />)
        ) : songs && songs.length > 0 ? (
          songs.map((song) => (
            <div 
              key={song.id}
              className="min-w-[160px] max-w-[180px] bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition-colors cursor-pointer group flex-shrink-0 snap-start"
              onClick={() => handlePlayContext(song)}
            >
              <div className="w-full aspect-square bg-[#333] rounded-md mb-4 shadow-lg group-hover:shadow-xl relative overflow-hidden">
                <img 
                  src={song.albumArt || 'https://via.placeholder.com/500'} 
                  alt={song.title} 
                  className="w-full h-full object-cover" 
                  loading="lazy" 
                />
                
                {/* Play Button Overlay */}
                <div className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
                  <svg role="img" height="24" width="24" viewBox="0 0 24 24" fill="black">
                    <path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path>
                  </svg>
                </div>
              </div>
              <h3 className="font-bold text-white text-sm truncate mb-1">{song.title}</h3>
              <p className="text-xs text-grayText truncate line-clamp-2">{song.artists}</p>
            </div>
          ))
        ) : (
          <div className="w-full py-8 text-center text-grayText border border-[#282828] rounded-md bg-[#181818]">
            No tracks found
          </div>
        )}
      </div>
    </section>
  );
}
