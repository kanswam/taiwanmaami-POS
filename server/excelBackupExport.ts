import ExcelJS from 'exceljs';
import { getDb } from './db';
import {
  orders, orderItems, orderItemAddons,
  users, guestOrders,
  payments,
  stampTransactions, loyaltyRewards,
  products, categories, subcategories, addons,
  eventOrders, eventOrderItems, eventInquiries,
  workshops, workshopBookings, workshopDates,
  storeLocations, discounts, discountUsage,
  popupRegistrations,
} from '../drizzle/schema';
import { desc, eq, sql } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { sdk } from './_core/sdk';

// Paise to Rupees conversion
const toRupees = (paise: number) => (paise || 0) / 100;

// Admin auth middleware
async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  try {
    const user = await sdk.authenticateRequest(req as any);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return false;
    }
    return true;
  } catch {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }
}

// Shared styling
const BRAND_COLOR = 'FF8B0000';
const LIGHT_BG = 'FFFFF5F0';
const WHITE = 'FFFFFFFF';
const HEADER_BLUE = 'FF1E3A5F';
const LIGHT_BLUE = 'FFF0F4FA';

function applyHeaderStyle(row: ExcelJS.Row, colCount: number, color: string = BRAND_COLOR) {
  row.height = 28;
  for (let col = 1; col <= colCount; col++) {
    const cell = row.getCell(col);
    cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  }
}

function applyDataRowStyle(row: ExcelJS.Row, colCount: number, isAlternate: boolean, bgColor: string = LIGHT_BG) {
  for (let col = 1; col <= colCount; col++) {
    const cell = row.getCell(col);
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    };
    cell.font = { size: 10 };
    if (isAlternate) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    }
  }
}

function addTitle(sheet: ExcelJS.Worksheet, title: string, subtitle: string, colCount: number) {
  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: BRAND_COLOR } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 26;

  sheet.mergeCells(2, 1, 2, colCount);
  const subtitleCell = sheet.getCell('A2');
  subtitleCell.value = subtitle;
  subtitleCell.font = { size: 10, italic: true };
  subtitleCell.alignment = { horizontal: 'center' };
  sheet.getRow(2).height = 18;
}

function formatDate(d: any): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d: any): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function setCurrencyFormat(row: ExcelJS.Row, cols: number[]) {
  cols.forEach(col => {
    row.getCell(col).numFmt = '₹#,##0.00';
    row.getCell(col).alignment = { horizontal: 'right' };
  });
}

export async function handleBackupExcelExport(req: Request, res: Response) {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const dbInstance = await getDb();
    if (!dbInstance) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Taiwan Maami';
    workbook.created = new Date();

    const today = formatDate(new Date());

    // ============================================================
    // SHEET 1: SALES ORDERS
    // ============================================================
    const salesSheet = workbook.addWorksheet('Sales Orders');
    const SALES_COLS = 16;
    addTitle(salesSheet, 'Taiwan Maami — Sales Orders', `Database Export · ${today}`, SALES_COLS);

    const allOrders = await dbInstance.select().from(orders).orderBy(desc(orders.createdAt));

    const salesHeaderRow = salesSheet.getRow(4);
    salesHeaderRow.values = [
      'Order #', 'Date', 'Customer', 'Phone', 'Type', 'Outlet',
      'Status', 'Payment Status', 'Payment Method',
      'Subtotal', 'SGST', 'CGST', 'Delivery', 'Discount', 'Total',
      'Table #'
    ];
    applyHeaderStyle(salesHeaderRow, SALES_COLS);

    salesSheet.getColumn(1).width = 10;
    salesSheet.getColumn(2).width = 18;
    salesSheet.getColumn(3).width = 22;
    salesSheet.getColumn(4).width = 16;
    salesSheet.getColumn(5).width = 12;
    salesSheet.getColumn(6).width = 14;
    salesSheet.getColumn(7).width = 14;
    salesSheet.getColumn(8).width = 14;
    salesSheet.getColumn(9).width = 16;
    salesSheet.getColumn(10).width = 14;
    salesSheet.getColumn(11).width = 12;
    salesSheet.getColumn(12).width = 12;
    salesSheet.getColumn(13).width = 12;
    salesSheet.getColumn(14).width = 12;
    salesSheet.getColumn(15).width = 14;
    salesSheet.getColumn(16).width = 10;

    let salesRowNum = 5;
    // Read outlet names from store_locations table, with fallback
    let outletMap: Record<number, string> = { 1: 'T Nagar', 2: 'T Nagar' };
    try {
      const locRows = await dbInstance.execute(sql`SELECT id, name FROM store_locations`);
      for (const loc of locRows as any[]) {
        const shortName = (loc.name as string).replace('Taiwan Maami - ', '').replace('T Nagar', 'T Nagar');
        outletMap[loc.id as number] = shortName;
      }
    } catch (e) { /* use fallback */ }

    allOrders.forEach((o, idx) => {
      const row = salesSheet.getRow(salesRowNum);
      row.values = [
        o.orderNumber,
        formatDateTime(o.createdAt),
        o.customerName || '',
        o.customerPhone || '',
        o.orderType || '',
        outletMap[o.outletId || 0] || '',
        o.orderStatus || '',
        o.paymentStatus || '',
        o.paymentMethod || '',
        toRupees(o.subtotal || 0),
        toRupees(o.stateGst || 0),
        toRupees(o.centralGst || 0),
        toRupees(o.deliveryCharge || 0),
        toRupees(o.discountAmount || 0),
        toRupees(o.totalAmount || 0),
        o.tableNumber || '',
      ];
      applyDataRowStyle(row, SALES_COLS, idx % 2 === 1);
      setCurrencyFormat(row, [10, 11, 12, 13, 14, 15]);
      salesRowNum++;
    });

    salesSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // ============================================================
    // SHEET 2: ORDER LINE ITEMS
    // ============================================================
    const itemsSheet = workbook.addWorksheet('Order Items');
    const ITEMS_COLS = 10;
    addTitle(itemsSheet, 'Taiwan Maami — Order Line Items', `Database Export · ${today}`, ITEMS_COLS);

    const allItems = await dbInstance.select().from(orderItems).orderBy(desc(orderItems.id));
    // Get product names for lookup
    const allProducts = await dbInstance.select({ id: products.id, name: products.name }).from(products);
    const productMap = Object.fromEntries(allProducts.map(p => [p.id, p.name]));
    // Get order numbers for lookup
    const orderMap = Object.fromEntries(allOrders.map(o => [o.id, o.orderNumber]));

    const itemsHeaderRow = itemsSheet.getRow(4);
    itemsHeaderRow.values = [
      'Order #', 'Product', 'Variant', 'Qty', 'Unit Price', 'Total',
      'Sugar', 'Ice', 'Status', 'Add-ons'
    ];
    applyHeaderStyle(itemsHeaderRow, ITEMS_COLS);

    itemsSheet.getColumn(1).width = 10;
    itemsSheet.getColumn(2).width = 30;
    itemsSheet.getColumn(3).width = 14;
    itemsSheet.getColumn(4).width = 8;
    itemsSheet.getColumn(5).width = 14;
    itemsSheet.getColumn(6).width = 14;
    itemsSheet.getColumn(7).width = 10;
    itemsSheet.getColumn(8).width = 10;
    itemsSheet.getColumn(9).width = 12;
    itemsSheet.getColumn(10).width = 20;

    let itemsRowNum = 5;
    allItems.forEach((item, idx) => {
      const row = itemsSheet.getRow(itemsRowNum);
      row.values = [
        orderMap[item.orderId] || String(item.orderId),
        item.productName || productMap[item.productId] || '',
        item.size || '',
        item.quantity,
        toRupees(item.unitPrice || 0),
        toRupees((item.unitPrice || 0) * (item.quantity || 1)),
        item.sugarLevel || '',
        item.iceLevel || '',
        item.status || 'active',
        '',
      ];
      applyDataRowStyle(row, ITEMS_COLS, idx % 2 === 1);
      setCurrencyFormat(row, [5, 6]);
      itemsRowNum++;
    });

    itemsSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // ============================================================
    // SHEET 3: CUSTOMERS
    // ============================================================
    const custSheet = workbook.addWorksheet('Customers');
    const CUST_COLS = 12;
    addTitle(custSheet, 'Taiwan Maami — Customer List', `Database Export · ${today}`, CUST_COLS);

    const allUsers = await dbInstance.select().from(users).orderBy(desc(users.createdAt));

    const custHeaderRow = custSheet.getRow(4);
    custHeaderRow.values = [
      'Name', 'Email', 'Phone', 'Role', 'Login Method',
      'Stamps', 'Lifetime Stamps', 'Store Credit', 'Loyalty Points',
      'Birthday', 'Registered', 'Last Sign In'
    ];
    applyHeaderStyle(custHeaderRow, CUST_COLS);

    custSheet.getColumn(1).width = 22;
    custSheet.getColumn(2).width = 28;
    custSheet.getColumn(3).width = 16;
    custSheet.getColumn(4).width = 12;
    custSheet.getColumn(5).width = 14;
    custSheet.getColumn(6).width = 10;
    custSheet.getColumn(7).width = 14;
    custSheet.getColumn(8).width = 14;
    custSheet.getColumn(9).width = 14;
    custSheet.getColumn(10).width = 14;
    custSheet.getColumn(11).width = 16;
    custSheet.getColumn(12).width = 16;

    let custRowNum = 5;
    allUsers.forEach((u, idx) => {
      const birthday = u.birthMonth && u.birthDay ? `${u.birthMonth}/${u.birthDay}` : '';
      const row = custSheet.getRow(custRowNum);
      row.values = [
        u.name || '',
        u.email || '',
        u.phone || '',
        u.role || 'customer',
        u.loginMethod || '',
        u.stampCount || 0,
        u.lifetimeStamps || 0,
        toRupees(u.storeCredit || 0),
        u.loyaltyPoints || 0,
        birthday,
        formatDate(u.createdAt),
        formatDateTime(u.lastSignedIn),
      ];
      applyDataRowStyle(row, CUST_COLS, idx % 2 === 1);
      setCurrencyFormat(row, [8]);
      custRowNum++;
    });

    custSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // ============================================================
    // SHEET 4: GUEST ORDERS
    // ============================================================
    const guestSheet = workbook.addWorksheet('Guest Orders');
    const GUEST_COLS = 6;
    addTitle(guestSheet, 'Taiwan Maami — Guest Orders', `Database Export · ${today}`, GUEST_COLS);

    const allGuests = await dbInstance.select().from(guestOrders).orderBy(desc(guestOrders.createdAt));

    const guestHeaderRow = guestSheet.getRow(4);
    guestHeaderRow.values = ['Order ID', 'Guest Name', 'Guest Email', 'Guest Phone', 'Session ID', 'Date'];
    applyHeaderStyle(guestHeaderRow, GUEST_COLS);

    guestSheet.getColumn(1).width = 12;
    guestSheet.getColumn(2).width = 22;
    guestSheet.getColumn(3).width = 28;
    guestSheet.getColumn(4).width = 16;
    guestSheet.getColumn(5).width = 20;
    guestSheet.getColumn(6).width = 18;

    let guestRowNum = 5;
    allGuests.forEach((g, idx) => {
      const row = guestSheet.getRow(guestRowNum);
      row.values = [
        orderMap[g.orderId] || String(g.orderId),
        g.guestName || '',
        g.guestEmail || '',
        g.guestPhone || '',
        '',
        formatDateTime(g.createdAt),
      ];
      applyDataRowStyle(row, GUEST_COLS, idx % 2 === 1);
      guestRowNum++;
    });

    guestSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // ============================================================
    // SHEET 5: PAYMENTS
    // ============================================================
    const paySheet = workbook.addWorksheet('Payments');
    const PAY_COLS = 7;
    addTitle(paySheet, 'Taiwan Maami — Payment Details', `Database Export · ${today}`, PAY_COLS);

    const allPayments = await dbInstance.select().from(payments).orderBy(desc(payments.createdAt));

    const payHeaderRow = paySheet.getRow(4);
    payHeaderRow.values = [
      'Order #', 'Payment Method', 'Amount', 'Status',
      'Razorpay Payment ID', 'Razorpay Signature',
      'Date'
    ];
    applyHeaderStyle(payHeaderRow, PAY_COLS);

    paySheet.getColumn(1).width = 12;
    paySheet.getColumn(2).width = 16;
    paySheet.getColumn(3).width = 14;
    paySheet.getColumn(4).width = 14;
    paySheet.getColumn(5).width = 28;
    paySheet.getColumn(6).width = 28;
    paySheet.getColumn(7).width = 18;

    let payRowNum = 5;
    allPayments.forEach((p, idx) => {
      const row = paySheet.getRow(payRowNum);
      row.values = [
        orderMap[p.orderId] || String(p.orderId),
        p.paymentMethod || '',
        toRupees(p.amount || 0),
        p.paymentStatus || '',
        p.razorpayPaymentId || '',
        p.razorpaySignature || '',
        formatDateTime(p.createdAt),
      ];
      applyDataRowStyle(row, PAY_COLS, idx % 2 === 1);
      setCurrencyFormat(row, [3]);
      payRowNum++;
    });

    paySheet.views = [{ state: 'frozen', ySplit: 4 }];

    // ============================================================
    // SHEET 6: LOYALTY & STAMPS
    // ============================================================
    const loyaltySheet = workbook.addWorksheet('Loyalty & Stamps');
    const LOYALTY_COLS = 7;
    addTitle(loyaltySheet, 'Taiwan Maami — Loyalty Stamp Transactions', `Database Export · ${today}`, LOYALTY_COLS);

    const allStampTx = await dbInstance.select().from(stampTransactions).orderBy(desc(stampTransactions.createdAt));

    const loyaltyHeaderRow = loyaltySheet.getRow(4);
    loyaltyHeaderRow.values = ['Customer ID', 'Order ID', 'Action', 'Stamps', 'Order Total', 'Description', 'Date'];
    applyHeaderStyle(loyaltyHeaderRow, LOYALTY_COLS);

    loyaltySheet.getColumn(1).width = 14;
    loyaltySheet.getColumn(2).width = 12;
    loyaltySheet.getColumn(3).width = 12;
    loyaltySheet.getColumn(4).width = 10;
    loyaltySheet.getColumn(5).width = 14;
    loyaltySheet.getColumn(6).width = 40;
    loyaltySheet.getColumn(7).width = 18;

    // Build user name lookup
    const userNameMap = Object.fromEntries(allUsers.map(u => [u.id, u.name || u.email || String(u.id)]));

    let loyaltyRowNum = 5;
    allStampTx.forEach((tx, idx) => {
      const row = loyaltySheet.getRow(loyaltyRowNum);
      row.values = [
        userNameMap[tx.userId] || String(tx.userId),
        tx.orderId ? (orderMap[tx.orderId] || String(tx.orderId)) : '',
        tx.action || '',
        tx.stamps || 0,
        toRupees(tx.orderTotal || 0),
        tx.description || '',
        formatDateTime(tx.createdAt),
      ];
      applyDataRowStyle(row, LOYALTY_COLS, idx % 2 === 1);
      setCurrencyFormat(row, [5]);
      loyaltyRowNum++;
    });

    loyaltySheet.views = [{ state: 'frozen', ySplit: 4 }];

    // ============================================================
    // SHEET 7: LOYALTY REWARDS
    // ============================================================
    const rewardsSheet = workbook.addWorksheet('Rewards');
    const REWARDS_COLS = 7;
    addTitle(rewardsSheet, 'Taiwan Maami — Loyalty Rewards', `Database Export · ${today}`, REWARDS_COLS);

    const allRewards = await dbInstance.select().from(loyaltyRewards).orderBy(desc(loyaltyRewards.createdAt));

    const rewardsHeaderRow = rewardsSheet.getRow(4);
    rewardsHeaderRow.values = ['Customer', 'Reward Type', 'Voucher Code', 'Redeemed?', 'Created', 'Expires', 'Redeemed On'];
    applyHeaderStyle(rewardsHeaderRow, REWARDS_COLS);

    rewardsSheet.getColumn(1).width = 22;
    rewardsSheet.getColumn(2).width = 24;
    rewardsSheet.getColumn(3).width = 24;
    rewardsSheet.getColumn(4).width = 12;
    rewardsSheet.getColumn(5).width = 18;
    rewardsSheet.getColumn(6).width = 18;
    rewardsSheet.getColumn(7).width = 18;

    let rewardsRowNum = 5;
    allRewards.forEach((r, idx) => {
      const row = rewardsSheet.getRow(rewardsRowNum);
      row.values = [
        userNameMap[r.userId] || String(r.userId),
        r.rewardType || '',
        r.voucherCode || '',
        r.isRedeemed ? 'Yes' : 'No',
        formatDate(r.createdAt),
        formatDate(r.expiresAt),
        r.redeemedAt ? formatDateTime(r.redeemedAt) : '',
      ];
      applyDataRowStyle(row, REWARDS_COLS, idx % 2 === 1);
      rewardsRowNum++;
    });

    rewardsSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // ============================================================
    // SHEET 8: PRODUCTS & MENU
    // ============================================================
    const prodSheet = workbook.addWorksheet('Products & Menu');
    const PROD_COLS = 11;
    addTitle(prodSheet, 'Taiwan Maami — Product Catalog', `Database Export · ${today}`, PROD_COLS);

    const allProductsFull = await dbInstance.select().from(products).orderBy(products.subcategoryId, products.displayOrder);
    const allCategories = await dbInstance.select().from(categories);
    const allSubcategories = await dbInstance.select().from(subcategories);
    const catMap = Object.fromEntries(allCategories.map(c => [c.id, c.name]));
    const subCatMap = Object.fromEntries(allSubcategories.map(s => [s.id, s.name]));

    // Build subcategory -> category lookup
    const subCatToCat = Object.fromEntries(allSubcategories.map(s => [s.id, s.categoryId]));

    const prodHeaderRow = prodSheet.getRow(4);
    prodHeaderRow.values = [
      'Product Name', 'Chinese Name', 'Category', 'Subcategory',
      'In-Store Price', 'Delivery Price', 'Status',
      'Veg/Non-Veg', 'In Stock', 'Available', 'Description'
    ];
    applyHeaderStyle(prodHeaderRow, PROD_COLS);

    prodSheet.getColumn(1).width = 30;
    prodSheet.getColumn(2).width = 20;
    prodSheet.getColumn(3).width = 16;
    prodSheet.getColumn(4).width = 20;
    prodSheet.getColumn(5).width = 14;
    prodSheet.getColumn(6).width = 14;
    prodSheet.getColumn(7).width = 12;
    prodSheet.getColumn(8).width = 14;
    prodSheet.getColumn(9).width = 10;
    prodSheet.getColumn(10).width = 12;
    prodSheet.getColumn(11).width = 40;

    let prodRowNum = 5;
    allProductsFull.forEach((p, idx) => {
      const row = prodSheet.getRow(prodRowNum);
      row.values = [
        p.name || '',
        p.chineseName || '',
        catMap[subCatToCat[p.subcategoryId] || 0] || '',
        subCatMap[p.subcategoryId || 0] || '',
        p.instorePrice ? toRupees(p.instorePrice) : '',
        p.deliveryPrice ? toRupees(p.deliveryPrice) : '',
        p.isActive ? 'Active' : 'Inactive',
        p.isVegetarian ? 'Veg' : (p.isNonVeg ? 'Non-Veg' : ''),
        p.isInStock ? 'Yes' : 'No',
        p.isAvailable ? 'Yes' : 'No',
        p.description || '',
      ];
      applyDataRowStyle(row, PROD_COLS, idx % 2 === 1);
      setCurrencyFormat(row, [5, 6]);
      prodRowNum++;
    });

    prodSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // ============================================================
    // SHEET 9: EVENT ORDERS
    // ============================================================
    const eventSheet = workbook.addWorksheet('Event Orders');
    const EVENT_COLS = 10;
    addTitle(eventSheet, 'Taiwan Maami — Event Orders', `Database Export · ${today}`, EVENT_COLS);

    const allEventOrders = await dbInstance.select().from(eventOrders).orderBy(desc(eventOrders.createdAt));

    const eventHeaderRow = eventSheet.getRow(4);
    eventHeaderRow.values = [
      'Event #', 'Customer', 'Company', 'Event Type', 'Event Date',
      'Guests', 'Status', 'Total', 'Notes', 'Created'
    ];
    applyHeaderStyle(eventHeaderRow, EVENT_COLS);

    eventSheet.getColumn(1).width = 10;
    eventSheet.getColumn(2).width = 22;
    eventSheet.getColumn(3).width = 22;
    eventSheet.getColumn(4).width = 16;
    eventSheet.getColumn(5).width = 16;
    eventSheet.getColumn(6).width = 10;
    eventSheet.getColumn(7).width = 14;
    eventSheet.getColumn(8).width = 14;
    eventSheet.getColumn(9).width = 30;
    eventSheet.getColumn(10).width = 18;

    let eventRowNum = 5;
    allEventOrders.forEach((e, idx) => {
      const row = eventSheet.getRow(eventRowNum);
      row.values = [
        e.orderNumber || String(e.id),
        e.customerName || '',
        e.companyName || '',
        e.eventType || '',
        formatDate(e.eventDate),
        e.guestCount || 0,
        e.status || '',
        toRupees(e.totalAmount || 0),
        e.adminNotes || '',
        formatDateTime(e.createdAt),
      ];
      applyDataRowStyle(row, EVENT_COLS, idx % 2 === 1);
      setCurrencyFormat(row, [8]);
      eventRowNum++;
    });

    eventSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // ============================================================
    // SHEET 10: DISCOUNTS & COUPONS
    // ============================================================
    const discountSheet = workbook.addWorksheet('Discounts');
    const DISC_COLS = 9;
    addTitle(discountSheet, 'Taiwan Maami — Discounts & Coupons', `Database Export · ${today}`, DISC_COLS);

    const allDiscounts = await dbInstance.select().from(discounts);

    const discHeaderRow = discountSheet.getRow(4);
    discHeaderRow.values = [
      'Code', 'Description', 'Type', 'Value', 'Min Order',
      'Max Uses', 'Used Count', 'Active', 'Expires'
    ];
    applyHeaderStyle(discHeaderRow, DISC_COLS);

    discountSheet.getColumn(1).width = 18;
    discountSheet.getColumn(2).width = 30;
    discountSheet.getColumn(3).width = 14;
    discountSheet.getColumn(4).width = 12;
    discountSheet.getColumn(5).width = 14;
    discountSheet.getColumn(6).width = 12;
    discountSheet.getColumn(7).width = 12;
    discountSheet.getColumn(8).width = 10;
    discountSheet.getColumn(9).width = 16;

    let discRowNum = 5;
    allDiscounts.forEach((d, idx) => {
      const row = discountSheet.getRow(discRowNum);
      row.values = [
        d.code || '',
        d.description || '',
        d.type || '',
        d.type === 'percentage' ? `${d.value}%` : toRupees(d.value || 0),
        toRupees(d.minOrderAmount || 0),
        d.usageLimit || 'Unlimited',
        d.usageCount || 0,
        d.isActive ? 'Yes' : 'No',
        d.validUntil ? formatDate(d.validUntil) : 'Never',
      ];
      applyDataRowStyle(row, DISC_COLS, idx % 2 === 1);
      discRowNum++;
    });

    discountSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // ============================================================
    // SHEET 11: STORE LOCATIONS
    // ============================================================
    const storeSheet = workbook.addWorksheet('Store Locations');
    const STORE_COLS = 8;
    addTitle(storeSheet, 'Taiwan Maami — Store Locations', `Database Export · ${today}`, STORE_COLS);

    const allStores = await dbInstance.select().from(storeLocations);

    const storeHeaderRow = storeSheet.getRow(4);
    storeHeaderRow.values = ['Name', 'Address', 'Phone', 'Open Time', 'Close Time', 'Delivery', 'Dine-In', 'Pickup'];
    applyHeaderStyle(storeHeaderRow, STORE_COLS);

    storeSheet.getColumn(1).width = 20;
    storeSheet.getColumn(2).width = 40;
    storeSheet.getColumn(3).width = 16;
    storeSheet.getColumn(4).width = 12;
    storeSheet.getColumn(5).width = 12;
    storeSheet.getColumn(6).width = 10;
    storeSheet.getColumn(7).width = 10;
    storeSheet.getColumn(8).width = 10;

    let storeRowNum = 5;
    allStores.forEach((s, idx) => {
      const row = storeSheet.getRow(storeRowNum);
      row.values = [
        s.name || '',
        s.address || '',
        s.phone || '',
        s.openingHours || '',
        '',
        s.isActive ? 'Yes' : 'No',
        '',
        '',
      ];
      applyDataRowStyle(row, STORE_COLS, idx % 2 === 1);
      storeRowNum++;
    });

    storeSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // ============================================================
    // SHEET 12: LEELA REGISTRATIONS
    // ============================================================
    const leelaSheet = workbook.addWorksheet('Leela Registrations');
    const LEELA_COLS = 9;
    addTitle(leelaSheet, 'Taiwan Maami — Leela Hyderabad Registrations', `Database Export · ${today}`, LEELA_COLS);

    const allRegs = await dbInstance.select().from(popupRegistrations).orderBy(desc(popupRegistrations.createdAt));

    const leelaHeaderRow = leelaSheet.getRow(4);
    leelaHeaderRow.values = ['Name', 'Email', 'Phone', 'Event Type', 'Date', 'Guests', 'Status', 'Registered', 'Notes'];
    applyHeaderStyle(leelaHeaderRow, LEELA_COLS);

    leelaSheet.getColumn(1).width = 22;
    leelaSheet.getColumn(2).width = 28;
    leelaSheet.getColumn(3).width = 16;
    leelaSheet.getColumn(4).width = 16;
    leelaSheet.getColumn(5).width = 14;
    leelaSheet.getColumn(6).width = 10;
    leelaSheet.getColumn(7).width = 14;
    leelaSheet.getColumn(8).width = 18;
    leelaSheet.getColumn(9).width = 30;

    let leelaRowNum = 5;
    allRegs.forEach((r, idx) => {
      const row = leelaSheet.getRow(leelaRowNum);
      row.values = [
        r.customerName || '',
        r.customerEmail || '',
        r.customerPhone || '',
        r.eventType || '',
        r.selectedDate || '',
        r.numberOfGuests || 0,
        r.status || '',
        formatDateTime(r.createdAt),
        r.specialRequirements || '',
      ];
      applyDataRowStyle(row, LEELA_COLS, idx % 2 === 1);
      leelaRowNum++;
    });

    leelaSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // ============================================================
    // SHEET 13: SUMMARY DASHBOARD
    // ============================================================
    const summarySheet = workbook.addWorksheet('Summary');
    // Summary sheet is added last but will appear as a key overview sheet

    const SUMMARY_COLS = 4;
    addTitle(summarySheet, 'Taiwan Maami — Database Export Summary', `Generated on ${formatDateTime(new Date())}`, SUMMARY_COLS);

    summarySheet.getColumn(1).width = 30;
    summarySheet.getColumn(2).width = 20;
    summarySheet.getColumn(3).width = 20;
    summarySheet.getColumn(4).width = 20;

    const summaryHeaderRow = summarySheet.getRow(4);
    summaryHeaderRow.values = ['Category', 'Count', 'Details', 'Sheet'];
    applyHeaderStyle(summaryHeaderRow, SUMMARY_COLS, HEADER_BLUE);

    const completedOrders = allOrders.filter(o => o.orderStatus === 'completed');
    const cancelledOrders = allOrders.filter(o => o.orderStatus === 'cancelled');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const registeredCustomers = allUsers.filter(u => u.role === 'customer');
    const staffUsers = allUsers.filter(u => u.role === 'staff' || u.role === 'admin');

    const summaryData = [
      ['Total Orders', allOrders.length, `${completedOrders.length} completed, ${cancelledOrders.length} cancelled`, 'Sales Orders'],
      ['Total Revenue', `₹${toRupees(totalRevenue).toLocaleString('en-IN')}`, 'From completed orders', 'Sales Orders'],
      ['Order Items', allItems.length, `Across ${allOrders.length} orders`, 'Order Items'],
      ['Registered Customers', registeredCustomers.length, `+ ${staffUsers.length} staff/admin`, 'Customers'],
      ['Guest Orders', allGuests.length, 'Non-registered orders', 'Guest Orders'],
      ['Payments Recorded', allPayments.length, '', 'Payments'],
      ['Stamp Transactions', allStampTx.length, `${allRewards.length} rewards earned`, 'Loyalty & Stamps'],
      ['Products in Menu', allProductsFull.length, `${allCategories.length} categories, ${allSubcategories.length} subcategories`, 'Products & Menu'],
      ['Event Orders', allEventOrders.length, '', 'Event Orders'],
      ['Discount Codes', allDiscounts.length, '', 'Discounts'],
      ['Store Locations', allStores.length, '', 'Store Locations'],
      ['Leela Registrations', allRegs.length, '', 'Leela Registrations'],
    ];

    let summaryRowNum = 5;
    summaryData.forEach((row, idx) => {
      const r = summarySheet.getRow(summaryRowNum);
      r.values = row;
      applyDataRowStyle(r, SUMMARY_COLS, idx % 2 === 1, LIGHT_BLUE);
      r.getCell(1).font = { bold: true, size: 10 };
      r.getCell(2).font = { bold: true, size: 10 };
      summaryRowNum++;
    });

    summarySheet.views = [{ state: 'frozen', ySplit: 4 }];

    // ============================================================
    // SET PRINT SETUP FOR ALL SHEETS
    // ============================================================
    workbook.eachSheet(sheet => {
      sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    });

    // Generate and send
    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Taiwan_Maami_Database_Export_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', (buffer as any).length);
    res.send(Buffer.from(buffer as ArrayBuffer));

  } catch (error) {
    console.error('Backup Excel export error:', error);
    res.status(500).json({ error: 'Failed to generate database export', details: String(error) });
  }
}
