import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Globe, ChevronRight, Check, Info, Trash2, Music2, Search, X, Star, Heart, Wifi, Headphones, PlayCircle, Database, AlertTriangle, User } from 'lucide-react';
import { LANGUAGES, INDIAN_ARTISTS, loadSettings, saveSettings } from '../lib/settings';
import { invalidateGroqCache } from '../services/recommendationService';
import { searchSongs } from '../services/saavnService';
import usePlayerStore from '../store/usePlayerStore';

// ── Toggle Switch ────────────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div className="settings-toggle-row" onClick={() => onChange(!checked)} role="switch" aria-checked={checked} tabIndex={0}>
      <div className="settings-toggle-info">
        <div className="settings-toggle-label">{label}</div>
        {description && <div className="settings-toggle-desc">{description}</div>}
      </div>
      <div className={`settings-toggle-switch ${checked ? 'settings-toggle-switch--active' : ''}`}>
        <div className="settings-toggle-knob" />
      </div>
    </div>
  );
}

// ── Language picker ──────────────────────────────────────────────────────────
function LangPicker({ label, value, onChange, excludeId, optional }) {
  return (
    <div className="settings-lang-picker">
      <div className="settings-lang-label">
        <Globe size={16} />
        <span>{label}</span>
        {optional && <span className="settings-optional">optional</span>}
      </div>
      <div className="settings-lang-chips">
        {optional && (
          <button
            className={`lang-chip ${!value ? 'lang-chip--active' : ''}`}
            onClick={() => onChange('')}
            aria-label="None"
          >
            None
          </button>
        )}
        {LANGUAGES.filter(l => l.id !== excludeId).map(lang => (
          <button
            key={lang.id}
            id={`lang-${label.toLowerCase().replace(' ', '-')}-${lang.id}`}
            className={`lang-chip ${value === lang.id ? 'lang-chip--active' : ''}`}
            onClick={() => onChange(lang.id)}
            aria-label={lang.label}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
            {value === lang.id && <Check size={12} />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Favourite Artist Picker ──────────────────────────────────────────────────
function ArtistPicker({ selected, onChange }) {
  const [query, setQuery]     = useState('');
  const [apiArtists, setApiArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef              = useRef(null);

  // Deduplicate the global list by name
  const uniqueArtists = useMemo(() => {
    const seen = new Set();
    return INDIAN_ARTISTS.filter(a => {
      if (seen.has(a.name)) return false;
      seen.add(a.name);
      return true;
    });
  }, []);

  const localFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return uniqueArtists;
    return uniqueArtists.filter(
      a => a.name.toLowerCase().includes(q) || a.lang.toLowerCase().includes(q)
    );
  }, [query, uniqueArtists]);

  // Dynamic API Search
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setApiArtists([]);
      return;
    }
    
    setLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const songs = await searchSongs(q);
        const fetchedArtists = new Map();
        songs.forEach(s => {
          if (s.primaryArtists) {
            s.primaryArtists.split(',').forEach(a => {
              const name = a.trim();
              if (name && name.toLowerCase().includes(q.toLowerCase())) {
                fetchedArtists.set(name, { name, lang: 'Global' });
              }
            });
          }
        });
        setApiArtists(Array.from(fetchedArtists.values()));
      } catch (err) {
        console.error("Artist search failed", err);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Combine local and API artists, removing duplicates
  const filtered = useMemo(() => {
    const combined = [...localFiltered];
    const seen = new Set(combined.map(a => a.name.toLowerCase()));
    
    apiArtists.forEach(a => {
      if (!seen.has(a.name.toLowerCase())) {
        combined.push(a);
        seen.add(a.name.toLowerCase());
      }
    });
    
    return combined;
  }, [localFiltered, apiArtists]);

  const toggle = (name) => {
    const next = selected.includes(name)
      ? selected.filter(n => n !== name)
      : [...selected, name];
    onChange(next);
  };

  const clear = () => onChange([]);
  const q = query.trim();

  // Determine if exact match exists
  const hasExactMatch = filtered.some(a => a.name.toLowerCase() === q.toLowerCase());

  return (
    <div className="artist-picker">
      {/* Search bar */}
      <div className="artist-search-bar">
        <Search size={15} className="artist-search-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search any artist globally…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="artist-search-input"
          id="artist-search-input"
          aria-label="Search artists globally"
        />
        {query && (
          <button className="artist-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Selected badges */}
      {selected.length > 0 && (
        <div className="artist-selected-row">
          <span className="artist-selected-label">{selected.length} selected</span>
          <button className="artist-clear-all" onClick={clear}>Clear all</button>
        </div>
      )}
      {selected.length > 0 && (
        <div className="artist-chips-selected">
          {selected.map(name => (
            <button
              key={name}
              className="artist-chip artist-chip--selected"
              onClick={() => toggle(name)}
              aria-label={`Remove ${name}`}
            >
              <Star size={11} />
              <span>{name}</span>
              <X size={11} />
            </button>
          ))}
        </div>
      )}

      {/* Full list */}
      <div className="artist-list" role="list">
        
        {/* Force Add Row */}
        {q && !hasExactMatch && (
          <button
            role="listitem"
            className="artist-row"
            onClick={() => {
              toggle(q);
              setQuery('');
            }}
          >
            <div className="artist-row-avatar" style={{ backgroundColor: '#ff4444', color: '#fff', border: 'none' }}>
              +
            </div>
            <div className="artist-row-info">
              <span className="artist-row-name">Add "{q}"</span>
              <span className="artist-row-lang">Custom Artist</span>
            </div>
          </button>
        )}

        {filtered.length === 0 && !loading && !q && (
          <div className="artist-no-results">Type to search any artist</div>
        )}
        
        {loading && (
          <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#888' }}>
            Searching global catalog...
          </div>
        )}

        {filtered.map(artist => {
          const isSel = selected.includes(artist.name);
          return (
            <button
              key={artist.name + artist.lang}
              role="listitem"
              className={`artist-row ${isSel ? 'artist-row--active' : ''}`}
              onClick={() => toggle(artist.name)}
              aria-pressed={isSel}
              id={`artist-${artist.name.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <div className="artist-row-avatar">
                {artist.name.charAt(0)}
              </div>
              <div className="artist-row-info">
                <span className="artist-row-name">{artist.name}</span>
                <span className="artist-row-lang">{artist.lang}</span>
              </div>
              {isSel
                ? <div className="artist-row-check"><Check size={15} /></div>
                : <div className="artist-row-add">+</div>
              }
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── SettingsView ─────────────────────────────────────────────────────────────
export default function SettingsView({ setView }) {
  const [settings, setSettings] = useState(loadSettings);
  const [saved,    setSaved]    = useState(false);
  const { setDonationModalOpen } = usePlayerStore();

  const update = (key, val) => {
    const next = { ...settings, [key]: val };
    // If secondary becomes same as primary, clear it
    if (key === 'primaryLang' && next.secondaryLang === val) {
      next.secondaryLang = '';
    }
    setSettings(next);
    saveSettings(next);
    invalidateGroqCache();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const clearHistory = () => {
    if (window.confirm('Clear all play history and liked songs?')) {
      localStorage.removeItem('saavn_play_history');
      localStorage.removeItem('saavn_liked');
      localStorage.removeItem('hear_daily_mix_cache');
      invalidateGroqCache();
      window.location.reload();
    }
  };

  return (
    <div className="settings-view" id="settings-view">

      {/* Header */}
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        {saved && <span className="settings-saved-toast">✓ Saved</span>}
      </div>

      {/* User Profile */}
      <section className="settings-section">
        <div className="settings-section-title">
          <User size={16} />
          Profile
        </div>
        <div className="settings-select-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
          <label htmlFor="user-name-input">Display Name</label>
          <input 
            id="user-name-input"
            type="text" 
            placeholder="What should we call you?"
            value={settings.userName || ''}
            onChange={(e) => update('userName', e.target.value)}
            style={{ 
              width: '100%', padding: '12px 14px', borderRadius: '12px', 
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', 
              color: 'white', fontSize: '15px', outline: 'none' 
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>
      </section>

      <div className="settings-divider" />

      {/* Data Saver */}
      <section className="settings-section">
        <div className="settings-section-title">
          <Wifi size={16} />
          Data Saver
        </div>
        <ToggleSwitch 
          label="Data Saver"
          description="Sets your audio quality to low (equivalent to 24kbit/s) and disables artist canvases."
          checked={settings.dataSaver}
          onChange={(v) => update('dataSaver', v)}
        />
      </section>

      <div className="settings-divider" />

      {/* Audio Quality */}
      <section className="settings-section">
        <div className="settings-section-title">
          <Headphones size={16} />
          Audio Quality
        </div>
        <p className="settings-section-desc">Streaming quality over Wi-Fi and Cellular.</p>
        <div className="settings-select-row">
          <label htmlFor="audio-quality-select">Streaming quality</label>
          <select 
            id="audio-quality-select"
            className="settings-select"
            value={settings.audioQuality}
            onChange={(e) => update('audioQuality', e.target.value)}
            disabled={settings.dataSaver}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="very_high">Very High</option>
          </select>
        </div>
      </section>

      <div className="settings-divider" />

      {/* Playback */}
      <section className="settings-section">
        <div className="settings-section-title">
          <PlayCircle size={16} />
          Playback
        </div>
        
        <ToggleSwitch 
          label="Gapless Playback"
          description="Allows ongoing music to play without interruption."
          checked={settings.gaplessPlayback}
          onChange={(v) => update('gaplessPlayback', v)}
        />
        
        <ToggleSwitch 
          label="Autoplay"
          description="Enjoy nonstop listening. We'll play similar songs when your queue ends."
          checked={settings.autoplay}
          onChange={(v) => update('autoplay', v)}
        />

        <ToggleSwitch 
          label="Allow Explicit Content"
          description="Turn on to play explicit content. Explicit content is labeled with E."
          checked={settings.explicitContent}
          onChange={(v) => update('explicitContent', v)}
        />
      </section>

      <div className="settings-divider" />

      {/* Language preferences */}
      <section className="settings-section">
        <div className="settings-section-title">
          <Globe size={16} />
          Language Preferences
        </div>
        <p className="settings-section-desc">
          Groq AI will prioritise these languages when generating recommendations.
        </p>

        <LangPicker
          label="Primary Language"
          value={settings.primaryLang}
          onChange={(v) => update('primaryLang', v)}
          excludeId={settings.secondaryLang}
        />

        <LangPicker
          label="Second Language"
          value={settings.secondaryLang}
          onChange={(v) => update('secondaryLang', v)}
          excludeId={settings.primaryLang}
          optional
        />
      </section>

      <div className="settings-divider" />

      {/* Favourite Artists */}
      <section className="settings-section">
        <div className="settings-section-title">
          <Star size={16} />
          Favourite Artists
        </div>
        <p className="settings-section-desc">
          Select your favourite Indian artists. AI Picks will prioritise their songs and similar music in recommendations.
        </p>
        <ArtistPicker
          selected={settings.favoriteArtists || []}
          onChange={(val) => update('favoriteArtists', val)}
        />
      </section>

      <div className="settings-divider" />

      {/* Support */}
      <section className="settings-section">
        <div className="settings-section-title">
          <Heart size={16} className="text-red-500 fill-red-500" />
          Support
        </div>
        <p className="settings-section-desc">
          Help cover server and development costs to keep Hear Music ad-free forever.
        </p>
        <button
          onClick={() => setDonationModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-xl font-bold transition-transform active:scale-95 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
        >
          <Heart size={18} className="fill-white" />
          Buy Me a Chai / Support the Dev
        </button>
      </section>

      <div className="settings-divider" />

      {/* About */}
      <section className="settings-section">
        <div className="settings-section-title">
          <Info size={16} />
          About
        </div>
        <div className="settings-info-card">
          <div className="settings-info-row">
            <span className="settings-info-key">App</span>
            <span className="settings-info-val">Hear – Music Player</span>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-key">AI Engine</span>
            <span className="settings-info-val">Groq · Llama 3.3-70b</span>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-key">Music API</span>
            <span className="settings-info-val">JioSaavn</span>
          </div>
        </div>
      </section>

      <div className="settings-divider" />

      {/* Storage & Data */}
      <section className="settings-section">
        <div className="settings-section-title" style={{ color: '#ff4444' }}>
          <Database size={16} />
          Storage &amp; Data
        </div>
        <div className="settings-info-card" style={{ marginBottom: '16px' }}>
          <div className="settings-info-row">
            <span className="settings-info-key">App Cache</span>
            <span className="settings-info-val">~12 MB</span>
          </div>
        </div>
        <button
          className="settings-danger-btn"
          onClick={() => {
            if(window.confirm('Clear all app cache?')) {
              caches.keys().then(names => {
                for (let name of names) caches.delete(name);
              });
              alert('Cache cleared!');
            }
          }}
        >
          <Trash2 size={16} />
          Clear Cache
        </button>
        <button
          className="settings-danger-btn"
          onClick={clearHistory}
          id="clear-history-btn"
        >
          <Trash2 size={16} />
          Clear Play History &amp; Likes
        </button>
      </section>

      <div className="settings-divider" />

      {/* Admin Panel Access */}
      <section className="settings-section" style={{ paddingBottom: '100px' }}>
        <button
          onClick={() => setView('admin')}
          className="settings-danger-btn"
          style={{ backgroundColor: '#10b98120', color: '#10b981', borderColor: '#10b98150' }}
        >
          <Database size={16} />
          Admin Dashboard
        </button>
      </section>

    </div>
  );
}
