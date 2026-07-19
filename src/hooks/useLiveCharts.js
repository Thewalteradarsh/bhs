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
            // [!] IMPORTANT: The direct HTML proxy approach is blocked by Spotify.
            // Switching to the official Spotify Web API.
            // TODO: Insert a valid client-side generated Spotify Access Token here.
            // Example: const accessToken = 'BQA...';
            const accessToken = ''; 

            if (!accessToken) {
                console.warn("Missing Spotify Access Token. Please provide one to fetch playlists.");
                // For development, if token is missing, we could throw here or handle gracefully.
                throw new Error("Missing Spotify Access Token");
            }

            const apiUrl = `https://api.spotify.com/v1/playlists/${id}`;
            console.log("Fetching live playlist from Spotify API:", apiUrl);

            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Spotify API error: ${response.status} ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();

            if (!data || !data.tracks || !data.tracks.items) {
                throw new Error('Playlist tracklist structure is missing or invalid');
            }

            const formattedTracks = data.tracks.items
                .filter(item => item.track) // Filter out null tracks or local files if any
                .map((item, index) => {
                    const track = item.track;
                    return {
                        rank: index + 1,
                        id: track.id || `track_${index}`,
                        title: track.name || 'Unknown Title',
                        artists: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
                        albumArt: track.album?.images?.[0]?.url || '',
                        durationMs: track.duration_ms || 0,
                        durationFormatted: formatDuration(track.duration_ms),
                        previewUrl: track.preview_url || null
                    };
                });

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