import type { FixedExpense } from '../types';
import { db } from '../db/schema';
import { encryptedPut, encryptedGetAll } from '../crypto/storage';

export async function getFixedExpenses(profileId: number): Promise<FixedExpense[]> {
  return encryptedGetAll<FixedExpense>(db.fixed_expenses, (r) => r.profileId === profileId);
}

export async function addFixedExpense(data: Omit<FixedExpense, 'id'>): Promise<number> {
  return encryptedPut(db.fixed_expenses, data, { profileId: data.profileId });
}

export async function updateFixedExpense(id: number, data: Omit<FixedExpense, 'id'>): Promise<void> {
  await encryptedPut(db.fixed_expenses, data, { id, profileId: data.profileId });
}

export async function deleteFixedExpense(id: number): Promise<void> {
  await db.fixed_expenses.delete(id);
}

export async function toggleFixedExpense(fe: FixedExpense): Promise<void> {
  await updateFixedExpense(fe.id, { ...fe, isActive: !fe.isActive });
}
