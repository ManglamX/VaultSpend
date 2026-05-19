import type { Table } from 'dexie';
import type { EncryptedRecord } from '../db/schema';
import { encryptData, decryptData } from './encryption';
import { keyManager } from './keyManager';

/**
 * Encrypted read/write wrappers for Dexie tables
 */

export async function encryptedPut<T>(
  table: Table<EncryptedRecord>,
  data: T,
  meta?: Partial<EncryptedRecord>
): Promise<number> {
  const key = keyManager.getKey();
  const { iv, ciphertext } = await encryptData(key, data);
  
  // We explicitly cast through any here because Dexie's Table type 
  // can be strict about indices, but our schema includes the meta fields
  return table.put({ 
    ...meta, 
    iv, 
    ciphertext 
  } as any);
}

export async function encryptedGet<T>(
  table: Table<EncryptedRecord>,
  id: number
): Promise<T | null> {
  const record = await table.get(id);
  if (!record) return null;
  
  const key = keyManager.getKey();
  const data = await decryptData<T>(key, record.iv, record.ciphertext);
  return { ...data, id: record.id };
}

export async function encryptedGetAll<T>(
  table: Table<EncryptedRecord>,
  filter?: (r: EncryptedRecord) => boolean
): Promise<T[]> {
  let collection = table.toCollection();
  
  if (filter) {
    collection = table.filter(filter);
  }
  
  const records = await collection.toArray();
  const key = keyManager.getKey();
  
  const results = await Promise.all(
    records.map(async (r) => {
      const data = await decryptData<T>(key, r.iv, r.ciphertext);
      return { ...data, id: r.id };
    })
  );
  
  return results;
}

export async function encryptedQuery<T>(
  table: Table<EncryptedRecord>,
  profileId: number,
  additionalFilter?: (r: EncryptedRecord) => boolean
): Promise<T[]> {
  // Always filter by profileId to prevent data leakage
  let collection = table.where('profileId').equals(profileId);
  
  if (additionalFilter) {
    collection = collection.filter(additionalFilter);
  }
  
  const records = await collection.toArray();
  const key = keyManager.getKey();
  
  return Promise.all(
    records.map(async (r) => {
      const data = await decryptData<T>(key, r.iv, r.ciphertext);
      return { ...data, id: r.id };
    })
  );
}
