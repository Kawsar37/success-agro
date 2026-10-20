import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../src/app.js";
import { seedDatabase } from "../src/seeds/seed.js";
import { InventoryBalance } from "../src/models/Inventory.js";

let mongod: MongoMemoryServer;
let adminToken = "";
let salesOfficerToken = "";

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  await seedDatabase();

  // Login Admin
  const adminRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "admin@successagro.com", password: "password123" });
  expect(adminRes.status).toBe(200);
  adminToken = adminRes.body.data.token;

  // Login Sales Officer
  const soRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "so.bogura@successagro.com", password: "password123" });
  expect(soRes.status).toBe(200);
  salesOfficerToken = soRes.body.data.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("Success Agro ERP - Authentication & Role Verification", () => {
  it("allows Admin to log in and receive JWT", () => {
    expect(adminToken).toBeDefined();
    expect(adminToken.length).toBeGreaterThan(20);
  });

  it("blocks unauthenticated access to protected routes", async () => {
    const res = await request(app).get("/api/v1/master-data/dealers");
    expect(res.status).toBe(401);
  });
});

describe("Success Agro ERP - Sales Officer Strict Isolation Rules", () => {
  it("BLOCKS Sales Officer from accessing financial accounts", async () => {
    const res = await request(app)
      .get("/api/v1/accounts/accounts")
      .set("Authorization", `Bearer ${salesOfficerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain("Access Denied");
  });

  it("BLOCKS Sales Officer from accessing raw material & warehouse inventory balances", async () => {
    const res = await request(app)
      .get("/api/v1/inventory/balances")
      .set("Authorization", `Bearer ${salesOfficerToken}`);
    expect(res.status).toBe(403);
  });

  it("BLOCKS Sales Officer from viewing employee payroll", async () => {
    const res = await request(app)
      .get("/api/v1/employees/salaries")
      .set("Authorization", `Bearer ${salesOfficerToken}`);
    expect(res.status).toBe(403);
  });

  it("BLOCKS Sales Officer from accessing executive financial reports", async () => {
    const res = await request(app)
      .get("/api/v1/reports/financial")
      .set("Authorization", `Bearer ${salesOfficerToken}`);
    expect(res.status).toBe(403);
  });
});

describe("Success Agro ERP - Order Creation & Workflow", () => {
  let createdOrderId = "";

  it("allows Sales Officer to submit a sales order for a dealer", async () => {
    const dealersRes = await request(app)
      .get("/api/v1/master-data/dealers")
      .set("Authorization", `Bearer ${salesOfficerToken}`);
    const dealerId = dealersRes.body.data[0]._id;

    const productsRes = await request(app)
      .get("/api/v1/master-data/products")
      .set("Authorization", `Bearer ${salesOfficerToken}`);
    const productId = productsRes.body.data[0]._id;

    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${salesOfficerToken}`)
      .send({
        dealerId,
        items: [{ productId, quantity: 10 }],
        deliveryAddress: "Sariakandi Depot",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.orderNumber).toMatch(/^SO-\d{4}-\d{5}$/);
    expect(res.body.data.status).toBe("PENDING");
    createdOrderId = res.body.data._id;
  });

  it("allows Admin to approve the pending order", async () => {
    const res = await request(app)
      .patch(`/api/v1/orders/${createdOrderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "APPROVED" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("APPROVED");
  });
});

describe("Success Agro ERP - Admin Provisions Sales Officer & Delivery Man", () => {
  it("allows Admin to provision a new Delivery Man", async () => {
    const res = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Abul Kashem (Driver)",
        email: "kashem.driver@successagro.com",
        phone: "01799999999",
        password: "password123",
        role: "DeliveryMan",
        vehicleNumber: "BOG-TA-1234",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("DeliveryMan");
  });

  it("allows Admin to provision a new Sales Officer", async () => {
    const res = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Shakil Ahmed",
        email: "shakil.so@successagro.com",
        phone: "01788888888",
        password: "password123",
        role: "SalesOfficer",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("SalesOfficer");
    expect(res.body.data.salesOfficerProfile).toBeDefined();
  });
});

describe("Success Agro ERP - Pricing & Role Permissions Enforcement", () => {
  it("BLOCKS Sales Officer from altering product prices or setting discounts during order creation", async () => {
    const dealersRes = await request(app)
      .get("/api/v1/master-data/dealers")
      .set("Authorization", `Bearer ${salesOfficerToken}`);
    const dealerId = dealersRes.body.data[0]._id;

    const productsRes = await request(app)
      .get("/api/v1/master-data/products")
      .set("Authorization", `Bearer ${salesOfficerToken}`);
    const product = productsRes.body.data[0];

    // Attempt to book with custom manipulated price (10 tk instead of product.tradePrice) and 500 tk discount
    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${salesOfficerToken}`)
      .send({
        dealerId,
        items: [{ productId: product._id, quantity: 2, unitPrice: 10 }],
        discountAmount: 500,
      });

    expect(res.status).toBe(201);
    // Enforces fixed tradePrice set by Admin
    expect(res.body.data.items[0].unitPrice).toBe(product.tradePrice);
    expect(res.body.data.discountAmount).toBe(0);
    expect(res.body.data.totalAmount).toBe(product.tradePrice * 2);
  });

  it("BLOCKS Sales Officer from modifying order status", async () => {
    const ordersRes = await request(app)
      .get("/api/v1/orders")
      .set("Authorization", `Bearer ${salesOfficerToken}`);
    const orderId = ordersRes.body.data[0]._id;

    const res = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${salesOfficerToken}`)
      .send({ status: "APPROVED" });

    expect(res.status).toBe(403);
  });

  it("allows Admin to add a new product item and set its dealer trade price & MRP", async () => {
    const res = await request(app)
      .post("/api/v1/master-data/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Agro Shield Fungicide 250ml",
        packSize: "250 ml",
        cartonSize: 24,
        tradePrice: 420,
        mrp: 500,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Agro Shield Fungicide 250ml");
    expect(res.body.data.tradePrice).toBe(420);
    expect(res.body.data.mrp).toBe(500);

    const newProdId = res.body.data._id;

    // Admin updates prices
    const updateRes = await request(app)
      .put(`/api/v1/master-data/products/${newProdId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        tradePrice: 450,
        mrp: 530,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.tradePrice).toBe(450);
    expect(updateRes.body.data.mrp).toBe(530);
  });
});

describe("Success Agro ERP - Manual Cash, Bank & Dealer Collections Controls", () => {
  it("allows Admin to perform manual cash-in (deposit) and cash-out (withdrawal)", async () => {
    const accountsRes = await request(app)
      .get("/api/v1/accounts/accounts")
      .set("Authorization", `Bearer ${adminToken}`);
    const account = accountsRes.body.data[0];
    const initialBalance = account.currentBalance;

    // Deposit 25,000 BDT
    const depositRes = await request(app)
      .post("/api/v1/accounts/manual-adjustment")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        accountId: account._id,
        type: "DEPOSIT",
        amount: 25000,
        reason: "Owner manual cash injection",
      });

    expect(depositRes.status).toBe(200);
    expect(depositRes.body.data.currentBalance).toBe(initialBalance + 25000);

    // Withdraw 5,000 BDT
    const withdrawRes = await request(app)
      .post("/api/v1/accounts/manual-adjustment")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        accountId: account._id,
        type: "WITHDRAWAL",
        amount: 5000,
        reason: "Factory emergency maintenance cash",
      });

    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.data.currentBalance).toBe(initialBalance + 25000 - 5000);
  });

  it("allows Admin to manually transfer funds between accounts", async () => {
    const accountsRes = await request(app)
      .get("/api/v1/accounts/accounts")
      .set("Authorization", `Bearer ${adminToken}`);
    const fromAcc = accountsRes.body.data[0];
    const toAcc = accountsRes.body.data[1];

    const transferRes = await request(app)
      .post("/api/v1/accounts/transfer")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        fromAccountId: fromAcc._id,
        toAccountId: toAcc._id,
        amount: 10000,
        remarks: "Bank deposit transfer",
      });

    expect(transferRes.status).toBe(201);
    expect(transferRes.body.data.amount).toBe(10000);
  });

  it("allows Admin to manually record dealer collection, balancing dealer due and target account", async () => {
    const dealersRes = await request(app)
      .get("/api/v1/master-data/dealers")
      .set("Authorization", `Bearer ${adminToken}`);
    const dealer = dealersRes.body.data[0];
    const initialDealerDue = dealer.currentBalance;

    const accountsRes = await request(app)
      .get("/api/v1/accounts/accounts")
      .set("Authorization", `Bearer ${adminToken}`);
    const account = accountsRes.body.data[0];
    const initialAccBal = account.currentBalance;

    const colRes = await request(app)
      .post("/api/v1/accounts/collections")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        dealerId: dealer._id,
        accountId: account._id,
        amount: 15000,
        paymentMethod: "Cash",
        remarks: "Manual counter collection",
      });

    expect(colRes.status).toBe(201);
    expect(colRes.body.data.collectionNumber).toMatch(/^COL-\d{4}-\d{5}$/);

    // Verify dealer due was reduced by 15,000
    const updatedDealerRes = await request(app)
      .get(`/api/v1/master-data/dealers/${dealer._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(updatedDealerRes.body.data.currentBalance).toBe(initialDealerDue - 15000);

    // Verify account balance increased by 15,000
    const updatedAccsRes = await request(app)
      .get("/api/v1/accounts/accounts")
      .set("Authorization", `Bearer ${adminToken}`);
    const updatedAcc = updatedAccsRes.body.data.find((a: any) => a._id === account._id);
    expect(updatedAcc.currentBalance).toBe(initialAccBal + 15000);
  });

  it("BLOCKS Sales Officer from direct cash adjustments or approving collections", async () => {
    // Attempt cash adjustment
    const adjRes = await request(app)
      .post("/api/v1/accounts/manual-adjustment")
      .set("Authorization", `Bearer ${salesOfficerToken}`)
      .send({
        accountId: "507f1f77bcf86cd799439011",
        type: "DEPOSIT",
        amount: 5000,
      });
    expect(adjRes.status).toBe(403);
  });
});

describe("Success Agro ERP - Sales Officer Collection & Bank Deposit with Admin Approval Workflow", () => {
  let soDealerId = "";
  let depositAccountId = "";
  let pendingCollectionId = "";

  it("allows Sales Officer to view available company deposit bank accounts", async () => {
    const res = await request(app)
      .get("/api/v1/accounts/collections/deposit-accounts")
      .set("Authorization", `Bearer ${salesOfficerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    depositAccountId = res.body.data[0]._id;
  });

  it("allows Sales Officer to submit collected money with M.R. number and bank deposit slip as Pending", async () => {
    const dealersRes = await request(app)
      .get("/api/v1/master-data/dealers")
      .set("Authorization", `Bearer ${salesOfficerToken}`);
    expect(dealersRes.status).toBe(200);
    expect(dealersRes.body.data.length).toBeGreaterThan(0);
    soDealerId = dealersRes.body.data[0]._id;

    const initialDue = dealersRes.body.data[0].currentBalance;

    const res = await request(app)
      .post("/api/v1/accounts/collections")
      .set("Authorization", `Bearer ${salesOfficerToken}`)
      .send({
        dealerId: soDealerId,
        accountId: depositAccountId,
        amount: 15000,
        paymentMethod: "BankTransfer",
        moneyReceiptNumber: "MR-8821",
        depositSlipNumber: "DEP-SLIP-4019",
        depositDate: "2026-10-17",
        remarks: "Collected payment for winter batch, deposited to Islami Bank",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("Pending");
    expect(res.body.data.moneyReceiptNumber).toBe("MR-8821");
    expect(res.body.data.depositSlipNumber).toBe("DEP-SLIP-4019");
    pendingCollectionId = res.body.data._id;

    // Verify dealer balance is NOT yet deducted while Pending
    const checkDealer = await request(app)
      .get(`/api/v1/master-data/dealers/${soDealerId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(checkDealer.body.data.currentBalance).toBe(initialDue);
  });

  it("shows pending collections count for Admin sidebar notification badge", async () => {
    const res = await request(app)
      .get("/api/v1/accounts/collections/pending-count")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.pendingCount).toBeGreaterThan(0);
  });

  it("BLOCKS Sales Officer from approving their own collection", async () => {
    const res = await request(app)
      .patch(`/api/v1/accounts/collections/${pendingCollectionId}/approve`)
      .set("Authorization", `Bearer ${salesOfficerToken}`);
    expect(res.status).toBe(403);
  });

  it("allows Admin to approve the collection, deducting dealer due and crediting general ledger", async () => {
    const dealerBefore = await request(app)
      .get(`/api/v1/master-data/dealers/${soDealerId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    const dueBefore = dealerBefore.body.data.currentBalance;

    const res = await request(app)
      .patch(`/api/v1/accounts/collections/${pendingCollectionId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Approved");

    // Verify dealer balance is now reduced by 15000
    const dealerAfter = await request(app)
      .get(`/api/v1/master-data/dealers/${soDealerId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(dealerAfter.body.data.currentBalance).toBe(dueBefore - 15000);

    // Verify Dealer General Ledger has the M.R. entry
    const ledgerRes = await request(app)
      .get(`/api/v1/accounts/dealer-ledger/${soDealerId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    const matchingEntry = ledgerRes.body.data.entries.find(
      (e: any) => e.moneyReceiptNumber === "MR-8821"
    );
    expect(matchingEntry).toBeDefined();
    expect(matchingEntry.credit).toBe(15000);
  });
});

describe("Success Agro ERP - Dealer Network Administration (Add, Modify, Delete)", () => {
  let createdDealerId = "";

  it("allows Admin to add a new dealer with credit limits and territory", async () => {
    const res = await request(app)
      .post("/api/v1/master-data/dealers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        businessName: "Bismillah Krishi Bhander",
        proprietorName: "Haji Nurul Islam",
        phone: "01712334455",
        address: "Dupchanchia Bazar, Bogura",
        creditLimit: 150000,
        openingBalance: 25000,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.businessName).toBe("Bismillah Krishi Bhander");
    expect(res.body.data.dealerCode).toMatch(/^DLR-\d{4}$/);
    expect(res.body.data.creditLimit).toBe(150000);
    expect(res.body.data.currentBalance).toBe(25000);
    createdDealerId = res.body.data._id;
  });

  it("allows Admin to modify dealer information and credit limit", async () => {
    const res = await request(app)
      .put(`/api/v1/master-data/dealers/${createdDealerId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        businessName: "Bismillah Krishi Bhander (Updated)",
        phone: "01712999999",
        creditLimit: 200000,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.businessName).toBe("Bismillah Krishi Bhander (Updated)");
    expect(res.body.data.phone).toBe("01712999999");
    expect(res.body.data.creditLimit).toBe(200000);
  });

  it("BLOCKS Sales Officer from adding a new dealer", async () => {
    const res = await request(app)
      .post("/api/v1/master-data/dealers")
      .set("Authorization", `Bearer ${salesOfficerToken}`)
      .send({
        businessName: "Unauthorized Dealer Store",
        proprietorName: "Malik",
        phone: "01700000000",
        address: "Test",
      });

    expect(res.status).toBe(403);
  });

  it("BLOCKS Sales Officer from modifying an existing dealer", async () => {
    const res = await request(app)
      .put(`/api/v1/master-data/dealers/${createdDealerId}`)
      .set("Authorization", `Bearer ${salesOfficerToken}`)
      .send({
        businessName: "Hacked Dealer Name",
      });

    expect(res.status).toBe(403);
  });

  it("BLOCKS Sales Officer from deleting a dealer", async () => {
    const res = await request(app)
      .delete(`/api/v1/master-data/dealers/${createdDealerId}`)
      .set("Authorization", `Bearer ${salesOfficerToken}`);

    expect(res.status).toBe(403);
  });

  it("allows Admin to delete a dealer from the network", async () => {
    const res = await request(app)
      .delete(`/api/v1/master-data/dealers/${createdDealerId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    // Verify dealer is gone
    const getRes = await request(app)
      .get(`/api/v1/master-data/dealers/${createdDealerId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(getRes.status).toBe(404);
  });
});

describe("Success Agro ERP - Movement Notification System for Admin", () => {
  let createdNotifId = "";

  it("creates an Admin notification when a Sales Officer books a sales order", async () => {
    const dealersRes = await request(app)
      .get("/api/v1/master-data/dealers")
      .set("Authorization", `Bearer ${adminToken}`);
    const dealerId = dealersRes.body.data[0]._id;

    const productsRes = await request(app)
      .get("/api/v1/master-data/products")
      .set("Authorization", `Bearer ${adminToken}`);
    const productId = productsRes.body.data[0]._id;

    // Sales officer places order
    const orderRes = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${salesOfficerToken}`)
      .send({
        dealerId,
        items: [{ productId, quantity: 5 }],
      });
    expect(orderRes.status).toBe(201);

    // Verify notification was created for Admin
    const notifsRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(notifsRes.status).toBe(200);
    expect(notifsRes.body.data.notifications.length).toBeGreaterThan(0);

    const orderNotif = notifsRes.body.data.notifications.find(
      (n: any) => n.type === "ORDER_CREATED"
    );
    expect(orderNotif).toBeDefined();
    expect(orderNotif.title).toContain("New Sales Order Placed");
    expect(orderNotif.isRead).toBe(false);
    createdNotifId = orderNotif._id;
  });

  it("creates an Admin notification when Delivery status moves to Dispatched and Delivered", async () => {
    // Admin creates an invoice
    const dealersRes = await request(app)
      .get("/api/v1/master-data/dealers")
      .set("Authorization", `Bearer ${adminToken}`);
    const dealerId = dealersRes.body.data[0]._id;

    const productsRes = await request(app)
      .get("/api/v1/master-data/products")
      .set("Authorization", `Bearer ${adminToken}`);
    const productId = productsRes.body.data[0]._id;

    const whRes = await request(app)
      .get("/api/v1/master-data/warehouses")
      .set("Authorization", `Bearer ${adminToken}`);
    const warehouseId = whRes.body.data[0]._id;

    // Seed finished good balance in warehouse
    await InventoryBalance.findOneAndUpdate(
      { warehouse: warehouseId, itemType: "FinishedGood", product: productId },
      { quantityOnHand: 50, availableQuantity: 50, reservedQuantity: 0 },
      { upsert: true }
    );

    const invRes = await request(app)
      .post("/api/v1/invoices")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        dealerId,
        warehouseId,
        items: [{ productId, quantity: 2 }],
      });
    expect(invRes.status).toBe(201);
    const invoiceId = invRes.body.data._id;

    // Delivery man updates status to Dispatched (picked up)
    const pickupRes = await request(app)
      .patch(`/api/v1/invoices/${invoiceId}/delivery-status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Dispatched" });
    expect(pickupRes.status).toBe(200);

    // Delivery man updates status to Delivered
    const deliverRes = await request(app)
      .patch(`/api/v1/invoices/${invoiceId}/delivery-status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Delivered" });
    expect(deliverRes.status).toBe(200);

    // Check notifications
    const notifsRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(notifsRes.status).toBe(200);

    const deliveredNotif = notifsRes.body.data.notifications.find(
      (n: any) => n.type === "DELIVERY_COMPLETED"
    );
    expect(deliveredNotif).toBeDefined();
    expect(deliveredNotif.title).toContain("Delivery Completed");
  });

  it("allows Admin to mark a notification as read and mark all as read", async () => {
    // Mark one as read
    const readRes = await request(app)
      .patch(`/api/v1/notifications/${createdNotifId}/read`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data.isRead).toBe(true);

    // Mark all as read
    const allRes = await request(app)
      .patch("/api/v1/notifications/read-all")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(allRes.status).toBe(200);

    // Verify unread count is 0
    const checkRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(checkRes.body.data.unreadCount).toBe(0);
  });

  it("BLOCKS Sales Officer from reading or managing Admin notifications", async () => {
    const res = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${salesOfficerToken}`);
    expect(res.status).toBe(403);
  });
});

describe("Success Agro ERP - Dealer General Ledger (Customer Ledger Khata & Excel)", () => {
  let testDealerId = "";
  let createdLedgerEntryId = "";

  it("allows Admin to fetch dealers ledger summary", async () => {
    const res = await request(app)
      .get("/api/v1/accounts/dealers-ledger-summary")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    testDealerId = res.body.data[0]._id;
  });

  it("allows Admin to fetch individual dealer ledger with running balance & summary", async () => {
    const res = await request(app)
      .get(`/api/v1/accounts/dealer-ledger/${testDealerId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dealer).toBeDefined();
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary.closingBalance).toBeDefined();
    expect(Array.isArray(res.body.data.entries)).toBe(true);
  });

  it("allows Admin to add a general ledger entry for an individual dealer", async () => {
    const res = await request(app)
      .post("/api/v1/accounts/dealer-ledger")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        dealerId: testDealerId,
        date: "2026-10-15",
        invoiceNumber: "TEST-INV-101",
        invoiceAmount: 25000,
        cashInvoiceAmount: 0,
        paymentAmount: 0,
        adjustmentAmount: 0,
        returnAmount: 0,
        description: "Test Agrochemical Dispatch #101",
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.debit).toBe(25000);
    createdLedgerEntryId = res.body.data._id;
  });

  it("allows Admin to update a general ledger entry and recomputes balance", async () => {
    const res = await request(app)
      .put(`/api/v1/accounts/dealer-ledger/${createdLedgerEntryId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        invoiceAmount: 30000,
        description: "Updated Agrochemical Dispatch #101",
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.debit).toBe(30000);
  });

  it("allows Admin to delete a general ledger entry and reverses dealer balance", async () => {
    const res = await request(app)
      .delete(`/api/v1/accounts/dealer-ledger/${createdLedgerEntryId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("BLOCKS Sales Officer from accessing or modifying Dealer General Ledger", async () => {
    const getRes = await request(app)
      .get(`/api/v1/accounts/dealer-ledger/${testDealerId}`)
      .set("Authorization", `Bearer ${salesOfficerToken}`);
    expect(getRes.status).toBe(403);

    const postRes = await request(app)
      .post("/api/v1/accounts/dealer-ledger")
      .set("Authorization", `Bearer ${salesOfficerToken}`)
      .send({
        dealerId: testDealerId,
        invoiceAmount: 5000,
      });
    expect(postRes.status).toBe(403);
  });
});


