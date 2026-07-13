import React, { useState, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileImage, Activity, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  
  const originalImgRef = useRef(null);
  const canvasRef = useRef(null);
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewURL(URL.createObjectURL(selectedFile));
      setResult(null);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://127.0.0.1:5000/predict', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setResult(res.data);
      if (res.data.prediction === 'Pneumonia' && res.data.grad_cam_coordinates) {
        setTimeout(() => renderHeatmap(res.data.grad_cam_coordinates), 50);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const renderHeatmap = (heatmapData) => {
    const canvas = canvasRef.current;
    const origImg = originalImgRef.current;
    if (!canvas || !origImg) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = 224;
    canvas.height = 224;
    
    ctx.drawImage(origImg, 0, 0, 224, 224);
    
    const imgData = ctx.getImageData(0, 0, 224, 224);
    const data = imgData.data;
    
    for (let y = 0; y < 224; y++) {
      for (let x = 0; x < 224; x++) {
        const intensity = heatmapData[y][x]; 
        const idx = (y * 224 + x) * 4;
        
        if (intensity > 0.2) {
          data[idx] = 255; 
          data[idx+1] = Math.max(0, 255 * (1 - intensity * 2)); 
          data[idx+2] = 0; 
          data[idx+3] = Math.min(255, data[idx+3] + intensity * 150); 
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Normal': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
      case 'Mild': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]';
      case 'Moderate': return 'text-orange-400 bg-orange-500/10 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]';
      case 'Severe': return 'text-red-500 bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
      case 'Critical': return 'text-purple-400 bg-purple-500/10 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]';
      default: return 'text-gray-400 bg-white/5 border-white/10';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="container mx-auto p-4 md:p-8 max-w-5xl"
    >
      <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none"></div>

        <div className="flex items-center gap-3 mb-8 relative z-10">
          <Activity className="text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 p-2 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)]" size={40} />
          <h2 className="text-3xl font-bold text-white tracking-tight">Diagnostic Analysis</h2>
        </div>
        
        <div className="grid md:grid-cols-5 gap-8 relative z-10">
          <div className="md:col-span-2 space-y-6">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="border-2 border-dashed border-white/20 bg-black/40 hover:bg-black/60 hover:border-emerald-500/50 rounded-2xl p-10 text-center transition-all cursor-pointer shadow-inner relative group" 
              onClick={() => document.getElementById('fileUpload').click()}
            >
              <div className="absolute inset-0 bg-emerald-500/5 scale-0 group-hover:scale-100 transition-transform rounded-2xl duration-300"></div>
              <UploadCloud className="mx-auto text-emerald-400 mb-4 transition-transform group-hover:-translate-y-2" size={48} />
              <p className="text-gray-200 font-medium mb-2">Drag and drop X-ray image</p>
              <p className="text-sm text-gray-500">or click to browse</p>
              <input id="fileUpload" type="file" accept="image/jpeg, image/png" className="hidden" onChange={handleFileChange} />
              
              {file && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  <FileImage size={16} className="text-emerald-400" />
                  <span className="text-emerald-200 font-semibold truncate max-w-[150px]">{file.name}</span>
                </div>
              )}
            </motion.div>
            
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/30">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{error}</span>
              </motion.div>
            )}
            
            <motion.button 
              whileHover={!file || loading ? {} : { scale: 1.03, boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.4)" }}
              whileTap={!file || loading ? {} : { scale: 0.97 }}
              onClick={handleUpload} 
              disabled={!file || loading} 
              className={`w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg ${
                !file || loading 
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-gray-900 border border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              }`}
            >
              {loading ? (
                <>
                  <Activity className="animate-spin" size={20} />
                  Analyzing Sequence...
                </>
              ) : (
                'Run AI Analysis'
              )}
            </motion.button>
          </div>

          <div className="md:col-span-3">
            <AnimatePresence mode="wait">
              {previewURL ? (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-black/40 p-6 rounded-2xl border border-white/10 shadow-inner"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <FileImage size={16} /> Original Scan
                      </h3>
                      <div className="bg-black/80 p-2 rounded-xl border border-white/5 shadow-inner">
                        <img ref={originalImgRef} src={previewURL} alt="Original" className="w-full h-auto rounded-lg filter grayscale" style={{ aspectRatio: '1/1', objectFit: 'cover' }} />
                      </div>
                    </div>
                    
                    {result && result.prediction === 'Pneumonia' && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                          <ShieldAlert size={16} className="text-red-500" /> Attention Heatmap
                        </h3>
                        <div className="bg-black/80 p-2 rounded-xl border border-white/5 shadow-inner relative">
                          <canvas ref={canvasRef} className="w-full h-auto rounded-lg absolute inset-2 mix-blend-screen" style={{ width: 'calc(100% - 16px)' }}></canvas>
                          <img src={previewURL} alt="Base" className="w-full h-auto rounded-lg filter grayscale opacity-40" style={{ aspectRatio: '1/1' }} />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {result && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 pt-6 border-t border-white/10"
                    >
                      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        Diagnostic Results
                        <div className="h-px bg-white/10 flex-grow ml-4"></div>
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-inner">
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Prediction</p>
                          <div className={`text-xl font-black flex items-center gap-2 ${result.prediction === 'Pneumonia' ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'}`}>
                            {result.prediction === 'Pneumonia' ? <ShieldAlert size={20} /> : <CheckCircle size={20} />}
                            {result.prediction}
                          </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-inner">
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Confidence</p>
                          <div className="text-xl font-black text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                            {(result.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className={`col-span-2 p-4 rounded-xl flex items-center justify-between border ${getSeverityColor(result.severity)}`}>
                          <div>
                            <p className="text-xs font-bold uppercase mb-1 opacity-70">Severity Grading</p>
                            <div className="text-xl font-black">{result.severity}</div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold uppercase mb-1 opacity-70">Inference Time</p>
                            <div className="text-lg font-bold font-mono">{result.inference_ms}ms</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-white/10 rounded-2xl bg-black/20"
                >
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full"></div>
                    <Activity className="text-gray-600 relative z-10" size={64} />
                  </div>
                  <p className="text-xl font-bold text-gray-400">System Standby</p>
                  <p className="text-gray-500 mt-2 max-w-sm">Upload a chest X-ray image to initialize the diagnostic sequence.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
