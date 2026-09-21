# SettleMate — Track. Split. Settle. 💸

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-success?style=for-the-badge&logo=github)](https://adityasing9.github.io/SettleHub/)
[![PWA Installable](https://img.shields.io/badge/PWA-Installable-blue.svg?style=for-the-badge&logo=pwa)](https://adityasing9.github.io/SettleHub/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![IndexedDB](https://img.shields.io/badge/IndexedDB-Local--First-purple.svg?style=for-the-badge)](https://dexie.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

> **Live Production PWA Application**:  
> 🌐 **[https://adityasing9.github.io/SettleHub/](https://adityasing9.github.io/SettleHub/)**

---

## 📖 Overview

**SettleMate** is a modern, privacy-first **Progressive Web App (PWA)** built to manage personal and shared money transactions with friends and flatmates.

It answers the most essential financial question in seconds:
> **"How much does each friend owe me right now?"**

Unlike traditional split apps that require cloud sign-ups, third-party backend servers, and network connectivity, SettleMate is **100% local-first**. All your transactions, contacts, and group ledgers reside privately in your browser's **IndexedDB**, functioning seamlessly **online and offline**.

---

## 🌟 Core Features & How They Work

### 1. 💳 Personal Expense Tracking & Categories
* **100% Personal Expenses**: Log your everyday personal spending (groceries, food & dining, cab, shopping, utilities, rent) without needing to attach a friend or group.
* **12 Comprehensive Categories**: *Food & Dining, Groceries, Shopping, Travel & Fuel, Bills & Utilities, Entertainment, Health & Fitness, Rent & Housing, Education, Friend Repayment, Friend Loan, and General*.
* **Payment Method Tracking**: Tag payments with *UPI, Cash, Credit Card, Debit Card, Net Banking, or Other*.
* **Visual Distinction**: Personal transactions display a dedicated purple badge and category indicator.

### 2. ⚖️ Personal Expense vs. Giving Loan to Friend
* **Crystal-Clear Intent**: When adding any payment or expense, choose between:
  * **Personal Expense**: Your own expense (does not affect any friend's balance).
  * **Giving Loan to Friend**: Money lent or paid for a friend. The friend owes you back and it immediately updates their running balance.
  * **Friend Paid for Me**: A friend lent money or paid for you. Added to your debt to that friend.
  * **Group Split**: Split a shared bill with multiple friends.

### 3. 🔄 Automatic Debt Repayment Tracking
* **Pay Friend Back & Track Outflow**: When you settle up with a friend (paying money you owed them), SettleMate automatically offers to record that payment as a personal expense under **"Friend Repayment"** with your chosen payment method (e.g. UPI).
* **True Cash Outflow**: Your friend debt is cleared to ₹0, AND your personal spending metrics accurately reflect the money that physically left your bank account or wallet.

### 4. 📈 Personal Expense Net Balance & Outflow Shower
* **Personal Net Outflow Card**: Real-time summary on the Dashboard showing:
  * Total Personal Outflow (Direct purchases + Debt repayments to friends).
  * Subtitle breakdown: `Direct: ₹X • Repaid: ₹Y`.
  * Quick links to generate reports or view the filtered personal expense list.

### 5. 📑 Personal Expense Report Generator
* **Dedicated Reporting Suite**: Accessible from Dashboard, Statistics, and Transactions.
* **Flexible Date Ranges**: *This Month, Last Month, Last 90 Days, This Year, All Time, or Custom Date Range*.
* **Advanced Filters**: Filter by Category and Payment Method.
* **Executive Financial KPIs**: Total Period Spending, Number of Transactions, Daily Average Spending, and Top Category.
* **Visual Breakdown**: Visual category distribution progress bars with percentages and rupee totals.
* **Itemized Statement Table**: Date, Category badge, Description, Payment Method, and Amount.
* **Export & Reports**:
  * **Direct PDF Export**: Generates and downloads a clean, publication-ready PDF statement directly to your device without opening browser print dialogs.
  * **Download CSV**: Instant CSV export filtered specifically for your selected period and categories.

### 6. 👥 1-on-1 Friend Transactions & Loans
* **"I Paid" vs "Friend Paid"**: Record expenses you paid on behalf of a friend (*they owe you*), or expenses paid by a friend for you (*you owe them*).
* **Real-time Running Balance**: Balances are calculated dynamically per friend.
  * **Owes Me (+ ₹X)**: Highlighted in vibrant emerald green.
  * **I Owe (- ₹X)**: Highlighted in soft rose red.
  * **Settled (₹0)**: Clear indicator when accounts are fully balanced.
* **Friend Profile Page**: Click any friend to view their historical timeline, phone/email notes, and direct settle options.

### 7. 🏕️ Group Expense Splitting
* **Flexible Groups**: Organize flatmates, road trips (e.g. *Goa Trip 2026*), dinner parties, or shared household bills.
* **Choose Who Paid (Any Friend or You)**: Easily select which specific friend in the group (or yourself) paid the total bill.
* **Equal Split**: Automatically divides an expense equally among selected participants.
* **Custom Split**: Set exact individual rupee shares per person with real-time validation ensuring sum of shares matches total bill.
* **Cross-Settlement Integration**: Group expenses automatically reflect in the individual balances of participating friends.

### 8. 🧠 Smart Debt Simplification Algorithm
In groups with multiple overlapping expenses (e.g., Alice paid for Bob, Bob paid for Charlie, Charlie paid for Alice), SettleMate eliminates unnecessary intermediate payments.
* **Greedy Graph Reduction**: Computes net balances for all members, isolates creditors and debtors, and greedily matches them to reduce an $N \times N$ debt web into **at most $N - 1$ direct transactions**.
* **Suggested Settlements**: Displays clear step-by-step payment instructions (e.g. *"Bob pays ₹250 to Alice"*) with one-click **Settle** buttons.

### 9. 🤝 Settle Up & Payment Clearance
* Record full or partial debt payments with optional notes (e.g. *GPay*, *PhonePe*, *Cash*, *IMPS*).
* Instantly updates running ledger balances and records a dedicated `SETTLEMENT` activity entry.

### 10. 🔍 Filter, Search & History
* **Global Search**: Search by description, friend name, or category.
* **Filter by Type**: *All Types*, *Personal Expenses Only*, *Money I Paid (Shared)*, *Money Friends Paid*, *Group Expenses*, or *Settlements*.
* **Filter by Category**: Food & Dining, Groceries, Shopping, Travel & Fuel, Bills & Utilities, Entertainment, Health & Fitness, Rent & Housing, Education, Friend Repayment, Friend Loan, and General.
* **Sorting**: Sort newest to oldest or highest to lowest amounts.

### 11. 📊 Analytics & Financial Insights
* **Spending Breakdown**: Interactive visual progress bars and metrics for every expense category.
* **Personal vs Shared Split**: Side-by-side comparison of pure personal expenses vs shared friend splits.
* **Financial Summary Cards**: Real-time totals for **Total Receivable (Owed to you)**, **Total Payable (You owe)**, **Net Friend Balance**, and **Personal Net Outflow**.

### 12. 📁 Local Backup, Export & Restore
* **JSON Backup**: Download a full JSON snapshot of your friends, groups, and transactions (including categories and payment methods).
* **Universal JSON Import**:
  * **Mobile-friendly File Upload**: Supports Android file manager, Google Drive, and Downloads (`.json`, `.txt`).
  * **Direct JSON Paste**: Copy backup text from WhatsApp, email, or notes and tap **"Paste from Clipboard"** to restore without file browsing.
  * **Safe Merge vs Replace**: Choose to merge with existing records or wipe and replace.
* **CSV Spreadsheets**: Export clean transaction history CSVs formatted for Microsoft Excel, Google Sheets, or Apple Numbers.

### 13. 📱 PWA & 100% Offline Capability
* **Installable Application**: Install SettleMate directly on your mobile home screen or desktop taskbar without an App Store / Play Store download.
* **Full Offline Functionality**: Built with Workbox service worker precaching. View records, add expenses, and settle balances anywhere, even in airplane mode.
* **Offline Detection Banner**: Notifies you when operating offline and assures your data is safely saved in local storage.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [React 18](https://react.dev/) + [Vite 5](https://vitejs.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) (Strict typing) |
| **Routing** | [React Router v6](https://reactrouter.com/) (`HashRouter` for zero-404 static hosting) |
| **Database** | [Dexie.js](https://dexie.org/) (High-performance IndexedDB wrapper with reactive hooks) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) with Dark/Light mode |
| **Icons** | [Lucide React](https://lucide.dev/) + Custom High-Res Vector SVG / PNG Icons |
| **Charts** | [Recharts](https://recharts.org/) |
| **PWA & Cache** | `vite-plugin-pwa` + Workbox Service Worker |
| **Testing** | [Vitest](https://vitest.dev/) unit test suite for calculation engines |

---

## 📐 Project Architecture

```
Transaction Settlement PWA/
├── public/
│   ├── favicon.svg              # Scalable vector browser tab icon
│   ├── favicon.ico              # Multi-resolution legacy fallback icon (16-64px)
│   ├── apple-touch-icon.png     # iOS Safari home screen icon (180x180)
│   ├── pwa-192x192.png          # Android HD launcher icon
│   └── pwa-512x512.png          # Splash screen & high-DPI launcher icon
├── src/
│   ├── components/
│   │   ├── friends/             # Add/Edit Friend modals & FriendCard
│   │   ├── groups/              # Add Group modal, GroupCard, SuggestedSettlements
│   │   ├── layout/              # AppLayout, Header, MobileBottomNav, OfflineBanner
│   │   ├── reports/             # PersonalExpenseReportModal (Print/PDF & CSV)
│   │   ├── statistics/          # StatCard, SpendingChart (Visual breakdown)
│   │   ├── transactions/        # Add/Edit Transaction & SettleUp modals, TransactionTable, TransactionCard
│   │   └── ui/                  # Reusable Button, Modal, Card, Input, Select, Badge, Avatar
│   ├── context/
│   │   ├── ThemeContext.tsx     # Light/Dark/System theme management
│   │   └── ToastContext.tsx     # Toast notification system with Undo support
│   ├── db/
│   │   └── database.ts          # Dexie.js IndexedDB schema & UUID generation
│   ├── hooks/
│   │   ├── useFriends.ts        # Reactive hooks for friends ledger
│   │   ├── useGroups.ts         # Reactive hooks for groups
│   │   └── useTransactions.ts   # Reactive hooks for transactions
│   ├── pages/
│   │   ├── Dashboard.tsx        # Overview, metrics, active balances & quick actions
│   │   ├── Transactions.tsx     # History list, search, filters & sort
│   │   ├── Friends.tsx          # Friends directory & balance breakdown
│   │   ├── FriendDetail.tsx     # Friend profile & 1-on-1 activity log
│   │   ├── Groups.tsx           # Group expenses list
│   │   ├── GroupDetail.tsx      # Group debt simplification & splits
│   │   ├── Statistics.tsx       # Spending charts & summary
│   │   └── Settings.tsx         # Universal JSON import/export, CSV & privacy controls
│   ├── services/
│   │   ├── financialEngine.ts   # Mathematical calculations & graph debt simplification
│   │   └── financialEngine.test.ts # Vitest unit test suite (100% pass)
│   ├── types/
│   │   └── index.ts             # Domain models & TypeScript interfaces
│   ├── utils/
│   │   ├── exportImport.ts      # Resilient JSON backup normalizer & CSV generator
│   │   └── formatters.ts        # Indian Rupee (₹ INR) & date formatters
│   ├── App.tsx                  # HashRouter route configuration
│   ├── main.tsx                 # React DOM mount & async PWA service worker register
│   └── index.css                # Tailwind directives & typography
├── vite.config.ts               # Vite build, relative base path & PWA manifest
├── tsconfig.json                # TypeScript compiler configuration
└── package.json                 # Project dependencies & npm scripts
```

---

## 🧮 Mathematical & Financial Logic

### 1. Friend Balance Formula
$$\text{Net Balance} = \sum (\text{Expenses Paid by You for Friend}) - \sum (\text{Expenses Paid by Friend for You}) \pm \text{Settlements}$$

* $\text{Net Balance} > 0$: **Friend owes you money**
* $\text{Net Balance} < 0$: **You owe friend money**
* $\text{Net Balance} = 0$: **All debts are settled**

### 2. Greedy Debt Simplification
Instead of settling every single group expense individually:
1. Calculates net balance $B_i$ for every participant $i$.
2. Separates members into **Debtors** ($B_i < 0$) and **Creditors** ($B_i > 0$).
3. Sorts both lists in descending order of balance.
4. Greedily matches the largest debtor with the largest creditor by transfer amount $\min(|B_{\text{debtor}}|, B_{\text{creditor}})$.
5. Decrements balances and repeats until all balances reach zero. This guarantees complete debt settlement in at most $N-1$ transactions.

---

## 📲 How to Install as a PWA

### On Android (Chrome / Edge / Samsung Internet)
1. Open **[https://adityasing9.github.io/SettleHub/](https://adityasing9.github.io/SettleHub/)** in your browser.
2. Tap the **three-dot menu (⋮)** in the top right.
3. Tap **"Install App"** or **"Add to Home screen"**.
4. SettleMate will install as a standalone app with its custom app icon on your home screen and app drawer.

### On iPhone / iPad (Safari)
1. Open **[https://adityasing9.github.io/SettleHub/](https://adityasing9.github.io/SettleHub/)** in Safari.
2. Tap the **Share button (⎋ with arrow)** at the bottom of the screen.
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add**. SettleMate will appear on your home screen with its HD iOS icon.

### On PC / Mac (Chrome / Edge / Brave)
1. Open the website in your browser.
2. Click the **Install icon (computer with down arrow)** on the right side of the address bar.
3. Click **Install**. It will open in its own clean, distraction-free desktop window.

---

## 💻 Local Development Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* `npm` or `pnpm`

### Installation & Run

```bash
# 1. Clone this repository
git clone https://github.com/adityasing9/SettleHub.git
cd SettleHub

# 2. Install dependencies
npm install

# 3. Run automated financial engine unit tests
npm run test

# 4. Start the local development server
npm run dev
```

Open your browser at `http://localhost:5173/` to view the app.

### Production Build

```bash
# Build TypeScript and generate optimized production bundle
npm run build

# Preview the production build locally
npm run preview
```

---

## 🔒 100% Privacy & Local-First Guarantee

* **Zero Cloud Tracking**: SettleMate does not connect to third-party databases, user tracking tools, or cloud analytics.
* **Offline Storage**: All data is stored in your device's browser sandbox using **IndexedDB**.
* **Complete User Ownership**: You can export your data at any time as JSON or CSV, or wipe everything with one tap in Settings.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free to use, modify, and distribute.
