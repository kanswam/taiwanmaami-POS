import ExcelJS from 'exceljs';
import { getDb } from './db';
import { orders, workshopBookings, b2bInvoices } from '../drizzle/schema';
import { and, eq, sql } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { sdk } from './_core/sdk';
import {
  BRAND, FMT,
  addTitleBlock, styleHeaderRow, styleDataRow, styleTotalsRow, styleSubtotalRow,
  addSectionTitle, addFooterNote, applySheetSetup, createWorkbook,
  setColumnWidths, formatDate, toRupees, round2, addLegend,
} from './excelStyles';

// Outlet name mapping - reads from store_locations table, with fallback
let outletNameCache: Record<number, string> = {};
let outletCacheLoaded = false;

async function loadOutletNames() {
  if (outletCacheLoaded) return;
  try {
    const dbInstance = await getDb();
    if (dbInstance) {
      const rows = await dbInstance.execute(sql`SELECT id, name FROM store_locations`);
      for (const row of rows as any[]) {
        const fullName = row.name as string;
        const shortName = fullName.replace('Taiwan Maami - ', '').replace('T Nagar', 'T. Nagar');
        outletNameCache[row.id as number] = shortName;
      }
      outletCacheLoaded = true;
    }
  } catch (e) {
    // Fallback to T. Nagar if DB fails
  }
}

const outletName = (outletId: number | null) => {
  if (!outletId) return 'T. Nagar';
  return outletNameCache[outletId] || 'T. Nagar';
};

// Admin auth middleware for express routes
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

// Helper: format date string to local DD/MM/YYYY without timezone shift
function formatDateLocal(d: Date | string): string {
  if (typeof d === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    }
    d = new Date(d);
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper: get date key (YYYY-MM-DD) from a Date without timezone shift
function getDateKey(d: Date | string): string {
  if (typeof d === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    d = new Date(d);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function handleSalesReportExport(req: Request, res: Response) {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  await loadOutletNames();

  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  const dbInstance = await getDb();
  if (!dbInstance) {
    return res.status(500).json({ error: 'Database not available' });
  }

  try {
    // 1. Fetch completed regular orders (RETAIL)
    const completedOrders = await dbInstance
      .select({
        orderNumber: orders.orderNumber,
        totalAmount: orders.totalAmount,
        subtotal: orders.subtotal,
        stateGst: orders.stateGst,
        centralGst: orders.centralGst,
        deliveryCharge: orders.deliveryCharge,
        discountAmount: orders.discountAmount,
        paymentMethod: orders.paymentMethod,
        outletId: orders.outletId,
        orderType: orders.orderType,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(
        sql`${orders.createdAt} >= ${startDate}`,
        sql`${orders.createdAt} <= ${endDate + ' 23:59:59'}`,
        sql`${orders.orderStatus} != 'cancelled'`,
      ))
      .orderBy(orders.createdAt);

    // 2. Fetch paid workshop bookings
    const paidWorkshops = await dbInstance
      .select({
        bookingNumber: workshopBookings.bookingNumber,
        totalAmount: workshopBookings.totalAmount,
        paymentMethod: workshopBookings.paymentMethod,
        createdAt: workshopBookings.createdAt,
      })
      .from(workshopBookings)
      .where(and(
        sql`${workshopBookings.createdAt} >= ${startDate}`,
        sql`${workshopBookings.createdAt} <= ${endDate + ' 23:59:59'}`,
        eq(workshopBookings.paymentStatus, 'paid'),
      ))
      .orderBy(workshopBookings.createdAt);

    // 3. Fetch B2B invoices (includes popup events like The Leela — already entered as B2B)
    const b2bResults = await dbInstance
      .select({
        invoiceNumber: b2bInvoices.invoiceNumber,
        invoiceDate: b2bInvoices.invoiceDate,
        clientName: b2bInvoices.clientName,
        clientGstin: b2bInvoices.clientGstin,
        clientState: b2bInvoices.clientState,
        category: b2bInvoices.category,
        subtotal: b2bInvoices.subtotal,
        gstRate: b2bInvoices.gstRate,
        cgst: b2bInvoices.cgst,
        sgst: b2bInvoices.sgst,
        igst: b2bInvoices.igst,
        totalAmount: b2bInvoices.totalAmount,
        tdsApplicable: b2bInvoices.tdsApplicable,
        tdsAmount: b2bInvoices.tdsAmount,
        amountReceived: b2bInvoices.amountReceived,
        paymentStatus: b2bInvoices.paymentStatus,
      })
      .from(b2bInvoices)
      .where(and(
        sql`${b2bInvoices.invoiceDate} >= ${startDate}`,
        sql`${b2bInvoices.invoiceDate} <= ${endDate}`,
      ))
      .orderBy(b2bInvoices.invoiceDate);

    // Build workbook
    const workbook = createWorkbook();
    const totalRetailTransactions = completedOrders.length + paidWorkshops.length;

    // ===== Sheet 1: Sales Report (Retail Transactions) =====
    const salesSheet = workbook.addWorksheet('Sales Report');
    const SALES_COLS = 12;
    addTitleBlock(salesSheet, 'Taiwan Maami — Sales Report', `Period: ${formatDate(startDate)} to ${formatDate(endDate)}  ·  ${totalRetailTransactions} retail transactions`, SALES_COLS);

    const headers = [
      'S.No', 'Invoice No.', 'Date', 'Source', 'Order Type', 'Outlet',
      'Taxable Amount', 'CGST', 'SGST', 'Total GST',
      'Total Amount', 'Payment Method'
    ];
    const headerRow = salesSheet.getRow(4);
    headers.forEach((h, idx) => { headerRow.getCell(idx + 1).value = h; });
    styleHeaderRow(headerRow, SALES_COLS);

    setColumnWidths(salesSheet, [
      [1, 6], [2, 18], [3, 14], [4, 14], [5, 14], [6, 16],
      [7, 18], [8, 14], [9, 14], [10, 14],
      [11, 18], [12, 18],
    ]);

    let rowNum = 5;
    let serialNo = 1;
    let retailTaxable = 0, retailCgst = 0, retailSgst = 0, retailGst = 0, retailTotal = 0;

    // Regular orders
    for (const order of completedOrders) {
      const cgst = toRupees(order.centralGst);
      const sgst = toRupees(order.stateGst);
      const gst = cgst + sgst;
      const total = toRupees(order.totalAmount);
      const taxable = total - gst;

      retailTaxable += taxable;
      retailCgst += cgst;
      retailSgst += sgst;
      retailGst += gst;
      retailTotal += total;

      // Format order type for display
      const orderTypeLabel = (order.orderType || 'instore').toLowerCase() === 'delivery' ? 'Delivery'
        : (order.orderType || 'instore').toLowerCase() === 'pickup' ? 'Pickup'
        : 'Dine-in';

      const row = salesSheet.getRow(rowNum);
      row.values = [
        serialNo++,
        order.orderNumber,
        formatDate(order.createdAt),
        'Order',
        orderTypeLabel,
        outletName(order.outletId),
        round2(taxable),
        round2(cgst),
        round2(sgst),
        round2(gst),
        round2(total),
        (order.paymentMethod || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      ];

      styleDataRow(row, SALES_COLS, serialNo % 2 === 0, {
        currencyCols: [7, 8, 9, 10, 11],
        centerCols: [1, 3, 5],
      });
      rowNum++;
    }

    // Workshop bookings
    let workshopTaxable = 0, workshopCgst = 0, workshopSgst = 0, workshopGst = 0, workshopTotal = 0;
    for (const booking of paidWorkshops) {
      const total = toRupees(booking.totalAmount);
      const gstRate = 0.05;
      const taxable = total / (1 + gstRate);
      const gst = total - taxable;
      const cgst = gst / 2;
      const sgst = gst / 2;

      workshopTaxable += taxable;
      workshopCgst += cgst;
      workshopSgst += sgst;
      workshopGst += gst;
      workshopTotal += total;

      const row = salesSheet.getRow(rowNum);
      row.values = [
        serialNo++,
        booking.bookingNumber,
        formatDate(booking.createdAt),
        'Workshop',
        '—',
        'T. Nagar',
        round2(taxable),
        round2(cgst),
        round2(sgst),
        round2(gst),
        round2(total),
        (booking.paymentMethod || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      ];

      styleDataRow(row, SALES_COLS, false, {
        currencyCols: [7, 8, 9, 10, 11],
        centerCols: [1, 3, 5],
        customBg: BRAND.WORKSHOP_BG,
      });
      rowNum++;
    }

    // Legend
    rowNum++;
    rowNum = addLegend(salesSheet, rowNum, [
      { color: BRAND.ALT_ROW, label: 'Regular Order' },
      { color: BRAND.WORKSHOP_BG, label: 'Workshop Booking' },
    ]);

    rowNum++;
    addFooterNote(salesSheet, rowNum, '\u2192 See "Summary" and "GST Summary" sheets for totals. B2B/external invoices are shown separately in the GST Summary sheet.', SALES_COLS);

    // ===== Sheet 2: Summary =====
    const summarySheet = workbook.addWorksheet('Summary');
    const SUM_COLS = 7;
    addTitleBlock(summarySheet, `Taiwan Maami — Sales Summary`, `${formatDate(startDate)} to ${formatDate(endDate)}`, SUM_COLS);

    setColumnWidths(summarySheet, [
      [1, 28], [2, 14], [3, 20], [4, 20], [5, 20], [6, 20], [7, 14],
    ]);

    const b2bTaxableTotal = toRupees(b2bResults.reduce((s, i) => s + i.subtotal, 0));
    const b2bAmountTotal = toRupees(b2bResults.reduce((s, i) => s + i.totalAmount, 0));
    const allTaxable = retailTaxable + workshopTaxable + b2bTaxableTotal;
    const allTotal = retailTotal + workshopTotal + b2bAmountTotal;

    // --- Section 1: Overall Summary ---
    let sumRowNum = 4;
    sumRowNum = addSectionTitle(summarySheet, sumRowNum, 'Overall Summary', SUM_COLS);
    const overallHeaders = ['Category', 'Orders', 'Taxable Amount', 'Total Amount'];
    const ohRow = summarySheet.getRow(sumRowNum);
    overallHeaders.forEach((h, idx) => { ohRow.getCell(idx + 1).value = h; });
    styleHeaderRow(ohRow, 4);
    sumRowNum++;

    const summaryData: [string, number, number, number][] = [
      ['Food & Beverage Orders', completedOrders.length, round2(retailTaxable), round2(retailTotal)],
      ['Workshop Bookings', paidWorkshops.length, round2(workshopTaxable), round2(workshopTotal)],
      ['B2B / External Invoices', b2bResults.length, round2(b2bTaxableTotal), round2(b2bAmountTotal)],
    ];
    summaryData.forEach(([label, count, taxable, amount], idx) => {
      const row = summarySheet.getRow(sumRowNum);
      row.values = [label, count, taxable, amount];
      styleDataRow(row, 4, idx % 2 === 1, { currencyCols: [3, 4], centerCols: [2] });
      sumRowNum++;
    });
    const grandRow = summarySheet.getRow(sumRowNum);
    grandRow.values = ['GRAND TOTAL', totalRetailTransactions + b2bResults.length, round2(allTaxable), round2(allTotal)];
    styleSubtotalRow(grandRow, 4, { currencyCols: [3, 4], centerCols: [2] });
    sumRowNum += 2;

    // --- Section 2: Monthly Sales Breakdown ---
    // Group orders by month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    type MonthStats = { orders: number; revenue: number; delivery: number; deliveryRev: number; pickup: number; pickupRev: number; instore: number; instoreRev: number; avgOrderValue: number };
    const monthlyStats: Record<string, MonthStats> = {};

    const getMonthKey = (d: Date | string): string => {
      if (typeof d === 'string') d = new Date(d);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const getMonthLabel = (key: string): string => {
      const [y, m] = key.split('-');
      return `${monthNames[parseInt(m) - 1]} ${y}`;
    };

    for (const order of completedOrders) {
      const mk = getMonthKey(order.createdAt);
      if (!monthlyStats[mk]) monthlyStats[mk] = { orders: 0, revenue: 0, delivery: 0, deliveryRev: 0, pickup: 0, pickupRev: 0, instore: 0, instoreRev: 0, avgOrderValue: 0 };
      const total = toRupees(order.totalAmount);
      monthlyStats[mk].orders++;
      monthlyStats[mk].revenue += total;
      const ot = (order.orderType || 'instore').toLowerCase();
      if (ot === 'delivery') { monthlyStats[mk].delivery++; monthlyStats[mk].deliveryRev += total; }
      else if (ot === 'pickup') { monthlyStats[mk].pickup++; monthlyStats[mk].pickupRev += total; }
      else { monthlyStats[mk].instore++; monthlyStats[mk].instoreRev += total; }
    }

    // Calculate AOV per month
    for (const mk of Object.keys(monthlyStats)) {
      const s = monthlyStats[mk];
      s.avgOrderValue = s.orders > 0 ? s.revenue / s.orders : 0;
    }

    const sortedMonths = Object.keys(monthlyStats).sort();

    sumRowNum = addSectionTitle(summarySheet, sumRowNum, 'Monthly Sales Breakdown', SUM_COLS);
    const monthHeaders = ['Month', 'Orders', 'Revenue', 'Avg. Order Value', 'Delivery', 'Pickup', 'Dine-in'];
    const mhRow = summarySheet.getRow(sumRowNum);
    monthHeaders.forEach((h, idx) => { mhRow.getCell(idx + 1).value = h; });
    styleHeaderRow(mhRow, SUM_COLS);
    sumRowNum++;

    let prevMonthRev = 0;
    for (let i = 0; i < sortedMonths.length; i++) {
      const mk = sortedMonths[i];
      const s = monthlyStats[mk];
      const row = summarySheet.getRow(sumRowNum);
      row.values = [
        getMonthLabel(mk),
        s.orders,
        round2(s.revenue),
        round2(s.avgOrderValue),
        s.delivery,
        s.pickup,
        s.instore,
      ];
      styleDataRow(row, SUM_COLS, i % 2 === 1, { currencyCols: [3, 4], centerCols: [2, 5, 6, 7] });
      sumRowNum++;
      prevMonthRev = s.revenue;
    }

    // Monthly totals
    const totalDelivery = Object.values(monthlyStats).reduce((s, m) => s + m.delivery, 0);
    const totalPickup = Object.values(monthlyStats).reduce((s, m) => s + m.pickup, 0);
    const totalInstore = Object.values(monthlyStats).reduce((s, m) => s + m.instore, 0);
    const totalMonthlyRev = Object.values(monthlyStats).reduce((s, m) => s + m.revenue, 0);
    const overallAov = completedOrders.length > 0 ? totalMonthlyRev / completedOrders.length : 0;
    const monthTotalRow = summarySheet.getRow(sumRowNum);
    monthTotalRow.values = ['TOTAL', completedOrders.length, round2(totalMonthlyRev), round2(overallAov), totalDelivery, totalPickup, totalInstore];
    styleSubtotalRow(monthTotalRow, SUM_COLS, { currencyCols: [3, 4], centerCols: [2, 5, 6, 7] });
    sumRowNum += 2;

    // --- Section 3: Monthly Revenue by Order Type ---
    sumRowNum = addSectionTitle(summarySheet, sumRowNum, 'Monthly Revenue by Order Type', SUM_COLS);
    const revHeaders = ['Month', 'Delivery Revenue', '% of Total', 'Pickup Revenue', '% of Total', 'Dine-in Revenue', '% of Total'];
    const rvhRow = summarySheet.getRow(sumRowNum);
    revHeaders.forEach((h, idx) => { rvhRow.getCell(idx + 1).value = h; });
    styleHeaderRow(rvhRow, SUM_COLS);
    sumRowNum++;

    for (let i = 0; i < sortedMonths.length; i++) {
      const mk = sortedMonths[i];
      const s = monthlyStats[mk];
      const row = summarySheet.getRow(sumRowNum);
      const delPct = s.revenue > 0 ? `${((s.deliveryRev / s.revenue) * 100).toFixed(1)}%` : '0%';
      const pickPct = s.revenue > 0 ? `${((s.pickupRev / s.revenue) * 100).toFixed(1)}%` : '0%';
      const inPct = s.revenue > 0 ? `${((s.instoreRev / s.revenue) * 100).toFixed(1)}%` : '0%';
      row.values = [
        getMonthLabel(mk),
        round2(s.deliveryRev),
        delPct,
        round2(s.pickupRev),
        pickPct,
        round2(s.instoreRev),
        inPct,
      ];
      styleDataRow(row, SUM_COLS, i % 2 === 1, { currencyCols: [2, 4, 6], centerCols: [3, 5, 7] });
      sumRowNum++;
    }

    // Revenue totals
    const totalDelRev = Object.values(monthlyStats).reduce((s, m) => s + m.deliveryRev, 0);
    const totalPickRev = Object.values(monthlyStats).reduce((s, m) => s + m.pickupRev, 0);
    const totalInsRev = Object.values(monthlyStats).reduce((s, m) => s + m.instoreRev, 0);
    const revTotalRow = summarySheet.getRow(sumRowNum);
    const tDelPct = totalMonthlyRev > 0 ? `${((totalDelRev / totalMonthlyRev) * 100).toFixed(1)}%` : '0%';
    const tPickPct = totalMonthlyRev > 0 ? `${((totalPickRev / totalMonthlyRev) * 100).toFixed(1)}%` : '0%';
    const tInPct = totalMonthlyRev > 0 ? `${((totalInsRev / totalMonthlyRev) * 100).toFixed(1)}%` : '0%';
    revTotalRow.values = ['TOTAL', round2(totalDelRev), tDelPct, round2(totalPickRev), tPickPct, round2(totalInsRev), tInPct];
    styleSubtotalRow(revTotalRow, SUM_COLS, { currencyCols: [2, 4, 6], centerCols: [3, 5, 7] });
    sumRowNum += 2;

    // --- Section 4: Month-over-Month Growth ---
    if (sortedMonths.length >= 2) {
      sumRowNum = addSectionTitle(summarySheet, sumRowNum, 'Month-over-Month Growth', SUM_COLS);
      const growthHeaders = ['Month', 'Revenue', 'MoM Change', 'MoM %', 'Orders', 'Order Change', 'AOV Change'];
      const ghRow = summarySheet.getRow(sumRowNum);
      growthHeaders.forEach((h, idx) => { ghRow.getCell(idx + 1).value = h; });
      styleHeaderRow(ghRow, SUM_COLS);
      sumRowNum++;

      for (let i = 0; i < sortedMonths.length; i++) {
        const mk = sortedMonths[i];
        const s = monthlyStats[mk];
        const row = summarySheet.getRow(sumRowNum);

        if (i === 0) {
          row.values = [getMonthLabel(mk), round2(s.revenue), '—', '—', s.orders, '—', '—'];
        } else {
          const prev = monthlyStats[sortedMonths[i - 1]];
          const revChange = s.revenue - prev.revenue;
          const revPct = prev.revenue > 0 ? ((revChange / prev.revenue) * 100).toFixed(1) + '%' : 'N/A';
          const ordChange = s.orders - prev.orders;
          const aovChange = s.avgOrderValue - prev.avgOrderValue;
          row.values = [
            getMonthLabel(mk),
            round2(s.revenue),
            round2(revChange),
            (revChange >= 0 ? '+' : '') + revPct,
            s.orders,
            (ordChange >= 0 ? '+' : '') + ordChange,
            (aovChange >= 0 ? '+₹' : '-₹') + Math.abs(round2(aovChange)),
          ];
        }
        styleDataRow(row, SUM_COLS, i % 2 === 1, { currencyCols: [2, 3], centerCols: [4, 5, 6, 7] });
        sumRowNum++;
      }
      sumRowNum += 1;
    }

    // --- Section 5: Average Order Value by Order Type ---
    sumRowNum = addSectionTitle(summarySheet, sumRowNum, 'Average Order Value by Order Type', SUM_COLS);
    const aovHeaders = ['Month', 'Overall AOV', 'Delivery AOV', 'Pickup AOV', 'Dine-in AOV'];
    const aovhRow = summarySheet.getRow(sumRowNum);
    aovHeaders.forEach((h, idx) => { aovhRow.getCell(idx + 1).value = h; });
    styleHeaderRow(aovhRow, 5);
    sumRowNum++;

    for (let i = 0; i < sortedMonths.length; i++) {
      const mk = sortedMonths[i];
      const s = monthlyStats[mk];
      const row = summarySheet.getRow(sumRowNum);
      row.values = [
        getMonthLabel(mk),
        round2(s.avgOrderValue),
        s.delivery > 0 ? round2(s.deliveryRev / s.delivery) : 0,
        s.pickup > 0 ? round2(s.pickupRev / s.pickup) : 0,
        s.instore > 0 ? round2(s.instoreRev / s.instore) : 0,
      ];
      styleDataRow(row, 5, i % 2 === 1, { currencyCols: [2, 3, 4, 5], centerCols: [] });
      sumRowNum++;
    }
    sumRowNum += 1;

    // --- Section 6: GST Breakdown ---
    const b2bTotalCgst = toRupees(b2bResults.reduce((s, i) => s + i.cgst, 0));
    const b2bTotalSgst = toRupees(b2bResults.reduce((s, i) => s + i.sgst, 0));
    const b2bTotalIgst = toRupees(b2bResults.reduce((s, i) => s + i.igst, 0));

    const combinedCgst = retailCgst + workshopCgst + b2bTotalCgst;
    const combinedSgst = retailSgst + workshopSgst + b2bTotalSgst;
    const combinedIgst = b2bTotalIgst;
    const combinedGst = combinedCgst + combinedSgst + combinedIgst;

    sumRowNum = addSectionTitle(summarySheet, sumRowNum, 'GST Breakdown (Retail + B2B)', SUM_COLS);
    const gstItems: [string, number][] = [
      ['Taxable Amount (Retail + B2B)', round2(allTaxable)],
      ['CGST (2.5%)', round2(combinedCgst)],
      ['SGST (2.5%)', round2(combinedSgst)],
    ];
    if (combinedIgst > 0) {
      gstItems.push(['IGST (Inter-state)', round2(combinedIgst)]);
    }
    gstItems.push(['Total GST (Retail + B2B)', round2(combinedGst)]);

    for (const [label, value] of gstItems) {
      const row = summarySheet.getRow(sumRowNum);
      row.getCell(1).value = label;
      row.getCell(1).font = { size: 11, name: 'Calibri' };
      row.getCell(2).value = value;
      row.getCell(2).numFmt = FMT.CURRENCY_SYMBOL;
      row.getCell(2).alignment = { horizontal: 'right' };
      row.getCell(2).font = { size: 11, name: 'Calibri' };
      sumRowNum++;
    }
    const gstGrandRow = summarySheet.getRow(sumRowNum);
    gstGrandRow.getCell(1).value = 'Grand Total (incl. GST)';
    gstGrandRow.getCell(1).font = { bold: true, size: 11, name: 'Calibri' };
    gstGrandRow.getCell(2).value = round2(allTotal);
    gstGrandRow.getCell(2).numFmt = FMT.CURRENCY_SYMBOL;
    gstGrandRow.getCell(2).alignment = { horizontal: 'right' };
    gstGrandRow.getCell(2).font = { bold: true, size: 11, name: 'Calibri' };
    for (let col = 1; col <= 2; col++) {
      gstGrandRow.getCell(col).border = { top: { style: 'medium' }, bottom: { style: 'double' } };
    }
    sumRowNum += 2;

    // --- Section 7: Payment Method Breakdown ---
    sumRowNum = addSectionTitle(summarySheet, sumRowNum, 'Payment Method Breakdown', SUM_COLS);
    const pmHeaders = ['Payment Method', 'No. of Transactions', 'Total Amount', '% of Revenue'];
    const pmhRow = summarySheet.getRow(sumRowNum);
    pmHeaders.forEach((h, idx) => { pmhRow.getCell(idx + 1).value = h; });
    styleHeaderRow(pmhRow, 4);
    sumRowNum++;

    const paymentMethods: Record<string, { count: number; total: number }> = {};
    for (const order of completedOrders) {
      const method = (order.paymentMethod || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (!paymentMethods[method]) paymentMethods[method] = { count: 0, total: 0 };
      paymentMethods[method].count++;
      paymentMethods[method].total += toRupees(order.totalAmount);
    }
    for (const workshop of paidWorkshops) {
      const method = (workshop.paymentMethod || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (!paymentMethods[method]) paymentMethods[method] = { count: 0, total: 0 };
      paymentMethods[method].count++;
      paymentMethods[method].total += toRupees(workshop.totalAmount);
    }
    for (const inv of b2bResults) {
      const method = 'B2B Invoice';
      if (!paymentMethods[method]) paymentMethods[method] = { count: 0, total: 0 };
      paymentMethods[method].count++;
      paymentMethods[method].total += toRupees(inv.amountReceived);
    }
    const pmTotalRev = Object.values(paymentMethods).reduce((s, d) => s + d.total, 0);
    const sortedPayMethods = Object.entries(paymentMethods).sort((a, b) => b[1].total - a[1].total);
    for (const [method, data] of sortedPayMethods) {
      const row = summarySheet.getRow(sumRowNum);
      const pct = pmTotalRev > 0 ? `${((data.total / pmTotalRev) * 100).toFixed(1)}%` : '0%';
      row.values = [method, data.count, round2(data.total), pct];
      styleDataRow(row, 4, false, { currencyCols: [3], centerCols: [2, 4] });
      sumRowNum++;
    }

    // ===== Sheet 3: GST Summary =====
    // Two sections only: Retail Orders GST (Daily) and B2B / External Invoices GST
    const gstSheet = workbook.addWorksheet('GST Summary');
    const hasIgst = combinedIgst > 0;
    const GST_COLS = hasIgst ? 8 : 7;
    addTitleBlock(gstSheet, 'Taiwan Maami — GST Summary', `Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, GST_COLS);

    // Section 1: Retail Orders GST (Daily)
    let gstRowNum = 4;
    gstRowNum = addSectionTitle(gstSheet, gstRowNum, 'Retail Orders GST (Daily)', GST_COLS);

    const retailGstHeaders = ['Date', 'No. of Invoices', 'Taxable Value', 'CGST @ 2.5%', 'SGST @ 2.5%', 'Total GST', 'Invoice Value'];
    const gstHeaderRow = gstSheet.getRow(gstRowNum);
    retailGstHeaders.forEach((h, idx) => { gstHeaderRow.getCell(idx + 1).value = h; });
    styleHeaderRow(gstHeaderRow, 7);

    setColumnWidths(gstSheet, [
      [1, 14], [2, 16], [3, 18], [4, 16], [5, 16], [6, 16], [7, 18], [8, 18],
    ]);

    // Group retail orders + workshops by date
    const dailyRetailStats: Record<string, { invoiceCount: number; taxable: number; cgst: number; sgst: number; gst: number; total: number }> = {};

    for (const order of completedOrders) {
      const dateKey = getDateKey(order.createdAt);
      if (!dailyRetailStats[dateKey]) dailyRetailStats[dateKey] = { invoiceCount: 0, taxable: 0, cgst: 0, sgst: 0, gst: 0, total: 0 };
      const cgst = toRupees(order.centralGst);
      const sgst = toRupees(order.stateGst);
      const total = toRupees(order.totalAmount);
      dailyRetailStats[dateKey].invoiceCount++;
      dailyRetailStats[dateKey].cgst += cgst;
      dailyRetailStats[dateKey].sgst += sgst;
      dailyRetailStats[dateKey].gst += cgst + sgst;
      dailyRetailStats[dateKey].taxable += total - cgst - sgst;
      dailyRetailStats[dateKey].total += total;
    }

    for (const booking of paidWorkshops) {
      const dateKey = getDateKey(booking.createdAt);
      if (!dailyRetailStats[dateKey]) dailyRetailStats[dateKey] = { invoiceCount: 0, taxable: 0, cgst: 0, sgst: 0, gst: 0, total: 0 };
      const total = toRupees(booking.totalAmount);
      const gstRate = 0.05;
      const taxable = total / (1 + gstRate);
      const gst = total - taxable;
      dailyRetailStats[dateKey].invoiceCount++;
      dailyRetailStats[dateKey].cgst += gst / 2;
      dailyRetailStats[dateKey].sgst += gst / 2;
      dailyRetailStats[dateKey].gst += gst;
      dailyRetailStats[dateKey].taxable += taxable;
      dailyRetailStats[dateKey].total += total;
    }

    const sortedDates = Object.keys(dailyRetailStats).sort();

    gstRowNum++;
    let gstTotalInvoices = 0, gstTotalTaxable = 0, gstTotalCgst = 0;
    let gstTotalSgst = 0, gstTotalGst = 0, gstTotalValue = 0;

    sortedDates.forEach((dateKey, idx) => {
      const stats = dailyRetailStats[dateKey];
      const row = gstSheet.getRow(gstRowNum);
      row.values = [
        formatDateLocal(dateKey),
        stats.invoiceCount,
        round2(stats.taxable),
        round2(stats.cgst),
        round2(stats.sgst),
        round2(stats.gst),
        round2(stats.total),
      ];

      gstTotalInvoices += stats.invoiceCount;
      gstTotalTaxable += stats.taxable;
      gstTotalCgst += stats.cgst;
      gstTotalSgst += stats.sgst;
      gstTotalGst += stats.gst;
      gstTotalValue += stats.total;

      styleDataRow(row, 7, idx % 2 === 1, {
        currencyCols: [3, 4, 5, 6, 7],
        centerCols: [1, 2],
      });
      gstRowNum++;
    });

    // Retail GST Totals
    const retailGstTotalsRow = gstSheet.getRow(gstRowNum);
    retailGstTotalsRow.values = [
      'RETAIL TOTAL',
      gstTotalInvoices,
      round2(gstTotalTaxable),
      round2(gstTotalCgst),
      round2(gstTotalSgst),
      round2(gstTotalGst),
      round2(gstTotalValue),
    ];
    styleTotalsRow(retailGstTotalsRow, 7, {
      currencyCols: [3, 4, 5, 6, 7],
      centerCols: [2],
    });
    retailGstTotalsRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    gstRowNum += 2;

    // Section 2: B2B / External Invoices GST (if any)
    if (b2bResults.length > 0) {
      gstRowNum = addSectionTitle(gstSheet, gstRowNum, 'B2B / External Invoices GST', GST_COLS);
      const b2bGstHeaders = ['Invoice Date', 'Invoice No.', 'Client', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total GST'];
      const b2bGstHeaderRow = gstSheet.getRow(gstRowNum);
      b2bGstHeaders.forEach((h, idx) => { b2bGstHeaderRow.getCell(idx + 1).value = h; });
      styleHeaderRow(b2bGstHeaderRow, 8);
      gstRowNum++;

      let b2bSheetTaxable = 0, b2bSheetCgst = 0, b2bSheetSgst = 0, b2bSheetIgst = 0, b2bSheetGst = 0;
      for (const inv of b2bResults) {
        const taxable = toRupees(inv.subtotal);
        const cgst = toRupees(inv.cgst);
        const sgst = toRupees(inv.sgst);
        const igst = toRupees(inv.igst);
        const gst = cgst + sgst + igst;

        b2bSheetTaxable += taxable;
        b2bSheetCgst += cgst;
        b2bSheetSgst += sgst;
        b2bSheetIgst += igst;
        b2bSheetGst += gst;

        const row = gstSheet.getRow(gstRowNum);
        row.values = [
          formatDateLocal(String(inv.invoiceDate)),
          inv.invoiceNumber,
          inv.clientName,
          round2(taxable),
          round2(cgst),
          round2(sgst),
          round2(igst),
          round2(gst),
        ];
        styleDataRow(row, 8, false, {
          currencyCols: [4, 5, 6, 7, 8],
          centerCols: [1],
        });
        gstRowNum++;
      }

      const b2bTotalsRow = gstSheet.getRow(gstRowNum);
      b2bTotalsRow.values = ['B2B TOTAL', b2bResults.length, '', round2(b2bSheetTaxable), round2(b2bSheetCgst), round2(b2bSheetSgst), round2(b2bSheetIgst), round2(b2bSheetGst)];
      styleTotalsRow(b2bTotalsRow, 8, { currencyCols: [4, 5, 6, 7, 8], centerCols: [2] });
      b2bTotalsRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
      gstRowNum += 2;
    }

    // Combined GST Summary — matches on-screen getGstReport exactly
    gstRowNum = addSectionTitle(gstSheet, gstRowNum, 'Combined GST Summary (for GSTR-1/GSTR-3B)', GST_COLS);
    const combinedGstItems: [string, number][] = [
      ['Total Taxable Value (Retail + B2B)', round2(allTaxable)],
      ['CGST (2.5%)', round2(combinedCgst)],
      ['SGST (2.5%)', round2(combinedSgst)],
    ];
    if (combinedIgst > 0) {
      combinedGstItems.push(['IGST (Inter-state)', round2(combinedIgst)]);
    }
    combinedGstItems.push(['Total GST (Retail + B2B)', round2(combinedGst)]);

    for (const [label, value] of combinedGstItems) {
      const row = gstSheet.getRow(gstRowNum);
      row.getCell(1).value = label;
      row.getCell(1).font = { size: 12, bold: label.startsWith('Total GST'), name: 'Calibri' };
      row.getCell(2).value = value;
      row.getCell(2).numFmt = FMT.CURRENCY_SYMBOL;
      row.getCell(2).alignment = { horizontal: 'right' };
      row.getCell(2).font = { size: 12, bold: label.startsWith('Total GST'), name: 'Calibri' };
      if (label.startsWith('Total GST')) {
        for (let col = 1; col <= 2; col++) {
          row.getCell(col).border = { top: { style: 'medium' }, bottom: { style: 'double' } };
        }
      }
      gstRowNum++;
    }

    // ===== Sheet 4: Payment Method Summary =====
    const paymentSheet = workbook.addWorksheet('Payment Summary');
    const PAY_COLS = 4;
    addTitleBlock(paymentSheet, 'Taiwan Maami — Payment Method Summary', `Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, PAY_COLS);

    const paymentHeaders = ['Payment Method', 'No. of Transactions', 'Total Amount', '% of Revenue'];
    const paymentHeaderRow = paymentSheet.getRow(4);
    paymentHeaders.forEach((h, idx) => { paymentHeaderRow.getCell(idx + 1).value = h; });
    styleHeaderRow(paymentHeaderRow, PAY_COLS);

    setColumnWidths(paymentSheet, [
      [1, 22], [2, 20], [3, 20], [4, 16],
    ]);

    const paymentStats: Record<string, { count: number; total: number }> = {};
    for (const order of completedOrders) {
      const method = (order.paymentMethod || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (!paymentStats[method]) paymentStats[method] = { count: 0, total: 0 };
      paymentStats[method].count++;
      paymentStats[method].total += toRupees(order.totalAmount);
    }
    for (const booking of paidWorkshops) {
      const method = (booking.paymentMethod || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (!paymentStats[method]) paymentStats[method] = { count: 0, total: 0 };
      paymentStats[method].count++;
      paymentStats[method].total += toRupees(booking.totalAmount);
    }

    const sortedMethods = Object.entries(paymentStats).sort((a, b) => b[1].total - a[1].total);
    let payRowNum = 5;
    let payGrandCount = 0, payGrandTotal = 0;

    sortedMethods.forEach(([method, stats], idx) => {
      const row = paymentSheet.getRow(payRowNum);
      const pct = retailTotal > 0 ? (stats.total / retailTotal * 100) : 0;
      row.values = [method, stats.count, round2(stats.total), round2(pct)];

      payGrandCount += stats.count;
      payGrandTotal += stats.total;

      styleDataRow(row, PAY_COLS, idx % 2 === 1, {
        currencyCols: [3],
        percentCols: [4],
        centerCols: [2],
      });
      payRowNum++;
    });

    const payTotalsRow = paymentSheet.getRow(payRowNum);
    payTotalsRow.values = ['TOTAL', payGrandCount, round2(payGrandTotal), 100];
    styleTotalsRow(payTotalsRow, PAY_COLS, {
      currencyCols: [3],
      percentCols: [4],
      centerCols: [2],
    });
    payTotalsRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

    // Apply sheet setup
    applySheetSetup(salesSheet);
    applySheetSetup(summarySheet, 3);
    applySheetSetup(gstSheet);
    applySheetSetup(paymentSheet);

    // Generate and send
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Taiwan_Maami_Sales_Report_${startDate}_to_${endDate}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', (buffer as any).length);
    res.send(Buffer.from(buffer as ArrayBuffer));

  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}
