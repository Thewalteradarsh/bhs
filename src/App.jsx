import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import './services/AudioEngine'; // Initialize the Singleton AudioEngine

// Phase 6: Code-Splitting Views for instant AppShell rendering
const DashboardView = lazy(() => import('./views/DashboardView'));
const SearchView = lazy(() => import('./views/SearchView'));
const LibraryView = lazy(() => import('./views/LibraryView'));

// Reusable Suspense Fallback
const LoadingFallback = () => (
  <div className="flex h-full min-h-[50vh] items-center justify-center">
    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={
            <Suspense fallback={<LoadingFallback />}>
              <DashboardView />
            </Suspense>
          } />
          <Route path="search" element={
            <Suspense fallback={<LoadingFallback />}>
              <SearchView />
            </Suspense>
          } />
          <Route path="library" element={
            <Suspense fallback={<LoadingFallback />}>
              <LibraryView />
            </Suspense>
          } />
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
