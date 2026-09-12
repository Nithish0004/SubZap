import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

const LOCAL_PROFILE_KEY = 'subzap_user_profile';

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const profileRef = doc(db, 'profiles', userId);
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (error) {
    console.warn('Could not fetch cloud profile, checking local cache:', error);
  }

  // Check local cache
  try {
    const cached = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as UserProfile;
      if (parsed.userId === userId) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }

  return null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  // Save locally first
  localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));

  // Push to Firestore
  try {
    const profileRef = doc(db, 'profiles', profile.userId);
    await setDoc(profileRef, {
      ...profile,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to write profile to Firestore:', error);
  }
}
