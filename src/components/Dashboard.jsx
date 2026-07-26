import React from 'react';
import SongCard from './SongCard';
import SeeAllView from './SeeAllView';
import { useDashboardData } from '../hooks/useDashboardData';
import { RefreshCw, AlertCircle } from 'lucide-react';
import usePlayerStore from '../store/usePlayerStore';

function SectionRow({ label, subtitle, songs, isLoading, isError, onRetry, onSeeAll }) {
  if (isError) {
    return (
      <div className="section" style={{ padding: '20px 16px', background: 'var(--bg-card)', borderRadius: '12px', margin: '0 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={24} color="var(--text-secondary)" />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Failed to load {label}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>We couldn't fetch these tracks right now.</p>
            </div>
          </div>
          {onRetry && (
            <button 
              onClick={onRetry} 
              style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <RefreshCw size={14} /> Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!isLoading && (!Array.isArray(songs) || songs.length === 0)) {
    return (
      <div className="section">
        <h2 className="section-title" style={{ padding: '0 16px' }}>{label}</h2>
        <div style={{ padding: '20px 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
          No tracks found.
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="section-header">
        <div>
          {isLoading ? (
            <div className="skeleton" style={{ width: '150px', height: '20px', borderRadius: '4px' }}></div>
          ) : (
            <>
              <h2 className="section-title">{label}</h2>
              {subtitle && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{subtitle}</p>}
            </>
          )}
        </div>
        {!isLoading && Array.isArray(songs) && songs.length > 0 && onSeeAll && (
          <button className="section-see-all" onClick={() => onSeeAll({ label, songs })}>
            SEE ALL
          </button>
        )}
      </div>
      {isLoading ? (
        <div className="loading-cards">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      ) : (
        <div className="cards-scroll">
          {songs.map((song, i) => (
            song ? <SongCard key={song.id + i} song={song} queue={songs} index={i} /> : null
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ languages, userName }) {
  const { playedHistory } = usePlayerStore();
  const { staticState, aiState, retryStatic } = useDashboardData(languages, playedHistory);
  const [seeAllSection, setSeeAllSection] = React.useState(null);

  if (seeAllSection) {
    return <SeeAllView section={seeAllSection} onClose={() => setSeeAllSection(null)} />;
  }

  return (
    <div className="home-content">
      {userName && <h1 className="greeting text-gradient-premium" style={{ marginBottom: '24px' }}>Welcome back, {userName} ✨</h1>}

      {/* AI Mixes Section */}
      {/* Silently hide if there is an error in aiState */}
      {!aiState.isError && (
        aiState.isLoading ? (
          // Skeletons for AI row
          <div style={{ marginBottom: '32px' }}>
             <SectionRow label="" isLoading={true} />
          </div>
        ) : (
          aiState.data.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              {aiState.data.map((mix, i) => (
                <SectionRow
                  key={`aimix-${i}`}
                  label={`${mix.title} 🔮`}
                  subtitle={mix.subtitle}
                  songs={mix.tracks} // Depending on your Groq schema, check if it maps properly
                  isLoading={false}
                  onSeeAll={setSeeAllSection}
                />
              ))}
            </div>
          )
        )
      )}

      {/* Static Categories Section */}
      {staticState.isLoading ? (
        [1, 2, 3].map(i => <SectionRow key={`static-skeleton-${i}`} label="" isLoading={true} />)
      ) : staticState.isError ? (
        <SectionRow label="trending tracks" isError={true} onRetry={retryStatic} />
      ) : (
        staticState.data.map((row, i) => {
          if (!row) return null;
          return (
            <SectionRow 
              key={row.label || i} 
              label={row.label} 
              songs={row.songs} 
              isLoading={false} 
              onSeeAll={setSeeAllSection} 
            />
          );
        })
      )}
    </div>
  );
}
