import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, Cpu } from 'lucide-react';

import API_BASE from '../utils/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/login`, { username, password });
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('username', res.data.username);
      localStorage.setItem('role', res.data.role || 'user');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication sequence failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-center flex-grow"
    >
      <div className="glass-panel-dark p-10 rounded-3xl w-[400px] relative overflow-hidden group neon-border">
        {/* Tech Grid Background */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxwYXRoIGQ9Ik0wIDIwaDIwVjBIMHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSg2LCAxODIsIDIxMiwgMC4wMykiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] opacity-50 pointer-events-none"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500 rounded-full mix-blend-screen filter blur-[60px] opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#06b6d4] rounded-full mix-blend-screen filter blur-[60px] opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            <div className="bg-[#020408] p-4 rounded-2xl shadow-inner border border-cyan-900/60">
              <Cpu className="text-cyan-500 w-10 h-10 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-2">Sign In</h2>
          <p className="text-center text-cyan-500/80 mb-8 text-sm">Sign in to your PneumoScan account</p>
          
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-900/40 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl text-sm mb-6 text-center font-medium">
              {error}
            </motion.div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-cyan-600 h-5 w-5" />
                </div>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e=>setUsername(e.target.value)} 
                  required 
                  placeholder="Username"
                  className="w-full pl-10 pr-3 py-3 bg-black/60 border border-cyan-900/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all shadow-inner" 
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-cyan-600 h-5 w-5" />
                </div>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e=>setPassword(e.target.value)} 
                  required 
                  placeholder="Password"
                  className="w-full pl-10 pr-3 py-3 bg-black/60 border border-cyan-900/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all shadow-inner" 
                />
              </div>
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm py-3 rounded-xl shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </motion.button>
          </form>
          <p className="mt-8 text-center text-gray-400 text-sm">
            Don't have an account? <Link to="/register" className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors">Sign Up</Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
