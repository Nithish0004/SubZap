import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Mail, 
  ArrowRight, 
  KeyRound, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  User as UserIcon, 
  ArrowLeft, 
  Check, 
  X,
  Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleIcon } from './GoogleIcon';
import { BotVerificationWidget } from './BotVerificationWidget';
import { 
  PasswordRequirementsBar, 
  PASSWORD_COMPLEXITY_REGEX 
} from './PasswordRequirementsBar';

type AuthViewMode = 'signin' | 'signup' | 'verify_email' | 'forgot_password';

export const AuthGatewayModal: React.FC = () => {
  const { 
    user,
    loginWithGoogle, 
    loginWithEmail, 
    signUpWithEmail, 
    checkEmailVerified,
    resendVerificationEmail,
    sendPasswordReset,
    signOut
  } = useAuth();

  // Core view router
  const [viewMode, setViewMode] = useState<AuthViewMode>('signin');

  // Input fields for Sign In / Sign Up
  const [emailInput, setEmailInput] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email verification screen state
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationNotice, setVerificationNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [resendTimer, setResendTimer] = useState<number>(0);

  // Existing account guidance on signup
  const [existingAccountEmail, setExistingAccountEmail] = useState<string | null>(null);

  // Bot Verification (Turnstile / reCAPTCHA)
  const [botVerified, setBotVerified] = useState(false);
  const [botCheckError, setBotCheckError] = useState(false);

  // Password validation shaking effect
  const [passwordComplexityError, setPasswordComplexityError] = useState(false);
  const [shouldShakePassword, setShouldShakePassword] = useState(false);

  // Forgot Password Sub-Workflow
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccessNotice, setForgotSuccessNotice] = useState('');

  // General loading & error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // If user is already logged in with an unverified email, transition straight to verify_email
  useEffect(() => {
    if (user && !user.emailVerified) {
      setViewMode('verify_email');
      if (user.email) {
        setVerificationEmail(user.email);
      }
    }
  }, [user]);

  // Resend cooldown timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  // Trigger shake animation for password failure
  const triggerPasswordShake = (message: string) => {
    setPasswordComplexityError(true);
    setShouldShakePassword(true);
    setFormError(message);
    setTimeout(() => {
      setShouldShakePassword(false);
    }, 600);
  };

  // Google OAuth
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setFormError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setFormError(err.message || 'Google sign-in was cancelled or encountered an error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sign In Submission
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setExistingAccountEmail(null);

    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail) {
      setFormError('Please enter your registered email address.');
      return;
    }

    if (!password) {
      setFormError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginWithEmail(trimmedEmail, password);

      if (!result.success) {
        setFormError(result.message || 'Invalid credentials. Please double-check your email and password.');
        return;
      }

      // Check if email is verified
      if (!result.emailVerified) {
        setVerificationEmail(trimmedEmail);
        setViewMode('verify_email');
        setVerificationNotice({
          type: 'info',
          message: 'Please verify your email address to enter SubZap.',
        });
      }
      // If verified, user state will update in AuthContext and App.tsx automatically unlocks the dashboard
    } catch (err: any) {
      setFormError(err.message || 'Authentication error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sign Up Submission
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setExistingAccountEmail(null);
    setPasswordComplexityError(false);

    // 1. Validate Full Name
    if (!fullName.trim() || fullName.trim().length < 2) {
      setFormError('Please enter your full name (minimum 2 characters).');
      return;
    }

    // 2. Validate Email
    const trimmedEmail = emailInput.trim();
    const rfcEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !rfcEmailRegex.test(trimmedEmail)) {
      setFormError('Please enter a valid email address (e.g. name@domain.com).');
      return;
    }

    // 3. Validate Password Complexity
    if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
      triggerPasswordShake(
        'Password must be at least 8 characters long and contain a mix of letters, numbers, and special characters.'
      );
      return;
    }

    // 4. Validate Confirm Password
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify both fields.');
      return;
    }

    // 5. Validate Bot Protection
    if (!botVerified) {
      setBotCheckError(true);
      setFormError('Please complete the bot security verification to continue.');
      setTimeout(() => setBotCheckError(false), 2000);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signUpWithEmail({
        fullName: fullName.trim(),
        email: trimmedEmail,
        password: password,
      });

      if (!res.success) {
        if (res.code === 'auth/email-already-in-use') {
          setExistingAccountEmail(trimmedEmail);
          setFormError('An account with this email already exists.');
        } else {
          setFormError(res.error || 'Could not create account. Please try again.');
        }
        return;
      }

      // DO NOT open dashboard immediately. Show the verification screen!
      setVerificationEmail(trimmedEmail);
      setViewMode('verify_email');
      setVerificationNotice(null);
    } catch (err: any) {
      setFormError(err.message || 'Could not complete registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check Email Verification (Reload Firebase User)
  const handleCheckVerified = async () => {
    setIsSubmitting(true);
    setVerificationNotice(null);
    try {
      const isVerified = await checkEmailVerified();
      if (isVerified) {
        // App.tsx will automatically detect user.emailVerified === true and unlock the dashboard
        setVerificationNotice({
          type: 'success',
          message: 'Email verified successfully! Entering SubZap...',
        });
      } else {
        setVerificationNotice({
          type: 'error',
          message: 'Email is not verified yet. Please check your inbox and click the verification link, then click here again.',
        });
      }
    } catch (err: any) {
      setVerificationNotice({
        type: 'error',
        message: 'Could not verify status. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend Verification Email
  const handleResendVerification = async () => {
    if (resendTimer > 0 || isSubmitting) return;
    setIsSubmitting(true);
    setVerificationNotice(null);
    try {
      const res = await resendVerificationEmail();
      if (res.success) {
        setResendTimer(45);
        setVerificationNotice({
          type: 'success',
          message: 'Verification email resent! Please check your inbox and spam folder.',
        });
      } else {
        setVerificationNotice({
          type: 'error',
          message: res.error || 'Failed to resend verification email.',
        });
      }
    } catch (err: any) {
      setVerificationNotice({
        type: 'error',
        message: 'Failed to resend verification email.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot Password: Dispatch Real Firebase Password Reset Email
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setForgotSuccessNotice('');

    const targetEmail = forgotEmail.trim();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendPasswordReset(targetEmail);
      if (res.success) {
        setForgotSuccessNotice(`Password reset link sent to ${targetEmail}. Please check your email inbox to reset your password.`);
      } else {
        setFormError(res.error || 'Failed to send password reset email.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error sending password reset email.');
    } finally {
      setIsSubmitting(false);
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

      {/* Main Container Card */}
      <div 
        id="auth-gateway-container"
        className="relative w-full max-w-lg bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl shadow-2xl shadow-indigo-950/20 dark:shadow-indigo-950/50 overflow-y-auto max-h-[92vh] p-5 sm:p-8 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200 my-auto"
      >
        {/* Subtle top accent border */}
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
        </div>

        {/* Global Error Banner */}
        {formError && (
          <div className="mb-4 flex items-start gap-2.5 p-3 text-xs text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/70 rounded-xl animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{formError}</p>
              {/* Existing Account Prompt guidance */}
              {existingAccountEmail && viewMode === 'signup' && (
                <div className="mt-2 pt-2 border-t border-rose-200 dark:border-rose-900/50 flex items-center justify-between">
                  <span className="text-rose-700 dark:text-rose-300">Would you like to sign in instead?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailInput(existingAccountEmail);
                      setExistingAccountEmail(null);
                      setFormError('');
                      setViewMode('signin');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs"
                  >
                    Sign In with this email
                  </button>
                </div>
              )}
            </div>
            <button 
              type="button" 
              onClick={() => {
                setFormError('');
                setExistingAccountEmail(null);
              }} 
              className="text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
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
                  setExistingAccountEmail(null);
                  setViewMode('signup');
                }}
                className="py-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white text-center transition-colors cursor-pointer"
              >
                Create Account
              </button>
            </div>

            {/* Google OAuth Login Button */}
            <button
              id="google-signin-btn"
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-100 font-semibold text-sm shadow-xs transition-all hover:border-slate-400 dark:hover:border-slate-600 disabled:opacity-60 cursor-pointer"
            >
              <GoogleIcon className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>

            {/* Correctly Centered Divider */}
            <div className="relative my-4 flex items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              <span className="shrink-0 px-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Or continue with email
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleSignInSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Registered Email Address
                </label>
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
              </div>

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

                <div className="flex items-center justify-end pt-1.5">
                  <button
                    id="forgot-password-link"
                    type="button"
                    onClick={() => {
                      setFormError('');
                      setForgotSuccessNotice('');
                      setForgotEmail(emailInput);
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
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer mt-2"
              >
                {isSubmitting ? (
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
                  setExistingAccountEmail(null);
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
        {/* VIEW 2: SIGN UP */}
        {/* ========================================================================= */}
        {viewMode === 'signup' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Nav Switch Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-750 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setFormError('');
                  setExistingAccountEmail(null);
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

            {/* Google OAuth Login Button */}
            <button
              id="google-signup-btn"
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-100 font-semibold text-sm shadow-xs transition-all hover:border-slate-400 dark:hover:border-slate-600 disabled:opacity-60 cursor-pointer"
            >
              <GoogleIcon className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>

            {/* Correctly Centered Divider */}
            <div className="relative my-4 flex items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              <span className="shrink-0 px-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Or continue with email
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
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

              {/* Field 2: Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="signup-email-input"
                    type="email"
                    required
                    placeholder="alex@example.com"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (existingAccountEmail) setExistingAccountEmail(null);
                    }}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Field 3: Password */}
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
                    placeholder="Create strong password"
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

                <PasswordRequirementsBar password={password} showDetails={true} />
              </div>

              {/* Field 4: Confirm Password */}
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

              {/* Bot Protection Widget */}
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
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer mt-1"
              >
                {isSubmitting ? (
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
                  setExistingAccountEmail(null);
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
        {/* VIEW 3: VERIFY YOUR EMAIL */}
        {/* ========================================================================= */}
        {viewMode === 'verify_email' && (
          <div className="space-y-5 animate-in fade-in duration-150 py-2">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                <Mail className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Verify your email
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                We sent a verification link to:
              </p>
              <div className="py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-sm font-semibold text-slate-800 dark:text-slate-200 text-center break-all">
                {verificationEmail || user?.email || 'your email'}
              </div>
            </div>

            {/* Notification alert */}
            {verificationNotice && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                verificationNotice.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                  : verificationNotice.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                  : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800'
              }`}>
                {verificationNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                )}
                <span>{verificationNotice.message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2.5 pt-1">
              <button
                id="btn-verified-my-email"
                type="button"
                disabled={isSubmitting}
                onClick={handleCheckVerified}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>I've Verified My Email</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                id="btn-resend-verification-email"
                type="button"
                disabled={isSubmitting || resendTimer > 0}
                onClick={handleResendVerification}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                <span>{resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Verification Email'}</span>
              </button>
            </div>

            {/* Switch Account */}
            <div className="pt-2 text-center text-xs">
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  setVerificationNotice(null);
                  setFormError('');
                  setViewMode('signin');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:underline cursor-pointer"
              >
                ← Sign in with a different account
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: FORGOT PASSWORD */}
        {/* ========================================================================= */}
        {viewMode === 'forgot_password' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setViewMode('signin');
                  setFormError('');
                  setForgotSuccessNotice('');
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Reset Account Password
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Enter your registered email address to receive a secure password reset link via Firebase.
              </p>
            </div>

            {/* Success notice */}
            {forgotSuccessNotice ? (
              <div className="space-y-4 py-2">
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{forgotSuccessNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('signin');
                    setFormError('');
                    setForgotSuccessNotice('');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Return to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
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
                </div>

                <button
                  id="forgot-send-reset-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send Password Reset Link</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
