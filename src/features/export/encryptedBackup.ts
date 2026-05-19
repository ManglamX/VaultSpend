import { encryptData, decryptData } from '../../crypto/encryption';
import { deriveKey, generateSalt } from '../../crypto/keyDerivation';
import { db } from '../../db/schema';
import { getAllExpenses } from '../../services/expenseService';
import { getAllIncome } from '../../services/incomeService';
import { getFixedExpenses } from '../../services/fixedExpenseService';
import { getCategories } from '../../services/categoryService';
import { addExpense } from '../../services/expenseService';
import { addIncome } from '../../services/incomeService';
import { addFixedExpense } from '../../services/fixedExpenseService';
import { addCategory } from '../../services/categoryService';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from '../../store/authStore';

const MAGIC = 'VAULTSPEND_BACKUP_V1';

export interface BackupPayload {
  magic: string;
  version: number;
  exportedAt: number;
  expenses: any[];
  income: any[];
  fixedExpenses: any[];
  categories: any[];
}

export async function createEncryptedBackup(profileId: number, passphrase: string): Promise<void> {
  const [expenses, income, fixedExpenses, categories] = await Promise.all([
    getAllExpenses(profileId),
    getAllIncome(profileId),
    getFixedExpenses(profileId),
    getCategories(profileId),
  ]);

  const payload: BackupPayload = {
    magic: MAGIC,
    version: 1,
    exportedAt: Date.now(),
    expenses,
    income,
    fixedExpenses,
    categories: categories.filter(c => !c.isDefault), // skip defaults — they're auto-seeded
  };

  const backupSalt = generateSalt();
  const backupKey = await deriveKey(passphrase, backupSalt);
  const { iv, ciphertext } = await encryptData(backupKey, payload);

  const fileObj = {
    magic: MAGIC,
    salt: Array.from(backupSalt),
    iv: Array.from(iv),
    ciphertext: Array.from(ciphertext),
  };

  const json = JSON.stringify(fileObj);
  const filename = `vaultspend-backup-${new Date().toISOString().slice(0, 10)}.vaultspend.enc`;

  if (Capacitor.isNativePlatform()) {
    const { setPreventAutoLock } = useAuthStore.getState();
    try {
      setPreventAutoLock(true);
      // Use a more robust way to convert string to base64 for native filesystem
      const base64 = b64EncodeUnicode(new TextEncoder().encode(json).buffer);
      
      // 1. Save to Documents folder (Permanent download)
      try {
        await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Documents,
        });
      } catch (e) {
        console.warn('Doc save failed', e);
      }

      // 2. Save to Cache folder (For Sharing)
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });

      // On Android, 'files' is often more reliable than 'url' for sharing local files
      await Share.share({
        title: 'VaultSpend Encrypted Backup',
        text: 'Keep this file safe! It contains your encrypted data.',
        url: result.uri,
        files: [result.uri],
        dialogTitle: 'Save Backup File',
      });
    } catch (err) {
      console.error('Backup native export failed', err);
      // Fallback for WebView/Web
      const blob = new Blob([json], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: filename });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } finally {
      // Delay to ensure the share dialog is fully dismissed before re-enabling lock
      setTimeout(() => setPreventAutoLock(false), 1000);
    }
  } else {
    // On Web, use standard <a> tag download
    const blob = new Blob([json], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Helper to convert ArrayBuffer to Base64 (consistent with xlsxExport.ts)
function b64EncodeUnicode(buf: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function restoreFromBackup(
  profileId: number,
  fileContent: string,
  passphrase: string
): Promise<{ restored: number; message: string }> {
  let file: any;
  try {
    file = JSON.parse(fileContent);
  } catch {
    throw new Error('Invalid backup file — could not parse JSON.');
  }

  if (file.magic !== MAGIC) {
    throw new Error('Invalid backup file — magic string mismatch.');
  }

  const backupSalt = new Uint8Array(file.salt);
  const backupKey = await deriveKey(passphrase, backupSalt);

  let payload: BackupPayload;
  try {
    payload = await decryptData<BackupPayload>(
      backupKey,
      new Uint8Array(file.iv),
      new Uint8Array(file.ciphertext)
    );
  } catch {
    throw new Error('Wrong passphrase — could not decrypt backup.');
  }

  if (payload.magic !== MAGIC) {
    throw new Error('Backup content is corrupted.');
  }

  // Atomic restore inside a Dexie transaction
  let count = 0;
  await db.transaction('rw', [db.expenses, db.income, db.fixed_expenses, db.categories], async () => {
    for (const e of payload.expenses ?? []) {
      const { id: _id, ...rest } = e;
      await addExpense({ ...rest, profileId });
      count++;
    }
    for (const i of payload.income ?? []) {
      const { id: _id, ...rest } = i;
      await addIncome({ ...rest, profileId });
      count++;
    }
    for (const f of payload.fixedExpenses ?? []) {
      const { id: _id, ...rest } = f;
      await addFixedExpense({ ...rest, profileId });
      count++;
    }
    for (const c of payload.categories ?? []) {
      const { id: _id, ...rest } = c;
      await addCategory({ ...rest, profileId });
    }
  });

  return { restored: count, message: `✅ Restored ${count} records from backup dated ${new Date(payload.exportedAt).toLocaleDateString()}` };
}
