import type { Income } from '../types';
import { db } from '../db/schema';
import { encryptedPut, encryptedGetAll } from '../crypto/storage';

export async function addIncome(data: Omit<Income, 'id'>): Promise<number> {
  return encryptedPut(db.income, data, {
    date: data.date,
    profileId: data.profileId,
  });
}

export async function updateIncome(id: number, data: Omit<Income, 'id'>): Promise<void> {
  await encryptedPut(db.income, data, {
    id,
    date: data.date,
    profileId: data.profileId,
  });
}

export async function getIncomeForMonth(
  profileId: number,
  year: number,
  month: number
): Promise<Income[]> {
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  const records = await encryptedGetAll<Income>(
    db.income,
    (r) => r.profileId === profileId && r.date !== undefined && r.date >= start && r.date <= end
  );
  return records.sort((a, b) => b.date - a.date);
}

export async function getAllIncome(profileId: number): Promise<Income[]> {
  const records = await encryptedGetAll<Income>(db.income, (r) => r.profileId === profileId);
  return records.sort((a, b) => b.date - a.date);
}

export async function deleteIncome(id: number): Promise<void> {
  await db.income.delete(id);
}
