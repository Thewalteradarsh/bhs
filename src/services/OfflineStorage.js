import { set, get, del, keys } from 'idb-keyval';

/**
 * OfflineStorage: Asynchronous IndexedDB manager specifically for caching 
 * raw audio files (as Blobs) and complete track metadata for offline playback.
 */
export const OfflineStorage = {
  // Store an audio blob and its metadata
  saveTrack: async (track, audioBlob) => {
    try {
      // Store the blob
      await set(`audio_${track.id}`, audioBlob);
      // Store the metadata
      await set(`meta_${track.id}`, track);
      return true;
    } catch (e) {
      console.error('[OfflineStorage] Error saving track:', e);
      return false;
    }
  },

  // Retrieve an audio blob
  getTrackAudio: async (trackId) => {
    try {
      return await get(`audio_${trackId}`);
    } catch (e) {
      console.error('[OfflineStorage] Error getting track audio:', e);
      return null;
    }
  },

  // Retrieve track metadata
  getTrackMeta: async (trackId) => {
    try {
      return await get(`meta_${trackId}`);
    } catch (e) {
      console.error('[OfflineStorage] Error getting track meta:', e);
      return null;
    }
  },

  // Delete a track (both blob and metadata)
  removeTrack: async (trackId) => {
    try {
      await del(`audio_${trackId}`);
      await del(`meta_${trackId}`);
      return true;
    } catch (e) {
      console.error('[OfflineStorage] Error removing track:', e);
      return false;
    }
  },

  // Get all downloaded track metadata
  getAllDownloadedTracks: async () => {
    try {
      const allKeys = await keys();
      const metaKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith('meta_'));
      
      const tracks = [];
      for (const key of metaKeys) {
        const meta = await get(key);
        if (meta) {
          tracks.push(meta);
        }
      }
      return tracks;
    } catch (e) {
      console.error('[OfflineStorage] Error getting all tracks:', e);
      return [];
    }
  },
  
  // Check if a track is downloaded
  isTrackDownloaded: async (trackId) => {
     try {
        const audio = await get(`audio_${trackId}`);
        return !!audio;
     } catch (e) {
        return false;
     }
  }
};
