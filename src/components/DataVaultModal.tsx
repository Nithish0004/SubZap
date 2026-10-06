import React, { useState, useMemo } from 'react';
import { 
  Database, 
  ShieldCheck, 
  Lock, 
  Key, 
  Copy, 
  Check, 
  Server, 
  X, 
  FileText, 
  RefreshCw,
  Eye,
  EyeOff,
  User,
  CreditCard,
  Layers,
  Sparkles,
  Download,
  FileSpreadsheet,
  FileCheck,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import { Subscription } from '../types';
import { calculateMonthlySpendingTrend } from '../utils/calculations';
import { 
  generateSubscriptionsCSV, 
  generateEncryptedVaultBackup, 
  generateSpendingTrendCSV,
  triggerDownload 
} from '../utils/export';

interface DataVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptions: Subscription[];
  onTriggerSync?: () => void;
}

export const DataVaultModal: React.FC<DataVaultModalProps> = ({
  isOpen,
  onClose,
  subscriptions,
  onTriggerSync,
}) => {
  const { user, userProfile, userSecretKey, setNeedsOnboarding } = useAuth();
  const { formatBaseINR, getBreakdown } = useCurrency();
  const { theme } = useTheme();
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showRawKey, setShowRawKey] = useState(false);
  const [activeView, setActiveView] = useState<'profile' | 'subscriptions' | 'trends' | 'export' | 'security' | 'raw'>('profile');
  const [trendChartMode, setTrendChartMode] = useState<'area' | 'bar'>('area');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  // Compute 6-month historical spending trends using saved subscription data
  const trendSummary = useMemo(() => {
    return calculateMonthlySpendingTrend(subscriptions);
  }, [subscriptions]);

  const { trend, currentBurn, sixMonthsAgoBurn, netDelta, netDeltaPercent, averageBurn, peakMonth, lowestMonth } = trendSummary;
  const targetBudget = userProfile?.targetMonthlyBudget || 5000;
  const isIncrease = netDelta > 0;
  const isDecrease = netDelta < 0;
  const isOverBudget = currentBurn > targetBudget;
  const budgetVariance = currentBurn - targetBudget;

  const chartData = useMemo(() => {
    return trend.map((point) => ({
      name: point.label,
      fullLabel: point.fullLabel,
      burn: point.totalBurn,
      diff: point.diffFromPrev,
      diffPercent: point.diffPercent,
      activeCount: point.activeCount,
    }));
  }, [trend]);

  const formatYAxis = (val: number) => {
    if (val === 0) return '₹0';
    if (val >= 1000) {
      return `₹${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
    }
    return `₹${val}`;
  };

  // Custom Recharts Tooltip for Vault Spending Trends
  const VaultTrendTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const isMoMUp = data.diff > 0;
    const isMoMDown = data.diff < 0;

    return (
      <div className="p-3.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-xl backdrop-blur-md text-xs min-w-[210px] space-y-2 pointer-events-none z-50">
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>{data.fullLabel}</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {data.activeCount} subs
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-slate-500 dark:text-slate-400">Monthly Burn:</span>
            <span className="font-mono font-extrabold text-slate-900 dark:text-white text-sm">
              {formatBaseINR(data.burn)}
            </span>
          </div>

          <div className="flex items-baseline justify-between text-[11px] font-mono text-slate-400">
            <span>USD Equivalent:</span>
            <span>≈ {getBreakdown(data.burn).usd}</span>
          </div>

          {data.diff !== 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">MoM Variance:</span>
              <span className={`font-mono font-bold flex items-center gap-0.5 ${
                isMoMUp ? 'text-rose-600 dark:text-rose-400' : isMoMDown ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
              }`}>
                {isMoMUp ? '+' : ''}{formatBaseINR(data.diff)} ({data.diffPercent > 0 ? '+' : ''}{data.diffPercent}%)
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(userSecretKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyJson = () => {
    const exportData = {
      user: {
        uid: user?.uid,
        email: user?.email || user?.phoneNumber,
        provider: user?.providerType,
      },
      profile: userProfile,
      subscriptionsCount: subscriptions.length,
      subscriptions,
      exportedAt: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Download CSV Spreadsheet for personal record-keeping & external budget tracking
  const handleDownloadCSV = () => {
    try {
      const dateSlug = new Date().toISOString().split('T')[0];
      const csv = generateSubscriptionsCSV(subscriptions);
      triggerDownload(csv, `subzap_subscriptions_budget_${dateSlug}.csv`, 'text/csv');
      setDownloadStatus('Subscription CSV exported for external budget tracking');
      setTimeout(() => setDownloadStatus(null), 3500);
    } catch (err) {
      console.error('Error exporting CSV:', err);
    }
  };

  // Download Spending Trends CSV for historical trend analysis
  const handleDownloadTrendCSV = () => {
    try {
      const dateSlug = new Date().toISOString().split('T')[0];
      const csv = generateSpendingTrendCSV(trend);
      triggerDownload(csv, `subzap_spending_trends_${dateSlug}.csv`, 'text/csv');
      setDownloadStatus('Spending trends CSV downloaded');
      setTimeout(() => setDownloadStatus(null), 3500);
    } catch (err) {
      console.error('Error downloading trend CSV:', err);
    }
  };

  // Download Zero-Knowledge AES-256 Encrypted Vault File
  const handleDownloadEncrypted = async () => {
    setIsExporting(true);
    try {
      const dateSlug = new Date().toISOString().split('T')[0];
      const encryptedJson = await generateEncryptedVaultBackup(
        subscriptions,
        userSecretKey,
        {
          userId: user?.uid,
          userEmail: user?.email || user?.phoneNumber,
          profile: userProfile,
        }
      );
      triggerDownload(
        encryptedJson,
        `subzap_vault_encrypted_${dateSlug}.json`,
        'application/json'
      );
      setDownloadStatus('Encrypted vault backup downloaded');
      setTimeout(() => setDownloadStatus(null), 3500);
    } catch (err) {
      console.error('Error generating encrypted vault backup:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Download Plain Raw JSON file
  const handleDownloadPlainJSON = () => {
    try {
      const dateSlug = new Date().toISOString().split('T')[0];
      const exportData = {
        format: 'subzap-personal-record-snapshot-v1',
        exportedAt: new Date().toISOString(),
        user: {
          uid: user?.uid,
          email: user?.email || user?.phoneNumber,
        },
        profile: userProfile,
        totalSubscriptions: subscriptions.length,
        subscriptions,
      };
      triggerDownload(
        JSON.stringify(exportData, null, 2),
        `subzap_data_${dateSlug}.json`,
        'application/json'
      );
      setDownloadStatus('Raw JSON snapshot downloaded');
      setTimeout(() => setDownloadStatus(null), 3500);
    } catch (err) {
      console.error('Error downloading JSON:', err);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="data-vault-modal"
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Database className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  Project Data & Cloud Storage Vault
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                  Live Synced
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Transparent view of all cloud documents, profile entries, and encrypted records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Download Header Buttons */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
              <button
                id="header-export-csv-btn"
                type="button"
                onClick={handleDownloadCSV}
                title="Export current subscriptions as CSV file for external budget tracking (Excel, Google Sheets, YNAB)"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300/80 dark:border-emerald-800/80 rounded-lg transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Export CSV (Budget Tracking)</span>
              </button>

              <button
                id="header-download-enc-btn"
                type="button"
                onClick={handleDownloadEncrypted}
                disabled={isExporting}
                title="Download AES-256 encrypted vault backup"
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{isExporting ? 'Encrypting...' : 'Encrypted'}</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Download Status Toast Banner */}
        {downloadStatus && (
          <div className="px-4 sm:px-6 py-2 bg-emerald-500 text-white text-xs font-semibold flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{downloadStatus}</span>
            </div>
            <button
              onClick={() => setDownloadStatus(null)}
              className="text-emerald-100 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveView('profile')}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeView === 'profile'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>User Profile Data</span>
          </button>

          <button
            onClick={() => setActiveView('subscriptions')}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeView === 'subscriptions'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Subscriptions ({subscriptions.length})</span>
          </button>

          <button
            id="tab-trends-btn"
            onClick={() => setActiveView('trends')}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeView === 'trends'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            <span>Spending Trends (Recharts)</span>
          </button>

          <button
            id="tab-export-btn"
            onClick={() => setActiveView('export')}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeView === 'export'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span>Download & Export</span>
          </button>

          <button
            onClick={() => setActiveView('security')}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeView === 'security'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cloud Database & Security</span>
          </button>

          <button
            onClick={() => setActiveView('raw')}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeView === 'raw'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Raw JSON Export</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* TAB 1: USER PROFILE DATA */}
          {activeView === 'profile' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Active User Profile (Stored in Firestore & Memory)
                    </h4>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      setNeedsOnboarding(true);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Edit Profile Data</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400 text-[11px]">Full Name</p>
                    <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                      {userProfile?.fullName || 'Not set (Guest)'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400 text-[11px]">Identity / Login</p>
                    <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 truncate">
                      {userProfile?.identity || user?.email || user?.phoneNumber || user?.uid || 'Anonymous Session'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400 text-[11px]">Target Monthly Budget Ceiling</p>
                    <p className="font-bold font-mono text-indigo-600 dark:text-indigo-400 text-sm mt-0.5">
                      {userProfile?.targetMonthlyBudget ? formatBaseINR(userProfile.targetMonthlyBudget) : '₹5,000'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400 text-[11px]">Average Monthly Living Expenses</p>
                    <p className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                      {userProfile?.averageMonthlyExpense ? formatBaseINR(userProfile.averageMonthlyExpense) : '₹45,000'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400 text-[11px]">Financial Goal Strategy</p>
                    <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                      {userProfile?.financialGoal || 'Moderate Tracking'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400 text-[11px]">Auth Provider & User UID</p>
                    <p className="font-mono text-slate-700 dark:text-slate-300 text-xs mt-0.5 truncate">
                      {user?.providerType || 'demo'} • {user?.uid ? user.uid.substring(0, 16) + '...' : 'Local'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Where this is stored:</p>
                  <p className="text-indigo-700 dark:text-indigo-300 mt-0.5">
                    Your profile data is written to Firestore at <code className="font-mono bg-indigo-100 dark:bg-indigo-900 px-1 py-0.5 rounded">users/{'{userId}'}</code> and is also safely cached locally in your browser so you never experience loading pauses.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUBSCRIPTIONS DATA */}
          {activeView === 'subscriptions' && (
            <div className="space-y-4">
              {/* Personal Record-Keeping Export Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 dark:from-slate-800/80 dark:via-indigo-950/30 dark:to-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      External Budget Tracking & Personal Records
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Export your {subscriptions.length} active subscription records as a CSV spreadsheet for Excel, Google Sheets, or YNAB, or an encrypted backup.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="subs-view-trends-btn"
                    onClick={() => setActiveView('trends')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                    <span>View Trends</span>
                  </button>

                  <button
                    id="subs-export-csv-btn"
                    onClick={handleDownloadCSV}
                    title="Export current subscriptions as CSV file for external budget tracking"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export CSV (Budget Tracking)</span>
                  </button>

                  <button
                    id="subs-download-enc-btn"
                    onClick={handleDownloadEncrypted}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isExporting ? 'Encrypting...' : 'Encrypted Backup'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Active Subscription Records ({subscriptions.length})
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    id="subs-table-export-csv-btn"
                    onClick={handleDownloadCSV}
                    title="Export current subscriptions as CSV file to facilitate external budget tracking"
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Export CSV for Budget Tracking</span>
                  </button>
                  <span className="text-xs text-slate-400 hidden md:inline">
                    Encrypted client-side in cloud
                  </span>
                </div>
              </div>

              {subscriptions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <CreditCard className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No subscriptions found</p>
                  <p className="text-xs text-slate-400 mt-1">Add a subscription using the "+ Add" button to see it here.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {subscriptions.map((sub, idx) => (
                    <div 
                      key={sub.id} 
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-mono font-bold text-[10px] text-slate-600 dark:text-slate-300">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{sub.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {sub.billingCycle} • {sub.category} • Renewal: {sub.nextRenewalDate}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatBaseINR(sub.cost)}
                          <span className="text-[10px] font-normal text-slate-400">/{sub.billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                        </p>
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          sub.isPaused ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {sub.isPaused ? 'Paused' : 'Active'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SPENDING TRENDS OVER TIME (RECHARTS) */}
          {activeView === 'trends' && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              {/* Header & Controls Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/90 via-purple-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900/60 border border-indigo-200/90 dark:border-indigo-800/60 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      6-Month Spending Trends & Burn Trajectory
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Interactive Recharts visualization modeled from your saved subscription database records and billing intervals.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Chart Type Selector */}
                  <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      id="trend-chart-area-btn"
                      type="button"
                      onClick={() => setTrendChartMode('area')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        trendChartMode === 'area'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Area Chart trajectory view"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Area Curve</span>
                    </button>
                    <button
                      id="trend-chart-bar-btn"
                      type="button"
                      onClick={() => setTrendChartMode('bar')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        trendChartMode === 'bar'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Bar Chart comparison view"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Bar View</span>
                    </button>
                  </div>

                  {/* Quick Export Trend CSV Button */}
                  <button
                    id="trend-export-csv-btn"
                    type="button"
                    onClick={handleDownloadTrendCSV}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Download 6-month spending trends as CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Key Spending Trend Metrics KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {/* 1. Current Monthly Burn */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Current Monthly Burn</span>
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isIncrease 
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300' 
                        : isDecrease 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {isIncrease ? <ArrowUpRight className="w-3 h-3" /> : isDecrease ? <ArrowDownRight className="w-3 h-3" /> : null}
                      {netDeltaPercent > 0 ? `+${netDeltaPercent}%` : `${netDeltaPercent}%`}
                    </span>
                  </div>
                  <p className="font-mono font-extrabold text-slate-900 dark:text-white text-base">
                    {formatBaseINR(currentBurn)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {isIncrease ? `+${formatBaseINR(netDelta)} vs 6 mo ago` : isDecrease ? `${formatBaseINR(netDelta)} vs 6 mo ago` : 'Steady trajectory'}
                  </p>
                </div>

                {/* 2. 6-Month Average Burn */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">6-Mo Average Burn</span>
                  <p className="font-mono font-extrabold text-slate-900 dark:text-white text-base">
                    {formatBaseINR(averageBurn)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Across 6 billing cycles
                  </p>
                </div>

                {/* 3. Budget Variance */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Monthly Target Budget</span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isOverBudget 
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300' 
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                    }`}>
                      {isOverBudget ? 'Over Budget' : 'Within Budget'}
                    </span>
                  </div>
                  <p className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-base">
                    {formatBaseINR(targetBudget)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {isOverBudget ? `+${formatBaseINR(budgetVariance)} over limit` : `${formatBaseINR(Math.abs(budgetVariance))} buffer left`}
                  </p>
                </div>

                {/* 4. Peak vs Lowest Month */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Peak vs Lowest Cycle</span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[10px]">Peak:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{peakMonth.label} ({formatBaseINR(peakMonth.totalBurn)})</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t border-slate-200/50 dark:border-slate-700/50 pt-1">
                    <span className="text-slate-500 text-[10px]">Lowest:</span>
                    <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{lowestMonth.label} ({formatBaseINR(lowestMonth.totalBurn)})</span>
                  </div>
                </div>
              </div>

              {/* Interactive Recharts Graph Panel */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Monthly Recurring Outflow (INR)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-indigo-500 inline-block" />
                      <span>Monthly Burn</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-rose-500 border-b border-dashed border-rose-500 inline-block" />
                      <span>Target Budget ({formatBaseINR(targetBudget)})</span>
                    </div>
                  </div>
                </div>

                <div className="h-64 sm:h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    {trendChartMode === 'area' ? (
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="vaultTrendGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} opacity={0.6} />
                        <XAxis 
                          dataKey="name" 
                          stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={{ stroke: theme === 'dark' ? '#334155' : '#e2e8f0' }} 
                        />
                        <YAxis 
                          stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} 
                          fontSize={10} 
                          tickFormatter={formatYAxis} 
                          tickLine={false} 
                          axisLine={{ stroke: theme === 'dark' ? '#334155' : '#e2e8f0' }} 
                        />
                        <RechartsTooltip content={<VaultTrendTooltip />} />
                        <ReferenceLine 
                          y={targetBudget} 
                          stroke="#f43f5e" 
                          strokeDasharray="4 4" 
                          strokeWidth={1.5}
                          label={{ value: 'Budget Ceiling', position: 'insideTopRight', fill: '#f43f5e', fontSize: 10, fontWeight: 'bold' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="burn" 
                          stroke="#6366f1" 
                          strokeWidth={2.5} 
                          fillOpacity={1} 
                          fill="url(#vaultTrendGradient)" 
                          activeDot={{ r: 6, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    ) : (
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} opacity={0.6} />
                        <XAxis 
                          dataKey="name" 
                          stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={{ stroke: theme === 'dark' ? '#334155' : '#e2e8f0' }} 
                        />
                        <YAxis 
                          stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} 
                          fontSize={10} 
                          tickFormatter={formatYAxis} 
                          tickLine={false} 
                          axisLine={{ stroke: theme === 'dark' ? '#334155' : '#e2e8f0' }} 
                        />
                        <RechartsTooltip content={<VaultTrendTooltip />} />
                        <ReferenceLine 
                          y={targetBudget} 
                          stroke="#f43f5e" 
                          strokeDasharray="4 4" 
                          strokeWidth={1.5}
                          label={{ value: 'Budget Ceiling', position: 'insideTopRight', fill: '#f43f5e', fontSize: 10, fontWeight: 'bold' }}
                        />
                        <Bar dataKey="burn" radius={[6, 6, 0, 0]} maxBarSize={48}>
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.burn > targetBudget ? '#f43f5e' : '#6366f1'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Month-by-Month Trajectory Log */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Month-by-Month Burn History ({trend.length} Months)
                  </h5>
                  <button
                    type="button"
                    onClick={handleDownloadTrendCSV}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Trend CSV</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {trend.map((pt) => {
                    const isUp = pt.diffFromPrev > 0;
                    const isDown = pt.diffFromPrev < 0;
                    const exceeds = pt.totalBurn > targetBudget;

                    return (
                      <div 
                        key={pt.monthKey}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-indigo-500" />
                            {pt.fullLabel}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {pt.activeCount} active
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                            {formatBaseINR(pt.totalBurn)}
                          </span>
                          {pt.diffFromPrev !== 0 ? (
                            <span className={`text-[10px] font-mono font-semibold flex items-center gap-0.5 ${
                              isUp ? 'text-rose-600 dark:text-rose-400' : isDown ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                            }`}>
                              {isUp ? '+' : ''}{formatBaseINR(pt.diffFromPrev)} ({pt.diffPercent > 0 ? '+' : ''}{pt.diffPercent}%)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Baseline</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1">
                          <span>Budget Status:</span>
                          <span className={exceeds ? 'text-rose-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                            {exceeds ? `Exceeds ceiling` : `Within ceiling`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DEDICATED DOWNLOAD & EXPORT PANEL */}
          {activeView === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900/60 border border-indigo-200/90 dark:border-indigo-800/60">
                <div className="flex items-center gap-2 mb-1">
                  <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Personal Record-Keeping & Offline Vault Export
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Export your active subscriptions in open spreadsheet formats or zero-knowledge encrypted packages for offline archival, tax records, or backup.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option 1: CSV File Download for External Budget Tracking */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                          CSV Export (External Budget Tracking)
                        </h5>
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          .csv (RFC-4180 UTF-8 with BOM)
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Standard tabular export structured for external budget tracking across Microsoft Excel, Google Sheets, Apple Numbers, YNAB, Monarch Money, and Notion. Includes normalized monthly cost, projected annual bleed, categories, renewal dates, and status.
                    </p>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>Includes: </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-semibold">{subscriptions.length} items</strong>
                      <span> • Normalized Monthly & Annual Cost • Billing Frequency • Dates</span>
                    </div>
                  </div>

                  <button
                    id="export-panel-download-csv-btn"
                    onClick={handleDownloadCSV}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export Subscriptions as CSV for External Budget Tracking</span>
                  </button>
                </div>

                {/* Option 2: Encrypted Vault File Download */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                          Encrypted Vault Backup
                        </h5>
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                          .json (AES-GCM-256)
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Zero-knowledge ciphertext export generated using your 256-bit PBKDF2 session key. Safe for cold storage, cloud drive backup, or USB personal archives.
                    </p>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>Security: </span>
                      <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">AES-256 Client-Side</strong>
                      <span> • Unreadable without Key</span>
                    </div>
                  </div>

                  <button
                    id="export-panel-download-enc-btn"
                    onClick={handleDownloadEncrypted}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{isExporting ? 'Encrypting Vault...' : 'Download Encrypted File (.json)'}</span>
                  </button>
                </div>
              </div>

              {/* Developer / Raw JSON backup option */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-300">
                    Need a raw developer snapshot with full schemas and timestamps?
                  </span>
                </div>
                <button
                  onClick={handleDownloadPlainJSON}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 font-semibold transition-colors cursor-pointer shrink-0"
                >
                  Download Plain JSON
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: CLOUD DATABASE & SECURITY */}
          {activeView === 'security' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Cloud Infrastructure Topology
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Database Engine</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Google Cloud Firestore</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Encryption Algorithm</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">AES-GCM (256-bit client-side)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Profile Document Path</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[11px] truncate block">
                      /users/{user?.uid || 'userId'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Subscription Collection</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[11px] truncate block">
                      /users/{user?.uid || 'userId'}/subscriptions
                    </span>
                  </div>
                </div>
              </div>

              {/* Encryption Secret Key Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold">
                    <Key className="w-4 h-4 text-amber-500" />
                    <span>Your Session Zero-Knowledge Key</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowRawKey(!showRawKey)}
                      className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showRawKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showRawKey ? 'Hide' : 'Reveal'}</span>
                    </button>
                    <button
                      onClick={handleCopyKey}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
                    >
                      {copiedKey ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  This key is derived client-side and never leaves your browser. Even database administrators cannot read your subscription amounts or names.
                </p>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all">
                  {showRawKey ? userSecretKey : '•'.repeat(40)}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RAW JSON EXPORT */}
          {activeView === 'raw' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Decrypted JSON Snapshot
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPlainJSON}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .JSON</span>
                  </button>

                  <button
                    onClick={handleCopyJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedJson ? 'Copied to Clipboard!' : 'Copy Full JSON'}</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-[360px] leading-relaxed border border-slate-800">
                {JSON.stringify({
                  userProfile,
                  totalSubscriptions: subscriptions.length,
                  subscriptions,
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-xs gap-2">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>End-to-End Encrypted Persistence</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="footer-export-csv-budget-btn"
              type="button"
              onClick={handleDownloadCSV}
              title="Export current subscription data as a CSV file to facilitate external budget tracking"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 font-semibold cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV (Budget Tracking)</span>
            </button>

            <button
              id="footer-download-enc-btn"
              type="button"
              onClick={handleDownloadEncrypted}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 hover:bg-indigo-100 font-semibold cursor-pointer transition-colors disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Encrypting...' : 'Download Encrypted'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer transition-colors"
            >
              Close Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

