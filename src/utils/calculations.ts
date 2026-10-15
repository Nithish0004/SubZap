import { 
  BillingCycle, 
  CategoryExpense, 
  FinancialMetrics, 
  Subscription, 
  SubscriptionCategory, 
  MonthlyBurnTrendPoint, 
  SpendingTrendSummary,
  SubscriptionHealthScore,
  HealthScorePillar,
  HealthScoreRecommendation
} from '../types';

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

export interface HealthScoreCalculationOptions {
  subscriptions: Subscription[];
  targetMonthlyBudget?: number;
  averageMonthlyExpense?: number;
  simulatedCancelledIds?: Set<string>;
  projectionMode?: 'monthly' | 'annual';
}

/**
 * Calculates a comprehensive Subscription Health Score (0 - 100)
 * heavily weighted on spend vs. stated target budget, complemented by living expense drain,
 * trial safety, and portfolio management hygiene.
 */
export function calculateSubscriptionHealthScore(options: HealthScoreCalculationOptions): SubscriptionHealthScore {
  const {
    subscriptions,
    targetMonthlyBudget = 5000,
    averageMonthlyExpense = 45000,
    simulatedCancelledIds = new Set(),
    projectionMode = 'monthly',
  } = options;

  const isAnnual = projectionMode === 'annual';
  const multiplier = isAnnual ? 12 : 1;

  const statedBudget = (targetMonthlyBudget || 5000) * multiplier;

  // Active (unpaused) subscriptions
  const activeSubs = subscriptions.filter((s) => !s.isPaused);
  const rawMonthlySpend = activeSubs.reduce(
    (acc, sub) => acc + getNormalizedMonthlyCost(sub.cost, sub.billingCycle),
    0
  );
  const actualSpend = rawMonthlySpend * multiplier;

  const spendToBudgetRatio = statedBudget > 0 ? actualSpend / statedBudget : 1;
  const spendToBudgetPercentage = Math.round(spendToBudgetRatio * 100);
  const headroomOrDeficit = statedBudget - actualSpend;
  const isOverBudget = actualSpend > statedBudget;

  // 1. Budget Adherence Pillar (Max 50 points) - Heaviest weight
  let budgetScore = 50;
  let budgetStatus: 'optimal' | 'good' | 'warning' | 'critical' = 'optimal';
  if (actualSpend === 0) {
    budgetScore = 50;
    budgetStatus = 'optimal';
  } else if (spendToBudgetRatio <= 0.6) {
    budgetScore = 50;
    budgetStatus = 'optimal';
  } else if (spendToBudgetRatio <= 0.8) {
    budgetScore = Math.round(50 - ((spendToBudgetRatio - 0.6) / 0.2) * 8);
    budgetStatus = 'good';
  } else if (spendToBudgetRatio <= 1.0) {
    budgetScore = Math.round(42 - ((spendToBudgetRatio - 0.8) / 0.2) * 12);
    budgetStatus = 'warning';
  } else if (spendToBudgetRatio <= 1.3) {
    budgetScore = Math.max(10, Math.round(30 - ((spendToBudgetRatio - 1.0) / 0.3) * 20));
    budgetStatus = 'critical';
  } else {
    budgetScore = Math.max(0, Math.round(10 - ((spendToBudgetRatio - 1.3) / 0.5) * 10));
    budgetStatus = 'critical';
  }

  // 2. Living Expense Drain Pillar (Max 20 points)
  const monthlyLivingExpense = averageMonthlyExpense || 45000;
  const livingDrainRatio = monthlyLivingExpense > 0 ? rawMonthlySpend / monthlyLivingExpense : 0;
  let drainScore = 20;
  let drainStatus: 'optimal' | 'good' | 'warning' | 'critical' = 'optimal';
  if (livingDrainRatio <= 0.05) {
    drainScore = 20;
    drainStatus = 'optimal';
  } else if (livingDrainRatio <= 0.10) {
    drainScore = Math.round(20 - ((livingDrainRatio - 0.05) / 0.05) * 5);
    drainStatus = 'good';
  } else if (livingDrainRatio <= 0.15) {
    drainScore = Math.round(15 - ((livingDrainRatio - 0.10) / 0.05) * 7);
    drainStatus = 'warning';
  } else {
    drainScore = Math.max(0, Math.round(8 - ((livingDrainRatio - 0.15) / 0.10) * 8));
    drainStatus = 'critical';
  }

  // 3. Trial & Renewal Safety Pillar (Max 15 points)
  const activeTrials = subscriptions.filter((s) => Boolean(s.trialExpiryDate));
  const urgentRenewals = activeSubs.filter((s) => {
    const days = getDaysUntil(s.nextRenewalDate);
    return days >= 0 && days <= 1;
  });
  let safetyScore = 15;
  safetyScore -= activeTrials.length * 4;
  if (urgentRenewals.length > 2) safetyScore -= 2;
  safetyScore = Math.max(0, Math.min(15, safetyScore));
  const safetyStatus: 'optimal' | 'good' | 'warning' | 'critical' = 
    safetyScore >= 13 ? 'optimal' : safetyScore >= 10 ? 'good' : safetyScore >= 6 ? 'warning' : 'critical';

  // 4. Portfolio Management Hygiene Pillar (Max 15 points)
  const pausedCount = subscriptions.filter((s) => s.isPaused).length;
  let hygieneScore = 8;
  if (pausedCount > 0) hygieneScore += 4; // active defense practiced
  if (activeSubs.length > 0 && activeSubs.length <= 8) hygieneScore += 3; // disciplined portfolio size
  else if (activeSubs.length > 12) hygieneScore -= 2; // subscription sprawl
  hygieneScore = Math.max(0, Math.min(15, hygieneScore));
  const hygieneStatus: 'optimal' | 'good' | 'warning' | 'critical' =
    hygieneScore >= 13 ? 'optimal' : hygieneScore >= 10 ? 'good' : hygieneScore >= 7 ? 'warning' : 'critical';

  // Overall Total Score (0 - 100)
  const score = Math.max(0, Math.min(100, budgetScore + drainScore + safetyScore + hygieneScore));

  // Determine Grade & Tier
  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A+';
  let status: 'Optimal' | 'Healthy' | 'Moderate' | 'At Risk' | 'Critical Bleed' = 'Optimal';
  let statusColor = 'text-emerald-600 dark:text-emerald-400';
  let statusBgColor = 'bg-emerald-50 dark:bg-emerald-950/50';
  let statusBorderColor = 'border-emerald-200 dark:border-emerald-800';

  if (score >= 90) {
    grade = 'A+';
    status = 'Optimal';
    statusColor = 'text-emerald-600 dark:text-emerald-400';
    statusBgColor = 'bg-emerald-50 dark:bg-emerald-950/50';
    statusBorderColor = 'border-emerald-200 dark:border-emerald-800';
  } else if (score >= 80) {
    grade = 'A';
    status = 'Healthy';
    statusColor = 'text-emerald-600 dark:text-emerald-400';
    statusBgColor = 'bg-emerald-50 dark:bg-emerald-950/50';
    statusBorderColor = 'border-emerald-200 dark:border-emerald-800';
  } else if (score >= 70) {
    grade = 'B';
    status = 'Moderate';
    statusColor = 'text-indigo-600 dark:text-indigo-400';
    statusBgColor = 'bg-indigo-50 dark:bg-indigo-950/50';
    statusBorderColor = 'border-indigo-200 dark:border-indigo-800';
  } else if (score >= 55) {
    grade = 'C';
    status = 'At Risk';
    statusColor = 'text-amber-600 dark:text-amber-400';
    statusBgColor = 'bg-amber-50 dark:bg-amber-950/50';
    statusBorderColor = 'border-amber-200 dark:border-amber-800';
  } else if (score >= 35) {
    grade = 'D';
    status = 'Critical Bleed';
    statusColor = 'text-rose-600 dark:text-rose-400';
    statusBgColor = 'bg-rose-50 dark:bg-rose-950/50';
    statusBorderColor = 'border-rose-200 dark:border-rose-800';
  } else {
    grade = 'F';
    status = 'Critical Bleed';
    statusColor = 'text-rose-700 dark:text-rose-400';
    statusBgColor = 'bg-rose-100 dark:bg-rose-950/70';
    statusBorderColor = 'border-rose-300 dark:border-rose-700';
  }

  // Calculate simulated score if simulatedCancelledIds are active
  let simulatedScore: number | undefined = undefined;
  let scoreDelta: number | undefined = undefined;

  if (simulatedCancelledIds.size > 0) {
    const remainingSubs = subscriptions.filter((s) => !simulatedCancelledIds.has(s.id));
    const simResult = calculateSubscriptionHealthScore({
      subscriptions: remainingSubs,
      targetMonthlyBudget,
      averageMonthlyExpense,
      simulatedCancelledIds: new Set(),
      projectionMode,
    });
    simulatedScore = simResult.score;
    scoreDelta = simulatedScore - score;
  }

  // Build Recommendations
  const recommendations: HealthScoreRecommendation[] = [];

  // Top active subscription by monthly cost
  const sortedActive = [...activeSubs].sort(
    (a, b) => getNormalizedMonthlyCost(b.cost, b.billingCycle) - getNormalizedMonthlyCost(a.cost, a.billingCycle)
  );
  const topCostSub = sortedActive[0];

  if (isOverBudget) {
    recommendations.push({
      id: 'over-budget-warning',
      type: 'critical',
      title: `Over Budget by ${formatCurrency(Math.abs(headroomOrDeficit))}`,
      description: `Current spend is ${spendToBudgetPercentage}% of your stated ${isAnnual ? 'annual' : 'monthly'} ceiling.`,
      impact: topCostSub 
        ? `Pausing ${topCostSub.name} saves ${formatCurrency(getNormalizedMonthlyCost(topCostSub.cost, topCostSub.billingCycle) * multiplier)}/yr and restores health headroom.`
        : 'Pause low-utility subscriptions to reclaim budget compliance.',
      actionType: topCostSub ? 'pause' : 'edit_budget',
      targetSubscriptionId: topCostSub?.id,
      targetSubscriptionName: topCostSub?.name,
    });
  } else if (spendToBudgetPercentage >= 80) {
    recommendations.push({
      id: 'near-budget-alert',
      type: 'warning',
      title: `Approaching Budget Ceiling (${spendToBudgetPercentage}% Utilized)`,
      description: `You have ${formatCurrency(headroomOrDeficit)} in safe headroom before crossing your stated monthly limit.`,
      impact: 'Avoid adding new recurring subscriptions without cancelling equivalent spend.',
      actionType: 'edit_budget',
    });
  } else {
    recommendations.push({
      id: 'healthy-budget-status',
      type: 'positive',
      title: `Disciplined Budget Headroom (+${formatCurrency(headroomOrDeficit)} Buffer)`,
      description: `Your subscription spend is comfortably capped at ${spendToBudgetPercentage}% of your stated target.`,
      impact: 'Maintain this margin to protect against surprise annual renewals.',
    });
  }

  if (activeTrials.length > 0) {
    recommendations.push({
      id: 'active-trials-risk',
      type: 'warning',
      title: `${activeTrials.length} Monitored Free Trial${activeTrials.length > 1 ? 's' : ''} Pending`,
      description: `Trials can unexpectedly flip into paid subscription cycles.`,
      impact: `Review ${activeTrials[0].name} before expiration to prevent unbudgeted debit.`,
      actionType: 'view_trials',
      targetSubscriptionId: activeTrials[0].id,
      targetSubscriptionName: activeTrials[0].name,
    });
  }

  if (simulatedCancelledIds.size > 0 && scoreDelta && scoreDelta > 0) {
    recommendations.push({
      id: 'simulated-impact',
      type: 'action',
      title: `Staged Cancellations (+${scoreDelta} Health Score Points)`,
      description: `${simulatedCancelledIds.size} subscription${simulatedCancelledIds.size > 1 ? 's' : ''} staged for cancellation.`,
      impact: `Executing these will upgrade your Health Score from ${score} (${grade}) to ${simulatedScore} (${simResultGrade(simulatedScore)}).`,
      actionType: 'cancel',
    });
  }

  if (pausedCount > 0) {
    recommendations.push({
      id: 'paused-savings-boost',
      type: 'positive',
      title: `Active Defense Bonus (${pausedCount} Paused)`,
      description: `You are preventing recurring spend through active pausing.`,
      impact: 'Good financial hygiene contributes +4 pts to your portfolio health.',
    });
  }

  return {
    score,
    simulatedScore,
    scoreDelta,
    grade,
    status,
    statusColor,
    statusBgColor,
    statusBorderColor,
    spendToBudgetRatio,
    spendToBudgetPercentage,
    statedBudget,
    actualSpend,
    headroomOrDeficit,
    isOverBudget,
    pillars: {
      budgetAdherence: {
        name: 'Budget Adherence',
        score: budgetScore,
        maxScore: 50,
        label: `${spendToBudgetPercentage}% of stated ceiling`,
        percentage: Math.round((budgetScore / 50) * 100),
        status: budgetStatus,
        description: isOverBudget 
          ? `Overstated by ${formatCurrency(Math.abs(headroomOrDeficit))}` 
          : `${formatCurrency(headroomOrDeficit)} headroom remaining`,
      },
      expenseDrain: {
        name: 'Living Expense Drain',
        score: drainScore,
        maxScore: 20,
        label: `${(livingDrainRatio * 100).toFixed(1)}% of living expenses`,
        percentage: Math.round((drainScore / 20) * 100),
        status: drainStatus,
        description: livingDrainRatio > 0.12 ? 'Elevated portion of living costs' : 'Healthy expenditure ratio',
      },
      renewalSafety: {
        name: 'Trial & Renewal Safety',
        score: safetyScore,
        maxScore: 15,
        label: activeTrials.length === 0 ? 'No trial risks' : `${activeTrials.length} active trial(s)`,
        percentage: Math.round((safetyScore / 15) * 100),
        status: safetyStatus,
        description: activeTrials.length > 0 ? 'Expiring trials require monitoring' : 'All renewals predictable',
      },
      portfolioEfficiency: {
        name: 'Portfolio Management',
        score: hygieneScore,
        maxScore: 15,
        label: `${activeSubs.length} active, ${pausedCount} paused`,
        percentage: Math.round((hygieneScore / 15) * 100),
        status: hygieneStatus,
        description: pausedCount > 0 ? 'Active defense saves monthly bleed' : 'Standard subscription set',
      },
    },
    recommendations,
  };
}

function simResultGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

