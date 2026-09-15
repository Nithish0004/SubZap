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
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { Subscription } from '../types';

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
  const [activeView, setActiveView] = useState<'profile' | 'subscriptions' | 'raw' | 'security'>('profile');

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

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveView('profile')}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors cursor-pointer ${
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
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors cursor-pointer ${
              activeView === 'subscriptions'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Subscriptions ({subscriptions.length})</span>
          </button>

          <button
            onClick={() => setActiveView('security')}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors cursor-pointer ${
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
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors cursor-pointer ${
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
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
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
                          {formatBaseINR(sub.priceINR)}
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

          {/* TAB 3: CLOUD DATABASE & SECURITY */}
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

          {/* TAB 4: RAW JSON EXPORT */}
          {activeView === 'raw' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Decrypted JSON Snapshot
                </h4>
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJson ? 'Copied to Clipboard!' : 'Copy Full JSON'}</span>
                </button>
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
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>End-to-End Encrypted Persistence</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer transition-colors"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
};
