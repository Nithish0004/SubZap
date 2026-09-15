import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sanitizeForFirestore } from '../utils/crypto';

export interface RegisteredAccount {
  id: string; // user UID
  fullName: string;
  identity: string; // normalized email or +<code><digits> phone
  identityType: 'email' | 'phone';
  passwordHash: string;
  salt: string;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_ACCOUNTS_STORAGE_KEY = 'subzap_registered_accounts';

// Pre-seeded demo account so testing is instantaneous if needed
const DEFAULT_DEMO_ACCOUNTS: RegisteredAccount[] = [
  {
    id: 'usr_demo_nithish',
    fullName: 'Nithish S',
    identity: 'nithishsnithishs96@gmail.com',
    identityType: 'email',
    passwordHash: '5542fe9e02fb8d9eb8a645f83b513ed669277656bc8ade377d6f891620ad2187', // Secure#2026
    salt: 'subzap_salt_demo_1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'usr_demo_phone',
    fullName: 'Alex Sharma',
    identity: '+919876543210',
    identityType: 'phone',
    passwordHash: '493297c512a717b79b79d674e0cc1afabd89fadbf18e04875688a514da531b46', // Secure#2026
    salt: 'subzap_salt_demo_2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

/**
 * Standard Web Crypto SHA-256 password hashing with salt
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}:subzap-v2-secure`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Safe document key from email or phone for Firestore doc IDs
 */
export function getAccountDocId(identity: string): string {
  // Replace special characters that aren't allowed in Firestore document IDs
  return `acc_${identity.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}`;
}

/**
 * Get all locally cached accounts
 */
export function getLocalAccounts(): RegisteredAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }

  // Initialize with default demo accounts for smooth testing
  localStorage.setItem(LOCAL_ACCOUNTS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_ACCOUNTS));
  return DEFAULT_DEMO_ACCOUNTS;
}

/**
 * Save account locally
 */
export function saveLocalAccount(account: RegisteredAccount): void {
  const accounts = getLocalAccounts();
  const idx = accounts.findIndex(a => a.identity.toLowerCase() === account.identity.toLowerCase());
  if (idx >= 0) {
    accounts[idx] = account;
  } else {
    accounts.push(account);
  }
  localStorage.setItem(LOCAL_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

/**
 * Find account by identity (Email or Normalized Phone)
 * Checks local cache first for zero-latency, then Firestore
 */
export async function findAccountByIdentity(identity: string): Promise<RegisteredAccount | null> {
  const normalized = identity.trim().toLowerCase();
  
  // 1. Check local storage
  const localAccounts = getLocalAccounts();
  let localMatch = localAccounts.find(a => a.identity.toLowerCase() === normalized);
  
  // If not found and identity contains only digits or phone format, match by last 10 digits
  if (!localMatch && !normalized.includes('@')) {
    const cleanDigits = normalized.replace(/[^0-9]/g, '');
    if (cleanDigits.length === 10) {
      localMatch = localAccounts.find(a => a.identityType === 'phone' && a.identity.endsWith(cleanDigits));
    }
  }

  if (localMatch) {
    return localMatch;
  }

  // 2. Check cloud Firestore
  try {
    const docId = getAccountDocId(normalized);
    const docRef = doc(db, 'accounts', docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as RegisteredAccount;
      saveLocalAccount(data);
      return data;
    }
  } catch (err) {
    console.warn('Could not query accounts collection from Firestore:', err);
  }

  return null;
}

/**
 * Create and register a brand new user account
 */
export async function createRegisteredAccount(params: {
  fullName: string;
  identity: string;
  identityType: 'email' | 'phone';
  password: string;
}): Promise<RegisteredAccount> {
  const normalizedIdentity = params.identity.trim().toLowerCase();
  const salt = `salt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const passwordHash = await hashPassword(params.password, salt);
  const uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const account: RegisteredAccount = {
    id: uid,
    fullName: params.fullName.trim(),
    identity: normalizedIdentity,
    identityType: params.identityType,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Save to local storage cache immediately
  saveLocalAccount(account);

  // 2. Persist to Firestore accounts collection
  try {
    const docId = getAccountDocId(normalizedIdentity);
    const docRef = doc(db, 'accounts', docId);
    await setDoc(docRef, sanitizeForFirestore(account));
  } catch (err) {
    console.warn('Could not persist account to Firestore (saved locally):', err);
  }

  return account;
}

/**
 * Verify if password attempt matches stored account password hash
 */
export async function verifyAccountPassword(
  account: RegisteredAccount,
  passwordAttempt: string
): Promise<boolean> {
  const attemptHash = await hashPassword(passwordAttempt, account.salt);
  return attemptHash === account.passwordHash;
}

/**
 * Self-service update account password (Forgot Password Lifecycle)
 */
export async function updateAccountPassword(
  identity: string,
  newPassword: string
): Promise<boolean> {
  const account = await findAccountByIdentity(identity);
  if (!account) return false;

  const newSalt = `salt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const newHash = await hashPassword(newPassword, newSalt);

  account.passwordHash = newHash;
  account.salt = newSalt;
  account.updatedAt = new Date().toISOString();

  // Save to local cache
  saveLocalAccount(account);

  // Update in Firestore
  try {
    const docId = getAccountDocId(identity);
    const docRef = doc(db, 'accounts', docId);
    await updateDoc(docRef, {
      passwordHash: newHash,
      salt: newSalt,
      updatedAt: account.updatedAt,
    });
  } catch (err) {
    console.warn('Could not update password in Firestore (updated locally):', err);
  }

  return true;
}
