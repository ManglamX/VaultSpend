import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  currency: string;
  autoAddBills: boolean;
  screenshotsEnabled: boolean;
  setCurrency: (curr: string) => void;
  setAutoAddBills: (auto: boolean) => void;
  setScreenshotsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: '₹',
      autoAddBills: true,
      screenshotsEnabled: false,
      setCurrency: (currency) => set({ currency }),
      setAutoAddBills: (autoAddBills) => set({ autoAddBills }),
      setScreenshotsEnabled: (screenshotsEnabled) => set({ screenshotsEnabled }),
    }),
    {
      name: 'vaultspend-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
