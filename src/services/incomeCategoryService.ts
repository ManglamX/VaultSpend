import type { IncomeCategory } from '../types';
import { db } from '../db/schema';
import { encryptedPut, encryptedGetAll } from '../crypto/storage';

const DEFAULT_INCOME_CATEGORIES: Omit<IncomeCategory, 'id'>[] = [
  { name: 'Salary',     icon: 'Briefcase',  color: '#2F8253', profileId: 1, isDefault: true },
  { name: 'Freelance',  icon: 'Monitor',    color: '#D97A46', profileId: 1, isDefault: true },
  { name: 'Business',   icon: 'Building',   color: '#C68032', profileId: 1, isDefault: true },
  { name: 'Investment', icon: 'TrendingUp', color: '#5E8F7A', profileId: 1, isDefault: true },
  { name: 'Gift',       icon: 'Gift',       color: '#B85C38', profileId: 1, isDefault: true },
  { name: 'Refund',     icon: 'CornerDownLeft', color: '#706C61', profileId: 1, isDefault: true },
  { name: 'Rental',     icon: 'Home',       color: '#55605A', profileId: 1, isDefault: true },
  { name: 'Other',      icon: 'Coins',      color: '#9A5E4E', profileId: 1, isDefault: true },
];

const INCOME_CATEGORIES_SEEDED_KEY = 'income_categories_seeded';

export async function seedDefaultIncomeCategories(profileId: number = 1): Promise<void> {
  const seededKey = `${INCOME_CATEGORIES_SEEDED_KEY}_${profileId}`;
  const already = await db.app_meta.get(seededKey);
  if (already?.value === 'true') return;
  for (const cat of DEFAULT_INCOME_CATEGORIES) {
    await encryptedPut(db.income_categories as any, { ...cat, profileId }, { profileId });
  }
  await db.app_meta.put({ key: seededKey, value: 'true' });
}

export async function getIncomeCategories(profileId: number): Promise<IncomeCategory[]> {
  return encryptedGetAll<IncomeCategory>(db.income_categories as any, (r) => r.profileId === profileId);
}

export async function addIncomeCategory(data: Omit<IncomeCategory, 'id'>): Promise<number> {
  return encryptedPut(db.income_categories as any, { ...data, isDefault: false }, { profileId: data.profileId });
}

export async function updateIncomeCategory(id: number, data: Omit<IncomeCategory, 'id'>): Promise<void> {
  await encryptedPut(db.income_categories as any, data, { id, profileId: data.profileId });
}

export async function deleteIncomeCategory(id: number): Promise<void> {
  await db.income_categories.delete(id);
}
