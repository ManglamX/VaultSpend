import { db } from '../../db/schema';
import { getFixedExpenses } from '../../services/fixedExpenseService';
import { addExpense } from '../../services/expenseService';

export async function shouldPromptAutoAdd(): Promise<boolean> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const record = await db.app_meta.get('lastAutoAddMonth');
  return !record || record.value !== currentMonth;
}

export async function markAutoAddSkipped(): Promise<void> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  await db.app_meta.put({ key: 'lastAutoAddMonth', value: currentMonth });
}

export async function executeAutoAdd(profileId: number): Promise<number> {
  const fixed = await getFixedExpenses(profileId);
  const active = fixed.filter(f => f.isActive);
  
  const now = Date.now();
  for (const f of active) {
     await addExpense({
        profileId,
        amount: f.amount,
        categoryId: f.categoryId,
        date: now,
        note: `Auto-added: ${f.name} (Due ${f.dueDay}th)`,
        paymentMode: f.paymentMode || 'Bank Transfer',
     });
  }
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  await db.app_meta.put({ key: 'lastAutoAddMonth', value: currentMonth });
  return active.length;
}
