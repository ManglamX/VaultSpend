import { describe, it, expect } from 'vitest';
import { generateInsights } from '../insightsEngine';
import type { Expense, Category, Income, FixedExpense } from '../../../types';

// --- Fixtures ---
const cat: Category = { id: 1, name: 'Food', icon: '🍔', color: '#f97316', profileId: 1 };

function makeExpense(categoryId: number, amount: number, daysAgo = 5): Expense {
  return {
    id: Math.random(),
    categoryId,
    categoryName: 'Food',
    amount,
    date: Date.now() - daysAgo * 86400_000,
    profileId: 1,
    note: '',
    paymentMode: 'Cash',
  };
}

function makeIncome(amount: number): Income {
  return { id: 1, categoryId: 1, amount, date: Date.now(), profileId: 1, note: '' };
}

function makeFixedBill(dueDay: number, amount: number): FixedExpense {
  return {
    id: 1,
    name: 'Netflix',
    amount,
    dueDay,
    categoryId: 1,
    isActive: true,
    notes: '',
    paymentMode: 'Bank Transfer',
    profileId: 1,
  };
}

describe('insightsEngine — generateInsights', () => {
  it('returns empty array when no data', () => {
    const result = generateInsights([], [], [], [], [], '₹');
    expect(result).toEqual([]);
  });

  it('detects >20% spending increase vs last month', () => {
    const currMonth = [makeExpense(1, 1500)]; // this month
    const lastMonth = [makeExpense(1, 1000)]; // last month (+50%)
    const result = generateInsights(currMonth, lastMonth, [cat], [], [], '₹');
    expect(result.some(i => i.type === 'increase')).toBe(true);
    expect(result[0].message).toContain('Food');
  });

  it('detects >20% spending decrease vs last month', () => {
    const currMonth = [makeExpense(1, 500)];
    const lastMonth = [makeExpense(1, 1000)]; // -50%
    const result = generateInsights(currMonth, lastMonth, [cat], [], [], '₹');
    expect(result.some(i => i.type === 'decrease')).toBe(true);
  });

  it('does NOT flag a change below 20%', () => {
    const currMonth = [makeExpense(1, 1050)];
    const lastMonth = [makeExpense(1, 1000)]; // +5%, below threshold
    const result = generateInsights(currMonth, lastMonth, [cat], [], [], '₹');
    expect(result.some(i => i.type === 'increase' || i.type === 'decrease')).toBe(false);
  });

  it('flags high severity when change is >50%', () => {
    const currMonth = [makeExpense(1, 2200)];
    const lastMonth = [makeExpense(1, 1000)]; // +120%
    const result = generateInsights(currMonth, lastMonth, [cat], [], [], '₹');
    const inc = result.find(i => i.type === 'increase');
    expect(inc?.severity).toBe('high');
  });

  it('shows upcoming fixed bill info', () => {
    const tomorrow = new Date().getDate() + 1;
    const result = generateInsights([], [], [], [], [makeFixedBill(tomorrow, 650)], '₹');
    expect(result.some(i => i.type === 'info' && i.message.includes('Netflix'))).toBe(true);
  });

  it('does NOT show past fixed bill', () => {
    const yesterday = new Date().getDate() - 1;
    const result = generateInsights([], [], [], [], [makeFixedBill(yesterday, 650)], '₹');
    expect(result.some(i => i.type === 'info')).toBe(false);
  });

  it('caps output at 3 insights maximum', () => {
    // Create many categories with big swings
    const cats: Category[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1, name: `Cat${i}`, icon: '📦', color: '#333', profileId: 1,
    }));
    const curr = cats.map(c => makeExpense(c.id!, 2000));
    const prev = cats.map(c => makeExpense(c.id!, 500));
    const result = generateInsights(curr, prev, cats, [], [], '₹');
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('high-severity insights sort to the top', () => {
    const currMonth = [makeExpense(1, 2200)]; // +120% → high severity
    const lastMonth = [makeExpense(1, 1000)];
    const income = [makeIncome(100)]; // tiny income → projection warning (high)
    const result = generateInsights(currMonth, lastMonth, [cat], income, [], '₹');
    if (result.length > 1) {
      expect(result[0].severity).toBe('high');
    }
  });
});
