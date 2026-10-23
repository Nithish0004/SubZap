import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Layers,
  X,
  Calendar,
  Tag,
  RotateCcw,
  Download
} from 'lucide-react';
import { BillingCycle, Subscription, SubscriptionCategory } from '../types';
import { CATEGORIES, CATEGORY_COLORS, getCountdownBadge, getDaysUntil, getNormalizedMonthlyCost } from '../utils/calculations';
import { useCurrency } from '../context/CurrencyContext';
import { BrandLogo } from './BrandLogo';
import { MultiCurrencyTooltip } from './MultiCurrencyTooltip';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { ExportSubscriptionsModal } from './ExportSubscriptionsModal';

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
type SearchScope = 'all' | 'name' | 'category';

// Helper to highlight matching text in search results
const highlightMatch = (text: string, query: string) => {
  if (!query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={i} className="bg-indigo-100 dark:bg-indigo-950/90 text-indigo-700 dark:text-indigo-300 font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

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
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [billingCycleFilter, setBillingCycleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'trial' | 'expiring_soon' | 'price_hike'>('all');
  const [sortField, setSortField] = useState<SortField>('renewalDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Intercept immediate delete with Delete Confirmation Dialog
  const [pendingDeleteSub, setPendingDeleteSub] = useState<Subscription | null>(null);

  // Export Subscriptions Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const { formatBaseINR } = useCurrency();

  // Category counts for dropdown badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    subscriptions.forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, [subscriptions]);

  // Billing cycle counts for dropdown badges
  const cycleCounts = useMemo(() => {
    const counts: Record<string, number> = { monthly: 0, yearly: 0, weekly: 0 };
    subscriptions.forEach((s) => {
      if (s.billingCycle in counts) {
        counts[s.billingCycle] = (counts[s.billingCycle] || 0) + 1;
      }
    });
    return counts;
  }, [subscriptions]);

  // Status counts for dropdown badges
  const statusCounts = useMemo(() => {
    let active = 0;
    let paused = 0;
    let trial = 0;
    let expiringSoon = 0;
    let priceHike = 0;

    subscriptions.forEach((s) => {
      if (s.isPaused) paused++;
      else active++;

      if (s.trialExpiryDate) trial++;

      const days = getDaysUntil(s.nextRenewalDate);
      if (days >= 0 && days <= 7) expiringSoon++;

      if (s.previousCost && s.cost > s.previousCost && !s.priceAlertDismissed) {
        priceHike++;
      }
    });

    return { active, paused, trial, expiringSoon, priceHike };
  }, [subscriptions]);

  // Global keyboard shortcut to focus search input bar (/ or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT';

      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
        searchInputRef.current?.blur();
        return;
      }

      if ((e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const isFiltered = Boolean(
    searchQuery.trim() !== '' ||
    searchScope !== 'all' ||
    categoryFilter !== 'all' ||
    billingCycleFilter !== 'all' ||
    statusFilter !== 'all'
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setSearchScope('all');
    setCategoryFilter('all');
    setBillingCycleFilter('all');
    setStatusFilter('all');
  };

  // Filter and sort subscriptions
  const filteredSubscriptions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return subscriptions
      .filter((sub) => {
        // Search query: filter by name or category based on searchScope
        if (q) {
          let matchesSearch = false;
          if (searchScope === 'name') {
            matchesSearch = sub.name.toLowerCase().includes(q);
          } else if (searchScope === 'category') {
            matchesSearch = sub.category.toLowerCase().includes(q);
          } else {
            // 'all': matches name or category (plus domain/notes as fallback)
            matchesSearch =
              sub.name.toLowerCase().includes(q) ||
              sub.category.toLowerCase().includes(q) ||
              Boolean(sub.domain && sub.domain.toLowerCase().includes(q)) ||
              sub.billingCycle.toLowerCase().includes(q) ||
              Boolean(sub.notes && sub.notes.toLowerCase().includes(q));
          }

          if (!matchesSearch) return false;
        }

        // Category filter
        if (categoryFilter !== 'all' && sub.category !== categoryFilter) {
          return false;
        }

        // Billing Cycle filter
        if (billingCycleFilter !== 'all' && sub.billingCycle !== billingCycleFilter) {
          return false;
        }

        // Status filter
        if (statusFilter === 'active' && sub.isPaused) return false;
        if (statusFilter === 'paused' && !sub.isPaused) return false;
        if (statusFilter === 'trial' && !sub.trialExpiryDate) return false;
        if (statusFilter === 'expiring_soon') {
          const days = getDaysUntil(sub.nextRenewalDate);
          if (days > 7 || days < 0) return false;
        }
        if (statusFilter === 'price_hike') {
          if (!sub.previousCost || sub.cost <= sub.previousCost || sub.priceAlertDismissed) return false;
        }

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
  }, [subscriptions, searchQuery, searchScope, categoryFilter, billingCycleFilter, statusFilter, sortField, sortOrder]);

  const confirmPendingDelete = () => {
    if (pendingDeleteSub) {
      onDeleteClick(pendingDeleteSub.id, pendingDeleteSub.name);
      setPendingDeleteSub(null);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300 w-full min-w-0 max-w-full">
      {/* Search & Filter Header Bar */}
      <div className="space-y-3 w-full min-w-0">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm w-full min-w-0 space-y-3.5">
          {/* Top Search Input Bar & Quick Filters */}
          <div className="space-y-3 w-full">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
              {/* Search Input Bar */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  id="sub-search-input"
                  type="text"
                  placeholder={
                    searchScope === 'name'
                      ? 'Filter active subscriptions by name (e.g. Netflix, Spotify)...'
                      : searchScope === 'category'
                      ? 'Filter active subscriptions by category (e.g. Entertainment, Software)...'
                      : 'Search subscriptions by name or category...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors shadow-2xs"
                  aria-label="Search subscriptions by name or category"
                />

                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
                      title="Clear search query (Esc)"
                      aria-label="Clear search query"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 border border-slate-300/60 dark:border-slate-600/60">
                      /
                    </span>
                  )}
                  {searchQuery && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80">
                      {filteredSubscriptions.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Search Scope Selector: All | Name | Category */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSearchScope('all')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    searchScope === 'all'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Search in both Name and Category"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSearchScope('name')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    searchScope === 'name'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Filter strictly by subscription Name"
                >
                  Name
                </button>
                <button
                  type="button"
                  onClick={() => setSearchScope('category')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    searchScope === 'category'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Filter strictly by Category"
                >
                  Category
                </button>
              </div>

              {/* Quick "Active Only" Toggle Button */}
              <button
                type="button"
                onClick={() => setStatusFilter((prev) => (prev === 'active' ? 'all' : 'active'))}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                  statusFilter === 'active'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700/80 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-400/30'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/70'
                }`}
                title="Filter to show active subscriptions only"
              >
                <span className={`w-2 h-2 rounded-full ${statusFilter === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span>Active Only</span>
                <span className={`text-[10px] font-mono px-1 rounded ${statusFilter === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/60' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  {statusCounts.active}
                </span>
              </button>

              {/* Reset Filters Button */}
              {isFiltered && (
                <button
                  id="sub-reset-filters-btn"
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
                  title="Reset all filters and search query"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Reset</span>
                </button>
              )}

              {/* Export Subscriptions Button */}
              <button
                id="sub-export-data-btn"
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-all cursor-pointer shrink-0"
                title="Export subscription data to downloadable JSON or CSV (Encrypted or Decrypted)"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Export</span>
              </button>
            </div>

            {/* Quick Category Chips for 1-Click Filtering by Category */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar w-full text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-indigo-500" />
                <span>Categories:</span>
              </span>
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  categoryFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All ({subscriptions.length})
              </button>
              {CATEGORIES.map((cat) => {
                const count = categoryCounts[cat] || 0;
                const isSelected = categoryFilter === cat;
                const catColor = CATEGORY_COLORS[cat] || '#6366F1';
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(isSelected ? 'all' : cat)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-400 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor }} />
                    <span>{cat}</span>
                    <span className="text-[10px] font-mono opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Row: Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            {/* 1. Category Filter Dropdown */}
            <div className="relative min-w-0">
              <label htmlFor="sub-category-select" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Category
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select
                  id="sub-category-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none truncate"
                >
                  <option value="all">All Categories ({subscriptions.length})</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} ({categoryCounts[cat] || 0})
                    </option>
                  ))}
                </select>
                <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none opacity-60" />
              </div>
            </div>

            {/* 2. Billing Cycle Filter Dropdown */}
            <div className="relative min-w-0">
              <label htmlFor="sub-billing-cycle-select" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Billing Cycle
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select
                  id="sub-billing-cycle-select"
                  value={billingCycleFilter}
                  onChange={(e) => setBillingCycleFilter(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none truncate"
                >
                  <option value="all">All Cycles ({subscriptions.length})</option>
                  <option value="monthly">Monthly ({cycleCounts.monthly || 0})</option>
                  <option value="yearly">Yearly ({cycleCounts.yearly || 0})</option>
                  <option value="weekly">Weekly ({cycleCounts.weekly || 0})</option>
                </select>
                <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none opacity-60" />
              </div>
            </div>

            {/* 3. Status Filter Dropdown */}
            <div className="relative min-w-0">
              <label htmlFor="sub-status-select" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Status
              </label>
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select
                  id="sub-status-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none truncate"
                >
                  <option value="all">All Statuses ({subscriptions.length})</option>
                  <option value="active">Active Only ({statusCounts.active})</option>
                  <option value="paused">Paused Only ({statusCounts.paused})</option>
                  <option value="trial">Free Trials ({statusCounts.trial})</option>
                  <option value="expiring_soon">Renewing ≤7 Days ({statusCounts.expiringSoon})</option>
                  <option value="price_hike">Price Surge Alert ({statusCounts.priceHike})</option>
                </select>
                <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none opacity-60" />
              </div>
            </div>

            {/* 4. Sort By Dropdown */}
            <div className="relative min-w-0">
              <label htmlFor="sub-sort-select" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Sort Order
              </label>
              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select
                  id="sub-sort-select"
                  value={`${sortField}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                    setSortField(field);
                    setSortOrder(order);
                  }}
                  className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none truncate"
                >
                  <option value="renewalDate-asc">Renewal: Earliest First</option>
                  <option value="renewalDate-desc">Renewal: Latest First</option>
                  <option value="monthlyCost-desc">Monthly Burn: High to Low</option>
                  <option value="monthlyCost-asc">Monthly Burn: Low to High</option>
                  <option value="cost-desc">Cost / Period: High to Low</option>
                  <option value="cost-asc">Cost / Period: Low to High</option>
                  <option value="name-asc">Name: A to Z</option>
                  <option value="name-desc">Name: Z to A</option>
                </select>
                <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none opacity-60" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters Summary Chips Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Showing <strong className="font-mono text-indigo-600 dark:text-indigo-400">{filteredSubscriptions.length}</strong> of {subscriptions.length} subscriptions
            </span>

            {/* Active search chip */}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 font-medium text-[11px]">
                <span>
                  Search {searchScope !== 'all' ? `(${searchScope})` : ''}: "{searchQuery}"
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-indigo-900 dark:hover:text-white cursor-pointer"
                  title="Remove search filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Active search scope chip if not all and query is empty */}
            {!searchQuery && searchScope !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 font-medium text-[11px]">
                <span>Scope: {searchScope === 'name' ? 'Name Only' : 'Category Only'}</span>
                <button
                  type="button"
                  onClick={() => setSearchScope('all')}
                  className="hover:text-indigo-900 dark:hover:text-white cursor-pointer"
                  title="Reset scope to all"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Active category chip */}
            {categoryFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 font-medium text-[11px]">
                <span>Category: {categoryFilter}</span>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className="hover:text-indigo-900 dark:hover:text-white cursor-pointer"
                  title="Remove category filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Active billing cycle chip */}
            {billingCycleFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 font-medium text-[11px]">
                <span className="capitalize">Cycle: {billingCycleFilter}</span>
                <button
                  type="button"
                  onClick={() => setBillingCycleFilter('all')}
                  className="hover:text-indigo-900 dark:hover:text-white cursor-pointer"
                  title="Remove billing cycle filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Active status chip */}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 font-medium text-[11px]">
                <span className="capitalize">
                  Status: {
                    statusFilter === 'active' ? 'Active Only' :
                    statusFilter === 'paused' ? 'Paused Only' :
                    statusFilter === 'trial' ? 'Free Trials' :
                    statusFilter === 'expiring_soon' ? 'Renewing ≤7 Days' :
                    statusFilter === 'price_hike' ? 'Price Surge Alert' : statusFilter
                  }
                </span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="hover:text-indigo-900 dark:hover:text-white cursor-pointer"
                  title="Remove status filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="sub-export-view-btn"
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 cursor-pointer transition-colors shadow-2xs"
              title="Export subscriptions as JSON or CSV"
            >
              <Download className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Export {isFiltered ? `View (${filteredSubscriptions.length})` : 'All'}</span>
            </button>

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-[11px] cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Card List (< 768px Viewport) */}
      <div className="block md:hidden space-y-3 w-full min-w-0">
        {filteredSubscriptions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 space-y-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/80 mx-auto flex items-center justify-center text-indigo-500">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {searchQuery
                  ? `No subscriptions found matching "${searchQuery}"${statusFilter === 'active' ? ' among active subscriptions' : ''}`
                  : 'No subscriptions matched your filters'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery
                  ? `Try checking for spelling or switching the search scope (currently "${searchScope}").`
                  : 'Try adjusting your category, billing cycle, or status filters.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Search</span>
                </button>
              )}
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
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
                          {highlightMatch(sub.name, searchQuery)}
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
                          {highlightMatch(sub.category, searchQuery)}
                        </span>
                        {sub.trialExpiryDate && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                            <Clock className="w-2.5 h-2.5" />
                            {getCountdownBadge(sub.trialExpiryDate).label}
                          </span>
                        )}

                        {sub.previousCost !== undefined && sub.cost > sub.previousCost && !sub.priceAlertDismissed && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60 animate-pulse">
                            ⚡ Price Surge (+{Math.round(((sub.cost - sub.previousCost) / sub.previousCost) * 100)}%)
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
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/80 mx-auto flex items-center justify-center text-indigo-500 mb-3">
                      <Search className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {searchQuery
                        ? `No subscriptions found matching "${searchQuery}"${statusFilter === 'active' ? ' among active subscriptions' : ''}`
                        : 'No subscriptions matched your filters'}
                    </p>
                    <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">
                      {searchQuery
                        ? `Try checking your spelling or changing the search scope (currently "${searchScope}").`
                        : 'Try adjusting your keywords, category, billing cycle, or status filters.'}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Clear Search</span>
                        </button>
                      )}
                      {isFiltered && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset All Filters</span>
                        </button>
                      )}
                    </div>
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
                                {highlightMatch(sub.name, searchQuery)}
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
                                {highlightMatch(sub.category, searchQuery)}
                              </span>

                              {sub.trialExpiryDate && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                                  <Clock className="w-3 h-3" />
                                  {getCountdownBadge(sub.trialExpiryDate).label}
                                </span>
                              )}

                              {sub.previousCost !== undefined && sub.cost > sub.previousCost && !sub.priceAlertDismissed && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60 animate-pulse">
                                  ⚡ Price Surge (+{Math.round(((sub.cost - sub.previousCost) / sub.previousCost) * 100)}%)
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

      {/* Export Subscriptions Modal (JSON or CSV in Encrypted or Decrypted state) */}
      <ExportSubscriptionsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        subscriptions={subscriptions}
        filteredSubscriptions={filteredSubscriptions}
        filterLabel={
          searchQuery
            ? `Search "${searchQuery}"`
            : categoryFilter !== 'all'
            ? categoryFilter
            : statusFilter !== 'all'
            ? statusFilter
            : undefined
        }
      />
    </div>
  );
};
