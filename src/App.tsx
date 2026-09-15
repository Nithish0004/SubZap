import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Subscription } from './types';
import { 
  getStoredSubscriptions, 
  saveStoredSubscriptions, 
  resetToDefaults,
  SEED_SUBSCRIPTIONS 
} from './utils/storage';
import { calculateFinancialMetrics } from './utils/calculations';
import { 
  checkUpcomingRenewalsAndNotify, 
  getNotificationPermission, 
  InAppNotification 
} from './utils/notifications';
import { useAuth } from './context/AuthContext';
import { 
  fetchUserSubscriptionsFromCloud, 
  saveUserSubscriptionToCloud, 
  deleteUserSubscriptionFromCloud, 
  seedInitialSubscriptionsToCloud 
} from './services/subscriptionService';
import { Header } from './components/Header';
import { AnalyticsHub } from './components/AnalyticsHub';
import { SubscriptionManager } from './components/SubscriptionManager';
import { PredictiveCalendar } from './components/PredictiveCalendar';
import { SubscriptionModal } from './components/SubscriptionModal';
import { NotificationModal } from './components/NotificationModal';
import { SimulateCancelBanner } from './components/SimulateCancelBanner';
import { Footer } from './components/Footer';
import { AuthGatewayModal } from './components/AuthGatewayModal';
import { OnboardingModal } from './components/OnboardingModal';
import { AuthLoadingSkeleton } from './components/AuthLoadingSkeleton';
import { DataVaultModal } from './components/DataVaultModal';

export default function App() {
  const { user, userSecretKey, isLoading, needsOnboarding } = useAuth();

  // 1. Core Subscriptions State (Zero-latency cache initialized immediately)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    return getStoredSubscriptions(user?.uid);
  });

  // Active view tab: analytics, subscriptions, calendar
  const [currentTab, setCurrentTab] = useState<'analytics' | 'subscriptions' | 'calendar'>('analytics');

  // Simulation cancellation sandbox
  const [simulatedCancelledIds, setSimulatedCancelledIds] = useState<Set<string>>(new Set());

  // Modal dialog states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isDataVaultOpen, setIsDataVaultOpen] = useState(false);

  // Web Notification & In-app alerts state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [alerts, setAlerts] = useState<InAppNotification[]>([]);

  // 2. Fetch and synchronize encrypted subscriptions from Firestore when user logs in
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const syncFromCloud = async () => {
      try {
        // Check local user-scoped storage immediately
        const localUserSubs = getStoredSubscriptions(user.uid);
        const guestSubs = getStoredSubscriptions();

        // If user already had subscriptions locally, show them immediately
        if (localUserSubs && localUserSubs.length > 0) {
          if (isMounted) setSubscriptions(localUserSubs);
        } else if (guestSubs && guestSubs.length > 0) {
          // Migrate guest data into this authenticated account
          if (isMounted) setSubscriptions(guestSubs);
          saveStoredSubscriptions(guestSubs, user.uid);
          for (const sub of guestSubs) {
            await saveUserSubscriptionToCloud(user.uid, userSecretKey, sub);
          }
        }

        // Fetch cloud Firestore documents
        const cloudSubs = await fetchUserSubscriptionsFromCloud(user.uid, userSecretKey);
        if (!isMounted) return;

        if (cloudSubs && cloudSubs.length > 0) {
          setSubscriptions(cloudSubs);
          saveStoredSubscriptions(cloudSubs, user.uid);
        } else {
          // Cloud has no documents yet for this user.
          // Check if the user has locally entered subscriptions to push up to the cloud!
          const existingToPush = (localUserSubs && localUserSubs.length > 0) 
            ? localUserSubs 
            : (guestSubs && guestSubs.length > 0 ? guestSubs : null);

          if (existingToPush && existingToPush.length > 0) {
            for (const item of existingToPush) {
              await saveUserSubscriptionToCloud(user.uid, userSecretKey, item);
            }
          } else {
            // Truly fresh account with no local subscriptions: seed defaults
            const seeded = await seedInitialSubscriptionsToCloud(
              user.uid,
              userSecretKey,
              SEED_SUBSCRIPTIONS
            );
            if (isMounted) {
              setSubscriptions(seeded);
            }
          }
        }
      } catch (err) {
        console.warn('Cloud sync error, using local encrypted cache:', err);
        const fallback = getStoredSubscriptions(user.uid);
        if (fallback.length > 0 && isMounted) {
          setSubscriptions(fallback);
        }
      }
    };

    syncFromCloud();

    return () => {
      isMounted = false;
    };
  }, [user, userSecretKey]);

  // Initial notification check & permission sync
  useEffect(() => {
    setNotificationPermission(getNotificationPermission());
    const { alerts: initialAlerts } = checkUpcomingRenewalsAndNotify(subscriptions);
    setAlerts(initialAlerts);
  }, [subscriptions]);

  // Reactive financial metrics calculation
  const metrics = useMemo(() => {
    return calculateFinancialMetrics(subscriptions, simulatedCancelledIds);
  }, [subscriptions, simulatedCancelledIds]);

  // Helper for UUID generation
  const generateUUID = useCallback(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Handler: Save (Create or Update) Subscription
  const handleSaveSubscription = async (
    data: Omit<Subscription, 'id' | 'createdAt'>,
    id?: string
  ) => {
    let targetSub: Subscription;
    let nextList: Subscription[];

    if (id) {
      const existing = subscriptions.find((s) => s.id === id);
      targetSub = {
        ...(existing || {}),
        ...data,
        id,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Subscription;

      nextList = subscriptions.map((item) => (item.id === id ? targetSub : item));
    } else {
      targetSub = {
        ...data,
        id: generateUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      nextList = [targetSub, ...subscriptions];
    }

    setSubscriptions(nextList);
    setEditingSubscription(null);

    // Save locally immediately under active user
    saveStoredSubscriptions(nextList, user?.uid);

    // Encrypt client-side and push to Firestore
    if (user) {
      await saveUserSubscriptionToCloud(user.uid, userSecretKey, targetSub);
    }
  };

  // Handler: Toggle Pause on Subscription
  const handleTogglePause = async (id: string) => {
    const sub = subscriptions.find((s) => s.id === id);
    if (!sub) return;

    const updated = { ...sub, isPaused: !sub.isPaused, updatedAt: new Date().toISOString() };
    const nextList = subscriptions.map((item) => (item.id === id ? updated : item));
    setSubscriptions(nextList);

    saveStoredSubscriptions(nextList, user?.uid);

    if (user) {
      await saveUserSubscriptionToCloud(user.uid, userSecretKey, updated);
    }
  };

  // Handler: Toggle Staged Simulation Cancellation
  const handleToggleSimulateCancel = (id: string) => {
    setSimulatedCancelledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Handler: Clear Simulation
  const handleClearSimulation = () => {
    setSimulatedCancelledIds(new Set());
  };

  // Handler: Apply Simulation as Paused
  const handleApplySimulatedPause = async () => {
    const updatedList = subscriptions.map((sub) =>
      simulatedCancelledIds.has(sub.id) ? { ...sub, isPaused: true } : sub
    );
    setSubscriptions(updatedList);
    setSimulatedCancelledIds(new Set());
    saveStoredSubscriptions(updatedList, user?.uid);

    if (user) {
      for (const sub of updatedList) {
        if (simulatedCancelledIds.has(sub.id)) {
          await saveUserSubscriptionToCloud(user.uid, userSecretKey, sub);
        }
      }
    }
  };

  // Handler: Apply Simulation as Delete
  const handleApplySimulatedDelete = async () => {
    const toDeleteIds: string[] = Array.from(simulatedCancelledIds);
    const updatedList = subscriptions.filter((sub) => !simulatedCancelledIds.has(sub.id));
    setSubscriptions(updatedList);
    setSimulatedCancelledIds(new Set());
    saveStoredSubscriptions(updatedList, user?.uid);

    if (user) {
      for (const id of toDeleteIds) {
        await deleteUserSubscriptionFromCloud(user.uid, id);
      }
    }
  };

  // Handler: Execute Confirmed Deletion
  const handleDeleteSubscription = async (id: string) => {
    const nextList = subscriptions.filter((s) => s.id !== id);
    setSubscriptions(nextList);
    setSimulatedCancelledIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    saveStoredSubscriptions(nextList, user?.uid);

    if (user) {
      await deleteUserSubscriptionFromCloud(user.uid, id);
    }
  };

  // Handler: Reset to Initial Seed Data
  const handleResetData = async () => {
    if (window.confirm('Reset all subscriptions to initial seed entries in INR and sync to cloud?')) {
      const seeded = resetToDefaults();
      setSubscriptions(seeded);
      setSimulatedCancelledIds(new Set());
      if (user) {
        await seedInitialSubscriptionsToCloud(user.uid, userSecretKey, seeded);
      }
    }
  };

  // Initial Auth Loading Skeleton
  if (isLoading) {
    return <AuthLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen w-full max-w-full bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white antialiased font-sans transition-colors duration-200">
      {/* 1. Auth Gateway Modal (if not authenticated) */}
      {!user && <AuthGatewayModal />}

      {/* 2. Dynamic User Onboarding Survey Modal (upon first-time verification) */}
      {user && needsOnboarding && <OnboardingModal />}

      {/* Top Application Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenAddModal={() => {
          setEditingSubscription(null);
          setIsAddEditModalOpen(true);
        }}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        onResetData={handleResetData}
        onOpenDataVault={() => setIsDataVaultOpen(true)}
        unreadAlertsCount={alerts.length}
        totalSubsCount={subscriptions.length}
        currentMonthlyBurnINR={metrics.totalMonthlyBurn}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 min-w-0">
        {currentTab === 'analytics' && (
          <AnalyticsHub
            metrics={metrics}
            subscriptions={subscriptions}
            onTogglePause={handleTogglePause}
            onSelectSubscription={(sub) => {
              setEditingSubscription(sub);
              setIsAddEditModalOpen(true);
            }}
            onNavigateToTab={setCurrentTab}
            simulatedCancelledIds={simulatedCancelledIds}
            onToggleSimulateCancel={handleToggleSimulateCancel}
          />
        )}

        {currentTab === 'subscriptions' && (
          <SubscriptionManager
            subscriptions={subscriptions}
            onAddClick={() => {
              setEditingSubscription(null);
              setIsAddEditModalOpen(true);
            }}
            onEditClick={(sub) => {
              setEditingSubscription(sub);
              setIsAddEditModalOpen(true);
            }}
            onDeleteClick={handleDeleteSubscription}
            onTogglePause={handleTogglePause}
            simulatedCancelledIds={simulatedCancelledIds}
            onToggleSimulateCancel={handleToggleSimulateCancel}
            onClearSimulation={handleClearSimulation}
          />
        )}

        {currentTab === 'calendar' && (
          <PredictiveCalendar
            subscriptions={subscriptions}
            onTogglePause={handleTogglePause}
            onEditClick={(sub) => {
              setEditingSubscription(sub);
              setIsAddEditModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Global Professional Footer with Nithish S and license */}
      <Footer />

      {/* Persistent Simulation Cancellation Floating Banner */}
      <SimulateCancelBanner
        simulatedCount={simulatedCancelledIds.size}
        monthlySavings={metrics.simulatedMonthlySavings}
        yearlySavings={metrics.simulatedYearlySavings}
        onClear={handleClearSimulation}
        onApplyPause={handleApplySimulatedPause}
        onApplyDelete={handleApplySimulatedDelete}
      />

      {/* Add / Edit Subscription Modal */}
      <SubscriptionModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingSubscription(null);
        }}
        onSave={handleSaveSubscription}
        initialData={editingSubscription}
      />

      {/* Expiry & 24h Web Notifications Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        permissionStatus={notificationPermission}
        onPermissionChange={setNotificationPermission}
        alerts={alerts}
        subscriptions={subscriptions}
        onTogglePause={handleTogglePause}
      />

      {/* Project Data & Cloud Vault Inspector Modal */}
      <DataVaultModal
        isOpen={isDataVaultOpen}
        onClose={() => setIsDataVaultOpen(false)}
        subscriptions={subscriptions}
      />
    </div>
  );
}
