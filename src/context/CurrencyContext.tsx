import React, { createContext, useContext, useState, useEffect } from 'react';
import { CurrencyCode } from '../types';
import { 
  CURRENCY_SYMBOLS, 
  convertToINR, 
  convertFromINR, 
  formatCurrencyAmount, 
  getMultiCurrencyBreakdown,
  MultiCurrencyBreakdown,
  EXCHANGE_RATES_TO_INR
} from '../utils/currency';

interface CurrencyContextType {
  activeCurrency: CurrencyCode;
  setActiveCurrency: (curr: CurrencyCode) => void;
  format: (amountInINR: number, currencyCode?: CurrencyCode) => string;
  formatBaseINR: (amountInINR: number) => string;
  getBreakdown: (amountInINR: number) => MultiCurrencyBreakdown;
  rates: Record<CurrencyCode, number>;
  symbols: Record<CurrencyCode, string>;
  convertToBaseINR: (amount: number, fromCurrency: string) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_STORAGE_KEY = 'subzap_active_currency_v1';

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to INR (₹) as requested
  const [activeCurrency, setActiveCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (stored === 'INR' || stored === 'USD' || stored === 'EUR' || stored === 'GBP') {
        return stored;
      }
    } catch {
      // fallback
    }
    return 'INR';
  });

  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, activeCurrency);
    } catch {
      // ignore
    }
  }, [activeCurrency]);

  const setActiveCurrency = (curr: CurrencyCode) => {
    setActiveCurrencyState(curr);
  };

  const format = (amountInINR: number, currencyOverride?: CurrencyCode): string => {
    const target = currencyOverride || activeCurrency;
    const converted = convertFromINR(amountInINR, target);
    return formatCurrencyAmount(converted, target);
  };

  const formatBaseINR = (amountInINR: number): string => {
    return formatCurrencyAmount(amountInINR, 'INR');
  };

  const getBreakdown = (amountInINR: number): MultiCurrencyBreakdown => {
    return getMultiCurrencyBreakdown(amountInINR);
  };

  const convertToBaseINR = (amount: number, fromCurrency: string): number => {
    return convertToINR(amount, fromCurrency);
  };

  return (
    <CurrencyContext.Provider
      value={{
        activeCurrency,
        setActiveCurrency,
        format,
        formatBaseINR,
        getBreakdown,
        rates: EXCHANGE_RATES_TO_INR,
        symbols: CURRENCY_SYMBOLS,
        convertToBaseINR,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
