import React, { useState } from 'react';
import { Heart, Music2, ListMusic, Trash2, DownloadCloud, X, Loader, BadgeCheck } from 'lucide-react';
import usePlayerStore from '../store/usePlayerStore';
import { fetchWithTimeout } from '../services/apiClient';
import SeeAllView from './SeeAllView';

export default function LibraryView() {
  const { likedSongs, playedHistory, currentSong, playlists, removePlaylist, createPlaylist, addSongToPlaylist, togglePinPlaylist, runBackgroundImport } = usePlayerStore();
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Spotify Importer State
  const [importTab, setImportTab] = useState('link');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [importStatus, setImportStatus] = useState({ loading: false, error: null, progress: '' });

  // Build unique liked songs list from history
  const seen = new Set();
  const likedList = playedHistory
    .filter(s => likedSongs.has(s.id) && !seen.has(s.id) && seen.add(s.id))
    .reverse();

  if (selectedPlaylist) {
    return (
      <SeeAllView
        section={{ label: selectedPlaylist.name, songs: selectedPlaylist.songs }}
        onClose={() => setSelectedPlaylist(null)}
      />
    );
  }

  // Helper function to normalize strings for comparison
  const normalizeStr = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');



   /**
   * Step 1 — Fetch the Spotify playlist tracklist.
   *
   * The browser calls ONLY our own internal endpoint: /api/spotify?id=…
   * That Cloudflare Pages Function does the actual scraping server-side,
   * so the browser never touches open.spotify.com or any third-party scraper.
   *
   * No CORS errors possible. No API keys required.
   */
  const fetchSpotifyTracklist = async (url) => {
    const idMatch = url.match(/playlist\/([A-Za-z0-9]+)/);
    const playlistId = idMatch ? idMatch[1] : null;

    if (!playlistId) {
      throw new Error(
        'Could not find a playlist ID in that URL. Please paste a full Spotify playlist link.'
      );
    }

    setImportStatus({ loading: true, error: null, progress: 'Fetching playlist via server…' });

    // We use a relative path. The Cloudflare Pages deployment MUST host this endpoint.
    const endpointUrl = `/api/spotify?id=${playlistId}`;

    const res = await fetchWithTimeout(endpointUrl, {}, 15000);
    
    let data;
    try {
      // Use safeJson to prevent the UI from crashing if the server returns HTML (e.g., 404 page)
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error('Server returned HTML instead of JSON. The /api/spotify endpoint might not be deployed correctly on this domain.');
      }
      data = await res.json();
    } catch (parseErr) {
      throw new Error(parseErr.message);
    }

    if (!res.ok || data.error) {
      throw new Error(
        data.error ||
        `Server returned HTTP ${res.status} while fetching the playlist.`
      );
    }

    if (!Array.isArray(data.tracks) || data.tracks.length === 0) {
      throw new Error(
        'The playlist appears to be empty or private. Make sure it is set to Public on Spotify.'
      );
    }

    return {
      name: data.title || 'Imported from Spotify',
      coverArt: data.coverArt,
      tracks: data.tracks.map(t => ({ title: t.title || '', artist: t.artist || '' })),
    };
  };

  const handleImportSpotify = async () => {
    if (importTab === 'link') {
      if (!spotifyUrl) return;
      setImportStatus({ loading: true, error: null, progress: 'Fetching Spotify playlist…' });

      try {
        const { name: playlistName, coverArt, tracks } = await fetchSpotifyTracklist(spotifyUrl);

        if (!tracks || tracks.length === 0) {
          throw new Error('No tracks found in the Spotify playlist.');
        }

        const pl = createPlaylist(playlistName, coverArt, false, { isSyncing: true, syncProgress: 'Starting...' });
        runBackgroundImport(tracks, pl.id);

        setShowImportModal(false);
        setSpotifyUrl('');
        setImportStatus({ loading: false, error: null, progress: '' });
      } catch (err) {
        setImportStatus({ loading: false, error: err.message, progress: '' });
      }
    } else {
      if (!manualText.trim()) return;
      setImportStatus({ loading: true, error: null, progress: 'Parsing text...' });
      
      const lines = manualText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        setImportStatus({ loading: false, error: 'No songs found in text.', progress: '' });
        return;
      }

      // Simple parsing: if contains "-", assume "Song - Artist"
      const tracks = lines.map(line => {
        if (line.includes('-')) {
          const parts = line.split('-');
          return { title: parts[0].trim(), artist: parts.slice(1).join('-').trim() };
        }
        return { title: line, artist: '' };
      });

      const pl = createPlaylist(`Manual Import (${lines.length} songs)`, null, false, { isSyncing: true, syncProgress: 'Starting...' });
      runBackgroundImport(tracks, pl.id);

      setShowImportModal(false);
      setManualText('');
      setImportStatus({ loading: false, error: null, progress: '' });
    }
  };

  return (
    <div style={{ padding: '32px 16px', overflowY: 'auto', height: '100%', paddingBottom: '120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingLeft: 16, paddingRight: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Your Library</h1>
        <button 
          onClick={() => setShowImportModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--accent)', color: 'black',
            fontWeight: 700, fontSize: 13, padding: '8px 16px',
            borderRadius: 500, cursor: 'pointer'
          }}
        >
          <DownloadCloud size={16} /> Import Playlist
        </button>
      </div>

      {/* Playlists Section */}
      <div style={{ marginBottom: 32, paddingLeft: 16, paddingRight: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Playlists</h2>
        {playlists.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No playlists created yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
            {playlists.map(pl => (
              <div
                key={pl.id}
                onClick={() => setSelectedPlaylist(pl)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 8, padding: 16, cursor: 'pointer', position: 'relative'
                }}
              >
                <div style={{
                  width: '100%', aspectRatio: '1', background: 'rgba(255,255,255,0.1)',
                  borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                  overflow: 'hidden', position: 'relative'
                }}>
                  {pl.image ? (
                    <img src={pl.image} alt={pl.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ListMusic size={32} color="rgba(255,255,255,0.5)" />
                  )}
                  {pl.isSyncing && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                      <Loader className="animate-spin" size={24} color="var(--accent)" />
                      <div style={{ fontSize: 11, marginTop: 8, color: 'white', fontWeight: 600, textAlign: 'center', padding: '0 4px' }}>{pl.syncProgress || 'Syncing...'}</div>
                    </div>
                  )}
                </div>
                <div title={pl.name} style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', whiteSpace: 'normal', overflow: 'hidden' }}>{pl.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{pl.songs.length} songs</div>
                <button
                  onClick={(e) => { e.stopPropagation(); removePlaylist(pl.id); }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', padding: 6, borderRadius: '50%', cursor: 'pointer', zIndex: 2 }}
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePinPlaylist(pl.id); }}
                  style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.5)', border: 'none', color: pl.isPinned ? '#1db954' : 'white', padding: 6, borderRadius: '50%', cursor: 'pointer', zIndex: 2 }}
                  title={pl.isPinned ? 'Unpin from Home' : 'Pin to Home'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={pl.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pin"><line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ paddingLeft: 16, paddingRight: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: 'linear-gradient(135deg, #1db954, #006d2c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Heart size={24} fill="white" color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>Liked Songs</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{likedSongs.size} songs liked</p>
          </div>
        </div>

        {likedList.length === 0 ? (
          <div className="empty-state">
            <Music2 size={56} strokeWidth={1} />
            <p>Songs you like will appear here.</p>
            <p style={{ fontSize: 13 }}>Hit the ❤️ on any track while it's playing.</p>
          </div>
        ) : (
          <div className="result-list">
            {likedList.map((song, i) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <div key={song.id + i} className={`result-item ${isCurrent ? 'playing' : ''}`}>
                  <div className="result-thumb">🎵</div>
                  <div className="result-info">
                    <div className="result-title" style={{ color: isCurrent ? 'var(--accent)' : undefined, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {song.title}
                      {song.source === 'jiosaavn' && <BadgeCheck size={14} color="#4CAF50" aria-label="Verified Source" />}
                    </div>
                    <div className="result-artist">{song.artist}</div>
                  </div>
                  <Heart size={16} fill="var(--accent)" color="var(--accent)" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: '#18181b', borderRadius: 16, width: '100%', maxWidth: 450,
            overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Import Playlist</h3>
              <button onClick={() => setShowImportModal(false)} style={{ color: '#a1a1aa' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <button 
                onClick={() => setImportTab('link')}
                style={{ flex: 1, padding: 12, background: 'none', border: 'none', color: importTab === 'link' ? '#fff' : '#71717a', borderBottom: importTab === 'link' ? '2px solid var(--accent)' : '2px solid transparent', fontWeight: 600 }}
              >
                Spotify Link (Max 100)
              </button>
              <button 
                onClick={() => setImportTab('text')}
                style={{ flex: 1, padding: 12, background: 'none', border: 'none', color: importTab === 'text' ? '#fff' : '#71717a', borderBottom: importTab === 'text' ? '2px solid var(--accent)' : '2px solid transparent', fontWeight: 600 }}
              >
                Paste Text (Unlimited)
              </button>
            </div>

            <div style={{ padding: 20 }}>
              {importTab === 'link' ? (
                <>
                  <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16 }}>Paste a public Spotify playlist link below. Note: Only fetches the first 100 songs without official API keys.</p>
                  <input 
                    type="text" 
                    placeholder="https://open.spotify.com/playlist/..."
                    value={spotifyUrl}
                    onChange={(e) => setSpotifyUrl(e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                      padding: '12px 16px', color: 'white', outline: 'none', marginBottom: 16
                    }}
                  />
                </>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16 }}>Copy all songs from your Spotify Desktop app (Ctrl+A then Ctrl+C) and paste them here, or paste any list of songs (one per line).</p>
                  <textarea 
                    placeholder="Song Name - Artist Name&#10;Another Song - Another Artist"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    style={{
                      width: '100%', height: '150px', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                      padding: '12px 16px', color: 'white', outline: 'none', marginBottom: 16, resize: 'none'
                    }}
                  />
                </>
              )}

              {importStatus.error && (
                <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 16, background: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 6 }}>
                  {importStatus.error}
                </div>
              )}
              {importStatus.progress && !importStatus.error && (
                <div style={{ color: '#10b981', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {importStatus.loading && <Loader size={14} className="animate-spin" />}
                  {importStatus.progress}
                </div>
              )}
              
              <button
                onClick={handleImportSpotify}
                disabled={importStatus.loading || (importTab === 'link' ? !spotifyUrl : !manualText.trim())}
                style={{
                  width: '100%', background: 'var(--accent)', color: 'black',
                  fontWeight: 700, padding: 14, borderRadius: 8, cursor: 'pointer',
                  opacity: (importStatus.loading || (importTab === 'link' ? !spotifyUrl : !manualText.trim())) ? 0.5 : 1
                }}
              >
                {importStatus.loading ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
