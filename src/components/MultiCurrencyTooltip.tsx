import React, { useState, useRef, useEffect } from 'react';
import { Globe, ArrowRightLeft } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface MultiCurrencyTooltipProps {
  amountInINR: number;
  label?: string;
  size?: 'sm' | 'md';
  align?: 'left' | 'right' | 'center';
}

export const MultiCurrencyTooltip: React.FC<MultiCurrencyTooltipProps> = ({
  amountInINR,
  label,
  size = 'md',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { getBreakdown, activeCurrency, formatBaseINR, format } = useCurrency();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const breakdown = getBreakdown(amountInINR);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* Primary Base Display + Toggle button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        title="Click or hover for multi-currency conversion (USD, EUR, GBP)"
        className={`group inline-flex items-center gap-1.5 rounded-lg font-mono tabular-nums transition-all ${
          size === 'sm' ? 'text-xs' : 'text-sm'
        } hover:opacity-90 focus:outline-none`}
      >
        <span className="font-bold text-slate-900 dark:text-slate-100">
          {formatBaseINR(amountInINR)}
        </span>
        {activeCurrency !== 'INR' && (
          <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 px-1 py-0.2 rounded">
            ≈ {format(amountInINR)}
          </span>
        )}
        <span className="p-0.5 rounded text-slate-400 group-hover:text-indigo-500 transition-colors">
          <Globe className="w-3 h-3" />
        </span>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          className={`absolute z-40 top-full mt-1.5 w-60 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/90 shadow-xl text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150 ${alignClasses[align]}`}
          onMouseLeave={() => setIsOpen(false)}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <ArrowRightLeft className="w-3 h-3 text-indigo-500" />
              {label || 'Multi-Currency Value'}
            </span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
              FX Rates
            </span>
          </div>

          <div className="py-2 space-y-1.5 text-xs font-mono tabular-nums">
            {/* Base INR */}
            <div className="flex items-center justify-between py-1 px-1.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 font-bold text-indigo-950 dark:text-indigo-200">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                INR (Base ₹)
              </span>
              <span>{breakdown.inr}</span>
            </div>

            {/* USD */}
            <div className="flex items-center justify-between py-0.5 px-1.5 text-slate-700 dark:text-slate-300">
              <span>USD ($)</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{breakdown.usd}</span>
            </div>

            {/* EUR */}
            <div className="flex items-center justify-between py-0.5 px-1.5 text-slate-700 dark:text-slate-300">
              <span>EUR (€)</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{breakdown.eur}</span>
            </div>

            {/* GBP */}
            <div className="flex items-center justify-between py-0.5 px-1.5 text-slate-700 dark:text-slate-300">
              <span>GBP (£)</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{breakdown.gbp}</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>Base Peg: 1 USD ≈ ₹86.50</span>
            <span>Zero-Latency FX</span>
          </div>
        </div>
      )}
    </div>
  );
};
