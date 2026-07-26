import React from 'react';

export const MOODS = [
  { id: null,        emoji: '🎲', label: 'Auto' },
  { id: 'happy',     emoji: '😊', label: 'Happy' },
  { id: 'sad',       emoji: '😢', label: 'Sad' },
  { id: 'energetic', emoji: '⚡', label: 'Energy' },
  { id: 'chill',     emoji: '😌', label: 'Chill' },
  { id: 'romantic',  emoji: '💕', label: 'Romance' },
  { id: 'workout',   emoji: '💪', label: 'Workout' },
  { id: 'party',     emoji: '🎉', label: 'Party' },
  { id: 'latenight', emoji: '🌙', label: 'Late Night' },
];

export default function MoodSelector({ activeMood, onChange }) {
  return (
    <div className="mood-selector" id="mood-selector" aria-label="Mood filter">
      <div className="mood-scroll">
        {MOODS.map(({ id, emoji, label }) => {
          const isActive = activeMood === id;
          return (
            <button
              key={String(id)}
              id={`mood-${id ?? 'auto'}`}
              className={`mood-chip ${isActive ? 'mood-chip--active' : ''}`}
              onClick={() => onChange(isActive ? null : id)}
              aria-pressed={isActive}
              aria-label={`${label} mood`}
            >
              <span className="mood-emoji">{emoji}</span>
              <span className="mood-label">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
