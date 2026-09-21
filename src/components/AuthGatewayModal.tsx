import React, { useState, useEffect, useRef } from 'react';
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
import { 
  PasswordRequirementsBar, 
  PASSWORD_COMPLEXITY_REGEX 
} from './PasswordRequirementsBar';
import { ZapBotMascot, MascotMood } from './ZapBotMascot';
import { AuthBackground } from './AuthBackground';

type AuthViewMode = 'signin' | 'signup' | 'verify_email' | 'forgot_password';

interface AuthGatewayModalProps {
  isSuccessTransition?: boolean;
}

export const AuthGatewayModal: React.FC<AuthGatewayModalProps> = ({ 
  isSuccessTransition = false 
}) => {
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

  // Core view mode
  const [viewMode, setViewMode] = useState<AuthViewMode>(() => {
    if (user && !user.emailVerified) return 'verify_email';
    return 'signin';
  });

  // Storytelling sequence states
  // Scene 1: Character enters (0 - 650ms)
  // Scene 2: Character presents the form (650 - 1300ms)
  // Scene 3: Form is ready & idle interactive state (1300ms+)
  const [sceneStep, setSceneStep] = useState<'entering' | 'presenting' | 'interactive'>('entering');
  const [mascotMood, setMascotMood] = useState<MascotMood>('entering');
  const moodResetTimer = useRef<NodeJS.Timeout | null>(null);

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

  // Unverified account notice on Sign In
  const [unverifiedNotice, setUnverifiedNotice] = useState(false);
  const [resendSuccessNotice, setResendSuccessNotice] = useState('');

  // Existing account guidance on signup
  const [existingAccountEmail, setExistingAccountEmail] = useState<string | null>(null);

  // Password validation shaking effect
  const [passwordComplexityError, setPasswordComplexityError] = useState(false);
  const [shouldShakePassword, setShouldShakePassword] = useState(false);

  // Forgot Password Sub-Workflow
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccessNotice, setForgotSuccessNotice] = useState('');

  // General loading & error & action tracking
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<string>('');
  const [formError, setFormError] = useState('');

  // Helper to trigger temporary mascot mood that reverts to idle
  const triggerMascotMood = (mood: MascotMood, durationMs = 2500) => {
    if (isSuccessTransition) return;
    if (moodResetTimer.current) clearTimeout(moodResetTimer.current);
    setMascotMood(mood);
    moodResetTimer.current = setTimeout(() => {
      setMascotMood('idle');
    }, durationMs);
  };

  // Scene 1 -> Scene 2 -> Scene 3 Choreographed entrance on mount
  useEffect(() => {
    // If already in success transition, celebrate immediately
    if (isSuccessTransition) {
      setSceneStep('interactive');
      setMascotMood('celebrating');
      return;
    }

    // Step 1: Character enters into scene
    const timerPresent = setTimeout(() => {
      setSceneStep('presenting');
      setMascotMood('presenting');
    }, 650);

    // Step 2: Form fully unfolds and character enters idle
    const timerInteractive = setTimeout(() => {
      setSceneStep('interactive');
      setMascotMood('idle');
    }, 1300);

    return () => {
      clearTimeout(timerPresent);
      clearTimeout(timerInteractive);
      if (moodResetTimer.current) clearTimeout(moodResetTimer.current);
    };
  }, [isSuccessTransition]);

  // Handle Scene 5: Successful Authentication Celebration
  useEffect(() => {
    if (isSuccessTransition) {
      setMascotMood('celebrating');
    }
  }, [isSuccessTransition]);

  // Mode switcher (Sign In <-> Sign Up with character reaction)
  const switchMode = (newMode: AuthViewMode) => {
    if (newMode === viewMode) return;
    setFormError('');
    setUnverifiedNotice(false);
    setExistingAccountEmail(null);
    setViewMode(newMode);
    triggerMascotMood('switching_mode', 1000);
  };

  // If user is in unverified state, route to verify_email
  useEffect(() => {
    if (user && !user.emailVerified) {
      if (user.email) {
        setVerificationEmail(user.email);
      }
      setViewMode('verify_email');
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

  // Trigger shake animation for password failure with mascot worried reaction
  const triggerPasswordShake = (message: string) => {
    setPasswordComplexityError(true);
    setShouldShakePassword(true);
    setFormError(message);
    triggerMascotMood('worried_error', 2600);
    setTimeout(() => {
      setShouldShakePassword(false);
    }, 600);
  };

  // Google OAuth Login
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setActionType('google');
    setFormError('');
    try {
      await loginWithGoogle();
      // Scene 5 celebration handled by isSuccessTransition or local trigger
      triggerMascotMood('celebrating', 3000);
    } catch (err: any) {
      setFormError(err.message || 'Google sign-in was cancelled or encountered an error.');
      triggerMascotMood('worried_error', 2600);
    } finally {
      setIsSubmitting(false);
      setActionType('');
    }
  };

  // Sign In Submission
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setUnverifiedNotice(false);
    setResendSuccessNotice('');
    setExistingAccountEmail(null);

    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail) {
      setFormError('Please enter your email address.');
      triggerMascotMood('worried_error', 2200);
      return;
    }

    if (!password) {
      setFormError('Please enter your password.');
      triggerMascotMood('worried_error', 2200);
      return;
    }

    setIsSubmitting(true);
    setActionType('signin');
    try {
      const result = await loginWithEmail(trimmedEmail, password);

      if (!result.success) {
        setFormError(result.message || 'Invalid email or password. Please check your credentials or create an account.');
        triggerMascotMood('worried_error', 2600);
        return;
      }

      // Check if email is verified
      if (!result.emailVerified) {
        setVerificationEmail(trimmedEmail);
        setViewMode('verify_email');
        triggerMascotMood('idle', 1000);
        setVerificationNotice({
          type: 'info',
          message: 'Please verify your email to access your SubZap dashboard. A verification link was sent to your inbox.',
        });
        return;
      }

      // Successful verified sign in -> celebrate!
      triggerMascotMood('celebrating', 3000);
    } catch (err: any) {
      setFormError(err.message || 'Authentication error occurred.');
      triggerMascotMood('worried_error', 2600);
    } finally {
      setIsSubmitting(false);
      setActionType('');
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
      triggerMascotMood('worried_error', 2200);
      return;
    }

    // 2. Validate Email format
    const trimmedEmail = emailInput.trim();
    const rfcEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !rfcEmailRegex.test(trimmedEmail)) {
      setFormError('Please enter a valid email address (e.g. name@domain.com).');
      triggerMascotMood('worried_error', 2200);
      return;
    }

    // 3. Validate Password Complexity
    if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
      triggerPasswordShake(
        'Password must be at least 8 characters long and contain letters, numbers, and special characters.'
      );
      return;
    }

    // 4. Validate Confirm Password Match
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify both fields.');
      triggerMascotMood('worried_error', 2400);
      return;
    }

    setIsSubmitting(true);
    setActionType('signup');
    try {
      const res = await signUpWithEmail({
        fullName: fullName.trim(),
        email: trimmedEmail,
        password: password,
      });

      if (!res.success) {
        if (res.code === 'auth/email-already-in-use') {
          setExistingAccountEmail(trimmedEmail);
          setFormError('An account with this email already exists. Please sign in instead.');
        } else {
          setFormError(res.error || 'Could not create account. Please try again.');
        }
        triggerMascotMood('worried_error', 2600);
        return;
      }

      // Transition to real Firebase email verification view
      setVerificationEmail(trimmedEmail);
      setViewMode('verify_email');
      triggerMascotMood('idle', 1200);
      setVerificationNotice({
        type: 'success',
        message: 'Account created! Please check your inbox and click the verification link, then return here and click "I\'ve Verified My Email" below.',
      });
    } catch (err: any) {
      setFormError(err.message || 'Could not complete registration.');
      triggerMascotMood('worried_error', 2600);
    } finally {
      setIsSubmitting(false);
      setActionType('');
    }
  };

  // Check Email Verification (Reload Firebase User)
  const handleCheckVerified = async () => {
    setIsSubmitting(true);
    setActionType('check_verified');
    setVerificationNotice(null);
    try {
      const isVerified = await checkEmailVerified();
      if (isVerified) {
        setVerificationNotice({
          type: 'success',
          message: 'Email verified successfully! Entering SubZap...',
        });
        triggerMascotMood('celebrating', 3000);
      } else {
        setVerificationNotice({
          type: 'error',
          message: 'Your email has not been verified yet. Please check your inbox and click the verification link.',
        });
        triggerMascotMood('worried_error', 2500);
      }
    } catch (err: any) {
      setVerificationNotice({
        type: 'error',
        message: 'Could not verify status. Please try again.',
      });
      triggerMascotMood('worried_error', 2500);
    } finally {
      setIsSubmitting(false);
      setActionType('');
    }
  };

  // Resend Verification Email
  const handleResendVerification = async () => {
    if (resendTimer > 0 || isSubmitting) return;
    setIsSubmitting(true);
    setActionType('resend_email');
    setVerificationNotice(null);
    setResendSuccessNotice('');
    try {
      const res = await resendVerificationEmail();
      if (res.success) {
        setResendTimer(45);
        const msg = 'Verification email sent! Please check your inbox and spam folder.';
        if (viewMode === 'verify_email') {
          setVerificationNotice({
            type: 'success',
            message: msg,
          });
        } else {
          setResendSuccessNotice(msg);
        }
        triggerMascotMood('idle', 1500);
      } else {
        const errorMsg = res.error || 'Failed to resend verification email.';
        if (viewMode === 'verify_email') {
          setVerificationNotice({
            type: 'error',
            message: errorMsg,
          });
        } else {
          setFormError(errorMsg);
        }
        triggerMascotMood('worried_error', 2500);
      }
    } catch (err: any) {
      const errorMsg = 'Failed to resend verification email.';
      if (viewMode === 'verify_email') {
        setVerificationNotice({
          type: 'error',
          message: errorMsg,
        });
      } else {
        setFormError(errorMsg);
      }
      triggerMascotMood('worried_error', 2500);
    } finally {
      setIsSubmitting(false);
      setActionType('');
    }
  };

  // Back to Sign In from Email Verification View
  const handleBackToSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signOut();
      setVerificationNotice(null);
      setFormError('');
      setUnverifiedNotice(false);
      setResendSuccessNotice('');
      switchMode('signin');
    } catch (e) {
      switchMode('signin');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot Password: Send Real Firebase Password Reset Email
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setForgotSuccessNotice('');

    const targetEmail = forgotEmail.trim();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setFormError('Please enter a valid email address.');
      triggerMascotMood('worried_error', 2200);
      return;
    }

    setIsSubmitting(true);
    setActionType('forgot_password');
    try {
      const res = await sendPasswordReset(targetEmail);
      if (res.success) {
        setForgotSuccessNotice(`Password reset link sent to ${targetEmail}. Please check your email inbox to reset your password.`);
        triggerMascotMood('idle', 2000);
      } else {
        setFormError(res.error || 'Failed to send password reset email.');
        triggerMascotMood('worried_error', 2500);
      }
    } catch (err: any) {
      setFormError(err.message || 'Error sending password reset email.');
      triggerMascotMood('worried_error', 2500);
    } finally {
      setIsSubmitting(false);
      setActionType('');
    }
  };

  const isSignUp = viewMode === 'signup';
  const effectiveMascotMood = isSuccessTransition ? 'celebrating' : mascotMood;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden select-none"
    >
      {/* Dynamic Fintech / SaaS Ambient Background */}
      <AuthBackground />

      {/* 
        FIXED ANIMATION STAGE:
        Houses the mascot and the authentication card side-by-side on desktop, 
        maintaining zero jumping, zero resizing, and stationary anchors.
      */}
      <div 
        id="auth-animation-stage"
        className="relative z-10 w-full max-w-[840px] h-[650px] max-h-[94vh] flex items-center justify-center md:justify-between md:gap-6 overflow-hidden"
      >
        {/* 
          DESKTOP CHARACTER STAGE (Visible on md and up)
          Scene 1: Character glides in from left
          Scene 2: Presents and points toward the form
          Scene 3: Idle hovering, breathing & blinking
          Scene 4: Reacts to focus (looking vs privacy shielding) & errors
          Scene 5: Victory celebration pose
        */}
        <div 
          className={`hidden md:flex flex-col items-center justify-center w-[310px] h-full shrink-0 relative transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            sceneStep === 'entering'
              ? '-translate-x-16 opacity-0'
              : 'translate-x-0 opacity-100'
          }`}
        >
          {/* SubZap Brand Title above mascot */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 dark:bg-indigo-400/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-semibold tracking-wide mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Intelligent Protection</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
              Subscription Control
            </h1>
            <p className="text-xs text-slate-300/85 dark:text-slate-400 mt-1 max-w-[250px] mx-auto leading-relaxed">
              Detect sneaky price hikes, cut zombie subscriptions, and keep your hard-earned cash.
            </p>
          </div>

          {/* Animated Mascot ZapBot */}
          <ZapBotMascot 
            mood={effectiveMascotMood} 
            viewMode={viewMode} 
            isLoading={isSubmitting}
          />
        </div>

        {/* 
          STATIONARY AUTHENTICATION CARD CONTAINER 
          Rigid dimensions ensure zero layout shifts, jumping, or repositioning.
          Enters with coordinated presentation in Scene 2, and exits smoothly on Scene 5.
        */}
        <div 
          id="auth-gateway-container"
          className={`relative w-full max-w-[440px] sm:max-w-[460px] h-[640px] sm:h-[650px] max-h-[94vh] flex flex-col bg-slate-900/80 backdrop-blur-2xl border border-slate-700/60 rounded-2xl sm:rounded-3xl shadow-[0_24px_60px_-15px_rgba(0,0,0,0.7),0_0_40px_rgba(99,102,241,0.12)] p-5 sm:p-7 text-slate-100 overflow-hidden transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            sceneStep === 'entering'
              ? 'opacity-0 translate-x-10 scale-[0.96] pointer-events-none'
              : isSuccessTransition
              ? 'opacity-0 -translate-y-4 scale-[0.97] pointer-events-none'
              : 'opacity-100 translate-x-0 scale-100 pointer-events-auto'
          }`}
        >
          {/* Top gradient accent line & subtle inner specular glow */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-500 opacity-90" />
          <div className="absolute top-0 left-1/4 right-1/4 h-8 bg-indigo-500/10 blur-xl pointer-events-none" />

          {/* Clean Header: SubZap Brand */}
          <div className="flex flex-col items-center text-center shrink-0 mb-3">
            {/* Mobile Mascot: Intelligently rendered compactly above the tabs for small devices */}
            <div className="md:hidden mb-1 flex justify-center">
              <ZapBotMascot 
                mood={effectiveMascotMood} 
                viewMode={viewMode} 
                isCompact={true} 
                isLoading={isSubmitting}
              />
            </div>

            <div className="hidden md:flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400 p-[1.5px] shadow-md shadow-indigo-500/30">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Zap className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xl font-black tracking-tight text-white">
                  Sub<span className="bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">Zap</span>
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Vault
                </span>
              </div>
            </div>
          </div>

          {/* Animated Sliding Pill Tab Selector (Active in Sign In / Create Account modes) */}
          <div className="relative grid grid-cols-2 p-1 bg-slate-950/60 rounded-xl border border-slate-800/90 text-xs font-semibold shrink-0 mb-3 shadow-inner">
            {/* Sliding pill indicator */}
            <div
              className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-indigo-600/90 shadow-md shadow-indigo-900/50 border border-indigo-400/30 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none pointer-events-none ${
                isSignUp ? 'translate-x-[calc(100%+8px)]' : 'translate-x-0'
              }`}
            />
            <button
              id="tab-switch-signin"
              type="button"
              onClick={() => switchMode('signin')}
              className={`relative z-10 py-2 rounded-lg text-center transition-colors cursor-pointer font-bold ${
                !isSignUp
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-switch-signup"
              type="button"
              onClick={() => switchMode('signup')}
              className={`relative z-10 py-2 rounded-lg text-center transition-colors cursor-pointer font-bold ${
                isSignUp
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Global Error Banner */}
          {formError && (
            <div className="shrink-0 mb-2.5 p-2.5 text-xs text-rose-200 bg-rose-950/60 border border-rose-800/80 rounded-xl space-y-1.5 transition-all shadow-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1 font-medium leading-tight">{formError}</div>
                <button 
                  type="button" 
                  onClick={() => {
                    setFormError('');
                    setExistingAccountEmail(null);
                    setUnverifiedNotice(false);
                    triggerMascotMood('idle', 500);
                  }} 
                  className="text-rose-400 hover:text-rose-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Unverified account notice */}
              {unverifiedNotice && (
                <div className="pt-1.5 border-t border-rose-900/60 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting || resendTimer > 0}
                    onClick={handleResendVerification}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-60 shadow-sm"
                  >
                    {isSubmitting && actionType === 'resend_email' ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        <span>{resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Email'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormError('');
                      setViewMode('verify_email');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 border border-rose-800/70 text-rose-300 font-semibold text-xs cursor-pointer hover:bg-slate-700 transition-colors"
                  >
                    Go to Verification
                  </button>
                </div>
              )}

              {/* Existing account prompt */}
              {existingAccountEmail && viewMode === 'signup' && (
                <div className="pt-1.5 border-t border-rose-900/60 flex items-center justify-between">
                  <span className="text-rose-300 text-[11px]">Already have an account?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailInput(existingAccountEmail);
                      switchMode('signin');
                    }}
                    className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resend success notice */}
          {resendSuccessNotice && viewMode !== 'verify_email' && (
            <div className="shrink-0 mb-2.5 p-2.5 rounded-xl text-xs bg-emerald-950/60 text-emerald-200 border border-emerald-800/80 flex items-start gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div className="flex-1 font-medium leading-tight">{resendSuccessNotice}</div>
              <button
                type="button"
                onClick={() => setResendSuccessNotice('')}
                className="text-emerald-400 hover:text-emerald-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 
            INTERNAL STATIONARY VIEWPORT WITH HORIZONTAL SLIDING CAROUSEL
            Track width is 200%, outer card stays 100% stationary.
          */}
          <div className="relative flex-1 w-full overflow-hidden">
            <div 
              className="flex w-[200%] h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{ 
                transform: isSignUp ? 'translateX(-50%)' : 'translateX(0%)' 
              }}
            >
              {/* PANEL 1: SIGN IN */}
              <div 
                className={`w-1/2 h-full overflow-y-auto pr-2 space-y-3 pb-2 transition-all duration-300 motion-reduce:transition-none ${
                  !isSignUp 
                    ? 'opacity-100 scale-100 pointer-events-auto' 
                    : 'opacity-20 scale-[0.98] pointer-events-none'
                }`}
              >
                {/* Google Sign In Button */}
                <button
                  id="google-signin-btn"
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-750/90 border border-slate-700/80 hover:border-slate-600 text-slate-100 font-semibold text-sm shadow-xs transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.06)] disabled:opacity-60 cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                >
                  <GoogleIcon className="w-5 h-5" />
                  <span>Continue with Google</span>
                </button>

                {/* Centered Divider */}
                <div className="w-full my-3 flex items-center justify-center">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="shrink-0 px-3 text-xs font-medium text-slate-400 select-none text-center">
                    Or with Email
                  </span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                {/* Sign In Form */}
                <form onSubmit={handleSignInSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative flex items-center group">
                      <Mail className="absolute left-3 w-4 h-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
                      <input
                        id="signin-email-input"
                        type="email"
                        required
                        placeholder="alex@example.com"
                        value={emailInput}
                        onFocus={() => {
                          if (effectiveMascotMood !== 'celebrating') {
                            setMascotMood('looking_at_input');
                          }
                        }}
                        onBlur={() => {
                          if (effectiveMascotMood !== 'celebrating') {
                            setMascotMood('idle');
                          }
                        }}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/60 border border-slate-750 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-600 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Password
                    </label>
                    <div className="relative flex items-center group">
                      <KeyRound className="absolute left-3 w-4 h-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
                      <input
                        id="signin-password-input"
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter your password"
                        value={password}
                        onFocus={() => {
                          if (effectiveMascotMood !== 'celebrating') {
                            setMascotMood('hiding_password');
                          }
                        }}
                        onBlur={() => {
                          if (effectiveMascotMood !== 'celebrating') {
                            setMascotMood('idle');
                          }
                        }}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-950/60 border border-slate-750 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-600 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-slate-400 hover:text-slate-200 cursor-pointer p-1 transition-colors"
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
                          setUnverifiedNotice(false);
                          setForgotSuccessNotice('');
                          setForgotEmail(emailInput);
                          setViewMode('forgot_password');
                          triggerMascotMood('idle', 1000);
                        }}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer transition-colors"
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
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer mt-1 hover:shadow-indigo-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
                  >
                    {isSubmitting && actionType === 'signin' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Call to action */}
                <div className="pt-2 text-center text-xs text-slate-400">
                  <span>New to SubZap? </span>
                  <button
                    id="create-account-prominent-link"
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer transition-colors"
                  >
                    Create Account
                  </button>
                </div>
              </div>

              {/* PANEL 2: CREATE ACCOUNT */}
              <div 
                className={`w-1/2 h-full overflow-y-auto pl-2 space-y-2.5 pb-2 transition-all duration-300 motion-reduce:transition-none ${
                  isSignUp 
                    ? 'opacity-100 scale-100 pointer-events-auto' 
                    : 'opacity-20 scale-[0.98] pointer-events-none'
                }`}
              >
                {/* Google Sign Up Button */}
                <button
                  id="google-signup-btn"
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 py-2 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-750/90 border border-slate-700/80 hover:border-slate-600 text-slate-100 font-semibold text-sm shadow-xs transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.06)] disabled:opacity-60 cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                >
                  <GoogleIcon className="w-5 h-5" />
                  <span>Continue with Google</span>
                </button>

                {/* Centered Divider */}
                <div className="w-full my-2 flex items-center justify-center">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="shrink-0 px-3 text-xs font-medium text-slate-400 select-none text-center">
                    Or with Email
                  </span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                <form onSubmit={handleSignUpSubmit} className="space-y-2">
                  {/* Field 1: Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-0.5">
                      Full Name
                    </label>
                    <div className="relative flex items-center group">
                      <UserIcon className="absolute left-3 w-4 h-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
                      <input
                        id="signup-name-input"
                        type="text"
                        required
                        placeholder="e.g. Alex Morgan"
                        value={fullName}
                        onFocus={() => {
                          if (effectiveMascotMood !== 'celebrating') {
                            setMascotMood('looking_at_input');
                          }
                        }}
                        onBlur={() => {
                          if (effectiveMascotMood !== 'celebrating') {
                            setMascotMood('idle');
                          }
                        }}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-750 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-600 transition-all"
                      />
                    </div>
                  </div>

                  {/* Field 2: Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-0.5">
                      Email Address
                    </label>
                    <div className="relative flex items-center group">
                      <Mail className="absolute left-3 w-4 h-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
                      <input
                        id="signup-email-input"
                        type="email"
                        required
                        placeholder="alex@example.com"
                        value={emailInput}
                        onFocus={() => {
                          if (effectiveMascotMood !== 'celebrating') {
                            setMascotMood('looking_at_input');
                          }
                        }}
                        onBlur={() => {
                          if (effectiveMascotMood !== 'celebrating') {
                            setMascotMood('idle');
                          }
                        }}
                        onChange={(e) => {
                          setEmailInput(e.target.value);
                          if (existingAccountEmail) setExistingAccountEmail(null);
                        }}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-750 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-600 transition-all"
                      />
                    </div>
                  </div>

                  {/* Field 3: Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-0.5">
                      Create Password
                    </label>
                    <div className={`relative flex items-center group ${shouldShakePassword ? 'animate-shake' : ''}`}>
                      <KeyRound className="absolute left-3 w-4 h-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
                      <input
                        id="signup-password-input"
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Create strong password"
                        value={password}
                        onFocus={() => {
                          if (effectiveMascotMood !== 'celebrating') {
                            setMascotMood('hiding_password');
                          }
                        }}
                        onBlur={() => {
                          if (effectiveMascotMood !== 'celebrating') {
                            setMascotMood('idle');
                          }
                        }}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordComplexityError) setPasswordComplexityError(false);
                        }}
                        className={`w-full pl-9 pr-10 py-1.5 rounded-xl bg-slate-950/60 border text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${
                          passwordComplexityError
                            ? 'border-rose-400 ring-2 ring-rose-400/30'
                            : 'border-slate-750 focus:border-indigo-500 focus:ring-indigo-500/20 hover:border-slate-600'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-slate-400 hover:text-slate-200 cursor-pointer p-1 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <PasswordRequirementsBar password={password} showDetails={password.length > 0} />
                  </div>

                  {/* Field 4: Confirm Password */}
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Confirm Password
                      </label>
                      {confirmPassword.length > 0 && (
                        <span
                          className={`text-[11px] font-semibold flex items-center gap-1 ${
                            password === confirmPassword
                              ? 'text-emerald-400'
                              : 'text-rose-400'
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

                    <div className="relative flex items-center group">
                      <KeyRound className="absolute left-3 w-4 h-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
                      <input
                        id="signup-confirm-password-input"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onFocus={() => {
                          if (effectiveMascotMood !== 'celebrating') {
                            setMascotMood('hiding_password');
                          }
                        }}
                        onBlur={() => {
                          if (effectiveMascotMood !== 'celebrating') {
                            setMascotMood('idle');
                          }
                        }}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-1.5 rounded-xl bg-slate-950/60 border border-slate-750 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-600 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 text-slate-400 hover:text-slate-200 cursor-pointer p-1 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Registration Button */}
                  <button
                    id="signup-submit-btn"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer mt-1 hover:shadow-indigo-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
                  >
                    {isSubmitting && actionType === 'signup' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="text-center text-xs text-slate-400 pt-1">
                  <span>Already registered? </span>
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </div>

            {/* OVERLAY VIEW: VERIFY EMAIL */}
            {viewMode === 'verify_email' && (
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-20 overflow-y-auto space-y-4 py-2 px-1 transition-opacity animate-in fade-in duration-200">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Verify your email
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                    We've sent a verification link to your email address. Please click the link to activate your SubZap account.
                  </p>
                  <div className="py-2 px-3 rounded-xl bg-slate-950/70 border border-slate-800 font-mono text-xs font-semibold text-indigo-300 text-center break-all">
                    {verificationEmail || user?.email || 'your email'}
                  </div>
                </div>

                {/* Notification alert */}
                {verificationNotice && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                    verificationNotice.type === 'success'
                      ? 'bg-emerald-950/60 text-emerald-200 border border-emerald-800'
                      : verificationNotice.type === 'error'
                      ? 'bg-rose-950/60 text-rose-200 border border-rose-800'
                      : 'bg-indigo-950/60 text-indigo-200 border border-indigo-800'
                  }`}>
                    {verificationNotice.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{verificationNotice.message}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-1">
                  <button
                    id="btn-verified-my-email"
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleCheckVerified}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-60"
                  >
                    {isSubmitting && actionType === 'check_verified' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Checking verification...</span>
                      </>
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
                    className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60 border border-slate-700"
                  >
                    {isSubmitting && actionType === 'resend_email' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending verification email...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Verification Email'}</span>
                      </>
                    )}
                  </button>

                  <button
                    id="btn-back-to-signin"
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleBackToSignIn}
                    className="w-full py-1.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </div>
            )}

            {/* OVERLAY VIEW: FORGOT PASSWORD */}
            {viewMode === 'forgot_password' && (
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-20 overflow-y-auto space-y-4 py-2 px-1 transition-opacity animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      switchMode('signin');
                      setFormError('');
                      setForgotSuccessNotice('');
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">
                    Reset Account Password
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter your registered email address to receive a secure password reset link via Firebase.
                  </p>
                </div>

                {/* Success notice */}
                {forgotSuccessNotice ? (
                  <div className="space-y-3 py-2">
                    <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-200 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{forgotSuccessNotice}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        switchMode('signin');
                        setFormError('');
                        setForgotSuccessNotice('');
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <span>Return to Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Email Address
                      </label>
                      <div className="relative flex items-center group">
                        <Mail className="absolute left-3 w-4 h-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
                        <input
                          id="forgot-email-input"
                          type="email"
                          required
                          placeholder="alex@example.com"
                          value={forgotEmail}
                          onFocus={() => {
                            if (effectiveMascotMood !== 'celebrating') {
                              setMascotMood('looking_at_input');
                            }
                          }}
                          onBlur={() => {
                            if (effectiveMascotMood !== 'celebrating') {
                              setMascotMood('idle');
                            }
                          }}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/60 border border-slate-750 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-600 transition-all"
                        />
                      </div>
                    </div>

                    <button
                      id="forgot-send-reset-btn"
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 active:scale-[0.99]"
                    >
                      {isSubmitting && actionType === 'forgot_password' ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sending reset link...</span>
                        </>
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
      </div>
    </div>
  );
};
