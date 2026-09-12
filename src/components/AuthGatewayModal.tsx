import React, { useState } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  Mail, 
  Phone, 
  ArrowRight, 
  KeyRound, 
  AlertCircle, 
  RefreshCw, 
  Lock,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthGatewayModal: React.FC = () => {
  const { loginWithGoogle, sendVerificationOtp, verifyOtpAndLogin } = useAuth();

  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [identityValue, setIdentityValue] = useState('');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(45);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmed = identityValue.trim();
    if (!trimmed) {
      setErrorMessage(method === 'email' ? 'Please enter a valid email address.' : 'Please enter a valid mobile phone number.');
      return;
    }

    if (method === 'email' && !trimmed.includes('@')) {
      setErrorMessage('Please enter a valid email address (e.g. alex@example.com).');
      return;
    }

    if (method === 'phone' && trimmed.replace(/[^0-9]/g, '').length < 8) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const code = await sendVerificationOtp(trimmed, method);
      setGeneratedOtp(code);
      setStep('otp');
      setResendTimer(45);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (enteredOtp.length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtpAndLogin(identityValue.trim(), method, enteredOtp, generatedOtp);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const code = await sendVerificationOtp(identityValue.trim(), method);
      setGeneratedOtp(code);
      setResendTimer(45);
    } catch (err: any) {
      setErrorMessage('Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 dark:bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div 
        id="auth-gateway-container"
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200"
      >
        {/* Brand Shield Emblem */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-xl shadow-indigo-500/25 mb-3.5">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Zap className="w-7 h-7 text-indigo-600 dark:text-indigo-400 fill-indigo-600/20" />
            </div>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Access Sub<span className="text-indigo-600 dark:text-indigo-400">Zap</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            Zero-knowledge encrypted cloud persistence & subscription defense
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step 1: Input Identity or Google OAuth */}
        {step === 'input' ? (
          <div className="space-y-4">
            {/* 1. Google Login OAuth Action */}
            <button
              id="google-signin-btn"
              type="button"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-100 font-semibold text-sm shadow-xs transition-all hover:border-slate-400 disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">
                Or Sign in with Email / Phone
              </span>
            </div>

            {/* Method Toggle: Email vs Mobile Phone */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setMethod('email');
                  setIdentityValue('');
                  setErrorMessage('');
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  method === 'email'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Address</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod('phone');
                  setIdentityValue('');
                  setErrorMessage('');
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  method === 'phone'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Mobile Number</span>
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {method === 'email' ? 'Work or Personal Email' : 'Mobile Phone Number'}
                </label>
                <div className="relative flex items-center">
                  {method === 'email' ? (
                    <Mail className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  ) : (
                    <Phone className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  )}
                  <input
                    id="auth-identity-input"
                    type={method === 'email' ? 'email' : 'tel'}
                    required
                    placeholder={method === 'email' ? 'alex@example.com' : '+91 98765 43210'}
                    value={identityValue}
                    onChange={(e) => setIdentityValue(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <button
                id="send-otp-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Step 2: Verification Code (OTP) Screen */
          <div className="space-y-5">
            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
              <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Verification Code Sent</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                We sent a 6-digit verification code to <strong className="text-slate-900 dark:text-white">{identityValue}</strong>.
              </p>
              
              {/* Instant Verification Code Hint for convenient testing */}
              <div className="mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Auto-Generated Code:</span>
                <span 
                  onClick={() => setEnteredOtp(generatedOtp)}
                  className="font-mono font-bold text-indigo-600 dark:text-indigo-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 cursor-pointer hover:underline"
                  title="Click to auto-fill"
                >
                  {generatedOtp} (Click to fill)
                </span>
              </div>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Enter 6-Digit OTP Code
                </label>
                <div className="relative flex items-center">
                  <KeyRound className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="auth-otp-input"
                    type="text"
                    maxLength={6}
                    autoFocus
                    placeholder="123456"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono tracking-widest text-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                id="verify-otp-btn"
                type="submit"
                disabled={isLoading || enteredOtp.length < 6}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Provision Cloud Account</span>
                  </>
                )}
              </button>
            </form>

            {/* Back & Resend actions */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setEnteredOtp('');
                  setErrorMessage('');
                }}
                className="hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
              >
                ← Change Email/Phone
              </button>

              <button
                type="button"
                disabled={resendTimer > 0 || isLoading}
                onClick={handleResend}
                className="text-indigo-600 dark:text-indigo-400 hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
              </button>
            </div>
          </div>
        )}

        {/* Zero-Knowledge AES Security Footnote */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
          <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Client-Side AES Encrypted • Zero Server Knowledge</span>
        </div>
      </div>
    </div>
  );
};
