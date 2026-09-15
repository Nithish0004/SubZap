import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  PauseCircle, 
  PlayCircle, 
  Edit3, 
  Trash2, 
  ZapOff, 
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers
} from 'lucide-react';
import { BillingCycle, Subscription, SubscriptionCategory } from '../types';
import { CATEGORIES, CATEGORY_COLORS, getCountdownBadge, getDaysUntil, getNormalizedMonthlyCost } from '../utils/calculations';
import { useCurrency } from '../context/CurrencyContext';
import { BrandLogo } from './BrandLogo';
import { MultiCurrencyTooltip } from './MultiCurrencyTooltip';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface SubscriptionManagerProps {
  subscriptions: Subscription[];
  onAddClick: () => void;
  onEditClick: (sub: Subscription) => void;
  onDeleteClick: (id: string, name: string) => void;
  onTogglePause: (id: string) => void;
  simulatedCancelledIds: Set<string>;
  onToggleSimulateCancel: (id: string) => void;
  onClearSimulation: () => void;
}

type SortField = 'cost' | 'renewalDate' | 'name' | 'monthlyCost';
type SortOrder = 'asc' | 'desc';

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  subscriptions,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onTogglePause,
  simulatedCancelledIds,
  onToggleSimulateCancel,
  onClearSimulation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'trial'>('all');
  const [sortField, setSortField] = useState<SortField>('renewalDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Intercept immediate delete with Delete Confirmation Dialog
  const [pendingDeleteSub, setPendingDeleteSub] = useState<Subscription | null>(null);

  const { formatBaseINR } = useCurrency();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter and sort subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions
      .filter((sub) => {
        // Search query
        const matchesSearch =
          sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sub.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (sub.notes && sub.notes.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        // Category filter
        if (categoryFilter !== 'all' && sub.category !== categoryFilter) {
          return false;
        }

        // Status filter
        if (statusFilter === 'active' && sub.isPaused) return false;
        if (statusFilter === 'paused' && !sub.isPaused) return false;
        if (statusFilter === 'trial' && !sub.trialExpiryDate) return false;

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'cost') {
          diff = a.cost - b.cost;
        } else if (sortField === 'monthlyCost') {
          diff = getNormalizedMonthlyCost(a.cost, a.billingCycle) - getNormalizedMonthlyCost(b.cost, b.billingCycle);
        } else if (sortField === 'renewalDate') {
          diff = new Date(a.nextRenewalDate).getTime() - new Date(b.nextRenewalDate).getTime();
        } else if (sortField === 'name') {
          diff = a.name.localeCompare(b.name);
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [subscriptions, searchQuery, categoryFilter, statusFilter, sortField, sortOrder]);

  const confirmPendingDelete = () => {
    if (pendingDeleteSub) {
      onDeleteClick(pendingDeleteSub.id, pendingDeleteSub.name);
      setPendingDeleteSub(null);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300 w-full min-w-0 max-w-full">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm w-full min-w-0">
        {/* Search input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="sub-search-input"
            type="text"
            placeholder="Search subscriptions, SaaS tools, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Category Dropdown */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[140px]">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              id="sub-category-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto py-2 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold overflow-x-auto max-w-full">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'active'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('paused')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'paused'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Paused
            </button>
            <button
              onClick={() => setStatusFilter('trial')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'trial'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Trials
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Card List (< 768px Viewport) */}
      <div className="block md:hidden space-y-3 w-full min-w-0">
        {filteredSubscriptions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            <p className="font-medium text-slate-700 dark:text-slate-300">No subscriptions found</p>
            <p className="text-xs mt-1 text-slate-400">Try adjusting your search query or filters.</p>
          </div>
        ) : (
          filteredSubscriptions.map((sub) => {
            const badge = getCountdownBadge(sub.nextRenewalDate);
            const isSimulated = simulatedCancelledIds.has(sub.id);
            const normalizedMonthly = getNormalizedMonthlyCost(sub.cost, sub.billingCycle);
            const catColor = CATEGORY_COLORS[sub.category] || '#6366F1';

            return (
              <div
                key={sub.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isSimulated
                    ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60'
                    : sub.isPaused
                    ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400'
                    : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                {/* Card Top: Logo + Name + Category */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <BrandLogo
                      name={sub.name}
                      domain={sub.domain}
                      logoUrl={sub.logoUrl}
                      size="sm"
                      categoryColor={catColor}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold text-sm truncate ${
                          isSimulated
                            ? 'line-through text-rose-600 dark:text-rose-300'
                            : sub.isPaused
                            ? 'text-slate-400'
                            : 'text-slate-900 dark:text-white'
                        }`}>
                          {sub.name}
                        </span>
                        {isSimulated && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300">
                            Staged Cancel
                          </span>
                        )}
                        {sub.isPaused && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Paused
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: `${catColor}15`,
                            color: catColor,
                            border: `1px solid ${catColor}30`,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor }} />
                          {sub.category}
                        </span>
                        {sub.trialExpiryDate && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                            <Clock className="w-2.5 h-2.5" />
                            {getCountdownBadge(sub.trialExpiryDate).label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pricing Display */}
                  <div className="text-right shrink-0">
                    <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                      {formatBaseINR(sub.cost)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                      /{sub.billingCycle}
                    </div>
                    {sub.billingCycle !== 'monthly' && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        ≈ {formatBaseINR(normalizedMonthly)}/mo
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Renewal & Countdown Row */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="text-slate-500 dark:text-slate-400">
                    Next Renewal: <span className="font-medium text-slate-800 dark:text-slate-200">{sub.nextRenewalDate}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0 ${
                    badge.isToday
                      ? 'bg-rose-600 text-white font-bold animate-pulse'
                      : badge.isUrgent
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}>
                    {badge.label}
                  </span>
                </div>

                {/* Card Action Buttons Bar */}
                <div className="flex items-center justify-between gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onToggleSimulateCancel(sub.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isSimulated
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {isSimulated ? '✓ In Simulation' : 'Simulate Zap'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onTogglePause(sub.id)}
                      className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={sub.isPaused ? 'Resume subscription' : 'Pause subscription'}
                    >
                      {sub.isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditClick(sub)}
                      className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit subscription"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPendingDeleteSub(sub)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete subscription"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {sub.cancellationUrl && (
                    <a
                      href={sub.cancellationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-indigo-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      title="Direct cancellation page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop & Tablet Table (>= 768px Viewport) */}
      <div className="hidden md:block rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl w-full min-w-0 max-w-full">
        <div className="overflow-x-auto w-full max-w-full">
          <table id="subscription-data-table" className="w-full min-w-[720px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:text-indigo-600 dark:hover:text-white transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Subscription Name</span>
                    {sortField === 'name' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-500" /> : <ArrowDown className="w-3 h-3 text-indigo-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4">Billing Cycle</th>
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:text-indigo-600 dark:hover:text-white transition-colors text-right"
                  onClick={() => handleSort('cost')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Cost / Period</span>
                    {sortField === 'cost' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-500" /> : <ArrowDown className="w-3 h-3 text-indigo-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:text-indigo-600 dark:hover:text-white transition-colors text-right"
                  onClick={() => handleSort('monthlyCost')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Monthly Burn</span>
                    {sortField === 'monthlyCost' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-500" /> : <ArrowDown className="w-3 h-3 text-indigo-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:text-indigo-600 dark:hover:text-white transition-colors"
                  onClick={() => handleSort('renewalDate')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Next Renewal</span>
                    {sortField === 'renewalDate' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-500" /> : <ArrowDown className="w-3 h-3 text-indigo-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-slate-500 dark:text-slate-400">
                    <p className="font-medium text-slate-700 dark:text-slate-300">No subscriptions matched your filters</p>
                    <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">Try resetting search keywords or adding a new subscription entry.</p>
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => {
                  const badge = getCountdownBadge(sub.nextRenewalDate);
                  const isSimulated = simulatedCancelledIds.has(sub.id);
                  const normalizedMonthly = getNormalizedMonthlyCost(sub.cost, sub.billingCycle);
                  const catColor = CATEGORY_COLORS[sub.category] || '#6366F1';

                  return (
                    <tr
                      key={sub.id}
                      className={`group transition-colors ${
                        isSimulated
                          ? 'bg-rose-50/60 dark:bg-rose-950/20 opacity-80'
                          : sub.isPaused
                          ? 'bg-slate-50/60 dark:bg-slate-900/40 text-slate-400'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Name & Dynamic Brand Logo & Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <BrandLogo
                            name={sub.name}
                            domain={sub.domain}
                            logoUrl={sub.logoUrl}
                            size="md"
                            categoryColor={catColor}
                          />

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold truncate ${
                                  isSimulated
                                    ? 'line-through text-rose-600 dark:text-rose-300'
                                    : sub.isPaused
                                    ? 'text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {sub.name}
                              </span>
                              {isSimulated && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 shrink-0">
                                  SIMULATED CANCEL
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
                                style={{
                                  backgroundColor: `${catColor}15`,
                                  color: catColor,
                                  border: `1px solid ${catColor}30`,
                                }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor }} />
                                {sub.category}
                              </span>

                              {sub.trialExpiryDate && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                                  <Clock className="w-3 h-3" />
                                  {getCountdownBadge(sub.trialExpiryDate).label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Billing Cycle */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="capitalize text-xs font-medium text-slate-600 dark:text-slate-300">
                          {sub.billingCycle}
                        </span>
                      </td>

                      {/* Cost */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                        <MultiCurrencyTooltip
                          amountInINR={sub.cost}
                          label={sub.name}
                          align="right"
                        />
                      </td>

                      {/* Monthly Burn Normalized */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                        <MultiCurrencyTooltip
                          amountInINR={normalizedMonthly}
                          label={`${sub.name} (Monthly)`}
                          align="right"
                        />
                      </td>

                      {/* Next Renewal */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-slate-900 dark:text-white font-medium">
                            {sub.nextRenewalDate}
                          </span>
                          <span
                            className={`inline-block mt-0.5 text-[10px] font-bold ${
                              badge.isToday
                                ? 'text-rose-600 dark:text-rose-400 font-extrabold uppercase animate-pulse'
                                : badge.isUrgent
                                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                : 'text-slate-400'
                            }`}
                          >
                            {badge.label}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {sub.isPaused ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <PauseCircle className="w-3 h-3" />
                            Paused
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Simulate Cancel Toggle */}
                          <button
                            id={`simulate-btn-${sub.id}`}
                            type="button"
                            title={isSimulated ? 'Remove from simulation' : 'Stage cancellation in What-If simulator'}
                            onClick={() => onToggleSimulateCancel(sub.id)}
                            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              isSimulated
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            }`}
                          >
                            <ZapOff className="w-4 h-4" />
                          </button>

                          {/* Pause/Resume Toggle */}
                          <button
                            id={`pause-btn-${sub.id}`}
                            type="button"
                            title={sub.isPaused ? 'Resume subscription' : 'Pause subscription'}
                            onClick={() => onTogglePause(sub.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            {sub.isPaused ? (
                              <PlayCircle className="w-4 h-4" />
                            ) : (
                              <PauseCircle className="w-4 h-4" />
                            )}
                          </button>

                          {/* Edit button */}
                          <button
                            id={`edit-sub-btn-${sub.id}`}
                            type="button"
                            title="Edit subscription"
                            onClick={() => onEditClick(sub)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete button (Intercepted to show Confirmation Pop-up Modal) */}
                          <button
                            id={`delete-sub-btn-${sub.id}`}
                            type="button"
                            title="Delete subscription"
                            onClick={() => setPendingDeleteSub(sub)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Direct Cancellation Link */}
                          {sub.cancellationUrl && (
                            <a
                              href={sub.cancellationUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Direct cancellation page"
                              className="p-1.5 text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accessible High-Contrast Delete Confirmation Pop-up Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(pendingDeleteSub)}
        itemName={pendingDeleteSub?.name || ''}
        onCancel={() => setPendingDeleteSub(null)}
        onConfirm={confirmPendingDelete}
      />
    </div>
  );
};
