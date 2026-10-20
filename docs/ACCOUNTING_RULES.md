# Success Agro Management System - Accounting & Business Rules

## 1. Core Principles
1. **Currency**: All transactions and monetary records are kept in **Bangladeshi Taka (BDT ৳)**.
2. **Timezone**: Dates and postings default to **Asia/Dhaka (UTC+6)**.
3. **An Order is NOT a Sale**:
   - Creating a Sales Order (`ORD-YYYY-XXXX`) does **not** alter physical stock in warehouses.
   - An approved Sales Order does **not** create revenue or customer debt.
   - It represents an intent to purchase pending managerial review and credit verification.
4. **Finalized Commercial Invoice (`INV-YYYY-XXXX`)**:
   - Deducts physical inventory from the specified warehouse.
   - Creates an immutable stock movement audit record (`movementType: sales_invoice`).
   - If sold on credit or partial payment, increases customer accounts receivable (`debit: grandTotal` in customer ledger).
   - If initial cash payment is recorded, simultaneously deposits into selected Cash/Bank account and credits customer ledger.
5. **No Silent Overwrites or Deletions**:
   - Posted accounting transactions and ledger entries must **never** be deleted silently.
   - Adjustments and cancellations are executed through reversing credit notes and audit logs.

---

## 2. Posting Matrix by Business Module

| Module / Event | Source Transaction | Debited Account | Credited Account | Physical Stock Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Credit Sales Invoice** | Invoice (`INV-XXXX`) | Accounts Receivable (Customer Ledger) | Sales Revenue | Deducted from Warehouse (`-qty`) |
| **Cash Sales Invoice** | Invoice (`INV-XXXX`) | Cash / Bank Register | Sales Revenue | Deducted from Warehouse (`-qty`) |
| **Payment Collection** | Receipt (`RCP-XXXX`) | Cash / Bank Account | Accounts Receivable (Customer Ledger) | None |
| **Sales Return (Restocked)** | Return (`RET-XXXX`) | Sales Returns & Allowances | Accounts Receivable (Customer Ledger) | Added to Warehouse (`+qty`) |
| **Operating Expense** | Expense (`EXP-XXXX`) | Operating Expense Category | Cash / Bank Account | None |
| **Non-Sales Income** | Income (`INC-XXXX`) | Cash / Bank Account | Other Non-Operating Revenue | None |
| **Staff Salary Disbursement**| Salary (`PAY-XXXX`) | Staff Salary Expense | Bank / Cash Account | None |
| **Production Completion** | Production (`PRD-XXXX`)| Finished Goods Inventory | Raw Materials Inventory + Overhead Costs | Raw Materials (`-qty`), Finished Goods (`+qty`) |
| **Inter-Warehouse Transfer** | Transfer (`TRF-XXXX`) | Destination Warehouse | Source Warehouse | Company total unchanged |

---

## 3. Profit and Loss Formulation

$$\text{Net Sales} = \text{Gross Invoiced Sales} - \text{Sales Returns \& Allowances}$$

$$\text{Gross Profit} = \text{Net Sales} - \text{Cost of Goods Sold (COGS)}$$

$$\text{Net Profit} = \text{Gross Profit} - \text{Operating Expenses} + \text{Non-Operating Income}$$

---

## 4. Role Isolation Rules
- **Sales Officer**:
  - Exclusively allowed to submit daily orders for their assigned dealers.
  - Can view their own submitted orders and statuses.
  - Strictly blocked from seeing accounts, general ledgers, salaries, stock movements, administrative settings, and other officers' records.
  - Cannot modify approved orders or alter protected dealer unit rates beyond authorized thresholds.
