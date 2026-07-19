import { useEffect, useState } from 'react';
import { api } from '../utils/apiClient';
import TrackCardSkeleton from './skeletons/TrackCardSkeleton';
import { useAppStore } from '../store/useAppStore';

export default function PlaylistRow({ categoryData }) {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTracks = async (signal) => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch using our API client (uses LRU Cache internally)
      const res = await api.get('/search/songs', { 
        params: { query: categoryData.apiQuery, limit: 12 },
        signal
      });
      
      const results = res.data?.results || res.results || res.data || [];
      if (results.length === 0) throw new Error("No tracks found");
      
      setTracks(results);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchTracks(controller.signal);
    return () => controller.abort();
  }, [categoryData.apiQuery]);

  const handlePlayContext = (track) => {
    // Pass the entire fetched row as the dynamic queue context
    useAppStore.getState().playTrack(track, tracks);
  };

  // Inline Error Recovery UI
  if (error) {
    return (
      <section className="mb-10 w-full">
        <h2 className="text-2xl font-bold mb-6">{categoryData.category}</h2>
        <div className="bg-[#181818] p-6 rounded-md flex flex-col items-center justify-center border border-red-500/20 shadow-md">
          <p className="text-grayText mb-4 text-center">Unable to load "{categoryData.category}" tracks.</p>
          <button 
            onClick={() => fetchTracks()} 
            className="px-6 py-2 rounded-full border border-grayText text-grayText hover:border-white hover:text-white transition-colors text-sm font-bold"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10 w-full overflow-hidden">
      <div className="mb-6">
        <h2 className="text-2xl font-bold hover:underline cursor-pointer">{categoryData.category}</h2>
        <p className="text-grayText text-sm mt-1">{categoryData.subtitle}</p>
      </div>

      <div className="flex overflow-x-auto custom-scrollbar gap-6 pb-4 -mx-2 px-2 snap-x">
        {isLoading ? (
          /* Zero-Shift Skeletons */
          [...Array(6)].map((_, i) => <TrackCardSkeleton key={i} />)
        ) : (
          tracks.map((track) => (
            <TrackCard 
              key={track.id} 
              track={track} 
              onPlay={() => handlePlayContext(track)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function TrackCard({ track, onPlay }) {
  // Defensive image parsing based on JioSaavn payload variations
  const formatImage = (image) => {
    if (Array.isArray(image)) {
      return image.find(i => i.quality === '500x500')?.url || image[0]?.url;
    }
    return image || 'https://via.placeholder.com/500';
  };

  return (
    <div 
      className="min-w-[160px] max-w-[180px] bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition-colors cursor-pointer group flex-shrink-0 snap-start"
      onClick={onPlay}
    >
      <div className="w-full aspect-square bg-[#333] rounded-md mb-4 shadow-lg group-hover:shadow-xl relative overflow-hidden">
        <img src={formatImage(track.image)} alt={track.title || track.name} className="w-full h-full object-cover" loading="lazy" />
        
        {/* Play Button Overlay */}
        <div className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
          <svg role="img" height="24" width="24" viewBox="0 0 24 24" fill="black">
            <path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path>
          </svg>
        </div>
      </div>
      <h3 className="font-bold text-white text-sm truncate mb-1">{track.name || track.title}</h3>
      <p className="text-xs text-grayText truncate line-clamp-2">{track.primaryArtists || track.artist || track.subtitle}</p>
    </div>
  );
}
