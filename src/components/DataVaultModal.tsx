import React, { useState } from 'react';
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
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { Subscription } from '../types';
import { 
  generateSubscriptionsCSV, 
  generateEncryptedVaultBackup, 
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
  const { formatBaseINR } = useCurrency();
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showRawKey, setShowRawKey] = useState(false);
  const [activeView, setActiveView] = useState<'profile' | 'subscriptions' | 'export' | 'security' | 'raw'>('profile');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

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

  // Download CSV Spreadsheet for personal record-keeping
  const handleDownloadCSV = () => {
    try {
      const dateSlug = new Date().toISOString().split('T')[0];
      const csv = generateSubscriptionsCSV(subscriptions);
      triggerDownload(csv, `subzap_subscriptions_${dateSlug}.csv`, 'text/csv');
      setDownloadStatus('CSV file downloaded');
      setTimeout(() => setDownloadStatus(null), 3500);
    } catch (err) {
      console.error('Error downloading CSV:', err);
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
                id="header-download-csv-btn"
                type="button"
                onClick={handleDownloadCSV}
                title="Download subscriptions as CSV spreadsheet"
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>CSV</span>
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
                      Download Personal Records
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Save your {subscriptions.length} subscription records as a spreadsheet or encrypted vault file
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="subs-download-csv-btn"
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>

                  <button
                    id="subs-download-enc-btn"
                    onClick={handleDownloadEncrypted}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isExporting ? 'Encrypting...' : 'Download Encrypted'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Active Subscription Records ({subscriptions.length})
                </h4>
                <span className="text-xs text-slate-400">
                  Encrypted client-side before sending to Firestore
                </span>
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

          {/* TAB 3: DEDICATED DOWNLOAD & EXPORT PANEL */}
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
                {/* Option 1: CSV File Download */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                          CSV Spreadsheet File
                        </h5>
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          .csv (UTF-8 with BOM)
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Standard tabular export formatted for Microsoft Excel, Google Sheets, Apple Numbers, or Notion. Includes 15 columns with names, prices, categories, renewal dates, and status.
                    </p>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>Includes: </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-semibold">{subscriptions.length} items</strong>
                      <span> • Cost in INR • Cycle • Renewal Dates • URLs</span>
                    </div>
                  </div>

                  <button
                    id="export-panel-download-csv-btn"
                    onClick={handleDownloadCSV}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Subscriptions as CSV</span>
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
              id="footer-download-csv-btn"
              type="button"
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 font-semibold cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download CSV</span>
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

