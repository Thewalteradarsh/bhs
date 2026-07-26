import { useState, useEffect, useCallback } from 'react';

const HISTORY_KEY = 'hear_user_history';
const MAX_HISTORY = 15;

/**
 * Utility to read the history from localStorage.
 */
export const readHearHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read hear_user_history', err);
    return [];
  }
};

/**
 * Utility to add a song to history directly (useful outside React context).
 */
export const addToHistoryUtil = (song) => {
  if (!song) return;
  try {
    const currentHistory = readHearHistory();
    // Prevent duplicates by removing existing entries with the same ID
    const filteredHistory = currentHistory.filter((item) => item.id !== song.id);
    
    // Add new song to the front
    const newEntry = {
      id: song.id,
      title: song.name || song.title,
      artist: song.primaryArtists || song.artist || 'Unknown Artist',
      language: song.language || 'unknown',
    };
    
    filteredHistory.unshift(newEntry);
    
    // Keep only the latest MAX_HISTORY items
    const nextHistory = filteredHistory.slice(0, MAX_HISTORY);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    
    // Dispatch a custom event so the hook can sync
    window.dispatchEvent(new Event('hear_history_updated'));
  } catch (err) {
    console.error('Failed to write hear_user_history', err);
  }
};

/**
 * React Hook for consuming the listening history.
 */
export default function useListeningHistory() {
  const [history, setHistory] = useState(readHearHistory);

  useEffect(() => {
    const handleSync = () => {
      setHistory(readHearHistory());
    };
    
    window.addEventListener('hear_history_updated', handleSync);
    return () => window.removeEventListener('hear_history_updated', handleSync);
  }, []);

  const addToHistory = useCallback((song) => {
    addToHistoryUtil(song);
  }, []);

  return { history, addToHistory };
}
