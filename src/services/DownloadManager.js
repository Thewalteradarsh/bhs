import { useAppStore } from '../store/useAppStore';
import { OfflineStorage } from './OfflineStorage';

class DownloadManagerSingleton {
  constructor() {
    this.activeDownloads = new Set();
  }

  /**
   * Helper to get best audio stream URL
   */
  _getStreamUrl(track) {
    if (Array.isArray(track.downloadUrl)) {
      const highRes = track.downloadUrl.find(u => u.quality === '320kbps');
      const standardRes = track.downloadUrl.find(u => u.quality === '160kbps');
      return highRes?.url || standardRes?.url || track.downloadUrl[0]?.url;
    } else if (typeof track.downloadUrl === 'string') {
      return track.downloadUrl;
    } else if (track.media_url) {
      return track.media_url;
    }
    return null;
  }

  /**
   * Download a single track
   */
  async downloadTrack(track, retryCount = 0) {
    if (this.activeDownloads.has(track.id)) return;
    
    // Check if already downloaded
    const isDownloaded = await OfflineStorage.isTrackDownloaded(track.id);
    if (isDownloaded) {
      useAppStore.getState().addDownloadedTrack(track);
      return true;
    }

    const streamUrl = this._getStreamUrl(track);
    if (!streamUrl) {
      console.error('[DownloadManager] No stream URL for track:', track.id);
      return false;
    }

    this.activeDownloads.add(track.id);
    useAppStore.getState().addDownloadQueue(track.id);

    try {
      const response = await fetch(streamUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      const success = await OfflineStorage.saveTrack(track, blob);
      
      if (success) {
        useAppStore.getState().addDownloadedTrack(track);
      }
      return success;
    } catch (e) {
      console.error(`[DownloadManager] Error downloading ${track.id}:`, e);
      if (retryCount < 2) {
        console.log(`[DownloadManager] Retrying download for ${track.id} (Attempt ${retryCount + 1})`);
        this.activeDownloads.delete(track.id);
        useAppStore.getState().removeDownloadQueue(track.id);
        return this.downloadTrack(track, retryCount + 1);
      }
      return false;
    } finally {
      this.activeDownloads.delete(track.id);
      useAppStore.getState().removeDownloadQueue(track.id);
    }
  }

  /**
   * Download an entire playlist (array of tracks)
   */
  async downloadPlaylist(tracks) {
    // We could do this in parallel, but to avoid browser network congestion, 
    // we'll do them sequentially or in small batches.
    let successCount = 0;
    
    for (const track of tracks) {
      const success = await this.downloadTrack(track);
      if (success) successCount++;
    }
    
    return successCount;
  }
}

export const DownloadManager = new DownloadManagerSingleton();
