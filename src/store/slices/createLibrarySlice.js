import { invalidateGroqCache } from '../../services/recommendationService';
import { addToHistoryUtil } from '../../hooks/useListeningHistory';
import { searchSongs, searchYouTube } from '../../services/saavnService';

const loadPlaylists = () => {
  try {
    const raw = localStorage.getItem('saavn_playlists');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load playlists', err);
    return [];
  }
};

const savePlaylists = (playlists) => {
  if (!Array.isArray(playlists)) return;
  try {
    localStorage.setItem('saavn_playlists', JSON.stringify(playlists));
  } catch (err) {
    console.warn('Failed to save playlists (Storage full?)', err);
  }
};

const loadLikedSongs = () => {
  try {
    const raw = localStorage.getItem('saavn_liked');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load liked songs', err);
    return [];
  }
};

export const createLibrarySlice = (set, get) => ({
  likedSongs: new Set(loadLikedSongs()),
  playlists: loadPlaylists(),

  toggleLike: (songId) => {
    if (!songId) return;
    const state = get();
    const { likedSongs, currentSong } = state;
    const newSet = new Set(likedSongs);
    
    if (newSet.has(songId)) {
      newSet.delete(songId);
    } else {
      newSet.add(songId);
      if (currentSong && currentSong.id === songId) {
        addToHistoryUtil(currentSong);
      }
    }
    
    try {
      localStorage.setItem('saavn_liked', JSON.stringify([...newSet]));
    } catch (err) {
      console.warn('Failed to save liked songs (Storage full?)', err);
    }
    
    invalidateGroqCache();
    set({ likedSongs: newSet });
  },

  createPlaylist: (name, image = null, isPinned = false, extraProps = {}) => {
    if (!name || typeof name !== 'string') name = 'New Playlist';
    
    const state = get();
    const playlists = Array.isArray(state.playlists) ? state.playlists : [];
    
    const newPlaylist = {
      id: 'pl_' + Date.now() + Math.floor(Math.random() * 1000),
      name,
      image,
      isPinned: !!isPinned,
      songs: [],
      createdAt: Date.now(),
      ...extraProps
    };
    
    const updatedPlaylists = [...playlists, newPlaylist];
    savePlaylists(updatedPlaylists);
    set({ playlists: updatedPlaylists });
    return newPlaylist;
  },

  addSongToPlaylist: (playlistId, song) => {
    if (!playlistId || !song || !song.id) return;
    const state = get();
    const playlists = Array.isArray(state.playlists) ? state.playlists : [];
    
    const updatedPlaylists = playlists.map(pl => {
      if (pl && pl.id === playlistId) {
        const plSongs = Array.isArray(pl.songs) ? pl.songs : [];
        if (!plSongs.find(s => s && s.id === song.id)) {
          return { 
            ...pl, 
            songs: [...plSongs, song],
            image: pl.image || song.image
          };
        }
      }
      return pl;
    });
    
    savePlaylists(updatedPlaylists);
    set({ playlists: updatedPlaylists });
  },

  togglePinPlaylist: (playlistId) => {
    if (!playlistId) return;
    const state = get();
    const playlists = Array.isArray(state.playlists) ? state.playlists : [];
    
    const updatedPlaylists = playlists.map(pl => {
      if (pl && pl.id === playlistId) {
        return { ...pl, isPinned: !pl.isPinned };
      }
      return pl;
    });
    
    savePlaylists(updatedPlaylists);
    set({ playlists: updatedPlaylists });
  },

  removePlaylist: (playlistId) => {
    if (!playlistId) return;
    const state = get();
    const playlists = Array.isArray(state.playlists) ? state.playlists : [];
    
    const updatedPlaylists = playlists.filter(pl => pl && pl.id !== playlistId);
    savePlaylists(updatedPlaylists);
    set({ playlists: updatedPlaylists });
  },

  updatePlaylistSyncStatus: (playlistId, isSyncing, syncProgress) => {
    if (!playlistId) return;
    const state = get();
    const playlists = Array.isArray(state.playlists) ? state.playlists : [];
    
    const updatedPlaylists = playlists.map(pl => {
      if (pl && pl.id === playlistId) {
        return { ...pl, isSyncing, syncProgress };
      }
      return pl;
    });
    
    savePlaylists(updatedPlaylists);
    set({ playlists: updatedPlaylists });
  },

  runBackgroundImport: async (tracks, playlistId) => {
    if (!tracks || !tracks.length || !playlistId) return;
    
    let importedCount = 0;
    
    for (let i = 0; i < tracks.length; i++) {
      get().updatePlaylistSyncStatus(playlistId, true, `Syncing ${i + 1}/${tracks.length}...`);
      
      const rawTitle = tracks[i].title || '';
      const cleanTitle = rawTitle
        .replace(/\s*\(.*?\)\s*/g, ' ')
        .replace(/\s*\[.*?\]\s*/g, ' ')
        .replace(/-.*/g, '')
        .replace(/[\u00A0\u1680​\u180e\u2000-\u2009\u200a​\u200b​\u202f\u205f​\u3000]/g, ' ')
        .trim();

      const rawArtist = tracks[i].artist || '';
      const cleanArtist = rawArtist
        .replace(/[\u00A0\u1680​\u180e\u2000-\u2009\u200a​\u200b​\u202f\u205f​\u3000]/g, ' ')
        .trim();

      const query = cleanArtist ? `${cleanTitle} ${cleanArtist}` : cleanTitle;

      try {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        const TRACK_TIMEOUT_MS = 5000;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Track lookup timed out')), TRACK_TIMEOUT_MS)
        );

        let results = [];
        try {
          results = await Promise.race([searchSongs(query, { artist: cleanArtist }), timeoutPromise]);
        } catch (e) {
          // If Saavn search times out or errors, just swallow and proceed to YouTube fallback
          results = [];
        }

        if (!results || results.length === 0) {
          try {
            results = await Promise.race([
              searchYouTube(query),
              new Promise((_, rej) => setTimeout(() => rej(new Error('YT timeout')), 5000))
            ]);
          } catch {
            results = [];
          }
        }

        if (results && results.length > 0) {
          const spArtists = cleanArtist.split(',').map(a => (a || '').toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean);
          const badWords = ['karaoke', 'cover', 'sped up', 'tribute', 'lofi', 'zzang', 'nightcore', 'techno', '8d', 'slowed', 'reverb', 'instrumental'];

          let matchedTrack = null;
          for (let j = 0; j < Math.min(results.length, 10); j++) {
            try {
              const r = results[j];
              const rTitle = (r?.name || r?.title || '').toString().toLowerCase();
              const rArtistStr = (r?.primaryArtists || r?.singers || r?.artist || '').toString().toLowerCase();

              if (badWords.some(bw => rTitle.includes(bw) || rArtistStr.includes(bw))) continue;

              let isArtistMatch = false;
              if (spArtists.length > 0) {
                const svArtists = rArtistStr.split(/,|&/).map(a => (a || '').replace(/[^a-z0-9]/g, '')).filter(Boolean);
                isArtistMatch = svArtists.length === 0
                  || spArtists.some(sp => svArtists.some(sv => sp.includes(sv) || sv.includes(sp)));
              } else {
                isArtistMatch = true;
              }

              if (isArtistMatch) {
                matchedTrack = r;
                break;
              }
            } catch (innerErr) {
              console.warn(`Error validating match for track variant ${j}:`, innerErr);
            }
          }

          if (!matchedTrack && results.length > 0) {
            const cleanTitleLower = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
            for (let j = 0; j < Math.min(results.length, 5); j++) {
              const r = results[j];
              const rTitle = (r?.name || r?.title || '').toString().toLowerCase();
              const rArtistStr = (r?.primaryArtists || r?.singers || r?.artist || '').toString().toLowerCase();
              if (badWords.some(bw => rTitle.includes(bw) || rArtistStr.includes(bw))) continue;
              
              const rTitleClean = rTitle.replace(/[^a-z0-9]/g, '');
              if (rTitleClean && (rTitleClean.includes(cleanTitleLower) || cleanTitleLower.includes(rTitleClean))) {
                matchedTrack = r;
                break;
              }
            }
            if (!matchedTrack) {
              matchedTrack = results.find(r => {
                const rTitle = (r?.name || r?.title || '').toString().toLowerCase();
                const rArtistStr = (r?.primaryArtists || r?.singers || r?.artist || '').toString().toLowerCase();
                return !badWords.some(bw => rTitle.includes(bw) || rArtistStr.includes(bw));
              }) || null;
            }
          }

          if (matchedTrack) {
            get().addSongToPlaylist(playlistId, matchedTrack);
            importedCount++;
          }
        }
      } catch (trackErr) {
        console.warn(`[Import] Skipped track ${i + 1} ("${tracks[i]?.title || query}") — ${trackErr.message}`);
      }
    }
    
    get().updatePlaylistSyncStatus(playlistId, false, '');
  },
});
