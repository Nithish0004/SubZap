import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { sanitizeForFirestore } from '../utils/crypto';

const LOCAL_PROFILE_KEY = 'subzap_user_profile';

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  // 1. Check local cache first for instant reactivity
  try {
    const userKey = `${LOCAL_PROFILE_KEY}_${userId}`;
    const cachedUser = localStorage.getItem(userKey) || localStorage.getItem(LOCAL_PROFILE_KEY);
    if (cachedUser) {
      const parsed = JSON.parse(cachedUser) as UserProfile;
      if (parsed.userId === userId) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }

  // 2. Fetch from Firestore
  try {
    const profileRef = doc(db, 'profiles', userId);
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(data));
      localStorage.setItem(`${LOCAL_PROFILE_KEY}_${userId}`, JSON.stringify(data));
      return data;
    }
  } catch (error) {
    console.warn('Could not fetch cloud profile, checking local cache:', error);
  }

  return null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  // Save locally first
  localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(`${LOCAL_PROFILE_KEY}_${profile.userId}`, JSON.stringify(profile));

  // Push to Firestore with cleaned undefined properties
  try {
    const profileRef = doc(db, 'profiles', profile.userId);
    const cleanData = sanitizeForFirestore({
      ...profile,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(profileRef, cleanData);
  } catch (error) {
    console.error('Failed to write profile to Firestore:', error);
  }
}
