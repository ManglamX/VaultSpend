import { create } from 'zustand';
import type { Expense, Category } from '../types';
import { getExpensesForMonth } from '../services/expenseService';
import { getCategories } from '../services/categoryService';

interface ExpenseState {
  expenses: Expense[];
  categories: Category[];
  isLoading: boolean;
  loadExpenses: (profileId: number, date: Date) => Promise<void>;
  loadCategories: (profileId: number) => Promise<void>;
  addExpenseLocal: (expense: Expense) => void;
  updateExpenseLocal: (expense: Expense) => void;
  removeExpenseLocal: (id: number) => void;
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  expenses: [],
  categories: [],
  isLoading: false,

  loadExpenses: async (profileId, date) => {
    set({ isLoading: true });
    const attemptLoad = async (retry: boolean) => {
      try {
        const expenses = await getExpensesForMonth(profileId, date.getFullYear(), date.getMonth());
        set({ expenses, isLoading: false });
      } catch (err: any) {
        if (err?.message === 'APP_LOCKED' && retry) {
          // Micro-delay and retry once for race conditions on unlock
          setTimeout(() => attemptLoad(false), 200);
          return;
        }
        console.error('Failed to load expenses:', err);
        set({ isLoading: false });
      }
    };
    await attemptLoad(true);
  },

  loadCategories: async (profileId) => {
    const categories = await getCategories(profileId);
    set({ categories });
  },

  addExpenseLocal: (expense) => set((s) => ({
    expenses: [expense, ...s.expenses].sort((a, b) => b.date - a.date),
  })),

  updateExpenseLocal: (expense) => set((s) => ({
    expenses: s.expenses.map((e) => e.id === expense.id ? expense : e).sort((a, b) => b.date - a.date),
  })),

  removeExpenseLocal: (id) => set((s) => ({
    expenses: s.expenses.filter((e) => e.id !== id),
  })),
}));
