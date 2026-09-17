import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Google OAuth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore Database strictly with project database ID per Firebase Integration Skill guidelines
const configWithDb = firebaseConfig as typeof firebaseConfig & { firestoreDatabaseId?: string };
export const db = configWithDb.firestoreDatabaseId 
  ? getFirestore(app, configWithDb.firestoreDatabaseId) 
  : getFirestore(app);

// Connection test helper
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDoc(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (
      error?.code === 'unavailable' ||
      (error instanceof Error && (error.message.includes('offline') || error.message.includes('unavailable')))
    ) {
      return false;
    }
    return true;
  }
}
