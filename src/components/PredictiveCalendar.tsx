import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  AlertCircle, 
  X, 
  ExternalLink,
  PauseCircle,
  PlayCircle,
  Edit3,
  Clock,
  DollarSign,
  Flame,
  Layers,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Info,
  Filter,
  ArrowUpRight
} from 'lucide-react';
import { Subscription } from '../types';
import { CATEGORY_COLORS, formatINR, getCountdownBadge, getDaysUntil } from '../utils/calculations';
import { useCurrency } from '../context/CurrencyContext';
import { BrandLogo } from './BrandLogo';
import { MultiCurrencyTooltip } from './MultiCurrencyTooltip';

interface PredictiveCalendarProps {
  subscriptions: Subscription[];
  onTogglePause: (id: string) => void;
  onEditClick: (sub: Subscription) => void;
}

interface CalendarCell {
  dayNumber: number;
  dateKey: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  renewals: Subscription[];
  dayTotalOutflow: number;
  unpausedCount: number;
  heatLevel: number; // 0: zero, 1: low (<500), 2: moderate (500-1500), 3: high (1500-3500), 4: peak (>3500)
}

type ViewMode = 'heatmap' | 'grid';
type HeatmapFilter = 'all' | 'outflow_only' | 'peak_only';

/**
 * Determine if a subscription renews on a target date key (YYYY-MM-DD),
 * matching exact date or projecting recurring weekly/monthly/yearly schedule.
 */
function doesRenewOnDate(sub: Subscription, targetDateKey: string): boolean {
  if (sub.nextRenewalDate === targetDateKey) return true;
  if (!sub.nextRenewalDate) return false;

  const base = new Date(sub.nextRenewalDate + 'T00:00:00');
  const target = new Date(targetDateKey + 'T00:00:00');
  if (isNaN(base.getTime()) || isNaN(target.getTime())) return false;

  const cycle = sub.billingCycle || 'monthly';
  if (cycle === 'monthly') {
    const baseDay = base.getDate();
    const targetDay = target.getDate();
    const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    const effectiveDay = Math.min(baseDay, daysInTargetMonth);
    return targetDay === effectiveDay;
  }
  if (cycle === 'yearly') {
    return base.getDate() === target.getDate() && base.getMonth() === target.getMonth();
  }
  if (cycle === 'weekly') {
    const diffDays = Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays % 7 === 0;
  }
  return false;
}

/**
 * Categorize outflow into 5 distinct heat intensity tiers (0 to 4)
 */
function calculateHeatLevel(outflow: number, maxOutflowInMonth: number): number {
  if (outflow <= 0) return 0;
  // Peak surge if > ₹3500 or exceeds 80% of max billing day (when max is significant)
  if (outflow >= 3500 || (maxOutflowInMonth >= 2000 && outflow >= maxOutflowInMonth * 0.85)) {
    return 4;
  }
  if (outflow >= 1500) return 3;
  if (outflow >= 500) return 2;
  return 1;
}

export const PredictiveCalendar: React.FC<PredictiveCalendarProps> = ({
  subscriptions,
  onTogglePause,
  onEditClick,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  const [heatmapFilter, setHeatmapFilter] = useState<HeatmapFilter>('all');

  const { formatBaseINR, getBreakdown } = useCurrency();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDayDate(null);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calendar cells builder with recurring renewals and cash outflow calculation
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const rawCells: Array<{
      dayNumber: number;
      dateKey: string;
      isCurrentMonth: boolean;
      renewals: Subscription[];
      dayTotalOutflow: number;
      unpausedCount: number;
    }> = [];

    // Prev month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      const dateKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const renewals = subscriptions.filter((s) => doesRenewOnDate(s, dateKey));
      const unpaused = renewals.filter((s) => !s.isPaused);
      const dayTotalOutflow = unpaused.reduce((sum, s) => sum + s.cost, 0);

      rawCells.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: false,
        renewals,
        dayTotalOutflow,
        unpausedCount: unpaused.length,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const renewals = subscriptions.filter((s) => doesRenewOnDate(s, dateKey));
      const unpaused = renewals.filter((s) => !s.isPaused);
      const dayTotalOutflow = unpaused.reduce((sum, s) => sum + s.cost, 0);

      rawCells.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: true,
        renewals,
        dayTotalOutflow,
        unpausedCount: unpaused.length,
      });
    }

    // Next month padding to round off grid to multiples of 7
    const remaining = (7 - (rawCells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const renewals = subscriptions.filter((s) => doesRenewOnDate(s, dateKey));
      const unpaused = renewals.filter((s) => !s.isPaused);
      const dayTotalOutflow = unpaused.reduce((sum, s) => sum + s.cost, 0);

      rawCells.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: false,
        renewals,
        dayTotalOutflow,
        unpausedCount: unpaused.length,
      });
    }

    // Determine max outflow in the current month for proportional scaling
    const maxOutflow = Math.max(
      0,
      ...rawCells.filter((c) => c.isCurrentMonth).map((c) => c.dayTotalOutflow)
    );

    // Attach heat levels
    return rawCells.map((cell) => ({
      ...cell,
      heatLevel: calculateHeatLevel(cell.dayTotalOutflow, maxOutflow),
    }));
  }, [year, month, subscriptions]);

  // Aggregate stats for this month
  const currentMonthCells = useMemo(
    () => calendarCells.filter((c) => c.isCurrentMonth),
    [calendarCells]
  );

  const totalMonthSpend = useMemo(() => {
    return currentMonthCells.reduce((sum, cell) => sum + cell.dayTotalOutflow, 0);
  }, [currentMonthCells]);

  const monthRenewalsCount = useMemo(() => {
    return currentMonthCells.reduce((sum, cell) => sum + cell.unpausedCount, 0);
  }, [currentMonthCells]);

  // Heatmap Peak Analytics
  const heatmapAnalytics = useMemo(() => {
    const activeDays = currentMonthCells.filter((c) => c.dayTotalOutflow > 0);
    const sorted = [...activeDays].sort((a, b) => b.dayTotalOutflow - a.dayTotalOutflow);
    const peakDay = sorted[0] || null;
    const maxOutflow = peakDay ? peakDay.dayTotalOutflow : 0;

    // Top 3 billing concentration
    const top3Days = sorted.slice(0, 3);
    const top3Spend = top3Days.reduce((sum, c) => sum + c.dayTotalOutflow, 0);
    const top3Concentration = totalMonthSpend > 0 ? Math.round((top3Spend / totalMonthSpend) * 100) : 0;

    // Weekly distribution breakdown
    const week1Spend = currentMonthCells.filter((c) => c.dayNumber >= 1 && c.dayNumber <= 7).reduce((sum, c) => sum + c.dayTotalOutflow, 0);
    const week2Spend = currentMonthCells.filter((c) => c.dayNumber >= 8 && c.dayNumber <= 14).reduce((sum, c) => sum + c.dayTotalOutflow, 0);
    const week3Spend = currentMonthCells.filter((c) => c.dayNumber >= 15 && c.dayNumber <= 21).reduce((sum, c) => sum + c.dayTotalOutflow, 0);
    const week4Spend = currentMonthCells.filter((c) => c.dayNumber >= 22).reduce((sum, c) => sum + c.dayTotalOutflow, 0);

    const weeklyBreakdown = [
      { week: 'Week 1 (Days 1–7)', spend: week1Spend },
      { week: 'Week 2 (Days 8–14)', spend: week2Spend },
      { week: 'Week 3 (Days 15–21)', spend: week3Spend },
      { week: 'Week 4+ (Days 22+)', spend: week4Spend },
    ].sort((a, b) => b.spend - a.spend);

    const heaviestWeek = weeklyBreakdown[0];

    const activeDaysCount = activeDays.length;
    const dailyAvgOnActive = activeDaysCount > 0 ? Math.round(totalMonthSpend / activeDaysCount) : 0;

    return {
      peakDay,
      maxOutflow,
      top3Concentration,
      top3Spend,
      top3Days,
      activeDaysCount,
      dailyAvgOnActive,
      heaviestWeek,
      peakTiersCount: {
        peak: currentMonthCells.filter((c) => c.heatLevel === 4).length,
        high: currentMonthCells.filter((c) => c.heatLevel === 3).length,
        moderate: currentMonthCells.filter((c) => c.heatLevel === 2).length,
        low: currentMonthCells.filter((c) => c.heatLevel === 1).length,
        zero: currentMonthCells.filter((c) => c.heatLevel === 0).length,
      }
    };
  }, [currentMonthCells, totalMonthSpend]);

  // Selected Day Details
  const selectedCell = calendarCells.find((c) => c.dateKey === selectedDayDate);
  const selectedDayRenewals = selectedCell?.renewals || [];
  const selectedDayTotal = selectedDayRenewals
    .filter((s) => !s.isPaused)
    .reduce((sum, s) => sum + s.cost, 0);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300 w-full min-w-0 max-w-full">
      {/* Calendar Header & View Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm w-full min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 shrink-0">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Cash Outflow Radar
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20 shrink-0">
              <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
              Monthly Financial Heatmap
            </span>
            <span className="text-xs font-mono text-slate-400 shrink-0">
              {monthRenewalsCount} Active Renewal{monthRenewalsCount === 1 ? '' : 's'}
            </span>
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
            {monthNames[month]} {year}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Total projected monthly outflow:{' '}
            <strong className="text-slate-900 dark:text-white font-mono font-bold">
              {formatBaseINR(totalMonthSpend)}
            </strong>{' '}
            <span className="text-slate-400 font-mono">
              (≈ {getBreakdown(totalMonthSpend).usd})
            </span>
          </p>
        </div>

        {/* View Switcher and Navigation Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              id="view-mode-heatmap-btn"
              onClick={() => setViewMode('heatmap')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === 'heatmap'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${viewMode === 'heatmap' ? 'text-rose-500 fill-rose-500' : ''}`} />
              <span>Financial Heatmap</span>
            </button>
            <button
              id="view-mode-grid-btn"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Detailed Grid</span>
            </button>
          </div>

          {/* Month Steppers */}
          <button
            id="cal-today-btn"
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
            <button
              id="cal-prev-month-btn"
              onClick={prevMonth}
              aria-label="Previous month"
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 min-w-[36px] text-center">
              {monthNames[month].slice(0, 3)}
            </span>
            <button
              id="cal-next-month-btn"
              onClick={nextMonth}
              aria-label="Next month"
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Financial Heatmap Insights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Peak Billing Day */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50/70 via-white to-red-50/40 dark:from-rose-950/20 dark:via-slate-900 dark:to-red-950/10 border border-rose-200/80 dark:border-rose-900/50 shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
              Peak Outflow Day
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 uppercase">
              Surge
            </span>
          </div>
          {heatmapAnalytics.peakDay ? (
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                {formatBaseINR(heatmapAnalytics.peakDay.dayTotalOutflow)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {monthNames[month]} {heatmapAnalytics.peakDay.dayNumber} ({heatmapAnalytics.peakDay.unpausedCount} subscription{heatmapAnalytics.peakDay.unpausedCount === 1 ? '' : 's'})
              </p>
            </div>
          ) : (
            <div className="text-sm font-semibold text-slate-400 dark:text-slate-500 mt-2">
              No outflow scheduled
            </div>
          )}
        </div>

        {/* Card 2: Concentration Risk */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Top-3 Day Concentration
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
              heatmapAnalytics.top3Concentration > 70
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
            }`}>
              {heatmapAnalytics.top3Concentration}% of spend
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {formatBaseINR(heatmapAnalytics.top3Spend)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Concentrated in top {Math.min(3, heatmapAnalytics.activeDaysCount)} billing dates
          </p>
        </div>

        {/* Card 3: Active Billing Days & Daily Average */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Active Days Average
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
              {heatmapAnalytics.activeDaysCount} / {currentMonthCells.length} Days
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {formatBaseINR(heatmapAnalytics.dailyAvgOnActive)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Average charge on days with active renewals
          </p>
        </div>

        {/* Card 4: Heaviest Liquidity Window */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Heaviest Week Outflow
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
              Peak Window
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {formatBaseINR(heatmapAnalytics.heaviestWeek.spend)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {heatmapAnalytics.heaviestWeek.week}
          </p>
        </div>
      </div>

      {/* Heatmap Filter Pills (in Heatmap View) */}
      {viewMode === 'heatmap' && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              Heatmap Filter:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                id="cal-filter-all"
                onClick={() => setHeatmapFilter('all')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  heatmapFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Days ({currentMonthCells.length})
              </button>
              <button
                id="cal-filter-outflow"
                onClick={() => setHeatmapFilter('outflow_only')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  heatmapFilter === 'outflow_only'
                    ? 'bg-amber-600 text-white dark:bg-amber-500 dark:text-slate-950 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Billing Days Only ({heatmapAnalytics.activeDaysCount})
              </button>
              <button
                id="cal-filter-peak"
                onClick={() => setHeatmapFilter('peak_only')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  heatmapFilter === 'peak_only'
                    ? 'bg-rose-600 text-white dark:bg-rose-500 dark:text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Flame className="w-3 h-3 fill-current" />
                Peak & High Surges ({heatmapAnalytics.peakTiersCount.peak + heatmapAnalytics.peakTiersCount.high})
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Click any calendar day to inspect detailed breakdown & pause options
          </div>
        </div>
      )}

      {/* Main Calendar Grid Canvas */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl w-full max-w-full">
        <div className="overflow-x-auto w-full max-w-full">
          <div className="min-w-[620px] sm:min-w-full">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-center py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/60">
              {calendarCells.map((cell, idx) => {
                const isToday = cell.dateKey === todayStr;
                const hasRenewals = cell.renewals.length > 0;
                const isSelected = selectedDayDate === cell.dateKey;
                const hasTrialExpiry = cell.renewals.some((s) => Boolean(s.trialExpiryDate));
                const outflow = cell.dayTotalOutflow;
                const isPeak = cell.heatLevel === 4;
                const isHigh = cell.heatLevel === 3;
                const isModerate = cell.heatLevel === 2;
                const isLow = cell.heatLevel === 1;
                const isZero = cell.heatLevel === 0;

                // Filtering check
                const isDimmed = 
                  viewMode === 'heatmap' && 
                  ((heatmapFilter === 'outflow_only' && outflow <= 0) ||
                   (heatmapFilter === 'peak_only' && cell.heatLevel < 3));

                // Heatmap dynamic styling based on level
                let heatCellClasses = 'bg-white dark:bg-slate-900/40 text-slate-800 dark:text-slate-200';
                if (viewMode === 'heatmap') {
                  if (!cell.isCurrentMonth) {
                    heatCellClasses = 'bg-slate-50/30 dark:bg-slate-950/20 text-slate-400 dark:text-slate-600 opacity-60';
                  } else if (isPeak) {
                    heatCellClasses = 'bg-gradient-to-br from-rose-50 via-rose-100/90 to-red-100/80 dark:from-rose-950/70 dark:via-red-950/50 dark:to-slate-900 border-rose-300 dark:border-rose-600/80 text-rose-950 dark:text-rose-100 shadow-sm';
                  } else if (isHigh) {
                    heatCellClasses = 'bg-orange-50/90 dark:bg-orange-950/40 text-orange-950 dark:text-orange-100 border-orange-200/90 dark:border-orange-700/60';
                  } else if (isModerate) {
                    heatCellClasses = 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-700/50';
                  } else if (isLow) {
                    heatCellClasses = 'bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800/40';
                  } else {
                    heatCellClasses = 'bg-slate-50/40 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400';
                  }
                } else {
                  // Detailed grid view styling
                  if (!cell.isCurrentMonth) {
                    heatCellClasses = 'bg-slate-50/50 dark:bg-slate-950/30 text-slate-400 dark:text-slate-600';
                  } else {
                    heatCellClasses = 'bg-white dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60';
                  }
                }

                // Relative outflow progress bar percentage
                const outflowPercent = heatmapAnalytics.maxOutflow > 0
                  ? Math.min(100, Math.round((outflow / heatmapAnalytics.maxOutflow) * 100))
                  : 0;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDayDate(cell.dateKey)}
                    className={`min-h-[118px] sm:min-h-[138px] p-2 sm:p-2.5 flex flex-col justify-between transition-all cursor-pointer select-none group relative ${heatCellClasses} ${
                      isDimmed ? 'opacity-25 grayscale-[30%]' : 'opacity-100'
                    } ${
                      isToday
                        ? 'ring-2 ring-inset ring-indigo-500 dark:ring-indigo-400'
                        : ''
                    } ${
                      isSelected ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 shadow-lg z-10' : ''
                    } ${
                      isPeak && viewMode === 'heatmap' ? 'ring-1 sm:ring-2 ring-rose-400 dark:ring-rose-500' : ''
                    }`}
                  >
                    {/* Animated pulse indicator when renewal is due today */}
                    {hasRenewals && isToday && (
                      <span className="absolute inset-0 border-2 border-rose-500/70 rounded-none pointer-events-none animate-pulse" />
                    )}

                    {/* Cell Top Header */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-mono font-bold rounded-full w-6 h-6 flex items-center justify-center transition-all ${
                            isToday
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                              : !cell.isCurrentMonth
                              ? 'text-slate-400 dark:text-slate-600'
                              : isPeak && viewMode === 'heatmap'
                              ? 'bg-rose-600 text-white font-black'
                              : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {isPeak && viewMode === 'heatmap' && cell.isCurrentMonth && (
                          <span className="flex items-center gap-0.5 text-[9px] font-extrabold uppercase px-1 py-0.5 rounded bg-rose-600 text-white tracking-wider animate-pulse">
                            <Flame className="w-2.5 h-2.5 fill-white" />
                            Peak
                          </span>
                        )}
                      </div>

                      {/* Day outflow badge */}
                      {outflow > 0 && (
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded truncate max-w-[70px] ${
                            isPeak && viewMode === 'heatmap'
                              ? 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 font-extrabold'
                              : isHigh && viewMode === 'heatmap'
                              ? 'bg-orange-200/90 dark:bg-orange-900/70 text-orange-900 dark:text-orange-100'
                              : isModerate && viewMode === 'heatmap'
                              ? 'bg-amber-200/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {formatBaseINR(outflow)}
                        </span>
                      )}
                    </div>

                    {/* Heatmap View Specific Content */}
                    {viewMode === 'heatmap' ? (
                      <div className="space-y-1.5 flex-1 flex flex-col justify-end mt-1">
                        {outflow > 0 ? (
                          <div className="space-y-1">
                            {/* Proportional Burn Bar */}
                            <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isPeak
                                    ? 'bg-gradient-to-r from-rose-500 to-red-600'
                                    : isHigh
                                    ? 'bg-orange-500'
                                    : isModerate
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.max(12, outflowPercent)}%` }}
                              />
                            </div>

                            {/* Active subscriptions avatar stack */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex -space-x-1 overflow-hidden">
                                {cell.renewals.filter((s) => !s.isPaused).slice(0, 3).map((sub) => (
                                  <div
                                    key={sub.id}
                                    title={`${sub.name} - ${formatBaseINR(sub.cost)}`}
                                    className="shrink-0"
                                  >
                                    <BrandLogo
                                      name={sub.name}
                                      domain={sub.domain}
                                      logoUrl={sub.logoUrl}
                                      size="xs"
                                      categoryColor={CATEGORY_COLORS[sub.category]}
                                      className="ring-1 ring-white dark:ring-slate-900"
                                    />
                                  </div>
                                ))}
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
                                {cell.unpausedCount} sub{cell.unpausedCount === 1 ? '' : 's'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 dark:text-slate-600 font-mono text-center py-1">
                            ₹0 Outflow
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Detailed Grid View (Existing Rich Event Pills) */
                      <div className="space-y-1.5 flex-1 overflow-hidden">
                        {cell.renewals.slice(0, 3).map((sub) => {
                          const color = CATEGORY_COLORS[sub.category] || '#6366F1';
                          const isTrial = Boolean(sub.trialExpiryDate);

                          return (
                            <div
                              key={sub.id}
                              title={`${sub.name} - ${formatBaseINR(sub.cost)}`}
                              className={`group/item px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-medium flex items-center gap-1.5 border shadow-xs transition-all hover:scale-[1.02] ${
                                sub.isPaused
                                  ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through'
                                  : isTrial
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-600/50 ring-1 ring-amber-400/40'
                                  : 'bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700'
                              }`}
                              style={
                                !sub.isPaused && !isTrial
                                  ? {
                                      borderLeftWidth: '3px',
                                      borderLeftColor: color,
                                    }
                                  : {}
                              }
                            >
                              <BrandLogo
                                name={sub.name}
                                domain={sub.domain}
                                logoUrl={sub.logoUrl}
                                size="xs"
                                categoryColor={color}
                                className="shrink-0"
                              />

                              <span className="truncate flex-1 font-semibold">
                                {sub.name}
                              </span>

                              <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                {formatBaseINR(sub.cost)}
                              </span>
                            </div>
                          );
                        })}

                        {cell.renewals.length > 3 && (
                          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center py-0.5 bg-slate-100 dark:bg-slate-800/60 rounded-md">
                            +{cell.renewals.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Heatmap Legend & Liquidity Guide */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            Financial Heatmap Intensity Scale
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Outflow heat corresponds to daily billing load. High & peak days require active cash liquidity buffers.
          </p>
        </div>

        {/* Legend Swatches */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
            <span className="w-3 h-3 rounded-xs bg-slate-200 dark:bg-slate-700" />
            <span>₹0 Zero</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
            <span className="w-3 h-3 rounded-xs bg-emerald-400 dark:bg-emerald-500" />
            <span>&lt; ₹500 Low</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
            <span className="w-3 h-3 rounded-xs bg-amber-400 dark:bg-amber-500" />
            <span>₹500 - 1.5k</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-200">
            <span className="w-3 h-3 rounded-xs bg-orange-500" />
            <span>₹1.5k - 3.5k</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-bold ring-1 ring-rose-400/50">
            <span className="w-3 h-3 rounded-xs bg-rose-600 animate-pulse" />
            <span>&gt; ₹3.5k Peak Surge 🔥</span>
          </div>
        </div>
      </div>

      {/* Day Renewal Details Modal (Audit Modal) */}
      {selectedDayDate && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedDayDate(null)}
        >
          <div
            id="calendar-day-modal"
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Day Outflow Audit
                  </span>
                  {selectedDayDate === todayStr && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                      TODAY
                    </span>
                  )}
                  {selectedCell && selectedCell.heatLevel === 4 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 flex items-center gap-1">
                      <Flame className="w-3 h-3 fill-rose-500 text-rose-500" />
                      Peak Billing Day
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {new Date(selectedDayDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </h3>
              </div>
              <button
                id="close-cal-day-modal-btn"
                onClick={() => setSelectedDayDate(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="py-4 sm:py-5 space-y-4">
              {selectedDayRenewals.length === 0 ? (
                <div className="p-6 sm:p-8 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No Subscriptions Due on this Date
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Zero cash outflow scheduled for this calendar date.
                  </p>
                </div>
              ) : (
                <>
                  {/* Total Outflow summary with multi-currency conversion */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                        Total Scheduled Outflow:
                      </span>
                      <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                        {formatBaseINR(selectedDayTotal)}
                      </span>
                    </div>

                    <div className="text-right text-xs font-mono text-slate-500 dark:text-slate-400">
                      <div>USD: {getBreakdown(selectedDayTotal).usd}</div>
                      <div>EUR: {getBreakdown(selectedDayTotal).eur}</div>
                    </div>
                  </div>

                  {/* Subscriptions list */}
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {selectedDayRenewals.map((sub) => {
                      const color = CATEGORY_COLORS[sub.category] || '#6366F1';
                      return (
                        <div
                          key={sub.id}
                          className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                              <BrandLogo
                                name={sub.name}
                                domain={sub.domain}
                                logoUrl={sub.logoUrl}
                                size="md"
                                categoryColor={color}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                                    {sub.name}
                                  </h4>
                                  {sub.trialExpiryDate && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300">
                                      Trial Ending
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="text-xs font-medium inline-block mt-0.5 truncate"
                                  style={{ color }}
                                >
                                  {sub.category} • {sub.billingCycle}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`text-base font-extrabold font-mono ${
                                  sub.isPaused
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {formatBaseINR(sub.cost)}
                              </span>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {sub.billingCycle}
                              </div>
                            </div>
                          </div>

                          {/* Notes if present */}
                          {sub.notes && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                              {sub.notes}
                            </p>
                          )}

                          {/* Quick Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onTogglePause(sub.id)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                                  sub.isPaused
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                                }`}
                              >
                                {sub.isPaused ? (
                                  <>
                                    <PlayCircle className="w-3.5 h-3.5" />
                                    <span>Resume</span>
                                  </>
                                ) : (
                                  <>
                                    <PauseCircle className="w-3.5 h-3.5" />
                                    <span>Pause Outflow</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedDayDate(null);
                                  onEditClick(sub);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            </div>

                            {sub.cancellationUrl && (
                              <a
                                href={sub.cancellationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-semibold shrink-0"
                              >
                                <span>Cancel</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                onClick={() => setSelectedDayDate(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
