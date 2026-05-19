// Global test setup — wire @testing-library/jest-dom matchers
import '@testing-library/jest-dom';

// jsdom ships without Web Crypto. Node 20+ provides it natively; just
// make sure it's on globalThis so crypto.subtle is available in tests.
if (typeof globalThis.crypto === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { webcrypto } = require('crypto');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).crypto = webcrypto;
}
