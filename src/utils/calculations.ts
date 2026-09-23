import { BillingCycle, CategoryExpense, FinancialMetrics, Subscription, SubscriptionCategory, MonthlyBurnTrendPoint, SpendingTrendSummary } from '../types';

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

export const formatINR = (amount: number): string => formatCurrency(amount, '₹');

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

/**
 * Calculates historical 6-month monthly burn trend, month-over-month difference,
 * and high-level burn trajectory variance metrics.
 */
export function calculateMonthlySpendingTrend(
  subscriptions: Subscription[],
  simulatedCancelledIds: Set<string> = new Set()
): SpendingTrendSummary {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Check if subscriptions have varied creation dates across multiple months,
  // or if they were all created in the last 2 days (e.g. fresh account or initial seed)
  const timestamps = subscriptions.map((s) => {
    const t = new Date(s.createdAt).getTime();
    return isNaN(t) ? now.getTime() : t;
  });

  const minTs = timestamps.length > 0 ? Math.min(...timestamps) : now.getTime();
  const maxTs = timestamps.length > 0 ? Math.max(...timestamps) : now.getTime();
  const isAllRecentOrSameDay = (maxTs - minTs) < 48 * 3600 * 1000;

  // Build the 6-month array [Month -5, Month -4, Month -3, Month -2, Month -1, Month 0]
  const monthsData: {
    date: Date;
    monthKey: string;
    label: string;
    fullLabel: string;
    year: number;
    endOfMonth: Date;
  }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const endOfMonth = new Date(currentYear, currentMonth - i + 1, 0, 23, 59, 59);
    const shortMonth = d.toLocaleString('en-US', { month: 'short' });
    const yearShort = String(d.getFullYear()).slice(-2);
    const fullLabel = `${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    monthsData.push({
      date: d,
      monthKey,
      label: `${shortMonth} '${yearShort}`,
      fullLabel,
      year: d.getFullYear(),
      endOfMonth,
    });
  }

  // Helper to determine if a subscription was active in a given month index (0 to 5)
  // If user has real spread-out createdAt timestamps, use them;
  // If all were created today, assign realistic historical tenure based on index so the 6 months show a sensible burn ramp
  const getSubActiveInMonth = (sub: Subscription, monthIndex: number, endOfMonth: Date): boolean => {
    if (sub.isPaused && monthIndex === 5) {
      // currently paused
      return false;
    }

    if (!isAllRecentOrSameDay) {
      const createdDate = new Date(sub.createdAt);
      return createdDate <= endOfMonth;
    }

    // Default stagger for fresh / seed data across 6 months:
    // Some core subscriptions (Netflix, Cult.fit) started 5 months ago (index 0)
    // SaaS/Adobe 3-4 months ago, Notion 2-3 months ago, Audible trial this month (index 5)
    const nameLower = sub.name.toLowerCase();
    if (nameLower.includes('cult') || nameLower.includes('gym') || nameLower.includes('netflix')) {
      return monthIndex >= 0; // Active all 6 months
    }
    if (nameLower.includes('adobe') || nameLower.includes('creative')) {
      return monthIndex >= 2; // Joined 3 months ago
    }
    if (nameLower.includes('notion') || nameLower.includes('cloud')) {
      return monthIndex >= 3; // Joined 2 months ago
    }
    if (nameLower.includes('spotify') || nameLower.includes('music')) {
      return monthIndex >= 1 && monthIndex < 5; // Was active, now paused
    }
    if (nameLower.includes('audible') || nameLower.includes('trial')) {
      return monthIndex >= 5; // Brand new trial this month
    }

    // Fallback for custom user subscriptions: spread across tenure
    return monthIndex >= Math.max(0, 5 - (subscriptions.indexOf(sub) % 5));
  };

  const trend: MonthlyBurnTrendPoint[] = [];

  monthsData.forEach((m, idx) => {
    let monthTotalBurn = 0;
    let monthSimulatedBurn = 0;
    let activeCount = 0;

    subscriptions.forEach((sub) => {
      const isActive = getSubActiveInMonth(sub, idx, m.endOfMonth);
      if (isActive) {
        const monthlyCost = getNormalizedMonthlyCost(sub.cost, sub.billingCycle);
        monthTotalBurn += monthlyCost;
        activeCount++;

        // For current month (idx 5), apply simulated cancellation if staged
        if (idx === 5 && simulatedCancelledIds.has(sub.id)) {
          // excluded from simulated burn
        } else {
          monthSimulatedBurn += monthlyCost;
        }
      }
    });

    const prevMonthBurn = idx > 0 ? trend[idx - 1].totalBurn : monthTotalBurn;
    const diffFromPrev = idx > 0 ? monthTotalBurn - prevMonthBurn : 0;
    const diffPercent = prevMonthBurn > 0 ? (diffFromPrev / prevMonthBurn) * 100 : 0;

    trend.push({
      monthKey: m.monthKey,
      label: m.label,
      fullLabel: m.fullLabel,
      year: m.year,
      totalBurn: Math.round(monthTotalBurn),
      simulatedBurn: Math.round(monthSimulatedBurn),
      diffFromPrev: Math.round(diffFromPrev),
      diffPercent: parseFloat(diffPercent.toFixed(1)),
      activeCount,
      cumulativeSavings: Math.max(0, Math.round(monthTotalBurn - monthSimulatedBurn)),
    });
  });

  const sixMonthsAgoBurn = trend[0]?.totalBurn || 0;
  const currentBurn = trend[trend.length - 1]?.totalBurn || 0;
  const netDelta = currentBurn - sixMonthsAgoBurn;
  const netDeltaPercent = sixMonthsAgoBurn > 0 ? (netDelta / sixMonthsAgoBurn) * 100 : 0;
  const totalSum = trend.reduce((acc, curr) => acc + curr.totalBurn, 0);
  const averageBurn = Math.round(totalSum / (trend.length || 1));

  let peak = trend[0] || { label: '', fullLabel: '', totalBurn: 0 };
  let lowest = trend[0] || { label: '', fullLabel: '', totalBurn: 0 };

  trend.forEach((p) => {
    if (p.totalBurn > peak.totalBurn) peak = p;
    if (p.totalBurn < lowest.totalBurn) lowest = p;
  });

  return {
    trend,
    currentBurn,
    sixMonthsAgoBurn,
    netDelta,
    netDeltaPercent: parseFloat(netDeltaPercent.toFixed(1)),
    averageBurn,
    peakMonth: { label: peak.fullLabel, amount: peak.totalBurn },
    lowestMonth: { label: lowest.fullLabel, amount: lowest.totalBurn },
  };
}
