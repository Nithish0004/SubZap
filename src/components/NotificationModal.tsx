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
  PauseCircle,
  TrendingUp,
  Sliders,
  RotateCcw,
  Check,
  Zap
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
  smartAlertThreshold: number;
  onThresholdChange: (threshold: number) => void;
  smartAlertEnabled: boolean;
  onToggleSmartAlertEnabled: (enabled: boolean) => void;
  onDismissAlert?: (subscriptionId: string) => void;
  onRevertPrice?: (subscriptionId: string) => void;
  onSimulatePriceIncrease?: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  permissionStatus,
  onPermissionChange,
  alerts,
  subscriptions,
  onTogglePause,
  smartAlertThreshold,
  onThresholdChange,
  smartAlertEnabled,
  onToggleSmartAlertEnabled,
  onDismissAlert,
  onRevertPrice,
  onSimulatePriceIncrease,
}) => {
  const [testSent, setTestSent] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'price_hikes' | 'renewals' | 'trials'>('all');
  const [isCustomThreshold, setIsCustomThreshold] = useState(false);
  const [customInputValue, setCustomInputValue] = useState(String(smartAlertThreshold));
  const { formatBaseINR } = useCurrency();

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setRequestError('');
    const res = await requestNotificationPermission();
    onPermissionChange(res);
    if (res === 'granted') {
      sendBrowserNotification('SubZap Defense Active', {
        body: 'You will now receive native push alerts for unexpected price hikes, expiring trials, and imminent renewals.',
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

  // Filter alerts by active category
  const priceHikeAlerts = alerts.filter((a) => a.type === 'price_hike');
  const renewalAlerts = alerts.filter((a) => a.type === 'renewal');
  const trialAlerts = alerts.filter((a) => a.type === 'trial');

  const filteredAlerts = alerts.filter((a) => {
    if (activeFilter === 'price_hikes') return a.type === 'price_hike';
    if (activeFilter === 'renewals') return a.type === 'renewal';
    if (activeFilter === 'trials') return a.type === 'trial';
    return true;
  });

  const THRESHOLD_PRESETS = [0, 5, 10, 15, 20];

  const handleApplyThreshold = (val: number) => {
    setIsCustomThreshold(false);
    setCustomInputValue(String(val));
    onThresholdChange(val);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(customInputValue);
    if (!isNaN(parsed) && parsed >= 0) {
      onThresholdChange(parsed);
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div 
        id="notification-center-modal"
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-y-auto max-h-[92vh] text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Alerts & Push Notifications
                </h3>
                {priceHikeAlerts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60 animate-pulse">
                    {priceHikeAlerts.length} Price Surge{priceHikeAlerts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated Smart Alerts for unexpected price hikes & 24h pre-charge warnings
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

        <div className="p-4 sm:p-6 space-y-5">
          {/* SMART ALERT THRESHOLD CONFIGURATION CARD */}
          <div 
            id="smart-alert-threshold-section"
            className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900/60 border border-indigo-200/90 dark:border-indigo-800/60 shadow-sm space-y-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Smart Alert Threshold
                    </h4>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Notifies when subscription cost rises unexpectedly between billing cycles
                  </p>
                </div>
              </div>

              {/* Master Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 hidden sm:inline">
                  {smartAlertEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <input
                  type="checkbox"
                  id="smart-alert-toggle-checkbox"
                  checked={smartAlertEnabled}
                  onChange={(e) => onToggleSmartAlertEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Threshold Selector Buttons */}
            {smartAlertEnabled && (
              <div className="space-y-2 pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-indigo-500" />
                    Sensitivity Threshold:
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    ≥ {smartAlertThreshold}% price hike
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {THRESHOLD_PRESETS.map((p) => {
                    const isSelected = !isCustomThreshold && smartAlertThreshold === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleApplyThreshold(p)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {p === 0 ? 'Any Increase (>0%)' : `+${p}%${p === 10 ? ' (Default)' : ''}`}
                      </button>
                    );
                  })}

                  {/* Custom threshold input button */}
                  {!isCustomThreshold ? (
                    <button
                      type="button"
                      onClick={() => setIsCustomThreshold(true)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                        !THRESHOLD_PRESETS.includes(smartAlertThreshold)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Custom %
                    </button>
                  ) : (
                    <form onSubmit={handleCustomSubmit} className="flex items-center gap-1">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={customInputValue}
                          onChange={(e) => setCustomInputValue(e.target.value)}
                          placeholder="%"
                          autoFocus
                          className="w-16 px-2 py-0.5 text-xs bg-white dark:bg-slate-800 border border-indigo-400 dark:border-indigo-500 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-none"
                        />
                        <span className="absolute right-2 text-xs text-slate-400 font-bold">%</span>
                      </div>
                      <button
                        type="submit"
                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500"
                      >
                        Set
                      </button>
                    </form>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>
                    Fires when unannounced price hike is detected between cycles.
                  </span>
                  {onSimulatePriceIncrease && (
                    <button
                      type="button"
                      onClick={onSimulatePriceIncrease}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      title="Simulate an unexpected price increase on a subscription to test the alert"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Simulate Price Spike</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Browser Push Permission Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Push Alerts:
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
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Enable Native Alerts
                </button>
              )}

              {permissionStatus === 'granted' && (
                <button
                  id="test-notification-btn"
                  onClick={handleTestAlert}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{testSent ? 'Alert Dispatched!' : 'Send Test Notification'}</span>
                </button>
              )}
            </div>

            {requestError && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{requestError}</p>
            )}
          </div>

          {/* Filter Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800/90 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  All ({alerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('price_hikes')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeFilter === 'price_hikes'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>Smart Alerts ({priceHikeAlerts.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('renewals')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeFilter === 'renewals'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Renewals ({renewalAlerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('trials')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeFilter === 'trials'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Trials ({trialAlerts.length})
                </button>
              </div>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Live evaluation
              </span>
            </div>

            {/* Alerts List */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {filteredAlerts.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {activeFilter === 'price_hikes'
                      ? 'No Unexpected Price Hikes Detected'
                      : 'All Charges Monitored & Safe'}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {activeFilter === 'price_hikes'
                      ? `No subscriptions have increased beyond your ${smartAlertThreshold}% threshold.`
                      : 'No upcoming renewal shocks or free trial expirations.'}
                  </p>
                </div>
              ) : (
                filteredAlerts.map((alert) => {
                  const sub = subscriptions.find((s) => s.id === alert.subscriptionId);
                  const isPriceHike = alert.type === 'price_hike';
                  const isTrial = alert.type === 'trial';
                  const hikeData = alert.priceHikeData;

                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isPriceHike
                          ? 'bg-gradient-to-r from-rose-50/90 via-amber-50/40 to-white dark:from-rose-950/40 dark:via-purple-950/20 dark:to-slate-900 border-rose-300 dark:border-rose-800 shadow-sm'
                          : isTrial
                          ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                          : 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {sub && (
                            <BrandLogo
                              name={sub.name}
                              domain={sub.domain}
                              logoUrl={sub.logoUrl}
                              size="md"
                            />
                          )}

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {isPriceHike ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                                  <TrendingUp className="w-3 h-3" />
                                  Smart Alert: Price Surge
                                </span>
                              ) : isTrial ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-600 text-white">
                                  Trial Expiry
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white">
                                  Renewal Imminent
                                </span>
                              )}

                              {isPriceHike && hikeData && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700">
                                  +{hikeData.percentage}% Jump
                                </span>
                              )}
                            </div>

                            <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {alert.title}
                            </h5>

                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              {alert.message}
                            </p>

                            {/* Detailed Price Hike Surge Metric Strip */}
                            {isPriceHike && hikeData && (
                              <div className="mt-2 p-2.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-rose-200/80 dark:border-rose-900/60 flex flex-wrap items-center gap-3 text-xs">
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-slate-400 line-through">
                                    {formatBaseINR(hikeData.previousCost)}
                                  </span>
                                  <span className="text-slate-400">→</span>
                                  <span className="font-bold text-rose-600 dark:text-rose-400">
                                    {formatBaseINR(hikeData.newCost)}
                                  </span>
                                </div>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                  +{formatBaseINR(hikeData.diffAmount)}/cycle extra bleed
                                </span>
                              </div>
                            )}

                            {!isPriceHike && sub && (
                              <span className="text-[11px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 mt-1 inline-block">
                                Amount due: {formatBaseINR(sub.cost)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Actions */}
                        {sub && (
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {/* Quick Pause */}
                            <button
                              type="button"
                              onClick={() => onTogglePause(sub.id)}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
                            >
                              {sub.isPaused ? 'Resume' : 'Quick Pause'}
                            </button>

                            {/* Revert Price (if hike) */}
                            {isPriceHike && onRevertPrice && (
                              <button
                                type="button"
                                onClick={() => onRevertPrice(sub.id)}
                                title="Revert price back to previous amount"
                                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Revert Price</span>
                              </button>
                            )}

                            {/* Dismiss Alert */}
                            {isPriceHike && onDismissAlert && (
                              <button
                                type="button"
                                onClick={() => onDismissAlert(sub.id)}
                                title="Dismiss this price hike alert"
                                className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                              >
                                Dismiss Alert
                              </button>
                            )}

                            {/* Cancel Link */}
                            {sub.cancellationUrl && (
                              <a
                                href={sub.cancellationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
                              >
                                <span>Cancel on Web</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
            Client-Side Autonomous Watchdog
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

