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
  DollarSign
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
}

export const PredictiveCalendar: React.FC<PredictiveCalendarProps> = ({
  subscriptions,
  onTogglePause,
  onEditClick,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  const { formatBaseINR, format, getBreakdown } = useCurrency();

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

  // Calendar cell builder
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: CalendarCell[] = [];

    // Prev month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      const dateKey = prevDate.toISOString().split('T')[0];

      cells.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: false,
        renewals: subscriptions.filter((s) => s.nextRenewalDate === dateKey),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const thisDate = new Date(year, month, d);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      cells.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: true,
        renewals: subscriptions.filter((s) => s.nextRenewalDate === dateKey),
      });
    }

    // Next month padding to round off grid to multiples of 7
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateKey = `${year}-${String(month + 2).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      cells.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: false,
        renewals: subscriptions.filter((s) => s.nextRenewalDate === dateKey),
      });
    }

    return cells;
  }, [year, month, subscriptions]);

  // Aggregate stats for this month
  const totalMonthSpend = useMemo(() => {
    return calendarCells
      .filter((c) => c.isCurrentMonth)
      .reduce((sum, cell) => {
        const daySum = cell.renewals
          .filter((s) => !s.isPaused)
          .reduce((subSum, s) => subSum + s.cost, 0);
        return sum + daySum;
      }, 0);
  }, [calendarCells]);

  const monthRenewalsCount = useMemo(() => {
    return calendarCells
      .filter((c) => c.isCurrentMonth)
      .reduce((sum, cell) => sum + cell.renewals.filter((s) => !s.isPaused).length, 0);
  }, [calendarCells]);

  // Selected Day Details
  const selectedCell = calendarCells.find((c) => c.dateKey === selectedDayDate);
  const selectedDayRenewals = selectedCell?.renewals || [];
  const selectedDayTotal = selectedDayRenewals
    .filter((s) => !s.isPaused)
    .reduce((sum, s) => sum + s.cost, 0);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300 w-full min-w-0 max-w-full">
      {/* Calendar Header & Cash Outflow Radar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm w-full min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 shrink-0">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Cash Outflow Radar
            </span>
            <span className="text-xs font-mono text-slate-400 shrink-0">
              {monthRenewalsCount} Scheduled Renewal{monthRenewalsCount === 1 ? '' : 's'}
            </span>
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
            {monthNames[month]} {year}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Projected calendar outflow:{' '}
            <strong className="text-slate-900 dark:text-white font-mono font-bold">
              {formatBaseINR(totalMonthSpend)}
            </strong>{' '}
            <span className="text-slate-400 font-mono">
              (≈ {getBreakdown(totalMonthSpend).usd})
            </span>
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            id="cal-today-btn"
            onClick={goToToday}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
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

      {/* Spacious Premium Calendar Grid with internal smooth horizontal scroll on narrow mobile */}
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

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDayDate(cell.dateKey)}
                    className={`min-h-[115px] sm:min-h-[135px] p-2 sm:p-2.5 flex flex-col justify-between transition-all cursor-pointer select-none group relative ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-50/50 dark:bg-slate-950/30 text-slate-400 dark:text-slate-600'
                        : 'bg-white dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    } ${
                      isToday
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-inset ring-indigo-500'
                        : ''
                    } ${
                      isSelected ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 shadow-lg' : ''
                    } ${
                      hasTrialExpiry ? 'border-amber-400/40' : ''
                    }`}
                  >
                    {/* Animated border glow when renewal/trial is due today */}
                    {hasRenewals && isToday && (
                      <span className="absolute inset-0 border-2 border-rose-500/60 rounded-none pointer-events-none animate-pulse" />
                    )}

                    {/* Day Number Header */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-mono font-bold rounded-full w-6 h-6 flex items-center justify-center transition-all ${
                          isToday
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : !cell.isCurrentMonth
                            ? 'text-slate-400 dark:text-slate-600'
                            : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {hasRenewals && (
                        <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded truncate max-w-[55px]">
                          {formatBaseINR(
                            cell.renewals.reduce((sum, s) => sum + s.cost, 0)
                          )}
                        </span>
                      )}
                    </div>

                    {/* Specialized Renewal Event Pill Tags with Dynamic Brand Logos */}
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
                            {/* Dynamic Application Brand Logo */}
                            <BrandLogo
                              name={sub.name}
                              domain={sub.domain}
                              logoUrl={sub.logoUrl}
                              size="xs"
                              categoryColor={color}
                              className="shrink-0"
                            />

                            {/* Name */}
                            <span className="truncate flex-1 font-semibold">
                              {sub.name}
                            </span>

                            {/* Cost Tag */}
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Day Renewal Details Modal */}
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
                              <MultiCurrencyTooltip
                                amountInINR={sub.cost}
                                label={sub.name}
                                size="md"
                              />
                            </div>
                          </div>

                          {sub.notes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg">
                              "{sub.notes}"
                            </p>
                          )}

                          {/* Quick action bar */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onTogglePause(sub.id)}
                                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                  sub.isPaused
                                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                                    <span>Pause</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDayDate(null);
                                  onEditClick(sub);
                                }}
                                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
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
