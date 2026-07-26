import React, { useState, useEffect, useRef } from 'react';
import { Moon, X, Check } from 'lucide-react';
import useSleepTimer, { TIMER_OPTIONS } from '../hooks/useSleepTimer';

// Format seconds into M:SS
function formatRemaining(secs) {
  if (secs === null || secs === undefined) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SleepTimer() {
  const { isActive, mode, remaining, selectedMinutes, startTimer, cancelTimer } = useSleepTimer();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const handleSelect = (minutes) => {
    startTimer(minutes);
    setOpen(false);
  };

  const handleCancel = () => {
    cancelTimer();
    setOpen(false);
  };

  const countdownLabel = formatRemaining(remaining);

  return (
    <div className="sleep-timer-wrapper" ref={menuRef}>
      {/* Trigger button */}
      <button
        id="sleep-timer-btn"
        className={`sleep-timer-trigger ${isActive ? 'sleep-timer-trigger--active' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-label="Sleep Timer"
        title="Sleep Timer"
      >
        <Moon size={18} />
        {isActive && (
          <span className="sleep-timer-badge">
            {mode === 'end_of_track' ? 'â™ª' : countdownLabel}
          </span>
        )}
      </button>

      {/* Dropdown menu */}
      {open && (
        <div className="sleep-timer-menu" role="menu" aria-label="Sleep Timer Options">
          <div className="sleep-timer-menu__header">
            <Moon size={14} />
            Sleep Timer
          </div>

          {TIMER_OPTIONS.map(({ label, minutes }) => {
            const isSelected = isActive && (
              minutes === null
                ? mode === 'end_of_track'
                : selectedMinutes === minutes
            );
            return (
              <button
                key={label}
                className={`sleep-timer-option ${isSelected ? 'sleep-timer-option--active' : ''}`}
                onClick={() => handleSelect(minutes)}
                role="menuitem"
              >
                <span>{label}</span>
                {isSelected && (
                  <span className="sleep-timer-option__check">
                    {mode === 'countdown' && remaining !== null
                      ? <span className="sleep-timer-option__remaining">{countdownLabel}</span>
                      : <Check size={14} />
                    }
                  </span>
                )}
              </button>
            );
          })}

          {/* Cancel â€” only shown when timer is active */}
          {isActive && (
            <>
              <div className="sleep-timer-menu__divider" />
              <button
                className="sleep-timer-option sleep-timer-option--cancel"
                onClick={handleCancel}
                role="menuitem"
              >
                <X size={14} style={{ marginRight: 6 }} />
                Cancel Timer
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
