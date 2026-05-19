import { create } from 'zustand';
import { keyManager } from '../crypto/keyManager';

interface AuthState {
  isLocked: boolean;
  hasPin: boolean;
  pinAttempts: number;
  lockoutUntil: number | null;
  preventAutoLock: boolean;
  
  // Actions
  setLocked: (locked: boolean) => void;
  setPreventAutoLock: (prevent: boolean) => void;
  setHasPin: (hasPin: boolean) => void;
  incrementAttempts: () => void;
  resetAttempts: () => void;
  setLockout: (durationMs: number) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Wire up the key manager lock event to our store
  keyManager.setOnLock(() => {
    set({ isLocked: true });
  });

  return {
    isLocked: true,
    hasPin: false,
    pinAttempts: 0,
    lockoutUntil: null,

    preventAutoLock: false,

    setLocked: (locked) => {
      if (locked) {
        // If we are currently preventing auto-lock, ignore the request to lock
        if (useAuthStore.getState().preventAutoLock) return;
        keyManager.lock();
      }
      set({ isLocked: locked });
    },

    setPreventAutoLock: (prevent) => set({ preventAutoLock: prevent }),

    setHasPin: (hasPin) => set({ hasPin }),

    incrementAttempts: () => set((state) => {
      const nextAttempts = state.pinAttempts + 1;
      return { pinAttempts: nextAttempts };
    }),

    resetAttempts: () => set({ pinAttempts: 0, lockoutUntil: null }),

    setLockout: (durationMs) => set({ 
      lockoutUntil: Date.now() + durationMs 
    }),
  };
});
