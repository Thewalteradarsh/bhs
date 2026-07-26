import React, { useEffect, useState, useRef } from 'react';
import useListeningHistory from '../hooks/useListeningHistory';
import { getAIDiscoverRecommendations } from '../services/recommendationService';
import { searchSongs } from '../services/saavnService';
import SongCard from './SongCard';
import { Sparkles, Brain } from 'lucide-react';

export default function SmartDiscover({ onSeeAll }) {
  const { history } = useListeningHistory();
  const [status, setStatus] = useState('idle'); // 'idle', 'loading_signals', 'loading_tracks', 'success', 'error', 'empty_history', 'no_results'
  const [tracks, setTracks] = useState([]);
  const [playlistName, setPlaylistName] = useState('AI Discover: Crafted for You');
  const fetchedRef = useRef(false); // To prevent double-fetching on strict mode / mount

  useEffect(() => {
    // Only fetch once per mount
    if (fetchedRef.current) return;
    
    const fetchDiscover = async () => {
      // 1. Check history
      if (!history || history.length === 0) {
        setStatus('empty_history');
        return;
      }

      fetchedRef.current = true;
      setStatus('loading_signals');

      // 2. Fetch recommendations from Groq
      const aiData = await getAIDiscoverRecommendations(history);
      if (!aiData || !aiData.recommendations || aiData.recommendations.length === 0) {
        setStatus('no_results');
        return;
      }

      if (aiData.playlist_name) {
        setPlaylistName(aiData.playlist_name);
      }

      setStatus('loading_tracks');

      // 3. Map recommendations to JioSaavn tracks via search API
      const trackPromises = aiData.recommendations.map(async (rec) => {
        try {
          const searchResults = await searchSongs(rec.search_query || `${rec.title} ${rec.artist}`);
          if (searchResults && searchResults.length > 0) {
            return searchResults[0]; // Take the top result
          }
          return null;
        } catch (err) {
          console.error('Search failed for recommendation:', rec, err);
          return null;
        }
      });

      const resolvedTracks = await Promise.all(trackPromises);
      const validTracks = resolvedTracks.filter(Boolean);

      if (validTracks.length > 0) {
        setTracks(validTracks);
        setStatus('success');
      } else {
        setStatus('no_results');
      }
    };

    fetchDiscover();
  }, [history]);

  // Handle rendering based on status
  if (status === 'error' || status === 'no_results') {
    return null; // Silently hide on failure or not enough results
  }

  if (status === 'empty_history') {
    return (
      <div className="smart-discover-empty">
        <Brain size={32} style={{ opacity: 0.5, marginBottom: 12 }} />
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Discover Awaits</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Play some songs to get personalized AI recommendations.</p>
      </div>
    );
  }

  const isLoading = status === 'loading_signals' || status === 'loading_tracks';

  return (
    <div className="smart-discover section">
      <div className="section-header">
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {playlistName}
          <span className="ai-badge">
            <Sparkles size={11} /> AI Picks
          </span>
        </h2>
        {!isLoading && tracks.length > 0 && onSeeAll && (
          <button
            className="section-see-all"
            onClick={() => onSeeAll({
              label: playlistName,
              songs: tracks,
            })}
          >
            SEE ALL
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="loading-cards">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : (
        <div className="cards-scroll">
          {tracks.map((song, i) => (
            <SongCard key={song.id + i} song={song} queue={tracks} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
