export type CatalogCategory =
  | 'Streaming'
  | 'Music'
  | 'AI Tools'
  | 'Cloud Storage'
  | 'Productivity'
  | 'Education'
  | 'Gaming'
  | 'Developer Tools';

export type CatalogBillingCycle = 'monthly' | 'yearly' | 'quarterly' | 'weekly';

export interface CatalogPlan {
  id: string;
  name: string; // e.g. "Mobile", "Individual", "Family", "Standard", "Pro"
  price: number; // Standard price for the plan
  billingCycle: CatalogBillingCycle;
  currency: string; // e.g. 'INR', 'USD'
  currencySymbol: string; // e.g. '₹', '$'
  description?: string;
  features?: string[];
  isPopular?: boolean;
  savingsNote?: string; // e.g. "Save 16% annually", "Best value for families"
}

export interface CatalogService {
  id: string; // Unique identifier, e.g. 'netflix', 'spotify', 'chatgpt'
  name: string; // Service name, e.g. 'Netflix'
  category: CatalogCategory;
  description: string; // Brief description
  logo: string; // Logo image URL (Brandfetch CDN or SVG asset)
  iconFallback: string; // Monogram or short icon text fallback
  brandColor: string; // Dominant brand color hex
  website: string; // Official website URL
  cancellationUrl?: string; // Direct link to manage/cancel subscriptions
  availablePlans: CatalogPlan[];
  defaultPlanId: string;
  currency: string; // Primary local currency, e.g. 'INR'
  lastPriceChecked: string; // ISO date string (YYYY-MM-DD), e.g. '2026-03-01'
  tags: string[]; // Search and filter tags
  country: string; // Target market e.g. 'IN', 'Global'
}

export interface CatalogCategorySummary {
  category: CatalogCategory;
  serviceCount: number;
  planCount: number;
  minPrice: number;
  currency: string;
}
