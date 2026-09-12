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
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-[92%] max-w-3xl">
      <div 
        id="simulation-impact-banner"
        className="p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 border-2 border-indigo-500 shadow-2xl backdrop-blur-md text-slate-900 dark:text-white flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-6 duration-300"
      >
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-400/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Cancellation Sandbox Active
              </span>
              <span className="px-2 py-0.2 rounded-full text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                {simulatedCount} Staged
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                +{formatBaseINR(monthlySavings)}/mo
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                (+{formatBaseINR(yearlySavings)}/year saved)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            id="sim-apply-pause-btn"
            onClick={onApplyPause}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            Pause Staged
          </button>
          <button
            id="sim-apply-delete-btn"
            onClick={onApplyDelete}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-colors"
          >
            Zap (Delete)
          </button>
          <button
            id="sim-dismiss-btn"
            onClick={onClear}
            title="Dismiss simulation"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
