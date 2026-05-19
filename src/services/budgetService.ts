import type { Budget } from '../types';
import { db } from '../db/schema';
import { encryptedPut, encryptedGetAll } from '../crypto/storage';

export async function getBudgets(profileId: number): Promise<Budget[]> {
  return encryptedGetAll<Budget>(
    db.budgets,
    (r) => r.profileId === profileId
  );
}

export async function addBudget(data: Omit<Budget, 'id'>): Promise<number> {
  return encryptedPut(db.budgets, data, {
    categoryId: data.categoryId,
    profileId: data.profileId,
  });
}

export async function deleteBudget(id: number): Promise<void> {
  await db.budgets.delete(id);
}

export async function updateBudget(
  id: number,
  data: Omit<Budget, 'id'>
): Promise<number> {
  return encryptedPut(db.budgets, data, {
    id,
    categoryId: data.categoryId,
    profileId: data.profileId,
  });
}
