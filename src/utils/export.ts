import { Subscription } from '../types';
import { encryptField, encryptSubscription } from './crypto';
import { 
  getNormalizedMonthlyCost, 
  getNormalizedAnnualCost, 
  getDaysUntil, 
  getCountdownBadge 
} from './calculations';

/**
 * Triggers a client-side file download via a dynamically generated Blob
 */
export function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates an RFC-4180 compliant CSV string from subscriptions list
 * Includes UTF-8 BOM so spreadsheet tools (Excel, Numbers, Sheets) parse currency symbols properly.
 * Formatted specifically for external budget tracking tools (Excel, Sheets, YNAB, Notion).
 */
export function generateSubscriptionsCSV(subscriptions: Subscription[]): string {
  const headers = [
    'Subscription ID',
    'Name',
    'Cost',
    'Currency',
    'Billing Cycle',
    'Normalized Monthly Cost',
    'Projected Annual Cost',
    'Category',
    'Status',
    'Next Renewal Date',
    'Days Until Renewal',
    'Renewal Urgency',
    'Free Trial Expiry',
    'Domain',
    'Previous Price',
    'Price Surge Percentage',
    'Notes',
    'Cancellation URL',
    'Created At',
    'Updated At',
  ];

  const escapeCSV = (val: any): string => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = subscriptions.map((sub) => {
    const monthlyNormalized = Math.round(getNormalizedMonthlyCost(sub.cost, sub.billingCycle) * 100) / 100;
    const annualNormalized = Math.round(getNormalizedAnnualCost(sub.cost, sub.billingCycle) * 100) / 100;
    const daysUntilRenewal = getDaysUntil(sub.nextRenewalDate);
    const urgency = getCountdownBadge(sub.nextRenewalDate).label;
    const surgePercent = sub.previousCost && sub.cost > sub.previousCost
      ? `${Math.round(((sub.cost - sub.previousCost) / sub.previousCost) * 100)}%`
      : '';

    return [
      sub.id,
      sub.name,
      sub.cost,
      sub.currency,
      sub.billingCycle,
      monthlyNormalized,
      annualNormalized,
      sub.category,
      sub.isPaused ? 'Paused' : 'Active',
      sub.nextRenewalDate,
      daysUntilRenewal,
      urgency,
      sub.trialExpiryDate || '',
      sub.domain || '',
      sub.previousCost !== undefined ? sub.previousCost : '',
      surgePercent,
      sub.notes || '',
      sub.cancellationUrl || '',
      sub.createdAt || '',
      sub.updatedAt || '',
    ]
      .map(escapeCSV)
      .join(',');
  });

  // \uFEFF is UTF-8 Byte Order Mark
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

/**
 * Direct 1-click helper to export the current list of subscriptions as an RFC-4180 CSV file
 * Formatted with UTF-8 BOM for Microsoft Excel, Google Sheets, Apple Numbers, and external financial tools.
 */
export function exportCurrentSubscriptionsToCSV(
  subscriptions: Subscription[],
  filenamePrefix: string = 'subzap_subscriptions_backup'
): { success: boolean; filename: string; count: number } {
  const dateSlug = new Date().toISOString().slice(0, 10);
  const filename = `${filenamePrefix}_${dateSlug}.csv`;
  const content = generateSubscriptionsCSV(subscriptions);
  triggerDownload(content, filename, 'text/csv');
  return { success: true, filename, count: subscriptions.length };
}

/**
 * Generates an AES-256 GCM encrypted CSV where sensitive data fields
 * (Name, Cost, Normalized Monthly & Annual Costs, Renewal Date, Trial Date, Previous Cost, Notes, Cancellation URL)
 * are encrypted using the user's Zero-Knowledge Vault Secret Key.
 * Standard non-sensitive operational fields (Currency, Billing Cycle, Category, Status, Timestamps)
 * remain intact for tabular partitioning while fully shielding financial figures and identities.
 */
export async function generateEncryptedSubscriptionsCSV(
  subscriptions: Subscription[],
  secretKey: string
): Promise<string> {
  const headers = [
    'Subscription ID',
    'Name (Encrypted AES-256)',
    'Cost (Encrypted AES-256)',
    'Currency',
    'Billing Cycle',
    'Normalized Monthly Cost (Encrypted AES-256)',
    'Projected Annual Cost (Encrypted AES-256)',
    'Category',
    'Status',
    'Next Renewal Date (Encrypted AES-256)',
    'Free Trial Expiry (Encrypted AES-256)',
    'Domain',
    'Previous Price (Encrypted AES-256)',
    'Notes (Encrypted AES-256)',
    'Cancellation URL (Encrypted AES-256)',
    'Encryption Algorithm',
    'Created At',
    'Updated At',
  ];

  const escapeCSV = (val: any): string => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const encryptedRows = await Promise.all(
    subscriptions.map(async (sub) => {
      const monthlyNormalized = Math.round(getNormalizedMonthlyCost(sub.cost, sub.billingCycle) * 100) / 100;
      const annualNormalized = Math.round(getNormalizedAnnualCost(sub.cost, sub.billingCycle) * 100) / 100;

      const [
        encName,
        encCost,
        encMonthly,
        encAnnual,
        encRenewal,
        encTrial,
        encPrevCost,
        encNotes,
        encCancelUrl,
      ] = await Promise.all([
        encryptField(sub.name, secretKey),
        encryptField(String(sub.cost), secretKey),
        encryptField(String(monthlyNormalized), secretKey),
        encryptField(String(annualNormalized), secretKey),
        encryptField(sub.nextRenewalDate, secretKey),
        sub.trialExpiryDate ? encryptField(sub.trialExpiryDate, secretKey) : Promise.resolve(''),
        sub.previousCost !== undefined ? encryptField(String(sub.previousCost), secretKey) : Promise.resolve(''),
        sub.notes ? encryptField(sub.notes, secretKey) : Promise.resolve(''),
        sub.cancellationUrl ? encryptField(sub.cancellationUrl, secretKey) : Promise.resolve(''),
      ]);

      return [
        sub.id,
        encName,
        encCost,
        sub.currency,
        sub.billingCycle,
        encMonthly,
        encAnnual,
        sub.category,
        sub.isPaused ? 'Paused' : 'Active',
        encRenewal,
        encTrial,
        sub.domain || '',
        encPrevCost,
        encNotes,
        encCancelUrl,
        'AES-GCM-256-PBKDF2',
        sub.createdAt || '',
        sub.updatedAt || '',
      ]
        .map(escapeCSV)
        .join(',');
    })
  );

  return '\uFEFF' + [headers.join(','), ...encryptedRows].join('\r\n');
}

/**
 * Generates a clean human-readable JSON export of current subscriptions list data
 * Formatted for personal backup, developer snapshots, or third-party budgeting migration.
 */
export function generateSubscriptionsJSON(
  subscriptions: Subscription[],
  metadata?: {
    userId?: string;
    userEmail?: string;
    profile?: any;
    filterApplied?: string;
  }
): string {
  const dateStr = new Date().toISOString();

  const exportPackage = {
    vaultFormat: 'subzap-subscription-export-v1',
    mode: 'decrypted',
    exportedAt: dateStr,
    totalSubscriptions: subscriptions.length,
    filterScope: metadata?.filterApplied || 'all',
    user: metadata?.userId
      ? {
          uid: metadata.userId,
          email: metadata.userEmail,
        }
      : undefined,
    profile: metadata?.profile
      ? {
          fullName: metadata.profile.fullName,
          targetMonthlyBudget: metadata.profile.targetMonthlyBudget,
          averageMonthlyExpense: metadata.profile.averageMonthlyExpense,
          financialGoal: metadata.profile.financialGoal,
        }
      : undefined,
    subscriptions: subscriptions.map((sub) => {
      const monthlyNormalized = Math.round(getNormalizedMonthlyCost(sub.cost, sub.billingCycle) * 100) / 100;
      const annualNormalized = Math.round(getNormalizedAnnualCost(sub.cost, sub.billingCycle) * 100) / 100;

      return {
        id: sub.id,
        name: sub.name,
        cost: sub.cost,
        currency: sub.currency,
        billingCycle: sub.billingCycle,
        normalizedMonthlyCost: monthlyNormalized,
        projectedAnnualCost: annualNormalized,
        category: sub.category,
        isPaused: sub.isPaused,
        status: sub.isPaused ? 'Paused' : 'Active',
        nextRenewalDate: sub.nextRenewalDate,
        trialExpiryDate: sub.trialExpiryDate || null,
        domain: sub.domain || null,
        previousCost: sub.previousCost !== undefined ? sub.previousCost : null,
        notes: sub.notes || null,
        cancellationUrl: sub.cancellationUrl || null,
        createdAt: sub.createdAt || null,
        updatedAt: sub.updatedAt || null,
      };
    }),
  };

  return JSON.stringify(exportPackage, null, 2);
}

/**
 * Generates an AES-256 GCM encrypted JSON export of subscriptions,
 * maintaining the encrypted state for security so files can be safely stored on public drives.
 */
export async function generateEncryptedSubscriptionsJSON(
  subscriptions: Subscription[],
  secretKey: string,
  metadata?: {
    userId?: string;
    userEmail?: string;
    profile?: any;
    filterApplied?: string;
  }
): Promise<string> {
  const dateStr = new Date().toISOString();

  // Encrypt individual subscription records using Web Crypto AES-GCM-256
  const encryptedRecords = await Promise.all(
    subscriptions.map((sub) =>
      encryptSubscription(sub, secretKey, metadata?.userId || 'vault-export')
    )
  );

  // Encrypt the full raw payload for cold restore
  const rawPayload = JSON.stringify({
    exportedAt: dateStr,
    totalSubscriptions: subscriptions.length,
    profile: metadata?.profile,
    subscriptions,
  });

  const fullCiphertext = await encryptField(rawPayload, secretKey);

  const backupPackage = {
    vaultFormat: 'subzap-subscription-export-v1',
    mode: 'encrypted',
    cipherAlgorithm: 'AES-GCM-256-PBKDF2',
    iterations: 100000,
    exportedAt: dateStr,
    totalSubscriptions: subscriptions.length,
    filterScope: metadata?.filterApplied || 'all',
    userUid: metadata?.userId || 'guest-session',
    userEmail: metadata?.userEmail || undefined,
    encryptedRecords,
    encryptedPayload: fullCiphertext,
    securityNotice:
      'This file contains AES-256 client-side encrypted subscription records. Sensitive fields (Name, Cost, Dates, Notes) are encrypted with your Zero-Knowledge Vault Secret Key and unreadable without it.',
  };

  return JSON.stringify(backupPackage, null, 2);
}

/**
 * Generates an AES-256 GCM encrypted JSON vault backup file for personal record-keeping
 */
export async function generateEncryptedVaultBackup(
  subscriptions: Subscription[],
  secretKey: string,
  metadata?: {
    userId?: string;
    userEmail?: string;
    profile?: any;
  }
): Promise<string> {
  return generateEncryptedSubscriptionsJSON(subscriptions, secretKey, metadata);
}

/**
 * Generates an RFC-4180 compliant CSV of the 6-month spending trend data
 */
export function generateSpendingTrendCSV(trendPoints: {
  label: string;
  fullLabel: string;
  year: number;
  totalBurn: number;
  diffFromPrev: number;
  diffPercent: number;
  activeCount: number;
}[]): string {
  const headers = [
    'Month Label',
    'Full Month Name',
    'Year',
    'Monthly Burn (INR)',
    'MoM Variance (INR)',
    'MoM Variance (%)',
    'Active Subscriptions Count',
  ];

  const rows = trendPoints.map((t) => [
    t.label,
    `"${t.fullLabel}"`,
    t.year,
    t.totalBurn,
    t.diffFromPrev,
    `${t.diffPercent}%`,
    t.activeCount,
  ].join(','));

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

