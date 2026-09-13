import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface Country {
  name: string;
  dialCode: string;
  code: string;
  flag: string;
}

export const POPULAR_COUNTRIES: Country[] = [
  { name: 'India', dialCode: '+91', code: 'IN', flag: '🇮🇳' },
  { name: 'United States', dialCode: '+1', code: 'US', flag: '🇺🇸' },
  { name: 'United Kingdom', dialCode: '+44', code: 'GB', flag: '🇬🇧' },
  { name: 'Canada', dialCode: '+1', code: 'CA', flag: '🇨🇦' },
  { name: 'United Arab Emirates', dialCode: '+971', code: 'AE', flag: '🇦🇪' },
  { name: 'Singapore', dialCode: '+65', code: 'SG', flag: '🇸🇬' },
  { name: 'Australia', dialCode: '+61', code: 'AU', flag: '🇦🇺' },
  { name: 'Germany', dialCode: '+49', code: 'DE', flag: '🇩🇪' },
  { name: 'France', dialCode: '+33', code: 'FR', flag: '🇫🇷' },
  { name: 'Saudi Arabia', dialCode: '+966', code: 'SA', flag: '🇸🇦' },
  { name: 'Qatar', dialCode: '+974', code: 'QA', flag: '🇶🇦' },
  { name: 'Japan', dialCode: '+81', code: 'JP', flag: '🇯🇵' },
  { name: 'Malaysia', dialCode: '+60', code: 'MY', flag: '🇲🇾' },
  { name: 'Indonesia', dialCode: '+62', code: 'ID', flag: '🇮🇩' },
  { name: 'Philippines', dialCode: '+63', code: 'PH', flag: '🇵🇭' },
  { name: 'Netherlands', dialCode: '+31', code: 'NL', flag: '🇳🇱' },
  { name: 'Switzerland', dialCode: '+41', code: 'CH', flag: '🇨🇭' },
  { name: 'South Africa', dialCode: '+27', code: 'ZA', flag: '🇿🇦' },
  { name: 'New Zealand', dialCode: '+64', code: 'NZ', flag: '🇳🇿' },
  { name: 'Brazil', dialCode: '+55', code: 'BR', flag: '🇧🇷' },
  { name: 'Mexico', dialCode: '+52', code: 'MX', flag: '🇲🇽' },
];

interface PhoneCountrySelectorProps {
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
  disabled?: boolean;
}

export const PhoneCountrySelector: React.FC<PhoneCountrySelectorProps> = ({
  selectedCountry,
  onSelectCountry,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredCountries = POPULAR_COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.dialCode.includes(searchQuery) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        id="phone-country-dropdown-btn"
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2.5 rounded-l-xl bg-slate-100 dark:bg-slate-800 border-y border-l border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-medium text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50"
        title={`Selected: ${selectedCountry.name} (${selectedCountry.dialCode})`}
      >
        <span className="text-base select-none leading-none">{selectedCountry.flag}</span>
        <span className="font-mono text-xs font-semibold">{selectedCountry.dialCode}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          id="phone-country-dropdown-list"
          className="absolute left-0 top-full mt-1.5 z-50 w-64 max-h-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Search bar inside dropdown */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search country or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-56 p-1 space-y-0.5">
            {filteredCountries.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">No country found</div>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = country.code === selectedCountry.code;
                return (
                  <button
                    key={`${country.code}-${country.dialCode}`}
                    type="button"
                    onClick={() => {
                      onSelectCountry(country);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base select-none">{country.flag}</span>
                      <span className="truncate max-w-[130px]">{country.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-slate-500 dark:text-slate-400">
                      <span>{country.dialCode}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
