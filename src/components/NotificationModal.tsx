import React, { useState } from 'react';
import { 
  Bell, 
  X, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink, 
  Sparkles, 
  Volume2,
  Lock,
  PauseCircle
} from 'lucide-react';
import { Subscription } from '../types';
import { InAppNotification, requestNotificationPermission, sendBrowserNotification } from '../utils/notifications';
import { useCurrency } from '../context/CurrencyContext';
import { BrandLogo } from './BrandLogo';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissionStatus: NotificationPermission | 'unsupported';
  onPermissionChange: (status: NotificationPermission | 'unsupported') => void;
  alerts: InAppNotification[];
  subscriptions: Subscription[];
  onTogglePause: (id: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  permissionStatus,
  onPermissionChange,
  alerts,
  subscriptions,
  onTogglePause,
}) => {
  const [testSent, setTestSent] = useState(false);
  const [requestError, setRequestError] = useState('');
  const { formatBaseINR } = useCurrency();

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setRequestError('');
    const res = await requestNotificationPermission();
    onPermissionChange(res);
    if (res === 'granted') {
      sendBrowserNotification('SubZap Defense Active', {
        body: 'You will now receive native push alerts 24 hours before any subscription renews or trial expires.',
      });
    } else if (res === 'denied') {
      setRequestError('Notification permission was blocked in browser settings.');
    }
  };

  const handleTestAlert = () => {
    sendBrowserNotification('⚡ SubZap Alert: Imminent Renewal Detected', {
      body: `Audible (₹199.00) will renew within 24 hours. Free trial countdown expiring!`,
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div 
        id="notification-center-modal"
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-y-auto max-h-[92vh] text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Alerts & Push Notifications
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated 24h pre-charge self-defense warnings
              </p>
            </div>
          </div>
          <button
            id="close-notifications-btn"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close notifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission Controls Banner */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Browser Push Notifications:
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  permissionStatus === 'granted'
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                    : permissionStatus === 'denied'
                    ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                    : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                }`}>
                  {permissionStatus.toUpperCase()}
                </span>
              </div>

              {permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && (
                <button
                  id="request-notif-perm-btn"
                  onClick={handleRequestPermission}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
                >
                  Enable Native Alerts
                </button>
              )}
            </div>

            {requestError && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{requestError}</p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {permissionStatus === 'granted'
                  ? '✓ Self-Defense notifications armed'
                  : 'Native alerts fire 24h prior to renewals'}
              </span>

              {permissionStatus === 'granted' && (
                <button
                  id="test-notification-btn"
                  onClick={handleTestAlert}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{testSent ? 'Alert Dispatched!' : 'Send Test Notification'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Active 24h Alerts List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Armed Alerts ({alerts.length})
              </h4>
              <span className="text-[11px] text-slate-400">
                Audited continuously on every refresh
              </span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">All Charges Monitored & Safe</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    No active subscriptions scheduled to renew within 24 hours.
                  </p>
                </div>
              ) : (
                alerts.map((alert) => {
                  const sub = subscriptions.find((s) => s.id === alert.subscriptionId);
                  return (
                    <div
                      key={alert.id}
                      className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                        alert.type === 'trial'
                          ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                          : 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {sub && (
                          <BrandLogo
                            name={sub.name}
                            domain={sub.domain}
                            logoUrl={sub.logoUrl}
                            size="sm"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {alert.title}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            {alert.message}
                          </p>
                          {sub && (
                            <span className="text-[11px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 mt-1 inline-block">
                              Amount due: {formatBaseINR(sub.cost)}
                            </span>
                          )}
                        </div>
                      </div>

                      {sub && (
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onTogglePause(sub.id)}
                            className="text-xs font-semibold px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            {sub.isPaused ? 'Resumed' : 'Quick Pause'}
                          </button>
                          {sub.cancellationUrl && (
                            <a
                              href={sub.cancellationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                            >
                              <span>Cancel</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Client-side local audit</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
