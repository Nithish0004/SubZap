import { Subscription } from '../types';
import { encryptField, encryptSubscription } from './crypto';

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
 * Includes UTF-8 BOM so spreadsheet tools (Excel, Numbers, Sheets) parse currency symbols properly
 */
export function generateSubscriptionsCSV(subscriptions: Subscription[]): string {
  const headers = [
    'Subscription ID',
    'Name',
    'Cost',
    'Currency',
    'Billing Cycle',
    'Category',
    'Status',
    'Next Renewal Date',
    'Free Trial Expiry',
    'Domain',
    'Previous Price',
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

  const rows = subscriptions.map((sub) =>
    [
      sub.id,
      sub.name,
      sub.cost,
      sub.currency,
      sub.billingCycle,
      sub.category,
      sub.isPaused ? 'Paused' : 'Active',
      sub.nextRenewalDate,
      sub.trialExpiryDate || '',
      sub.domain || '',
      sub.previousCost !== undefined ? sub.previousCost : '',
      sub.notes || '',
      sub.cancellationUrl || '',
      sub.createdAt || '',
      sub.updatedAt || '',
    ]
      .map(escapeCSV)
      .join(',')
  );

  // \uFEFF is UTF-8 Byte Order Mark
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
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
  const dateStr = new Date().toISOString();

  // 1. Encrypt individual subscription records using Web Crypto AES-GCM
  const encryptedRecords = await Promise.all(
    subscriptions.map((sub) =>
      encryptSubscription(sub, secretKey, metadata?.userId || 'vault-export')
    )
  );

  // 2. Encrypt the complete snapshot payload
  const rawPayload = JSON.stringify({
    exportedAt: dateStr,
    totalSubscriptions: subscriptions.length,
    profile: metadata?.profile,
    subscriptions,
  });

  const fullCiphertext = await encryptField(rawPayload, secretKey);

  const backupPackage = {
    vaultFormat: 'subzap-encrypted-backup-v1',
    cipherAlgorithm: 'AES-GCM-256-PBKDF2',
    exportedAt: dateStr,
    totalSubscriptions: subscriptions.length,
    userUid: metadata?.userId || 'guest-session',
    userEmail: metadata?.userEmail || undefined,
    encryptedRecords,
    encryptedPayload: fullCiphertext,
    instructions:
      'This file contains AES-256 client-side encrypted subscription records. It can only be decrypted with your Zero-Knowledge Vault Secret Key.',
  };

  return JSON.stringify(backupPackage, null, 2);
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

