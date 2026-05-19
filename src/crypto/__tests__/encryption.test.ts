import { describe, it, expect, beforeAll } from 'vitest';
import { deriveKey, generateSalt } from '../keyDerivation';
import { encryptData, decryptData } from '../encryption';

describe('Crypto — Key Derivation', () => {
  it('generates a 16-byte random salt', () => {
    const salt = generateSalt();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(16);
  });

  it('two salts are never identical', () => {
    const s1 = generateSalt();
    const s2 = generateSalt();
    expect(s1).not.toEqual(s2);
  });

  it('derive returns a CryptoKey', async () => {
    const salt = generateSalt();
    const key = await deriveKey('123456', salt);
    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(key.algorithm.name).toBe('AES-GCM');
  });
});

describe('Crypto — Encrypt / Decrypt', () => {
  let key: CryptoKey;

  beforeAll(async () => {
    key = await deriveKey('mySecurePIN', generateSalt());
  });

  it('round-trip produces identical plaintext', async () => {
    const payload = { amount: 1234.56, note: 'Coffee', date: Date.now() };
    const { iv, ciphertext } = await encryptData(key, payload);
    const result = await decryptData(key, iv, ciphertext);
    expect(result).toEqual(payload);
  });

  it('each encryption produces a unique IV', async () => {
    const payload = { x: 1 };
    const r1 = await encryptData(key, payload);
    const r2 = await encryptData(key, payload);
    // IVs must differ
    expect(Array.from(r1.iv).join(',')).not.toBe(Array.from(r2.iv).join(','));
  });

  it('same plaintext with different IV → different ciphertext', async () => {
    const payload = { x: 1 };
    const r1 = await encryptData(key, payload);
    const r2 = await encryptData(key, payload);
    expect(Array.from(r1.ciphertext).join(',')).not.toBe(Array.from(r2.ciphertext).join(','));
  });

  it('wrong key throws on decryption', async () => {
    const { iv, ciphertext } = await encryptData(key, { secret: 'vault' });
    const wrongKey = await deriveKey('wrongPIN', generateSalt());
    await expect(decryptData(wrongKey, iv, ciphertext)).rejects.toThrow();
  });

  it('tampered ciphertext throws on decryption', async () => {
    const { iv, ciphertext } = await encryptData(key, { safe: true });
    // Flip one byte in the ciphertext
    const tampered = new Uint8Array(ciphertext);
    tampered[0] = tampered[0] ^ 0xff;
    await expect(decryptData(key, iv, tampered)).rejects.toThrow();
  });

  it('can handle complex nested objects', async () => {
    const payload = {
      profile: { id: 1, name: 'Manglam', currency: '₹' },
      expenses: [{ amount: 500, note: 'Groceries' }],
      tags: ['food', 'monthly'],
    };
    const { iv, ciphertext } = await encryptData(key, payload);
    const result = await decryptData(key, iv, ciphertext);
    expect(result).toEqual(payload);
  });

  it('encrypts large payload (1 KB) under 200 ms', async () => {
    const large = { data: 'x'.repeat(1024) };
    const start = performance.now();
    await encryptData(key, large);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });
});
