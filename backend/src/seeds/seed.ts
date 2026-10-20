import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Territory } from "../models/Territory.js";
import { SalesOfficer } from "../models/SalesOfficer.js";
import { Dealer } from "../models/Dealer.js";
import { ProductCategory, UnitOfMeasurement } from "../models/ProductMeta.js";
import { Product } from "../models/Product.js";
import { Warehouse, Supplier } from "../models/WarehouseAndSupplier.js";
import { RawMaterial, InventoryBalance } from "../models/Inventory.js";
import { BOM } from "../models/Production.js";
import { Account } from "../models/FinancialAccounts.js";
import { ExpenseCategory } from "../models/ExpenseAndIncome.js";
import { Employee } from "../models/Employee.js";
import { LedgerEntry } from "../models/LedgerEntry.js";
import { SystemSettings } from "../models/AuditAndSettings.js";
import { logger } from "../utils/logger.js";
import { connectDB } from "../config/db.js";

export const seedDatabase = async () => {
  logger.info("🌱 Seeding Success Agro foundational dataset...");

  // 1. System Settings
  await SystemSettings.findOneAndUpdate(
    {},
    {
      companyName: "Success Agro Limited",
      tagline: "Quality Agro Solutions for Bangladesh",
      address: "Plot 42, BSCIC Industrial Estate, Bogura, Bangladesh",
      phone: "+8801712345678",
      email: "info@successagro.com.bd",
      currency: "BDT",
      currencySymbol: "৳",
      timezone: "Asia/Dhaka",
      vatTaxRegistrationNumber: "BIN-123456789-0101",
    },
    { upsert: true }
  );

  // 2. Units of Measurement
  const unitsData = [
    { name: "Liter", symbol: "L", baseType: "volume" },
    { name: "Milliliter", symbol: "ml", baseType: "volume" },
    { name: "Kilogram", symbol: "kg", baseType: "weight" },
    { name: "Gram", symbol: "gm", baseType: "weight" },
    { name: "Piece", symbol: "pcs", baseType: "piece" },
    { name: "Carton", symbol: "ctn", baseType: "package" },
  ];
  const unitsMap: Record<string, any> = {};
  for (const u of unitsData) {
    const unitDoc = await UnitOfMeasurement.findOneAndUpdate(
      { name: u.name },
      { ...u, isActive: true },
      { upsert: true, new: true }
    );
    unitsMap[u.name] = unitDoc._id;
  }

  // 3. Product Categories
  const categoriesData = [
    { name: "Liquid Pesticides", description: "Crop protection insecticides and fungicides" },
    { name: "Powder Fungicides", description: "Wettable powders for agricultural blast control" },
    { name: "Bio-Fertilizers & Stimulants", description: "Organic growth regulators and micro-nutrients" },
    { name: "Herbicides", description: "Selective and non-selective weed control" },
    { name: "Packaging Materials", description: "Bottles, caps, foil seals and cartons" },
  ];
  const catMap: Record<string, any> = {};
  for (const c of categoriesData) {
    const catDoc = await ProductCategory.findOneAndUpdate(
      { name: c.name },
      { ...c, isActive: true },
      { upsert: true, new: true }
    );
    catMap[c.name] = catDoc._id;
  }

  // 4. Warehouses
  const warehousesData = [
    { code: "WH-BOG-01", name: "Bogura Central Plant Warehouse", location: "BSCIC Bogura", type: "Factory" },
    { code: "WH-DHK-01", name: "Dhaka Central Distribution Depot", location: "Tejgaon, Dhaka", type: "Central" },
    { code: "WH-RAJ-01", name: "Rajshahi Regional Depot", location: "Nawabganj Road, Rajshahi", type: "Regional" },
  ];
  const whMap: Record<string, any> = {};
  for (const w of warehousesData) {
    const whDoc = await Warehouse.findOneAndUpdate(
      { code: w.code },
      { ...w, isActive: true },
      { upsert: true, new: true }
    );
    whMap[w.code] = whDoc._id;
  }

  // 5. Territories
  const territoriesData = [
    { name: "Bogura North", region: "Rajshahi Division", district: "Bogura", thana: "Sariakandi" },
    { name: "Dinajpur Central", region: "Rangpur Division", district: "Dinajpur", thana: "Kotwali" },
    { name: "Mymensingh Sadar", region: "Mymensingh Division", district: "Mymensingh", thana: "Sadar" },
    { name: "Cumilla Agriculture Belt", region: "Chittagong Division", district: "Cumilla", thana: "Debidwar" },
    { name: "Jashore Crop Hub", region: "Khulna Division", district: "Jashore", thana: "Sharsha" },
  ];
  const terrMap: Record<string, any> = {};
  for (const t of territoriesData) {
    const terrDoc = await Territory.findOneAndUpdate(
      { name: t.name },
      { ...t, isActive: true },
      { upsert: true, new: true }
    );
    terrMap[t.name] = terrDoc._id;
  }

  // 6. Users & Roles
  // Password for all seed users is 'password123'
  const defaultPassword = "password123";

  // Managing Director
  let mdUser = await User.findOne({ email: "md@successagro.com" });
  if (!mdUser) {
    mdUser = await User.create({
      name: "Engr. Rafiqul Islam",
      email: "md@successagro.com",
      phone: "01711000001",
      password: defaultPassword,
      role: "ManagingDirector",
    });
  }

  // Admin
  let adminUser = await User.findOne({ email: "admin@successagro.com" });
  if (!adminUser) {
    adminUser = await User.create({
      name: "Tariqul Hasan",
      email: "admin@successagro.com",
      phone: "01711000002",
      password: defaultPassword,
      role: "Admin",
    });
  }

  // Delivery Man
  let deliveryUser = await User.findOne({ email: "delivery@successagro.com" });
  if (!deliveryUser) {
    deliveryUser = await User.create({
      name: "Abul Kalam (Delivery Driver)",
      email: "delivery@successagro.com",
      phone: "01719888777",
      password: defaultPassword,
      role: "DeliveryMan",
      vehicleNumber: "Bogura-Ta-11-2045 (Pickup)",
      assignedArea: "Bogura & North Bengal Division",
    });
  }

  // Sales Officer 1 (Bogura)
  let soUser1 = await User.findOne({ email: "so.bogura@successagro.com" });
  if (!soUser1) {
    soUser1 = await User.create({
      name: "Tanvir Ahmed",
      email: "so.bogura@successagro.com",
      phone: "01711000005",
      password: defaultPassword,
      role: "SalesOfficer",
    });
  }

  const soProfile1 = await SalesOfficer.findOneAndUpdate(
    { officerCode: "SO-BOG-01" },
    {
      user: soUser1._id,
      officerCode: "SO-BOG-01",
      name: "Tanvir Ahmed",
      phone: "01711000005",
      email: "so.bogura@successagro.com",
      territory: terrMap["Bogura North"],
      targetMonthlyAmount: 500000,
      commissionRate: 2.5,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  soUser1.salesOfficerProfile = soProfile1._id;
  await soUser1.save();

  // Sales Officer 2 (Dinajpur)
  let soUser2 = await User.findOne({ email: "so.dinajpur@successagro.com" });
  if (!soUser2) {
    soUser2 = await User.create({
      name: "Kamrul Hasan",
      email: "so.dinajpur@successagro.com",
      phone: "01711000006",
      password: defaultPassword,
      role: "SalesOfficer",
    });
  }

  const soProfile2 = await SalesOfficer.findOneAndUpdate(
    { officerCode: "SO-DIN-02" },
    {
      user: soUser2._id,
      officerCode: "SO-DIN-02",
      name: "Kamrul Hasan",
      phone: "01711000006",
      email: "so.dinajpur@successagro.com",
      territory: terrMap["Dinajpur Central"],
      targetMonthlyAmount: 600000,
      commissionRate: 2.5,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  soUser2.salesOfficerProfile = soProfile2._id;
  await soUser2.save();

  // 7. Agro Products (Realistic Bangladesh agrochemicals & bio-stimulants)
  const productsSeed = [
    {
      productCode: "SAG-001",
      name: "Success Chlorpyrifos 20 EC",
      banglaName: "সাকসেস ক্লোরপাইরিফস ২০ ইসি",
      category: catMap["Liquid Pesticides"],
      unit: unitsMap["Milliliter"],
      packSize: "500 ml",
      cartonSize: 20,
      tradePrice: 420,
      mrp: 490,
      minimumStockAlert: 100,
    },
    {
      productCode: "SAG-002",
      name: "Success Chlorpyrifos 20 EC (1L)",
      banglaName: "সাকসেস ক্লোরপাইরিফস ২০ ইসি (১ লিঃ)",
      category: catMap["Liquid Pesticides"],
      unit: unitsMap["Liter"],
      packSize: "1 Liter",
      cartonSize: 12,
      tradePrice: 790,
      mrp: 920,
      minimumStockAlert: 80,
    },
    {
      productCode: "SAG-003",
      name: "Success Mancozeb 80 WP",
      banglaName: "সাকসেস ম্যানকোজেব ৮০ ডব্লিউপি",
      category: catMap["Powder Fungicides"],
      unit: unitsMap["Gram"],
      packSize: "500 gm",
      cartonSize: 24,
      tradePrice: 380,
      mrp: 450,
      minimumStockAlert: 150,
    },
    {
      productCode: "SAG-004",
      name: "Success Bio-Gold Micro Nutrient",
      banglaName: "সাকসেস বায়ো-গোল্ড অণু খাদ্য",
      category: catMap["Bio-Fertilizers & Stimulants"],
      unit: unitsMap["Liter"],
      packSize: "1 Liter",
      cartonSize: 12,
      tradePrice: 650,
      mrp: 750,
      minimumStockAlert: 60,
    },
    {
      productCode: "SAG-005",
      name: "Success Glyphosate 41 SL",
      banglaName: "সাকসেস গ্লাইফোসেট ৪১ এসএল",
      category: catMap["Herbicides"],
      unit: unitsMap["Liter"],
      packSize: "1 Liter",
      cartonSize: 12,
      tradePrice: 580,
      mrp: 680,
      minimumStockAlert: 70,
    },
  ];

  const productDocs: any[] = [];
  for (const p of productsSeed) {
    const prodDoc = await Product.findOneAndUpdate(
      { productCode: p.productCode },
      { ...p, isActive: true },
      { upsert: true, new: true }
    );
    productDocs.push(prodDoc);

    // Seed initial inventory balance for finished goods
    await InventoryBalance.findOneAndUpdate(
      {
        warehouse: whMap["WH-BOG-01"],
        itemType: "FinishedGood",
        product: prodDoc._id,
      },
      {
        quantityOnHand: 250,
        availableQuantity: 250,
        reservedQuantity: 0,
      },
      { upsert: true }
    );
  }

  // 8. Raw Materials
  const rawMaterialsData = [
    {
      materialCode: "RM-CHL-TECH",
      name: "Chlorpyrifos Technical 98%",
      category: "Active Chemical",
      unit: unitsMap["Kilogram"],
      minimumStockAlert: 50,
      averageCost: 1100,
    },
    {
      materialCode: "RM-SOLV-X",
      name: "Agricultural Emulsifier & Solvent",
      category: "Excipient",
      unit: unitsMap["Liter"],
      minimumStockAlert: 100,
      averageCost: 180,
    },
    {
      materialCode: "RM-BTL-500",
      name: "HDPE Agro Bottle 500ml with Cap",
      category: "Packaging",
      unit: unitsMap["Piece"],
      minimumStockAlert: 500,
      averageCost: 18,
    },
  ];

  const rmDocs: any[] = [];
  for (const rm of rawMaterialsData) {
    const rmDoc = await RawMaterial.findOneAndUpdate(
      { materialCode: rm.materialCode },
      { ...rm, isActive: true },
      { upsert: true, new: true }
    );
    rmDocs.push(rmDoc);

    await InventoryBalance.findOneAndUpdate(
      {
        warehouse: whMap["WH-BOG-01"],
        itemType: "RawMaterial",
        rawMaterial: rmDoc._id,
      },
      {
        quantityOnHand: 1500,
        availableQuantity: 1500,
        reservedQuantity: 0,
      },
      { upsert: true }
    );
  }

  // 9. BOM Recipe for Success Chlorpyrifos 20 EC
  if (productDocs[0] && rmDocs.length >= 3) {
    await BOM.findOneAndUpdate(
      { product: productDocs[0]._id },
      {
        product: productDocs[0]._id,
        name: "Standard Recipe for Chlorpyrifos 20 EC (500ml)",
        version: "1.0",
        items: [
          { rawMaterial: rmDocs[0]._id, quantityPerUnit: 0.11, unitCostEstimate: 121 },
          { rawMaterial: rmDocs[1]._id, quantityPerUnit: 0.39, unitCostEstimate: 70 },
          { rawMaterial: rmDocs[2]._id, quantityPerUnit: 1.0, unitCostEstimate: 18 },
        ],
        estimatedTotalCostPerUnit: 209,
        isActive: true,
      },
      { upsert: true }
    );
  }

  // 10. Financial Accounts
  const accountsData = [
    {
      name: "Factory Petty Cash",
      type: "Cash",
      currentBalance: 85000,
      openingBalance: 50000,
    },
    {
      name: "Islami Bank Current A/C (Bogura Branch)",
      type: "Bank",
      bankName: "Islami Bank Bangladesh PLC",
      branchName: "Bogura Corporate Branch",
      accountNumber: "20501234567890",
      currentBalance: 1450000,
      openingBalance: 1000000,
    },
    {
      name: "bKash Merchant Account",
      type: "MobileBanking",
      accountNumber: "01711999888",
      currentBalance: 320000,
      openingBalance: 150000,
    },
  ];

  for (const acc of accountsData) {
    await Account.findOneAndUpdate(
      { name: acc.name },
      { ...acc, isActive: true },
      { upsert: true }
    );
  }

  // 11. Expense Categories
  const expenseCategories = [
    "Factory Rent & Utilities",
    "Raw Material Freight & Transport",
    "Plant Labor & Wages",
    "Machinery Maintenance & Fuel",
    "Marketing, Field Demo & Travel",
    "Office Stationery & Communications",
  ];
  for (const ec of expenseCategories) {
    await ExpenseCategory.findOneAndUpdate(
      { name: ec },
      { name: ec, isActive: true },
      { upsert: true }
    );
  }

  // 12. Dealers
  const dealersData = [
    {
      dealerCode: "DLR-BOG-001",
      businessName: "Bismillah Krishi Vander",
      proprietorName: "Haji Nurul Islam",
      phone: "01712111222",
      address: "Station Road, Bogura Sadar",
      territory: terrMap["Bogura North"],
      assignedSalesOfficer: soProfile1._id,
      creditLimit: 300000,
      currentBalance: 85000,
      openingBalance: 50000,
      status: "Active",
    },
    {
      dealerCode: "DLR-DIN-002",
      businessName: "Green Crop Care Agency",
      proprietorName: "Md. Mostafizur Rahman",
      phone: "01713333444",
      address: "Chawkbazar, Dinajpur",
      territory: terrMap["Dinajpur Central"],
      assignedSalesOfficer: soProfile2._id,
      creditLimit: 400000,
      currentBalance: 142000,
      openingBalance: 100000,
      status: "Active",
    },
    {
      dealerCode: "DLR-BOG-003",
      businessName: "Agro Seba Traders",
      proprietorName: "Zillur Rahman",
      phone: "01714555666",
      address: "Sariakandi Bazar, Bogura",
      territory: terrMap["Bogura North"],
      assignedSalesOfficer: soProfile1._id,
      creditLimit: 250000,
      currentBalance: 45000,
      openingBalance: 30000,
      status: "Active",
    },
    {
      dealerCode: "DLR-MITHA-01",
      businessName: "হিসাব ট্রেডার্স মিঠাপুকুর",
      proprietorName: "মো: রুকনুজ্জামান উসমান",
      phone: "01737-138181",
      address: "মিঠাপুকুর বাজার, রংপুর / জয়পুরহাট",
      territory: terrMap["Dinajpur Central"],
      assignedSalesOfficer: soProfile2._id,
      creditLimit: 1000000,
      monthlyCollectionPercentage: 25,
      currentBalance: 399125,
      openingBalance: 0,
      status: "Active",
    },
    {
      dealerCode: "09",
      businessName: "M/S Dipto Traders, Md. Faruk Hosin",
      proprietorName: "Md. Faruk Hosin",
      phone: "01737-138181",
      address: "Taltola Mithapukur Rangpur",
      territory: terrMap["Dinajpur Central"],
      assignedSalesOfficer: soProfile2._id,
      creditLimit: 1000000,
      monthlyCollectionPercentage: 25,
      currentBalance: 0,
      openingBalance: 0,
      status: "Active",
    },
  ];

  const dealerDocsMap: Record<string, any> = {};
  for (const d of dealersData) {
    const doc = await Dealer.findOneAndUpdate(
      { dealerCode: d.dealerCode },
      d,
      { upsert: true, new: true }
    );
    dealerDocsMap[d.dealerCode] = doc;
  }

  // 12.1 Seed Ledger Entries for Image 2 (M/S Dipto Traders, Code 09)
  const diptoDealer = dealerDocsMap["09"];
  if (diptoDealer && adminUser) {
    await LedgerEntry.deleteMany({ entityType: "DEALER", dealer: diptoDealer._id });

    const diptoRows = [
      { sl: 1, invDate: "2025-10-14", debit: 57672, payDate: "2026-04-02", credit: 4784, mr: "70000-65216=4784" },
      { sl: 2, invDate: "2025-10-18", debit: 55310, payDate: "2026-04-09", credit: 10000, mr: "" },
      { sl: 3, invDate: "2026-01-07", debit: 57400, payDate: "2026-04-12", credit: 12000, mr: "" },
      { sl: 4, invDate: "2026-01-28", debit: 55020, payDate: "2026-04-16", credit: 18000, mr: "" },
      { sl: 5, invDate: "2026-02-28", debit: 106580, payDate: "2026-04-26", credit: 10000, mr: "" },
      { sl: 6, invDate: "2026-04-04", debit: 100300, payDate: "2026-04-30", credit: 10216, mr: "71751" },
      { sl: 7, invDate: "2026-06-04", debit: 0, payDate: "2026-06-04", credit: 10000, mr: "71767" },
      { sl: 8, invDate: "2026-06-14", debit: 0, payDate: "2026-06-14", credit: 10000, mr: "71773" },
      { sl: 9, invDate: "2026-06-18", debit: 0, payDate: "2026-06-18", credit: 10000, mr: "71775" },
      { sl: 10, invDate: "2026-06-22", debit: 0, payDate: "2026-06-22", credit: 10000, mr: "71781" },
      { sl: 11, invDate: "2026-06-23", debit: 0, payDate: "2026-06-23", credit: 40000, mr: "71782" },
      { sl: 12, invDate: "2026-06-28", debit: 0, payDate: "2026-06-28", credit: 40000, mr: "71782" },
      { sl: 13, invDate: "2026-06-30", debit: 0, payDate: "2026-06-30", credit: 20000, mr: "71782" },
      { sl: 14, invDate: "2026-07-05", debit: 0, payDate: "2026-07-05", credit: 40000, mr: "71782" },
      { sl: 15, invDate: "2026-07-07", debit: 0, payDate: "2026-07-07", credit: 10000, mr: "71782" },
      { sl: 16, invDate: "2026-07-09", debit: 0, payDate: "2026-07-09", credit: 20000, mr: "63003" },
      { sl: 17, invDate: "2026-07-23", debit: 0, payDate: "2026-07-23", credit: 10000, mr: "63003" },
      { sl: 18, invDate: "2026-07-26", debit: 0, payDate: "2026-07-26", credit: 5000, mr: "63003" },
      { sl: 19, invDate: "2026-07-27", debit: 0, payDate: "2026-07-27", credit: 60000, mr: "63003" },
      { sl: 20, invDate: "2026-07-28", debit: 0, payDate: "2026-07-28", credit: 20000, mr: "63014" },
      { sl: 21, invDate: "2026-07-29", debit: 0, payDate: "2026-07-29", credit: 19053, mr: "63015" },
    ];

    let runningBal = 0;
    for (const row of diptoRows) {
      runningBal = runningBal + row.debit - row.credit;
      await LedgerEntry.create({
        entityType: "DEALER",
        dealer: diptoDealer._id,
        transactionType: row.debit > 0 ? "INVOICE" : "COLLECTION",
        referenceNumber: `INV-${row.sl}`,
        invoiceNumber: String(row.sl),
        moneyReceiptNumber: row.mr,
        date: new Date(row.invDate),
        paymentDate: row.credit > 0 ? new Date(row.payDate) : undefined,
        description: row.debit > 0 ? `Invoice SL #${row.sl}` : `Payment MR #${row.mr}`,
        debit: row.debit,
        credit: row.credit,
        runningBalance: runningBal,
        isManual: true,
        createdBy: adminUser._id,
      });
    }

    // Adjustment row 37: 43229 (closes balance to 0)
    runningBal -= 43229;
    await LedgerEntry.create({
      entityType: "DEALER",
      dealer: diptoDealer._id,
      transactionType: "ADJUSTMENT",
      referenceNumber: "ADJ-43229",
      invoiceNumber: "37",
      date: new Date("2026-07-30"),
      description: "Balance Adjustment / Special Discount",
      debit: 0,
      credit: 0,
      adjustmentAmount: 43229,
      runningBalance: runningBal,
      isManual: true,
      createdBy: adminUser._id,
    });

    diptoDealer.currentBalance = runningBal;
    await diptoDealer.save();
  }

  // 12.2 Seed Ledger Entries for Image 1 (হিসাব ট্রেডার্স মিঠাপুকুর)
  const mithaDealer = dealerDocsMap["DLR-MITHA-01"];
  if (mithaDealer && adminUser) {
    await LedgerEntry.deleteMany({ entityType: "DEALER", dealer: mithaDealer._id });

    const mithaRows = [
      { date: "2025-11-29", invNo: "NO-01", mrNo: "", debit: 387350, credit: 0, desc: "Sales Delivery NO-01" },
      { date: "2025-12-05", invNo: "NO-03", mrNo: "", debit: 148780, credit: 0, desc: "Pesticides Dispatch NO-03" },
      { date: "2025-12-05", invNo: "NO-04", mrNo: "", debit: 66000, credit: 0, desc: "Fertilizer Delivery NO-04" },
      { date: "2025-12-18", invNo: "NO-05", mrNo: "", debit: 31630, credit: 0, desc: "Bio-stimulant Delivery NO-05" },
      { date: "2026-02-02", invNo: "", mrNo: "173.BL", debit: 0, credit: 100000, desc: "Bank Collection M.R. 173.BL" },
      { date: "2026-02-05", invNo: "NO-06", mrNo: "", debit: 88150, credit: 0, desc: "Chlorpyrifos Dispatch NO-06" },
      { date: "2026-02-05", invNo: "NO-07", mrNo: "", debit: 23190, credit: 0, desc: "Mancozeb Batch NO-07" },
      { date: "2026-02-10", invNo: "NO-08", mrNo: "", debit: 101100, credit: 0, desc: "Agro Protection Supply NO-08" },
      { date: "2026-02-25", invNo: "", mrNo: "MR-0225", debit: 0, credit: 100000, desc: "Cash Collection MR-0225" },
      { date: "2026-03-13", invNo: "", mrNo: "MR-0313", debit: 0, credit: 200000, desc: "Cheque Deposit MR-0313" },
      { date: "2026-03-21", invNo: "", mrNo: "MR-0321", debit: 0, credit: 100000, desc: "Payment Received MR-0321" },
      { date: "2026-04-07", invNo: "NO-09", mrNo: "4645", debit: 113180, credit: 50000, desc: "Delivery NO-09 & Collection 4645" },
      { date: "2026-04-11", invNo: "", mrNo: "MR-0411", debit: 0, credit: 100000, desc: "Collection MR-0411" },
      { date: "2026-04-14", invNo: "", mrNo: "MR-0414", debit: 0, credit: 42410, desc: "Bank Transfer MR-0414" },
      { date: "2026-04-15", invNo: "", mrNo: "MR-0415", debit: 0, credit: 35270, desc: "Final Payment MR-0415" },
    ];

    let runningBal = 0;
    for (const row of mithaRows) {
      runningBal = runningBal + row.debit - row.credit;
      await LedgerEntry.create({
        entityType: "DEALER",
        dealer: mithaDealer._id,
        transactionType: row.debit > 0 ? "INVOICE" : "COLLECTION",
        referenceNumber: row.invNo || row.mrNo || "GL-001",
        invoiceNumber: row.invNo,
        moneyReceiptNumber: row.mrNo,
        date: new Date(row.date),
        paymentDate: row.credit > 0 ? new Date(row.date) : undefined,
        description: row.desc,
        debit: row.debit,
        credit: row.credit,
        runningBalance: runningBal,
        isManual: true,
        createdBy: adminUser._id,
      });
    }

    mithaDealer.currentBalance = runningBal;
    await mithaDealer.save();
  }

  // 13. Employees
  const employeesData = [
    {
      employeeId: "EMP-0001",
      name: "Md. Mokbul Hossain",
      phone: "01720000011",
      designation: "Plant Head Operator",
      department: "Production",
      monthlySalary: 35000,
    },
    {
      employeeId: "EMP-0002",
      name: "Shorif Uddin",
      phone: "01720000012",
      designation: "Quality Control Analyst",
      department: "Production",
      monthlySalary: 32000,
    },
    {
      employeeId: "EMP-0003",
      name: "Anisur Rahman",
      phone: "01720000013",
      designation: "Senior Warehouse Officer",
      department: "Warehouse",
      monthlySalary: 28000,
    },
  ];

  for (const emp of employeesData) {
    await Employee.findOneAndUpdate(
      { employeeId: emp.employeeId },
      { ...emp, isActive: true },
      { upsert: true }
    );
  }

  logger.info("✅ Database seeded successfully with enterprise demo dataset.");
};

export const autoSeedIfEmpty = async () => {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    logger.info("Database is empty. Executing auto-seed...");
    await seedDatabase();
  }
};

// Direct script execution support
if (process.argv[1]?.endsWith("seed.ts")) {
  connectDB().then(async () => {
    await seedDatabase();
    process.exit(0);
  });
}
