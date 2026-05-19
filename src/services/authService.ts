import { db } from '../db/schema';
import { deriveKey, generateSalt } from '../crypto/keyDerivation';
import { storeVerifier, verifyKey } from '../crypto/verifier';
import { keyManager } from '../crypto/keyManager';

const SALT_KEY = 'pbkdf2_salt';
const SETUP_KEY = 'app_setup_done';
const FAILED_ATTEMPTS_KEY = 'failed_attempts';
const LOCKOUT_UNTIL_KEY = 'lockout_until';

function toBase64(buf: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buf.byteLength; i++) binary += String.fromCharCode(buf[i]);
  return window.btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = window.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Returns true if the user has already set up their PIN
 */
export async function isAppSetUp(): Promise<boolean> {
  const meta = await db.app_meta.get(SETUP_KEY);
  return meta?.value === 'true';
}

/**
 * First-run: derive key from PIN, store salt + verifier, mark as set up
 */
export async function setupPin(pin: string): Promise<void> {
  const salt = generateSalt();
  const key = await deriveKey(pin, salt);

  // Persist salt so we can re-derive on future unlocks
  await db.app_meta.put({ key: SALT_KEY, value: toBase64(salt) });

  // Store encrypted test vector for PIN verification
  await storeVerifier(key);

  // Mark setup as complete
  await db.app_meta.put({ key: SETUP_KEY, value: 'true' });

  // Activate key in memory (user is unlocked after setup)
  keyManager.setKey(key, 5 * 60 * 1000);
}

/**
 * Subsequent unlocks: re-derive key from PIN + stored salt, verify
 */
export async function unlockWithPin(
  pin: string
): Promise<{ success: boolean; lockoutSecondsLeft?: number }> {
  // 1. Check persistent lockout
  const lockoutMeta = await db.app_meta.get(LOCKOUT_UNTIL_KEY);
  if (lockoutMeta) {
    const until = parseInt(lockoutMeta.value);
    if (Date.now() < until) {
      return { success: false, lockoutSecondsLeft: Math.ceil((until - Date.now()) / 1000) };
    }
  }

  const saltMeta = await db.app_meta.get(SALT_KEY);
  if (!saltMeta) return { success: false };

  const salt = fromBase64(saltMeta.value);
  const key = await deriveKey(pin, salt);
  const valid = await verifyKey(key);

  if (valid) {
    // Reset failures on success
    await db.app_meta.put({ key: FAILED_ATTEMPTS_KEY, value: '0' });
    await db.app_meta.delete(LOCKOUT_UNTIL_KEY);
    
    keyManager.setKey(key, 5 * 60 * 1000);
    return { success: true };
  } else {
    // Increment failures
    const attemptMeta = await db.app_meta.get(FAILED_ATTEMPTS_KEY);
    const attempts = (attemptMeta ? parseInt(attemptMeta.value) : 0) + 1;
    await db.app_meta.put({ key: FAILED_ATTEMPTS_KEY, value: attempts.toString() });

    if (attempts >= 5) {
      const lockoutUntil = Date.now() + 30_000;
      await db.app_meta.put({ key: LOCKOUT_UNTIL_KEY, value: lockoutUntil.toString() });
      return { success: false, lockoutSecondsLeft: 30 };
    }
    return { success: false };
  }
}

export async function getPersistentLockout(): Promise<number | null> {
  const meta = await db.app_meta.get(LOCKOUT_UNTIL_KEY);
  if (!meta) return null;
  const until = parseInt(meta.value);
  return Date.now() < until ? until : null;
}

export async function getPersistentFailedAttempts(): Promise<number> {
  const meta = await db.app_meta.get(FAILED_ATTEMPTS_KEY);
  return meta ? parseInt(meta.value) : 0;
}
