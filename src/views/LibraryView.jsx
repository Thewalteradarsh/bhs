import { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import PlaylistCover from '../components/library/PlaylistCover';
import PlaylistImporter from '../components/library/PlaylistImporter';
import { Heart, Plus, Music, Download, CheckCircle2, WifiOff } from 'lucide-react';
import { DownloadManager } from '../services/DownloadManager';

export default function LibraryView() {
  const { playlists, likedSongs } = useAppStore(state => state.library);
  const { isOfflineMode, downloadedTracks, downloadQueue } = useAppStore(state => state.offlineMode);
  const toggleOfflineMode = useAppStore(state => state.toggleOfflineMode);
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  const handlePlayLiked = () => {
    if (likedSongs.length > 0) {
      useAppStore.getState().playTrack(likedSongs[0], likedSongs);
    }
  };

  const handlePlayPlaylist = (playlist) => {
    if (playlist.tracks.length > 0) {
      useAppStore.getState().playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  const handleDownloadLiked = (e) => {
    e.stopPropagation();
    DownloadManager.downloadPlaylist(likedSongs);
  };

  const handleDownloadPlaylist = (e, playlist) => {
    e.stopPropagation();
    DownloadManager.downloadPlaylist(playlist.tracks);
  };

  // Filter for offline mode
  const displayLikedSongs = useMemo(() => {
    if (!isOfflineMode) return likedSongs;
    return likedSongs.filter(t => downloadedTracks.includes(t.id));
  }, [likedSongs, isOfflineMode, downloadedTracks]);

  const displayPlaylists = useMemo(() => {
    if (!isOfflineMode) return playlists;
    return playlists.map(p => ({
      ...p,
      tracks: p.tracks.filter(t => downloadedTracks.includes(t.id))
    })).filter(p => p.tracks.length > 0);
  }, [playlists, isOfflineMode, downloadedTracks]);

  const isLikedFullyDownloaded = likedSongs.length > 0 && likedSongs.every(t => downloadedTracks.includes(t.id));

  return (
    <div className="pt-6 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen pb-[150px]">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Library</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleOfflineMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-colors text-sm ${isOfflineMode ? 'bg-primary text-black' : 'bg-white/10 hover:bg-white/20'}`}
          >
            <WifiOff size={18} /> {isOfflineMode ? 'Offline Filter ON' : 'Offline Filter OFF'}
          </button>
          <button 
            onClick={() => setIsImporterOpen(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full font-bold transition-colors text-sm"
          >
            <Plus size={18} /> Import Spotify Playlist
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {/* Pinned Liked Songs Card */}
        <div 
          className="col-span-2 md:col-span-2 bg-gradient-to-br from-indigo-700 to-purple-800 p-6 rounded-md hover:scale-[1.02] transition-transform cursor-pointer group relative flex flex-col justify-end min-h-[240px]"
          onClick={handlePlayLiked}
        >
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
          
          <div className="absolute top-4 right-4 z-20">
             {isLikedFullyDownloaded ? (
                <CheckCircle2 className="text-primary" size={24} />
             ) : (
                <button onClick={handleDownloadLiked} className="p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors">
                   <Download size={20} className="text-white" />
                </button>
             )}
          </div>

          <div className="z-10 mt-auto">
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">Liked Songs <Heart className="fill-white" size={24} /></h2>
            <p className="text-white/80 font-medium">{displayLikedSongs.length} {isOfflineMode ? 'downloaded' : 'liked'} tracks</p>
          </div>
          
          <div className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full flex items-center justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-2xl z-20">
            <svg role="img" height="28" width="28" viewBox="0 0 24 24" fill="black">
              <path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path>
            </svg>
          </div>
        </div>

        {/* Saved Playlists hydrated with 2x2 Covers */}
        {displayPlaylists.map(playlist => {
          const isFullyDownloaded = playlist.tracks.length > 0 && playlist.tracks.every(t => downloadedTracks.includes(t.id));
          return (
            <div 
              key={playlist.id} 
              className="bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition-colors cursor-pointer group flex flex-col min-h-[240px] border border-transparent hover:border-[#333] relative"
              onClick={() => handlePlayPlaylist(playlist)}
            >
              <div className="w-full aspect-square mb-4 relative shadow-lg group-hover:shadow-xl transition-shadow rounded-md overflow-hidden">
                 <PlaylistCover tracks={playlist.tracks} fallbackImage="https://via.placeholder.com/500/121212/ffffff?text=Music" />
                 
                 <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isFullyDownloaded ? (
                       <div className="p-1.5 bg-black/60 rounded-full"><CheckCircle2 className="text-primary" size={16} /></div>
                    ) : (
                       <button onClick={(e) => handleDownloadPlaylist(e, playlist)} className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-colors text-white">
                          <Download size={16} />
                       </button>
                    )}
                 </div>

                 <div className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl z-20">
                    <svg role="img" height="24" width="24" viewBox="0 0 24 24" fill="black">
                      <path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path>
                    </svg>
                 </div>
              </div>
              <h3 className="font-bold text-white text-base truncate mb-1">{playlist.name}</h3>
              <p className="text-sm text-grayText truncate">{playlist.tracks.length} tracks</p>
            </div>
          );
        })}
      </div>

      {/* Crash-Proof Importer Modal */}
      <PlaylistImporter isOpen={isImporterOpen} onClose={() => setIsImporterOpen(false)} />
    </div>
  );
}
