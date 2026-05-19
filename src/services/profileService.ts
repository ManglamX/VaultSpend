import type { Profile } from '../store/profileStore';
import { db } from '../db/schema';
import { encryptedPut, encryptedGetAll } from '../crypto/storage';

export async function getProfiles(): Promise<Profile[]> {
  return encryptedGetAll<Profile>(db.profiles, () => true);
}

export async function addProfile(data: Omit<Profile, 'id'>): Promise<number> {
  return encryptedPut(db.profiles, data, {});
}

export async function updateProfile(id: number, data: Omit<Profile, 'id'>): Promise<void> {
  await encryptedPut(db.profiles, data, { id });
}

export async function deleteProfile(id: number): Promise<void> {
  await db.profiles.delete(id);
}
