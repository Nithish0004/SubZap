import React, { useState, useMemo } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Lock, 
  Unlock, 
  Check, 
  Copy, 
  X, 
  ShieldCheck, 
  Info, 
  Sparkles,
  CheckCircle2,
  Filter,
  Eye,
  FileCode,
  AlertCircle
} from 'lucide-react';
import { Subscription } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { 
  generateSubscriptionsCSV, 
  generateEncryptedSubscriptionsCSV, 
  generateSubscriptionsJSON, 
  generateEncryptedSubscriptionsJSON, 
  triggerDownload 
} from '../utils/export';
import { getNormalizedMonthlyCost } from '../utils/calculations';

interface ExportSubscriptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptions: Subscription[];
  filteredSubscriptions?: Subscription[];
  filterLabel?: string;
}

export const ExportSubscriptionsModal: React.FC<ExportSubscriptionsModalProps> = ({
  isOpen,
  onClose,
  subscriptions,
  filteredSubscriptions,
  filterLabel,
}) => {
  const { user, userProfile, userSecretKey } = useAuth();
  const { formatBaseINR } = useCurrency();

  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [securityMode, setSecurityMode] = useState<'decrypted' | 'encrypted'>('decrypted');
  const [scope, setScope] = useState<'all' | 'filtered'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'options' | 'preview'>('options');

  const hasFilter = Boolean(filteredSubscriptions && filteredSubscriptions.length !== subscriptions.length);
  const activeSubs = scope === 'filtered' && hasFilter && filteredSubscriptions ? filteredSubscriptions : subscriptions;

  // Generate sample rows for CSV preview
  const csvPreviewRows = useMemo(() => {
    return activeSubs.slice(0, 3).map((sub, index) => {
      const monthlyNormalized = Math.round(getNormalizedMonthlyCost(sub.cost, sub.billingCycle) * 100) / 100;
      const hashSeed = (sub.id || `sub-${index}`).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hexIv = (hashSeed * 179).toString(16).padStart(8, '0').slice(0, 8);
      const hexCipher = (hashSeed * 983).toString(16).padStart(12, 'a').slice(0, 12);

      return {
        id: sub.id,
        name: sub.name,
        cost: formatBaseINR(sub.cost),
        currency: sub.currency || '₹',
        cycle: sub.billingCycle,
        monthlyNormalized: formatBaseINR(monthlyNormalized),
        category: sub.category,
        status: sub.isPaused ? 'Paused' : 'Active',
        renewal: sub.nextRenewalDate,
        // Encrypted tokens
        encName: `${hexIv}:9f8c${hexCipher}`,
        encCost: `${hexIv}:2b4a${hexCipher.slice(0, 6)}`,
        encMonthlyNormalized: `${hexIv}:7e1d${hexCipher.slice(0, 6)}`,
        encRenewal: `${hexIv}:88c1${hexCipher.slice(0, 8)}`,
      };
    });
  }, [activeSubs, formatBaseINR]);

  // Preview snippet for JSON
  const jsonPreviewSnippet = useMemo(() => {
    if (securityMode === 'decrypted') {
      return JSON.stringify({
        vaultFormat: 'subzap-subscription-export-v1',
        mode: 'decrypted',
        totalSubscriptions: activeSubs.length,
        exportedAt: new Date().toISOString(),
        subscriptions: activeSubs.slice(0, 2).map((s) => ({
          id: s.id,
          name: s.name,
          cost: s.cost,
          currency: s.currency,
          billingCycle: s.billingCycle,
          category: s.category,
          status: s.isPaused ? 'Paused' : 'Active',
          nextRenewalDate: s.nextRenewalDate,
        })),
        ...(activeSubs.length > 2 ? { _note: `...and ${activeSubs.length - 2} more subscriptions` } : {}),
      }, null, 2);
    } else {
      return JSON.stringify({
        vaultFormat: 'subzap-subscription-export-v1',
        mode: 'encrypted',
        cipherAlgorithm: 'AES-GCM-256-PBKDF2',
        iterations: 100000,
        totalSubscriptions: activeSubs.length,
        exportedAt: new Date().toISOString(),
        encryptedRecords: [
          {
            id: activeSubs[0]?.id || 'sub-1',
            name: 'e7a1b02c:7f89ac418b...',
            cost: 'e7a1b02c:4189ac72...',
            category: activeSubs[0]?.category || 'Entertainment',
            billingCycle: activeSubs[0]?.billingCycle || 'monthly',
            isPaused: activeSubs[0]?.isPaused || false,
            nextRenewalDate: 'e7a1b02c:1278ba90...',
          },
        ],
        encryptedPayload: '9c81fa7e:31bda94819cf88...',
        securityNotice: 'AES-256 Client-Side Encrypted with Zero-Knowledge Key.',
      }, null, 2);
    }
  }, [securityMode, activeSubs]);

  if (!isOpen) return null;

  const dateSlug = new Date().toISOString().split('T')[0];

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      if (format === 'csv') {
        if (securityMode === 'encrypted') {
          const content = await generateEncryptedSubscriptionsCSV(activeSubs, userSecretKey);
          triggerDownload(
            content,
            `subzap_subscriptions_encrypted_${dateSlug}.csv`,
            'text/csv'
          );
          setStatusMessage('Encrypted CSV downloaded (sensitive fields protected with AES-256)');
        } else {
          const content = generateSubscriptionsCSV(activeSubs);
          triggerDownload(
            content,
            `subzap_subscriptions_decrypted_${dateSlug}.csv`,
            'text/csv'
          );
          setStatusMessage('Decrypted plaintext CSV downloaded for external spreadsheet apps');
        }
      } else {
        // JSON Export
        if (securityMode === 'encrypted') {
          const content = await generateEncryptedSubscriptionsJSON(activeSubs, userSecretKey, {
            userId: user?.uid,
            userEmail: user?.email || user?.phoneNumber,
            profile: userProfile,
            filterApplied: scope === 'filtered' ? filterLabel : 'all',
          });
          triggerDownload(
            content,
            `subzap_subscriptions_encrypted_${dateSlug}.json`,
            'application/json'
          );
          setStatusMessage('Encrypted JSON downloaded (zero-knowledge encrypted backup)');
        } else {
          const content = generateSubscriptionsJSON(activeSubs, {
            userId: user?.uid,
            userEmail: user?.email || user?.phoneNumber,
            profile: userProfile,
            filterApplied: scope === 'filtered' ? filterLabel : 'all',
          });
          triggerDownload(
            content,
            `subzap_subscriptions_decrypted_${dateSlug}.json`,
            'application/json'
          );
          setStatusMessage('Decrypted JSON list data downloaded');
        }
      }
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error('Export download error:', err);
      setStatusMessage('Export failed. Please verify your data and try again.');
      setTimeout(() => setStatusMessage(null), 3500);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyClipboard = async () => {
    try {
      let content = '';
      if (format === 'csv') {
        if (securityMode === 'encrypted') {
          content = await generateEncryptedSubscriptionsCSV(activeSubs, userSecretKey);
        } else {
          content = generateSubscriptionsCSV(activeSubs);
        }
      } else {
        if (securityMode === 'encrypted') {
          content = await generateEncryptedSubscriptionsJSON(activeSubs, userSecretKey, {
            userId: user?.uid,
            userEmail: user?.email || user?.phoneNumber,
            profile: userProfile,
          });
        } else {
          content = generateSubscriptionsJSON(activeSubs, {
            userId: user?.uid,
            userEmail: user?.email || user?.phoneNumber,
            profile: userProfile,
          });
        }
      }
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setStatusMessage('Export copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error('Clipboard copy error:', err);
    }
  };

  return (
    <div 
      id="export-subscriptions-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="export-subscriptions-modal"
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Export Subscription Data
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {format.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download your subscriptions in JSON or CSV with encrypted or decrypted security modes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close export modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div className="px-5 py-2 bg-emerald-500 text-white text-xs font-semibold flex items-center justify-between animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-emerald-100 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Tabs: Options vs Live Preview */}
        <div className="flex items-center px-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 text-xs font-semibold gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('options')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'options'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Export Settings & Controls
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Output Live Preview</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'options' ? (
            <>
              {/* 1. Format Choice: CSV or JSON */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  1. Select File Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* CSV Option */}
                  <button
                    type="button"
                    onClick={() => setFormat('csv')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      format === 'csv'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          CSV (.csv)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                        Spreadsheet
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      RFC-4180 standard with UTF-8 BOM. Best for Excel, Google Sheets, Apple Numbers, and YNAB.
                    </p>
                  </button>

                  {/* JSON Option */}
                  <button
                    type="button"
                    onClick={() => setFormat('json')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      format === 'json'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <FileCode className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          JSON (.json)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                        Data Object
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Structured object schema with timestamps and metadata. Best for developer backups and cold archival.
                    </p>
                  </button>
                </div>
              </div>

              {/* 2. Security & Privacy Mode: Decrypted vs Encrypted */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  2. Security & Encryption Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Decrypted Option */}
                  <div
                    onClick={() => setSecurityMode('decrypted')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      securityMode === 'decrypted'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Unlock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Decrypted (Plaintext Data)
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60">
                          Human Readable
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Decrypts subscription names, costs, renewal dates, and notes into readable plaintext. Perfect for personal budgeting spreadsheets.
                      </p>
                    </div>
                  </div>

                  {/* Encrypted Option */}
                  <div
                    onClick={() => setSecurityMode('encrypted')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      securityMode === 'encrypted'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Encrypted (AES-256 State)
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60">
                          Zero-Knowledge
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Maintains AES-GCM-256 encryption using your Vault Secret Key. Safe to store on external drives or public cloud storage without exposing financial data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Scope Selector (if filters are active) */}
              {hasFilter && (
                <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-indigo-500" />
                      Export Data Scope
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {filterLabel ? `Filter: ${filterLabel}` : 'Active Filters'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setScope('filtered')}
                      className={`p-2 rounded-lg border font-semibold text-center transition-all cursor-pointer ${
                        scope === 'filtered'
                          ? 'border-indigo-600 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      Filtered View ({filteredSubscriptions?.length} subs)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope('all')}
                      className={`p-2 rounded-lg border font-semibold text-center transition-all cursor-pointer ${
                        scope === 'all'
                          ? 'border-indigo-600 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      All Subscriptions ({subscriptions.length} subs)
                    </button>
                  </div>
                </div>
              )}

              {/* Summary Chip */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>
                    Ready to export: <strong>{activeSubs.length} subscriptions</strong> as{' '}
                    <strong>{securityMode.toUpperCase()} {format.toUpperCase()}</strong>
                  </span>
                </div>
                <code className="text-[10px] font-mono text-slate-500 dark:text-slate-400 hidden sm:inline">
                  subzap_subscriptions_{securityMode}_{dateSlug}.{format}
                </code>
              </div>
            </>
          ) : (
            /* Live Output Preview Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-500" />
                  Live Preview: {securityMode === 'decrypted' ? 'Decrypted (Plaintext)' : 'Encrypted (AES-256 Ciphertext)'} {format.toUpperCase()}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {format === 'csv' ? `Previewing top ${Math.min(csvPreviewRows.length, 3)} rows` : 'JSON structure'}
                </span>
              </div>

              {format === 'csv' ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 p-2 text-xs">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-mono text-[10px] uppercase">
                        <th className="pb-1.5 pr-3 font-semibold">Name</th>
                        <th className="pb-1.5 pr-3 font-semibold">Cost</th>
                        <th className="pb-1.5 pr-3 font-semibold">Cycle</th>
                        <th className="pb-1.5 pr-3 font-semibold">Normalized/Mo</th>
                        <th className="pb-1.5 pr-3 font-semibold">Category</th>
                        <th className="pb-1.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                      {csvPreviewRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-400">
                            No subscriptions to export.
                          </td>
                        </tr>
                      ) : (
                        csvPreviewRows.map((row) => (
                          <tr key={row.id} className="font-mono">
                            <td className="py-1.5 pr-3 font-sans font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                              {securityMode === 'decrypted' ? (
                                row.name
                              ) : (
                                <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[10px]">
                                  🔒 {row.encName}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 pr-3 text-slate-800 dark:text-slate-200">
                              {securityMode === 'decrypted' ? (
                                row.cost
                              ) : (
                                <span className="text-indigo-600 dark:text-indigo-400 text-[10px]">
                                  🔒 {row.encCost}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 pr-3 text-slate-500 capitalize">{row.cycle}</td>
                            <td className="py-1.5 pr-3 text-emerald-600 dark:text-emerald-400">
                              {securityMode === 'decrypted' ? (
                                row.monthlyNormalized
                              ) : (
                                <span className="text-indigo-600 dark:text-indigo-400 text-[10px]">
                                  🔒 {row.encMonthlyNormalized}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-300 font-sans">{row.category}</td>
                            <td className="py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                row.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="relative">
                  <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-[260px] leading-relaxed border border-slate-800">
                    {jsonPreviewSnippet}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-xs gap-3">
          <button
            type="button"
            onClick={handleCopyClipboard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Copy export content to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>

            <button
              id="export-modal-submit-download-btn"
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold shadow-sm transition-all cursor-pointer text-white disabled:opacity-50 ${
                securityMode === 'decrypted'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>
                {isExporting 
                  ? 'Generating Export...' 
                  : `Download ${securityMode === 'decrypted' ? 'Decrypted' : 'Encrypted'} ${format.toUpperCase()}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
