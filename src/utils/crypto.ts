import { Subscription, EncryptedSubscriptionRecord } from '../types';

/**
 * Web Crypto API AES-GCM 256-bit Client-Side Encryption Utility
 * Provides zero-knowledge privacy: sensitive fields (Name, Cost, Dates, Notes)
 * are encrypted in browser memory BEFORE being sent to Firestore.
 */

// Helper to convert Uint8Array to Hex string
function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper to convert Hex string to Uint8Array
function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Derive a CryptoKey from user session key using PBKDF2
async function deriveCryptoKey(secretKey: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretKey),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Static salt for deterministic user-session key derivation
  const salt = enc.encode('subzap-zero-knowledge-salt-v1');

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string using AES-GCM 256
 * Returns formatted string: `${ivHex}:${ciphertextHex}`
 */
export async function encryptField(plaintext: string, secretKey: string): Promise<string> {
  if (!plaintext) return '';
  try {
    const key = await deriveCryptoKey(secretKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encodedData = enc.encode(plaintext);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    const ciphertext = new Uint8Array(ciphertextBuffer);
    return `${toHex(iv)}:${toHex(ciphertext)}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Client-side encryption failed');
  }
}

/**
 * Decrypt an AES-GCM ciphertext string back to plaintext
 */
export async function decryptField(encryptedString: string, secretKey: string): Promise<string> {
  if (!encryptedString) return '';
  // Check if string contains IV separator
  if (!encryptedString.includes(':')) {
    // If not encrypted (e.g. legacy plain text), return as-is
    return encryptedString;
  }

  try {
    const [ivHex, cipherHex] = encryptedString.split(':');
    const iv = fromHex(ivHex);
    const ciphertext = fromHex(cipherHex);
    const key = await deriveCryptoKey(secretKey);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (error) {
    console.warn('Decryption failed for field; might be plaintext or wrong key:', error);
    // Return original string if decryption fails
    return encryptedString;
  }
}

/**
 * Encrypts a Subscription object before storing in cloud Firestore
 */
export async function encryptSubscription(
  sub: Subscription,
  secretKey: string,
  userId: string
): Promise<EncryptedSubscriptionRecord> {
  const [
    nameEnc,
    costEnc,
    nextRenewalDateEnc,
    trialExpiryDateEnc,
    notesEnc,
    cancellationUrlEnc,
  ] = await Promise.all([
    encryptField(sub.name, secretKey),
    encryptField(String(sub.cost), secretKey),
    encryptField(sub.nextRenewalDate, secretKey),
    sub.trialExpiryDate ? encryptField(sub.trialExpiryDate, secretKey) : Promise.resolve(undefined),
    sub.notes ? encryptField(sub.notes, secretKey) : Promise.resolve(undefined),
    sub.cancellationUrl ? encryptField(sub.cancellationUrl, secretKey) : Promise.resolve(undefined),
  ]);

  const record: EncryptedSubscriptionRecord = {
    id: sub.id,
    userId,
    nameEnc,
    costEnc,
    nextRenewalDateEnc,
    trialExpiryDateEnc,
    notesEnc,
    cancellationUrlEnc,
    category: sub.category,
    billingCycle: sub.billingCycle,
    currency: sub.currency,
    domain: sub.domain,
    logoUrl: sub.logoUrl,
    isPaused: sub.isPaused,
    createdAt: sub.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return record;
}

/**
 * Decrypts an EncryptedSubscriptionRecord retrieved from Firestore
 */
export async function decryptSubscription(
  record: EncryptedSubscriptionRecord,
  secretKey: string
): Promise<Subscription> {
  const [
    decryptedName,
    decryptedCostStr,
    decryptedRenewalDate,
    decryptedTrialExpiry,
    decryptedNotes,
    decryptedCancelUrl,
  ] = await Promise.all([
    decryptField(record.nameEnc, secretKey),
    decryptField(record.costEnc, secretKey),
    decryptField(record.nextRenewalDateEnc, secretKey),
    record.trialExpiryDateEnc ? decryptField(record.trialExpiryDateEnc, secretKey) : Promise.resolve(undefined),
    record.notesEnc ? decryptField(record.notesEnc, secretKey) : Promise.resolve(undefined),
    record.cancellationUrlEnc ? decryptField(record.cancellationUrlEnc, secretKey) : Promise.resolve(undefined),
  ]);

  const parsedCost = parseFloat(decryptedCostStr);

  return {
    id: record.id,
    name: decryptedName || 'Encrypted Subscription',
    cost: isNaN(parsedCost) ? 0 : parsedCost,
    currency: record.currency || '₹',
    billingCycle: record.billingCycle || 'monthly',
    category: record.category || 'Other',
    nextRenewalDate: decryptedRenewalDate || new Date().toISOString().split('T')[0],
    trialExpiryDate: decryptedTrialExpiry || undefined,
    notes: decryptedNotes || undefined,
    cancellationUrl: decryptedCancelUrl || undefined,
    domain: record.domain,
    logoUrl: record.logoUrl,
    isPaused: Boolean(record.isPaused),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
