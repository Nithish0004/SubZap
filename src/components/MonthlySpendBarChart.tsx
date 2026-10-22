import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Sparkles,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Target
} from 'lucide-react';
import { Subscription } from '../types';
import { calculateMonthlySpendingTrend } from '../utils/calculations';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';

interface MonthlySpendBarChartProps {
  subscriptions: Subscription[];
  simulatedCancelledIds?: Set<string>;
  targetBudget?: number;
  projectionMode?: 'monthly' | 'annual';
  onProjectionModeChange?: (mode: 'monthly' | 'annual') => void;
  onSelectMonth?: (monthLabel: string) => void;
}

export const MonthlySpendBarChart: React.FC<MonthlySpendBarChartProps> = ({
  subscriptions,
  simulatedCancelledIds = new Set<string>(),
  targetBudget,
  projectionMode = 'monthly',
  onProjectionModeChange,
  onSelectMonth,
}) => {
  const { formatBaseINR, getBreakdown } = useCurrency();
  const { theme } = useTheme();
  const [metricMode, setMetricMode] = useState<'burn' | 'diff'>('burn');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const isAnnual = projectionMode === 'annual';
  const multiplier = isAnnual ? 12 : 1;
  const hasSimulation = simulatedCancelledIds.size > 0;

  // Compute 6-month spending trend data
  const summary = calculateMonthlySpendingTrend(subscriptions, simulatedCancelledIds);
  const { trend, currentBurn, sixMonthsAgoBurn, netDelta, netDeltaPercent, averageBurn, peakMonth, lowestMonth } = summary;

  // Effective values reflecting Monthly vs Annual selection
  const effectiveCurrentBurn = currentBurn * multiplier;
  const effectiveSixMonthsAgoBurn = sixMonthsAgoBurn * multiplier;
  const effectiveNetDelta = netDelta * multiplier;
  const effectiveAverageBurn = averageBurn * multiplier;
  const effectiveTargetBudget = targetBudget ? targetBudget * multiplier : undefined;

  // Chart data formatted for Recharts
  const chartData = trend.map((point, index) => {
    const burn = point.totalBurn * multiplier;
    const diff = point.diffFromPrev * multiplier;
    const isPeak = point.fullLabel === peakMonth.label;
    const isLowest = point.fullLabel === lowestMonth.label;
    const isExceedingBudget = effectiveTargetBudget && effectiveTargetBudget > 0 && burn > effectiveTargetBudget;

    return {
      index,
      name: point.label,
      fullLabel: point.fullLabel,
      burn,
      simulatedBurn: point.simulatedBurn * multiplier,
      diff,
      diffPercent: point.diffPercent,
      activeCount: point.activeCount,
      savings: point.cumulativeSavings * multiplier,
      isPeak,
      isLowest,
      isExceedingBudget,
    };
  });

  const isIncrease = netDelta > 0;
  const isDecrease = netDelta < 0;

  const latestMoM = (trend[trend.length - 1]?.diffFromPrev || 0) * multiplier;
  const latestMoMPct = trend[trend.length - 1]?.diffPercent || 0;

  // Format tick numbers on Y Axis (e.g. ₹5k, ₹1.2L)
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

  // Custom Recharts Tooltip for Bar Chart
  const CustomBarTooltip = ({ active, payload }: any) => {
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
            {data.activeCount} active subs
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-slate-500 dark:text-slate-400">
              {isAnnual ? 'Projected Annual Run-Rate:' : 'Monthly Outflow:'}
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

          {/* Month-over-Month difference */}
          {data.diff !== 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">MoM Variance:</span>
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
          )}

          {/* Target Budget Comparison */}
          {effectiveTargetBudget && effectiveTargetBudget > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
              <span className="text-slate-400">Budget Limit:</span>
              <span className={`font-mono font-semibold ${data.isExceedingBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {data.isExceedingBudget ? 'Over Budget' : 'Within Budget'}
              </span>
            </div>
          )}

          {/* Simulated cancellation savings if active */}
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

  // Determine bar fill color based on state
  const getBarColor = (entry: typeof chartData[0], isHovered: boolean) => {
    if (entry.isExceedingBudget) {
      return isHovered ? '#E11D48' : '#F43F5E'; // Rose / Red if exceeding budget ceiling
    }
    if (entry.isPeak) {
      return isHovered ? '#4338CA' : '#4F46E5'; // Darker Indigo for Peak Month
    }
    if (entry.index === chartData.length - 1) {
      return isHovered ? '#4F46E5' : '#6366F1'; // Current Month Indigo
    }
    return isHovered ? '#6366F1' : '#818CF8'; // Muted Indigo/Sky for prior months
  };

  return (
    <div 
      id="monthly-spend-bar-chart-card"
      className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm transition-all w-full min-w-0 overflow-hidden"
    >
      {/* Header Bar: Title, Horizon Toggle & Metric Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {isAnnual ? 'Annualized Outflow Bar Chart (Last 6 Months)' : 'Monthly Subscription Spend Trend (Last 6 Months)'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Recharts Bar View
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                  {isAnnual ? 'Annual Projections' : 'Monthly Recurring'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAnnual 
                  ? 'Visualizing 6-month historical run-rate columns annualized to 365-day commitments' 
                  : 'Column trajectory of normalized monthly subscription wallet burn across active billing cycles'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Horizon Switcher Button */}
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

          {/* Metric View Switcher: Spend Burn vs MoM Difference */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setMetricMode('burn')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                metricMode === 'burn'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isAnnual ? 'Annualized Spend' : 'Monthly Burn (₹)'}
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('diff')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                metricMode === 'diff'
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
        {/* Tile 1: Current Burn / Run-Rate */}
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

        {/* Tile 2: 6-Month Net Delta */}
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

        {/* Tile 3: Latest Month-over-Month Change */}
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

        {/* Tile 4: 6-Month Average Burn */}
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

      {/* Main Recharts Bar Chart Container */}
      <div className="w-full h-[280px] sm:h-[310px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
            onMouseMove={(state: any) => {
              if (state && state.activeTooltipIndex !== undefined) {
                setHoveredBarIndex(state.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setHoveredBarIndex(null)}
          >
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

            <Tooltip content={<CustomBarTooltip />} />

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
                  value: `Budget Ceiling: ${formatYAxis(effectiveTargetBudget)}`,
                  position: 'insideTopLeft',
                  fill: '#10B981',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            )}

            {/* Primary Monthly Spend Bars */}
            <Bar
              dataKey={metricMode === 'burn' ? 'burn' : 'diff'}
              radius={[8, 8, 0, 0]}
              maxBarSize={48}
              onClick={(entry) => {
                if (entry && onSelectMonth) {
                  onSelectMonth(entry.fullLabel);
                }
              }}
              className="cursor-pointer transition-all duration-300"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`bar-cell-${index}`} 
                  fill={getBarColor(entry, hoveredBarIndex === index)} 
                />
              ))}
            </Bar>

            {/* Simulated Savings Bar (when staging cancellations) */}
            {hasSimulation && (
              <Bar
                dataKey="savings"
                fill="#10B981"
                radius={[8, 8, 0, 0]}
                maxBarSize={28}
                opacity={0.8}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Legend & Peak/Lowest Month Highlights */}
      <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />
            <span>Monthly Burn</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-700 dark:bg-indigo-600 inline-block" />
            <span>Peak Month ({peakMonth.label})</span>
          </div>

          {effectiveTargetBudget && effectiveTargetBudget > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-b border-dashed border-emerald-500 inline-block" />
              <span>Target Budget ({formatYAxis(effectiveTargetBudget)})</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b border-dashed border-slate-400 inline-block" />
            <span>6-Mo Average ({formatYAxis(effectiveAverageBurn)})</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span>
            Peak: <strong className="text-slate-900 dark:text-white font-bold">{peakMonth.label}</strong> ({formatBaseINR(peakMonth.amount * multiplier)})
          </span>
          <span>•</span>
          <span>
            Lowest: <strong className="text-slate-900 dark:text-white font-bold">{lowestMonth.label}</strong> ({formatBaseINR(lowestMonth.amount * multiplier)})
          </span>
        </div>
      </div>
    </div>
  );
};
