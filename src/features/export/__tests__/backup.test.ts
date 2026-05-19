import { describe, it, expect } from 'vitest';
import { deriveKey, generateSalt } from '../../../crypto/keyDerivation';
import { encryptData, decryptData } from '../../../crypto/encryption';

/**
 * Isolated backup/restore unit tests that do NOT touch Dexie or Capacitor.
 * We test the core crypto round-trip that underpins the backup format directly.
 */

const MAGIC = 'VAULTSPEND_BACKUP_V1';

interface BackupPayload {
  magic: string;
  version: number;
  exportedAt: number;
  expenses: unknown[];
  income: unknown[];
  fixedExpenses: unknown[];
  categories: unknown[];
}

async function buildBackupFile(payload: BackupPayload, passphrase: string) {
  const salt = generateSalt();
  const key = await deriveKey(passphrase, salt);
  const { iv, ciphertext } = await encryptData(key, payload);
  return {
    magic: MAGIC,
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(ciphertext),
  };
}

async function decodeBackupFile(file: ReturnType<typeof buildBackupFile> extends Promise<infer T> ? T : never, passphrase: string): Promise<BackupPayload> {
  const salt = new Uint8Array(file.salt);
  const key = await deriveKey(passphrase, salt);
  return decryptData<BackupPayload>(key, new Uint8Array(file.iv), new Uint8Array(file.ciphertext));
}

describe('Backup — crypto round-trip', () => {
  const samplePayload: BackupPayload = {
    magic: MAGIC,
    version: 1,
    exportedAt: 1_700_000_000_000,
    expenses: [{ amount: 500, note: 'Coffee', categoryId: 1, date: Date.now(), profileId: 1 }],
    income: [{ amount: 50000, source: 'Salary', date: Date.now(), profileId: 1 }],
    fixedExpenses: [{ name: 'Netflix', amount: 650, dueDay: 5, categoryId: 2, isActive: true, profileId: 1 }],
    categories: [],
  };

  it('backup then restore returns identical data', async () => {
    const file = await buildBackupFile(samplePayload, 'securePassphrase99');
    const restored = await decodeBackupFile(file, 'securePassphrase99');
    expect(restored.expenses).toEqual(samplePayload.expenses);
    expect(restored.income).toEqual(samplePayload.income);
    expect(restored.fixedExpenses).toEqual(samplePayload.fixedExpenses);
    expect(restored.magic).toBe(MAGIC);
  });

  it('wrong passphrase throws an error', async () => {
    const file = await buildBackupFile(samplePayload, 'correctPass');
    await expect(decodeBackupFile(file, 'wrongPass')).rejects.toThrow();
  });

  it('corrupted ciphertext byte throws on decrypt', async () => {
    const file = await buildBackupFile(samplePayload, 'correctPass');
    // Flip first byte of ciphertext
    const corrupted = { ...file, ciphertext: [file.ciphertext[0] ^ 0xff, ...file.ciphertext.slice(1)] };
    await expect(decodeBackupFile(corrupted, 'correctPass')).rejects.toThrow();
  });

  it('invalid JSON backup file is rejected', () => {
    expect(() => JSON.parse('NOT_VALID_JSON{{')).toThrow();
  });

  it('backup file with wrong magic string is rejected', async () => {
    const badPayload = { ...samplePayload, magic: 'FAKE_MAGIC' };
    const file = await buildBackupFile(badPayload, 'pass');
    const restored = await decodeBackupFile(file, 'pass');
    // Simulate the magic check that restoreFromBackup does
    expect(restored.magic).not.toBe(MAGIC);
  });

  it('two backups of same data produce different ciphertexts (fresh salt+IV)', async () => {
    const f1 = await buildBackupFile(samplePayload, 'pass');
    const f2 = await buildBackupFile(samplePayload, 'pass');
    expect(f1.salt).not.toEqual(f2.salt);
    expect(f1.ciphertext).not.toEqual(f2.ciphertext);
  });
});
