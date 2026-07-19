import { Navigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

/**
 * AppBootstrapper: The deterministic Gatekeeper component.
 * It strictly evaluates state to determine routing boundaries.
 */
export default function AppBootstrapper({ children }) {
  const languages = useAppStore(state => state.userPreferences.languages);

  // Deterministic state check: If no preferences are set, force onboarding.
  if (!languages || languages.length === 0) {
    // Navigate to /onboarding and replace the history stack to prevent back-button bypass
    return <Navigate to="/onboarding" replace />;
  }

  // Valid preferences exist, render the protected children (MainLayout)
  return children;
}
