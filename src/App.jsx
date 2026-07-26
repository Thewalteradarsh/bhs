import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import HomeView from './components/HomeView';
import SearchView from './components/SearchView';
import LibraryView from './components/LibraryView';
import SettingsView from './components/SettingsView';
import AdminDashboard from './components/AdminDashboard';
import Player from './components/Player';
import MiniPlayer from './components/MiniPlayer';
import ExpandedPlayer from './components/ExpandedPlayer';
import MobileNav from './components/MobileNav';
import AudioEngine from './components/AudioEngine';
import usePlayerStore from './store/usePlayerStore';
import { logUserSessionStart } from './lib/analytics';
import DonationModal from './components/DonationModal';
import InstallPrompt from './components/InstallPrompt';
import OnboardingView from './components/OnboardingView';
import { useEffect } from 'react';
import { BackgroundMode } from '@awesome-cordova-plugins/background-mode';
import './index.css';

export default function App() {
  const [view, setView] = useState('home');
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const { currentSong, isDonationModalOpen, setDonationModalOpen } = usePlayerStore();

  useEffect(() => {
    const isComplete = localStorage.getItem('onboardingComplete') === 'true';
    setOnboardingComplete(isComplete);

    logUserSessionStart();

    // Setup history for hardware back button (especially on Android/mobile web)
    window.history.replaceState({ view: 'home' }, '', '');
    
    const handlePopState = (e) => {
      if (e.state) {
        if (e.state.view) setView(e.state.view);
        setPlayerExpanded(!!e.state.playerExpanded);
      } else {
        setView('home');
        setPlayerExpanded(false);
      }
    };
    window.addEventListener('popstate', handlePopState);

    // Enable background execution for audio playback
    const isNative = window.Capacitor?.isNative || window.cordova;
    if (isNative) {
      try {
        BackgroundMode.enable();
        BackgroundMode.on('activate').subscribe(() => {
          BackgroundMode.disableWebViewOptimizations();
          try {
            BackgroundMode.disableBatteryOptimizations();
          } catch (e) {
            console.warn('Battery optimization disable failed:', e);
          }
        });
        BackgroundMode.setDefaults({
          title: 'Hear',
          text: 'Playing music in the background',
          icon: 'icon',
          color: '0d0d0d',
          resume: true,
          hidden: false,
          bigText: false
        });
      } catch (err) {
        console.error('BackgroundMode init error:', err);
      }
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Intercept view changes to push history state
  const handleSetView = (newView) => {
    if (newView === view) return;
    window.history.pushState({ view: newView, playerExpanded: false }, '', '');
    setView(newView);
    setPlayerExpanded(false);
  };

  const handleExpandPlayer = () => {
    window.history.pushState({ view, playerExpanded: true }, '', '');
    setPlayerExpanded(true);
  };

  const handleClosePlayer = () => {
    window.history.back(); // triggers popstate which sets playerExpanded to false
  };

  const handleOnboardingFinish = ({ languages }) => {
    const langsToSave = Array.isArray(languages) && languages.length ? languages : ['English'];
    try {
      const existingSettings = JSON.parse(localStorage.getItem('hear_settings') || '{}');
      existingSettings.primaryLang = langsToSave[0].toLowerCase();
      if (langsToSave.length > 1) {
        existingSettings.secondaryLang = langsToSave[1].toLowerCase();
      }
      localStorage.setItem('hear_settings', JSON.stringify(existingSettings));
      localStorage.setItem('user_preferred_langs', JSON.stringify(langsToSave));
      localStorage.setItem('onboardingComplete', 'true');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
    setOnboardingComplete(true);
  };

  return (
    <>
      <AudioEngine />
      <DonationModal 
        isOpen={isDonationModalOpen} 
        onClose={() => setDonationModalOpen(false)} 
      />
      <InstallPrompt />

      {/* Full-screen expanded player (mobile) */}
      {playerExpanded && (
        <ExpandedPlayer onClose={handleClosePlayer} />
      )}

      {!onboardingComplete ? (
        <div style={{ width: '100vw', height: '100vh', position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--background)' }}>
          <OnboardingView onComplete={handleOnboardingFinish} />
        </div>
      ) : view === 'admin' ? (
        <AdminDashboard />
      ) : (
        <div className="app-layout">
          {/* Desktop sidebar */}
          <Sidebar view={view} setView={handleSetView} />

          {/* Main scrollable content */}
          <main className="main-content" id="main-scroll">
            {view === 'home'     && <HomeView />}
            {view === 'search'   && <SearchView />}
            {view === 'library'  && <LibraryView />}
            {view === 'settings' && <SettingsView setView={handleSetView} />}
          </main>

        {/* Desktop full player bar */}
        <Player />

        {/* Mobile: mini player + bottom nav */}
        {currentSong && (
          <MiniPlayer onExpand={handleExpandPlayer} />
        )}
        <MobileNav view={view} setView={handleSetView} />
      </div>
      )}
    </>
  );
}
