import React from 'react';
import { 
  Flame, 
  TrendingDown, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink, 
  PauseCircle, 
  PlayCircle, 
  Calendar, 
  Sparkles, 
  ArrowRight,
  Globe
} from 'lucide-react';
import { FinancialMetrics, Subscription } from '../types';
import { getCountdownBadge, getDaysUntil } from '../utils/calculations';
import { useCurrency } from '../context/CurrencyContext';
import { CategoryDonutChart } from './CategoryDonutChart';
import { BrandLogo } from './BrandLogo';
import { MultiCurrencyTooltip } from './MultiCurrencyTooltip';
import { BudgetLimitGauge } from './BudgetLimitGauge';

interface AnalyticsHubProps {
  metrics: FinancialMetrics;
  subscriptions: Subscription[];
  onTogglePause: (id: string) => void;
  onSelectSubscription: (sub: Subscription) => void;
  onNavigateToTab: (tab: 'analytics' | 'subscriptions' | 'calendar') => void;
  simulatedCancelledIds: Set<string>;
  onToggleSimulateCancel: (id: string) => void;
}

export const AnalyticsHub: React.FC<AnalyticsHubProps> = ({
  metrics,
  subscriptions,
  onTogglePause,
  onSelectSubscription,
  onNavigateToTab,
  simulatedCancelledIds,
  onToggleSimulateCancel,
}) => {
  const { formatBaseINR, format, getBreakdown, activeCurrency } = useCurrency();

  // Renewals within 7 days
  const upcomingRenewals = subscriptions
    .filter((sub) => {
      if (sub.isPaused) return false;
      const days = getDaysUntil(sub.nextRenewalDate);
      return days >= 0 && days <= 7;
    })
    .sort((a, b) => getDaysUntil(a.nextRenewalDate) - getDaysUntil(b.nextRenewalDate));

  // Trials expiring soon
  const activeTrials = subscriptions.filter((sub) => Boolean(sub.trialExpiryDate));

  const hasSimulation = simulatedCancelledIds.size > 0;

  const currentMonthlyBurn = hasSimulation ? metrics.simulatedMonthlyBurn : metrics.totalMonthlyBurn;
  const currentYearlyBleed = hasSimulation ? metrics.simulatedYearlyBleed : metrics.projectedYearlyBleed;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome / Mission Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-100 via-indigo-50/50 to-slate-100 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Active Wallet Shield
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Zero-Latency Client Engine</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Financial Self-Defense Overview
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Normalized billing cycles exposing unmonitored subscription wallet bleed.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="view-all-subs-btn"
            onClick={() => onNavigateToTab('subscriptions')}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <span>Manage All {subscriptions.length} Subscriptions</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Personalized Budget Limit Gauge */}
      <BudgetLimitGauge currentMonthlyBurnINR={currentMonthlyBurn} />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monthly Burn */}
        <div className="relative p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Monthly Burn (Base ₹)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight flex items-baseline gap-1">
              <span>{formatBaseINR(currentMonthlyBurn)}</span>
              <span className="text-xs font-normal text-slate-400 font-sans">/mo</span>
            </div>

            {hasSimulation ? (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>-{formatBaseINR(metrics.simulatedMonthlySavings)}/mo simulated drop</span>
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>{metrics.activeCount} active recurring</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  ≈ {getBreakdown(currentMonthlyBurn).usd}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Projected Yearly Bleed */}
        <div className="relative p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Projected Yearly Bleed
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-300 font-mono tabular-nums tracking-tight flex items-baseline gap-1">
              <span>{formatBaseINR(currentYearlyBleed)}</span>
              <span className="text-xs font-normal text-slate-400 font-sans">/yr</span>
            </div>

            {hasSimulation ? (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                <span>-{formatBaseINR(metrics.simulatedYearlySavings)}/yr saved</span>
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Annualized true cost</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  ≈ {getBreakdown(currentYearlyBleed).usd}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Free Trials Flagged */}
        <div className="relative p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Monitored Free Trials
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              activeTrials.length > 0
                ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
              {metrics.trialCount}
              <span className="text-xs font-normal text-slate-400 ml-1 font-sans">at risk</span>
            </div>

            {activeTrials.length > 0 ? (
              <div className="mt-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5 font-medium truncate">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span className="truncate">
                  {activeTrials[0].name}: {getCountdownBadge(activeTrials[0].trialExpiryDate!).label}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">
                No active trials vulnerable to auto-billing
              </p>
            )}
          </div>
        </div>

        {/* Card 4: Paused Subscriptions / Savings */}
        <div className="relative p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recovered Paused Savings
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums tracking-tight flex items-baseline gap-1">
              <span>{formatBaseINR(metrics.pausedMonthlySavings)}</span>
              <span className="text-xs font-normal text-slate-400 font-sans">/mo</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{metrics.pausedCount}</strong> paused ({formatBaseINR(metrics.pausedMonthlySavings * 12)}/yr preserved)
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Category Donut Chart & Renewals within 7 Days */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Donut Chart Category Breakdown (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Burn Rate by Category
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Visual breakdown of monthly outflow across subscription categories
                </p>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {metrics.categoryBreakdown.length} Active Categories
              </span>
            </div>

            <CategoryDonutChart
              categories={metrics.categoryBreakdown}
              totalBurn={metrics.totalMonthlyBurn}
            />
          </div>

          <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Largest Driver: <strong className="text-slate-800 dark:text-slate-200">{metrics.categoryBreakdown[0]?.category || 'None'}</strong></span>
            <span className="font-mono">{metrics.categoryBreakdown[0]?.percentage.toFixed(1) || 0}% of monthly burn</span>
          </div>
        </div>

        {/* Right Col: Renewals within 7 Days Widget (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Renewals within 7 Days
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
              {upcomingRenewals.length} Imminent
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Critical window to cancel, pause, or downgrade before charges finalize.
          </p>

          {/* List of upcoming items */}
          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
            {upcomingRenewals.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">All Clear for Next 7 Days</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">No upcoming charges scheduled this week.</p>
              </div>
            ) : (
              upcomingRenewals.map((sub) => {
                const badge = getCountdownBadge(sub.nextRenewalDate);
                const isSimulated = simulatedCancelledIds.has(sub.id);

                return (
                  <div
                    key={sub.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      badge.isToday
                        ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                        : badge.isUrgent
                        ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50'
                        : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <BrandLogo
                          name={sub.name}
                          domain={sub.domain}
                          logoUrl={sub.logoUrl}
                          size="sm"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span 
                              className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer" 
                              onClick={() => onSelectSubscription(sub)}
                            >
                              {sub.name}
                            </span>
                            {sub.trialExpiryDate && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                                Free Trial
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                            {sub.category} • {sub.billingCycle}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                          <MultiCurrencyTooltip
                            amountInINR={sub.cost}
                            label={sub.name}
                            size="sm"
                            align="right"
                          />
                        </div>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                          badge.isToday
                            ? 'bg-rose-600 text-white font-bold animate-pulse'
                            : badge.isUrgent
                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    {/* Quick action bar */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/50 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleSimulateCancel(sub.id)}
                          className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                            isSimulated
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isSimulated ? '✓ In Simulation' : 'Simulate Zap'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onTogglePause(sub.id)}
                          className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-medium"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </button>
                      </div>

                      {sub.cancellationUrl && (
                        <a
                          href={sub.cancellationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                        >
                          <span>Direct Cancel</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => onNavigateToTab('calendar')}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Inspect Full Predictive Calendar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
