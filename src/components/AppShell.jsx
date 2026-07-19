import { useAppStore } from '../store/useAppStore';
import LanguagePicker from './LanguagePicker';
import MainLayout from '../layouts/MainLayout';

/**
 * AppShell: The Strict Gatekeeper
 * Completely lockouts out routing by structurally unmounting the layout
 * if the user has not completed onboarding.
 */
export default function AppShell() {
  const languages = useAppStore(state => state.userPreferences.languages);

  if (!languages || languages.length === 0) {
    return <LanguagePicker />;
  }

  // If preferences exist, render the main layout shell which contains the <Outlet />
  return <MainLayout />;
}
