import React from 'react';
import { Home, Search, Library, Music2 } from 'lucide-react';

const PLAYLISTS = [
  { id: 1, name: 'Liked Songs', emoji: '💚', meta: 'Playlist' },
  { id: 2, name: 'Bollywood Favorites', emoji: '🎬', meta: 'Playlist' },
  { id: 3, name: 'Morning Drive', emoji: '☀️', meta: 'Playlist' },
  { id: 4, name: 'Late Night Feels', emoji: '🌙', meta: 'Playlist' },
  { id: 5, name: 'Workout Pump', emoji: '💪', meta: 'Playlist' },
  { id: 6, name: 'Chill & Study', emoji: '📚', meta: 'Playlist' },
  { id: 7, name: 'Party Mode', emoji: '🎉', meta: 'Playlist' },
  { id: 8, name: 'Retro Classics', emoji: '🎸', meta: 'Playlist' },
  { id: 9, name: 'Indie Vibes', emoji: '🎷', meta: 'Playlist' },
];

export default function Sidebar({ view, setView }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Music2 size={28} />
        <span>Hear</span>
      </div>

      <nav className="sidebar-nav">
        <button
          id="nav-home"
          className={`nav-item ${view === 'home' ? 'active' : ''}`}
          onClick={() => setView('home')}
        >
          <Home size={20} />
          <span>Home</span>
        </button>
        <button
          id="nav-search"
          className={`nav-item ${view === 'search' ? 'active' : ''}`}
          onClick={() => setView('search')}
        >
          <Search size={20} />
          <span>Search</span>
        </button>
        <button
          id="nav-library"
          className={`nav-item ${view === 'library' ? 'active' : ''}`}
          onClick={() => setView('library')}
        >
          <Library size={20} />
          <span>Your Library</span>
        </button>
      </nav>

      <div className="sidebar-divider" />
      <div className="sidebar-section-title">Playlists</div>

      <div className="playlist-list">
        {PLAYLISTS.map(pl => (
          <div key={pl.id} className="playlist-item" id={`playlist-${pl.id}`}>
            <div className="playlist-thumb">{pl.emoji}</div>
            <div className="playlist-info">
              <div className="playlist-name">{pl.name}</div>
              <div className="playlist-meta">{pl.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
