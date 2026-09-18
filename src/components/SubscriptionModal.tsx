import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Sparkles, AlertCircle, Calendar, Tag, Clock, Globe, ArrowRightLeft, 
  Search, Check, ArrowLeft, ChevronRight, CheckCircle2, ShieldCheck, 
  ExternalLink, Layers, DollarSign, PlusCircle
} from 'lucide-react';
import { BillingCycle, Subscription, SubscriptionCategory } from '../types';
import { CATEGORIES } from '../utils/calculations';
import { extractDomain } from '../utils/logos';
import { BrandLogo } from './BrandLogo';
import { CURRENCY_SYMBOLS, convertToINR, formatCurrencyAmount } from '../utils/currency';
import { useCurrency } from '../context/CurrencyContext';
import { 
  SUBSCRIPTION_CATALOG, 
  CATALOG_CATEGORIES, 
  CATALOG_CATEGORY_META,
  CatalogCategory, 
  CatalogPlan, 
  CatalogService, 
  searchCatalogServices, 
  mapCatalogCategoryToSubscriptionCategory 
} from '../catalog';

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

const POPULAR_SERVICE_IDS = [
  'netflix', 
  'spotify', 
  'youtube-premium', 
  'chatgpt-plus', 
  'prime-video', 
  'jiohotstar', 
  'google-one', 
  'microsoft-365', 
  'claude-pro', 
  'canva', 
  'xbox-game-pass', 
  'apple-music'
];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  // Modal Mode: 'catalog' by default for new subscriptions, 'manual' if editing or explicitly toggled
  const [mode, setMode] = useState<'catalog' | 'manual'>('catalog');

  // --- Catalog-Driven Flow State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CatalogCategory | 'All'>('All');
  const [selectedService, setSelectedService] = useState<CatalogService | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<CatalogPlan | null>(null);
  
  // Price Confirmation: 'standard' or 'custom'
  const [priceType, setPriceType] = useState<'standard' | 'custom'>('standard');
  const [customCost, setCustomCost] = useState<string>('');
  
  // Renewal Date in catalog flow
  const [catalogRenewalDate, setCatalogRenewalDate] = useState<string>('');
  const [catalogNotes, setCatalogNotes] = useState<string>('');

  // --- Manual Form State (Existing Pipeline) ---
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

  // Helper: compute default renewal date based on cycle
  const computeDefaultRenewal = (cycle: string): string => {
    const d = new Date();
    if (cycle === 'yearly') {
      d.setFullYear(d.getFullYear() + 1);
    } else if (cycle === 'weekly') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    return d.toISOString().split('T')[0];
  };

  // Reset state when modal opens or initialData changes
  useEffect(() => {
    if (initialData) {
      setMode('manual');
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
      // Default: Catalog-first for new subscriptions
      setMode('catalog');
      setSearchQuery('');
      setSelectedCategory('All');
      setSelectedService(null);
      setSelectedPlan(null);
      setPriceType('standard');
      setCustomCost('');
      setCatalogRenewalDate(computeDefaultRenewal('monthly'));
      setCatalogNotes('');

      // Manual fallback defaults
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

  // Filtered catalog services
  const catalogResults = useMemo(() => {
    return searchCatalogServices(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  // Popular services list when not searching
  const popularServices = useMemo(() => {
    return POPULAR_SERVICE_IDS
      .map((id) => SUBSCRIPTION_CATALOG.find((s) => s.id === id))
      .filter((s): s is CatalogService => Boolean(s));
  }, []);

  // Starting price calculator
  const getStartingPrice = (service: CatalogService) => {
    if (!service.availablePlans || service.availablePlans.length === 0) return '';
    const minPlan = service.availablePlans.reduce(
      (min, p) => (p.price < min.price ? p : min),
      service.availablePlans[0]
    );
    const cycleShort = minPlan.billingCycle === 'yearly' ? '/yr' : minPlan.billingCycle === 'weekly' ? '/wk' : '/mo';
    return `From ${minPlan.currencySymbol}${minPlan.price.toLocaleString('en-IN')}${cycleShort}`;
  };

  // Handler: Select a Service (Step 2)
  const handleSelectService = (service: CatalogService) => {
    setSelectedService(service);
    // Auto-select the default or first plan
    const defaultPlan = service.availablePlans.find((p) => p.id === service.defaultPlanId) || service.availablePlans[0];
    setSelectedPlan(defaultPlan || null);
    setPriceType('standard');
    if (defaultPlan) {
      setCustomCost(String(defaultPlan.price));
      setCatalogRenewalDate(computeDefaultRenewal(defaultPlan.billingCycle));
    }
    setError('');
  };

  // Handler: Select a Plan (Step 3)
  const handleSelectPlan = (plan: CatalogPlan) => {
    setSelectedPlan(plan);
    setCustomCost(String(plan.price));
    setCatalogRenewalDate(computeDefaultRenewal(plan.billingCycle));
    setError('');
  };

  // Handler: Catalog Add Submission (Step 6)
  const handleCatalogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) {
      setError('Please select a service.');
      return;
    }
    if (!selectedPlan) {
      setError('Please select a plan.');
      return;
    }

    const finalPrice = priceType === 'standard' ? selectedPlan.price : parseFloat(customCost);
    if (isNaN(finalPrice) || finalPrice <= 0) {
      setError('Please enter a valid price greater than 0.');
      return;
    }

    if (!catalogRenewalDate) {
      setError('Please select the next renewal date.');
      return;
    }

    // Convert billing cycle to model's BillingCycle ('monthly' | 'yearly' | 'weekly')
    const normalizedCycle: BillingCycle = 
      selectedPlan.billingCycle === 'quarterly' ? 'monthly' : selectedPlan.billingCycle;

    // Build standard Subscription object for the existing pipeline
    const subscriptionData: Omit<Subscription, 'id' | 'createdAt'> = {
      name: `${selectedService.name} - ${selectedPlan.name}`,
      cost: finalPrice,
      currency: selectedPlan.currencySymbol || '₹',
      billingCycle: normalizedCycle,
      category: mapCatalogCategoryToSubscriptionCategory(selectedService.category),
      nextRenewalDate: catalogRenewalDate,
      domain: extractDomain(selectedService.website),
      logoUrl: selectedService.logo,
      cancellationUrl: selectedService.cancellationUrl || selectedService.website,
      isPaused: false,
      notes: catalogNotes.trim() || undefined,
    };

    onSave(subscriptionData, initialData?.id);
    onClose();
  };

  // Handler: Manual Form Submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCost = parseFloat(cost) || 0;
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

  if (!isOpen) return null;

  const parsedCost = parseFloat(cost) || 0;
  const effectiveCostInINR = convertToINR(parsedCost, currency);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div 
        id="subscription-modal-dialog"
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col text-slate-900 dark:text-slate-100 my-auto animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            {mode === 'catalog' && selectedService && (
              <button
                type="button"
                onClick={() => {
                  setSelectedService(null);
                  setSelectedPlan(null);
                  setError('');
                }}
                className="p-1 -ml-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer mr-1"
                title="Back to Service Search"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                {initialData ? (
                  'Edit Subscription'
                ) : mode === 'catalog' ? (
                  selectedService ? (
                    <>
                      <span>Configure {selectedService.name}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {selectedService.category}
                      </span>
                    </>
                  ) : (
                    'Add Subscription'
                  )
                ) : (
                  'Add Subscription Manually'
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {mode === 'catalog' && !selectedService
                  ? 'Select from verified catalog plans or search your favorite service'
                  : mode === 'catalog' && selectedService
                  ? 'Choose your plan, verify pricing, and set your next renewal date'
                  : 'Customize exact billing amounts, custom domains, and renewal cycles'}
              </p>
            </div>
          </div>
          <button
            id="close-subscription-modal-btn"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mx-5 mt-4 flex items-center gap-2 p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 rounded-xl shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Content Scroll Area */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6">
          {/* ========================================================= */}
          {/* MODE 1: CATALOG - STEP 1 & 2 (SEARCH & SELECT SERVICE) */}
          {/* ========================================================= */}
          {mode === 'catalog' && !selectedService && (
            <div className="space-y-5">
              {/* 1. Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="catalog-service-search"
                  type="text"
                  placeholder="Search 30+ services (Netflix, Spotify, ChatGPT, Google One...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    selectedCategory === 'All'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  All Services ({SUBSCRIPTION_CATALOG.length})
                </button>
                {CATALOG_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Popular Services Section (Shown when no search query and 'All' category) */}
              {!searchQuery && selectedCategory === 'All' && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Popular Subscriptions
                    </span>
                    <span className="text-[11px] text-slate-400">Click to select plan</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {popularServices.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => handleSelectService(service)}
                        className="group flex items-center gap-3 p-3 text-left rounded-xl bg-slate-50/70 dark:bg-slate-800/60 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all cursor-pointer"
                      >
                        <BrandLogo
                          name={service.name}
                          domain={extractDomain(service.website)}
                          logoUrl={service.logo}
                          size="md"
                          className="shrink-0 group-hover:scale-105 transition-transform"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-xs text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {service.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {getStartingPrice(service)}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results / Full Catalog List */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {searchQuery ? `Matching Services (${catalogResults.length})` : 'All Services'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {catalogResults.length} services available
                  </span>
                </div>

                {catalogResults.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No services found matching <span className="font-semibold text-slate-700 dark:text-slate-300">"{searchQuery}"</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setName(searchQuery);
                        setMode('manual');
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add "{searchQuery}" manually
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                    {catalogResults.map((service) => {
                      const categoryMeta = CATALOG_CATEGORY_META[service.category];
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => handleSelectService(service)}
                          className="group flex items-center justify-between p-3 text-left rounded-xl bg-white dark:bg-slate-800/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer shadow-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <BrandLogo
                              name={service.name}
                              domain={extractDomain(service.website)}
                              logoUrl={service.logo}
                              size="md"
                              className="shrink-0 group-hover:scale-105 transition-transform"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {service.name}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium border shrink-0 ${categoryMeta?.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                                  {service.category}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                <span>{getStartingPrice(service)}</span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-[10px] text-slate-400">{service.availablePlans.length} plans</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODE 1: CATALOG - STEPS 3, 4, 5 (PLAN, PRICE, RENEWAL)    */}
          {/* ========================================================= */}
          {mode === 'catalog' && selectedService && (
            <form onSubmit={handleCatalogSubmit} className="space-y-6">
              {/* Service Summary Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <BrandLogo
                    name={selectedService.name}
                    domain={extractDomain(selectedService.website)}
                    logoUrl={selectedService.logo}
                    size="md"
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {selectedService.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {selectedService.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {selectedService.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedService(null);
                    setSelectedPlan(null);
                  }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 ml-3 cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* 3. Select Plan */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Select Plan *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedService.availablePlans.map((plan) => {
                    const isSelected = selectedPlan?.id === plan.id;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => handleSelectPlan(plan)}
                        className={`relative p-3.5 rounded-xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {plan.name}
                            </span>
                            {plan.isPopular && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                                Popular
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline gap-1 mt-1 font-mono">
                            <span className="text-base font-extrabold text-slate-900 dark:text-white">
                              {plan.currencySymbol}{plan.price.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 lowercase">
                              / {plan.billingCycle}
                            </span>
                          </div>

                          {plan.savingsNote && (
                            <div className="mt-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                              {plan.savingsNote}
                            </div>
                          )}

                          {plan.features && plan.features.length > 0 && (
                            <ul className="mt-2.5 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                              {plan.features.slice(0, 3).map((feat, idx) => (
                                <li key={idx} className="flex items-center gap-1.5">
                                  <Check className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <span className="truncate">{feat}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                            {plan.billingCycle}
                          </span>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Confirm Price */}
              {selectedPlan && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Confirm Price
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Standard price option */}
                    <label
                      className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                        priceType === 'standard'
                          ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-xs'
                          : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-900'
                      }`}
                    >
                      <input
                        type="radio"
                        name="priceChoice"
                        checked={priceType === 'standard'}
                        onChange={() => setPriceType('standard')}
                        className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          Use standard price
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {selectedPlan.currencySymbol}{selectedPlan.price.toLocaleString('en-IN')} / {selectedPlan.billingCycle}
                        </div>
                      </div>
                    </label>

                    {/* Custom price option */}
                    <label
                      className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                        priceType === 'custom'
                          ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-xs'
                          : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-900'
                      }`}
                    >
                      <input
                        type="radio"
                        name="priceChoice"
                        checked={priceType === 'custom'}
                        onChange={() => setPriceType('custom')}
                        className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          I pay a different amount
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Student discount, split, or promotional
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* If custom price selected, show input */}
                  {priceType === 'custom' && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Enter Custom Amount ({selectedPlan.currencySymbol}) *
                      </label>
                      <div className="relative flex items-center max-w-xs">
                        <span className="absolute left-3 text-xs font-mono font-bold text-slate-500">
                          {selectedPlan.currencySymbol}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="e.g. 299"
                          value={customCost}
                          onChange={(e) => setCustomCost(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          autoFocus
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. Renewal Date */}
              {selectedPlan && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Next Renewal Date *
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={catalogRenewalDate}
                        onChange={(e) => setCatalogRenewalDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    {/* Quick helper shortcuts */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setCatalogRenewalDate(computeDefaultRenewal('monthly'))}
                        className="px-2 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        +1 Month
                      </button>
                      <button
                        type="button"
                        onClick={() => setCatalogRenewalDate(computeDefaultRenewal('yearly'))}
                        className="px-2 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        +1 Year
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 14);
                          setCatalogRenewalDate(d.toISOString().split('T')[0]);
                        }}
                        className="px-2 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        In 14 Days
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Shared with roommates, review before renew"
                      value={catalogNotes}
                      onChange={(e) => setCatalogNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      <span>Encrypted client-side before Firestore sync</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Add Subscription Action */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedService(null);
                    setSelectedPlan(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  ← Choose another service
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="catalog-add-subscription-btn"
                    type="submit"
                    className="px-6 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Add Subscription</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* MODE 2: MANUAL FORM (ORIGINAL OR EDITING)                 */}
          {/* ========================================================= */}
          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4 sm:space-y-5">
              {!initialData && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Adding custom or unlisted subscription
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('catalog');
                      setError('');
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    ← Back to Catalog Search
                  </button>
                </div>
              )}

              {/* Quick Presets for Manual */}
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

              {/* Subscription Name & Domain */}
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
                    Notes & Strategy (Optional)
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
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  {initialData ? 'Save Changes' : 'Arm Subscription'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Bottom Footer: Persistent "Can't find your subscription? Add manually" */}
        {mode === 'catalog' && !initialData && (
          <div className="px-6 py-3.5 bg-slate-50/90 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
            <span className="text-slate-500 dark:text-slate-400">
              Can't find your subscription?
            </span>
            <button
              id="open-manual-sub-btn"
              type="button"
              onClick={() => {
                setMode('manual');
                setError('');
              }}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline cursor-pointer flex items-center gap-1"
            >
              Add manually
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

