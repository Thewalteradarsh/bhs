import { useState, useEffect, useRef, useCallback } from 'react';
import usePlayerStore from '../store/usePlayerStore';

// Timer options (null = End of Track mode)
export const TIMER_OPTIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: 'End of Track', minutes: null },
];

/**
 * useSleepTimer — manages all sleep timer state and logic.
 *
 * Returns:
 *   isActive         — whether a timer is currently running
 *   mode             — 'countdown' | 'end_of_track' | null
 *   remaining        — seconds remaining (null in end-of-track mode)
 *   selectedMinutes  — minutes chosen (null for end-of-track)
 *   startTimer(minutes) — start a countdown timer (pass null for end-of-track)
 *   cancelTimer()    — cancel any active timer
 */
export default function useSleepTimer() {
  const { setIsPlaying } = usePlayerStore();

  const [isActive, setIsActive]         = useState(false);
  const [mode, setMode]                 = useState(null);       // 'countdown' | 'end_of_track' | null
  const [remaining, setRemaining]       = useState(null);       // seconds
  const [selectedMinutes, setSelectedMinutes] = useState(null);

  const intervalRef = useRef(null);
  const endOfTrackRef = useRef(null); // stores the listener fn so we can remove it

  // ── Cleanup helper ──────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (endOfTrackRef.current) {
      const audio = window.__audioEngine;
      if (audio) audio.removeEventListener('ended', endOfTrackRef.current);
      endOfTrackRef.current = null;
    }
  }, []);

  // ── Cancel (public) ─────────────────────────────────────────────────────────
  const cancelTimer = useCallback(() => {
    clearAll();
    setIsActive(false);
    setMode(null);
    setRemaining(null);
    setSelectedMinutes(null);
  }, [clearAll]);

  // ── Start timer ─────────────────────────────────────────────────────────────
  const startTimer = useCallback((minutes) => {
    // Clear any previously running timer first
    clearAll();

    if (minutes === null) {
      // ── End-of-Track mode ──────────────────────────────────────────────────
      const audio = window.__audioEngine;
      if (!audio) return;

      const handler = () => {
        // Prevent AudioEngine's natural playNext() from running:
        // We pause immediately on 'ended' before the store's playNext fires.
        // We do this by stopping isPlaying in the store synchronously.
        setIsPlaying(false);
        // Also forcibly pause the element in case of timing edge cases
        audio.pause();

        // Cleanup
        clearAll();
        setIsActive(false);
        setMode(null);
        setRemaining(null);
        setSelectedMinutes(null);
      };

      // The 'ended' event fires before AudioEngine's own 'ended' handler IF we
      // capture during the same phase. We use { once: true, capture: false }.
      audio.addEventListener('ended', handler, { once: true });
      endOfTrackRef.current = handler;

      setIsActive(true);
      setMode('end_of_track');
      setRemaining(null);
      setSelectedMinutes(null);

    } else {
      // ── Countdown mode ─────────────────────────────────────────────────────
      const totalSeconds = minutes * 60;
      setRemaining(totalSeconds);
      setIsActive(true);
      setMode('countdown');
      setSelectedMinutes(minutes);

      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            // Time's up — pause playback
            setIsPlaying(false);
            const audio = window.__audioEngine;
            if (audio) audio.pause();

            clearInterval(intervalRef.current);
            intervalRef.current = null;

            setIsActive(false);
            setMode(null);
            setSelectedMinutes(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [clearAll, setIsPlaying]);

  // ── Global cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => clearAll();
  }, [clearAll]);

  return { isActive, mode, remaining, selectedMinutes, startTimer, cancelTimer };
}
