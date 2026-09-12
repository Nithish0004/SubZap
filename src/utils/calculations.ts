import { BillingCycle, CategoryExpense, FinancialMetrics, Subscription, SubscriptionCategory } from '../types';

export const CATEGORY_COLORS: Record<SubscriptionCategory, string> = {
  'Entertainment': '#818CF8', // Indigo
  'Software & SaaS': '#38BDF8', // Sky Blue
  'Health & Fitness': '#34D399', // Emerald
  'Productivity': '#A78BFA', // Violet
  'Cloud & Storage': '#F472B6', // Pink
  'Utilities': '#FBBF24', // Amber
  'News & Media': '#FB7185', // Rose
  'Other': '#94A3B8', // Slate
};

export const CATEGORIES: SubscriptionCategory[] = [
  'Entertainment',
  'Software & SaaS',
  'Health & Fitness',
  'Productivity',
  'Cloud & Storage',
  'Utilities',
  'News & Media',
  'Other',
];

/**
 * Normalizes any billing cycle into an accurate monthly burn cost
 */
export function getNormalizedMonthlyCost(cost: number, cycle: BillingCycle): number {
  if (!cost || cost <= 0) return 0;
  switch (cycle) {
    case 'weekly':
      return (cost * 52) / 12;
    case 'monthly':
      return cost;
    case 'yearly':
      return cost / 12;
    default:
      return cost;
  }
}

/**
 * Normalizes any billing cycle into an annual cost
 */
export function getNormalizedAnnualCost(cost: number, cycle: BillingCycle): number {
  if (!cost || cost <= 0) return 0;
  switch (cycle) {
    case 'weekly':
      return cost * 52;
    case 'monthly':
      return cost * 12;
    case 'yearly':
      return cost;
    default:
      return cost * 12;
  }
}

/**
 * Format currency with 2 decimals and regional formatting (INR default)
 */
export function formatCurrency(amount: number, currency = '₹'): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  const isINR = currency === '₹' || currency === 'INR';
  const locale = isINR ? 'en-IN' : currency === '€' ? 'de-DE' : currency === '£' ? 'en-GB' : 'en-US';
  const formatted = safeAmount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency}${formatted}`;
}

/**
 * Get difference in full calendar days between today and target date string (YYYY-MM-DD)
 */
export function getDaysUntil(dateStr: string): number {
  if (!dateStr) return 999;
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Human readable label for days countdown
 */
export function getCountdownBadge(dateStr: string): { label: string; isUrgent: boolean; isToday: boolean; isPast: boolean } {
  const days = getDaysUntil(dateStr);
  if (days < 0) {
    return { label: `${Math.abs(days)}d overdue`, isUrgent: true, isToday: false, isPast: true };
  }
  if (days === 0) {
    return { label: 'Renews Today!', isUrgent: true, isToday: true, isPast: false };
  }
  if (days === 1) {
    return { label: 'Tomorrow', isUrgent: true, isToday: false, isPast: false };
  }
  if (days <= 7) {
    return { label: `In ${days} days`, isUrgent: days <= 3, isToday: false, isPast: false };
  }
  return { label: `In ${days} days`, isUrgent: false, isToday: false, isPast: false };
}

/**
 * Calculate all reactive financial metrics, including simulation overrides
 */
export function calculateFinancialMetrics(
  subscriptions: Subscription[],
  simulatedCancelledIds: Set<string> = new Set()
): FinancialMetrics {
  let totalMonthlyBurn = 0;
  let projectedYearlyBleed = 0;
  let activeCount = 0;
  let pausedCount = 0;
  let pausedMonthlySavings = 0;
  let trialCount = 0;
  let renewalsNext7DaysCount = 0;
  let renewalsNext24HoursCount = 0;

  let simulatedMonthlyBurn = 0;
  let simulatedMonthlySavings = 0;

  const categoryTotals: Record<SubscriptionCategory, { monthly: number; count: number }> = {
    'Entertainment': { monthly: 0, count: 0 },
    'Software & SaaS': { monthly: 0, count: 0 },
    'Health & Fitness': { monthly: 0, count: 0 },
    'Productivity': { monthly: 0, count: 0 },
    'Cloud & Storage': { monthly: 0, count: 0 },
    'Utilities': { monthly: 0, count: 0 },
    'News & Media': { monthly: 0, count: 0 },
    'Other': { monthly: 0, count: 0 },
  };

  subscriptions.forEach((sub) => {
    const monthlyCost = getNormalizedMonthlyCost(sub.cost, sub.billingCycle);
    const annualCost = getNormalizedAnnualCost(sub.cost, sub.billingCycle);
    const daysUntilRenewal = getDaysUntil(sub.nextRenewalDate);

    const isTrial = Boolean(sub.trialExpiryDate);
    if (isTrial) {
      trialCount++;
    }

    if (sub.isPaused) {
      pausedCount++;
      pausedMonthlySavings += monthlyCost;
    } else {
      activeCount++;
      totalMonthlyBurn += monthlyCost;
      projectedYearlyBleed += annualCost;

      // Category breakdown (only for active, unpaused subs)
      const cat = sub.category in categoryTotals ? sub.category : 'Other';
      categoryTotals[cat].monthly += monthlyCost;
      categoryTotals[cat].count += 1;

      // Renewals count
      if (daysUntilRenewal >= 0 && daysUntilRenewal <= 7) {
        renewalsNext7DaysCount++;
      }
      if (daysUntilRenewal >= 0 && daysUntilRenewal <= 1) {
        renewalsNext24HoursCount++;
      }

      // Simulated cancellation impact
      if (simulatedCancelledIds.has(sub.id)) {
        simulatedMonthlySavings += monthlyCost;
      } else {
        simulatedMonthlyBurn += monthlyCost;
      }
    }
  });

  const simulatedYearlySavings = simulatedMonthlySavings * 12;
  const simulatedYearlyBleed = simulatedMonthlyBurn * 12;

  // Build category expense list
  const categoryBreakdown: CategoryExpense[] = Object.entries(categoryTotals)
    .filter(([_, data]) => data.count > 0 || data.monthly > 0)
    .map(([category, data]) => {
      const cat = category as SubscriptionCategory;
      const percentage = totalMonthlyBurn > 0 ? (data.monthly / totalMonthlyBurn) * 100 : 0;
      return {
        category: cat,
        monthlyAmount: data.monthly,
        annualAmount: data.monthly * 12,
        percentage,
        count: data.count,
        color: CATEGORY_COLORS[cat] || '#94A3B8',
      };
    })
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  return {
    totalMonthlyBurn,
    projectedYearlyBleed,
    activeCount,
    pausedCount,
    pausedMonthlySavings,
    trialCount,
    renewalsNext7DaysCount,
    renewalsNext24HoursCount,
    categoryBreakdown,
    simulatedMonthlySavings,
    simulatedYearlySavings,
    simulatedMonthlyBurn,
    simulatedYearlyBleed,
  };
}
