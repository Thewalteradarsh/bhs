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
            const targetUrl = `https://open.spotify.com/embed/playlist/${id}`;
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Network error fetching playlist proxy');

            const data = await response.json();
            const html = data.contents;
            if (!html) throw new Error('Empty payload returned');

            const tagStart = '<script id="__NEXT_DATA__" type="application/json">';
            const startIdx = html.indexOf(tagStart);
            if (startIdx === -1) throw new Error('Metadata block not found in page');

            const jsonStart = startIdx + tagStart.length;
            const jsonEnd = html.indexOf('</script>', jsonStart);
            const rawJson = html.substring(jsonStart, jsonEnd);

            const parsed = JSON.parse(rawJson);
            const entity = parsed?.props?.pageProps?.state?.data?.entity;

            if (!entity || !entity.trackList) {
                throw new Error('Playlist tracklist structure is missing or modified');
            }

            const formattedTracks = entity.trackList.map((item, index) => ({
                rank: index + 1,
                id: item.uri?.replace('spotify:track:', '') || `track_${index}`,
                title: item.title || item.name || 'Unknown Title',
                artists: item.subtitle || item.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
                albumArt: item.coverArt?.sources?.[0]?.url || '',
                durationMs: item.duration || 0,
                durationFormatted: formatDuration(item.duration),
                previewUrl: item.audioPreview?.url || item.previewUrl || null
            }));

            const title = entity.name || 'Playlist';

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