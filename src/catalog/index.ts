/**
 * Centralized Reusable Subscription Catalog
 * 
 * Provides a standardized, single-source-of-truth registry for popular
 * subscription services in India and globally.
 */

import { CatalogCategory, CatalogPlan, CatalogService, CatalogBillingCycle } from './types';
import { streamingServices } from './data/streaming';
import { musicServices } from './data/music';
import { aiServices } from './data/aiTools';
import { cloudStorageServices } from './data/cloudStorage';
import { productivityServices } from './data/productivity';
import { educationServices } from './data/education';
import { gamingServices } from './data/gaming';
import { developerToolsServices } from './data/developerTools';
import { SubscriptionCategory } from '../types';

export * from './types';

/**
 * Master Centralized Catalog Array
 * Combines services across all supported categories.
 */
export const SUBSCRIPTION_CATALOG: CatalogService[] = [
  ...streamingServices,
  ...musicServices,
  ...aiServices,
  ...cloudStorageServices,
  ...productivityServices,
  ...educationServices,
  ...gamingServices,
  ...developerToolsServices,
];

/**
 * Standard Catalog Categories
 */
export const CATALOG_CATEGORIES: CatalogCategory[] = [
  'Streaming',
  'Music',
  'AI Tools',
  'Cloud Storage',
  'Productivity',
  'Education',
  'Gaming',
  'Developer Tools',
];

/**
 * Category metadata for UI styling and badging
 */
export const CATALOG_CATEGORY_META: Record<
  CatalogCategory, 
  { label: string; icon: string; badgeColor: string; description: string }
> = {
  Streaming: {
    label: 'Streaming & Video',
    icon: 'Tv',
    badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900',
    description: 'Movies, web series, live sports, and television networks',
  },
  Music: {
    label: 'Music & Audio',
    icon: 'Headphones',
    badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    description: 'Hi-fi music streaming, podcasts, and caller tunes',
  },
  'AI Tools': {
    label: 'AI & Machine Learning',
    icon: 'Sparkles',
    badgeColor: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200 dark:border-violet-900',
    description: 'Generative AI, reasoning models, and intelligence assistants',
  },
  'Cloud Storage': {
    label: 'Cloud & Storage',
    icon: 'Cloud',
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900',
    description: 'Device backups, drive file sync, and photo archives',
  },
  Productivity: {
    label: 'Productivity & Work',
    icon: 'Briefcase',
    badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    description: 'Office suites, design tools, note taking, and writing checkers',
  },
  Education: {
    label: 'Education & Learning',
    icon: 'GraduationCap',
    badgeColor: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border-teal-200 dark:border-teal-900',
    description: 'Language training, technical certificates, and video courses',
  },
  Gaming: {
    label: 'Gaming & Social',
    icon: 'Gamepad2',
    badgeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
    description: 'Game pass catalogs, console multiplayer, and voice perks',
  },
  'Developer Tools': {
    label: 'Developer & Code',
    icon: 'Code2',
    badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    description: 'Code repositories, cloud deployments, and IDE licenses',
  },
};

/**
 * Fast lookup map indexed by Service ID
 */
const CATALOG_BY_ID = new Map<string, CatalogService>(
  SUBSCRIPTION_CATALOG.map((service) => [service.id.toLowerCase(), service])
);

/**
 * Lookup service by unique ID
 */
export function getCatalogServiceById(id: string): CatalogService | undefined {
  if (!id) return undefined;
  return CATALOG_BY_ID.get(id.toLowerCase().trim());
}

/**
 * Filter services by Category
 */
export function getCatalogServicesByCategory(category: CatalogCategory): CatalogService[] {
  return SUBSCRIPTION_CATALOG.filter((service) => service.category === category);
}

/**
 * Retrieve a specific plan by service ID and plan ID
 */
export function getCatalogPlan(
  serviceId: string, 
  planId: string
): { service: CatalogService; plan: CatalogPlan } | undefined {
  const service = getCatalogServiceById(serviceId);
  if (!service) return undefined;
  const plan = service.availablePlans.find((p) => p.id === planId);
  if (!plan) return undefined;
  return { service, plan };
}

/**
 * Search catalog by name, tag, category, or website domain
 */
export function searchCatalogServices(
  query: string,
  categoryFilter?: CatalogCategory | 'All'
): CatalogService[] {
  const cleanQuery = query.toLowerCase().trim();

  return SUBSCRIPTION_CATALOG.filter((service) => {
    // Category check
    if (categoryFilter && categoryFilter !== 'All' && service.category !== categoryFilter) {
      return false;
    }

    if (!cleanQuery) return true;

    // Name match
    if (service.name.toLowerCase().includes(cleanQuery)) return true;

    // ID match
    if (service.id.toLowerCase().includes(cleanQuery)) return true;

    // Website match
    if (service.website.toLowerCase().includes(cleanQuery)) return true;

    // Tag match
    if (service.tags.some((tag) => tag.toLowerCase().includes(cleanQuery))) return true;

    // Plan name match
    if (service.availablePlans.some((p) => p.name.toLowerCase().includes(cleanQuery))) return true;

    return false;
  });
}

/**
 * Maps CatalogCategory to existing SubZap SubscriptionCategory
 * for seamless backward compatibility.
 */
export function mapCatalogCategoryToSubscriptionCategory(
  category: CatalogCategory
): SubscriptionCategory {
  switch (category) {
    case 'Streaming':
    case 'Music':
    case 'Gaming':
      return 'Entertainment';
    case 'AI Tools':
    case 'Developer Tools':
      return 'Software & SaaS';
    case 'Cloud Storage':
      return 'Cloud & Storage';
    case 'Productivity':
      return 'Productivity';
    case 'Education':
      return 'Other';
    default:
      return 'Other';
  }
}

/**
 * Calculates current catalog summary statistics
 */
export function getCatalogStatistics(): {
  totalServices: number;
  totalPlans: number;
  categoryBreakdown: Record<CatalogCategory, number>;
  lastUpdated: string;
} {
  const breakdown: Record<CatalogCategory, number> = {
    Streaming: 0,
    Music: 0,
    'AI Tools': 0,
    'Cloud Storage': 0,
    Productivity: 0,
    Education: 0,
    Gaming: 0,
    'Developer Tools': 0,
  };

  let totalPlans = 0;
  for (const s of SUBSCRIPTION_CATALOG) {
    breakdown[s.category] = (breakdown[s.category] || 0) + 1;
    totalPlans += s.availablePlans.length;
  }

  return {
    totalServices: SUBSCRIPTION_CATALOG.length,
    totalPlans,
    categoryBreakdown: breakdown,
    lastUpdated: '2026-03-01',
  };
}
