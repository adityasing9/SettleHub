# SettleMate — Track. Split. Settle. 💸

[![PWA Ready](https://img.shields.io/badge/PWA-Installable-blue.svg)](https://vitejs.dev/)
[![React 18](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**SettleMate** is a production-ready, local-first Progressive Web App (PWA) designed to track individual and group expenses with friends. It answers the fundamental question: **"How much does each friend owe me right now?"** with 100% offline support, graph-based debt simplification, and zero server configuration required.

---

## 🚀 Key Features

* **💰 1-on-1 Money Tracking**: Easily record money paid by you for a friend, or money paid by a friend for you.
* **👥 Group Expense Splitting**: Create groups (e.g. *Goa Trip*, *Roommates*, *Weekend Trip*). Support **Equal** and **Custom** splits with exact share validation.
* **✨ Smart Debt Simplification**: Built-in greedy debt graph algorithm to minimize the number of payment transfers required to settle up across a group.
* **📊 Dashboard & Metrics**: Immediate summary of **Total Receivable**, **Total Payable**, and **Net Overall Balance**.
* **🤝 Full & Partial Settlements**: One-click **Settle Up** flow for friends to clear debts partially or in full.
* **📱 100% Offline PWA**: Installable on Android, iOS, Windows, and macOS. Works seamlessly without an internet connection using IndexedDB (Dexie.js).
* **🔍 Search, Filter & Sort**: Global search across friends, groups, and descriptions. Filter by date ranges, expense type, or person.
* **↩️ Undo Protection**: Delete transactions with built-in instant **Undo** toast notifications.
* **📁 Data Backup & Export**: Download complete JSON backups or export transactions to CSV for spreadsheets. Safe merge or replace import modes.
* **🌙 Dark / Light Mode**: Seamless dark mode support adhering to system preferences.

---

## 🛠️ Tech Stack

* **Frontend**: React 18, Vite 5, TypeScript 5, React Router v6
* **Styling**: Tailwind CSS, Lucide React icons
* **Data Storage**: IndexedDB via [Dexie.js](https://dexie.org/) & `dexie-react-hooks`
* **PWA**: `vite-plugin-pwa`, Web App Manifest, Service Worker
* **Testing**: Vitest financial calculation test suite

---

## 📐 Architecture & Calculation Engine

SettleMate strictly separates UI components from financial calculations:

```
src/
├── components/          # Reusable UI components (Modal, Button, Cards, Badges, Toasts)
├── db/                  # Dexie.js IndexedDB schema definitions
├── hooks/               # Custom React hooks (useFriends, useTransactions, useGroups)
├── pages/               # Primary app routes (Dashboard, Transactions, Friends, Groups, Stats, Settings)
├── services/            # Financial engine & smart settlement simplification algorithm
│   ├── financialEngine.ts
│   └── financialEngine.test.ts
├── types/               # TypeScript interfaces & domain models
└── utils/               # Currency (₹ INR), date formatters, CSV & JSON backup helpers
```

### Financial Rules
* **Net Balance per Friend** = `(Money I Paid for Friend) - (Money Friend Paid for Me)`
* **Positive Balance**: Friend owes you money (`OWES_ME`).
* **Negative Balance**: You owe friend money (`I_OWE`).
* **Zero Balance**: Fully settled (`SETTLED`).

---

## 💻 Getting Started Locally

### Prerequisites
* Node.js v18 or later
* npm / pnpm / yarn

### Installation

```bash
# Clone repository
git clone https://github.com/adityasing9/SettleHub.git
cd SettleHub

# Install dependencies
npm install

# Run Vitest financial engine tests
npx vitest run

# Start local development server
npm run dev
```

### Production Build

```bash
npm run build
```

---

## 🔒 Security & Privacy

SettleMate is **local-first**. All transaction records, contact notes, and financial balances remain strictly stored inside your browser's local IndexedDB. **No data is ever uploaded to external cloud servers or APIs.**

---

## 📄 License

MIT License © 2026 SettleMate
