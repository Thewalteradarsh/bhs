import { NavLink, Outlet } from 'react-router-dom';
import { Home, Search, Library, User, ChevronLeft, ChevronRight } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import MiniPlayer from '../components/MiniPlayer';

export default function MainLayout() {
  return (
    <div className="h-screen flex bg-black text-white overflow-hidden font-sans relative">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 flex flex-col p-2 gap-2 hidden md:flex z-40">
        {/* Top Section */}
        <div className="bg-[#121212] rounded-lg p-5 flex flex-col gap-5">
          <div className="text-3xl font-extrabold tracking-tighter cursor-pointer flex items-center">
            Hear<span className="text-primary">.</span>
          </div>
          <nav className="flex flex-col gap-4">
            <NavItem to="/" icon={<Home size={24} />} label="Home" />
            <NavItem to="/search" icon={<Search size={24} />} label="Search" />
          </nav>
        </div>
        
        {/* Library Section */}
        <div className="bg-[#121212] rounded-lg p-5 flex-1 flex flex-col overflow-hidden">
           <NavLink to="/library" className={({ isActive }) => `flex items-center gap-4 font-bold transition-colors cursor-pointer mb-4 ${isActive ? 'text-white' : 'text-grayText hover:text-white'}`}>
             <Library size={24} />
             <span>Your Library</span>
           </NavLink>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar">
             {/* Placeholder for playlists */}
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#121212] md:rounded-lg md:m-2 md:ml-0 overflow-hidden relative z-0">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 bg-[#121212]/90 sticky top-0 z-20 backdrop-blur-md transition-all duration-300">
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-grayText cursor-not-allowed hidden md:flex">
              <ChevronLeft size={20} />
            </button>
            <button className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-grayText cursor-not-allowed hidden md:flex">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <button className="bg-white text-black font-bold px-4 py-1.5 rounded-full text-sm hover:scale-105 transition-transform">
              Explore Premium
            </button>
            <div className="w-8 h-8 rounded-full bg-[#282828] flex items-center justify-center cursor-pointer hover:bg-[#333]">
              <User size={16} />
            </div>
          </div>
        </header>

        {/* Scrollable Content View - dynamic padding to prevent clipping under players */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-[150px] md:pb-[90px]">
          <Outlet />
        </div>
      </main>

      {/* Strict Collision-Free Render Hierarchy */}
      <MiniPlayer />
      <BottomNav />
    </div>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => `flex items-center gap-4 font-bold transition-colors duration-200 ${
        isActive ? 'text-white' : 'text-grayText hover:text-white'
      }`}
    >
      {({ isActive }) => (
        <>
          <div className={`${isActive ? 'text-white' : 'text-grayText'}`}>
            {icon}
          </div>
          {label}
        </>
      )}
    </NavLink>
  )
}
