import type { Category } from '../types';
import { db } from '../db/schema';
import { encryptedPut, encryptedGetAll } from '../crypto/storage';

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food & Dining',    icon: 'Utensils',   color: '#D97A46', profileId: 1, isDefault: true },
  { name: 'Transport',        icon: 'Car',        color: '#706C61', profileId: 1, isDefault: true },
  { name: 'Shopping',         icon: 'ShoppingBag',color: '#9A5E4E', profileId: 1, isDefault: true },
  { name: 'Entertainment',    icon: 'Ticket',     color: '#B85C38', profileId: 1, isDefault: true },
  { name: 'Health',           icon: 'Pill',       color: '#2F8253', profileId: 1, isDefault: true },
  { name: 'Utilities',        icon: 'Zap',        color: '#C68032', profileId: 1, isDefault: true },
  { name: 'Rent / Housing',   icon: 'Home',       color: '#55605A', profileId: 1, isDefault: true },
  { name: 'Education',        icon: 'BookOpen',   color: '#5E8F7A', profileId: 1, isDefault: true },
  { name: 'Personal Care',    icon: 'Heart',      color: '#A34343', profileId: 1, isDefault: true },
  { name: 'Travel',           icon: 'Plane',      color: '#4A5D23', profileId: 1, isDefault: true },
  { name: 'Subscriptions',    icon: 'Music',      color: '#D97A46', profileId: 1, isDefault: true },
  { name: 'Other',            icon: 'Package',    color: '#706C61', profileId: 1, isDefault: true },
];

const CATEGORIES_SEEDED_KEY = 'categories_seeded';

export async function seedDefaultCategories(profileId: number = 1): Promise<void> {
  const seededKey = `${CATEGORIES_SEEDED_KEY}_${profileId}`;
  const already = await db.app_meta.get(seededKey);
  if (already?.value === 'true') return;
  for (const cat of DEFAULT_CATEGORIES) {
    await encryptedPut(db.categories, { ...cat, profileId }, { profileId });
  }
  await db.app_meta.put({ key: seededKey, value: 'true' });
}

export async function getCategories(profileId: number): Promise<Category[]> {
  return encryptedGetAll<Category>(db.categories, (r) => r.profileId === profileId);
}

export async function addCategory(data: Omit<Category, 'id'>): Promise<number> {
  return encryptedPut(db.categories, { ...data, isDefault: false }, { profileId: data.profileId });
}

export async function updateCategory(id: number, data: Omit<Category, 'id'>): Promise<void> {
  await encryptedPut(db.categories, data, { id, profileId: data.profileId });
}

export async function deleteCategory(id: number): Promise<void> {
  await db.categories.delete(id);
}
