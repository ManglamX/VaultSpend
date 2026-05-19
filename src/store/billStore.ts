import { create } from 'zustand';
import type { Bill } from '../types';
import { getBills } from '../services/billService';

interface BillState {
  bills: Bill[];
  isLoading: boolean;
  loadBills: (profileId: number) => Promise<void>;
  addBillLocal: (bill: Bill) => void;
  updateBillLocal: (bill: Bill) => void;
  removeBillLocal: (id: number) => void;
}

export const useBillStore = create<BillState>((set) => ({
  bills: [],
  isLoading: false,

  loadBills: async (profileId) => {
    set({ isLoading: true });
    const attemptLoad = async (retry: boolean) => {
      try {
        const bills = await getBills(profileId);
        set({ bills, isLoading: false });
      } catch (err: any) {
        if (err?.message === 'APP_LOCKED' && retry) {
          setTimeout(() => attemptLoad(false), 250);
          return;
        }
        set({ isLoading: false });
      }
    };
    await attemptLoad(true);
  },

  addBillLocal: (bill) => set((s) => ({
    bills: [...s.bills, bill].sort((a, b) => a.dueDate - b.dueDate),
  })),

  updateBillLocal: (bill) => set((s) => ({
    bills: s.bills.map((b) => b.id === bill.id ? bill : b).sort((a, b) => a.dueDate - b.dueDate),
  })),

  removeBillLocal: (id) => set((s) => ({
    bills: s.bills.filter((b) => b.id !== id),
  })),
}));
