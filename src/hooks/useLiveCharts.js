import { useState, useEffect, useCallback } from 'react';

const CACHE_PREFIX = 'hear_live_playlist_';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000; // 21,600,000 milliseconds

export function useLiveCharts(spotifyId) {
    const [songs, setSongs] = useState([]);
    const [playlistTitle, setPlaylistTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchLivePlaylist = useCallback(async (id, cacheKey) => {
        setIsLoading(true);
        setError(null);

        try {
            // Securely proxy the Spotify request through our local API 
            // which bypasses the need for client-side Spotify access tokens.
            const apiUrl = `/api/fetchPlaylist?playlistUrl=https://open.spotify.com/playlist/${id}&format=json`;
            console.log("Fetching live playlist from local API:", apiUrl);

            const response = await fetch(apiUrl);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API error: ${response.status} ${errorData.error || response.statusText}`);
            }

            const data = await response.json();

            if (!data || !data.tracks) {
                throw new Error('Playlist tracklist structure is missing or invalid');
            }

            // The local API now returns pre-formatted tracks
            const formattedTracks = data.tracks.map((track) => ({
                ...track,
                durationFormatted: formatDuration(track.durationMs)
            }));

            const title = data.name || 'Playlist';

            // Save to localStorage with current timestamp
            const cacheData = {
                timestamp: Date.now(),
                title,
                tracks: formattedTracks
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));

            setSongs(formattedTracks);
            setPlaylistTitle(title);
        } catch (err) {
            console.error('[LiveCharts Error]:', err);
            setError('Could not load live chart data. Please try refreshing.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadPlaylistData = useCallback((forceRefresh = false) => {
        if (!spotifyId) return;

        const cacheKey = `${CACHE_PREFIX}${spotifyId}`;
        const cachedString = localStorage.getItem(cacheKey);

        if (cachedString && !forceRefresh) {
            try {
                const cached = JSON.parse(cachedString);
                const isFresh = (Date.now() - cached.timestamp) < SIX_HOURS_MS;

                if (isFresh && cached.tracks?.length > 0) {
                    setSongs(cached.tracks);
                    setPlaylistTitle(cached.title || '');
                    setIsLoading(false);
                    return; // Successfully served from 6-hour cache!
                }
            } catch (e) {
                localStorage.removeItem(cacheKey);
            }
        }

        fetchLivePlaylist(spotifyId, cacheKey);
    }, [spotifyId, fetchLivePlaylist]);

    useEffect(() => {
        loadPlaylistData();
    }, [loadPlaylistData]);

    return {
        songs,
        playlistTitle,
        isLoading,
        error,
        refreshData: () => loadPlaylistData(true)
    };
}

function formatDuration(ms) {
    if (!ms || isNaN(ms)) return '03:30';
    const mins = Math.floor(ms / 60000);
    const secs = ((ms % 60000) / 1000).toFixed(0);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}