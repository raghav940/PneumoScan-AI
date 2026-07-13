import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { History as HistoryIcon, Clock, Activity, ShieldAlert, CheckCircle } from 'lucide-react';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://127.0.0.1:5000/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setHistory(res.data);
      } catch (err) {
        setError('Failed to fetch history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'Normal': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Mild': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'Moderate': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'Severe': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'Critical': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default: return 'bg-white/10 text-gray-400 border-white/20';
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <Activity className="animate-spin text-indigo-500" size={48} />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="container mx-auto p-4 md:p-8 max-w-5xl"
    >
      <div className="glass-panel-dark rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none"></div>
        
        <div className="flex items-center gap-3 mb-8 relative z-10">
          <HistoryIcon className="text-indigo-400 bg-indigo-500/20 border border-indigo-500/30 p-2 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.2)]" size={40} />
          <h2 className="text-3xl font-bold text-white tracking-tight">Analysis Archive</h2>
        </div>
        
        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/30 mb-6 font-medium">
            {error}
          </div>
        )}
        
        {history.length === 0 ? (
          <div className="bg-black/40 border border-white/5 rounded-2xl p-12 text-center shadow-inner">
            <Clock className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-xl font-bold text-gray-400">No records found</p>
            <p className="text-gray-500 mt-2">Historical scan data will appear here.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-inner">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5 backdrop-blur-md">
                <tr>
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Timestamp</th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Prediction</th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Confidence</th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((record) => (
                  <motion.tr 
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    key={record.id} 
                    className="transition-colors"
                  >
                    <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-gray-400 flex items-center gap-2">
                      <Clock size={14} className="text-gray-500" />
                      {new Date(record.timestamp).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-sm font-bold">
                      <div className={`flex items-center gap-2 ${record.prediction === 'Pneumonia' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {record.prediction === 'Pneumonia' ? <ShieldAlert size={16} /> : <CheckCircle size={16} />}
                        {record.prediction}
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-sm font-black text-gray-200">
                      {(record.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getSeverityBadge(record.severity)}`}>
                        {record.severity}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
