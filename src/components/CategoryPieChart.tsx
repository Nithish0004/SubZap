import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Sector
} from 'recharts';
import { CategoryExpense, Subscription } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import { Layers, PieChart as PieChartIcon, CircleDot, Tag, Sparkles } from 'lucide-react';

interface CategoryPieChartProps {
  categories: CategoryExpense[];
  totalBurn: number;
  subscriptions?: Subscription[];
}

// Custom Active Shape for high-impact hover interaction
const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
  } = props;

  return (
    <g>
      {/* Outer subtle glow circle */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: `drop-shadow(0 0 10px ${fill}90)`,
          opacity: 0.95,
          cursor: 'pointer',
          transition: 'all 0.3s ease-out'
        }}
      />
      {/* Accent corner ring */}
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 11}
        outerRadius={outerRadius + 13}
        fill={fill}
      />
    </g>
  );
};

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  categories,
  totalBurn,
  subscriptions = []
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [metricMode, setMetricMode] = useState<'monthly' | 'count'>('monthly');
  const [chartStyle, setChartStyle] = useState<'donut' | 'pie'>('donut');
  const { formatBaseINR, getBreakdown } = useCurrency();
  const { theme } = useTheme();

  // If no data
  if (categories.length === 0 || totalBurn <= 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 w-full min-h-[300px]">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
          <PieChartIcon className="w-7 h-7 stroke-1" />
        </div>
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Subscriptions Available</h4>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-xs">
          Add subscriptions across categories (Entertainment, Software, Utility, etc.) to visualize monthly burn distribution.
        </p>
      </div>
    );
  }

  // Calculate total count of subscriptions across categories
  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

  // Prepare recharts data
  const chartData = categories.map((cat, idx) => ({
    name: cat.category,
    value: metricMode === 'monthly' ? cat.monthlyAmount : cat.count,
    monthlyAmount: cat.monthlyAmount,
    annualAmount: cat.annualAmount,
    count: cat.count,
    percentage: metricMode === 'monthly' 
      ? cat.percentage 
      : totalCount > 0 ? (cat.count / totalCount) * 100 : 0,
    color: cat.color,
    index: idx
  }));

  const activeCategory = activeIndex !== null && chartData[activeIndex] ? chartData[activeIndex] : null;

  // Custom Recharts Tooltip Component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700/80 text-left min-w-[210px] pointer-events-none z-50">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: data.color }}
              />
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {data.name}
              </span>
            </div>
            <span
              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
              style={{
                backgroundColor: `${data.color}20`,
                color: data.color,
              }}
            >
              {data.percentage.toFixed(1)}%
            </span>
          </div>

          <div className="pt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
              <span className="text-slate-500 dark:text-slate-400">Monthly Burn:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {formatBaseINR(data.monthlyAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <span>Approx. USD:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {getBreakdown(data.monthlyAmount).usd}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1 font-medium">
                <Tag className="w-3 h-3 text-slate-400" />
                {data.count} active sub{data.count === 1 ? '' : 's'}
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                {formatBaseINR(data.annualAmount)}/yr
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Sub-header controls: Metric switcher (Monthly Spend vs Count) & Chart style (Donut vs Full Pie) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMetricMode('monthly')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              metricMode === 'monthly'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            By Monthly Burn (₹)
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('count')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              metricMode === 'count'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            By Sub Count ({totalCount})
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setChartStyle('donut')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              chartStyle === 'donut'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Donut format with center KPI"
          >
            <CircleDot className="w-3 h-3" />
            <span>Donut</span>
          </button>
          <button
            type="button"
            onClick={() => setChartStyle('pie')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              chartStyle === 'pie'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Classic solid pie chart"
          >
            <PieChartIcon className="w-3 h-3" />
            <span>Solid Pie</span>
          </button>
        </div>
      </div>

      {/* Main Chart Area + Interactive Legend */}
      <div className="flex flex-col md:flex-row items-center gap-6 lg:gap-8 justify-between w-full min-w-0">
        {/* Recharts PieChart Container */}
        <div className="relative flex items-center justify-center w-full max-w-[240px] sm:max-w-[270px] lg:max-w-[290px] aspect-square mx-auto shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex !== null ? activeIndex : undefined}
                activeShape={renderActiveShape}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={chartStyle === 'donut' ? '60%' : 0}
                outerRadius="85%"
                paddingAngle={chartStyle === 'donut' ? 2 : 1}
                dataKey="value"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                animationDuration={600}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${entry.name}-${index}`} 
                    fill={entry.color}
                    stroke={theme === 'dark' ? '#0f172a' : '#ffffff'}
                    strokeWidth={2}
                    className="cursor-pointer transition-opacity duration-200"
                    style={{
                      opacity: activeIndex === null || activeIndex === index ? 1 : 0.45
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Central KPI overlay for Donut chart mode */}
          {chartStyle === 'donut' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[140px]">
                {activeCategory ? activeCategory.name : (metricMode === 'monthly' ? 'Monthly Burn' : 'Total Subs')}
              </span>
              <span className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono tabular-nums mt-0.5">
                {activeCategory 
                  ? (metricMode === 'monthly' ? formatBaseINR(activeCategory.monthlyAmount) : `${activeCategory.count} subs`)
                  : (metricMode === 'monthly' ? formatBaseINR(totalBurn) : `${totalCount} subs`)}
              </span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                {activeCategory
                  ? `${activeCategory.percentage.toFixed(1)}% of total`
                  : `${categories.length} categories`}
              </span>
            </div>
          )}
        </div>

        {/* Category Legend & Breakdown List */}
        <div className="w-full min-w-0 flex-1 space-y-2">
          {categories.map((cat, idx) => {
            const isHovered = activeIndex === idx;
            const pct = metricMode === 'monthly' 
              ? cat.percentage 
              : totalCount > 0 ? (cat.count / totalCount) * 100 : 0;

            return (
              <div
                key={cat.category}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                className={`p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer border ${
                  isHovered
                    ? 'bg-slate-100 dark:bg-slate-800 border-indigo-500 shadow-sm scale-[1.01]'
                    : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5 gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
                    <span
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {cat.category}
                    </span>
                    <span className="text-slate-400 text-[11px] shrink-0 font-mono">
                      ({cat.count} sub{cat.count === 1 ? '' : 's'})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-bold">
                      {metricMode === 'monthly' ? formatBaseINR(cat.monthlyAmount) : `${cat.count} (${pct.toFixed(0)}%)`}
                    </span>
                    {metricMode === 'monthly' && (
                      <span className="text-slate-500 dark:text-slate-400 font-mono w-8 sm:w-9 text-right text-[11px]">
                        {pct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Micro Category Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
