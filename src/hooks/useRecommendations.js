import { useState, useCallback, useRef, useEffect } from 'react';
import usePlayerStore from '../store/usePlayerStore';
import { getCandidateSongs } from '../services/saavnService';
import { rerankCandidateTracks } from '../services/recommendationService';

export const useRecommendations = (onboardingComplete) => {
  const [recommended, setRecommended] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [groqStatus, setGroqStatus] = useState('idle');
  const [mood, setMood] = useState(null);

  const { currentSong, playedHistory } = usePlayerStore();
  const prevSongId = useRef(null);
  const recAbortRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const hasHistory = Array.isArray(playedHistory) && playedHistory.length > 0;

  const fetchRecs = useCallback(async (moodOverride, songOverride) => {
    if (!hasHistory) return;

    if (recAbortRef.current) recAbortRef.current = false;
    const thisCall = {};
    recAbortRef.current = thisCall;

    setRecLoading(true);
    setGroqStatus('loading');

    const history = Array.isArray(usePlayerStore.getState().playedHistory) 
      ? usePlayerStore.getState().playedHistory 
      : [];

    try {
      const candidates = await getCandidateSongs(history);
      if (recAbortRef.current !== thisCall || !isMounted.current) return;

      if (!Array.isArray(candidates) || candidates.length === 0) {
        setGroqStatus('fallback');
        setRecLoading(false);
        setRecommended([]);
        return;
      }

      const recommendedTracks = await rerankCandidateTracks(history, candidates);
      if (recAbortRef.current !== thisCall || !isMounted.current) return;

      const isGroq = Array.isArray(recommendedTracks) && recommendedTracks.length > 0;
      setRecommended(isGroq ? recommendedTracks : candidates);
      setGroqStatus(isGroq ? 'done' : 'fallback');
    } catch (err) {
      console.warn('Recommendation fetch failed:', err);
      if (isMounted.current && recAbortRef.current === thisCall) {
        setGroqStatus('fallback');
        setRecommended([]);
      }
    }
    
    if (isMounted.current && recAbortRef.current === thisCall) {
      setRecLoading(false);
    }
  }, [hasHistory]);

  const handleMoodChange = (newMood) => {
    setMood(newMood);
    fetchRecs(newMood, currentSong);
  };

  useEffect(() => {
    if (!onboardingComplete) return;
    fetchRecs(null, null);
  }, [onboardingComplete, fetchRecs]);

  useEffect(() => {
    if (!currentSong || !hasHistory) return;
    if (currentSong.id === prevSongId.current) return;
    prevSongId.current = currentSong.id;

    const timer = setTimeout(() => {
      fetchRecs(mood, currentSong);
    }, 15000);

    return () => clearTimeout(timer);
  }, [currentSong?.id, hasHistory, mood, fetchRecs]);

  return {
    recommended: Array.isArray(recommended) ? recommended : [],
    recLoading,
    groqStatus,
    handleMoodChange
  };
};
