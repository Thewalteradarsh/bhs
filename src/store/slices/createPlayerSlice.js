import { logTrackPlayed } from '../../lib/analytics';

const HISTORY_KEY = 'saavn_play_history';

const loadHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveHistory = (history) => {
  if (!Array.isArray(history)) return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-200)));
  } catch (err) {
    console.warn('Failed to save play history (Storage full?)', err);
  }
};

export const getTopArtists = (n = 3) => {
  const history = loadHistory();
  if (!Array.isArray(history)) return [];
  const counts = {};
  history.forEach(({ artist }) => {
    if (artist && typeof artist === 'string') counts[artist] = (counts[artist] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([artist]) => artist);
};

export const createPlayerSlice = (set, get) => ({
  currentSong: null,
  isPlaying: false,
  queue: [],
  queueIndex: 0,
  playedHistory: loadHistory(),
  volume: 0.8,
  isShuffle: false,
  isRepeat: false,
  isDonationModalOpen: false,

  playSong: (song, queue = []) => {
    if (!song || !song.id) return;
    
    const state = get();
    const artistName = typeof song.primaryArtists === 'string' ? song.primaryArtists : 
                       (song.artists?.primary?.[0]?.name || 'Unknown Artist');
                       
    const history = [...(Array.isArray(state.playedHistory) ? state.playedHistory : []), {
      id: song.id,
      artist: artistName,
      title: song.name || 'Unknown',
      ts: Date.now(),
    }];
    saveHistory(history);

    try {
      logTrackPlayed(song.id, song.name, artistName);
    } catch (e) {
      console.warn('Analytics logging failed', e);
    }

    const safeQueue = Array.isArray(queue) ? queue : [];
    const newQueue = safeQueue.length ? safeQueue : [song];
    const idx = newQueue.findIndex(s => s && s.id === song.id);

    set({
      currentSong: song,
      isPlaying: true,
      queue: newQueue,
      queueIndex: Math.max(0, idx),
      playedHistory: history,
    });
  },

  setIsPlaying: (val) => set({ isPlaying: !!val }),
  setDonationModalOpen: (val) => set({ isDonationModalOpen: !!val }),

  playNext: async () => {
    const state = get();
    const queue = Array.isArray(state.queue) ? state.queue : [];
    const queueIndex = typeof state.queueIndex === 'number' ? state.queueIndex : 0;
    
    if (!queue.length) return;
    
    let nextIdx;
    if (state.isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      if (queueIndex + 1 >= queue.length) {
        let settings = { autoplay: true };
        try {
          const stored = JSON.parse(localStorage.getItem('hear_settings'));
          if (stored) settings = stored;
        } catch {}
        
        if (settings.autoplay) {
          try {
            const { getSmartDiscoverTracks } = await import('../../services/saavnService.js');
            const pArtists = typeof state.currentSong?.primaryArtists === 'string' 
              ? state.currentSong.primaryArtists.split(',')[0] 
              : '';
              
            const signals = { keywords: [pArtists].filter(Boolean) };
            const newTracks = await getSmartDiscoverTracks(signals);
            if (Array.isArray(newTracks) && newTracks.length > 0) {
              const newQueue = [...queue, ...newTracks];
              get().playSong(newTracks[0], newQueue);
              set({ queueIndex: queue.length }); 
              return;
            }
          } catch (err) {
            console.error('Autoplay failed:', err);
          }
        }
      }
      nextIdx = (queueIndex + 1) % queue.length;
    }
    
    // Bounds check
    if (nextIdx >= 0 && nextIdx < queue.length) {
      const next = queue[nextIdx];
      if (next) {
        get().playSong(next, queue);
        set({ queueIndex: nextIdx });
      }
    }
  },

  playPrev: () => {
    const state = get();
    const queue = Array.isArray(state.queue) ? state.queue : [];
    const queueIndex = typeof state.queueIndex === 'number' ? state.queueIndex : 0;
    
    if (!queue.length) return;
    const prevIdx = Math.max(0, queueIndex - 1);
    
    if (prevIdx >= 0 && prevIdx < queue.length) {
      const prev = queue[prevIdx];
      if (prev) {
        get().playSong(prev, queue);
        set({ queueIndex: prevIdx });
      }
    }
  },

  setVolume: (v) => set({ volume: typeof v === 'number' ? v : 0.8 }),
  toggleShuffle: () => set(s => ({ isShuffle: !s.isShuffle })),
  toggleRepeat: () => set(s => ({ isRepeat: !s.isRepeat })),

  setCurrentSongResolved: (resolved) => set(s => {
    if (!resolved || !s.currentSong || s.currentSong.id !== resolved.id) return {};
    const queue = Array.isArray(s.queue) ? s.queue.map(q => (q && q.id === resolved.id) ? { ...q, ...resolved } : q) : [];
    return { currentSong: { ...s.currentSong, ...resolved }, queue };
  }),

  addToPlayNext: (song) => {
    if (!song || !song.id) return;
    const state = get();
    const queue = Array.isArray(state.queue) ? state.queue : [];
    const queueIndex = typeof state.queueIndex === 'number' ? state.queueIndex : 0;
    
    if (!state.currentSong) {
      get().playSong(song, [song]);
      return;
    }
    
    const insertAt = Math.min(queueIndex + 1, queue.length);
    const newQueue = [
      ...queue.slice(0, insertAt),
      song,
      ...queue.slice(insertAt).filter(s => s && s.id !== song.id),
    ];
    set({ queue: newQueue });
  },

  addToQueue: (song) => {
    if (!song || !song.id) return;
    const state = get();
    const queue = Array.isArray(state.queue) ? state.queue : [];
    
    if (!state.currentSong) {
      get().playSong(song, [song]);
      return;
    }
    if (queue.find(s => s && s.id === song.id)) return;
    set({ queue: [...queue, song] });
  },
});
