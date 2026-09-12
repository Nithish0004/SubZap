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

  const { formatBaseINR, format, getBreakdown } = useCurrency();

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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search input */}
        <div className="relative flex-1">
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
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="sub-category-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'active'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('paused')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'paused'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Paused
            </button>
            <button
              onClick={() => setStatusFilter('trial')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'trial'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Trials
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Dense Data Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table id="subscription-data-table" className="w-full text-left border-collapse">
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
                    <span>Cost / Period (₹)</span>
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
                    <span>Monthly Burn (₹)</span>
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
                          {/* Dynamic Brand Logo Thumbnail */}
                          <BrandLogo
                            name={sub.name}
                            domain={sub.domain}
                            logoUrl={sub.logoUrl}
                            size="md"
                            categoryColor={catColor}
                          />

                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold ${
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
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40">
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
                      <td className="py-3.5 px-4">
                        <span className="capitalize text-xs font-medium text-slate-600 dark:text-slate-300">
                          {sub.billingCycle}
                        </span>
                      </td>

                      {/* Cost with Multi-Currency Tooltip / FX toggle */}
                      <td className="py-3.5 px-4 text-right">
                        <MultiCurrencyTooltip
                          amountInINR={sub.cost}
                          label={sub.name}
                          size="md"
                          align="right"
                        />
                      </td>

                      {/* Normalized Monthly Burn */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-mono tabular-nums font-bold text-sm ${
                            sub.isPaused 
                              ? 'text-slate-400 dark:text-slate-500 line-through' 
                              : 'text-indigo-600 dark:text-indigo-300'
                          }`}>
                            {formatBaseINR(normalizedMonthly)}
                            <span className="text-xs text-slate-400 font-normal">/mo</span>
                          </span>
                          {sub.billingCycle === 'yearly' && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              (Annual / 12)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Next Renewal Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                            {sub.nextRenewalDate}
                          </span>
                          <span
                            className={`text-[11px] font-medium mt-0.5 ${
                              badge.isToday
                                ? 'text-rose-600 dark:text-rose-400 font-bold'
                                : badge.isUrgent
                                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {badge.label}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {sub.isPaused ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Paused
                          </span>
                        ) : sub.trialExpiryDate ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Free Trial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Simulate Cancellation button */}
                          <button
                            id={`sim-cancel-btn-${sub.id}`}
                            type="button"
                            title={isSimulated ? "Remove from simulation" : "Simulate cancellation savings"}
                            onClick={() => onToggleSimulateCancel(sub.id)}
                            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isSimulated
                                ? 'bg-rose-500 text-white shadow-md'
                                : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            }`}
                          >
                            <ZapOff className="w-4 h-4" />
                          </button>

                          {/* Toggle Pause button */}
                          <button
                            id={`toggle-pause-btn-${sub.id}`}
                            type="button"
                            title={sub.isPaused ? "Resume subscription" : "Pause subscription to save"}
                            onClick={() => onTogglePause(sub.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              sub.isPaused
                                ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                : 'text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
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
