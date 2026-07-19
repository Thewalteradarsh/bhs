import { useState, useEffect } from 'react';
import { api } from '../utils/apiClient';
import useDebounce from '../hooks/useDebounce';
import { useAppStore } from '../store/useAppStore';
import TrackCardSkeleton from '../components/skeletons/TrackCardSkeleton';
import { Search } from 'lucide-react';

export default function SearchView() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    
    const fetchSearch = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/search/songs', {
          params: { query: debouncedQuery, limit: 30 },
          signal: controller.signal
        });
        
        let rawTracks = res.data?.results || res.results || res.data || [];
        
        // Phase 5: Negative Filter for absolute quality control
        const negativePattern = /karaoke|cover|sped up|tribute|lofi|zzang|originally performed/i;
        rawTracks = rawTracks.filter(r => {
           const text = `${r.title || r.name} ${r.primaryArtists || r.artist}`.toLowerCase();
           return !negativePattern.test(text);
        });

        setResults(rawTracks);
      } catch (err) {
        if (err.name !== 'AbortError') console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearch();
    // Re-typing before 300ms completes instantly aborts the stale API request.
    return () => controller.abort();
  }, [debouncedQuery]);

  const handlePlay = (track) => {
    useAppStore.getState().playTrack(track, results);
  };

  return (
    <div className="pt-6 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen pb-[150px]">
       <div className="sticky top-0 z-10 bg-[#121212]/95 backdrop-blur-md pb-4 pt-2">
         <div className="relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-grayText" size={20} />
           <input 
             type="text"
             placeholder="What do you want to listen to?"
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             className="w-full bg-[#1a1a1a] text-white placeholder-grayText border border-[#333] rounded-full py-3 pl-12 pr-4 focus:outline-none focus:border-primary transition-colors text-lg"
           />
         </div>
       </div>

       <div className="mt-6">
         {isLoading && (
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
             {[...Array(12)].map((_, i) => <TrackCardSkeleton key={i} />)}
           </div>
         )}

         {!isLoading && results.length > 0 && (
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
             {results.map((track) => (
               <TrackCard key={track.id} track={track} onPlay={() => handlePlay(track)} />
             ))}
           </div>
         )}
         
         {!isLoading && debouncedQuery && results.length === 0 && (
           <div className="text-center mt-20 text-grayText">
             <p className="text-xl font-bold text-white mb-2">No results found for "{debouncedQuery}"</p>
             <p>Please make sure your words are spelled correctly or use fewer keywords.</p>
           </div>
         )}
       </div>
    </div>
  );
}

// Inline simple TrackCard for Search Grid
function TrackCard({ track, onPlay }) {
  const formatImage = (image) => {
    if (Array.isArray(image)) return image.find(i => i.quality === '500x500')?.url || image[0]?.url;
    return image || 'https://via.placeholder.com/500';
  };

  return (
    <div className="bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition-colors cursor-pointer group flex flex-col border border-transparent hover:border-[#333]" onClick={onPlay}>
      <div className="w-full aspect-square bg-[#333] rounded-md mb-4 shadow-lg group-hover:shadow-xl relative overflow-hidden flex-shrink-0">
        <img src={formatImage(track.image)} alt={track.title || track.name} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
          <svg role="img" height="24" width="24" viewBox="0 0 24 24" fill="black">
            <path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path>
          </svg>
        </div>
      </div>
      <h3 className="font-bold text-white text-sm truncate mb-1">{track.name || track.title}</h3>
      <p className="text-xs text-grayText truncate line-clamp-2">{track.primaryArtists || track.artist}</p>
    </div>
  );
}
