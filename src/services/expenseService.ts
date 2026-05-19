import type { Expense } from '../types';
import { db } from '../db/schema';
import { encryptedPut, encryptedGetAll } from '../crypto/storage';

export async function addExpense(data: Omit<Expense, 'id'>): Promise<number> {
  return encryptedPut(db.expenses, data, {
    date: data.date,
    categoryId: data.categoryId,
    profileId: data.profileId,
  });
}

export async function updateExpense(id: number, data: Omit<Expense, 'id'>): Promise<void> {
  await encryptedPut(db.expenses, data, {
    id,
    date: data.date,
    categoryId: data.categoryId,
    profileId: data.profileId,
  });
}

export async function getExpensesForMonth(
  profileId: number,
  year: number,
  month: number
): Promise<Expense[]> {
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  const records = await encryptedGetAll<Expense>(
    db.expenses,
    (r) => r.profileId === profileId && r.date !== undefined && r.date >= start && r.date <= end
  );
  return records.sort((a, b) => b.date - a.date);
}

export async function getAllExpenses(profileId: number): Promise<Expense[]> {
  const records = await encryptedGetAll<Expense>(db.expenses, (r) => r.profileId === profileId);
  return records.sort((a, b) => b.date - a.date);
}

export async function deleteExpense(id: number): Promise<void> {
  await db.expenses.delete(id);
}
