import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { History as HistoryIcon, Clock, Activity, ShieldAlert, CheckCircle, X, Shield, Eye, FileText, User } from 'lucide-react';
import API_BASE from '../utils/api';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const modalCanvasRef = useRef(null);

  const currentUserRole = localStorage.getItem('role') || 'user';
  const currentUsername = localStorage.getItem('username') || 'User';

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE}/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setHistory(res.data);
      } catch {
        setError('Failed to fetch history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Draw Grad-CAM heatmap when modal opens
  useEffect(() => {
    if (!selectedRecord || !selectedRecord.grad_cam_coordinates || !modalCanvasRef.current) return;

    const canvas = modalCanvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 224;
    canvas.height = 224;

    const baseImg = new Image();
    baseImg.src = selectedRecord.image_url;
    baseImg.onload = () => {
      ctx.drawImage(baseImg, 0, 0, 224, 224);
      const imgData = ctx.getImageData(0, 0, 224, 224);
      const data = imgData.data;
      const coords = selectedRecord.grad_cam_coordinates;

      for (let y = 0; y < 224; y++) {
        for (let x = 0; x < 224; x++) {
          const val = coords[y] ? coords[y][x] : 0;
          if (val > 0.15) {
            const idx = (y * 224 + x) * 4;
            const norm = Math.min(1, Math.max(0, (val - 0.15) / 0.85));

            let r = 0, g = 0, b = 0;
            if (norm < 0.25) {
              r = 0; g = Math.floor(255 * (norm / 0.25)); b = 255;
            } else if (norm < 0.5) {
              r = 0; g = 255; b = Math.floor(255 * (1 - (norm - 0.25) / 0.25));
            } else if (norm < 0.75) {
              r = Math.floor(255 * ((norm - 0.5) / 0.25)); g = 255; b = 0;
            } else {
              r = 255; g = Math.floor(255 * (1 - (norm - 0.75) / 0.25)); b = 0;
            }

            const alpha = 0.6 + norm * 0.35;
            data[idx] = Math.floor(data[idx] * (1 - alpha) + r * alpha);
            data[idx + 1] = Math.floor(data[idx + 1] * (1 - alpha) + g * alpha);
            data[idx + 2] = Math.floor(data[idx + 2] * (1 - alpha) + b * alpha);
            data[idx + 3] = 255;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    };
  }, [selectedRecord]);

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
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <Activity className="animate-spin text-cyan-500" size={40} />
      </div>
    );
  }

  const isAdmin = currentUserRole === 'admin';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="container mx-auto p-4 md:p-8 max-w-6xl"
    >
      <div className="glass-panel-dark rounded-3xl p-6 md:p-8 relative overflow-hidden">
        {/* Header with Admin Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10 border-b border-cyan-900/40 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-950/80 border border-cyan-800/50 p-2.5 rounded-2xl text-cyan-400">
              <HistoryIcon size={28} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">Diagnostic History</h2>
              <p className="text-gray-400 text-xs">Click any scan record to view the full clinical report and Grad-CAM map</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {isAdmin ? (
              <div className="flex items-center gap-2 bg-purple-950/60 border border-purple-500/40 px-3.5 py-1.5 rounded-xl text-purple-300 text-xs font-mono">
                <Shield size={14} className="text-purple-400" />
                <span className="font-bold">ADMIN AUDIT VIEW</span>
                <span className="text-[10px] bg-purple-500/20 px-1.5 py-0.5 rounded text-purple-200">All Users</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-cyan-950/60 border border-cyan-500/30 px-3.5 py-1.5 rounded-xl text-cyan-300 text-xs font-mono">
                <User size={14} className="text-cyan-400" />
                <span>Clinician: <strong className="text-white">{currentUsername}</strong></span>
              </div>
            )}
          </div>
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
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 shadow-inner">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5 backdrop-blur-md">
                <tr>
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Date & Time</th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Preview</th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Image Name</th>
                  {isAdmin && (
                    <th className="py-4 px-6 text-left text-xs font-bold text-purple-300 uppercase tracking-wider">Uploader</th>
                  )}
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Diagnosis</th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Confidence</th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Severity</th>
                  <th className="py-4 px-6 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((record) => (
                  <motion.tr 
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                    key={record.id} 
                    onClick={() => setSelectedRecord(record)}
                    className="cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-400 flex items-center gap-2">
                      <Clock size={14} className="text-gray-500" />
                      {new Date(record.timestamp).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {record.image_url ? (
                        <img 
                          src={record.image_url} 
                          alt="Thumbnail" 
                          className="w-12 h-12 object-contain rounded-lg border border-cyan-500/40 bg-black/60 shadow-sm group-hover:border-cyan-400"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-gray-500 font-mono">
                          N/A
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-xs font-mono text-cyan-300 max-w-[160px] truncate">
                      {record.image_name || 'X-Ray Scan'}
                    </td>
                    {isAdmin && (
                      <td className="py-4 px-6 whitespace-nowrap text-xs font-mono">
                        <span className="px-2 py-1 rounded bg-purple-950/40 border border-purple-500/30 text-purple-200">
                          {record.uploader || 'User'}
                        </span>
                      </td>
                    )}
                    <td className="py-4 px-6 whitespace-nowrap text-sm font-bold">
                      <div className={`flex items-center gap-2 ${record.prediction === 'Pneumonia' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {record.prediction === 'Pneumonia' ? <ShieldAlert size={16} /> : <CheckCircle size={16} />}
                        {record.prediction}
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-sm font-bold text-gray-200 font-mono">
                      {(record.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getSeverityBadge(record.severity)}`}>
                        {record.severity}
                      </span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-center">
                      <button className="px-3 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-1.5 mx-auto transition-colors">
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Result Modal (Shows exactly what was visible during the initial scan) */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel-dark rounded-3xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-cyan-500/40 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-cyan-900/40 pb-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="text-cyan-400" size={20} />
                    Complete Diagnostic Record #{selectedRecord.id}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    Uploaded: {new Date(selectedRecord.timestamp).toLocaleString()} | File: {selectedRecord.image_name}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Side-by-Side Images (Raw vs Grad-CAM) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-black/60 p-3 rounded-2xl border border-cyan-900/40 flex flex-col items-center">
                  <span className="text-xs font-mono text-cyan-400 mb-2 self-start">Input Radiograph</span>
                  <div className="w-full h-56 flex items-center justify-center">
                    <img 
                      src={selectedRecord.image_url} 
                      alt="Raw X-Ray" 
                      className="max-w-full max-h-56 object-contain rounded-lg"
                    />
                  </div>
                </div>

                <div className="bg-black/60 p-3 rounded-2xl border border-red-900/40 flex flex-col items-center">
                  <span className="text-xs font-mono text-red-400 mb-2 self-start flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Grad-CAM Infection Map
                  </span>
                  <div className="w-full h-56 flex items-center justify-center">
                    {selectedRecord.grad_cam_coordinates ? (
                      <canvas ref={modalCanvasRef} className="max-w-full max-h-56 object-contain rounded-lg shadow-lg border border-red-500/20" />
                    ) : (
                      <img 
                        src={selectedRecord.image_url} 
                        alt="Scan" 
                        className="max-w-full max-h-56 object-contain rounded-lg opacity-80"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Diagnosis Badges */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-black/40 p-3 rounded-xl border border-cyan-900/40">
                  <div className="text-[10px] text-gray-400 uppercase font-mono">Prediction</div>
                  <div className={`text-base font-bold ${selectedRecord.prediction === 'Pneumonia' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {selectedRecord.prediction}
                  </div>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-cyan-900/40">
                  <div className="text-[10px] text-gray-400 uppercase font-mono">Confidence</div>
                  <div className="text-base font-bold text-white font-mono">
                    {(selectedRecord.confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-cyan-900/40">
                  <div className="text-[10px] text-gray-400 uppercase font-mono">Severity</div>
                  <div className="text-base font-bold text-cyan-300">
                    {selectedRecord.severity}
                  </div>
                </div>
              </div>

              {/* Clinical Report & Recommendation */}
              <div className="space-y-4">
                <div className="bg-cyan-950/20 border border-cyan-900/50 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1 font-mono">Clinical Summary</h4>
                  <p className="text-sm text-gray-300 leading-relaxed font-sans">
                    {selectedRecord.summary}
                  </p>
                </div>

                <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1 font-mono">Recommendation</h4>
                  <p className="text-sm text-red-200 leading-relaxed font-sans">
                    {selectedRecord.suggestion}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Close Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
