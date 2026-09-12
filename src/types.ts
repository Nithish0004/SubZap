export type BillingCycle = 'monthly' | 'yearly' | 'weekly';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export type FinancialGoal = 
  | 'Relaxed/Informational' 
  | 'Moderate Tracking' 
  | 'Strict/Aggressive Budgeting';

export type SubscriptionCategory =
  | 'Entertainment'
  | 'Software & SaaS'
  | 'Health & Fitness'
  | 'Productivity'
  | 'Cloud & Storage'
  | 'Utilities'
  | 'News & Media'
  | 'Other';

export interface UserProfile {
  userId: string;
  fullName: string;
  averageMonthlyExpense: number;
  financialGoal: FinancialGoal;
  targetMonthlyBudget: number;
  identity?: string;
  authProvider?: 'google' | 'email' | 'phone';
  createdAt?: string;
  updatedAt?: string;
}

export interface Subscription {
  id: string; // UUID
  name: string;
  cost: number;
  currency: string; // e.g. '₹' or 'INR' or '$'
  billingCycle: BillingCycle;
  category: SubscriptionCategory;
  nextRenewalDate: string; // YYYY-MM-DD
  trialExpiryDate?: string; // YYYY-MM-DD if applicable
  isPaused: boolean;
  notes?: string;
  cancellationUrl?: string;
  domain?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Encrypted format stored in the remote Firestore database.
 * Sensitive fields (Name, Cost, Renewal Date, Trial Date, Notes, Cancel URL)
 * are stored as AES ciphertext.
 */
export interface EncryptedSubscriptionRecord {
  id: string;
  userId: string;
  nameEnc: string;
  costEnc: string;
  nextRenewalDateEnc: string;
  trialExpiryDateEnc?: string;
  notesEnc?: string;
  cancellationUrlEnc?: string;
  category: SubscriptionCategory;
  billingCycle: BillingCycle;
  currency: string;
  domain?: string;
  logoUrl?: string;
  isPaused: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryExpense {
  category: SubscriptionCategory;
  monthlyAmount: number;
  annualAmount: number;
  percentage: number;
  count: number;
  color: string;
}

export interface FinancialMetrics {
  totalMonthlyBurn: number;
  projectedYearlyBleed: number;
  activeCount: number;
  pausedCount: number;
  pausedMonthlySavings: number;
  trialCount: number;
  renewalsNext7DaysCount: number;
  renewalsNext24HoursCount: number;
  categoryBreakdown: CategoryExpense[];
  simulatedMonthlySavings: number;
  simulatedYearlySavings: number;
  simulatedMonthlyBurn: number;
  simulatedYearlyBleed: number;
}
