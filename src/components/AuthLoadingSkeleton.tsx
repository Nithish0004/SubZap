import React from 'react';
import { Zap, ShieldCheck } from 'lucide-react';

export const AuthLoadingSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white antialiased font-sans">
      <div className="w-full max-w-4xl space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between p-4 bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-500 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-3 w-40 bg-slate-100 dark:bg-slate-850 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-8 w-28 bg-indigo-500/20 rounded-xl" />
          </div>
        </div>

        {/* Banner Skeleton */}
        <div className="h-24 bg-gradient-to-r from-slate-200 via-slate-150 to-slate-200 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-44 bg-slate-300 dark:bg-slate-700 rounded-md" />
            <div className="h-6 w-64 bg-slate-300 dark:bg-slate-700 rounded-md" />
          </div>
          <div className="h-9 w-36 bg-slate-300 dark:bg-slate-700 rounded-xl" />
        </div>

        {/* 4 Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="h-7 w-32 bg-slate-300 dark:bg-slate-700 rounded-md" />
              <div className="h-3 w-24 bg-slate-150 dark:bg-slate-850 rounded-md" />
            </div>
          ))}
        </div>

        {/* Content Block Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-80 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="w-48 h-48 rounded-full border-8 border-slate-200 dark:border-slate-800 mx-auto mt-6" />
          </div>
          <div className="lg:col-span-5 h-80 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
            <div className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
          </div>
        </div>

        {/* Footnote */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Verifying encrypted cloud identity and subscription database...</span>
        </div>
      </div>
    </div>
  );
};
