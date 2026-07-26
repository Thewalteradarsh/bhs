import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  "English", "Hindi", "Malayalam", "Tamil", "Telugu", "Kannada", "Punjabi", "Bengali"
];

export default function OnboardingView({ onComplete }) {
  const [selectedLangs, setSelectedLangs] = useState(new Set());

  const toggleLang = (lang) => {
    const newSet = new Set(selectedLangs);
    if (newSet.has(lang)) newSet.delete(lang);
    else newSet.add(lang);
    setSelectedLangs(newSet);
  };

  const handleDone = () => {
    if (selectedLangs.size === 0) return;
    onComplete({ languages: Array.from(selectedLangs) });
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-header">
        <h1 className="onboarding-title">What do you listen to?</h1>
        <p className="onboarding-subtitle">Select the languages you want to hear.</p>
      </div>

      <div className="onboarding-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {SUPPORTED_LANGUAGES.map(lang => {
          const isSelected = selectedLangs.has(lang);
          return (
            <div 
              key={lang} 
              className={`lang-bubble ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleLang(lang)}
              style={{
                background: isSelected ? 'var(--accent-primary, #1ed760)' : 'var(--bg-card, #1a1a1a)',
                color: isSelected ? '#fff' : 'var(--text-primary, #fff)',
                padding: '16px 20px',
                borderRadius: '12px',
                textAlign: 'center',
                cursor: 'pointer',
                fontWeight: 'bold',
                border: isSelected ? '2px solid var(--accent-primary, #1ed760)' : '2px solid transparent',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {lang}
            </div>
          );
        })}
      </div>

      <div className="onboarding-footer">
        <button 
          className={`onboarding-btn ${selectedLangs.size > 0 ? 'ready' : ''}`}
          onClick={handleDone}
          disabled={selectedLangs.size === 0}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {selectedLangs.size === 0 ? 'Pick at least one' : 'Start Listening'} 
          {selectedLangs.size > 0 && <ArrowRight size={18} style={{marginLeft: 8}}/>}
        </button>
      </div>
    </div>
  );
}
