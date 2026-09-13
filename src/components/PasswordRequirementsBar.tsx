import React from 'react';
import { Check, X, ShieldAlert, Info } from 'lucide-react';

export const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+=\[{\]};:<>|./?,-]).{8,}$/;

export function checkPasswordStrength(password: string) {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+=\[{\]};:<>|./?,-]/.test(password);

  const rulesPassed = [hasMinLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  const isValid = PASSWORD_COMPLEXITY_REGEX.test(password);

  let label: 'Too Weak' | 'Moderate' | 'Strong' | 'Very Strong' = 'Too Weak';
  let colorClass = 'bg-rose-500';
  let widthPercent = 25;

  if (rulesPassed === 0) {
    widthPercent = 0;
    label = 'Too Weak';
  } else if (rulesPassed <= 2) {
    widthPercent = 35;
    label = 'Too Weak';
    colorClass = 'bg-rose-500';
  } else if (rulesPassed === 3) {
    widthPercent = 70;
    label = 'Moderate';
    colorClass = 'bg-amber-500';
  } else {
    widthPercent = 100;
    label = password.length >= 12 ? 'Very Strong' : 'Strong';
    colorClass = 'bg-emerald-500';
  }

  return {
    hasMinLength,
    hasLetter,
    hasNumber,
    hasSpecial,
    rulesPassed,
    isValid,
    label,
    colorClass,
    widthPercent,
  };
}

interface PasswordRequirementsBarProps {
  password: string;
  showDetails?: boolean;
}

export const PasswordRequirementsBar: React.FC<PasswordRequirementsBarProps> = ({
  password,
  showDetails = true,
}) => {
  const stats = checkPasswordStrength(password);

  if (!password && !showDetails) return null;

  return (
    <div className="space-y-2 pt-1 text-xs">
      {/* Strength meter bar */}
      {password.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Password Strength:</span>
            <span
              className={`font-semibold ${
                stats.rulesPassed >= 4
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : stats.rulesPassed === 3
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {stats.label}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${stats.colorClass}`}
              style={{ width: `${stats.widthPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Rules checklist */}
      {showDetails && (
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750 text-[11px] space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <div className={`flex items-center gap-1.5 ${stats.hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
              {stats.hasMinLength ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
              <span>8+ characters</span>
            </div>

            <div className={`flex items-center gap-1.5 ${stats.hasLetter ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
              {stats.hasLetter ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
              <span>Letters (a-z, A-Z)</span>
            </div>

            <div className={`flex items-center gap-1.5 ${stats.hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
              {stats.hasNumber ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
              <span>At least 1 digit (0-9)</span>
            </div>

            <div className={`flex items-center gap-1.5 ${stats.hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
              {stats.hasSpecial ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
              <span>Special symbol (!@#$)</span>
            </div>
          </div>

          <div className="flex items-center gap-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <Info className="w-3 h-3 text-indigo-500 shrink-0" />
            <span>Example: <strong className="text-slate-700 dark:text-slate-300">Secure#2026</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
