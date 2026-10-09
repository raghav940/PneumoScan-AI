import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Activity, Database, Eye, ArrowRight } from 'lucide-react';
import LungModel from './LungModel';

export default function Home() {
  const token = localStorage.getItem('token');

  return (
    <div className="flex-grow flex flex-col justify-between container mx-auto px-6 py-6 max-w-7xl">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto min-h-[70vh]">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-7 flex flex-col items-start gap-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 font-mono text-xs uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            Medical AI Diagnostics Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Next-Gen Chest Radiograph <span className="neon-text text-cyan-400">Pneumonia</span> Inference
          </h1>

          <p className="text-gray-400 text-base sm:text-lg leading-relaxed max-w-2xl font-sans">
            PneumoScan AI combines authentic Deep Residual Networks (ResNet-18) with layer-4 Grad-CAM explainability, pre-upload radiograph quality gating, and authenticated multi-user audit logging.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            {token ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-3 bg-cyan-500 hover:bg-cyan-400 text-black px-8 py-3.5 rounded-xl font-bold font-mono text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:-translate-y-0.5"
              >
                Access Diagnostic HUD
                <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="flex items-center gap-3 bg-cyan-500 hover:bg-cyan-400 text-black px-8 py-3.5 rounded-xl font-bold font-mono text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:-translate-y-0.5"
                >
                  Get Started
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/login"
                  className="flex items-center gap-2 border border-cyan-800/80 hover:border-cyan-500/50 bg-[#020408]/80 text-cyan-300 px-6 py-3.5 rounded-xl font-mono text-sm uppercase tracking-wider transition-all hover:bg-cyan-950/30"
                >
                  Clinician Sign In
                </Link>
              </>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-cyan-950/80 w-full max-w-lg">
            <div>
              <div className="text-2xl font-black text-cyan-400 font-mono">ResNet-18</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">Architecture</div>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-400 font-mono">Layer-4</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">Grad-CAM Map</div>
            </div>
            <div>
              <div className="text-2xl font-black text-amber-400 font-mono">&lt; 350ms</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">Inference Time</div>
            </div>
          </div>
        </motion.div>

        {/* 3D Lung Visualization */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="lg:col-span-5 h-[420px] relative glass-panel rounded-3xl border border-cyan-900/40 p-4 flex flex-col justify-between overflow-hidden shadow-2xl"
        >
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[#020408]/80 px-3 py-1 rounded-lg border border-cyan-900/50">
            <Activity size={14} className="text-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300">Interactive Bio-Render</span>
          </div>

          <div className="w-full h-full">
            <LungModel />
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-10 bg-[#020408]/80 backdrop-blur-md p-3 rounded-xl border border-cyan-900/40 flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400">Pulmonary Heatmap Simulation</span>
            <span className="text-xs font-mono text-cyan-400 font-bold">LIVE 3D</span>
          </div>
        </motion.div>
      </div>

      {/* Feature Capabilities Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12"
      >
        <div className="glass-panel p-6 rounded-2xl border border-cyan-900/30 hover:border-cyan-500/40 transition-all flex flex-col gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
            <ShieldCheck size={24} />
          </div>
          <h3 className="text-lg font-bold text-white font-sans">Quality Validation Gate</h3>
          <p className="text-sm text-gray-400 leading-relaxed font-sans">
            Automatically rejects corrupted files, non-radiographic uploads, and improper aspect ratios before sending data to neural inference.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-cyan-900/30 hover:border-cyan-500/40 transition-all flex flex-col gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
            <Eye size={24} />
          </div>
          <h3 className="text-lg font-bold text-white font-sans">Grad-CAM Visual Explanations</h3>
          <p className="text-sm text-gray-400 leading-relaxed font-sans">
            Computes gradients with respect to convolutional layer activations to render accurate colorized attention heatmaps over suspicious opacities.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-cyan-900/30 hover:border-cyan-500/40 transition-all flex flex-col gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
            <Database size={24} />
          </div>
          <h3 className="text-lg font-bold text-white font-sans">Isolated Diagnostic History</h3>
          <p className="text-sm text-gray-400 leading-relaxed font-sans">
            Includes multi-user data segmentation, Base64 thumbnail storage, and an administrative role with full audit visibility.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
