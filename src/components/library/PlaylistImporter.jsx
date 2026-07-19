import { useState } from 'react';
import { api } from '../../utils/apiClient';
import { useAppStore } from '../../store/useAppStore';
import PlaylistCover from './PlaylistCover';
import { Download, X, CheckCircle, AlertCircle } from 'lucide-react';
import { clearGarbage } from '../../utils/cleanupUtils';

export default function PlaylistImporter({ isOpen, onClose }) {
  const [inputText, setInputText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, failed: 0 });
  const [importedPlaylist, setImportedPlaylist] = useState(null);

  const handleImport = async () => {
    if (!inputText.trim()) return;
    
    const lines = inputText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    setIsImporting(true);
    setProgress({ current: 0, total: lines.length, failed: 0 });
    const resolvedTracks = [];
    let failures = 0;

    // Crash-Proof Iteration Loop
    for (const [index, line] of lines.entries()) {
      try {
        let query = line;
        let artistHint = '';
        if (line.includes('-')) {
          const parts = line.split('-');
          query = parts[0].trim();
          artistHint = parts[1].trim().toLowerCase();
        }

        // Fetch top 10 results to broaden precision matching pool
        const res = await api.get('/search/songs', { 
           params: { query: line, limit: 10 } 
        });
        
        const results = res.data?.results || res.results || res.data || [];
        
        // 1. Negative Keyword Filter (Rejects bad audio)
        const negativePattern = /karaoke|cover|sped up|tribute|lofi|zzang|originally performed|instrumental/i;
        const filteredResults = results.filter(r => {
           const text = `${r.title || r.name} ${r.primaryArtists || r.artist}`.toLowerCase();
           return !negativePattern.test(text);
        });

        // 2. Precision Artist Validation Check
        let finalTrack = filteredResults[0]; 
        if (artistHint && filteredResults.length > 0) {
           const exactMatch = filteredResults.find(r => {
             const artists = (r.primaryArtists || r.artist || '').toLowerCase();
             // Safe optional chaining string match
             return artists.includes(artistHint) || artistHint.includes(artists);
           });
           if (exactMatch) finalTrack = exactMatch;
        }

        if (finalTrack) {
           resolvedTracks.push(finalTrack);
        } else {
           failures++;
        }
      } catch (err) {
        // Log individual track failure, but CONTINUE loop. Never crash.
        console.error(`[Importer] Failed on track "${line}":`, err);
        failures++;
      }
      
      // Update UI Progress dynamically
      setProgress({ current: index + 1, total: lines.length, failed: failures });
    }

    if (resolvedTracks.length > 0) {
       const newPlaylist = {
         id: `imported_${Date.now()}`,
         name: "Imported Spotify Mix",
         tracks: resolvedTracks
       };
       useAppStore.getState().savePlaylist(newPlaylist);
       setImportedPlaylist(newPlaylist);
    }
    
    // Phase 6: Memory Leak Prevention
    clearGarbage();
    setIsImporting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#282828] w-full max-w-lg rounded-xl shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-grayText hover:text-white" disabled={isImporting}>
           <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Download className="text-primary"/> Import from Spotify</h2>
        <p className="text-grayText text-sm mb-6">
          To import a Spotify playlist, open Spotify on your desktop, select all tracks (Ctrl+A / Cmd+A), copy them (Ctrl+C / Cmd+C), and paste them below. We will use precision matching to automatically find and link the high-quality audio streams.
        </p>

        {!isImporting && !importedPlaylist && (
          <>
            <textarea 
              className="w-full h-48 bg-[#1a1a1a] border border-[#333] rounded-md p-3 text-white text-sm custom-scrollbar mb-4 focus:border-primary focus:outline-none placeholder-grayText/50"
              placeholder={`Blinding Lights - The Weeknd\nShape of You - Ed Sheeran\n...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button 
              onClick={handleImport}
              className="w-full py-3 rounded-full bg-primary text-black font-bold hover:scale-[1.02] transition-transform"
            >
              Start Hardened Import
            </button>
          </>
        )}

        {isImporting && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
             <div className="w-12 h-12 rounded-full border-4 border-[#282828] border-t-primary animate-spin"></div>
             <p className="font-bold text-lg">Matching track {progress.current} of {progress.total}...</p>
             <p className="text-sm text-grayText font-medium">({progress.failed} failed/skipped via negative filters)</p>
             <div className="w-full h-2 bg-[#282828] rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-primary transition-all duration-200" style={{ width: `${(progress.current / progress.total) * 100}%`}}></div>
             </div>
          </div>
        )}

        {!isImporting && importedPlaylist && (
          <div className="flex flex-col items-center py-6 gap-4 text-center animate-in zoom-in duration-300">
             <CheckCircle size={56} className="text-green-500" />
             <h3 className="text-2xl font-bold">Import Successful!</h3>
             <p className="text-grayText font-medium">{importedPlaylist.tracks.length} tracks matched and saved.</p>
             
             {progress.failed > 0 && (
                <p className="text-sm text-yellow-500 flex items-center justify-center gap-1 bg-yellow-500/10 py-2 px-4 rounded-md w-full"><AlertCircle size={14}/> {progress.failed} tracks were skipped due to missing streams or karaoke matches.</p>
             )}
             
             <div className="w-40 h-40 mt-4 mb-2">
                <PlaylistCover tracks={importedPlaylist.tracks} />
             </div>

             <button 
              onClick={onClose}
              className="mt-4 w-full py-3 rounded-full bg-[#282828] text-white font-bold hover:bg-[#333] transition-colors"
             >
              Close & View Library
             </button>
          </div>
        )}

      </div>
    </div>
  );
}
