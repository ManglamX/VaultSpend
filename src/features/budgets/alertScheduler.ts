import { LocalNotifications } from '@capacitor/local-notifications';
import { db } from '../../db/schema';
import type { Expense, Budget, Category } from '../../types';

function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function wasAlreadySent(catId: number, threshold: 80 | 100): Promise<boolean> {
  const key = `budgetAlert_${catId}_${threshold}_${getMonthKey()}`;
  const rec = await db.app_meta.get(key);
  return !!rec;
}

async function markSent(catId: number, threshold: 80 | 100): Promise<void> {
  const key = `budgetAlert_${catId}_${threshold}_${getMonthKey()}`;
  await db.app_meta.put({ key, value: '1' });
}

export async function checkAndScheduleBudgetAlerts(
  expenses: Expense[],
  budgets: Budget[],
  categories: Category[],
  currency: string
): Promise<void> {
  const { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') {
    const { display: newPerm } = await LocalNotifications.requestPermissions();
    if (newPerm !== 'granted') return;
  }

  // Aggregate this month's spend per category
  const spent: Record<number, number> = {};
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  expenses
    .filter(e => e.date >= monthStart)
    .forEach(e => { spent[e.categoryId] = (spent[e.categoryId] || 0) + e.amount; });

  let notifId = Math.floor(Date.now() / 1000); // unique-enough base

  for (const budget of budgets) {
    const catSpent = spent[budget.categoryId] || 0;
    const cat = categories.find(c => c.id === budget.categoryId);
    const catLabel = cat?.name ?? 'Budget';
    const pct = (catSpent / budget.limit) * 100;

    // 80% warning
    if (pct >= 80 && pct < 100) {
      if (!(await wasAlreadySent(budget.categoryId, 80))) {
        await LocalNotifications.schedule({
          notifications: [{
            id: notifId++,
            title: `⚠️ ${catLabel} budget at ${Math.round(pct)}%`,
            body: `${currency}${catSpent.toLocaleString()} of ${currency}${budget.limit.toLocaleString()} spent`,
            schedule: { at: new Date(Date.now() + 500) },
            extra: { tab: 'budgets' },
          }],
        });
        await markSent(budget.categoryId, 80);
      }
    }

    // 100% exceeded
    if (pct >= 100) {
      if (!(await wasAlreadySent(budget.categoryId, 100))) {
        await LocalNotifications.schedule({
          notifications: [{
            id: notifId++,
            title: `🚨 ${catLabel} budget EXCEEDED`,
            body: `${currency}${catSpent.toLocaleString()} spent — limit was ${currency}${budget.limit.toLocaleString()}`,
            schedule: { at: new Date(Date.now() + 500) },
            extra: { tab: 'budgets' },
          }],
        });
        await markSent(budget.categoryId, 100);
      }
    }
  }
}
