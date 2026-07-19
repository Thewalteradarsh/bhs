import { NavLink } from 'react-router-dom';
import { Home, Search, Library } from 'lucide-react';

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0a0a] border-t border-[#282828] flex items-center justify-around px-4 z-50">
      <NavItem to="/" icon={<Home size={24} />} label="Home" />
      <NavItem to="/search" icon={<Search size={24} />} label="Search" />
      <NavItem to="/library" icon={<Library size={24} />} label="Library" />
    </nav>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-white' : 'text-grayText hover:text-white'}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}
