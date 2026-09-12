import { Subscription } from '../types';
import { getDaysUntil, formatCurrency } from './calculations';

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  severity: 'urgent' | 'warning' | 'info';
  timestamp: string;
  subscriptionId?: string;
  isRead: boolean;
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
 * Checks all subscriptions and triggers notifications for renewals within 24 hours (or overdue) and expiring trials
 */
export function checkUpcomingRenewalsAndNotify(subscriptions: Subscription[]): {
  notifiedCount: number;
  alerts: InAppNotification[];
} {
  const alerts: InAppNotification[] = [];
  let notifiedCount = 0;

  subscriptions.forEach((sub) => {
    if (sub.isPaused) return;

    // Check trial expiry
    if (sub.trialExpiryDate) {
      const daysUntilTrial = getDaysUntil(sub.trialExpiryDate);
      if (daysUntilTrial <= 2 && daysUntilTrial >= 0) {
        const title = `⚠️ Free Trial Ending: ${sub.name}`;
        const message = daysUntilTrial === 0
          ? `Your free trial for ${sub.name} expires TODAY! Cancel now to avoid ${formatCurrency(sub.cost, sub.currency)} charge.`
          : `Your free trial for ${sub.name} expires in ${daysUntilTrial} day${daysUntilTrial > 1 ? 's' : ''}!`;

        alerts.push({
          id: `alert-trial-${sub.id}-${sub.trialExpiryDate}`,
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

    // Check 24-hour renewal alert
    const daysUntilRenewal = getDaysUntil(sub.nextRenewalDate);
    if (daysUntilRenewal <= 1 && daysUntilRenewal >= 0) {
      const title = `🚨 24h Renewal Warning: ${sub.name}`;
      const message = daysUntilRenewal === 0
        ? `${sub.name} is scheduled to bill ${formatCurrency(sub.cost, sub.currency)} today!`
        : `${sub.name} will renew tomorrow for ${formatCurrency(sub.cost, sub.currency)}.`;

      alerts.push({
        id: `alert-renew-${sub.id}-${sub.nextRenewalDate}`,
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
