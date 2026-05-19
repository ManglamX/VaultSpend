import { create } from 'zustand';
import type { Income, IncomeCategory } from '../types';
import { getIncomeForMonth } from '../services/incomeService';
import { getIncomeCategories } from '../services/incomeCategoryService';

interface IncomeState {
  income: Income[];
  incomeCategories: IncomeCategory[];
  isLoading: boolean;
  loadIncome: (profileId: number, date: Date) => Promise<void>;
  loadIncomeCategories: (profileId: number) => Promise<void>;
  addIncomeLocal: (item: Income) => void;
  updateIncomeLocal: (item: Income) => void;
  removeIncomeLocal: (id: number) => void;
}

export const useIncomeStore = create<IncomeState>((set) => ({
  income: [],
  incomeCategories: [],
  isLoading: false,

  loadIncome: async (profileId, date) => {
    set({ isLoading: true });
    const attemptLoad = async (retry: boolean) => {
      try {
        const income = await getIncomeForMonth(profileId, date.getFullYear(), date.getMonth());
        set({ income, isLoading: false });
      } catch (err: any) {
        if (err?.message === 'APP_LOCKED' && retry) {
          setTimeout(() => attemptLoad(false), 200);
          return;
        }
        console.error('Failed to load income:', err);
        set({ isLoading: false });
      }
    };
    await attemptLoad(true);
  },

  loadIncomeCategories: async (profileId) => {
    const cats = await getIncomeCategories(profileId);
    set({ incomeCategories: cats });
  },

  addIncomeLocal: (item) => set((s) => ({ income: [item, ...s.income].sort((a, b) => b.date - a.date) })),
  updateIncomeLocal: (item) => set((s) => ({ income: s.income.map((i) => (i.id === item.id ? item : i)) })),
  removeIncomeLocal: (id) => set((s) => ({ income: s.income.filter((i) => i.id !== id) })),
}));
