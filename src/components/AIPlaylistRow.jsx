import { useEffect, useState } from 'react';
import { api } from '../utils/apiClient';
import TrackCardSkeleton from './skeletons/TrackCardSkeleton';
import { useAppStore } from '../store/useAppStore';

export default function AIPlaylistRow({ categoryData }) {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchAITracks = async () => {
      setIsLoading(true);

      // Phase 4 Requirement: Defensive isolated mapping for each AI track query
      const promises = categoryData.queries.map(async (query) => {
        try {
          const res = await api.get('/search', { 
            params: { q: query, limit: 1 },
            signal: controller.signal
          });
          const results = res.data?.data || res.data || [];
          if (results.length > 0) {
             return results[0]; // Safely grab top match
          }
        } catch (err) {
          if (err.name !== 'AbortError') {
             console.warn(`[AIPlaylistRow] Failed to resolve query from Deezer: ${query}`);
          }
        }
        return null;
      });

      const results = await Promise.all(promises);
      // Filter out any null failures to ensure clean UI
      setTracks(results.filter(t => t !== null));
      setIsLoading(false);
    };

    if (categoryData?.queries?.length > 0) {
      fetchAITracks();
    } else {
      setIsLoading(false);
    }

    return () => controller.abort();
  }, [categoryData]);

  const handlePlayContext = (track) => {
    useAppStore.getState().playTrack(track, tracks);
  };

  // If AI generated a playlist but all tracks failed to resolve via Deezer, silently hide it.
  if (!isLoading && tracks.length === 0) return null;

  return (
    <section className="mb-10 w-full overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold hover:underline cursor-pointer flex items-center gap-2">
             <span className="text-primary text-xl">✦</span> {categoryData.category || categoryData.title}
           </h2>
           <p className="text-grayText text-sm mt-1">{categoryData.subtitle || categoryData.vibe}</p>
        </div>
      </div>

      <div className="flex overflow-x-auto custom-scrollbar gap-6 pb-4 -mx-2 px-2 snap-x">
        {isLoading ? (
          [...Array(5)].map((_, i) => <TrackCardSkeleton key={i} />)
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

// Simple internal TrackCard isolated for AI Row logic
function TrackCard({ track, onPlay }) {
  const formatImage = (track) => {
    return track.album?.cover_xl || track.album?.cover_medium || track.album?.cover || 'https://via.placeholder.com/500';
  };

  return (
    <div className="min-w-[160px] max-w-[180px] bg-[#1a1a1a] p-4 rounded-md hover:bg-[#2a2a2a] transition-colors cursor-pointer group flex-shrink-0 snap-start border border-[#333]" onClick={onPlay}>
      <div className="w-full aspect-square bg-[#333] rounded-md mb-4 shadow-lg group-hover:shadow-xl relative overflow-hidden">
        <img src={formatImage(track)} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
          <svg role="img" height="24" width="24" viewBox="0 0 24 24" fill="black">
            <path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path>
          </svg>
        </div>
      </div>
      <h3 className="font-bold text-white text-sm truncate mb-1">{track.title}</h3>
      <p className="text-xs text-grayText truncate line-clamp-2">{track.artist?.name}</p>
    </div>
  );
}
