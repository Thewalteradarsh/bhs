import { useAppStore } from '../store/useAppStore';
import { syncMediaSession } from './MediaSessionSync';
import { OfflineStorage } from './OfflineStorage';

class AudioEngineSingleton {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous'; // Important for certain streaming domains
    
    // Internal state
    this.currentTrackId = null;
    this.historyTimer = null;
    this.historyLogged = false;
    this.animationFrameId = null;
    this.lastUpdateTime = 0;

    this._bindEvents();
    this._subscribeToStore();
    this.currentObjectUrl = null;
  }

  _bindEvents() {
    this.audio.addEventListener('playing', () => {
      useAppStore.getState().setStatus('PLAYING');
      if (!this.historyLogged) {
        this._startHistoryTimer();
      }
    });

    this.audio.addEventListener('pause', () => {
      useAppStore.getState().setStatus('PAUSED');
      this._pauseHistoryTimer();
    });

    this.audio.addEventListener('waiting', () => {
      useAppStore.getState().setStatus('LOADING');
      this._pauseHistoryTimer();
    });

    this.audio.addEventListener('ended', () => {
      this._clearHistoryTimer();
      useAppStore.getState().playNext();
    });

    this.audio.addEventListener('error', (e) => {
      console.error("[AudioEngine] Playback Error:", e);
      // Fallback Strategy: If 320kbps fails, drop to 160kbps
      if (this.audio.src.includes('320')) {
         console.warn("[AudioEngine] Falling back to 160kbps stream...");
         this.audio.src = this.audio.src.replace('320', '160');
         this.audio.play().catch(err => this._handleFatalError(err));
      } else {
         this._handleFatalError(e);
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      useAppStore.getState().setDuration(this.audio.duration);
    });

    // Throttled timeupdate (max 2fps) using requestAnimationFrame to prevent React thrashing
    const updateProgress = (timestamp) => {
      if (timestamp - this.lastUpdateTime > 500) {
        useAppStore.getState().setProgress(this.audio.currentTime);
        this.lastUpdateTime = timestamp;
      }
      if (!this.audio.paused) {
        this.animationFrameId = requestAnimationFrame(updateProgress);
      }
    };

    this.audio.addEventListener('play', () => {
      this.animationFrameId = requestAnimationFrame(updateProgress);
    });

    this.audio.addEventListener('pause', () => {
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    });
  }

  _handleFatalError(e) {
      useAppStore.getState().setStatus('ERROR');
      this._clearHistoryTimer();
      
      // Auto-advance out of the dead-end after 2 seconds
      setTimeout(() => {
        console.info("[AudioEngine] Auto-advancing past failed track.");
        useAppStore.getState().playNext();
      }, 2000);
  }

  _subscribeToStore() {
    // Listen for currentTrack changes via Zustand subscription
    useAppStore.subscribe(
      (state) => state.playbackState.currentTrack,
      (newTrack, oldTrack) => {
        if (!newTrack) {
          this.audio.pause();
          this.audio.src = '';
          return;
        }

        if (oldTrack?.id !== newTrack.id) {
          this._loadAndPlay(newTrack);
        }
      }
    );

    // Listen for volume changes
    useAppStore.subscribe(
      (state) => state.playbackState.volume,
      (volume) => {
        this.audio.volume = volume;
      }
    );
  }

  async _loadAndPlay(track) {
    this.currentTrackId = track.id;
    this._clearHistoryTimer();
    this.historyLogged = false;

    // Clean up previous object URL if any
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }

    // 1. Check Offline Storage First
    let streamUrl = null;
    try {
      const audioBlob = await OfflineStorage.getTrackAudio(track.id);
      if (audioBlob) {
        streamUrl = URL.createObjectURL(audioBlob);
        this.currentObjectUrl = streamUrl;
        console.log(`[AudioEngine] Playing ${track.id} from offline storage`);
      }
    } catch (e) {
      console.error("[AudioEngine] Error checking offline storage:", e);
    }

    // 2. Fallback to Network
    if (!streamUrl) {
      if (track.preview) {
        streamUrl = track.preview;
      } else if (Array.isArray(track.downloadUrl)) {
        const highRes = track.downloadUrl.find(u => u.quality === '320kbps');
        const standardRes = track.downloadUrl.find(u => u.quality === '160kbps');
        streamUrl = highRes?.url || standardRes?.url || track.downloadUrl[0]?.url;
      } else if (typeof track.downloadUrl === 'string') {
        streamUrl = track.downloadUrl;
      } else if (track.media_url) {
        streamUrl = track.media_url;
      }
    }

    if (!streamUrl) {
      console.error("[AudioEngine] No valid stream URL found for track:", track);
      this._handleFatalError();
      return;
    }
    
    this.audio.src = streamUrl;
    
    this.audio.play().catch(err => {
      console.error("[AudioEngine] Autoplay prevented or failed:", err);
      // Wait for user interaction. State naturally sits at 'IDLE' or 'LOADING'.
    });

    // Sync OS Media Session Metadata
    syncMediaSession(track);
  }

  // --- External Actions ---
  togglePlayPause() {
    if (!this.audio.src) return;
    
    if (this.audio.paused) {
      this.audio.play();
    } else {
      this.audio.pause();
    }
  }

  seekTo(seconds) {
    if (this.audio.src && Number.isFinite(seconds)) {
      this.audio.currentTime = seconds;
      useAppStore.getState().setProgress(seconds);
    }
  }

  // --- History Tracker Logic (30-Second Rule) ---
  _startHistoryTimer() {
    if (this.historyTimer) return;
    
    // Require 30 seconds of cumulative playing time
    this.historyTimer = setTimeout(() => {
      const currentTrack = useAppStore.getState().playbackState.currentTrack;
      if (currentTrack) {
        useAppStore.getState().addTrackToHistory(currentTrack);
        this.historyLogged = true;
        console.debug(`[AudioEngine] Logged "${currentTrack.name || currentTrack.title}" to persistent history.`);
      }
    }, 30000); 
  }

  _pauseHistoryTimer() {
    if (this.historyTimer) {
      clearTimeout(this.historyTimer);
      this.historyTimer = null;
    }
  }

  _clearHistoryTimer() {
    this._pauseHistoryTimer();
  }
}

// Export singleton instance.
// Note: It initializes immediately, binding to the store without requiring a React mount.
export const AudioEngine = new AudioEngineSingleton();
