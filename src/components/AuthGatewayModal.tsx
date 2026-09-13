import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  Eye,
  EyeOff,
  User as UserIcon,
  AlertTriangle,
  ArrowLeft,
  Info,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleIcon } from './GoogleIcon';
import { PhoneCountrySelector, POPULAR_COUNTRIES, Country } from './PhoneCountrySelector';
import { BotVerificationWidget } from './BotVerificationWidget';
import { 
  PasswordRequirementsBar, 
  PASSWORD_COMPLEXITY_REGEX, 
  checkPasswordStrength 
} from './PasswordRequirementsBar';
import { findAccountByIdentity } from '../services/accountService';

type AuthViewMode = 'signin' | 'signup' | 'otp_verify' | 'forgot_password';
type ForgotStage = 'identify' | 'verify' | 'reset';

export const AuthGatewayModal: React.FC = () => {
  const { 
    loginWithGoogle, 
    loginWithCredentials, 
    registerWithCredentials, 
    resetUserPassword,
    sendVerificationOtp 
  } = useAuth();

  // Core view router
  const [viewMode, setViewMode] = useState<AuthViewMode>('signin');

  // Input fields for Sign In / Sign Up
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [selectedCountry, setSelectedCountry] = useState<Country>(POPULAR_COUNTRIES[0]); // Default India (+91)
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Bot Verification (Turnstile / reCAPTCHA v3)
  const [botVerified, setBotVerified] = useState(false);
  const [botCheckError, setBotCheckError] = useState(false);

  // Password submission validation state
  const [passwordComplexityError, setPasswordComplexityError] = useState(false);
  const [shouldShakePassword, setShouldShakePassword] = useState(false);

  // Context-Aware Overlays
  const [overlayError, setOverlayError] = useState<{
    type: 'not_found' | 'invalid_password' | 'general';
    title: string;
    message: string;
    redirectCountdown?: number;
  } | null>(null);

  // OTP Verification Stage State
  const [otpTargetIdentity, setOtpTargetIdentity] = useState('');
  const [otpTargetType, setOtpTargetType] = useState<'email' | 'phone'>('email');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(45);

  // Forgot Password Sub-Workflow
  const [forgotStage, setForgotStage] = useState<ForgotStage>('identify');
  const [forgotMethod, setForgotMethod] = useState<'email' | 'phone'>('email');
  const [forgotCountry, setForgotCountry] = useState<Country>(POPULAR_COUNTRIES[0]);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotSuccessNotice, setForgotSuccessNotice] = useState('');

  // General loading & error
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Timers
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Resend OTP countdown
  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0 && (viewMode === 'otp_verify' || forgotStage === 'verify')) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer, viewMode, forgotStage]);

  // Context-aware auto-redirect countdown when account does not exist
  useEffect(() => {
    if (overlayError && overlayError.type === 'not_found') {
      let secondsLeft = 3;
      setOverlayError((prev) => prev ? { ...prev, redirectCountdown: secondsLeft } : null);

      countdownIntervalRef.current = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          handleJumpToCreateAccount();
        } else {
          setOverlayError((prev) => prev ? { ...prev, redirectCountdown: secondsLeft } : null);
        }
      }, 1000);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [overlayError?.type]);

  // Normalize Phone Input
  const getNormalizedPhone = (rawDigits: string, country: Country): string => {
    // Strip non-digits
    const cleanDigits = rawDigits.replace(/[^0-9]/g, '');
    // Ensure standard 10-digit parsing for the subscriber number
    const trimmedDigits = cleanDigits.slice(-10);
    return `${country.dialCode}${trimmedDigits}`;
  };

  // Get current normalized identity based on method
  const getCurrentIdentity = (): { identity: string; type: 'email' | 'phone'; isValid: boolean; error?: string } => {
    if (method === 'email') {
      const email = emailInput.trim().toLowerCase();
      const rfcEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) return { identity: '', type: 'email', isValid: false, error: 'Please enter an email address.' };
      if (!rfcEmailRegex.test(email)) {
        return { identity: '', type: 'email', isValid: false, error: 'Please enter a valid email format (e.g. name@domain.com).' };
      }
      return { identity: email, type: 'email', isValid: true };
    } else {
      const raw = phoneInput.replace(/[^0-9]/g, '');
      if (raw.length < 10) {
        return { identity: '', type: 'phone', isValid: false, error: 'Please enter a valid 10-digit mobile number.' };
      }
      const normalized = getNormalizedPhone(phoneInput, selectedCountry);
      return { identity: normalized, type: 'phone', isValid: true };
    }
  };

  // Switch to Sign Up and prefill identity
  const handleJumpToCreateAccount = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setOverlayError(null);
    setFormError('');
    setPasswordComplexityError(false);
    setViewMode('signup');
  };

  // Trigger shake animation for password failure
  const triggerPasswordShake = (message: string) => {
    setPasswordComplexityError(true);
    setShouldShakePassword(true);
    setFormError(message);
    setTimeout(() => {
      setShouldShakePassword(false);
    }, 600);
  };

  // 1. Google OAuth
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setFormError('');
    setOverlayError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setFormError(err.message || 'Google sign-in was interrupted. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Sign In Submission
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setOverlayError(null);

    const identityCheck = getCurrentIdentity();
    if (!identityCheck.isValid) {
      setFormError(identityCheck.error || 'Invalid identity provided.');
      return;
    }

    if (!password) {
      setFormError('Please enter your account password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginWithCredentials(identityCheck.identity, password);

      if (!result.success) {
        if (result.errorReason === 'not_found') {
          // Context-aware overlay: Account does not exist, redirecting to create new account
          setOverlayError({
            type: 'not_found',
            title: 'Account Not Found',
            message: 'Account does not exist. Redirecting you to create a new account...',
            redirectCountdown: 3,
          });
        } else if (result.errorReason === 'invalid_password') {
          // Context-aware overlay: Invalid Credentials
          setOverlayError({
            type: 'invalid_password',
            title: 'Authentication Failed',
            message: 'Invalid Credentials. Please double-check your password.',
          });
        } else {
          setFormError(result.message || 'Sign in failed.');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Sign Up Submission (Initiate OTP & Bot Verification)
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setOverlayError(null);
    setPasswordComplexityError(false);

    // Validate Full Name
    if (!fullName.trim() || fullName.trim().length < 2) {
      setFormError('Please enter your full name (minimum 2 characters).');
      return;
    }

    // Validate Identity
    const identityCheck = getCurrentIdentity();
    if (!identityCheck.isValid) {
      setFormError(identityCheck.error || 'Invalid identity format.');
      return;
    }

    // Validate Password Complexity Rule (Section 5)
    if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
      triggerPasswordShake(
        'Password must be at least 8 characters long and contain a mix of letters, numbers, and special characters (e.g., !@#$).'
      );
      return;
    }

    // Validate Confirm Password
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify both fields.');
      return;
    }

    // Validate Bot Protection (Turnstile / reCAPTCHA)
    if (!botVerified) {
      setBotCheckError(true);
      setFormError('Please complete the bot security verification to continue.');
      setTimeout(() => setBotCheckError(false), 2000);
      return;
    }

    setIsLoading(true);
    try {
      // Check if identity already has an account
      const existingAccount = await findAccountByIdentity(identityCheck.identity);
      if (existingAccount) {
        setFormError('An account with this email or mobile number already exists. Please Sign In.');
        setIsLoading(false);
        return;
      }

      // Dispatch 6-digit OTP verification code
      const code = await sendVerificationOtp(identityCheck.identity, identityCheck.type);
      setGeneratedOtp(code);
      setOtpTargetIdentity(identityCheck.identity);
      setOtpTargetType(identityCheck.type);
      setResendTimer(45);
      setEnteredOtp('');
      setViewMode('otp_verify');
    } catch (err: any) {
      setFormError(err.message || 'Could not initiate registration verification.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Verify OTP and Complete Registration
  const handleCompleteRegistrationOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (enteredOtp.trim().length < 6) {
      setFormError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (enteredOtp.trim() !== generatedOtp.trim()) {
      setFormError('Invalid verification code. Please check the code and try again.');
      return;
    }

    setIsLoading(true);
    try {
      // Register account and login
      await registerWithCredentials({
        fullName: fullName.trim(),
        identity: otpTargetIdentity,
        identityType: otpTargetType,
        password: password,
      });
      // User is now authenticated and modal will close in App.tsx
    } catch (err: any) {
      setFormError(err.message || 'Registration failed during account provision.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP in registration
  const handleResendRegistrationOtp = async () => {
    if (resendTimer > 0 || isLoading) return;
    setIsLoading(true);
    setFormError('');
    try {
      const code = await sendVerificationOtp(otpTargetIdentity, otpTargetType);
      setGeneratedOtp(code);
      setResendTimer(45);
    } catch (err: any) {
      setFormError('Failed to resend verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Forgot Password: Step 1 (Identify)
  const handleForgotIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    let targetIdentity = '';
    let targetType: 'email' | 'phone' = 'email';

    if (forgotMethod === 'email') {
      targetIdentity = forgotEmail.trim().toLowerCase();
      if (!targetIdentity || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetIdentity)) {
        setFormError('Please enter a valid email address.');
        return;
      }
      targetType = 'email';
    } else {
      const digits = forgotPhone.replace(/[^0-9]/g, '');
      if (digits.length < 10) {
        setFormError('Please enter a valid 10-digit mobile number.');
        return;
      }
      targetIdentity = getNormalizedPhone(forgotPhone, forgotCountry);
      targetType = 'phone';
    }

    setIsLoading(true);
    try {
      const account = await findAccountByIdentity(targetIdentity);
      if (!account) {
        setFormError('No registered account was found with that identity.');
        setIsLoading(false);
        return;
      }

      // Generate & send OTP
      const code = await sendVerificationOtp(targetIdentity, targetType);
      setGeneratedOtp(code);
      setOtpTargetIdentity(targetIdentity);
      setOtpTargetType(targetType);
      setEnteredOtp('');
      setResendTimer(45);
      setForgotStage('verify');
    } catch (err: any) {
      setFormError('Failed to dispatch recovery code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password: Step 2 (Verify OTP)
  const handleForgotVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (enteredOtp.trim().length < 6) {
      setFormError('Please enter the complete 6-digit recovery code.');
      return;
    }
    if (enteredOtp.trim() !== generatedOtp.trim()) {
      setFormError('Invalid recovery code. Please check and try again.');
      return;
    }
    setForgotStage('reset');
  };

  // Forgot Password: Step 3 (Reset Password)
  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!PASSWORD_COMPLEXITY_REGEX.test(forgotNewPassword)) {
      triggerPasswordShake(
        'Password must be at least 8 characters long and contain a mix of letters, numbers, and special characters (e.g., !@#$).'
      );
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setFormError('New passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);
    try {
      const ok = await resetUserPassword(otpTargetIdentity, forgotNewPassword);
      if (ok) {
        setForgotSuccessNotice('Password reset successfully! You can now sign in with your new password.');
        // Route back to sign in
        setTimeout(() => {
          setViewMode('signin');
          setPassword('');
          setConfirmPassword('');
          setForgotSuccessNotice('');
          if (otpTargetType === 'email') {
            setMethod('email');
            setEmailInput(otpTargetIdentity);
          } else {
            setMethod('phone');
            setPhoneInput(otpTargetIdentity.slice(-10));
          }
        }, 1800);
      } else {
        setFormError('Could not update password. Please try again.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error updating password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 dark:bg-black/90 backdrop-blur-md overflow-y-auto"
    >
      {/* Ambient background glow orbs */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphism Card */}
      <div 
        id="auth-gateway-container"
        className="relative w-full max-w-lg bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-2xl shadow-indigo-950/20 dark:shadow-indigo-950/50 overflow-hidden p-6 sm:p-8 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200"
      >
        {/* Subtle top rainbow accent border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/25 mb-3">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Zap className="w-6 h-6 text-indigo-600 dark:text-indigo-400 fill-indigo-600/20" />
            </div>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Sub<span className="text-indigo-600 dark:text-indigo-400">Zap</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs">
            Zero-knowledge encrypted cloud subscription management
          </p>
        </div>

        {/* Global Error Banner */}
        {formError && (
          <div className="mb-4 flex items-start gap-2.5 p-3 text-xs text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/70 rounded-xl animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{formError}</p>
            </div>
            <button 
              type="button" 
              onClick={() => setFormError('')} 
              className="text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Forgot Success Notice */}
        {forgotSuccessNotice && (
          <div className="mb-4 flex items-center gap-2 p-3 text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{forgotSuccessNotice}</span>
          </div>
        )}

        {/* Context-Aware Overlay Pop-up (Section 3 Requirement) */}
        {overlayError && (
          <div 
            id="auth-context-overlay"
            className="mb-5 p-4 rounded-2xl border shadow-lg animate-in zoom-in-95 duration-200 relative overflow-hidden"
            style={{
              backgroundColor: overlayError.type === 'not_found' ? 'rgba(238, 242, 255, 0.95)' : 'rgba(254, 242, 242, 0.95)',
              borderColor: overlayError.type === 'not_found' ? '#818cf8' : '#f87171',
            }}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl shrink-0 ${overlayError.type === 'not_found' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200'}`}>
                {overlayError.type === 'not_found' ? <UserIcon className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <h3 className={`text-sm font-bold ${overlayError.type === 'not_found' ? 'text-indigo-950 dark:text-indigo-100' : 'text-rose-950 dark:text-rose-100'}`}>
                  {overlayError.title}
                </h3>
                <p className={`text-xs mt-1 ${overlayError.type === 'not_found' ? 'text-indigo-900 dark:text-indigo-200' : 'text-rose-900 dark:text-rose-200'}`}>
                  {overlayError.message}
                </p>

                {overlayError.type === 'not_found' && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                      Redirecting in {overlayError.redirectCountdown ?? 3}s...
                    </span>
                    <button
                      type="button"
                      onClick={handleJumpToCreateAccount}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Create Account Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOverlayError(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: SIGN IN */}
        {/* ========================================================================= */}
        {viewMode === 'signin' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Nav Switch Tabs: Sign In / Create Account */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-750 text-xs font-semibold">
              <button
                type="button"
                className="py-2 rounded-lg bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs text-center cursor-default"
              >
                Sign In
              </button>
              <button
                id="tab-switch-signup"
                type="button"
                onClick={() => {
                  setFormError('');
                  setOverlayError(null);
                  setViewMode('signup');
                }}
                className="py-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white text-center transition-colors cursor-pointer"
              >
                Create Account
              </button>
            </div>

            {/* Google OAuth Login Button with Crisp Vector Asset */}
            <button
              id="google-signin-btn"
              type="button"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-100 font-semibold text-sm shadow-xs transition-all hover:border-slate-400 dark:hover:border-slate-600 disabled:opacity-60 cursor-pointer"
            >
              <GoogleIcon className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                Or with Email or Mobile
              </span>
            </div>

            {/* Identity Mode Toggle (Email vs Mobile Phone) */}
            <div className="flex items-center justify-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMethod('email');
                  setFormError('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  method === 'email'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod('phone');
                  setFormError('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  method === 'phone'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Mobile Phone</span>
              </button>
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleSignInSubmit} className="space-y-3.5">
              {/* Identity Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {method === 'email' ? 'Registered Email Address' : 'Registered Mobile Number'}
                </label>

                {method === 'email' ? (
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="signin-email-input"
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                ) : (
                  <div className="flex items-center">
                    <PhoneCountrySelector
                      selectedCountry={selectedCountry}
                      onSelectCountry={setSelectedCountry}
                      disabled={isLoading}
                    />
                    <input
                      id="signin-phone-input"
                      type="tel"
                      required
                      maxLength={12}
                      placeholder="98765 43210"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/[^0-9]/g, ''))}
                      className="flex-1 px-3 py-2.5 rounded-r-xl bg-slate-50 dark:bg-slate-800/80 border-y border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative flex items-center">
                  <KeyRound className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="signin-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Section 4: Stylized "Forgot Password?" hyperlink underneath password input */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">Example: Secure#2026</span>
                  <button
                    id="forgot-password-link"
                    type="button"
                    onClick={() => {
                      setFormError('');
                      setOverlayError(null);
                      setForgotStage('identify');
                      if (method === 'email') {
                        setForgotMethod('email');
                        setForgotEmail(emailInput);
                      } else {
                        setForgotMethod('phone');
                        setForgotPhone(phoneInput);
                        setForgotCountry(selectedCountry);
                      }
                      setViewMode('forgot_password');
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              {/* Submit Sign In Button */}
              <button
                id="signin-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Prominent Call to Action for New Users */}
            <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              <span>New to SubZap? </span>
              <button
                id="create-account-prominent-link"
                type="button"
                onClick={() => {
                  setFormError('');
                  setOverlayError(null);
                  setViewMode('signup');
                }}
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: EXPANDED SIGN UP & REGISTRATION */}
        {/* ========================================================================= */}
        {viewMode === 'signup' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Nav Switch Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-750 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setFormError('');
                  setOverlayError(null);
                  setViewMode('signin');
                }}
                className="py-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white text-center transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                className="py-2 rounded-lg bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs text-center cursor-default"
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
              {/* Field 1: Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <UserIcon className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="signup-name-input"
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Field 2: Identity (Email vs Phone) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Identity ({method === 'email' ? 'Email Address' : 'Mobile Number'})
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setMethod('email')}
                      className={`hover:underline cursor-pointer ${method === 'email' ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
                    >
                      Use Email
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => setMethod('phone')}
                      className={`hover:underline cursor-pointer ${method === 'phone' ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
                    >
                      Use Mobile
                    </button>
                  </div>
                </div>

                {method === 'email' ? (
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="signup-email-input"
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                ) : (
                  <div className="flex items-center">
                    <PhoneCountrySelector
                      selectedCountry={selectedCountry}
                      onSelectCountry={setSelectedCountry}
                      disabled={isLoading}
                    />
                    <input
                      id="signup-phone-input"
                      type="tel"
                      required
                      maxLength={12}
                      placeholder="98765 43210"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/[^0-9]/g, ''))}
                      className="flex-1 px-3 py-2 rounded-r-xl bg-slate-50 dark:bg-slate-800/80 border-y border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* Field 3: Secure Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Create Password
                </label>
                <div className={`relative flex items-center ${shouldShakePassword ? 'animate-shake' : ''}`}>
                  <KeyRound className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="signup-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Create strong password (e.g. Secure#2026)"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordComplexityError) setPasswordComplexityError(false);
                    }}
                    className={`w-full pl-9 pr-10 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 transition-colors ${
                      passwordComplexityError
                        ? 'border-rose-400 ring-1 ring-rose-400'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Section 5: Real-time Live Validation and Strength Bar */}
                <PasswordRequirementsBar password={password} showDetails={true} />
              </div>

              {/* Field 4: Confirm Password with instant match indicator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Confirm Password
                  </label>
                  {confirmPassword.length > 0 && (
                    <span
                      className={`text-[11px] font-semibold flex items-center gap-1 ${
                        password === confirmPassword
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {password === confirmPassword ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Passwords match</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" />
                          <span>Passwords do not match</span>
                        </>
                      )}
                    </span>
                  )}
                </div>

                <div className="relative flex items-center">
                  <KeyRound className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="signup-confirm-password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Section 2: Turnstile / reCAPTCHA Bot Protection Widget */}
              <div>
                <BotVerificationWidget
                  isVerified={botVerified}
                  onVerify={() => {
                    setBotVerified(true);
                    setBotCheckError(false);
                  }}
                  hasError={botCheckError}
                />
              </div>

              {/* Submit Registration Button */}
              <button
                id="signup-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer mt-1"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Create Account & Verify</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span>Already registered? </span>
              <button
                type="button"
                onClick={() => {
                  setFormError('');
                  setOverlayError(null);
                  setViewMode('signin');
                }}
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: OTP VERIFICATION ENGINE (Blocks UI state) */}
        {/* ========================================================================= */}
        {viewMode === 'otp_verify' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
              <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Verification Code Sent</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                We dispatched a secure 6-digit verification token to <strong className="text-slate-900 dark:text-white font-mono">{otpTargetIdentity}</strong>.
              </p>

              {/* Fast Testing Hint */}
              <div className="mt-2.5 pt-2 border-t border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Test Helper:</span>
                <button
                  type="button"
                  onClick={() => setEnteredOtp(generatedOtp)}
                  className="font-mono font-bold text-indigo-600 dark:text-indigo-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors cursor-pointer text-xs"
                >
                  Fill Code: {generatedOtp}
                </button>
              </div>
            </div>

            <form onSubmit={handleCompleteRegistrationOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-center">
                  Enter 6-Digit Verification Code
                </label>
                <div className="relative flex items-center justify-center">
                  <input
                    id="otp-digits-input"
                    type="text"
                    maxLength={6}
                    autoFocus
                    placeholder="123456"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full max-w-xs py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono tracking-widest text-2xl text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  />
                </div>
              </div>

              <button
                id="verify-otp-submit-btn"
                type="submit"
                disabled={isLoading || enteredOtp.length < 6}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Complete Registration</span>
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <button
                type="button"
                onClick={() => {
                  setViewMode('signup');
                  setEnteredOtp('');
                  setFormError('');
                }}
                className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Edit Info</span>
              </button>

              <button
                type="button"
                disabled={resendTimer > 0 || isLoading}
                onClick={handleResendRegistrationOtp}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer"
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: SELF-SERVICE FORGOT PASSWORD RECOVERY LIFECYCLE */}
        {/* ========================================================================= */}
        {viewMode === 'forgot_password' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header / Back */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setViewMode('signin');
                  setFormError('');
                  setOverlayError(null);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>

              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Step {forgotStage === 'identify' ? '1/3: Identify' : forgotStage === 'verify' ? '2/3: Verify' : '3/3: Reset'}
              </span>
            </div>

            {/* STAGE 1: IDENTIFY */}
            {forgotStage === 'identify' && (
              <form onSubmit={handleForgotIdentify} className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Reset Account Password
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Enter your registered email address or phone number to receive a secure recovery code.
                  </p>
                </div>

                {/* Identity Mode Toggle */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setForgotMethod('email')}
                    className={`py-1.5 font-semibold rounded-lg transition-colors ${
                      forgotMethod === 'email'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Email Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotMethod('phone')}
                    className={`py-1.5 font-semibold rounded-lg transition-colors ${
                      forgotMethod === 'phone'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Mobile Phone
                  </button>
                </div>

                {forgotMethod === 'email' ? (
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="forgot-email-input"
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center">
                    <PhoneCountrySelector
                      selectedCountry={forgotCountry}
                      onSelectCountry={setForgotCountry}
                      disabled={isLoading}
                    />
                    <input
                      id="forgot-phone-input"
                      type="tel"
                      required
                      maxLength={12}
                      placeholder="98765 43210"
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      className="flex-1 px-3 py-2.5 rounded-r-xl bg-slate-50 dark:bg-slate-800/80 border-y border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <button
                  id="forgot-send-otp-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><span>Send Recovery Code</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            )}

            {/* STAGE 2: VERIFY */}
            {forgotStage === 'verify' && (
              <form onSubmit={handleForgotVerifyOtp} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    We sent a 6-digit recovery code to <strong className="text-slate-900 dark:text-white font-mono">{otpTargetIdentity}</strong>.
                  </p>
                  <div className="mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Recovery Code:</span>
                    <button
                      type="button"
                      onClick={() => setEnteredOtp(generatedOtp)}
                      className="font-mono font-bold text-indigo-600 dark:text-indigo-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                    >
                      Fill: {generatedOtp}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 text-center">
                    Enter 6-Digit Code
                  </label>
                  <input
                    id="forgot-otp-input"
                    type="text"
                    maxLength={6}
                    autoFocus
                    placeholder="123456"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full max-w-xs mx-auto block py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono tracking-widest text-xl text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  id="forgot-verify-code-btn"
                  type="submit"
                  disabled={isLoading || enteredOtp.length < 6}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span>Verify Code & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => setForgotStage('identify')}
                    className="hover:underline cursor-pointer"
                  >
                    ← Change Identity
                  </button>
                  <button
                    type="button"
                    disabled={resendTimer > 0}
                    onClick={() => handleForgotIdentify({ preventDefault: () => {} } as any)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline disabled:text-slate-400 cursor-pointer"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            )}

            {/* STAGE 3: RESET PASSWORD */}
            {forgotStage === 'reset' && (
              <form onSubmit={handleForgotResetPassword} className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Create New Password
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Choose a strong, complex password for your account.
                  </p>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <div className={`relative flex items-center ${shouldShakePassword ? 'animate-shake' : ''}`}>
                    <KeyRound className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="forgot-new-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="e.g. Secure#2026"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <PasswordRequirementsBar password={forgotNewPassword} showDetails={true} />
                </div>

                {/* Confirm New Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Confirm New Password
                    </label>
                    {forgotConfirmPassword.length > 0 && (
                      <span className={`text-[11px] font-semibold ${forgotNewPassword === forgotConfirmPassword ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {forgotNewPassword === forgotConfirmPassword ? '✓ Passwords match' : '✕ Do not match'}
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <KeyRound className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="forgot-confirm-password-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter new password"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="forgot-save-new-password-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><span>Save New Password</span><CheckCircle2 className="w-4 h-4" /></>}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Zero-Knowledge Security Badge at footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
          <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>AES-GCM 256-bit Encryption • Zero-Knowledge Defense</span>
        </div>
      </div>
    </div>
  );
};
