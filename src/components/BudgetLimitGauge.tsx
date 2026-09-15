import React, { useState } from 'react';
import { 
  Target, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  Edit3, 
  Check, 
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { convertFromINR } from '../utils/currency';

interface BudgetLimitGaugeProps {
  currentMonthlyBurnINR: number;
  compact?: boolean;
}

export const BudgetLimitGauge: React.FC<BudgetLimitGaugeProps> = ({
  currentMonthlyBurnINR,
  compact = false,
}) => {
  const { userProfile, completeOnboarding, setNeedsOnboarding } = useAuth();
  const { formatBaseINR, activeCurrency, symbols } = useCurrency();

  const [isEditing, setIsEditing] = useState(false);
  const [newBudget, setNewBudget] = useState(userProfile?.targetMonthlyBudget?.toString() || '5000');

  // Reactively sync when userProfile loads or changes
  React.useEffect(() => {
    if (userProfile?.targetMonthlyBudget) {
      setNewBudget(userProfile.targetMonthlyBudget.toString());
    }
  }, [userProfile?.targetMonthlyBudget]);

  const targetBudget = userProfile?.targetMonthlyBudget || 5000;
  const goal = userProfile?.financialGoal || 'Moderate Tracking';

  const percentage = Math.min(Math.round((currentMonthlyBurnINR / targetBudget) * 100), 200);
  const isOverBudget = currentMonthlyBurnINR > targetBudget;
  const isNearLimit = !isOverBudget && percentage >= 80;

  // Convert for active currency display
  const targetInActive = convertFromINR(targetBudget, activeCurrency);
  const burnInActive = convertFromINR(currentMonthlyBurnINR, activeCurrency);
  const symbol = symbols[activeCurrency];

  const handleSaveBudget = async () => {
    const val = parseFloat(newBudget);
    if (!isNaN(val) && val > 0) {
      await completeOnboarding({
        fullName: userProfile?.fullName || 'SubZap Member',
        averageMonthlyExpense: userProfile?.averageMonthlyExpense || 45000,
        financialGoal: userProfile?.financialGoal || 'Moderate Tracking',
        targetMonthlyBudget: val,
      });
      setIsEditing(false);
    }
  };

  // Compact version for the top Header bar
  if (compact) {
    return (
      <div 
        id="header-budget-gauge"
        className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs"
        title={`Target Budget: ${formatBaseINR(targetBudget)} | Current Burn: ${formatBaseINR(currentMonthlyBurnINR)}`}
      >
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="text-slate-500 dark:text-slate-400 font-medium">Budget:</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {symbol}{Math.round(targetInActive).toLocaleString()}
          </span>
        </div>

        <span className="text-slate-300 dark:text-slate-700">|</span>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Burn:</span>
          <span className={`font-mono font-bold ${
            isOverBudget 
              ? 'text-rose-600 dark:text-rose-400' 
              : isNearLimit 
              ? 'text-amber-600 dark:text-amber-400' 
              : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {symbol}{Math.round(burnInActive).toLocaleString()}
          </span>
        </div>

        {/* Mini progress pill */}
        <div className="w-14 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shrink-0">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isOverBudget 
                ? 'bg-rose-500' 
                : isNearLimit 
                ? 'bg-amber-500' 
                : 'bg-indigo-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  // Full-featured Dashboard Gauge Card
  return (
    <div 
      id="dashboard-budget-gauge-card"
      className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all overflow-hidden w-full min-w-0"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isOverBudget
              ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
              : isNearLimit
              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
              : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20'
          }`}>
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                Personalized Budget Limit Gauge
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                {goal}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Target monthly ceiling synced with cloud profiling
            </p>
          </div>
        </div>

        {/* Quick Edit Budget Trigger */}
        {!isEditing ? (
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setNeedsOnboarding(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 bg-transparent rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
              title="Edit Profile, Living Expenses & Strategy"
            >
              <Sparkles className="w-3 h-3" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit Target</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
            <input
              type="number"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
              className="w-24 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-indigo-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <button
              onClick={handleSaveBudget}
              className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
              title="Save"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Numerical Comparison Bar */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Target Budget:</span>
          <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white">
            {formatBaseINR(targetBudget)}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Burn:</span>
          <span className={`text-base sm:text-lg font-black font-mono ${
            isOverBudget 
              ? 'text-rose-600 dark:text-rose-400' 
              : isNearLimit 
              ? 'text-amber-600 dark:text-amber-400' 
              : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {formatBaseINR(currentMonthlyBurnINR)}
          </span>
          <span className="text-xs font-mono text-slate-400">({percentage}%)</span>
        </div>
      </div>

      {/* Visual Progress Gauge Bar */}
      <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3 relative">
        <div 
          className={`h-full rounded-full transition-all duration-700 ${
            isOverBudget 
              ? 'bg-rose-500 shadow-sm shadow-rose-500/50' 
              : isNearLimit 
              ? 'bg-amber-500 shadow-sm shadow-amber-500/50' 
              : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Status Feedback Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
        {isOverBudget ? (
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Budget Exceeded! Bleed is {formatBaseINR(currentMonthlyBurnINR - targetBudget)} over limit.</span>
          </div>
        ) : isNearLimit ? (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Caution: Near budget ceiling ({formatBaseINR(targetBudget - currentMonthlyBurnINR)} cushion remains).</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Optimal Defense: Spending is safely within target ({formatBaseINR(targetBudget - currentMonthlyBurnINR)} headroom).</span>
          </div>
        )}

        <span className="text-[11px] text-slate-400 hidden sm:inline">
          {userProfile?.fullName ? `Profiling: ${userProfile.fullName}` : 'Cloud Synced'}
        </span>
      </div>
    </div>
  );
};
