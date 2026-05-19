/**
 * AES-256-GCM encryption/decryption utilities
 */

export async function encryptData(
  key: CryptoKey,
  plaintext: unknown
): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV is standard for GCM
  const enc = new TextEncoder();
  const encoded = enc.encode(JSON.stringify(plaintext));
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource }, 
    key, 
    encoded
  );
  
  return { 
    iv, 
    ciphertext: new Uint8Array(encryptedBuffer) 
  };
}

export async function decryptData<T>(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: Uint8Array
): Promise<T> {
  const dec = new TextDecoder();
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource }, 
    key, 
    ciphertext as BufferSource
  );
  
  return JSON.parse(dec.decode(decryptedBuffer)) as T;
}
