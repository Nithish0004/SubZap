import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  X, 
  PauseCircle, 
  PlayCircle, 
  Edit3, 
  ExternalLink,
  Sparkles,
  TrendingDown,
  Globe
} from 'lucide-react';
import { Subscription } from '../types';
import { CATEGORY_COLORS, getCountdownBadge, getDaysUntil } from '../utils/calculations';
import { useCurrency } from '../context/CurrencyContext';
import { BrandLogo } from './BrandLogo';
import { MultiCurrencyTooltip } from './MultiCurrencyTooltip';

interface PredictiveCalendarProps {
  subscriptions: Subscription[];
  onTogglePause: (id: string) => void;
  onEditClick: (sub: Subscription) => void;
}

export const PredictiveCalendar: React.FC<PredictiveCalendarProps> = ({
  subscriptions,
  onTogglePause,
  onEditClick,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const { formatBaseINR, format, getBreakdown } = useCurrency();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  // Map subscriptions by renewal date string (YYYY-MM-DD)
  const renewalsByDate: Record<string, Subscription[]> = {};
  subscriptions.forEach((sub) => {
    if (sub.nextRenewalDate) {
      if (!renewalsByDate[sub.nextRenewalDate]) {
        renewalsByDate[sub.nextRenewalDate] = [];
      }
      renewalsByDate[sub.nextRenewalDate].push(sub);
    }
  });

  // Calculate total scheduled charges in current calendar month
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  let totalMonthSpend = 0;
  let monthRenewalsCount = 0;

  subscriptions.forEach((sub) => {
    if (sub.nextRenewalDate.startsWith(monthPrefix) && !sub.isPaused) {
      totalMonthSpend += sub.cost;
      monthRenewalsCount++;
    }
  });

  // Generate calendar cells
  const calendarCells = [];

  // Previous month overflow days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthIdx = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateKey = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarCells.push({
      dayNumber: dayNum,
      isCurrentMonth: false,
      dateKey,
      renewals: renewalsByDate[dateKey] || [],
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dayNumber: d,
      isCurrentMonth: true,
      dateKey,
      renewals: renewalsByDate[dateKey] || [],
    });
  }

  // Next month fill days
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let n = 1; n <= remainingCells; n++) {
    const nextMonthIdx = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateKey = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
    calendarCells.push({
      dayNumber: n,
      isCurrentMonth: false,
      dateKey,
      renewals: renewalsByDate[dateKey] || [],
    });
  }

  const selectedDayRenewals = selectedDayDate ? (renewalsByDate[selectedDayDate] || []) : [];
  const selectedDayTotal = selectedDayRenewals.reduce(
    (acc, sub) => (sub.isPaused ? acc : acc + sub.cost),
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Calendar Header & Cash Outflow Radar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Cash Outflow Radar
            </span>
            <span className="text-xs font-mono text-slate-400">
              {monthRenewalsCount} Scheduled Renewal{monthRenewalsCount === 1 ? '' : 's'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
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
        <div className="flex items-center gap-3">
          <button
            id="cal-today-btn"
            onClick={goToToday}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
            <button
              id="cal-prev-month-btn"
              onClick={prevMonth}
              aria-label="Previous month"
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
              {monthNames[month].slice(0, 3)}
            </span>
            <button
              id="cal-next-month-btn"
              onClick={nextMonth}
              aria-label="Next month"
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Spacious Premium Calendar Grid */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-center py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                className={`min-h-[125px] sm:min-h-[140px] p-2 sm:p-2.5 flex flex-col justify-between transition-all cursor-pointer select-none group relative ${
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
                    <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded">
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
                        className={`group/item px-2 py-1 rounded-xl text-[11px] font-medium flex items-center gap-1.5 border shadow-xs transition-all hover:scale-[1.02] ${
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

                        {/* Price badge */}
                        <span className="font-mono tabular-nums text-[10px] font-bold shrink-0 text-slate-700 dark:text-slate-300">
                          {formatBaseINR(sub.cost)}
                        </span>
                      </div>
                    );
                  })}

                  {cell.renewals.length > 3 && (
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold text-center pt-0.5">
                      +{cell.renewals.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Popover Audit Modal */}
      {selectedDayDate && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            id="calendar-day-modal"
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200"
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
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {new Date(selectedDayDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
              </div>
              <button
                id="close-cal-day-modal-btn"
                onClick={() => setSelectedDayDate(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="py-5 space-y-4">
              {selectedDayRenewals.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
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
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                        Total Scheduled Outflow:
                      </span>
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
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
                          className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <BrandLogo
                                name={sub.name}
                                domain={sub.domain}
                                logoUrl={sub.logoUrl}
                                size="md"
                                categoryColor={color}
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                    {sub.name}
                                  </h4>
                                  {sub.trialExpiryDate && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                                      Trial Ending
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="text-xs font-medium inline-block mt-0.5"
                                  style={{ color }}
                                >
                                  {sub.category} • {sub.billingCycle}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
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
                                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
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
                                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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
                                className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-semibold"
                              >
                                <span>Direct Cancel</span>
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
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                onClick={() => setSelectedDayDate(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
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
