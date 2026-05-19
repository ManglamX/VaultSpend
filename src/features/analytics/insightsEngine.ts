import type { Expense, Category, FixedExpense, Income } from '../../types';

export interface Insight {
  type: 'increase' | 'decrease' | 'warning' | 'info';
  message: string;
  severity?: 'high' | 'medium' | 'low';
}

function sumByCategory(expenses: Expense[], categoryId: number): number {
  return expenses.filter(e => e.categoryId === categoryId).reduce((sum, e) => sum + e.amount, 0);
}

function totalAmount(items: { amount: number }[]): number {
  return items.reduce((sum, i) => sum + i.amount, 0);
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-IN');
}

export function generateInsights(
  currentMonth: Expense[],
  lastMonth: Expense[],
  categories: Category[],
  income: Income[],
  fixed: FixedExpense[],
  currency: string
): Insight[] {
  const insights: Insight[] = [];

  // Insight 1: Month-over-month change per category
  for (const category of categories) {
    const curr = sumByCategory(currentMonth, category.id!);
    const prev = sumByCategory(lastMonth, category.id!);
    if (prev > 0) {
      const change = ((curr - prev) / prev) * 100;
      if (Math.abs(change) >= 20) {
        insights.push({
          type: change > 0 ? 'increase' : 'decrease',
          message: `${category.name} spending is ${Math.abs(change).toFixed(0)}% ${change > 0 ? 'higher' : 'lower'} than last month`,
          severity: change > 50 ? 'high' : 'medium',
        });
      }
    }
  }

  // Insight 2: Projected month-end spend
  const todayDate = new Date();
  const dayOfMonth = todayDate.getDate();
  const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
  const dailyAvg = totalAmount(currentMonth) / dayOfMonth;
  const projected = dailyAvg * daysInMonth;
  const totalInc = totalAmount(income);
  
  if (totalInc > 0 && projected > totalInc * 0.9) {
    insights.push({ 
      type: 'warning', 
      message: `Projected to spend ${currency}${formatAmount(projected)} this month — close to your income`, 
      severity: 'high' 
    });
  }

  // Insight 3: Next upcoming fixed bill
  const today = new Date().getDate();
  const nextBill = fixed
    .filter(f => f.isActive && f.dueDay > today)
    .sort((a, b) => a.dueDay - b.dueDay)[0];
    
  if (nextBill) {
    insights.push({ 
      type: 'info', 
      message: `${nextBill.name} (${currency}${formatAmount(nextBill.amount)}) is due in ${nextBill.dueDay - today} days` 
    });
  }

  // Sort insights: Warning High > Increase High > Others
  insights.sort((a, b) => {
    if (a.severity === 'high' && b.severity !== 'high') return -1;
    if (b.severity === 'high' && a.severity !== 'high') return 1;
    return 0;
  });

  return insights.slice(0, 3); // max 3 insights shown at once
}
