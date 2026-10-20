# Success Agro Management System - REST API Reference (v1)

Base URL: `http://localhost:5000/api/v1` (or your production API domain)

All requests accept and return `application/json`.
Authentication: Secure HTTP-only cookie (`token`) or header `Authorization: Bearer <token>`.

---

## 1. Authentication & Users
- `POST /auth/login`
  - Payload: `{ "email": "admin@successagro.com", "password": "..." }`
  - Response: `{ "success": true, "data": { "user": {...}, "token": "..." } }`
- `POST /auth/logout`
  - Clears authentication cookie.
- `GET /auth/me`
  - Returns current logged-in profile and linked officer record.
- `POST /auth/change-password`
  - Payload: `{ "currentPassword": "...", "newPassword": "..." }`
- `GET /users` (Admin only)
  - Lists all users with role and status.
- `POST /users` (Admin only)
  - Creates user account with specified role.
- `PUT /users/:id` (Admin only)
  - Activates/deactivates user or changes assigned role.

---

## 2. Master Data
- `GET /territories`
  - Lists agro divisions and districts.
- `GET /sales-officers` (Admins/Managers)
  - Lists sales officers. Sensitive bank details are masked unless accessed by Admin.
- `POST /sales-officers` (Admin only)
- `GET /dealers`
  - Lists dealers. When accessed by `sales_officer`, automatically scoped to only their assigned dealers!
- `POST /dealers` (Admins/Managers/Accounts)
  - Enrolls a new dealer with credit limit and opening balance.
- `GET /products`
  - Lists catalog with SKU, UOM, and selling prices.
- `POST /products` (Admins/Managers/Store)
- `GET /raw-materials` (Admins/Store/Managers)
- `GET /warehouses`
  - Lists central and regional distribution centers.

---

## 3. Orders Management
- `GET /orders`
  - Returns orders. Sales officers can only view their own orders.
- `POST /orders`
  - Creates a new daily sales order with server-calculated rates and line totals.
- `GET /orders/:id`
- `POST /orders/:id/approve` (Admin/Manager only)
  - Approves submitted order with approval notes.
- `POST /orders/:id/reject` (Admin/Manager only)
  - Rejects submitted order with mandatory reason.

---

## 4. Sales Invoices & Returns
- `GET /invoices` (Admin/Manager/Accounts)
  - Lists commercial invoices with payment status (`paid`, `partial`, `unpaid`).
- `POST /invoices` (Admin/Manager/Accounts)
  - Generates commercial invoice, deducts physical warehouse stock, and debits customer receivable.
- `POST /invoices/:id/cancel` (Admin/Manager only)
  - Controlled invoice cancellation with inventory restocking and credit reversal.
- `POST /invoices/returns` (Admin/Manager/Accounts)
  - Processes sales returns with restock option and customer ledger credit.

---

## 5. Inventory & Warehouse
- `GET /inventory`
  - Warehouse stock balances.
- `GET /inventory/alerts`
  - Low-stock alerts below minimum reorder levels.
- `GET /inventory/movements`
  - Stock movement audit trail.
- `POST /inventory/adjust`
  - Adjusts stock (damage or count audit).
- `POST /inventory/transfer`
  - Transfers items between warehouses atomically.

---

## 6. Factory Production & BOM
- `GET /production/boms`
  - Formula recipes and estimated batch costs.
- `POST /production/boms`
- `GET /production`
  - Lists production batches.
- `POST /production`
  - Schedules a production order.
- `POST /production/:id/complete`
  - Consumes raw materials from source warehouse and receipts finished goods into destination warehouse.

---

## 7. Accounts & Collections
- `GET /accounts`
  - Cash, bank, and MFS balances.
- `POST /accounts/transfer`
  - Inter-account fund transfer with fee tracking.
- `GET /accounts/collections`
- `POST /accounts/collections`
  - Records payment collection receipt, credits customer ledger, and debits deposit account.
- `GET /accounts/expenses`
- `POST /accounts/expenses`
- `GET /accounts/ledger`
  - General and customer ledger entries with running balances.

---

## 8. Reports & Analytics
- `GET /dashboard/metrics`
  - Role-specific KPI metrics and 7-day sales trends.
- `GET /reports/profit-loss`
  - Income and profit/loss statement for configured date ranges.
- `GET /reports/sales`
  - Turnover grouped by dealer or sales officer.

---

## 9. System Administration
- `GET /system/audit-logs` (Admin only)
- `GET /system/settings`
- `PUT /system/settings` (Admin only)
- `GET /system/backup/export` (Admin only)
  - Full system database export JSON file download.
