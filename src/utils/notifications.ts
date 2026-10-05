import { Subscription } from '../types';
import { getDaysUntil, formatCurrency } from './calculations';

export interface PriceHikeDetails {
  previousCost: number;
  newCost: number;
  diffAmount: number;
  percentage: number;
  currency: string;
}

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  severity: 'urgent' | 'warning' | 'info';
  timestamp: string;
  subscriptionId?: string;
  isRead: boolean;
  type?: 'trial' | 'renewal' | 'price_hike' | 'budget';
  priceHikeData?: PriceHikeDetails;
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Sends a native browser push notification if permitted
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions): boolean {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }
  try {
    new Notification(title, {
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366F1"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366F1"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>',
      ...options,
    });
    return true;
  } catch (err) {
    console.warn('Native notification failed (possibly restricted by iframe sandbox):', err);
    return false;
  }
}

/**
 * Checks whether a subscription has experienced a price increase exceeding the Smart Alert threshold
 */
export function detectPriceHike(
  sub: Subscription,
  thresholdPercent: number = 10
): { isHike: boolean; diff: number; percentage: number } {
  if (sub.previousCost === undefined || sub.previousCost === null) {
    return { isHike: false, diff: 0, percentage: 0 };
  }

  if (sub.cost > sub.previousCost && sub.previousCost > 0) {
    const diff = sub.cost - sub.previousCost;
    const percentage = (diff / sub.previousCost) * 100;
    return {
      isHike: percentage >= thresholdPercent,
      diff,
      percentage: Number(percentage.toFixed(1)),
    };
  }

  return { isHike: false, diff: 0, percentage: 0 };
}

/**
 * Evaluates all subscriptions and triggers:
 * 1. Smart Alerts: Unexpected price increases between billing cycles that exceed threshold
 * 2. 24h Renewal alerts
 * 3. Trial expiry countdown warnings
 */
export function evaluateAllAlerts(
  subscriptions: Subscription[],
  options?: {
    smartAlertThresholdPercent?: number;
    smartAlertsEnabled?: boolean;
  }
): {
  notifiedCount: number;
  alerts: InAppNotification[];
} {
  const threshold = options?.smartAlertThresholdPercent ?? 10;
  const smartAlertsEnabled = options?.smartAlertsEnabled ?? true;
  const alerts: InAppNotification[] = [];
  let notifiedCount = 0;

  subscriptions.forEach((sub) => {
    // 1. SMART ALERT: Unexpected Price Hike Detection
    if (smartAlertsEnabled && !sub.priceAlertDismissed) {
      const hikeCheck = detectPriceHike(sub, threshold);
      if (hikeCheck.isHike && sub.previousCost !== undefined) {
        const title = `🚨 Smart Alert: Unexpected Price Hike (${sub.name})`;
        const message = `${sub.name} price increased from ${formatCurrency(sub.previousCost, sub.currency)} to ${formatCurrency(sub.cost, sub.currency)} (+${hikeCheck.percentage}% / +${formatCurrency(hikeCheck.diff, sub.currency)}) ahead of renewal!`;

        alerts.push({
          id: `alert-price-hike-${sub.id}-${sub.cost}`,
          type: 'price_hike',
          title,
          message,
          severity: 'urgent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          subscriptionId: sub.id,
          isRead: false,
          priceHikeData: {
            previousCost: sub.previousCost,
            newCost: sub.cost,
            diffAmount: hikeCheck.diff,
            percentage: hikeCheck.percentage,
            currency: sub.currency,
          },
        });

        if (sendBrowserNotification(title, { body: message })) {
          notifiedCount++;
        }
      }
    }

    if (sub.isPaused) return;

    // 2. Check trial expiry
    if (sub.trialExpiryDate) {
      const daysUntilTrial = getDaysUntil(sub.trialExpiryDate);
      if (daysUntilTrial <= 2 && daysUntilTrial >= 0) {
        const title = `⚠️ Free Trial Ending: ${sub.name}`;
        const message = daysUntilTrial === 0
          ? `Your free trial for ${sub.name} expires TODAY! Cancel now to avoid ${formatCurrency(sub.cost, sub.currency)} charge.`
          : `Your free trial for ${sub.name} expires in ${daysUntilTrial} day${daysUntilTrial > 1 ? 's' : ''}!`;

        alerts.push({
          id: `alert-trial-${sub.id}-${sub.trialExpiryDate}`,
          type: 'trial',
          title,
          message,
          severity: 'urgent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          subscriptionId: sub.id,
          isRead: false,
        });

        if (sendBrowserNotification(title, { body: message })) {
          notifiedCount++;
        }
      }
    }

    // 3. Check 24-hour renewal alert
    const daysUntilRenewal = getDaysUntil(sub.nextRenewalDate);
    if (daysUntilRenewal <= 1 && daysUntilRenewal >= 0) {
      const title = `🚨 24h Renewal Warning: ${sub.name}`;
      const message = daysUntilRenewal === 0
        ? `${sub.name} is scheduled to bill ${formatCurrency(sub.cost, sub.currency)} today!`
        : `${sub.name} will renew tomorrow for ${formatCurrency(sub.cost, sub.currency)}.`;

      alerts.push({
        id: `alert-renew-${sub.id}-${sub.nextRenewalDate}`,
        type: 'renewal',
        title,
        message,
        severity: daysUntilRenewal === 0 ? 'urgent' : 'warning',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        subscriptionId: sub.id,
        isRead: false,
      });

      if (sendBrowserNotification(title, { body: message })) {
        notifiedCount++;
      }
    }
  });

  return { notifiedCount, alerts };
}

/**
 * Backwards-compatible wrapper that incorporates Smart Alert threshold evaluation
 */
export function checkUpcomingRenewalsAndNotify(
  subscriptions: Subscription[],
  thresholdPercent?: number,
  smartAlertsEnabled?: boolean
): {
  notifiedCount: number;
  alerts: InAppNotification[];
} {
  return evaluateAllAlerts(subscriptions, {
    smartAlertThresholdPercent: thresholdPercent,
    smartAlertsEnabled,
  });
}
