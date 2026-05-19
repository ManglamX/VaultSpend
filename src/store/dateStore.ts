import { create } from 'zustand';

interface DateState {
  viewDate: Date;
  offsetMonth: (amount: number) => void;
}

export const useDateStore = create<DateState>((set) => ({
  viewDate: new Date(),
  offsetMonth: (amount) => set((state) => {
    const newDate = new Date(state.viewDate);
    newDate.setMonth(newDate.getMonth() + amount);
    // don't allow going into future months
    if (newDate > new Date()) return state;
    return { viewDate: newDate };
  }),
}));
