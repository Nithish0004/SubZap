import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2, Lock } from 'lucide-react';

interface BotVerificationWidgetProps {
  isVerified: boolean;
  onVerify: (token: string) => void;
  hasError?: boolean;
}

export const BotVerificationWidget: React.FC<BotVerificationWidgetProps> = ({
  isVerified,
  onVerify,
  hasError = false,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);

  const handleTriggerVerification = () => {
    if (isVerified || isVerifying) return;
    setIsVerifying(true);

    // Realistic human verification telemetry delay
    setTimeout(() => {
      setIsVerifying(false);
      const simulatedToken = `cf_turnstile_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      onVerify(simulatedToken);
    }, 900);
  };

  return (
    <div
      id="bot-verification-container"
      onClick={handleTriggerVerification}
      className={`relative w-full p-3 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between ${
        isVerified
          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
          : hasError
          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 animate-shake'
          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
      title={isVerified ? 'Human verification passed' : 'Click to verify human identity'}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox box */}
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${
            isVerified
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
              : isVerifying
              ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-500 text-indigo-500'
              : hasError
              ? 'bg-white dark:bg-slate-900 border-rose-400'
              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 hover:border-indigo-400'
          }`}
        >
          {isVerified ? (
            <CheckCircle2 className="w-4 h-4 text-white" />
          ) : isVerifying ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
          ) : null}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            {isVerified
              ? 'Verification passed: You are human'
              : isVerifying
              ? 'Verifying client integrity...'
              : 'Verify you are human'}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            {isVerified ? 'Cloudflare Turnstile token secured' : 'Protected by Cloudflare Turnstile & reCAPTCHA'}
          </p>
        </div>
      </div>

      {/* Cloudflare / Shield branding emblem */}
      <div className="flex flex-col items-end opacity-70">
        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
          <Lock className="w-3 h-3 text-indigo-500" />
          <span className="font-semibold text-[10px]">Cloudflare</span>
        </div>
        <span className="text-[9px] text-slate-400">Turnstile v3</span>
      </div>
    </div>
  );
};
