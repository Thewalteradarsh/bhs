import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { fetchDailyMixes } from '../services/GroqCurator';
import AIPlaylistRow from './AIPlaylistRow';

export default function DailyMixRow() {
  const { recentHistory, userPreferences } = useAppStore(state => ({
    recentHistory: state.recentHistory,
    userPreferences: state.userPreferences
  }));
  const [mixes, setMixes] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Phase 4 Requirement: If history < 3, silently hide the UI.
    if (!recentHistory || recentHistory.length < 3) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    fetchDailyMixes(userPreferences.languages, recentHistory).then(data => {
      if (isMounted) {
         setMixes(data);
         setLoading(false);
      }
    });
    
    return () => { isMounted = false; };
  }, [recentHistory, userPreferences.languages]);

  if (!recentHistory || recentHistory.length < 3 || (!loading && !mixes)) {
    return null; // Defensive silent fail
  }

  return (
    <div className="flex flex-col gap-2 mt-4">
       {loading && (
          <div className="animate-pulse h-48 bg-[#121212] rounded-md border border-[#282828] flex items-center justify-center text-grayText mb-8 shadow-inner">
             <div className="flex flex-col items-center gap-3">
               <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
               <p className="text-sm font-medium tracking-wide">AI Engine curating your Daily Mixes based on recent history...</p>
             </div>
          </div>
       )}
       {!loading && mixes && mixes.map((mix, i) => (
         <AIPlaylistRow key={mix.id || `ai_mix_${i}`} categoryData={mix} />
       ))}
    </div>
  );
}
