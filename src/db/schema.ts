import Dexie, { type Table } from 'dexie';

export interface EncryptedRecord {
  id?: number;
  date?: number;        // Unix ms — indexed, not sensitive
  categoryId?: number;  // indexed, not sensitive
  profileId?: number;   // indexed, not sensitive
  dueDate?: number;     // indexed, not sensitive
  iv: Uint8Array;
  ciphertext: Uint8Array;
  authTag?: Uint8Array; // Some implementations might combine ciphertext and authTag
}

export interface AppMeta {
  key: string;
  value: string; // plaintext — salt, schemaVersion only
}

export class VaultSpendDB extends Dexie {
  profiles!: Table<EncryptedRecord>;
  expenses!: Table<EncryptedRecord>;
  fixed_expenses!: Table<EncryptedRecord>;
  income!: Table<EncryptedRecord>;
  budgets!: Table<EncryptedRecord>;
  bills!: Table<EncryptedRecord>;
  categories!: Table<EncryptedRecord>;
  income_categories!: Table<EncryptedRecord>;
  settings!: Table<EncryptedRecord>;
  receipts!: Table<EncryptedRecord>;
  app_meta!: Table<AppMeta>;

  constructor() {
    super('VaultSpendDB');
    this.version(1).stores({
      profiles:       '++id',
      expenses:       '++id, date, categoryId, profileId',
      fixed_expenses: '++id, profileId',
      income:         '++id, date, profileId',
      budgets:        '++id, categoryId, profileId',
      bills:          '++id, profileId, dueDate',
      categories:     '++id, profileId',
      income_categories: '++id, profileId',
      settings:       'key',
      receipts:       '++id, expenseId',
      app_meta:       'key',
    });
  }
}

export const db = new VaultSpendDB();
