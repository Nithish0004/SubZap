import { Subscription } from '../types';

const STORAGE_KEY = 'subzap_subscriptions_v1';

/**
 * Format Date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Add days to current date
 */
function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/**
 * Subtract days from current date (returns ISO string for historical createdAt)
 */
function subDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/**
 * Seed data designed to demonstrate all requirements immediately on first load:
 * - Varied billing cycles (Monthly vs Annual normalization)
 * - Free trial with countdown ("Expires in 2 days!")
 * - Renewals within 7 days
 * - Paused subscription for savings demonstration
 * - Staggered creation history for 6-month monthly spend trend analysis
 */
export const SEED_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-seed-audible-trial',
    name: 'Audible Premium Plus',
    cost: 199.00,
    currency: '₹',
    billingCycle: 'monthly',
    category: 'Entertainment',
    nextRenewalDate: addDays(2),
    trialExpiryDate: addDays(2), // Free trial expires in 2 days!
    isPaused: false,
    domain: 'audible.com',
    notes: '30-day trial will auto-charge ₹199.00 if not cancelled before 48 hours.',
    cancellationUrl: 'https://www.audible.com/account/cancel',
    createdAt: subDays(4), // Started this month
  },
  {
    id: 'sub-seed-netflix',
    name: 'Netflix 4K Ultra',
    cost: 649.00,
    currency: '₹',
    billingCycle: 'monthly',
    category: 'Entertainment',
    nextRenewalDate: addDays(3), // Renews in 3 days!
    isPaused: false,
    domain: 'netflix.com',
    notes: 'Family tier subscription. Consider downgrading to Standard plan.',
    cancellationUrl: 'https://www.netflix.com/youraccount',
    createdAt: subDays(150), // 5 months ago
  },
  {
    id: 'sub-seed-adobe',
    name: 'Adobe Creative Cloud',
    cost: 4230.00,
    currency: '₹',
    billingCycle: 'monthly',
    category: 'Software & SaaS',
    nextRenewalDate: addDays(6), // Renews in 6 days!
    isPaused: false,
    domain: 'adobe.com',
    notes: 'Photoshop, Illustrator, Premiere Pro. Check annual commitment fee.',
    cancellationUrl: 'https://account.adobe.com/plans',
    createdAt: subDays(90), // 3 months ago
  },
  {
    id: 'sub-seed-notion',
    name: 'Notion Plus + AI',
    cost: 9600.00,
    currency: '₹',
    billingCycle: 'yearly',
    category: 'Productivity',
    nextRenewalDate: addDays(24),
    isPaused: false,
    domain: 'notion.so',
    notes: 'Billed annually (₹800.00/month normalized burn). Workspace knowledge base.',
    cancellationUrl: 'https://www.notion.so/settings',
    createdAt: subDays(60), // 2 months ago
  },
  {
    id: 'sub-seed-equinox',
    name: 'Cult.fit Elite & Gym',
    cost: 2499.00,
    currency: '₹',
    billingCycle: 'monthly',
    category: 'Health & Fitness',
    nextRenewalDate: addDays(18),
    isPaused: false,
    domain: 'cult.fit',
    notes: 'All-center access membership. Major candidate for monthly burn reduction.',
    cancellationUrl: 'https://www.cult.fit',
    createdAt: subDays(120), // 4 months ago
  },
  {
    id: 'sub-seed-spotify',
    name: 'Spotify Premium Duo',
    cost: 149.00,
    currency: '₹',
    billingCycle: 'monthly',
    category: 'Entertainment',
    nextRenewalDate: addDays(14),
    isPaused: true, // Demonstrates paused savings
    domain: 'spotify.com',
    notes: 'Paused temporarily while testing Apple Music bundle.',
    cancellationUrl: 'https://www.spotify.com/account/cancel',
    createdAt: subDays(45), // 1.5 months ago
  },
];

export function getStoredSubscriptions(userId?: string): Subscription[] {
  try {
    let raw: string | null = null;
    if (userId) {
      raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    }
    if (!raw) {
      raw = localStorage.getItem(STORAGE_KEY);
    }

    if (!raw) {
      saveStoredSubscriptions(SEED_SUBSCRIPTIONS, userId);
      return SEED_SUBSCRIPTIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Migrate old seed or USD entries if currency was '$'
      const migrated = parsed.map((sub: Subscription) => {
        if (sub.currency === '$') {
          return {
            ...sub,
            cost: Math.round(sub.cost * 86.5),
            currency: '₹',
          };
        }
        return sub;
      });
      return migrated;
    }
    saveStoredSubscriptions(SEED_SUBSCRIPTIONS, userId);
    return SEED_SUBSCRIPTIONS;
  } catch (err) {
    console.warn('Failed to read subscriptions from localStorage, returning seed data:', err);
    return SEED_SUBSCRIPTIONS;
  }
}

export function saveStoredSubscriptions(subscriptions: Subscription[], userId?: string): void {
  try {
    const json = JSON.stringify(subscriptions);
    localStorage.setItem(STORAGE_KEY, json);
    if (userId) {
      localStorage.setItem(`${STORAGE_KEY}_${userId}`, json);
    }
  } catch (err) {
    console.error('Failed to save subscriptions to localStorage:', err);
  }
}

export function resetToDefaults(userId?: string): Subscription[] {
  saveStoredSubscriptions(SEED_SUBSCRIPTIONS, userId);
  return SEED_SUBSCRIPTIONS;
}
