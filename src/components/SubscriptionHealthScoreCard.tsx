import React, { useState } from 'react';
import { 
  HeartPulse, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  Target, 
  CheckCircle2, 
  ChevronRight, 
  Edit3, 
  Check, 
  X,
  PauseCircle
} from 'lucide-react';
import { Subscription, SubscriptionHealthScore } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

interface SubscriptionHealthScoreCardProps {
  healthScore: SubscriptionHealthScore;
  subscriptions: Subscription[];
  projectionMode?: 'monthly' | 'annual';
  onPauseSubscription?: (id: string) => void;
  onEditBudgetClick?: () => void;
}

export const SubscriptionHealthScoreCard: React.FC<SubscriptionHealthScoreCardProps> = ({
  healthScore,
  subscriptions,
  projectionMode = 'monthly',
  onPauseSubscription,
  onEditBudgetClick,
}) => {
  const { userProfile, completeOnboarding } = useAuth();
  const { formatBaseINR, activeCurrency, symbols } = useCurrency();
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState(userProfile?.targetMonthlyBudget?.toString() || '5000');
  const [activeTab, setActiveTab] = useState<'pillars' | 'recommendations'>('pillars');
  const [isSaving, setIsSaving] = useState(false);

  const isAnnual = projectionMode === 'annual';
  const multiplier = isAnnual ? 12 : 1;

  const currentBudget = (userProfile?.targetMonthlyBudget || 5000) * multiplier;
  const activeSymbol = symbols[activeCurrency] || '₹';

  const handleSaveBudget = async () => {
    const parsed = parseFloat(budgetValue);
    if (!isNaN(parsed) && parsed > 0) {
      try {
        setIsSaving(true);
        const monthlyVal = isAnnual ? Math.round(parsed / 12) : parsed;
        await completeOnboarding({
          targetMonthlyBudget: monthlyVal,
        });
        setIsEditingBudget(false);
      } catch (err) {
        console.error('Failed to update budget:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // SVG Gauge calculations
  const score = healthScore.score;
  const radius = 64;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.72; // ~260 degrees
  const strokeDashoffset = arcLength - (arcLength * Math.min(score, 100)) / 100;

  // Grade color theme
  const getGradeTheme = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return {
          gradientId: 'healthGradGreen',
          stroke: '#10B981',
          badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'B':
        return {
          gradientId: 'healthGradBlue',
          stroke: '#3B82F6',
          badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
      case 'C':
        return {
          gradientId: 'healthGradAmber',
          stroke: '#F59E0B',
          badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      default:
        return {
          gradientId: 'healthGradRed',
          stroke: '#EF4444',
          badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        };
    }
  };

  const gradeTheme = getGradeTheme(healthScore.grade);
  const ratioPercent = Math.min(Math.round(healthScore.spendToBudgetRatio * 100), 200);

  return (
    <div id="subscription-health-score" className="relative w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden mb-6 transition-all duration-300">
      {/* Decorative top accent gradient */}
      <div 
        className="h-1.5 w-full bg-gradient-to-r"
        style={{
          backgroundImage: healthScore.score >= 80 
            ? 'linear-gradient(to right, #10B981, #06B6D4)' 
            : healthScore.score >= 65 
            ? 'linear-gradient(to right, #3B82F6, #6366F1)' 
            : healthScore.score >= 45 
            ? 'linear-gradient(to right, #F59E0B, #FB923C)' 
            : 'linear-gradient(to right, #EF4444, #F43F5E)'
        }}
      />

      <div className="p-5 sm:p-6 lg:p-7">
        {/* Header section with Title, Status Tag, and Edit Budget Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${gradeTheme.badgeBg}`}>
              <HeartPulse className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Subscription Health Score
                </h3>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${gradeTheme.badgeBg}`}>
                  <span>Grade {healthScore.grade}</span>
                  <span>•</span>
                  <span>{healthScore.status}</span>
                </span>
                {healthScore.simulatedScore !== undefined && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Sparkles className="w-3 h-3" />
                    <span>Projected: {healthScore.simulatedScore} (+{healthScore.scoreDelta})</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Composite financial efficiency calculated against your stated {isAnnual ? 'annual' : 'monthly'} budget of{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                  {formatBaseINR(currentBudget)}
                </span>
              </p>
            </div>
          </div>

          {/* Quick budget adjustment toggle */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {isEditingBudget ? (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/90 p-1 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-xs">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 pl-2">
                  {activeSymbol}
                </span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  placeholder="Budget"
                  className="w-24 sm:w-28 px-2 py-1 text-xs font-bold font-mono text-slate-900 dark:text-white bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveBudget}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer disabled:opacity-50"
                  title="Save Budget"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingBudget(false)}
                  className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setBudgetValue(currentBudget.toString());
                  setIsEditingBudget(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                <span>Adjust Target Budget</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Body: Radial Score Visualization + Spend vs Budget Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-center">
          {/* Left Column: Circular Arc Gauge */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
            <div className="relative flex items-center justify-center">
              <svg 
                className="w-44 h-44 sm:w-48 sm:h-48 transform -rotate-130" 
                viewBox="0 0 160 160"
              >
                <defs>
                  <linearGradient id="healthGradGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="healthGradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                  <linearGradient id="healthGradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                  <linearGradient id="healthGradRed" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FB7185" />
                    <stop offset="100%" stopColor="#E11D48" />
                  </linearGradient>
                </defs>

                {/* Track background */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${arcLength} ${circumference}`}
                  strokeLinecap="round"
                />

                {/* Dynamic animated score arc */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={`url(#${gradeTheme.gradientId})`}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${arcLength} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Inside gauge text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-mono tabular-nums">
                  {score}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                  out of 100
                </span>
                <div className="mt-1 flex items-center gap-1">
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md ${gradeTheme.badgeBg}`}>
                    {healthScore.grade} Tier
                  </span>
                </div>
              </div>
            </div>

            {/* Score interpretation summary */}
            <div className="text-center mt-3 max-w-xs">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {score >= 80 
                  ? 'Exemplary Budget Discipline' 
                  : score >= 65 
                  ? 'Solid Subscription Control' 
                  : score >= 45 
                  ? 'Moderate Drift Detected' 
                  : 'Budget Leakage Alert'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {healthScore.isOverBudget 
                  ? `Exceeding target budget by ${formatBaseINR(Math.abs(healthScore.headroomOrDeficit))}`
                  : `Comfortably operating with ${formatBaseINR(healthScore.headroomOrDeficit)} buffer`}
              </p>
            </div>
          </div>

          {/* Right Column: Spend vs. Stated Monthly Budget Visual comparison */}
          <div className="lg:col-span-8 flex flex-col justify-between gap-5">
            {/* Visual Progress Bar: Spend vs Target Budget */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Spend vs. Stated {isAnnual ? 'Annual' : 'Monthly'} Budget
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  <span className={healthScore.isOverBudget ? 'text-rose-500 font-extrabold' : 'text-slate-900 dark:text-white'}>
                    {ratioPercent}%
                  </span>{' '}
                  utilized
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="relative w-full h-3.5 bg-slate-200 dark:bg-slate-700/80 rounded-full overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    healthScore.isOverBudget 
                      ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-red-600' 
                      : ratioPercent >= 80 
                      ? 'bg-gradient-to-r from-blue-500 to-amber-500' 
                      : 'bg-gradient-to-r from-teal-400 to-emerald-500'
                  }`}
                  style={{ width: `${Math.min(ratioPercent, 100)}%` }}
                />
              </div>

              {/* Amount Comparison Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Actual Active Spend
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white">
                    {formatBaseINR(healthScore.actualSpend)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{isAnnual ? '/year' : '/month'}</span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Target Budget Limit
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {formatBaseINR(healthScore.statedBudget)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{isAnnual ? '/year' : '/month'}</span>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {healthScore.isOverBudget ? 'Deficit / Overrun' : 'Safe Headroom'}
                  </span>
                  <span className={`text-sm sm:text-base font-bold font-mono flex items-center gap-1 ${
                    healthScore.isOverBudget 
                      ? 'text-rose-600 dark:text-rose-400' 
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {healthScore.isOverBudget ? (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    )}
                    {formatBaseINR(Math.abs(healthScore.headroomOrDeficit))}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {healthScore.isOverBudget ? 'Action required' : 'Protected surplus'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-tabs: Pillars vs Actionable Recommendations */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('pillars')}
                className={`pb-2 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'pillars'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>4 Diagnostic Pillars</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('recommendations')}
                className={`pb-2 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'recommendations'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Actionable Recommendations</span>
                {healthScore.recommendations.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] rounded-full font-mono">
                    {healthScore.recommendations.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: 4 Pillars Breakdown Grid */}
        {activeTab === 'pillars' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mt-5">
            {/* Pillar 1: Budget Adherence */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                  {healthScore.pillars.budgetAdherence.name}
                </span>
                <span className="text-xs font-mono font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">
                  {healthScore.pillars.budgetAdherence.score}/{healthScore.pillars.budgetAdherence.maxScore}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${healthScore.pillars.budgetAdherence.percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="truncate">{healthScore.pillars.budgetAdherence.label}</span>
                <span className={`capitalize font-semibold text-[10px] px-1.5 py-0.5 rounded ${
                  healthScore.pillars.budgetAdherence.status === 'optimal'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : healthScore.pillars.budgetAdherence.status === 'good'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}>
                  {healthScore.pillars.budgetAdherence.status}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">
                {healthScore.pillars.budgetAdherence.description}
              </p>
            </div>

            {/* Pillar 2: Living Expense Drain */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                  {healthScore.pillars.expenseDrain.name}
                </span>
                <span className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                  {healthScore.pillars.expenseDrain.score}/{healthScore.pillars.expenseDrain.maxScore}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${healthScore.pillars.expenseDrain.percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="truncate">{healthScore.pillars.expenseDrain.label}</span>
                <span className={`capitalize font-semibold text-[10px] px-1.5 py-0.5 rounded ${
                  healthScore.pillars.expenseDrain.status === 'optimal'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  {healthScore.pillars.expenseDrain.status}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">
                {healthScore.pillars.expenseDrain.description}
              </p>
            </div>

            {/* Pillar 3: Trial & Renewal Safety */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                  {healthScore.pillars.renewalSafety.name}
                </span>
                <span className="text-xs font-mono font-extrabold text-purple-600 dark:text-purple-400 shrink-0">
                  {healthScore.pillars.renewalSafety.score}/{healthScore.pillars.renewalSafety.maxScore}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${healthScore.pillars.renewalSafety.percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="truncate">{healthScore.pillars.renewalSafety.label}</span>
                <span className={`capitalize font-semibold text-[10px] px-1.5 py-0.5 rounded ${
                  healthScore.pillars.renewalSafety.status === 'optimal'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  {healthScore.pillars.renewalSafety.status}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">
                {healthScore.pillars.renewalSafety.description}
              </p>
            </div>

            {/* Pillar 4: Portfolio Management */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                  {healthScore.pillars.portfolioEfficiency.name}
                </span>
                <span className="text-xs font-mono font-extrabold text-teal-600 dark:text-teal-400 shrink-0">
                  {healthScore.pillars.portfolioEfficiency.score}/{healthScore.pillars.portfolioEfficiency.maxScore}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-teal-500 rounded-full"
                  style={{ width: `${healthScore.pillars.portfolioEfficiency.percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="truncate">{healthScore.pillars.portfolioEfficiency.label}</span>
                <span className={`capitalize font-semibold text-[10px] px-1.5 py-0.5 rounded ${
                  healthScore.pillars.portfolioEfficiency.status === 'optimal'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                }`}>
                  {healthScore.pillars.portfolioEfficiency.status}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">
                {healthScore.pillars.portfolioEfficiency.description}
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Actionable Health Recommendations */}
        {activeTab === 'recommendations' && (
          <div className="mt-5 space-y-3">
            {healthScore.recommendations.length === 0 ? (
              <div className="text-center py-6 px-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Your portfolio is perfectly balanced</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Spending is strictly under your target monthly budget and no unexpected trial renewals are pending.
                </p>
              </div>
            ) : (
              healthScore.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    rec.type === 'critical'
                      ? 'bg-rose-500/5 border-rose-500/20'
                      : rec.type === 'warning'
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-indigo-500/5 border-indigo-500/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {rec.type === 'critical' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                      ) : rec.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {rec.title}
                        </span>
                        <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border border-slate-200 dark:border-slate-700">
                          {rec.impact}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {rec.description}
                      </p>
                    </div>
                  </div>

                  {rec.actionType === 'pause' && rec.targetSubscriptionId && onPauseSubscription && (
                    <button
                      type="button"
                      onClick={() => onPauseSubscription(rec.targetSubscriptionId!)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 shadow-xs hover:border-slate-300 transition-all self-start sm:self-auto shrink-0 cursor-pointer"
                    >
                      <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Pause Sub</span>
                    </button>
                  )}

                  {rec.actionType === 'edit_budget' && (
                    <button
                      type="button"
                      onClick={() => {
                        setBudgetValue(currentBudget.toString());
                        setIsEditingBudget(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all self-start sm:self-auto shrink-0 cursor-pointer"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Adjust Budget</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
