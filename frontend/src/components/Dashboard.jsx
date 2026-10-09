import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileImage, Activity, AlertCircle, CheckCircle, ShieldAlert, Cpu, GitCompare, Box } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import LungModel from './LungModel';
import DiagnosisBadge from './DiagnosisBadge';
import { playProcessingHum, playSuccessPing } from '../utils/audio';
import API_BASE from '../utils/api';

export default function Dashboard() {
  const [compareMode, setCompareMode] = useState(false);
  const [humStopFn, setHumStopFn] = useState(null);

  // Scan 1 State
  const [file1, setFile1] = useState(null);
  const [previewURL1, setPreviewURL1] = useState(null);
  const [loading1, setLoading1] = useState(false);
  const [result1, setResult1] = useState(null);
  const [error1, setError1] = useState('');
  const originalImgRef1 = useRef(null);
  const canvasRef1 = useRef(null);

  // Scan 2 State (For Comparison)
  const [file2, setFile2] = useState(null);
  const [previewURL2, setPreviewURL2] = useState(null);
  const [loading2, setLoading2] = useState(false);
  const [result2, setResult2] = useState(null);
  const [error2, setError2] = useState('');
  const originalImgRef2 = useRef(null);
  const canvasRef2 = useRef(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (humStopFn) humStopFn();
    };
  }, [humStopFn]);

  const handleFileChange = (e, scanIndex) => {
    const selectedFile = e.target.files ? e.target.files[0] : (e.dataTransfer ? e.dataTransfer.files[0] : null);
    if (!selectedFile) return;

    if (scanIndex === 1) {
      setFile1(selectedFile);
      setPreviewURL1(URL.createObjectURL(selectedFile));
      setResult1(null);
      setError1('');
    } else {
      setFile2(selectedFile);
      setPreviewURL2(URL.createObjectURL(selectedFile));
      setResult2(null);
      setError2('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, scanIndex) => {
    e.preventDefault();
    handleFileChange(e, scanIndex);
  };

  const handleUpload = async (scanIndex) => {
    const file = scanIndex === 1 ? file1 : file2;
    if (!file) return;
    
    const setLoading = scanIndex === 1 ? setLoading1 : setLoading2;
    const setError = scanIndex === 1 ? setError1 : setError2;
    const setResult = scanIndex === 1 ? setResult1 : setResult2;
    
    setLoading(true);
    setError('');
    
    // Start Processing Audio
    const stopHum = playProcessingHum();
    setHumStopFn(() => stopHum);

    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE}/predict`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setResult(res.data);
      playSuccessPing(); // Play success sound
      if (res.data.prediction === 'Pneumonia' && res.data.grad_cam_coordinates) {
        setTimeout(() => renderHeatmap(res.data.grad_cam_coordinates, scanIndex), 50);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Ensure sequence bridge is active.');
    } finally {
      setLoading(false);
      if (stopHum) stopHum();
    }
  };

  const handleUploadAll = async () => {
    if (file1 && !result1) handleUpload(1);
    if (file2 && !result2 && compareMode) handleUpload(2);
  };

  const renderHeatmap = (heatmapData, scanIndex) => {
    const canvas = scanIndex === 1 ? canvasRef1.current : canvasRef2.current;
    const origImg = scanIndex === 1 ? originalImgRef1.current : originalImgRef2.current;
    if (!canvas || !heatmapData) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      canvas.width = 224;
      canvas.height = 224;

      if (origImg && origImg.complete && origImg.naturalWidth > 0) {
        ctx.drawImage(origImg, 0, 0, 224, 224);
      } else {
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, 224, 224);
      }

      const imgData = ctx.getImageData(0, 0, 224, 224);
      const data = imgData.data;

      // Vivid Medical Jet / Thermal Colormap
      for (let y = 0; y < 224; y++) {
        for (let x = 0; x < 224; x++) {
          const val = heatmapData[y] ? heatmapData[y][x] : 0;
          if (val > 0.15) {
            const idx = (y * 224 + x) * 4;
            // Normalized intensity between 0 and 1
            const norm = Math.min(1, Math.max(0, (val - 0.15) / 0.85));

            // Thermal gradient: Blue (low) -> Cyan -> Yellow -> Red (peak consolidation)
            let r = 0, g = 0, b = 0;
            if (norm < 0.25) {
              r = 0;
              g = Math.floor(255 * (norm / 0.25));
              b = 255;
            } else if (norm < 0.5) {
              r = 0;
              g = 255;
              b = Math.floor(255 * (1 - (norm - 0.25) / 0.25));
            } else if (norm < 0.75) {
              r = Math.floor(255 * ((norm - 0.5) / 0.25));
              g = 255;
              b = 0;
            } else {
              r = 255;
              g = Math.floor(255 * (1 - (norm - 0.75) / 0.25));
              b = 0;
            }

            // Alpha blending with base radiograph
            const alpha = 0.55 + norm * 0.4;
            data[idx] = Math.floor(data[idx] * (1 - alpha) + r * alpha);
            data[idx + 1] = Math.floor(data[idx + 1] * (1 - alpha) + g * alpha);
            data[idx + 2] = Math.floor(data[idx + 2] * (1 - alpha) + b * alpha);
            data[idx + 3] = 255;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    };

    // Draw after DOM paint cycle
    requestAnimationFrame(draw);
    setTimeout(draw, 100);
    setTimeout(draw, 300);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Normal': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]';
      case 'Mild': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]';
      case 'Moderate': return 'text-orange-400 bg-orange-500/10 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]';
      case 'Severe': return 'text-red-500 bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
      case 'Critical': return 'text-purple-400 bg-purple-500/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]';
      default: return 'text-gray-400 bg-white/5 border-white/10';
    }
  };

  const ScanInputPanel = ({ scanIndex, file, error }) => (
    <div className="space-y-4 w-full">
      <motion.div 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, scanIndex)}
        className="border-2 border-dashed border-cyan-500/30 bg-black/60 hover:bg-cyan-900/20 hover:border-cyan-400 rounded-2xl p-8 text-center transition-all cursor-pointer shadow-inner relative group h-48 flex flex-col justify-center" 
        onClick={() => document.getElementById(`fileUpload${scanIndex}`).click()}
      >
        <div className="absolute inset-0 bg-cyan-500/5 scale-0 group-hover:scale-100 transition-transform rounded-2xl duration-300"></div>
        <UploadCloud className="mx-auto text-cyan-400 mb-3 transition-transform group-hover:-translate-y-2 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" size={40} />
        <p className="text-gray-100 font-bold mb-1 uppercase tracking-wide text-sm">Select or Drag Image {scanIndex}</p>
        <p className="text-[10px] text-cyan-600/80 uppercase font-mono">Supported: JPEG, PNG</p>
        <input id={`fileUpload${scanIndex}`} type="file" accept="image/jpeg, image/png" className="hidden" onChange={(e) => handleFileChange(e, scanIndex)} />
        
        {file && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs bg-cyan-500/20 p-2 rounded-lg border border-cyan-400/50 absolute bottom-4 left-4 right-4">
            <FileImage size={14} className="text-cyan-300" />
            <span className="text-cyan-100 font-mono tracking-tight truncate max-w-[120px]">{file.name}</span>
          </div>
        )}
      </motion.div>
      
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-red-400 bg-red-900/40 p-2 rounded-xl border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <AlertCircle size={16} />
          <span className="text-xs font-mono">{error}</span>
        </motion.div>
      )}
    </div>
  );

  const ResultPanel = ({ previewURL, result, originalImgRef, canvasRef, label }) => {
    if (!previewURL) return null;
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/60 p-4 sm:p-6 rounded-2xl border border-cyan-900/50 shadow-[inset_0_0_20px_rgba(0,0,0,1)] w-full flex flex-col h-full"
      >
        <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-[0.2em] flex items-center gap-2 font-mono mb-4">
          <Box size={14} /> {label}
        </h3>
        
        <div className={`grid gap-4 flex-grow ${result && result.prediction === 'Pneumonia' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          <div className="bg-[#020408] p-2 rounded-xl border border-cyan-900/30 flex flex-col items-center justify-center relative overflow-hidden min-h-[260px] sm:min-h-[300px]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/80 mb-1 z-10 self-start px-2 py-0.5 rounded bg-black/60 border border-cyan-900/50">Raw X-Ray Image</span>
            <div className="w-full h-full flex-grow relative flex items-center justify-center">
              <img ref={originalImgRef} src={previewURL} alt="Original Radiograph" className="max-w-full max-h-[260px] object-contain rounded-lg shadow-md" />
            </div>
          </div>
          
          {result && result.prediction === 'Pneumonia' && (
            <div className="bg-[#020408] p-2 rounded-xl border border-red-900/40 flex flex-col items-center justify-center relative overflow-hidden min-h-[260px] sm:min-h-[300px]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 mb-1 z-10 self-start px-2 py-0.5 rounded bg-red-950/60 border border-red-800/50 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                Infection Zone (Grad-CAM)
              </span>
              <div className="w-full h-full flex-grow relative flex items-center justify-center">
                <canvas ref={canvasRef} className="max-w-full max-h-[260px] object-contain rounded-lg shadow-lg border border-red-500/20"></canvas>
              </div>
            </div>
          )}
        </div>

        {result && (
          <div className="mt-4 pt-4 border-t border-cyan-900/50 flex-shrink-0 space-y-4">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#020408]/80 p-3 rounded-xl border border-white/5">
               <DiagnosisBadge prediction={result.prediction} confidence={result.confidence} severity={result.severity} />
             </div>
             
             {/* Clinical Report Section */}
             {result.summary && (
               <div>
                  <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2 font-mono">
                    <Activity size={13} /> Clinical Summary
                  </h4>
                  <p className="text-xs text-gray-300 font-sans mb-3 leading-relaxed">
                    {result.summary}
                  </p>
                  <div className={`p-3 rounded-lg border ${result.prediction === 'Pneumonia' && (result.severity === 'Severe' || result.severity === 'Critical') ? 'bg-red-500/10 border-red-500/50 text-red-200' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80 font-mono">Recommendation</p>
                    <p className="text-xs font-sans">{result.suggestion}</p>
                  </div>
               </div>
             )}
          </div>
        )}
      </motion.div>
    );
  };

  const anyLoading = loading1 || loading2;
  const anyFile = file1 || (compareMode && file2);
  const show3DModel = result1 && !compareMode; // Show holographic lungs in single scan mode

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="container mx-auto p-4 md:p-8 max-w-7xl relative z-10"
    >
      <div className="glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden neon-border">
        {/* Subtle grid background pattern inside panel */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxwYXRoIGQ9Ik0wIDIwaDIwVjBIMHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSg2LCAxODIsIDIxMiwgMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] opacity-30 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <Cpu className="text-cyan-400 bg-cyan-500/10 border border-cyan-500/50 p-2.5 rounded-2xl shadow-md" size={44} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">Radiograph Scan</h2>
                {localStorage.getItem('role') === 'admin' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 border border-purple-500/40 text-purple-300">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">AI-Assisted Chest Radiograph Analysis & Pathology Localization</p>
            </div>
          </div>
          
          {/* Comparison Mode Toggle */}
          <div className="flex bg-black/50 p-1 rounded-xl border border-cyan-900/50">
            <button 
              onClick={() => setCompareMode(false)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${!compareMode ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'text-gray-400 hover:text-cyan-300'}`}
            >
              Single Scan
            </button>
            <button 
              onClick={() => setCompareMode(true)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${compareMode ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'text-gray-400 hover:text-cyan-300'}`}
            >
              <GitCompare size={14} /> Compare
            </button>
          </div>
        </div>
        
        <div className="grid lg:grid-cols-12 gap-8 relative z-10">
          
          {/* LEFT SIDE: Inputs and Actions */}
          <div className={`${compareMode ? 'lg:col-span-12' : 'lg:col-span-4'} space-y-6`}>
            
            <div className={`grid ${compareMode ? 'md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
               <ScanInputPanel scanIndex={1} file={file1} error={error1} />
               {compareMode && <ScanInputPanel scanIndex={2} file={file2} error={error2} />}
            </div>
            
            <motion.button 
              whileHover={!anyFile || anyLoading ? {} : { scale: 1.01 }}
              whileTap={!anyFile || anyLoading ? {} : { scale: 0.98 }}
              onClick={handleUploadAll} 
              disabled={!anyFile || anyLoading} 
              className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider flex justify-center items-center gap-3 transition-all ${
                !anyFile || anyLoading 
                  ? 'bg-black/50 text-gray-600 cursor-not-allowed border border-white/5' 
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black border border-cyan-300 shadow-lg'
              }`}
            >
              {anyLoading ? (
                <>
                  <Activity className="animate-spin" size={24} />
                  Analyzing Radiograph...
                </>
              ) : (
                <>
                  <Activity size={24} />
                  Analyze Radiograph
                </>
              )}
            </motion.button>
            
            {show3DModel && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-black/40 border border-cyan-900/50 rounded-2xl p-4 flex flex-col items-center justify-center mt-6 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"
              >
                 <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.2em] w-full text-center mb-2 font-mono">Holographic Lung Model</p>
                 <div className="w-full h-48 relative">
                   <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                     <ambientLight intensity={0.5} />
                     <pointLight position={[10, 10, 10]} intensity={1} />
                     <LungModel severity={result1.severity} />
                   </Canvas>
                 </div>
              </motion.div>
            )}
            
          </div>

          {/* RIGHT SIDE: Results */}
          <div className={`${compareMode ? 'lg:col-span-12' : 'lg:col-span-8'}`}>
            <AnimatePresence mode="wait">
              {previewURL1 || previewURL2 ? (
                <div className={`grid ${compareMode ? 'md:grid-cols-2' : 'grid-cols-1'} gap-6 h-full`}>
                   {previewURL1 && <ResultPanel previewURL={previewURL1} result={result1} originalImgRef={originalImgRef1} canvasRef={canvasRef1} label={compareMode ? "Scan 1" : "Source Scan"} />}
                   {previewURL2 && compareMode && <ResultPanel previewURL={previewURL2} result={result2} originalImgRef={originalImgRef2} canvasRef={canvasRef2} label="Scan 2" />}
                </div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-cyan-900/30 rounded-2xl bg-black/40"
                >
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
                    <Cpu className="text-cyan-800 relative z-10" size={80} />
                  </div>
                  <p className="text-xl font-black text-cyan-700 uppercase tracking-widest neon-text">System Standby</p>
                  <p className="text-cyan-600/50 mt-2 max-w-sm text-sm font-mono">Awaiting imaging data input to initialize the diagnostic neural network.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
