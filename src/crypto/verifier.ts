import { db } from '../db/schema';
import { encryptData, decryptData } from './encryption';

const TEST_VECTOR = 'VAULTSPEND_VERIFIED';

/**
 * Store an encrypted test vector to verify PIN correctness later
 */
export async function storeVerifier(key: CryptoKey): Promise<void> {
  const { iv, ciphertext } = await encryptData(key, TEST_VECTOR);
  
  // Store as base64 strings in app_meta
  await db.app_meta.put({ key: 'verifier_iv', value: arrayBufferToBase64(iv) });
  await db.app_meta.put({ key: 'verifier_blob', value: arrayBufferToBase64(ciphertext) });
}

/**
 * Verify a derived key against the stored test vector
 */
export async function verifyKey(key: CryptoKey): Promise<boolean> {
  try {
    const ivMeta = await db.app_meta.get('verifier_iv');
    const blobMeta = await db.app_meta.get('verifier_blob');
    
    if (!ivMeta || !blobMeta) return false;
    
    const iv = base64ToArrayBuffer(ivMeta.value);
    const ciphertext = base64ToArrayBuffer(blobMeta.value);
    
    const decrypted = await decryptData<string>(key, iv, ciphertext);
    return decrypted === TEST_VECTOR;
  } catch (error) {
    // Decryption failure (DOMException) means wrong key
    return false;
  }
}

// Helpers duplicated here to avoid circular dependencies if needed, 
// or I can import from keyDerivation. Listing them here for robustness.

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}
