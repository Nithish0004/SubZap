import React, { useState } from 'react';
import { 
  Sparkles, 
  User, 
  Target, 
  Wallet, 
  Compass, 
  ArrowRight, 
  Check, 
  ShieldCheck,
  TrendingDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FinancialGoal } from '../types';
import { formatCurrencyAmount } from '../utils/currency';

export const OnboardingModal: React.FC = () => {
  const { user, completeOnboarding } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [fullName, setFullName] = useState<string>(user?.displayName || '');
  const [averageMonthlyExpense, setAverageMonthlyExpense] = useState<string>('45000');
  const [financialGoal, setFinancialGoal] = useState<FinancialGoal>('Moderate Tracking');
  const [targetMonthlyBudget, setTargetMonthlyBudget] = useState<string>('3500');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!fullName.trim()) {
        setError('Please enter your full name or preferred display name.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const expense = parseFloat(averageMonthlyExpense);
      if (isNaN(expense) || expense <= 0) {
        setError('Please enter a realistic estimated monthly expense.');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const budget = parseFloat(targetMonthlyBudget);
    if (isNaN(budget) || budget <= 0) {
      setError('Please enter a target subscription budget greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await completeOnboarding({
        fullName: fullName.trim(),
        averageMonthlyExpense: parseFloat(averageMonthlyExpense) || 0,
        financialGoal,
        targetMonthlyBudget: budget,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedBudget = parseFloat(targetMonthlyBudget) || 0;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
    >
      <div 
        id="onboarding-survey-dialog"
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200"
      >
        {/* Header Progress Indicators */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Personalize Your Defense Shield
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Step {step} of 3: Establishing your financial baseline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  s === step
                    ? 'w-6 bg-indigo-600 dark:bg-indigo-400'
                    : s < step
                    ? 'bg-emerald-500'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Step 1: Name and Identity */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                What should we call you? (Full / Preferred Display Name)
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="onboarding-fullname"
                  type="text"
                  autoFocus
                  placeholder="e.g. Alex Morgan, Priya Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                Your profile settings will be saved securely to the cloud and mapped to your client-side encryption key for strict privacy.
              </span>
            </div>

            <button
              id="onboarding-step1-next"
              type="button"
              onClick={handleNext}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Continue to Financial Baseline</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Baseline Expenses & Financial Goal Selector */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Estimated Average Monthly Total Living Expense (₹ INR)
              </label>
              <div className="relative flex items-center">
                <Wallet className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="onboarding-expense"
                  type="number"
                  placeholder="45000"
                  value={averageMonthlyExpense}
                  onChange={(e) => setAverageMonthlyExpense(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Used to compute subscription drain relative to your total monthly outflow.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Financial Goal: How strictly do you want to control your subscription spending?
              </label>
              <div className="relative flex items-center">
                <Compass className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="onboarding-goal-select"
                  value={financialGoal}
                  onChange={(e) => setFinancialGoal(e.target.value as FinancialGoal)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Relaxed/Informational">Relaxed/Informational (Passive monitoring)</option>
                  <option value="Moderate Tracking">Moderate Tracking (Balanced budget warnings)</option>
                  <option value="Strict/Aggressive Budgeting">Strict/Aggressive Budgeting (Zero wallet bleed tolerance)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                id="onboarding-step2-next"
                type="button"
                onClick={handleNext}
                className="w-2/3 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Set Subscription Budget</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Target Monthly Subscription Budget Limit */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Monthly Subscription Budget Ceiling (₹ INR)
              </label>
              <div className="relative flex items-center">
                <Target className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="onboarding-target-budget"
                  type="number"
                  autoFocus
                  min="100"
                  step="50"
                  placeholder="3500"
                  value={targetMonthlyBudget}
                  onChange={(e) => setTargetMonthlyBudget(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                SubZap will calculate real-time burn against this ceiling and warn you before renewals breach it.
              </p>
            </div>

            {/* Live Budget Ceiling Preview Card */}
            {parsedBudget > 0 && (
              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Monthly Budget Target
                  </span>
                  <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-300 font-mono">
                    {formatCurrencyAmount(parsedBudget, 'INR')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Mode
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {financialGoal}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                id="onboarding-complete-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                <span>Save Profile & Enter SubZap</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
