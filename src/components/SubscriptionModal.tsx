import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, Calendar, Tag, Clock, Globe, ArrowRightLeft } from 'lucide-react';
import { BillingCycle, Subscription, SubscriptionCategory, CurrencyCode } from '../types';
import { CATEGORIES } from '../utils/calculations';
import { extractDomain } from '../utils/logos';
import { BrandLogo } from './BrandLogo';
import { CURRENCY_SYMBOLS, convertToINR, convertFromINR, formatCurrencyAmount } from '../utils/currency';
import { useCurrency } from '../context/CurrencyContext';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subscription: Omit<Subscription, 'id' | 'createdAt'>, id?: string) => void;
  initialData?: Subscription | null;
}

const PRESETS = [
  { name: 'Netflix Premium', cost: 649.00, currency: '₹', cycle: 'monthly' as BillingCycle, category: 'Entertainment' as SubscriptionCategory, domain: 'netflix.com', cancelUrl: 'https://netflix.com/youraccount' },
  { name: 'ChatGPT Plus', cost: 1999.00, currency: '₹', cycle: 'monthly' as BillingCycle, category: 'Software & SaaS' as SubscriptionCategory, domain: 'openai.com', cancelUrl: 'https://chat.openai.com' },
  { name: 'Spotify Premium Duo', cost: 149.00, currency: '₹', cycle: 'monthly' as BillingCycle, category: 'Entertainment' as SubscriptionCategory, domain: 'spotify.com', cancelUrl: 'https://spotify.com/account' },
  { name: 'GitHub Copilot', cost: 850.00, currency: '₹', cycle: 'monthly' as BillingCycle, category: 'Software & SaaS' as SubscriptionCategory, domain: 'github.com', cancelUrl: 'https://github.com/settings/billing' },
  { name: 'Adobe Creative Cloud', cost: 4230.00, currency: '₹', cycle: 'monthly' as BillingCycle, category: 'Software & SaaS' as SubscriptionCategory, domain: 'adobe.com', cancelUrl: 'https://account.adobe.com/plans' },
  { name: 'Cult.fit Elite Gym', cost: 2499.00, currency: '₹', cycle: 'monthly' as BillingCycle, category: 'Health & Fitness' as SubscriptionCategory, domain: 'cult.fit', cancelUrl: 'https://cult.fit' },
  { name: 'Notion Plus + AI', cost: 800.00, currency: '₹', cycle: 'monthly' as BillingCycle, category: 'Productivity' as SubscriptionCategory, domain: 'notion.so', cancelUrl: 'https://notion.so/settings' },
  { name: 'Google One 2TB', cost: 650.00, currency: '₹', cycle: 'monthly' as BillingCycle, category: 'Cloud & Storage' as SubscriptionCategory, domain: 'google.com', cancelUrl: 'https://one.google.com' },
];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [cost, setCost] = useState<string>('649');
  const [currency, setCurrency] = useState<string>('₹');
  const [domain, setDomain] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [category, setCategory] = useState<SubscriptionCategory>('Entertainment');
  const [nextRenewalDate, setNextRenewalDate] = useState('');
  const [isTrial, setIsTrial] = useState(false);
  const [trialExpiryDate, setTrialExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [cancellationUrl, setCancellationUrl] = useState('');
  const [error, setError] = useState('');

  const { getBreakdown } = useCurrency();

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCost(String(initialData.cost));
      setCurrency(initialData.currency || '₹');
      setDomain(initialData.domain || extractDomain(initialData.name));
      setBillingCycle(initialData.billingCycle);
      setCategory(initialData.category);
      setNextRenewalDate(initialData.nextRenewalDate);
      setIsTrial(Boolean(initialData.trialExpiryDate));
      setTrialExpiryDate(initialData.trialExpiryDate || '');
      setNotes(initialData.notes || '');
      setCancellationUrl(initialData.cancellationUrl || '');
    } else {
      // Defaults for new entry in INR
      setName('');
      setCost('649');
      setCurrency('₹');
      setDomain('');
      setBillingCycle('monthly');
      setCategory('Entertainment');
      const d = new Date();
      d.setDate(d.getDate() + 14);
      setNextRenewalDate(d.toISOString().split('T')[0]);
      setIsTrial(false);
      setTrialExpiryDate('');
      setNotes('');
      setCancellationUrl('');
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Auto-suggest domain as user types name if user hasn't explicitly edited domain
  const handleNameChange = (val: string) => {
    setName(val);
    if (!domain || domain === extractDomain(name)) {
      setDomain(extractDomain(val));
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setName(preset.name);
    setCost(String(preset.cost));
    setCurrency(preset.currency);
    setDomain(preset.domain);
    setBillingCycle(preset.cycle);
    setCategory(preset.category);
    if (preset.cancelUrl) setCancellationUrl(preset.cancelUrl);
  };

  const parsedCost = parseFloat(cost) || 0;
  // Compute estimated INR cost for conversion display
  const effectiveCostInINR = convertToINR(parsedCost, currency);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Subscription name is required.');
      return;
    }
    if (isNaN(parsedCost) || parsedCost <= 0) {
      setError('Please enter a valid cost greater than 0.');
      return;
    }
    if (!nextRenewalDate) {
      setError('Please select the next renewal date.');
      return;
    }
    if (isTrial && !trialExpiryDate) {
      setError('Please specify when the free trial expires.');
      return;
    }

    const resolvedDomain = domain.trim() || extractDomain(name.trim());

    onSave(
      {
        name: name.trim(),
        cost: parsedCost,
        currency,
        billingCycle,
        category,
        nextRenewalDate,
        trialExpiryDate: isTrial ? trialExpiryDate : undefined,
        isPaused: initialData ? initialData.isPaused : false,
        domain: resolvedDomain,
        notes: notes.trim() || undefined,
        cancellationUrl: cancellationUrl.trim() || undefined,
      },
      initialData?.id
    );
    onClose();
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div 
        id="subscription-modal-dialog"
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 my-8 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {initialData ? 'Edit Subscription' : 'Add New Subscription'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Normalize billing cycles, auto-fetch logos, and protect your wallet
            </p>
          </div>
          <button
            id="close-subscription-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Presets */}
          {!initialData && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Popular Presets (Autofill Base INR Pricing)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700/80 transition-colors"
                  >
                    <BrandLogo name={preset.name} domain={preset.domain} size="xs" />
                    <span>{preset.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">₹{preset.cost}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subscription Name & Live Logo Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subscription Name *
              </label>
              <div className="relative flex items-center">
                <input
                  id="sub-modal-name"
                  type="text"
                  placeholder="e.g., Netflix, Spotify, ChatGPT..."
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
                <div className="absolute right-2">
                  <BrandLogo name={name || 'Service'} domain={domain} size="xs" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Logo Domain
              </label>
              <div className="relative flex items-center">
                <Globe className="absolute left-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  id="sub-modal-domain"
                  type="text"
                  placeholder="netflix.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Multi-Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Currency
              </label>
              <select
                id="sub-modal-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="₹">₹ INR (Indian Rupee - Base)</option>
                <option value="$">$ USD (US Dollar)</option>
                <option value="€">€ EUR (Euro)</option>
                <option value="£">£ GBP (British Pound)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cost *
              </label>
              <input
                id="sub-modal-cost"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="649.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Billing Cycle
              </label>
              <select
                id="sub-modal-billing-cycle"
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly (Annual)</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          {/* Dynamic Multi-Currency Equivalent Card */}
          {parsedCost > 0 && (
            <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-indigo-950 dark:text-indigo-200 font-semibold">
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
                <span>Base INR Value:</span>
                <span className="font-mono font-bold">{formatCurrencyAmount(effectiveCostInINR, 'INR')}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                <span>USD: {getBreakdown(effectiveCostInINR).usd}</span>
                <span>EUR: {getBreakdown(effectiveCostInINR).eur}</span>
                <span>GBP: {getBreakdown(effectiveCostInINR).gbp}</span>
              </div>
            </div>
          )}

          {/* Category & Next Renewal Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                id="sub-modal-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as SubscriptionCategory)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Next Renewal Date *
              </label>
              <input
                id="sub-modal-renewal-date"
                type="date"
                value={nextRenewalDate}
                onChange={(e) => setNextRenewalDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Free Trial Section */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="is-trial-checkbox" className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="is-trial-checkbox"
                  type="checkbox"
                  checked={isTrial}
                  onChange={(e) => setIsTrial(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  This subscription is currently in a Free Trial
                </span>
              </label>
              {isTrial && (
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                  24h Alert Armed
                </span>
              )}
            </div>

            {isTrial && (
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Trial Expiration Date (Auto-Charge Date) *
                </label>
                <input
                  id="sub-modal-trial-expiry"
                  type="date"
                  value={trialExpiryDate}
                  onChange={(e) => setTrialExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Cancellation URL & Notes */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Direct 1-Click Cancellation Link (Optional)
              </label>
              <input
                id="sub-modal-cancel-url"
                type="url"
                placeholder="https://service.com/account/billing/cancel"
                value={cancellationUrl}
                onChange={(e) => setCancellationUrl(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes & Self-Defense Strategy (Optional)
              </label>
              <textarea
                id="sub-modal-notes"
                rows={2}
                placeholder="Downgrade plan before renewal, share family slot, or audit usage..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              id="sub-modal-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="sub-modal-submit-btn"
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/25 transition-all"
            >
              {initialData ? 'Save Changes' : 'Arm Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
