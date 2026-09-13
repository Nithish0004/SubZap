import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Subscription, EncryptedSubscriptionRecord } from '../types';
import { encryptSubscription, decryptSubscription } from '../utils/crypto';
import { getStoredSubscriptions, saveStoredSubscriptions } from '../utils/storage';

/**
 * Cloud Firestore + Client-Side Decrypted Persistence Service
 */

export async function fetchUserSubscriptionsFromCloud(
  userId: string,
  userSecretKey: string
): Promise<Subscription[]> {
  try {
    const userSubsRef = collection(db, 'users', userId, 'subscriptions');
    const snapshot = await getDocs(userSubsRef);

    if (snapshot.empty) {
      return [];
    }

    const decryptedList: Subscription[] = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as EncryptedSubscriptionRecord;
      try {
        const decrypted = await decryptSubscription(data, userSecretKey);
        decryptedList.push(decrypted);
      } catch (err) {
        console.error('Failed to decrypt record for doc ID:', docSnap.id, err);
      }
    }

    // Cache locally for zero-latency instant render
    if (decryptedList.length > 0) {
      saveStoredSubscriptions(decryptedList, userId);
    }
    return decryptedList;
  } catch (error) {
    console.warn('Firestore fetch failed, falling back to local storage cache:', error);
    return getStoredSubscriptions(userId);
  }
}

export async function saveUserSubscriptionToCloud(
  userId: string,
  userSecretKey: string,
  subscription: Subscription
): Promise<void> {
  // 1. Immediately persist locally for zero-latency UX
  const localList = getStoredSubscriptions(userId);
  const existingIdx = localList.findIndex((s) => s.id === subscription.id);
  let updatedLocal: Subscription[];
  if (existingIdx >= 0) {
    updatedLocal = [...localList];
    updatedLocal[existingIdx] = subscription;
  } else {
    updatedLocal = [subscription, ...localList];
  }
  saveStoredSubscriptions(updatedLocal, userId);

  // 2. Encrypt client-side and push to Firestore
  try {
    const encryptedRecord = await encryptSubscription(subscription, userSecretKey, userId);
    const subDocRef = doc(db, 'users', userId, 'subscriptions', subscription.id);
    await setDoc(subDocRef, encryptedRecord);
  } catch (error) {
    console.error('Failed to write encrypted subscription to Firestore:', error);
    // Local copy already saved
  }
}

export async function deleteUserSubscriptionFromCloud(
  userId: string,
  subscriptionId: string
): Promise<void> {
  // 1. Remove from local storage
  const localList = getStoredSubscriptions(userId);
  const updated = localList.filter((s) => s.id !== subscriptionId);
  saveStoredSubscriptions(updated, userId);

  // 2. Remove from Firestore
  try {
    const subDocRef = doc(db, 'users', userId, 'subscriptions', subscriptionId);
    await deleteDoc(subDocRef);
  } catch (error) {
    console.error('Failed to delete subscription document from Firestore:', error);
  }
}

export async function seedInitialSubscriptionsToCloud(
  userId: string,
  userSecretKey: string,
  seedList: Subscription[]
): Promise<Subscription[]> {
  saveStoredSubscriptions(seedList, userId);
  for (const sub of seedList) {
    try {
      const encryptedRecord = await encryptSubscription(sub, userSecretKey, userId);
      const subDocRef = doc(db, 'users', userId, 'subscriptions', sub.id);
      await setDoc(subDocRef, encryptedRecord);
    } catch (e) {
      console.warn('Could not seed cloud subscription:', sub.name, e);
    }
  }
  return seedList;
}
