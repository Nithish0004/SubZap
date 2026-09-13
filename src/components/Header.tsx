import React, { useState } from 'react';
import { 
  Zap, 
  LayoutDashboard, 
  CreditCard, 
  CalendarDays, 
  Bell, 
  Plus, 
  RotateCcw,
  Sun,
  Moon,
  Globe,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Lock,
  Sparkles,
  Database
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { CurrencyCode } from '../types';
import { BudgetLimitGauge } from './BudgetLimitGauge';

interface HeaderProps {
  currentTab: 'analytics' | 'subscriptions' | 'calendar';
  onTabChange: (tab: 'analytics' | 'subscriptions' | 'calendar') => void;
  onOpenAddModal: () => void;
  onOpenNotifications: () => void;
  onResetData: () => void;
  onOpenDataVault?: () => void;
  unreadAlertsCount: number;
  totalSubsCount: number;
  currentMonthlyBurnINR: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenAddModal,
  onOpenNotifications,
  onResetData,
  onOpenDataVault,
  unreadAlertsCount,
  totalSubsCount,
  currentMonthlyBurnINR,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { activeCurrency, setActiveCurrency } = useCurrency();
  const { user, userProfile, signOut, setNeedsOnboarding } = useAuth();

  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const currencies: { code: CurrencyCode; label: string }[] = [
    { code: 'INR', label: '₹ INR (Base)' },
    { code: 'USD', label: '$ USD' },
    { code: 'EUR', label: '€ EUR' },
    { code: 'GBP', label: '£ GBP' },
  ];

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 fill-indigo-600/20" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                  Sub<span className="text-indigo-600 dark:text-indigo-400">Zap</span>
                </h1>
                <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                  <Lock className="w-2.5 h-2.5" />
                  AES Encrypted
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Zero-Knowledge Wallet Bleed Defense
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center p-1 bg-slate-100 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              id="tab-analytics-btn"
              onClick={() => onTabChange('analytics')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currentTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Analytics</span>
              <span className="md:hidden">Hub</span>
            </button>

            <button
              id="tab-subscriptions-btn"
              onClick={() => onTabChange('subscriptions')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currentTab === 'subscriptions'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Subs ({totalSubsCount})</span>
              <span className="md:hidden">({totalSubsCount})</span>
            </button>

            <button
              id="tab-calendar-btn"
              onClick={() => onTabChange('calendar')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currentTab === 'calendar'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Calendar</span>
            </button>
          </nav>

          {/* Center/Right: Personalized Budget Limit Gauge */}
          <BudgetLimitGauge currentMonthlyBurnINR={currentMonthlyBurnINR} compact={true} />

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Currency Selector */}
            <div className="hidden lg:flex items-center">
              <div className="relative flex items-center">
                <Globe className="absolute left-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                <select
                  id="header-currency-select"
                  value={activeCurrency}
                  onChange={(e) => setActiveCurrency(e.target.value as CurrencyCode)}
                  aria-label="Select display currency"
                  className="pl-7 pr-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fluid Dual Theme Toggle Switcher */}
            <button
              id="header-theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label={`Toggle theme (currently ${theme})`}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Notification Bell */}
            <button
              id="header-notification-btn"
              onClick={onOpenNotifications}
              title="24h Renewal Alerts & Notifications"
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {/* Cloud Data Vault Inspector CTA */}
            {onOpenDataVault && (
              <button
                id="header-data-vault-btn"
                onClick={onOpenDataVault}
                title="View Stored Project Data, Profile & Cloud Vault"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Project Data</span>
              </button>
            )}

            {/* Reset / Demo seed button */}
            <button
              id="header-reset-btn"
              onClick={onResetData}
              title="Sync / Seed Demo Subscriptions"
              className="hidden sm:flex p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Quick Add CTA */}
            <button
              id="header-add-sub-btn"
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span>
            </button>

            {/* User Account / Profile Menu */}
            <div className="relative">
              <button
                id="header-user-menu-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title="Account Settings & Session"
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-6 h-6 rounded-lg object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[11px]">
                    {userProfile?.fullName ? userProfile.fullName.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                  </div>
                )}
                <span className="hidden md:inline max-w-[100px] truncate text-[11px] font-medium text-slate-800 dark:text-slate-200">
                  {userProfile?.fullName ? userProfile.fullName.split(' ')[0] : (user?.displayName ? user.displayName.split(' ')[0] : 'Profile')}
                </span>
              </button>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div 
                  className="absolute right-0 mt-2 w-64 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 text-xs space-y-2 animate-in fade-in-50 duration-150"
                  onClick={() => setShowUserDropdown(false)}
                >
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {userProfile?.fullName || user?.displayName || 'SubZap Member'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user?.email || user?.phoneNumber || 'Cloud Verified Account'}
                    </p>
                    {userProfile?.financialGoal && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
                        Goal: {userProfile.financialGoal}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      <span>AES-GCM Zero-Knowledge Active</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenDataVault?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer font-medium"
                  >
                    <Database className="w-3.5 h-3.5 text-indigo-500" />
                    <span>View Stored Data & Cloud Vault</span>
                  </button>

                  <button
                    onClick={() => setNeedsOnboarding(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Edit Profile & Financial Goals</span>
                  </button>

                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
