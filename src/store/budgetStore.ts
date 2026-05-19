import { create } from 'zustand';
import type { Budget } from '../types';
import { getBudgets } from '../services/budgetService';

interface BudgetState {
  budgets: Budget[];
  isLoading: boolean;
  loadBudgets: (profileId: number) => Promise<void>;
  addBudgetLocal: (budget: Budget) => void;
  updateBudgetLocal: (budget: Budget) => void;
  removeBudgetLocal: (id: number) => void;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  budgets: [],
  isLoading: false,

  loadBudgets: async (profileId) => {
    set({ isLoading: true });
    try {
      const budgets = await getBudgets(profileId);
      set({ budgets, isLoading: false });
    } catch (err) {
      console.error('Failed to load budgets:', err);
      set({ isLoading: false });
    }
  },

  addBudgetLocal: (budget) => set((state) => {
    const exists = state.budgets.findIndex(b => b.categoryId === budget.categoryId);
    if (exists !== -1) {
      const next = [...state.budgets];
      next[exists] = budget;
      return { budgets: next };
    }
    return { budgets: [...state.budgets, budget] };
  }),

  updateBudgetLocal: (budget) => set((state) => ({
    budgets: state.budgets.map((b) => b.id === budget.id ? budget : b),
  })),

  removeBudgetLocal: (id) => set((state) => ({
    budgets: state.budgets.filter((b) => b.id !== id),
  })),
}));
