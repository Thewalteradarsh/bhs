import { useEffect, useRef, useState } from 'react';
import usePlayerStore from '../store/usePlayerStore';
import { addToHistoryUtil } from '../hooks/useListeningHistory';
import apiClient from '../services/apiClient';

export default function AudioEngine() {
  const audioRef = useRef(null);
  const nextAudioRef = useRef(null);
  const loadingIdRef = useRef(null); // track which song is being loaded to avoid races
  const {
    currentSong,
    isPlaying,
    volume,
    setIsPlaying,
    playNext,
    queue,
    queueIndex,
    isShuffle,
    isRepeat,
    setCurrentSongResolved
  } = usePlayerStore();

  // Reference to currentSong so we can use it in proxy
  const currentSongRef = useRef(currentSong);
  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  // Create audio element and proxy once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }
    if (!nextAudioRef.current) {
      nextAudioRef.current = new Audio();
      nextAudioRef.current.preload = 'auto';
    }
    const audio = audioRef.current;

    window.__audioEngine = {
      get duration() { return audioRef.current?.duration || 0; },
      get currentTime() { return audioRef.current?.currentTime || 0; },
      set currentTime(val) { 
        if (audioRef.current) {
          audioRef.current.currentTime = val;
        }
      },
      play: async () => {
         if (audioRef.current) return audioRef.current.play();
      },
      pause: () => {
         if (audioRef.current) audioRef.current.pause();
      }
    };

    const handleEnded = () => {
      const state = usePlayerStore.getState();
      if (state.currentSong) {
        addToHistoryUtil(state.currentSong);
      }
      if (state.isRepeat) {
        audio.currentTime = 0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      } else {
        const { queue, queueIndex, isShuffle } = state;
        let nextIdx;
        let needsFetch = false;

        if (isShuffle) {
          nextIdx = Math.floor(Math.random() * queue.length);
        } else {
          if (queueIndex + 1 >= queue.length) {
            needsFetch = true;
          } else {
            nextIdx = queueIndex + 1;
          }
        }

        if (!needsFetch && nextIdx !== undefined) {
          const next = queue[nextIdx];
          if (next && next.streamUrl && next.source !== 'youtube') {
            audio.src = next.streamUrl;
            const playPromise = audio.play();
            if (playPromise !== undefined) playPromise.catch(() => {});
          }
          state.playSong(next, queue);
          usePlayerStore.setState({ queueIndex: nextIdx });
        } else {
          state.playNext();
        }
      }
    };

    audio.addEventListener('ended', handleEnded);

    const onError = () => {
      const err = audio.error;
      if (!err) return;
      const codes = { 1: 'ABORTED', 2: 'NETWORK', 3: 'DECODE', 4: 'SRC_NOT_SUPPORTED' };
      const codeStr = codes[err.code] || `UNKNOWN(${err.code})`;
      console.error(`[AudioEngine] MediaError: ${codeStr}`, '| message:', err?.message || 'n/a');
      
      // Auto-skip on fatal playback errors
      if (err.code === 3 || err.code === 4) {
        console.log("Audio failed to load, skipping to next track");
        usePlayerStore.getState().playNext();
      }
    };
    audio.addEventListener('error', onError);

    const onNativePause = () => {
      const state = usePlayerStore.getState();
      if (state.isPlaying && audioRef.current?.paused) {
        state.setIsPlaying(false);
      }
    };
    
    const onNativePlay = () => {
      const state = usePlayerStore.getState();
      if (!state.isPlaying && !audioRef.current?.paused) {
        state.setIsPlaying(true);
      }
    };

    audio.addEventListener('pause', onNativePause);
    audio.addEventListener('play', onNativePlay);

    // Media Session Action Handlers
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        usePlayerStore.getState().setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        usePlayerStore.getState().setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        usePlayerStore.getState().playPrev();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        usePlayerStore.getState().playNext();
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        window.__audioEngine.currentTime = Math.max(window.__audioEngine.currentTime - skipTime, 0);
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        window.__audioEngine.currentTime = Math.min(window.__audioEngine.currentTime + skipTime, window.__audioEngine.duration);
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        window.__audioEngine.currentTime = details.seekTime;
      });
    }

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('pause', onNativePause);
      audio.removeEventListener('play', onNativePlay);
    };
  }, []);

  // Preload next track
  useEffect(() => {
    if (!queue || queue.length === 0) return;
    if (!nextAudioRef.current) return;
    
    let nextIdx;
    if (isShuffle) {
      return;
    } else {
      if (queueIndex + 1 >= queue.length) {
        if (isRepeat) nextIdx = 0;
        else return;
      } else {
        nextIdx = queueIndex + 1;
      }
    }
    
    const nextSong = queue[nextIdx];
    if (nextSong && nextSong.streamUrl && nextSong.source !== 'youtube') {
      if (nextAudioRef.current.src !== nextSong.streamUrl) {
        nextAudioRef.current.src = nextSong.streamUrl;
        nextAudioRef.current.load();
      }
    }
  }, [queue, queueIndex, isShuffle, isRepeat]);

  // Load & play song whenever currentSong.id changes
  useEffect(() => {
    if (!currentSong) return;

    const songId = currentSong.id;
    loadingIdRef.current = songId;

    const audio = audioRef.current;

    const updateMediaMetadata = () => {
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new window.MediaMetadata({
            title: currentSong.name || 'Unknown Track',
            artist: currentSong.primaryArtists || 'Unknown Artist',
            album: currentSong.album || 'Hear',
            artwork: [
              { src: currentSong.image || '', sizes: '96x96',   type: 'image/jpeg' },
              { src: currentSong.image || '', sizes: '512x512', type: 'image/jpeg' },
            ].filter(a => a.src),
          });
        } catch (err) {
          console.warn('[AudioEngine] MediaMetadata error:', err);
        }
      }
    };

    updateMediaMetadata();

    const loadAndPlay = async () => {
      let streamUrl = currentSong.streamUrl;

      // Intercept YouTube streams and resolve true audio URL
      if (currentSong.source === 'youtube' && !streamUrl) {
        try {
          const res = await apiClient.get('/api/yt-stream', { params: { id: currentSong.id } });
          if (res.data && res.data.url) {
            streamUrl = res.data.url;
            setCurrentSongResolved({ ...currentSong, streamUrl }); // save to store so we don't refetch
          } else {
             throw new Error("No URL returned from yt-stream API");
          }
        } catch (err) {
          console.error("Failed to extract YouTube stream:", err);
          if (loadingIdRef.current === songId) {
             setIsPlaying(false);
             playNext(); // skip unplayable YouTube videos
          }
          return;
        }
      }

      if (loadingIdRef.current !== songId) return; // stale request

      if (!streamUrl || typeof streamUrl !== 'string') {
        setIsPlaying(false);
        return;
      }

      if (audio.src === streamUrl || audio.src === new URL(streamUrl, window.location.origin).href) {
        const state = usePlayerStore.getState();
        if (state.isPlaying && audio.paused) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              if (err.name !== 'AbortError') setIsPlaying(false);
            });
          }
        }
      } else {
        audio.src = streamUrl;
        audio.load();

        const state = usePlayerStore.getState();
        if (state.isPlaying) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.warn('[AudioEngine] play() rejected:', err.message);
              if (err.name !== 'AbortError') setIsPlaying(false);
            });
          }
        }
      }
    };

    loadAndPlay();
  }, [currentSong?.id]);

  // Play / pause
  useEffect(() => {
    if (isPlaying) {
      if (audioRef.current && audioRef.current.readyState >= 2) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            if (err.name !== 'AbortError') setIsPlaying(false);
          });
        }
      }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    }
  }, [isPlaying]);

  // Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  return null; // Entirely headless now!
}
