import React from 'react';
import { ShieldAlert, CheckCircle } from 'lucide-react';

export const getSeverityBadgeStyle = (severity) => {
  switch (severity) {
    case 'Normal':
      return 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40';
    case 'Mild':
      return 'text-yellow-400 bg-yellow-950/60 border-yellow-500/40';
    case 'Moderate':
      return 'text-orange-400 bg-orange-950/60 border-orange-500/40';
    case 'Severe':
      return 'text-red-400 bg-red-950/60 border-red-500/40';
    case 'Critical':
      return 'text-purple-400 bg-purple-950/60 border-purple-500/40';
    default:
      return 'text-gray-400 bg-white/5 border-white/10';
  }
};

export default function DiagnosisBadge({ prediction, confidence, severity }) {
  const isPneumonia = prediction === 'Pneumonia';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${isPneumonia ? 'text-red-400 bg-red-950/60 border-red-500/30' : 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30'}`}>
        {isPneumonia ? <ShieldAlert size={14} /> : <CheckCircle size={14} />}
        {prediction}
      </span>
      {confidence !== undefined && (
        <span className="text-xs font-mono font-semibold text-gray-300">
          {(confidence * 100).toFixed(1)}%
        </span>
      )}
      {severity && (
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getSeverityBadgeStyle(severity)}`}>
          {severity}
        </span>
      )}
    </div>
  );
}
