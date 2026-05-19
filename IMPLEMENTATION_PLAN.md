# VaultSpend — Phase-by-Phase Implementation Plan

> **How to build this app, step by step.**
> This plan follows the 6 phases defined in the PRD (`VaultSpend_PRD.docx`) and expands every phase into concrete, ordered implementation steps with code patterns, file locations, and acceptance criteria.
>
> Read this alongside `README.md` (developer setup) and `VaultSpend_PRD.docx` (full feature spec).

---

## Navigation

- [Phase 0 — Foundation & Infrastructure](#phase-0--foundation--infrastructure)
- [Phase 1 — Core MVP](#phase-1--core-mvp)
- [Phase 2 — Analytics & Budget Engine](#phase-2--analytics--budget-engine)
- [Phase 3 — Power UX](#phase-3--power-ux)
- [Phase 4 — Polish & Native Features](#phase-4--polish--native-features)
- [Phase 5 — QA, Performance & Release](#phase-5--qa-performance--release)
- [Cross-Phase Rules](#cross-phase-rules)
- [Definition of Done](#definition-of-done)

---

## Phase 0 — Foundation & Infrastructure

**Goal:** A runnable shell that proves the full stack works end-to-end — Vite builds, Capacitor wraps, Dexie opens, encryption round-trips, PIN gate renders.

No user-visible features ship here. Everything built in Phase 0 is the bedrock every subsequent phase rests on.

---

### Step 0.1 — Repository & Tooling Scaffold

**What to do:**

1. Create the project with Vite + React + TypeScript template:
   ```bash
   npm create vite@latest vaultspend -- --template react-ts
   cd vaultspend
   ```

2. Install all production dependencies in one shot:
   ```bash
   npm install \
     @ionic/react @ionic/react-router \
     @capacitor/core @capacitor/android \
     @capacitor/camera @capacitor/filesystem \
     @capacitor/local-notifications @capacitor/haptics \
     @capacitor-community/biometric-auth \
     dexie zustand react-router-dom \
     react-hook-form zod @hookform/resolvers \
     chart.js react-chartjs-2 \
     xlsx date-fns dompurify lucide-react \
     clsx tailwind-merge
   ```

3. Install all dev dependencies:
   ```bash
   npm install -D \
     tailwindcss postcss autoprefixer \
     vite-plugin-pwa workbox-window \
     vitest @vitest/coverage-v8 \
     @testing-library/react @testing-library/user-event \
     @testing-library/jest-dom \
     fake-indexeddb \
     playwright @playwright/test \
     eslint @eslint/js typescript-eslint \
     prettier eslint-config-prettier \
     husky lint-staged \
     @types/dompurify
   ```

4. Initialize Tailwind:
   ```bash
   npx tailwindcss init -p
   ```

5. Initialize Capacitor:
   ```bash
   npx cap init VaultSpend com.vaultspend.app --web-dir dist
   npx cap add android
   ```

6. Set up Husky pre-commit hooks:
   ```bash
   npx husky init
   echo "npx lint-staged" > .husky/pre-commit
   ```

**Files to create/configure:**
- `vite.config.ts` — enable `@vitejs/plugin-react`, `vite-plugin-pwa`
- `tailwind.config.ts` — add `content` paths for `src/**`
- `tsconfig.json` — set `strict: true`, `noUncheckedIndexedAccess: true`
- `capacitor.config.ts` — set `appId`, `appName`, `webDir: 'dist'`
- `.eslintrc` / `eslint.config.js` — TypeScript + React rules
- `.prettierrc` — consistent formatting rules
- `lint-staged.config.js` — run eslint + prettier on staged files
- `.gitignore` — add `android/`, `dist/`, `node_modules/`, `*.jks`

**Acceptance criteria:**
- `npm run dev` starts without errors
- `npm run build` produces a `dist/` folder
- `npx cap sync` completes without errors
- ESLint passes on the empty project
- Husky fires on `git commit`

---

### Step 0.2 — Ionic + Tailwind Integration

**What to do:**

1. Import Ionic CSS in `src/main.tsx`:
   ```typescript
   import '@ionic/react/css/core.css';
   import '@ionic/react/css/normalize.css';
   import '@ionic/react/css/structure.css';
   import '@ionic/react/css/typography.css';
   import '@ionic/react/css/padding.css';
   import '@ionic/react/css/flex-utils.css';
   import '@ionic/react/css/display.css';
   import './index.css'; // Tailwind
   ```

2. Call `setupIonicReact()` before render:
   ```typescript
   import { setupIonicReact } from '@ionic/react';
   setupIonicReact({ mode: 'md' }); // Force Material Design on all Android
   ```

3. Wrap root in `<IonApp>`:
   ```typescript
   root.render(
     <React.StrictMode>
       <IonApp>
         <App />
       </IonApp>
     </React.StrictMode>
   );
   ```

4. Configure Tailwind to coexist with Ionic (add Ionic CSS variables as Tailwind theme extensions in `tailwind.config.ts`).

**Acceptance criteria:**
- Ionic components render correctly in browser
- Tailwind utility classes work alongside Ionic classes
- No CSS specificity conflicts on buttons, inputs, cards

---

### Step 0.3 — Dexie Database Schema

**What to do:**

1. Create `src/db/schema.ts` with the full schema matching the PRD (Section 3.3):

   ```typescript
   import Dexie, { Table } from 'dexie';

   export interface EncryptedRecord {
     id?: number;
     date?: number;        // Unix ms — indexed, not sensitive
     categoryId?: number;  // indexed, not sensitive
     profileId?: number;   // indexed, not sensitive
     iv: Uint8Array;
     ciphertext: Uint8Array;
   }

   export interface AppMeta {
     key: string;
     value: string; // plaintext — salt, schemaVersion only
   }

   export class VaultSpendDB extends Dexie {
     profiles!: Table<EncryptedRecord>;
     expenses!: Table<EncryptedRecord>;
     fixed_expenses!: Table<EncryptedRecord>;
     income!: Table<EncryptedRecord>;
     budgets!: Table<EncryptedRecord>;
     categories!: Table<EncryptedRecord>;
     settings!: Table<EncryptedRecord>;
     receipts!: Table<EncryptedRecord>;
     app_meta!: Table<AppMeta>;

     constructor() {
       super('VaultSpendDB');
       this.version(1).stores({
         profiles:       '++id',
         expenses:       '++id, date, categoryId, profileId',
         fixed_expenses: '++id, profileId',
         income:         '++id, date, profileId',
         budgets:        '++id, categoryId, profileId',
         categories:     '++id, profileId',
         settings:       '++id',
         receipts:       '++id, expenseId',
         app_meta:       'key',
       });
     }
   }

   export const db = new VaultSpendDB();
   ```

2. Create `src/db/migrations.ts` — empty for v1, but establish the pattern for future schema upgrades using `this.version(N).upgrade()`.

**Acceptance criteria:**
- `db` opens without errors in the browser console
- All 9 tables are visible in Chrome DevTools → Application → IndexedDB
- `db.app_meta.put({ key: 'schemaVersion', value: '1' })` succeeds

---

### Step 0.4 — Web Crypto Encryption Module

This is the most critical module in the entire codebase. Build it as a pure, side-effect-free utility layer with 100% test coverage.

**What to do:**

1. Create `src/crypto/keyDerivation.ts`:

   ```typescript
   // Derive a 256-bit AES-GCM key from a PIN using PBKDF2
   export async function deriveKey(
     pin: string,
     salt: Uint8Array
   ): Promise<CryptoKey> {
     const enc = new TextEncoder();
     const keyMaterial = await crypto.subtle.importKey(
       'raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']
     );
     return crypto.subtle.deriveKey(
       {
         name: 'PBKDF2',
         salt,
         iterations: 310_000,
         hash: 'SHA-256',
       },
       keyMaterial,
       { name: 'AES-GCM', length: 256 },
       false,         // non-extractable
       ['encrypt', 'decrypt']
     );
   }

   export function generateSalt(): Uint8Array {
     return crypto.getRandomValues(new Uint8Array(16));
   }
   ```

2. Create `src/crypto/encryption.ts`:

   ```typescript
   export async function encryptData(
     key: CryptoKey,
     plaintext: unknown
   ): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
     const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
     const enc = new TextEncoder();
     const encoded = enc.encode(JSON.stringify(plaintext));
     const ciphertext = new Uint8Array(
       await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
     );
     return { iv, ciphertext };
   }

   export async function decryptData<T>(
     key: CryptoKey,
     iv: Uint8Array,
     ciphertext: Uint8Array
   ): Promise<T> {
     const dec = new TextDecoder();
     const plaintext = await crypto.subtle.decrypt(
       { name: 'AES-GCM', iv }, key, ciphertext
     );
     return JSON.parse(dec.decode(plaintext)) as T;
   }
   ```

3. Create `src/crypto/keyManager.ts` — in-memory singleton that holds the active `CryptoKey`, exposes `lock()` / `unlock(pin)`, and integrates with the auto-lock timer:

   ```typescript
   // Key never touches storage — lives only in memory
   let _activeKey: CryptoKey | null = null;
   let _lockTimer: ReturnType<typeof setTimeout> | null = null;

   export const keyManager = {
     setKey(key: CryptoKey, timeoutMs: number) { ... },
     getKey(): CryptoKey { ... },  // throws if locked
     lock() { _activeKey = null; },
     isLocked(): boolean { return _activeKey === null; },
     resetTimer(timeoutMs: number) { ... },
   };
   ```

4. Create `src/crypto/verifier.ts` — store an AES-GCM encrypted known-plaintext in `app_meta` at PIN setup. On unlock, attempt to decrypt it. Failure = wrong PIN:

   ```typescript
   const TEST_VECTOR = 'VAULTSPEND_OK';

   export async function storeVerifier(key: CryptoKey): Promise<void> { ... }
   export async function verifyKey(key: CryptoKey): Promise<boolean> { ... }
   ```

5. Write unit tests in `src/crypto/__tests__/encryption.test.ts`:
   - Round-trip: `encrypt → decrypt` produces original object
   - Wrong key: `decrypt` with different key throws `DOMException`
   - Different IV each call: two encryptions of identical plaintext produce different ciphertext
   - `deriveKey` with same PIN + salt produces functionally equivalent keys

**Acceptance criteria:**
- All crypto tests pass with `npm run test`
- Encrypt + decrypt round-trip < 20 ms for a 1 KB payload (measured in test)
- Wrong-key decryption always throws — never silently returns garbage

---

### Step 0.5 — Zustand Stores (Skeleton)

**What to do:**

Create the three root stores with their initial shapes. No business logic yet — just types and initial state:

1. `src/store/authStore.ts`:
   ```typescript
   interface AuthState {
     isLocked: boolean;
     hasPin: boolean;
     pinAttempts: number;
     lockoutUntil: number | null;
   }
   ```

2. `src/store/profileStore.ts`:
   ```typescript
   interface ProfileState {
     activeProfileId: number | null;
     profiles: { id: number; name: string }[];
   }
   ```

3. `src/store/settingsStore.ts`:
   ```typescript
   interface SettingsState {
     theme: 'light' | 'dark' | 'system';
     currency: string;    // ISO 4217 code e.g. 'INR'
     autoLockMs: number;
     recurringAutoAdd: boolean;
   }
   ```

**Acceptance criteria:**
- All three stores importable and usable in a test component
- `useAuthStore()` returns `isLocked: true` on initial load (app always starts locked)

---

### Step 0.6 — App Shell & Routing Skeleton

**What to do:**

1. Create `src/components/layout/AppShell.tsx` — the root component that conditionally renders either the `LockScreen` or the main `TabNavigation` based on `authStore.isLocked`.

2. Create `src/components/layout/TabNavigation.tsx` — `IonTabs` with 5 tab routes:
   - `/dashboard`
   - `/expenses`
   - `/analytics`
   - `/budgets`
   - `/settings`

3. Create stub page components for each tab in `src/features/*/`:
   - Each stub renders an `<IonPage>` with an `<IonHeader>` and the page title
   - No real content yet

4. Create `src/features/auth/LockScreen.tsx` — static PIN entry UI (not wired up yet):
   - 4-digit PIN pad grid
   - Locked padlock icon
   - "Enter PIN" label

5. Set up React Router in `main.tsx` wrapping with `<IonReactRouter>`.

**Acceptance criteria:**
- All 5 tabs navigate without errors
- Browser back/forward works correctly
- Lock screen renders on `/lock` route
- Hot reload (HMR) works without full page refresh

---

### Step 0.7 — PWA Manifest & Service Worker

**What to do:**

1. Configure `vite-plugin-pwa` in `vite.config.ts`:

   ```typescript
   VitePWA({
     registerType: 'autoUpdate',
     injectRegister: 'auto',
     strategies: 'injectManifest',
     srcDir: 'src',
     filename: 'sw.ts',
     workbox: {
       globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
       cleanupOutdatedCaches: true,
       clientsClaim: true,
     },
     manifest: {
       name: 'VaultSpend',
       short_name: 'VaultSpend',
       description: 'Privacy-first offline expense tracker',
       display: 'standalone',
       orientation: 'portrait',
       background_color: '#111827',
       theme_color: '#1A56DB',
       start_url: '/',
       icons: [
         { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
         { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
         { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
       ],
     },
   })
   ```

2. Create placeholder app icons at `public/icons/` (192×192, 512×512, maskable).

3. Request persistent storage on app startup (prevents browser from evicting IndexedDB):
   ```typescript
   if (navigator.storage?.persist) {
     await navigator.storage.persist();
   }
   ```

**Acceptance criteria:**
- Lighthouse PWA audit score ≥ 90 on `npm run preview`
- "Add to Home Screen" prompt appears in Chrome on Android
- App loads fully with DevTools → Network set to "Offline"
- `navigator.storage.persisted()` returns `true` after first launch

---

**Phase 0 Complete when:**
- [ ] Project scaffolded, all dependencies installed
- [ ] Ionic + Tailwind render correctly together
- [ ] Dexie opens with all 9 tables
- [ ] Encrypt → decrypt round-trip works and is tested
- [ ] All three Zustand stores initialized
- [ ] 5-tab shell routes without errors
- [ ] PWA installs from browser and works offline
- [ ] `npm run build && npx cap sync` completes cleanly

---

## Phase 1 — Core MVP

**Goal:** A fully functional, encrypted expense tracker. A real user can install it, set a PIN, add daily expenses, add fixed monthly bills, record income, and see their data on a dashboard. All data is encrypted. CSV export works.

---

### Step 1.1 — PIN Setup & Lock Screen (Auth Flow)

**What to do:**

1. **First-launch detection** in `AppShell.tsx`:
   ```typescript
   const hasMeta = await db.app_meta.get('salt');
   if (!hasMeta) navigate('/onboarding/pin-setup');
   else useAuthStore.setState({ isLocked: true, hasPin: true });
   ```

2. **PIN Setup screen** (`src/features/auth/PinSetup.tsx`):
   - Step 1: Enter new PIN (4–6 digits, `IonInput` type="password")
   - Step 2: Confirm PIN (must match)
   - On confirm:
     1. `generateSalt()` → store in `app_meta.salt` (plaintext, base64 encoded)
     2. `deriveKey(pin, salt)` → get `CryptoKey`
     3. `storeVerifier(key)` → encrypted known-plaintext in `app_meta.verifier`
     4. Store `schemaVersion: '1'` in `app_meta`
     5. `keyManager.setKey(key, autoLockMs)` → in-memory
     6. Navigate to dashboard

3. **Lock Screen** (`src/features/auth/LockScreen.tsx`):
   - Numpad grid (digits 0–9 + backspace)
   - On 6-digit entry (or submit tap):
     1. Read `app_meta.salt`, decode to `Uint8Array`
     2. `deriveKey(enteredPin, salt)`
     3. `verifyKey(derivedKey)` → if false, increment attempt counter
     4. Exponential backoff: after 3 failures → 30 s lockout, after 6 → 5 min, after 9 → 30 min
     5. On success: `keyManager.setKey(key, autoLockMs)` → navigate to dashboard

4. **Auto-lock integration**:
   - Listen to `Capacitor App` plugin's `appStateChange` event
   - On `isActive: false` (app backgrounded): start lock timer
   - On timer expiry or `isActive: true` again after timeout: call `keyManager.lock()` + `navigate('/lock')`

**Acceptance criteria:**
- New user can set PIN and reach dashboard
- Wrong PIN increments counter and shows remaining attempts
- Correct PIN unlocks and shows dashboard
- Backgrounding app for > timeout duration triggers lock on return
- PIN entry is not visible in Android recent apps screenshot (set `FLAG_SECURE`)

---

### Step 1.2 — Category Management

Categories must exist before expenses can be created. Build this first.

**What to do:**

1. Define the `Category` plaintext interface:
   ```typescript
   interface Category {
     id?: number;
     profileId: number;
     name: string;
     icon: string;        // Lucide icon name as string
     color: string;       // hex color e.g. '#E3A008'
     isDefault: boolean;
   }
   ```

2. Create `src/crypto/storage.ts` — the encrypted read/write wrapper used by ALL feature modules:
   ```typescript
   export async function encryptedPut<T>(
     table: Table<EncryptedRecord>,
     data: T,
     meta?: Partial<EncryptedRecord>  // indexed fields
   ): Promise<number> {
     const key = keyManager.getKey();
     const { iv, ciphertext } = await encryptData(key, data);
     return table.put({ ...meta, iv, ciphertext });
   }

   export async function encryptedGet<T>(
     table: Table<EncryptedRecord>,
     id: number
   ): Promise<T | null> {
     const record = await table.get(id);
     if (!record) return null;
     const key = keyManager.getKey();
     return decryptData<T>(key, record.iv, record.ciphertext);
   }

   export async function encryptedGetAll<T>(
     table: Table<EncryptedRecord>,
     filter?: (r: EncryptedRecord) => boolean
   ): Promise<T[]> { ... }
   ```

3. Seed 12 default categories on first launch (Food, Transport, Housing, Utilities, Entertainment, Health, Shopping, Education, Travel, Personal, Subscriptions, Other) — each with a distinct Lucide icon name and color hex.

4. Build `src/features/settings/CategoryManager.tsx`:
   - List of categories with icon, name, color swatch
   - "Add Category" → bottom sheet form (name + icon picker + color picker)
   - Long-press or swipe to edit/delete (cannot delete if expenses reference it)

**Acceptance criteria:**
- 12 default categories present on first launch
- User can add, edit, delete custom categories
- Category data is encrypted in IndexedDB (verify via DevTools hex values)

---

### Step 1.3 — Daily Expense CRUD

**What to do:**

1. Define `Expense` interface:
   ```typescript
   interface Expense {
     id?: number;
     profileId: number;
     amount: number;         // in smallest currency unit (paise for INR)
     categoryId: number;
     date: number;           // Unix ms
     notes: string;
     tags: string[];
     isRecurring: boolean;
     recurringRule?: RecurringRule;
   }
   ```

2. Build `src/features/expenses/ExpenseList.tsx`:
   - `IonList` with `IonItem` per expense
   - Shows: formatted amount, category icon+name, relative date, notes truncated
   - `IonItemSliding` for swipe-to-delete
   - Pull-to-refresh via `IonRefresher`
   - Infinite scroll via `IonInfiniteScroll` (load 30 at a time)

3. Build `src/features/expenses/ExpenseForm.tsx` (React Hook Form + Zod):
   ```typescript
   const expenseSchema = z.object({
     amount: z.number().positive().max(10_000_000),
     categoryId: z.number().int().positive(),
     date: z.number(),
     notes: z.string().max(500),
     tags: z.array(z.string()),
   });
   ```
   - Rendered as `IonModal` bottom sheet (not full-page)
   - Amount: custom numpad component (faster than native keyboard)
   - Category: horizontal chip scroll list
   - Date: `IonDatetime` picker (defaults to today)
   - Notes: `IonTextarea`

4. Build `src/components/layout/QuickAddFAB.tsx`:
   - `IonFab` fixed bottom-right
   - Opens `ExpenseForm` in minimal mode (amount + category only)
   - 3-tap flow: numpad → category chip → Save button

5. Wire CRUD operations via `encryptedPut` / `encryptedGet` / `encryptedGetAll` / `db.expenses.delete(id)`.

6. Add `Capacitor.Haptics.impact()` on save and `Capacitor.Haptics.notification('ERROR')` on validation failure.

**Acceptance criteria:**
- Expense can be added in ≤ 3 taps from any screen
- Amount stored as integer (avoid floating-point precision bugs)
- Notes field sanitized via `DOMPurify.sanitize()` before storage
- Swipe-to-delete works with undo toast (5 s window)
- All records encrypted — IndexedDB shows only binary blobs

---

### Step 1.4 — Fixed Monthly Expenses

**What to do:**

1. Define `FixedExpense` interface:
   ```typescript
   interface FixedExpense {
     id?: number;
     profileId: number;
     name: string;
     amount: number;
     dueDay: number;      // 1–28
     categoryId: number;
     isActive: boolean;
     notes: string;
   }
   ```

2. Build `src/features/fixed/FixedExpenseList.tsx`:
   - Cards showing name, amount, due day, category, active toggle
   - Add/edit via bottom sheet form
   - Inactive bills visually dimmed

3. **Auto-add logic** in `src/features/fixed/autoAdd.ts`:
   - On app open, read `app_meta.lastAutoAddMonth`
   - If current month ≠ stored month:
     - Fetch all active fixed expenses for current profile
     - Show confirmation bottom sheet: "Add N recurring bills for [Month]?"
     - On confirm: bulk `encryptedPut` all to `expenses` table with today's date
     - Update `app_meta.lastAutoAddMonth` to current month

**Acceptance criteria:**
- User can add/edit/toggle/delete fixed expenses
- Auto-add prompt appears exactly once per calendar month
- Auto-add can be skipped (user says "No") and re-triggered from settings
- Due day `29`, `30`, `31` not available (prevents invalid-date issues in short months)

---

### Step 1.5 — Income Tracking

**What to do:**

1. Define `Income` interface:
   ```typescript
   interface Income {
     id?: number;
     profileId: number;
     amount: number;
     source: string;
     date: number;
     notes: string;
     isRecurring: boolean;
   }
   ```

2. Build `src/features/income/IncomeList.tsx` and `IncomeForm.tsx` — same pattern as expenses (list + bottom-sheet form).

3. Add an "Add Income" button to the dashboard summary card for the empty-income state.

**Acceptance criteria:**
- Multiple income sources per month recordable
- Income entries stored encrypted
- `totalIncome - totalExpenses = netSavings` computes correctly

---

### Step 1.6 — Dashboard

**What to do:**

Build `src/features/dashboard/Dashboard.tsx` as an `IonContent` scrollable page composed of widget components:

1. **`MonthSummaryCard`** — Reads all expenses + income for current month from IndexedDB, decrypts each, computes totals:
   - Total Income (formatted with currency)
   - Total Spent
   - Net Savings (Income − Spent)
   - Savings Rate % (Savings ÷ Income × 100)

2. **`RecentTransactions`** — Last 10 expenses ordered by `date` DESC:
   - Category icon (Lucide), category name, amount, relative date string (`date-fns/formatRelative`)
   - Tap to open edit form

3. **`TopCategoryWidget`** — Aggregate current month expenses by categoryId, find max, display category name + icon + % of total.

4. **`BudgetProgressList`** — Placeholder (no budgets yet; shows "Set up budgets" CTA). Wire up in Phase 2.

5. **`TrendSparkline`** — Placeholder (wire up in Phase 2 with Chart.js).

**Performance note:** The dashboard aggregates over potentially hundreds of records. Decrypt all on first load, cache decrypted results in a `useDashboardData` hook using `useRef` with a stale-while-revalidate pattern. Do NOT re-decrypt on every render.

**Acceptance criteria:**
- Dashboard reflects correct totals for current month
- Adding an expense updates dashboard without full reload (Zustand reactive update)
- Dashboard renders in < 200 ms with 500 records (measure with React DevTools Profiler)
- Shows sensible empty state on first launch (no data yet)

---

### Step 1.7 — CSV Export

**What to do:**

1. Create `src/features/export/csvExport.ts`:
   ```typescript
   export async function exportExpensesCSV(profileId: number): Promise<void> {
     const expenses = await getAllDecryptedExpenses(profileId);
     const categories = await getAllDecryptedCategories(profileId);
     const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

     const rows = expenses.map(e => [
       formatDate(e.date),
       catMap[e.categoryId] ?? 'Unknown',
       (e.amount / 100).toFixed(2),
       e.notes,
       e.tags.join(';'),
     ]);

     const csv = [
       ['Date', 'Category', 'Amount', 'Notes', 'Tags'],
       ...rows,
     ].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

     const fileName = `vaultspend-export-${Date.now()}.csv`;
     await writeFile(fileName, csv); // Capacitor Filesystem
   }
   ```

2. Add "Export CSV" button to Settings screen.

3. Use `@capacitor/filesystem` to write to `Directory.Downloads`.

4. Trigger Android share sheet via `@capacitor/share` after write.

**Acceptance criteria:**
- CSV opens correctly in Google Sheets / Excel
- All amounts are decimal (not integer paise)
- Special characters in notes/tags escaped correctly
- File saved to Downloads and accessible from Files app

---

### Step 1.8 — Settings Screen (Basic)

**What to do:**

Build `src/features/settings/Settings.tsx` with sections:

1. **Profile** — Profile name, currency selector (`IonSelect` with 150+ ISO 4217 options)
2. **Security** — Change PIN (requires current PIN), Auto-lock timeout (`IonSelect`)
3. **Data** — Category Manager link, Auto-add toggle, Export CSV button
4. **Danger Zone** — "Wipe All Data" (requires PIN + two confirmations)

**Acceptance criteria:**
- Currency change immediately reformats all amounts on dashboard
- PIN change works: derives new key, re-encrypts all records atomically (Dexie transaction)
- Data wipe completely clears IndexedDB and reloads app to onboarding

---

**Phase 1 Complete when:**
- [ ] PIN setup, lock, unlock, auto-lock all working
- [ ] 12 default categories seeded and manageable
- [ ] Daily expense add/edit/delete working and encrypted
- [ ] Quick-add FAB: expense added in ≤ 3 taps
- [ ] Fixed monthly expenses with auto-add prompt
- [ ] Income entries recordable
- [ ] Dashboard shows correct monthly totals
- [ ] CSV export writes to Downloads
- [ ] Settings: currency, PIN change, data wipe
- [ ] `npm run test` passes all unit tests

---

## Phase 2 — Analytics & Budget Engine

**Goal:** Turn raw data into insight. Chart.js visualizations, the budget limit system, and push notification alerts for overspending.

---

### Step 2.1 — Data Aggregation Layer

Before building charts, build the data computation functions that all charts share.

**What to do:**

Create `src/features/analytics/aggregations.ts` with pure functions (no side effects, fully testable):

```typescript
// All functions take decrypted arrays as input — no DB calls inside

export function expensesByCategory(
  expenses: Expense[],
  categories: Category[]
): CategoryTotal[] { ... }

export function monthlyTotals(
  expenses: Expense[],
  monthCount: number   // how many past months to include
): MonthTotal[] { ... }

export function incomeVsExpenses(
  expenses: Expense[],
  income: Income[],
  monthCount: number
): IncomeExpenseMonth[] { ... }

export function savingsRate(
  totalIncome: number,
  totalExpenses: number
): number { ... }  // returns 0–100

export function topCategories(
  expenses: Expense[],
  categories: Category[],
  limit: number
): CategoryTotal[] { ... }
```

Write unit tests for every aggregation function in `src/features/analytics/__tests__/aggregations.test.ts` with realistic fixture data.

**Acceptance criteria:**
- All aggregation functions have unit tests with edge cases (empty arrays, zero income, single month)
- Functions are pure — same input always produces same output
- No encryption/decryption inside aggregation functions

---

### Step 2.2 — Chart Components

**What to do:**

1. Register only the Chart.js components you use (tree-shaking):
   ```typescript
   import { Chart, ArcElement, LineElement, BarElement,
            CategoryScale, LinearScale, PointElement,
            Tooltip, Legend, Filler } from 'chart.js';
   Chart.register(ArcElement, LineElement, BarElement,
                  CategoryScale, LinearScale, PointElement,
                  Tooltip, Legend, Filler);
   ```

2. Build `src/components/charts/CategoryPieChart.tsx`:
   - Doughnut chart (hole in center shows total amount)
   - Colors from each category's stored color hex
   - Touch-tap to highlight a segment and show category details below chart
   - Legend below chart (not inside)

3. Build `src/components/charts/MonthlyTrendLine.tsx`:
   - Line chart with fill, last 6 months on X axis
   - Single dataset: total spend per month
   - Formatted currency labels on Y axis

4. Build `src/components/charts/IncomeExpensesBar.tsx`:
   - Grouped bar chart: Income (green) vs Expenses (red) per month
   - Last 6 months
   - Gap between bars via `barPercentage` and `categoryPercentage` settings

5. Wire all charts to real data via the aggregation layer. All data is decrypted once per Analytics screen mount, passed as props to chart components.

6. Add sparkline to Dashboard (`TrendSparkline`) — a compact version of `MonthlyTrendLine` with no axes, just the shape.

**Acceptance criteria:**
- Charts render in < 300 ms with 12 months of data
- Charts respond to touch (tap segment shows data)
- Charts re-render when expenses are added without navigating away
- Charts adapt correctly to light and dark mode (Ionic CSS variable colors)
- Empty state shown when no data (not a broken empty chart)

---

### Step 2.3 — Budget Engine

**What to do:**

1. Define `Budget` interface:
   ```typescript
   interface Budget {
     id?: number;
     profileId: number;
     categoryId: number;
     monthlyLimit: number;   // in smallest currency unit
     alertAt: number;        // percentage (e.g. 80)
     rollover: boolean;      // carry unspent amount to next month
   }
   ```

2. Build `src/features/budgets/BudgetManager.tsx`:
   - List of categories with budget limit (or "No limit" if not set)
   - Tap a category → set/edit monthly limit
   - Toggle rollover per budget

3. Build `src/features/budgets/budgetEngine.ts`:
   ```typescript
   export function getBudgetStatus(
     spent: number,
     limit: number
   ): 'ok' | 'warning' | 'exceeded' {
     const pct = (spent / limit) * 100;
     if (pct >= 100) return 'exceeded';
     if (pct >= 80) return 'warning';
     return 'ok';
   }

   export function checkBudgetAlerts(
     categories: Category[],
     budgets: Budget[],
     expenses: Expense[],
     month: number  // Unix ms of first day of month
   ): BudgetAlert[] { ... }
   ```

4. Wire budget progress bars in Dashboard's `BudgetProgressList` widget:
   - Green bar < 80%, amber 80–100%, red > 100%
   - Shows "₹X of ₹Y" below bar

5. Add budget overview chart to Analytics screen: **Planned vs Actual** horizontal bar chart (Chart.js horizontal `bar` type):
   - One bar pair per category that has a budget set
   - Budget limit bar (outline) + spent bar (filled)

**Acceptance criteria:**
- Budget limits persist across app restarts (encrypted in `budgets` table)
- Dashboard progress bars update in real-time when expense added
- Categories without a budget show no bar (not a zero bar)
- Rollover budget correctly adds last month's remainder to this month's limit

---

### Step 2.4 — Push Notification Alerts

**What to do:**

1. Request notification permission on first budget creation:
   ```typescript
   import { LocalNotifications } from '@capacitor/local-notifications';
   await LocalNotifications.requestPermissions();
   ```

2. Create `src/features/budgets/alertScheduler.ts`:
   - After every expense is saved, call `checkBudgetAlerts()`
   - If any category crosses 80% → schedule a local notification for the affected category
   - If any category crosses 100% → schedule a second notification
   - De-duplicate: if notification for this category+month+threshold already sent (track in `app_meta`), skip

3. Notification format:
   - 80% alert: "⚠️ Food budget at 82% — ₹1,640 of ₹2,000 spent"
   - 100% alert: "🚨 Food budget exceeded — ₹2,340 spent, limit ₹2,000"

**Acceptance criteria:**
- Notification appears within 1 second of budget threshold crossing
- Notification only fires once per category per threshold per month
- Tapping notification navigates to the Budgets tab

---

**Phase 2 Complete when:**
- [ ] Pie/Donut chart for category distribution working
- [ ] Monthly trend line for last 6 months working
- [ ] Income vs Expenses grouped bar chart working
- [ ] Dashboard sparkline wired to real data
- [ ] Budget limits CRUD with encrypted storage
- [ ] Dashboard progress bars (green/amber/red)
- [ ] Planned vs Actual chart in Analytics
- [ ] Push notifications at 80% and 100% thresholds
- [ ] All aggregation functions covered by unit tests

---

## Phase 3 — Power UX

**Goal:** Make the app genuinely powerful for serious users. Search, filters, tags, recurring automation, full Excel export, and encrypted backup/restore.

---

### Step 3.1 — Search & Filter Engine

**What to do:**

1. Create `src/features/expenses/filters.ts`:
   ```typescript
   export interface ExpenseFilters {
     search: string;            // full-text on notes field
     categoryIds: number[];     // empty = all
     dateRange: { from: number; to: number } | null;
     amountRange: { min: number; max: number } | null;
     tags: string[];
     recurringOnly: boolean;
     sortBy: 'date' | 'amount' | 'category';
     sortDir: 'asc' | 'desc';
   }

   export function applyFilters(
     expenses: Expense[],
     filters: ExpenseFilters
   ): Expense[] { ... }
   ```

2. Build `src/features/expenses/FilterSheet.tsx` — bottom sheet with:
   - Search bar (`IonSearchbar`)
   - Date range: preset chips (Today / This Week / This Month / Custom) + `IonDatetime` range picker for custom
   - Category multi-select: chip grid
   - Amount range: two `IonRange` thumbs
   - Tags multi-select
   - Sort options
   - "Apply" + "Reset" buttons

3. Add filter indicator badge to Expenses tab icon when filters are active (non-default state).

4. Implement full-text search: since notes are encrypted, search happens client-side over decrypted results. For large datasets (> 1000 records), use a Web Worker to avoid blocking the UI thread.

**Acceptance criteria:**
- Search results update as user types (debounced 300 ms)
- Active filters persist when navigating away and back (store in `settingsStore` or URL params)
- Filter reset correctly clears all non-default values
- With 2000 records, search completes in < 200 ms

---

### Step 3.2 — Tag System

**What to do:**

1. Tags are free-form strings stored in the `tags: string[]` field of each expense.

2. Build `src/components/forms/TagInput.tsx`:
   - Text input with "Add" button or Enter key
   - Existing tags shown as removable chips below input
   - Autocomplete suggestions from all previously used tags (decrypted + deduped at session start)

3. Build `src/features/analytics/TagAnalytics.tsx` — a simple breakdown:
   - Table of unique tags with total spend and transaction count
   - Sorted by total spend descending

4. Add tag filter to `FilterSheet.tsx` (already scaffolded in Step 3.1).

**Acceptance criteria:**
- Tags stored as string array (not a separate table — keep it simple)
- Autocomplete works across sessions (suggestions come from DB)
- Tag analytics aggregation is correct (one expense can have multiple tags — count it once per tag)

---

### Step 3.3 — Recurring Expense Automation

**What to do:**

1. Define `RecurringRule`:
   ```typescript
   interface RecurringRule {
     frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
     nextDate: number;    // Unix ms — when to auto-create next
     endDate?: number;    // Unix ms — stop after this date (optional)
   }
   ```

2. On every app open, run `src/features/expenses/recurringEngine.ts`:
   ```typescript
   export async function processRecurringExpenses(profileId: number): Promise<void> {
     const now = Date.now();
     const allExpenses = await getAllDecryptedExpenses(profileId);
     const recurring = allExpenses.filter(e => e.isRecurring && e.recurringRule);

     for (const expense of recurring) {
       const rule = expense.recurringRule!;
       if (rule.nextDate <= now && (!rule.endDate || now <= rule.endDate)) {
         // Create a new expense entry with today's date
         const newExpense = { ...expense, id: undefined, date: now, isRecurring: false };
         await encryptedPut(db.expenses, newExpense, { date: now, categoryId: expense.categoryId, profileId });
         // Advance nextDate
         const updatedRule = advanceRecurringDate(rule);
         await updateExpenseRecurringRule(expense.id!, updatedRule);
       }
     }
   }
   ```

3. Show a non-blocking toast notification when recurring expenses are auto-created: "2 recurring expenses added for today."

**Acceptance criteria:**
- Recurring expenses auto-create exactly once per due period
- If app not opened for 3 days and daily recurring expense exists, 3 entries created on next open (backfill)
- Recurring rule advances correctly for all four frequency types
- End date respected — no entries created after end date

---

### Step 3.4 — XLSX Export

**What to do:**

1. Create `src/features/export/xlsxExport.ts` using SheetJS:

   ```typescript
   import * as XLSX from 'xlsx';

   export async function exportToXLSX(profileId: number, dateRange?: DateRange): Promise<void> {
     const [expenses, fixed, income, categories, budgets] = await Promise.all([
       getAllDecryptedExpenses(profileId, dateRange),
       getAllDecryptedFixedExpenses(profileId),
       getAllDecryptedIncome(profileId, dateRange),
       getAllDecryptedCategories(profileId),
       getAllDecryptedBudgets(profileId),
     ]);

     const wb = XLSX.utils.book_new();

     // Sheet 1: Transactions
     XLSX.utils.book_append_sheet(wb,
       XLSX.utils.aoa_to_sheet([
         ['Date', 'Category', 'Amount', 'Notes', 'Tags', 'Recurring'],
         ...expenses.map(e => [
           formatDate(e.date),
           catName(e.categoryId, categories),
           formatAmount(e.amount),
           e.notes,
           e.tags.join(', '),
           e.isRecurring ? 'Yes' : 'No',
         ])
       ]),
       'Transactions'
     );

     // Sheet 2–5: Fixed, Income, Category Summary, Monthly Summary
     // ... (similar pattern for each)

     const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
     const blob = new Blob([wbout], { type: 'application/octet-stream' });
     await writeFileCapacitor(blob, `vaultspend-${Date.now()}.xlsx`);
   }
   ```

2. Add export options UI in Settings → Data:
   - "Export All Time" button
   - "Export This Month" button
   - "Custom Date Range" date picker + export button

3. After writing, trigger Android share sheet via `@capacitor/share`.

**Acceptance criteria:**
- Generated XLSX opens correctly in Google Sheets and Microsoft Excel
- All 5 sheets present with correct column headers
- Amounts formatted as numbers (not strings) so Excel formulas work
- Date column formatted as `dd/MM/yyyy` (not Unix timestamp)
- Export of 1000 records completes in < 2 seconds

---

### Step 3.5 — Encrypted Backup & Restore

**What to do:**

1. Create `src/features/export/encryptedBackup.ts`:

   ```typescript
   export async function createEncryptedBackup(
     profileId: number,
     backupPassphrase: string
   ): Promise<void> {
     // 1. Collect all decrypted data
     const payload = {
       version: 1,
       exportedAt: Date.now(),
       profiles: await getAllDecryptedProfiles(),
       expenses: await getAllDecryptedExpenses(profileId),
       // ... all tables
     };

     // 2. Generate separate salt for backup (never reuse app salt)
     const backupSalt = generateSalt();
     const backupKey = await deriveKey(backupPassphrase, backupSalt);
     const { iv, ciphertext } = await encryptData(backupKey, payload);

     // 3. Assemble file: plaintext header + encrypted body
     const file = {
       magic: 'VAULTSPEND_BACKUP_V1',
       salt: Array.from(backupSalt),
       iv: Array.from(iv),
       ciphertext: Array.from(ciphertext),
     };

     await writeFileCapacitor(JSON.stringify(file), `vaultspend-backup-${Date.now()}.vaultspend.enc`);
   }

   export async function restoreFromBackup(
     fileContent: string,
     backupPassphrase: string
   ): Promise<void> {
     const file = JSON.parse(fileContent);
     if (file.magic !== 'VAULTSPEND_BACKUP_V1') throw new Error('Invalid backup file');

     const backupSalt = new Uint8Array(file.salt);
     const backupKey = await deriveKey(backupPassphrase, backupSalt);
     const payload = await decryptData(backupKey, new Uint8Array(file.iv), new Uint8Array(file.ciphertext));

     // Validate schema version
     if (payload.version > CURRENT_SCHEMA_VERSION) throw new Error('Backup is from a newer app version');

     // Write all records (re-encrypt with current app key)
     await db.transaction('rw', [db.expenses, ...], async () => {
       await clearAllTables();
       await bulkEncryptedPut(payload);
     });
   }
   ```

2. Build `src/features/export/BackupRestoreUI.tsx`:
   - "Create Backup" → passphrase input → confirm passphrase → generate file
   - "Restore from Backup" → file picker (Capacitor `@capacitor/filesystem` or `<input type="file">`) → passphrase input → restore

3. Show progress indicator for large backups (> 500 records).

**Acceptance criteria:**
- Backup file is valid JSON with magic string
- Backup file is not decryptable with wrong passphrase (verify with test)
- Restore correctly re-encrypts all records with the current app key
- Restore is atomic: if it fails partway, the DB is unchanged (Dexie transaction)
- Backup + restore round-trip produces identical data (write a test for this)

---

**Phase 3 Complete when:**
- [ ] Search and filter work on expense list
- [ ] Filter state persists across navigation
- [ ] Tags: add, display, filter, analytics
- [ ] Recurring expenses auto-create on app open
- [ ] XLSX export with 5 sheets working
- [ ] Encrypted backup creates `.vaultspend.enc` file
- [ ] Restore from backup decrypts and re-imports correctly
- [ ] Export and backup operations tested in `__tests__/`

---

## Phase 4 — Polish & Native Features

**Goal:** Turn a functional app into a delightful one. Multi-profile support, biometric auth, receipt images, dark mode, onboarding flow, accessibility pass.

---

### Step 4.1 — Multi-Profile Support

**What to do:**

1. The `profiles` table already exists in the DB schema. Wire it up.

2. Build `src/features/profiles/ProfileManager.tsx`:
   - List of profiles (max 5)
   - "Add Profile" → name + currency input
   - Long-press to rename or delete (cannot delete if it's the only profile)

3. Add profile switcher to the app header (`IonHeader`):
   - Shows active profile name + avatar initials
   - Tap → bottom sheet with all profiles + "Add Profile"

4. All Zustand stores and all DB queries must pass `profileId` from `profileStore.activeProfileId`. This should already be in place from Phase 1 (if you built with `profileId` filtering from the start).

5. "Default" profile is auto-created at PIN setup with the name the user entered during onboarding.

**Acceptance criteria:**
- Switching profiles immediately updates dashboard to show only that profile's data
- Expenses, income, budgets, fixed expenses all filtered by active profile
- Category list is shared across profiles (global categories)
- Deleting a profile deletes all its associated records (Dexie transaction)

---

### Step 4.2 — Biometric Authentication

**What to do:**

1. Check biometric availability on settings load:
   ```typescript
   import { BiometricAuth } from '@capacitor-community/biometric-auth';
   const { isAvailable } = await BiometricAuth.isAvailable();
   ```

2. Add "Enable Biometric Unlock" toggle in Settings → Security (only shown if `isAvailable`).

3. When biometric is enabled, store a flag in `app_meta.biometricEnabled = 'true'`.

4. Modify `LockScreen.tsx`:
   - If `biometricEnabled`, show fingerprint icon button below numpad
   - On tap: call `BiometricAuth.verify({ reason: 'Access VaultSpend' })`
   - On success: derive key as normal (biometric result proves identity — actual key derivation still needs the PIN, which was stored as an encrypted hint in Android Keystore via the plugin's secure credential storage)
   - On failure (3 attempts): fall back to PIN entry

**Implementation note:** The `@capacitor-community/biometric-auth` plugin handles the Android Keystore integration. The app's AES key should be re-derived using a Keystore-protected symmetric key wrapping scheme, not by storing the PIN itself.

**Acceptance criteria:**
- Biometric toggle only visible on devices with enrolled biometrics
- Biometric unlock works faster than PIN entry
- 3 biometric failures automatically fall back to PIN
- Biometric setting persists across app restarts
- Setting is visible but disabled with a message if no biometrics enrolled

---

### Step 4.3 — Receipt Image Capture & Storage

**What to do:**

1. Add `receiptRef` field to `Expense` (nullable string ID referencing `receipts` table).

2. Add receipt capture to `ExpenseForm.tsx` (in the expanded view):
   ```typescript
   import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

   const captureReceipt = async () => {
     const photo = await Camera.getPhoto({
       quality: 60,            // lower quality = smaller file
       resultType: CameraResultType.Base64,
       source: CameraSource.Prompt,  // Camera or Gallery
     });
     // Compress via canvas API to max 200 KB
     const compressed = await compressImage(photo.base64String!, 200_000);
     return compressed;
   };
   ```

3. Create `src/utils/imageCompression.ts` using Canvas API:
   ```typescript
   export async function compressImage(
     base64: string,
     maxBytes: number
   ): Promise<string> {
     // Draw to canvas → reduce quality until size <= maxBytes
     // Returns compressed base64 JPEG string
   }
   ```

4. Store compressed image in `receipts` table (encrypted) with reference to `expenseId`.

5. Display receipt thumbnail in expense detail view — tap to view full screen via `IonModal`.

**Acceptance criteria:**
- Receipt image stored at ≤ 200 KB after compression
- Receipt is encrypted in IndexedDB alongside expense data
- Viewing a receipt works offline (no CDN, no server)
- Deleting an expense also deletes its receipt (via Dexie transaction)

---

### Step 4.4 — Dark Mode & Theme System

**What to do:**

1. Ionic handles most dark mode via `prefers-color-scheme` automatically. Add the Ionic dark mode class toggle:
   ```typescript
   // In AppShell.tsx
   useEffect(() => {
     const { theme } = useSettingsStore.getState();
     if (theme === 'dark') document.body.classList.add('ion-palette-dark');
     else if (theme === 'light') document.body.classList.remove('ion-palette-dark');
     else {
       // 'system' — follow OS preference
       const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
       document.body.classList.toggle('ion-palette-dark', mediaQuery.matches);
     }
   }, [theme]);
   ```

2. Update all custom Tailwind classes to use CSS variables instead of hardcoded colors so they respect dark mode:
   - Use `text-[color:var(--ion-text-color)]` pattern for custom components

3. Add Chart.js dark mode theming — pass `color` and `borderColor` as Ionic CSS variable values, not hardcoded hex.

4. Test dark mode on all 5 main screens.

**Acceptance criteria:**
- Dark mode toggle in Settings → Appearance immediately changes theme
- System theme tracks OS dark/light setting in real-time
- All charts legible in both modes
- No hardcoded `#ffffff` or `#000000` in component styles

---

### Step 4.5 — Onboarding Flow

**What to do:**

Build `src/features/auth/Onboarding.tsx` — a multi-step bottom-sheet wizard shown only on first launch, replacing the raw "Set PIN" screen:

- **Step 1/5** — Welcome splash: app logo, tagline, privacy promise
- **Step 2/5** — Set PIN: numpad entry + confirm
- **Step 3/5** — Profile setup: name field + currency selector
- **Step 4/5** — Add first income (optional, skippable with "Skip for now")
- **Step 5/5** — Add first fixed expense (optional, skippable)
- **Done** — Animated transition to dashboard

Add `IonProgressBar` at the top showing 1/5, 2/5, etc.

**Acceptance criteria:**
- Skipping optional steps lands on dashboard with correct empty states
- Back navigation works within the wizard (step 3 → step 2)
- Onboarding never shows again after completion (`app_meta.onboardingComplete = 'true'`)
- Animations feel smooth (use `IonSlides` or CSS `@keyframes` transitions)

---

### Step 4.6 — Smart Insights Engine

**What to do:**

Create `src/features/analytics/insightsEngine.ts`:

```typescript
export function generateInsights(
  currentMonth: Expense[],
  lastMonth: Expense[],
  categories: Category[],
  budgets: Budget[],
  income: Income[],
  fixed: FixedExpense[]
): Insight[] {
  const insights: Insight[] = [];

  // Insight 1: Month-over-month change per category
  for (const category of categories) {
    const curr = sumByCategory(currentMonth, category.id!);
    const prev = sumByCategory(lastMonth, category.id!);
    if (prev > 0) {
      const change = ((curr - prev) / prev) * 100;
      if (Math.abs(change) >= 20) {
        insights.push({
          type: change > 0 ? 'increase' : 'decrease',
          message: `${category.name} spending is ${Math.abs(change).toFixed(0)}% ${change > 0 ? 'higher' : 'lower'} than last month`,
          severity: change > 50 ? 'high' : 'medium',
        });
      }
    }
  }

  // Insight 2: Projected month-end spend
  const dayOfMonth = new Date().getDate();
  const daysInMonth = getDaysInMonth(new Date());
  const dailyAvg = totalAmount(currentMonth) / dayOfMonth;
  const projected = dailyAvg * daysInMonth;
  const totalIncome = totalAmount(income);
  if (projected > totalIncome * 0.9) {
    insights.push({ type: 'warning', message: `Projected to spend ₹${formatAmount(projected)} this month — close to your income`, severity: 'high' });
  }

  // Insight 3: Next upcoming fixed bill
  const today = new Date().getDate();
  const nextBill = fixed
    .filter(f => f.isActive && f.dueDay > today)
    .sort((a, b) => a.dueDay - b.dueDay)[0];
  if (nextBill) {
    insights.push({ type: 'info', message: `${nextBill.name} (${formatAmount(nextBill.amount)}) is due in ${nextBill.dueDay - today} days` });
  }

  // Insight 4: Unusual spending spike (> 2× monthly average)
  // ...

  return insights.slice(0, 3); // max 3 insights shown at once
}
```

Display top 3 insights as dismissible cards in a horizontal scroll row at the top of the Dashboard, below the summary card.

**Acceptance criteria:**
- Insights section hidden when there are no insights to show (not an empty row)
- Insight cards are dismissible (swipe away) and don't reappear until next app open
- All insight messages use the user's actual currency and data
- Insights engine has unit tests with fixture data

---

### Step 4.7 — Accessibility Pass

**What to do:**

Go through every screen and verify:

1. **Touch targets**: Every interactive element ≥ 48×48 dp. Add padding to small icon buttons.
2. **Contrast ratios**: Use a contrast checker (axe DevTools Chrome extension) on both light and dark modes. All text must pass WCAG 2.1 AA.
3. **ARIA labels**: Every `IonButton`, `IonFab`, `IonIcon`-only button must have `aria-label`.
4. **Screen reader**: Test with Android TalkBack. Navigate through the dashboard and expense entry form.
5. **Font scaling**: Set Android font size to "Largest" in system settings. Verify no text is clipped or overlaps.
6. **Keyboard navigation**: On a device with a physical keyboard (or Capacitor keyboard), Tab key should navigate form fields in logical order.

Fix all issues found.

**Acceptance criteria:**
- axe DevTools reports zero critical or serious violations on Dashboard and Expense screens
- TalkBack announces all interactive elements meaningfully
- App usable with "Largest" font size setting

---

**Phase 4 Complete when:**
- [ ] Multi-profile: create, switch, delete profiles
- [ ] All data correctly filtered by active profile
- [ ] Biometric unlock working on capable devices
- [ ] Receipt images captured, compressed, stored encrypted, viewable
- [ ] Dark mode + system theme tracking working
- [ ] Onboarding wizard for new users
- [ ] Smart insights showing on dashboard
- [ ] Accessibility pass completed (axe + TalkBack)

---

## Phase 5 — QA, Performance & Release

**Goal:** Ship a stable, fast, signed Android APK. Every claim in the PRD's NFR section is verified with a measurement, not an assumption.

---

### Step 5.1 — Unit Test Coverage

**What to do:**

Run coverage and bring every critical module to its target:

```bash
npm run test:coverage
```

Required coverage targets:

| Module | Line Coverage |
|---|---|
| `src/crypto/` | 100% |
| `src/db/` | 100% |
| `src/features/analytics/aggregations.ts` | 100% |
| `src/features/budgets/budgetEngine.ts` | 100% |
| `src/features/export/` | 90%+ |
| `src/store/` | 90%+ |
| `src/features/*/` (CRUD) | 80%+ |

Write any missing tests. Key test scenarios that must exist:

- **Crypto**: wrong PIN always throws; different IV per encryption; round-trip fidelity
- **Budget engine**: 79% = ok, 80% = warning, 100% = exceeded, 101% = exceeded
- **Recurring engine**: daily/weekly/monthly advancement; end date cutoff; backfill
- **Aggregations**: empty array inputs; single record; multiple months; currency formatting
- **Backup/restore**: round-trip produces identical data; wrong passphrase throws; invalid file throws
- **CSV export**: special characters escaped; amounts as decimal strings

---

### Step 5.2 — End-to-End Tests (Playwright)

**What to do:**

Configure Playwright to run against the built PWA served on `localhost:4173` (`npm run preview`).

Write E2E specs in `tests/e2e/`:

1. **`onboarding.spec.ts`**:
   - First launch shows PIN setup
   - Setting PIN navigates to dashboard
   - Revisiting app shows lock screen

2. **`quick-add.spec.ts`**:
   - Open app → enter PIN → FAB tap → amount entry → category tap → Save
   - Assert: new expense appears in recent transactions
   - Measure: total time from FAB tap to toast < 3000 ms

3. **`recurring-bills.spec.ts`**:
   - Add fixed expense with auto-add enabled
   - Simulate month change (mock date)
   - Verify prompt appears on next open
   - Confirm → expenses added

4. **`export.spec.ts`**:
   - Add 10 expenses
   - Trigger XLSX export
   - Assert: file exists in Downloads (via Capacitor mock)

5. **`budget-alert.spec.ts`**:
   - Set budget for Food category at ₹1000
   - Add expenses totalling ₹810
   - Assert: notification triggered (mock LocalNotifications)

6. **`backup-restore.spec.ts`**:
   - Add 5 expenses
   - Create backup with passphrase "test123"
   - Wipe all data
   - Restore from backup
   - Assert: 5 expenses present, data matches

**Acceptance criteria:**
- All E2E specs pass against `npm run preview`
- `quick-add.spec.ts` timer assertion passes consistently
- E2E suite completes in < 5 minutes

---

### Step 5.3 — Performance Profiling

**What to do:**

For each NFR performance target from the PRD, write a measurement script or use browser tooling:

1. **App cold start < 1.5 s FCP** and **warm start < 400 ms**:
   - Run Lighthouse on `npm run preview` in incognito
   - Must score ≥ 90 on Performance

2. **Expense save round-trip < 50 ms**:
   ```typescript
   // In a Vitest benchmark:
   const start = performance.now();
   await encryptedPut(db.expenses, testExpense, meta);
   const elapsed = performance.now() - start;
   expect(elapsed).toBeLessThan(50);
   ```

3. **Dashboard render < 200 ms with 500 records**:
   - Seed 500 encrypted expense records in test setup
   - Measure React render time using `React.Profiler`

4. **XLSX export < 2 s for 1000 records**:
   ```typescript
   const start = performance.now();
   await exportToXLSX(profileId);
   expect(performance.now() - start).toBeLessThan(2000);
   ```

5. **PBKDF2 key derivation benchmark on target device**:
   - Run key derivation on a low-end Android device (e.g. Redmi 9A)
   - If > 500 ms, reduce iteration count to 210,000 and document the trade-off

Fix any targets that are not met before continuing.

---

### Step 5.4 — Security Hardening

**What to do:**

1. **Add Content Security Policy** to `index.html`:
   ```html
   <meta http-equiv="Content-Security-Policy"
     content="default-src 'self';
              script-src 'self';
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: blob:;
              connect-src 'none';">
   ```
   Note: `connect-src 'none'` explicitly blocks all outbound network requests.

2. **Disable Android WebView debugging** in `capacitor.config.ts`:
   ```typescript
   android: {
     allowMixedContent: false,
     captureInput: false,
     webContentsDebuggingEnabled: false,  // MUST be false for release builds
   }
   ```

3. **Verify no network calls** using Chrome DevTools → Network tab on a production build with the app running. The Network tab should show zero requests after the initial page load.

4. **Verify XSS sanitization** by attempting to store `<script>alert(1)</script>` in the Notes field. Confirm it is stored safely and rendered as text, never executed.

5. **Verify screenshot protection** (`FLAG_SECURE`):
   In `android/app/src/main/java/.../MainActivity.java`:
   ```java
   @Override
   protected void onCreate(Bundle savedInstanceState) {
     getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE,
                          WindowManager.LayoutParams.FLAG_SECURE);
     super.onCreate(savedInstanceState);
   }
   ```

6. **Run OWASP ZAP** or **MobSF** static analysis on the APK and resolve any high-severity findings.

---

### Step 5.5 — Android Build Configuration

**What to do:**

1. **Generate release keystore**:
   ```bash
   keytool -genkey -v \
     -keystore vaultspend-release.jks \
     -alias vaultspend \
     -keyalg RSA \
     -keysize 2048 \
     -validity 10000
   ```
   Store `.jks` file securely. **Never commit it.**

2. **Configure signing** in `android/app/build.gradle`:
   ```groovy
   signingConfigs {
     release {
       storeFile file(System.getenv('KEYSTORE_PATH'))
       storePassword System.getenv('KEYSTORE_PASS')
       keyAlias System.getenv('KEYSTORE_ALIAS')
       keyPassword System.getenv('KEYSTORE_ALIAS_PASS')
     }
   }
   ```

3. **Enable ProGuard** for release build (R8 code shrinking):
   ```groovy
   buildTypes {
     release {
       minifyEnabled true
       proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
     }
   }
   ```

4. **Set `minSdkVersion 26`** (Android 8.0) and `targetSdkVersion 34` (Android 14).

5. **Build release APK**:
   ```bash
   npm run build
   npx cap sync android
   cd android
   ./gradlew assembleRelease
   ```

6. **Verify APK**:
   ```bash
   # Check signing
   apksigner verify --verbose app/build/outputs/apk/release/app-release.apk

   # Check APK size (target: < 15 MB)
   ls -lh app/build/outputs/apk/release/app-release.apk
   ```

---

### Step 5.6 — Play Store Submission

**What to do:**

1. Create Play Store listing:
   - **App name**: VaultSpend — Expense Tracker
   - **Short description** (80 chars): Track expenses privately. No cloud. AES-256 encrypted. Works offline.
   - **Full description**: Emphasize privacy, offline-first, no account required, encryption
   - **Category**: Finance
   - **Content rating**: Everyone

2. Prepare store assets:
   - Feature graphic: 1024×500 px
   - Screenshots: at least 4 phone screenshots (Dashboard, Expenses, Analytics, Settings)
   - App icon: 512×512 px (high-res, no alpha)

3. Complete Play Store data safety form:
   - Data collected: None (all local)
   - Data shared: None
   - Security practices: Data encrypted in transit (N/A), Data encrypted at rest (YES), Data deletion request (YES — wipe all data in-app)

4. Submit for internal testing first, then production.

**Acceptance criteria:**
- APK passes Play Store automated pre-launch report (no crashes on test devices)
- Data safety section accurately reflects the app's zero-data-collection model
- App available in target markets

---

**Phase 5 Complete when:**
- [ ] Unit test coverage meets all targets
- [ ] All 6 E2E test suites pass
- [ ] All 7 NFR performance targets measured and met
- [ ] CSP blocks all outbound connections
- [ ] WebView debugging disabled in release build
- [ ] FLAG_SECURE set (screenshots blocked on lock screen)
- [ ] Signed release APK built and verified
- [ ] Play Store submission accepted (internal track)

---

## Cross-Phase Rules

These rules apply throughout every phase. Violating them is a bug, not a "later fix."

### Encryption Rules
1. **No plaintext user data ever reaches IndexedDB.** Every write must go through `encryptedPut()`.
2. **`keyManager.getKey()` must throw if app is locked.** Never silently return `null` or skip encryption.
3. **Every encryption call generates a fresh IV.** Never reuse an IV with the same key.
4. **Decryption failures must propagate.** Never catch a `DOMException` from `crypto.subtle.decrypt` and return null — it means data corruption or wrong key.

### State Rules
5. **`profileId` is always explicit.** Never query a table without filtering by `profileId`. This prevents profile data leakage.
6. **Stores are never persisted to localStorage.** All persistence goes through Dexie only. Zustand state is in-memory only.

### UX Rules
7. **All forms are bottom sheets.** Never navigate away from the current context to show a form.
8. **Destructive operations require two confirmations.** Delete expense: confirm once. Delete profile or wipe data: require PIN re-entry.
9. **All amounts stored as integers (paise/cents).** Convert to decimal only at the display layer in `formatAmount()`.

### Code Quality Rules
10. **No `any` types.** All data shapes must be typed via TypeScript interfaces.
11. **No inline styles.** Use Tailwind classes or Ionic CSS variables.
12. **All user input sanitized via DOMPurify before storage.** No exceptions.

---

## Definition of Done

A phase is "done" when **all** of the following are true:

- [ ] All features in the phase work end-to-end on a physical Android device
- [ ] All features work completely offline (DevTools → Offline mode or Airplane mode on device)
- [ ] All data written during this phase is encrypted (verified via IndexedDB inspector — must show binary blobs, not readable text)
- [ ] `npm run test` passes with no failures
- [ ] `npm run lint` passes with zero errors
- [ ] `npm run build` completes without TypeScript errors
- [ ] `npx cap sync` completes cleanly
- [ ] No `console.error` output during normal app usage
- [ ] All new components have `aria-label` on interactive elements

---

*This document is version-controlled alongside the codebase. Update it when implementation decisions deviate from the plan.*
