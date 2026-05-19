import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Profile {
  id: number;
  name: string;
  currency: string;
}

interface ProfileState {
  activeProfileId: number | null;
  profiles: Profile[];
  
  // Actions
  setActiveProfileId: (id: number | null) => void;
  setProfiles: (profiles: Profile[]) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      activeProfileId: null,
      profiles: [],

      setActiveProfileId: (id) => set({ activeProfileId: id }),
      setProfiles: (profiles) => set({ profiles }),
    }),
    {
      name: 'vaultspend-profiles', // unique name
      storage: createJSONStorage(() => localStorage),
    }
  )
);
