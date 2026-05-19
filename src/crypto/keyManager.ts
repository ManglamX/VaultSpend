/**
 * In-memory key management and auto-lock state
 */

let _activeKey: CryptoKey | null = null;
let _lockTimeout: number | null = null;
let _onLockCallback: (() => void) | null = null;

export const keyManager = {
  setKey(key: CryptoKey, autoLockMs: number) {
    _activeKey = key;
    this.resetTimer(autoLockMs);
  },

  getKey(): CryptoKey {
    if (!_activeKey) {
      throw new Error('APP_LOCKED');
    }
    return _activeKey;
  },

  lock() {
    _activeKey = null;
    if (_lockTimeout) {
      clearTimeout(_lockTimeout);
      _lockTimeout = null;
    }
    if (_onLockCallback) {
      _onLockCallback();
    }
  },

  isLocked(): boolean {
    return _activeKey === null;
  },

  resetTimer(autoLockMs: number) {
    if (_lockTimeout) {
      clearTimeout(_lockTimeout);
    }
    
    // 0 means "Never"
    if (autoLockMs === 0) return;

    _lockTimeout = window.setTimeout(() => {
      this.lock();
    }, autoLockMs);
  },

  setOnLock(callback: () => void) {
    _onLockCallback = callback;
  }
};
