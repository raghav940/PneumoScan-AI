import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, LogOut, User, LayoutDashboard, History as HistoryIcon } from 'lucide-react';
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

  const navItem = "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 font-medium text-gray-300 hover:text-white";
  const activeNavItem = "bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-white/5";

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="glass-panel sticky top-4 mx-4 md:mx-auto md:w-[95%] z-50 rounded-2xl mb-6 text-white"
    >
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 text-2xl font-bold tracking-wider hover:scale-105 transition-transform">
          <div className="bg-emerald-500/20 p-2 rounded-xl shadow-inner border border-emerald-500/40">
            <Activity className="text-emerald-400" size={28} />
          </div>
          <span className="drop-shadow-md text-white">PneumoScan<span className="text-emerald-400">AI</span></span>
        </Link>
        <div className="flex items-center gap-2">
          {token ? (
            <>
              <div className="flex items-center gap-2 mr-4 bg-black/40 px-4 py-2 rounded-full border border-white/5 shadow-inner">
                <User size={18} className="text-gray-400" />
                <span className="text-gray-200 font-medium drop-shadow-sm">{username}</span>
              </div>
              <Link to="/dashboard" className={`${navItem} ${location.pathname === '/dashboard' ? activeNavItem : 'hover:bg-white/5'}`}>
                <LayoutDashboard size={18} />
                Dashboard
              </Link>
              <Link to="/history" className={`${navItem} ${location.pathname === '/history' ? activeNavItem : 'hover:bg-white/5'}`}>
                <HistoryIcon size={18} />
                History
              </Link>
              <button 
                onClick={handleLogout} 
                className="ml-2 flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 px-4 py-2 rounded-xl transition-all shadow-md border border-red-500/30"
              >
                <LogOut size={18} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={`${navItem} hover:bg-white/5`}>Login</Link>
              <Link to="/register" className="bg-emerald-500 hover:bg-emerald-400 text-gray-900 px-6 py-2 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] hover:-translate-y-0.5">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
