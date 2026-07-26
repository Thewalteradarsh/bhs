import React, { useEffect, useState } from 'react';

/**
 * InstallPrompt – shows a polished bottom-sheet banner prompting PWA install.
 * Once installed and launched from the home screen, the browser URL bar is
 * completely hidden (standalone mode) — feels exactly like a native app.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible]               = useState(false);
  const [isIos, setIsIos]                   = useState(false);
  const [installed, setInstalled]           = useState(false);

  useEffect(() => {
    // Already running as installed PWA — never show the banner
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Don't nag again this session
    if (sessionStorage.getItem('install-dismissed')) return;

    // iOS Safari: no beforeinstallprompt, give manual instructions
    const isIosSafari =
      /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    if (isIosSafari) {
      setIsIos(true);
      setTimeout(() => setVisible(true), 4000);
      return;
    }

    // Android/Chrome: listen for the native install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setVisible(true), 4000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If the user installs via the OS dialog, auto-hide banner
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setVisible(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('install-dismissed', '1');
  };

  if (!visible || installed) return null;

  return (
    <div className="install-banner" role="dialog" aria-label="Install Hear app">
      <div className="install-banner__icon">
        <img src="/icon-192.png" alt="Hear" width={40} height={40} />
      </div>
      <div className="install-banner__text">
        <strong>Install Hear</strong>
        <span>
          {isIos
            ? 'Tap Share → "Add to Home Screen" for a full-screen app experience'
            : 'Add to your home screen — no browser bar, just the music'}
        </span>
      </div>
      {!isIos && (
        <button className="install-banner__btn" onClick={handleInstall} id="pwa-install-btn">
          Install
        </button>
      )}
      <button className="install-banner__close" onClick={handleDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
