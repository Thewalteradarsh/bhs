import { useAppStore } from '../store/useAppStore';
import { AudioEngine } from './AudioEngine';

/**
 * Orchestrates the native OS-level media controls (MediaSession API).
 * Allows Bluetooth headsets and Lock Screens to control our Queue State Machine.
 */
export function syncMediaSession(track) {
  if (!('mediaSession' in navigator)) return;

  if (!track) {
    navigator.mediaSession.metadata = null;
    return;
  }

  // Format high-res artwork from Saavn object
  const artworkArray = Array.isArray(track.image) 
    ? track.image.map(img => ({ 
        src: img.url || img.link, 
        sizes: img.quality,
        type: 'image/jpeg' 
      }))
    : [{ src: track.image || 'https://via.placeholder.com/500', sizes: '500x500', type: 'image/jpeg' }];

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.name || track.title,
    artist: track.primaryArtists || track.artist || 'Unknown Artist',
    album: track.album?.name || track.album || '',
    artwork: artworkArray
  });

  // Bind OS actions directly to our Engine and Zustand Store
  navigator.mediaSession.setActionHandler('play', () => AudioEngine.togglePlayPause());
  navigator.mediaSession.setActionHandler('pause', () => AudioEngine.togglePlayPause());
  navigator.mediaSession.setActionHandler('previoustrack', () => useAppStore.getState().playPrevious());
  navigator.mediaSession.setActionHandler('nexttrack', () => useAppStore.getState().playNext());
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.fastSeek && 'fastSeek' in AudioEngine.audio) {
      AudioEngine.audio.fastSeek(details.seekTime);
    } else {
      AudioEngine.seekTo(details.seekTime);
    }
  });
}
