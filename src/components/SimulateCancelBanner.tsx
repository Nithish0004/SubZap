import React from 'react';
import { Zap, X, ShieldAlert, CheckCircle2, TrendingDown } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface SimulateCancelBannerProps {
  simulatedCount: number;
  monthlySavings: number;
  yearlySavings: number;
  onClear: () => void;
  onApplyPause: () => void;
  onApplyDelete: () => void;
}

export const SimulateCancelBanner: React.FC<SimulateCancelBannerProps> = ({
  simulatedCount,
  monthlySavings,
  yearlySavings,
  onClear,
  onApplyPause,
  onApplyDelete,
}) => {
  const { formatBaseINR } = useCurrency();

  if (simulatedCount === 0) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-[94%] max-w-3xl">
      <div 
        id="simulation-impact-banner"
        className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 border-2 border-indigo-500 shadow-2xl backdrop-blur-md text-slate-900 dark:text-white flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 animate-in slide-in-from-bottom-6 duration-300 w-full min-w-0"
      >
        <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-400/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 truncate">
                Cancellation Sandbox Active
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] sm:text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 shrink-0">
                {simulatedCount} Staged
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
              <span className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                +{formatBaseINR(monthlySavings)}/mo
              </span>
              <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono">
                (+{formatBaseINR(yearlySavings)}/yr saved)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <button
            id="sim-apply-pause-btn"
            onClick={onApplyPause}
            className="flex-1 sm:flex-initial px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Pause Staged
          </button>
          <button
            id="sim-apply-delete-btn"
            onClick={onApplyDelete}
            className="flex-1 sm:flex-initial px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-colors cursor-pointer"
          >
            Zap (Delete)
          </button>
          <button
            id="sim-dismiss-btn"
            onClick={onClear}
            title="Dismiss simulation"
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
