import { CurrencyCode } from '../types';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

// Rates relative to 1 INR (Base currency)
// 1 USD = 86.50 INR -> 1 INR = 1 / 86.50 USD
export const EXCHANGE_RATES_TO_INR: Record<CurrencyCode, number> = {
  INR: 1,
  USD: 86.50,
  EUR: 94.20,
  GBP: 111.00,
};

/**
 * Normalizes any input amount in any supported currency to INR
 */
export function convertToINR(amount: number, fromCurrency: string): number {
  if (!amount || isNaN(amount)) return 0;
  const curr = normalizeCurrencyCode(fromCurrency);
  const rate = EXCHANGE_RATES_TO_INR[curr] || 1;
  return amount * rate;
}

/**
 * Converts an INR amount to another currency
 */
export function convertFromINR(amountINR: number, targetCurrency: CurrencyCode): number {
  if (!amountINR || isNaN(amountINR)) return 0;
  const rate = EXCHANGE_RATES_TO_INR[targetCurrency] || 1;
  return amountINR / rate;
}

/**
 * Map user input currency symbol or code to CurrencyCode
 */
export function normalizeCurrencyCode(curr: string): CurrencyCode {
  if (!curr) return 'INR';
  const clean = curr.trim().toUpperCase();
  if (clean === '₹' || clean === 'INR' || clean === 'RS' || clean === 'RUPEES') return 'INR';
  if (clean === '$' || clean === 'USD' || clean === 'US$') return 'USD';
  if (clean === '€' || clean === 'EUR') return 'EUR';
  if (clean === '£' || clean === 'GBP') return 'GBP';
  return 'INR';
}

/**
 * Format currency with appropriate regional formatting:
 * Base INR uses Indian regional grouping (e.g. ₹1,499.00 or ₹1,20,000.00)
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: CurrencyCode = 'INR',
  options?: { showCode?: boolean }
): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  const symbol = CURRENCY_SYMBOLS[currencyCode] || '₹';

  if (currencyCode === 'INR') {
    // Format using Indian numbering system
    const formatted = safeAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return options?.showCode ? `₹${formatted} INR` : `₹${formatted}`;
  }

  const locale = currencyCode === 'EUR' ? 'de-DE' : currencyCode === 'GBP' ? 'en-GB' : 'en-US';
  const formatted = safeAmount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return options?.showCode ? `${symbol}${formatted} ${currencyCode}` : `${symbol}${formatted}`;
}

export interface MultiCurrencyBreakdown {
  inr: string;
  usd: string;
  eur: string;
  gbp: string;
}

/**
 * Calculate multi-currency pricing across all 4 key global currencies
 */
export function getMultiCurrencyBreakdown(amountInINR: number): MultiCurrencyBreakdown {
  return {
    inr: formatCurrencyAmount(amountInINR, 'INR'),
    usd: formatCurrencyAmount(convertFromINR(amountInINR, 'USD'), 'USD'),
    eur: formatCurrencyAmount(convertFromINR(amountInINR, 'EUR'), 'EUR'),
    gbp: formatCurrencyAmount(convertFromINR(amountInINR, 'GBP'), 'GBP'),
  };
}
