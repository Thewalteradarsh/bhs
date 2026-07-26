import { useState, useEffect, useCallback } from 'react';
import { getHomeRows } from '../services/saavnService';
import { getDynamicHomeMixes } from '../services/recommendationService';

export function useDashboardData(languages = [], playHistory = []) {
  const [staticState, setStaticState] = useState({
    data: [],
    isLoading: true,
    isError: false,
  });

  const [aiState, setAiState] = useState({
    data: [],
    isLoading: true,
    isError: false,
  });

  const fetchDashboardData = useCallback(async () => {
    setStaticState(prev => ({ ...prev, isLoading: true, isError: false }));
    setAiState(prev => ({ ...prev, isLoading: true, isError: false }));

    const promises = [
      getHomeRows(), // Static categories
      getDynamicHomeMixes(languages, playHistory) // AI dynamic mixes
    ];

    const results = await Promise.allSettled(promises);

    // Handle Static Data
    const staticResult = results[0];
    if (staticResult.status === 'fulfilled' && Array.isArray(staticResult.value)) {
      setStaticState({
        data: staticResult.value,
        isLoading: false,
        isError: false,
      });
    } else {
      console.error('[Dashboard] Failed to load static rows', staticResult.reason);
      setStaticState(prev => ({
        ...prev,
        isLoading: false,
        isError: true,
      }));
    }

    // Handle AI Data
    const aiResult = results[1];
    if (aiResult.status === 'fulfilled' && Array.isArray(aiResult.value) && aiResult.value.length > 0) {
      try {
        const { searchSongs } = await import('../services/saavnService');
        const resolvedMixes = [];
        for (const mix of aiResult.value) {
          if (!mix.tracks || !mix.tracks.length) continue;
          const trackPromises = mix.tracks.map(async (track) => {
            const query = track.query || `${track.title} ${track.artist}`;
            try {
              const searchResults = await searchSongs(query);
              if (searchResults && searchResults.length > 0) return searchResults[0];
            } catch (err) {
              console.warn(`Failed to resolve track ${query}:`, err);
            }
            return null;
          });
          const validTracks = (await Promise.all(trackPromises)).filter(Boolean);
          if (validTracks.length > 0) {
            resolvedMixes.push({ title: mix.title, subtitle: mix.subtitle, tracks: validTracks });
          }
        }
        
        if (resolvedMixes.length > 0) {
          setAiState({ data: resolvedMixes, isLoading: false, isError: false });
        } else {
          setAiState({ data: [], isLoading: false, isError: true });
        }
      } catch (err) {
        setAiState({ data: [], isLoading: false, isError: true });
      }
    } else {
      if (aiResult.status === 'rejected') {
        console.error('[Dashboard] AI Mixes rejected:', aiResult.reason);
      }
      setAiState({
        data: [], // Gracefully default to empty array
        isLoading: false,
        isError: true, // Mark error to hide it silently in UI
      });
    }
  }, [languages, playHistory]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    staticState,
    aiState,
    retryStatic: () => {
      setStaticState(prev => ({ ...prev, isLoading: true, isError: false }));
      getHomeRows()
        .then(data => {
          if (Array.isArray(data)) {
            setStaticState({ data, isLoading: false, isError: false });
          } else {
            throw new Error('Invalid static data format');
          }
        })
        .catch(err => {
          console.error('[Dashboard] Retry failed', err);
          setStaticState(prev => ({ ...prev, isLoading: false, isError: true }));
        });
    }
  };
}
