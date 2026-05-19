<div align="center">
  <img src="public/logo.png" alt="VaultSpend Logo" width="120" />
  
  # VaultSpend 🪙
  
  **Your 100% Private, Local-First Expense Tracker.**
  
  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Ionic-3880FF?style=for-the-badge&logo=ionic&logoColor=white" alt="Ionic" />
    <img src="https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" alt="Capacitor" />
    <img src="https://img.shields.io/badge/Dexie.js-FF5C72?style=for-the-badge" alt="Dexie" />
    <img src="https://img.shields.io/badge/Zustand-443E38?style=for-the-badge" alt="Zustand" />
  </p>
</div>

---

## 🔒 Privacy First. Always.
VaultSpend was built with a single core philosophy: **Your financial data is yours alone.**
There are no servers, no cloud syncs, and no telemetry. Every single transaction, budget, and note you record is securely encrypted and stored entirely on your local device using IndexedDB (via Dexie.js). 

---

## ✨ Key Features

- **📱 Beautiful Mobile UI:** Carefully crafted using Ionic and CSS variables for a fluid, native-feeling experience that seamlessly adapts to **Dark Mode** and **Light Mode**.
- **🛡️ Secure PIN Lock:** Protect your data with a mandatory 6-digit PIN lock. Features persistent rate-limiting to prevent brute-force attacks.
- **📊 Smart Analytics:** Visualize your spending patterns with dynamic, interactive charts (powered by Chart.js) that respect your system theme.
- **💸 Full Financial Tracking:** Manage Daily Expenses, Income Streams, Fixed Bills (Subscriptions), and Monthly Budgets in one place.
- **🔄 Local Backup & Restore:** Export your data as an encrypted `.json` file to safely move it between devices, or download reports as `.xlsx` files.
- **🔔 Notifications:** Get gentle local alerts for upcoming bills or when you are nearing your budget limits (via Capacitor Local Notifications).

---

## 🛠️ Tech Stack

VaultSpend is built on a modern hybrid web stack, optimized for maximum performance on mobile devices.

| Technology | Purpose |
| :--- | :--- |
| **React 19** | Core UI library |
| **Ionic React** | Native mobile components & routing |
| **Capacitor** | Native device bridging (Android/iOS builds) |
| **Zustand** | Lightning-fast, boilerplate-free state management |
| **Dexie.js** | Robust IndexedDB wrapper for local-first storage |
| **Chart.js** | Beautiful, responsive financial data visualization |
| **Lucide React**| Crisp, customizable SVG iconography |
| **DOMPurify** | Ironclad XSS protection and data sanitization |

---

## 🚀 Getting Started (Development)

To run the project locally on your machine for development:

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📱 Building for Android

Because VaultSpend utilizes Capacitor, bridging the web app to a native Android APK is incredibly simple.

### Quick Sync
Compile the web assets and sync them to your Android project:
```bash
npm run android:sync
```

### Build & Open Android Studio
Build the web assets, sync with Capacitor, and instantly open Android Studio to run on an emulator or physical device:
```bash
npm run android:open
```

---

## 🛡️ Security & Audits
VaultSpend has been strictly audited to ensure maximum local security:
- **XSS Protection:** All user inputs (names, notes, etc.) are stripped of malicious code using `DOMPurify` before being saved to the database.
- **Payload Limits:** Strict `maxLength` constraints exist on all text fields to prevent application crashing via bloated database entries.
- **Rate Limiting:** The PIN lock system features persistent lockout logic to prevent brute-force intrusion, even if the app is force-closed and restarted.
- **Cross-Theme UI Audit:** Contrast ratios and UI elements have been specifically validated to ensure accessibility and aesthetic cohesion across both Light and Dark themes.

---

<div align="center">
  <p>Built with ❤️ and privacy in mind.</p>
</div>
