import React from 'react';
import { ShieldCheck, Lock, ExternalLink, Zap } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          {/* Brand & Copyright statement */}
          <div className="flex items-center flex-wrap gap-2 text-center sm:text-left">
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-200 font-bold">
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              <span>SubZap</span>
            </div>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <span>
              © 2026 <strong className="font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Nithish S</strong>. All rights reserved. | Standard License
            </span>
          </div>

          {/* Badges / Security Status */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Local Encryption</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
              <Lock className="w-3 h-3 text-indigo-500" />
              <span>Zero-Telemetry</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
