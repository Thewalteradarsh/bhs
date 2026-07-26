import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { UserProvider } from './context/UserContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// ── Register service worker for PWA offline support ──────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — app still works, just no offline support
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <UserProvider>
        <App />
      </UserProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
