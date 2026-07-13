import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, User, Lock } from 'lucide-react';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('http://127.0.0.1:5000/register', { username, password });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
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
      <div className="glass-panel-dark p-10 rounded-3xl w-[400px] relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500 rounded-full mix-blend-screen filter blur-[60px] opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-emerald-500 rounded-full mix-blend-screen filter blur-[60px] opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            <div className="bg-indigo-500/20 p-4 rounded-2xl shadow-inner border border-indigo-500/40">
              <UserPlus className="text-indigo-400 w-10 h-10" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-center text-white mb-2 drop-shadow-md">Create Account</h2>
          <p className="text-center text-gray-400 mb-8 font-medium">Join PneumoScan-AI today</p>
          
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm mb-6 shadow-inner text-center">
              {error}
            </motion.div>
          )}
          
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-gray-500 h-5 w-5" />
                </div>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e=>setUsername(e.target.value)} 
                  required 
                  placeholder="Username"
                  className="w-full pl-10 pr-3 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner" 
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-500 h-5 w-5" />
                </div>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e=>setPassword(e.target.value)} 
                  required 
                  placeholder="Password"
                  className="w-full pl-10 pr-3 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner" 
                />
              </div>
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all disabled:opacity-70 disabled:cursor-not-allowed border border-indigo-400"
            >
              {loading ? 'Registering...' : 'Sign Up'}
            </motion.button>
          </form>
          <p className="mt-8 text-center text-gray-400 font-medium">
            Already have an account? <Link to="/login" className="text-indigo-400 font-bold hover:text-indigo-300 drop-shadow-sm transition-colors">Log in</Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
