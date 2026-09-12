import React, { useState, useRef } from 'react';
import { CategoryExpense } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowUpRight, DollarSign } from 'lucide-react';

interface CategoryDonutChartProps {
  categories: CategoryExpense[];
  totalBurn: number;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  categories,
  totalBurn,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<CategoryExpense | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { formatBaseINR, format, getBreakdown, activeCurrency } = useCurrency();
  const { theme } = useTheme();

  // SVG parameters
  const size = 280;
  const strokeWidth = 36;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  if (categories.length === 0 || totalBurn <= 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-mono text-lg mb-3">
          ₹0
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
          No active subscriptions contributing to monthly burn.
        </p>
      </div>
    );
  }

  // Handle mouse move over SVG to position floating tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>, cat: CategoryExpense) => {
    if (!chartContainerRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setHoveredCategory(cat);
  };

  const handleMouseLeaveChart = () => {
    setHoveredCategory(null);
    setMousePos(null);
  };

  // Calculate cumulative offsets
  let accumulatedPercent = 0;

  return (
    <div 
      ref={chartContainerRef}
      className="relative flex flex-col lg:flex-row items-center gap-8 justify-between"
    >
      {/* Floating High-Contrast Tooltip */}
      {hoveredCategory && mousePos && (
        <div
          className="pointer-events-none absolute z-50 transform -translate-x-1/2 -translate-y-full mb-3 px-3.5 py-2.5 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 transition-transform duration-75 text-left min-w-[180px] bg-white dark:bg-[#0F172A]"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y - 12}px`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: hoveredCategory.color }}
              />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {hoveredCategory.category}
              </span>
            </div>
            <span
              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${hoveredCategory.color}20`,
                color: hoveredCategory.color,
              }}
            >
              {hoveredCategory.percentage.toFixed(1)}%
            </span>
          </div>

          {/* Pricing Info */}
          <div className="pt-2 space-y-1">
            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
              <span className="text-slate-500 dark:text-slate-400">Monthly Burn:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {formatBaseINR(hoveredCategory.monthlyAmount)}
              </span>
            </div>

            {/* Global conversions */}
            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <span>USD ($):</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {getBreakdown(hoveredCategory.monthlyAmount).usd}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>{hoveredCategory.count} active subscription{hoveredCategory.count === 1 ? '' : 's'}</span>
              <span className="text-indigo-500 dark:text-indigo-400 font-medium">
                {formatBaseINR(hoveredCategory.annualAmount)}/yr
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Donut Chart SVG */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
          onMouseLeave={handleMouseLeaveChart}
        >
          <defs>
            {categories.map((cat, idx) => (
              <linearGradient
                key={`grad-${cat.category}-${idx}`}
                id={`grad-${cat.category.replace(/[^a-zA-Z0-9]/g, '')}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={cat.color} stopOpacity="1" />
                <stop offset="100%" stopColor={cat.color} stopOpacity="0.75" />
              </linearGradient>
            ))}
          </defs>

          {/* Background circle track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={theme === 'dark' ? '#1E293B' : '#E2E8F0'}
            strokeWidth={strokeWidth}
          />

          {categories.map((cat) => {
            const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
            accumulatedPercent += cat.percentage;

            const isHovered = hoveredCategory?.category === cat.category;
            const gradId = `url(#grad-${cat.category.replace(/[^a-zA-Z0-9]/g, '')})`;

            return (
              <circle
                key={cat.category}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={gradId}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-200 cursor-pointer"
                style={{
                  filter: isHovered
                    ? `drop-shadow(0 0 10px ${cat.color}90)`
                    : 'none',
                }}
                onMouseMove={(e) => handleMouseMove(e, cat)}
                onMouseEnter={(e) => handleMouseMove(e, cat)}
              />
            );
          })}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">
            {hoveredCategory ? hoveredCategory.category : 'Monthly Burn'}
          </span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono tabular-nums mt-0.5">
            {formatBaseINR(hoveredCategory ? hoveredCategory.monthlyAmount : totalBurn)}
          </span>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
            {hoveredCategory
              ? `${hoveredCategory.percentage.toFixed(1)}% of total`
              : `${categories.length} categories`}
          </span>
        </div>
      </div>

      {/* Categories Legend List */}
      <div className="w-full flex-1 space-y-2.5">
        {categories.map((cat) => {
          const isHovered = hoveredCategory?.category === cat.category;
          return (
            <div
              key={cat.category}
              onMouseEnter={() => setHoveredCategory(cat)}
              onMouseLeave={() => setHoveredCategory(null)}
              className={`p-2.5 rounded-xl transition-all cursor-pointer border ${
                isHovered
                  ? 'bg-slate-100 dark:bg-slate-800 border-indigo-500 shadow-sm'
                  : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {cat.category}
                  </span>
                  <span className="text-slate-400 text-[11px]">({cat.count})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-bold">
                    {formatBaseINR(cat.monthlyAmount)}/mo
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono w-10 text-right">
                    {cat.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Progress bar with soft color blend */}
              <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
