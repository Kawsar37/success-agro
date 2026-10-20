# Success Agro Management System 🌾

An enterprise, full-stack business management ERP web application built for agro-product manufacturing and distribution in Bangladesh.

The system connects factory production, raw materials, finished goods inventory, multi-warehouse depots, dealer networks, sales officers, order-to-invoice workflows, payments and collections, and audited double-entry accounting ledgers into one real-time platform.

---

## 🌟 Key Highlights & Business Workflows

- **Strict Sales Officer Isolation**:
  - Enforced across frontend routes, Express middlewares, and database query scoping.
  - Sales Officers can **only** access Order Entry and view their own submitted orders.
  - Completely restricted from financial accounts, inventory, HR/salaries, production, and other officers' records.
- **Interconnected Workflow**:
  - `Order Entry` → `Manager Review & Approval` → `Invoice Conversion` → `Atomic Stock Deduction` → `Payment Collection` → `Customer & General Ledger Posting` → `P&L Statement`.
- **Accurate Financials**:
  - BDT currency (`৳`) and `Asia/Dhaka` timezone.
  - Double-entry postings for every invoice, collection, return, expense, and salary payment.
  - Print-ready **A4 Commercial Invoices** with Success Agro branding, BIN, terms, and signature lines.
- **Pure Light Theme**:
  - Modern, executive light design with agricultural green accents (`#16a34a`), white cards, and clear typography.

---

## 🛠️ Technology Stack

### Frontend (`frontend/`)
- **Next.js 14** (App Router, Server & Client Components)
- **TypeScript** & **Tailwind CSS**
- **TanStack Query** (v5) for state management and caching
- **Axios** with centralized request/response interceptors
- **Recharts** for sales trends and analytics
- **Lucide React** icons & **Sonner** toast notifications

### Backend (`backend/`)
- **Node.js** & **Express.js** with **TypeScript**
- **MongoDB Atlas** / **Mongoose** models with atomic counters and auto-indexing
- **In-Memory MongoDB Fallback** for zero-configuration local runs and automated tests
- **Zod** schema validations & **bcryptjs** password hashing
- **JWT** authentication via secure HTTP-only cookies and Authorization headers
- **Helmet**, **CORS allowlist**, and **express-rate-limit**
- **Winston** & **Morgan** structured logging
- **Vitest** automated integration tests

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v20+ or v24 LTS
- **npm** v10+

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
# The API will be available at http://localhost:5000/api/v1
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# The ERP web app will be available at http://localhost:3000
```

---

## 🔑 Demo Login Accounts

All demo accounts accept either password: **`Agro@2026`** or **`password123`** (with one-click fast-login buttons on `/login`):

| Role | Email | Scope & Permissions |
| :--- | :--- | :--- |
| 👔 **Managing Director / Admin** | `admin@successagro.com` or `md@successagro.com` | Full unrestricted access to all modules, users, audit logs, and settings |
| 🌾 **Sales Officer (Bogura)** | `so.bogura@successagro.com` | **Strictly Isolated**: Order Requisition and My Orders for assigned dealers only |
| 🌾 **Sales Officer (Dinajpur)** | `so.dinajpur@successagro.com` | **Strictly Isolated**: Order Requisition and My Orders for assigned dealers only |
| 💰 **Accounts Manager** | `accounts@successagro.com` | Invoices, collections, dealer dues, ledgers, cash/bank accounts, expenses, P&L |
| 🏭 **Factory Manager** | `factory@successagro.com` | Production orders, BOM recipes, raw material consumption, warehouse stock |

---

## 🧪 Automated Testing

Run the full integration test suite verifying authentication, role isolation, and order-to-invoice workflows:

```bash
cd backend
npm test
```
