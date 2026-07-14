import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, LogOut, User, LayoutDashboard, History as HistoryIcon, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const navItem = "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 font-mono text-xs uppercase tracking-widest text-cyan-600 hover:text-cyan-300";
  const activeNavItem = "bg-cyan-900/20 text-cyan-300 shadow-[inset_0_1px_1px_rgba(6,182,212,0.2)] border border-cyan-500/30";

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="glass-panel sticky top-4 mx-4 md:mx-auto md:w-[95%] z-50 rounded-2xl mb-6 text-white neon-border"
    >
      <div className="container mx-auto px-6 py-4 flex justify-between items-center relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxwYXRoIGQ9Ik0wIDIwaDIwVjBIMHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSg2LCAxODIsIDIxMiwgMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] opacity-20 pointer-events-none rounded-2xl"></div>
        <Link to="/" className="flex items-center gap-3 text-2xl font-black tracking-widest uppercase hover:scale-105 transition-transform z-10 group">
          <div className="bg-[#020408] p-2 rounded-xl shadow-inner border border-cyan-900/60 group-hover:border-cyan-500/50 transition-colors">
            <Cpu className="text-cyan-500" size={28} />
          </div>
          <span className="text-white drop-shadow-md neon-text">Pneumo<span className="text-cyan-500">Scan</span></span>
        </Link>
        <div className="flex items-center gap-2 z-10">
          {token ? (
            <>
              <div className="flex items-center gap-2 mr-4 bg-[#020408]/80 px-4 py-2 rounded-xl border border-cyan-900/30 shadow-inner">
                <User size={16} className="text-cyan-700" />
                <span className="text-cyan-300 font-mono text-xs uppercase tracking-widest drop-shadow-sm">{username}</span>
              </div>
              <Link to="/dashboard" className={`${navItem} ${location.pathname === '/dashboard' ? activeNavItem : 'hover:bg-cyan-900/10'}`}>
                <LayoutDashboard size={16} />
                HUD
              </Link>
              <Link to="/history" className={`${navItem} ${location.pathname === '/history' ? activeNavItem : 'hover:bg-cyan-900/10'}`}>
                <HistoryIcon size={16} />
                Logs
              </Link>
              <button 
                onClick={handleLogout} 
                className="ml-2 flex items-center gap-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 hover:text-red-400 font-mono text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-md border border-red-500/30 hover:border-red-500/60"
              >
                <LogOut size={16} />
                Disconnect
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={`${navItem} hover:bg-cyan-900/10`}>Authenticate</Link>
              <Link to="/register" className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-2 rounded-xl font-black font-mono text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:-translate-y-0.5">
                Initialize
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
