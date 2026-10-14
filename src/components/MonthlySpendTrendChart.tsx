import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  Sparkles,
  Info,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Subscription } from '../types';
import { calculateMonthlySpendingTrend } from '../utils/calculations';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';

interface MonthlySpendTrendChartProps {
  subscriptions: Subscription[];
  simulatedCancelledIds?: Set<string>;
  targetBudget?: number;
  projectionMode?: 'monthly' | 'annual';
  onProjectionModeChange?: (mode: 'monthly' | 'annual') => void;
}

export const MonthlySpendTrendChart: React.FC<MonthlySpendTrendChartProps> = ({
  subscriptions,
  simulatedCancelledIds = new Set<string>(),
  targetBudget,
  projectionMode = 'monthly',
  onProjectionModeChange,
}) => {
  const { formatBaseINR, getBreakdown } = useCurrency();
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<'burn' | 'diff'>('burn');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const isAnnual = projectionMode === 'annual';
  const multiplier = isAnnual ? 12 : 1;
  const hasSimulation = simulatedCancelledIds.size > 0;

  // Calculate the 6-month spending trend
  const summary = calculateMonthlySpendingTrend(subscriptions, simulatedCancelledIds);
  const { trend, currentBurn, sixMonthsAgoBurn, netDelta, netDeltaPercent, averageBurn } = summary;

  // Effective values based on projectionMode
  const effectiveCurrentBurn = currentBurn * multiplier;
  const effectiveSixMonthsAgoBurn = sixMonthsAgoBurn * multiplier;
  const effectiveNetDelta = netDelta * multiplier;
  const effectiveAverageBurn = averageBurn * multiplier;
  const effectiveTargetBudget = targetBudget ? targetBudget * multiplier : undefined;

  // Recharts data format scaled by multiplier
  const chartData = trend.map((point) => ({
    name: point.label,
    fullLabel: point.fullLabel,
    burn: point.totalBurn * multiplier,
    simulatedBurn: point.simulatedBurn * multiplier,
    diff: point.diffFromPrev * multiplier,
    diffPercent: point.diffPercent,
    activeCount: point.activeCount,
    savings: point.cumulativeSavings * multiplier,
  }));

  const isIncrease = netDelta > 0;
  const isDecrease = netDelta < 0;

  const latestMoM = (trend[trend.length - 1]?.diffFromPrev || 0) * multiplier;
  const latestMoMPct = trend[trend.length - 1]?.diffPercent || 0;

  // Formatting helper for compact Y-axis tick values (e.g. ₹4k or ₹1.2L)
  const formatYAxis = (val: number) => {
    if (val === 0) return '₹0';
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`;
    }
    if (val >= 1000) {
      return `₹${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
    }
    return `₹${val}`;
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const isMoMUp = data.diff > 0;
    const isMoMDown = data.diff < 0;
    const monthlyEquivalent = isAnnual ? data.burn / 12 : data.burn;

    return (
      <div className="p-3.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-xl backdrop-blur-md text-xs min-w-[220px] space-y-2 pointer-events-none z-50">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>{data.fullLabel}</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {data.activeCount} subs
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-slate-500 dark:text-slate-400">
              {isAnnual ? 'Projected Annual Run-Rate:' : 'Total Monthly Burn:'}
            </span>
            <span className="font-mono font-extrabold text-slate-900 dark:text-white text-sm">
              {formatBaseINR(data.burn)}{isAnnual ? '/yr' : ''}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {isAnnual ? 'Monthly Equivalent:' : 'USD Equivalent:'}
            </span>
            <span className="font-mono text-slate-600 dark:text-slate-400">
              {isAnnual ? `${formatBaseINR(monthlyEquivalent)}/mo` : `≈ ${getBreakdown(data.burn).usd}`}
            </span>
          </div>

          {isAnnual && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">USD Annualized:</span>
              <span className="font-mono text-slate-600 dark:text-slate-400">
                ≈ {getBreakdown(data.burn).usd}
              </span>
            </div>
          )}

          {/* MoM difference badge */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-slate-500 dark:text-slate-400">
              {isAnnual ? 'MoM Annualized Delta:' : 'MoM Difference:'}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono font-bold text-[11px] ${
                isMoMUp
                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : isMoMDown
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {isMoMUp ? '+' : ''}{formatBaseINR(data.diff)} ({data.diffPercent > 0 ? '+' : ''}{data.diffPercent}%)
            </span>
          </div>

          {/* Simulated cancellation gap */}
          {hasSimulation && data.savings > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3" />
                Simulated Run:
              </span>
              <span className="font-mono font-bold">
                {formatBaseINR(data.simulatedBurn)} (-{formatBaseINR(data.savings)})
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm transition-all w-full min-w-0 overflow-hidden">
      {/* Header with Title and Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {isAnnual ? 'Annualized Spend Run-Rate Trend (Last 6 Months)' : 'Monthly Spending Trend (Last 6 Months)'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {isAnnual ? 'Annualized' : 'Monthly'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAnnual 
                  ? 'Projected 365-day annual run-rate trajectory based on active subscriptions in each historical cycle'
                  : 'Total recurring wallet burn trajectory and month-over-month variance'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Quick Horizon Toggle if callback provided */}
          {onProjectionModeChange && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => onProjectionModeChange('monthly')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  !isAnnual
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => onProjectionModeChange('annual')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isAnnual
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Annual
              </button>
            </div>
          )}

          {/* View Switcher: Total Burn vs MoM Difference */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setViewMode('burn')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === 'burn'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isAnnual ? 'Annual Run-Rate' : 'Total Burn Line'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('diff')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === 'diff'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isAnnual ? 'Annual Delta (₹)' : 'MoM Delta (₹)'}
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Metric Callout Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Metric 1: Current Burn / Run-Rate */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
            {isAnnual ? 'Current Annual Run-Rate' : 'Current Month Burn'}
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
              {formatBaseINR(effectiveCurrentBurn)}
            </span>
            <span className="text-[10px] text-slate-400 font-sans">{isAnnual ? '/yr' : '/mo'}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono block mt-0.5 truncate">
            ≈ {getBreakdown(effectiveCurrentBurn).usd}
          </span>
        </div>

        {/* Metric 2: 6-Month Net Difference */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
            {isAnnual ? '6-Mo Delta (Annualized)' : '6-Month Net Delta'}
          </span>
          <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
            <span className={`text-lg sm:text-xl font-extrabold font-mono tabular-nums ${
              isIncrease 
                ? 'text-rose-600 dark:text-rose-400' 
                : isDecrease 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-slate-700 dark:text-slate-300'
            }`}>
              {isIncrease ? '+' : ''}{formatBaseINR(effectiveNetDelta)}
            </span>
            <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
              isIncrease 
                ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300' 
                : isDecrease 
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {isIncrease ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : isDecrease ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : null}
              {netDeltaPercent > 0 ? '+' : ''}{netDeltaPercent}%
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
            vs 6 months ago ({formatBaseINR(effectiveSixMonthsAgoBurn)})
          </span>
        </div>

        {/* Metric 3: Latest Month-Over-Month Variance */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
            {isAnnual ? 'Latest MoM Delta (Annual)' : 'Latest MoM Change'}
          </span>
          <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
            <span className={`text-lg sm:text-xl font-extrabold font-mono tabular-nums ${
              latestMoM > 0 
                ? 'text-rose-600 dark:text-rose-400' 
                : latestMoM < 0 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-slate-700 dark:text-slate-300'
            }`}>
              {latestMoM > 0 ? '+' : ''}{formatBaseINR(latestMoM)}
            </span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
              latestMoM > 0 
                ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300' 
                : latestMoM < 0 
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {latestMoMPct > 0 ? '+' : ''}{latestMoMPct}%
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
            vs previous month
          </span>
        </div>

        {/* Metric 4: 6-Month Average Burn */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
            {isAnnual ? '6-Mo Mean Annual Spend' : '6-Month Mean Burn'}
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
              {formatBaseINR(effectiveAverageBurn)}
            </span>
            <span className="text-[10px] text-slate-400 font-sans">{isAnnual ? '/yr' : '/mo'}</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
            Baseline mean outflow
          </span>
        </div>
      </div>

      {/* Main Recharts Line Chart Container */}
      <div className="w-full h-[280px] sm:h-[310px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
            onMouseMove={(e: any) => {
              if (e && e.activePayload && e.activePayload.length) {
                setHoveredMonth(e.activePayload[0].payload.name);
              }
            }}
            onMouseLeave={() => setHoveredMonth(null)}
          >
            <defs>
              {/* Gradient for Total Burn Line */}
              <linearGradient id="burnLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818CF8" />
                <stop offset="50%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>

              {/* Gradient for MoM Difference Line */}
              <linearGradient id="diffLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="50%" stopColor="#F43F5E" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>

              {/* Area Under-Glow */}
              <linearGradient id="burnAreaGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
              </linearGradient>
            </defs>

            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke={theme === 'dark' ? '#334155' : '#E2E8F0'} 
              strokeOpacity={0.6}
            />

            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={{ stroke: theme === 'dark' ? '#334155' : '#E2E8F0' }}
              tick={{
                fill: theme === 'dark' ? '#94A3B8' : '#64748B',
                fontSize: 11,
                fontWeight: 600,
              }}
              dy={8}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
              tick={{
                fill: theme === 'dark' ? '#94A3B8' : '#64748B',
                fontSize: 11,
                fontFamily: 'monospace',
              }}
              dx={-4}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Reference line for 6-Month Average */}
            <ReferenceLine
              y={effectiveAverageBurn}
              stroke="#94A3B8"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{
                value: `Avg: ${formatYAxis(effectiveAverageBurn)}`,
                position: 'right',
                fill: '#94A3B8',
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            {/* Target Budget Reference Line if set */}
            {effectiveTargetBudget && effectiveTargetBudget > 0 && (
              <ReferenceLine
                y={effectiveTargetBudget}
                stroke="#10B981"
                strokeDasharray="3 3"
                label={{
                  value: `Budget: ${formatYAxis(effectiveTargetBudget)}`,
                  position: 'insideTopLeft',
                  fill: '#10B981',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            )}

            {/* Primary Total Burn Line (or MoM difference line based on toggle) */}
            {viewMode === 'burn' ? (
              <Line
                type="monotone"
                dataKey="burn"
                name={isAnnual ? 'Annualized Run-Rate' : 'Total Monthly Burn'}
                stroke="url(#burnLineGrad)"
                strokeWidth={3}
                dot={{
                  r: 4.5,
                  fill: '#6366F1',
                  stroke: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 7,
                  fill: '#38BDF8',
                  stroke: '#FFFFFF',
                  strokeWidth: 2.5,
                }}
                isAnimationActive={true}
                animationDuration={900}
              />
            ) : (
              <Line
                type="monotone"
                dataKey="diff"
                name={isAnnual ? 'Annualized MoM Delta' : 'MoM Difference'}
                stroke="url(#diffLineGrad)"
                strokeWidth={3}
                dot={{
                  r: 4.5,
                  fill: '#F43F5E',
                  stroke: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 7,
                  fill: '#F59E0B',
                  stroke: '#FFFFFF',
                  strokeWidth: 2.5,
                }}
                isAnimationActive={true}
                animationDuration={900}
              />
            )}

            {/* Simulated Burn line if user has staged cancel simulations */}
            {hasSimulation && viewMode === 'burn' && (
              <Line
                type="monotone"
                dataKey="simulatedBurn"
                name={isAnnual ? 'Simulated Annualized Spend' : 'Simulated Staged Burn'}
                stroke="#10B981"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{
                  r: 3.5,
                  fill: '#10B981',
                  stroke: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                  strokeWidth: 1.5,
                }}
                activeDot={{
                  r: 6,
                  fill: '#10B981',
                  stroke: '#FFFFFF',
                  strokeWidth: 2,
                }}
                isAnimationActive={true}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 6-Month Breakdown Strip */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            6-Month Timeline Difference Matrix ({isAnnual ? 'Annualized Run-Rate' : 'Monthly Outflow'})
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Shows total {isAnnual ? 'annualized rate' : 'burn'} & variance at each month boundary
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full min-w-0">
          {trend.map((point, idx) => {
            const isLatest = idx === trend.length - 1;
            const isBase = idx === 0;
            const pointValue = point.totalBurn * multiplier;
            const pointDiff = point.diffFromPrev * multiplier;
            const isPointUp = pointDiff > 0;
            const isPointDown = pointDiff < 0;
            const isSelected = hoveredMonth === point.label;

            return (
              <div
                key={point.monthKey}
                className={`p-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                    : isLatest
                    ? 'border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/30 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {point.label}
                  </span>
                  {isLatest && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                      Now
                    </span>
                  )}
                </div>

                <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                  {formatBaseINR(pointValue)}{isAnnual ? <span className="text-[10px] font-normal text-slate-400 ml-0.5">/yr</span> : ''}
                </div>

                <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
                  {isBase ? (
                    <span className="text-slate-400 font-sans">Baseline</span>
                  ) : (
                    <span
                      className={`font-semibold ${
                        isPointUp
                          ? 'text-rose-600 dark:text-rose-400'
                          : isPointDown
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {isPointUp ? '+' : ''}{formatBaseINR(pointDiff)}
                    </span>
                  )}

                  <span className="text-slate-400 font-sans text-[10px]">
                    {point.activeCount} subs
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

