import React from 'react';
import { Home, Search, Library, Settings } from 'lucide-react';

export default function MobileNav({ view, setView }) {
  const tabs = [
    { id: 'home',     label: 'Home',     Icon: Home },
    { id: 'search',   label: 'Search',   Icon: Search },
    { id: 'library',  label: 'Library',  Icon: Library },
    { id: 'settings', label: 'Settings', Icon: Settings },
  ];

  return (
    <nav className="mobile-bottom-nav" id="mobile-nav">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          id={`mobile-nav-${id}`}
          className={`mobile-nav-item ${view === id ? 'active' : ''}`}
          onClick={() => setView(id)}
        >
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
