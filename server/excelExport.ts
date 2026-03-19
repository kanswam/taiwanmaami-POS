import ExcelJS from 'exceljs';
import { getDb } from './db';
import { orders, workshopBookings, eventOrders } from '../drizzle/schema';
import { and, eq, sql, desc } from 'drizzle-orm';
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
    // 1. Fetch completed regular orders
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

    // 3. Fetch completed/confirmed event orders
    const paidEvents = await dbInstance
      .select({
        orderNumber: eventOrders.orderNumber,
        totalAmount: eventOrders.totalAmount,
        subtotal: eventOrders.subtotal,
        gstAmount: eventOrders.gstAmount,
        advanceAmount: eventOrders.advanceAmount,
        advancePaid: eventOrders.advancePaid,
        balanceAmount: eventOrders.balanceAmount,
        balancePaid: eventOrders.balancePaid,
        status: eventOrders.status,
        createdAt: eventOrders.createdAt,
      })
      .from(eventOrders)
      .where(and(
        sql`${eventOrders.createdAt} >= ${startDate}`,
        sql`${eventOrders.createdAt} <= ${endDate + ' 23:59:59'}`,
        sql`${eventOrders.status} IN ('confirmed', 'in_progress', 'completed')`,
      ))
      .orderBy(eventOrders.createdAt);

    // Build workbook
    const workbook = createWorkbook();
    const totalTransactions = completedOrders.length + paidWorkshops.length + paidEvents.length;

    // ===== Sheet 1: Sales Report (All Transactions) =====
    const salesSheet = workbook.addWorksheet('Sales Report');
    const SALES_COLS = 11;
    addTitleBlock(salesSheet, 'Taiwan Maami — Sales Report', `Period: ${formatDate(startDate)} to ${formatDate(endDate)}  ·  ${totalTransactions} transactions`, SALES_COLS);

    // Header row
    const headers = [
      'S.No', 'Invoice No.', 'Date', 'Source', 'Outlet',
      'Taxable Amount', 'CGST', 'SGST', 'Total GST',
      'Total Amount', 'Payment Method'
    ];
    const headerRow = salesSheet.getRow(4);
    headers.forEach((h, idx) => { headerRow.getCell(idx + 1).value = h; });
    styleHeaderRow(headerRow, SALES_COLS);

    // Column widths
    setColumnWidths(salesSheet, [
      [1, 6], [2, 18], [3, 14], [4, 14], [5, 16],
      [6, 18], [7, 14], [8, 14], [9, 14],
      [10, 18], [11, 18],
    ]);

    let rowNum = 5;
    let serialNo = 1;
    let grandTaxable = 0, grandCgst = 0, grandSgst = 0, grandGst = 0, grandTotal = 0;

    // Add regular orders
    for (const order of completedOrders) {
      const cgst = toRupees(order.centralGst);
      const sgst = toRupees(order.stateGst);
      const gst = cgst + sgst;
      const total = toRupees(order.totalAmount);
      const taxable = total - gst;

      grandTaxable += taxable;
      grandCgst += cgst;
      grandSgst += sgst;
      grandGst += gst;
      grandTotal += total;

      const row = salesSheet.getRow(rowNum);
      row.values = [
        serialNo++,
        order.orderNumber,
        formatDate(order.createdAt),
        'Order',
        outletName(order.outletId),
        round2(taxable),
        round2(cgst),
        round2(sgst),
        round2(gst),
        round2(total),
        (order.paymentMethod || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      ];

      styleDataRow(row, SALES_COLS, serialNo % 2 === 0, {
        currencyCols: [6, 7, 8, 9, 10],
        centerCols: [1, 3],
      });
      rowNum++;
    }

    // Add workshop bookings
    for (const booking of paidWorkshops) {
      const total = toRupees(booking.totalAmount);
      const gstRate = 0.05;
      const taxable = total / (1 + gstRate);
      const gst = total - taxable;
      const cgst = gst / 2;
      const sgst = gst / 2;

      grandTaxable += taxable;
      grandCgst += cgst;
      grandSgst += sgst;
      grandGst += gst;
      grandTotal += total;

      const row = salesSheet.getRow(rowNum);
      row.values = [
        serialNo++,
        booking.bookingNumber,
        formatDate(booking.createdAt),
        'Workshop',
        'T. Nagar',
        round2(taxable),
        round2(cgst),
        round2(sgst),
        round2(gst),
        round2(total),
        (booking.paymentMethod || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      ];

      styleDataRow(row, SALES_COLS, false, {
        currencyCols: [6, 7, 8, 9, 10],
        centerCols: [1, 3],
        customBg: BRAND.WORKSHOP_BG,
      });
      rowNum++;
    }

    // Add event orders
    for (const event of paidEvents) {
      const total = toRupees(event.totalAmount);
      const gst = toRupees(event.gstAmount);
      const taxable = total - gst;
      const cgst = gst / 2;
      const sgst = gst / 2;

      grandTaxable += taxable;
      grandCgst += cgst;
      grandSgst += sgst;
      grandGst += gst;
      grandTotal += total;

      const row = salesSheet.getRow(rowNum);
      row.values = [
        serialNo++,
        event.orderNumber,
        formatDate(event.createdAt),
        'Event',
        'T. Nagar',
        round2(taxable),
        round2(cgst),
        round2(sgst),
        round2(gst),
        round2(total),
        'N/A',
      ];

      styleDataRow(row, SALES_COLS, false, {
        currencyCols: [6, 7, 8, 9, 10],
        centerCols: [1, 3],
        customBg: BRAND.EVENT_BG,
      });
      rowNum++;
    }

    // Separator + legend
    rowNum++;
    rowNum = addLegend(salesSheet, rowNum, [
      { color: BRAND.ALT_ROW, label: 'Regular Order' },
      { color: BRAND.WORKSHOP_BG, label: 'Workshop Booking' },
      { color: BRAND.EVENT_BG, label: 'Event Order' },
    ]);

    rowNum++;
    addFooterNote(salesSheet, rowNum, '\u2192 See "Summary" sheet for totals breakdown (kept separate to prevent double-counting when summing columns)', SALES_COLS);

    // ===== Sheet 2: Summary =====
    const summarySheet = workbook.addWorksheet('Summary');
    const SUM_COLS = 4;
    addTitleBlock(summarySheet, `Taiwan Maami — Sales Summary`, `${formatDate(startDate)} to ${formatDate(endDate)}`, SUM_COLS);

    // Summary table headers
    const sumHeaders = ['Category', 'Orders', 'Taxable Amount', 'Total Amount'];
    const sumHeaderRow = summarySheet.getRow(4);
    sumHeaders.forEach((h, idx) => { sumHeaderRow.getCell(idx + 1).value = h; });
    styleHeaderRow(sumHeaderRow, SUM_COLS);

    setColumnWidths(summarySheet, [
      [1, 30], [2, 12], [3, 22], [4, 22],
    ]);

    const orderTotal = toRupees(completedOrders.reduce((s, o) => s + o.totalAmount, 0));
    const workshopTotal = toRupees(paidWorkshops.reduce((s, w) => s + w.totalAmount, 0));
    const eventTotal = toRupees(paidEvents.reduce((s, e) => s + e.totalAmount, 0));

    const summaryData: [string, number, number, number][] = [
      ['Food & Beverage Orders', completedOrders.length, round2(grandTaxable), round2(orderTotal)],
      ['Workshop Bookings', paidWorkshops.length, 0, round2(workshopTotal)],
      ['Event Orders', paidEvents.length, 0, round2(eventTotal)],
    ];

    let sumRowNum = 5;
    summaryData.forEach(([label, count, taxable, amount], idx) => {
      const row = summarySheet.getRow(sumRowNum);
      row.values = [label, count, taxable, amount];
      styleDataRow(row, SUM_COLS, idx % 2 === 1, {
        currencyCols: [3, 4],
        centerCols: [2],
      });
      sumRowNum++;
    });

    // Grand Total row
    const grandRow = summarySheet.getRow(sumRowNum);
    grandRow.values = [
      'GRAND TOTAL',
      totalTransactions,
      round2(grandTaxable),
      round2(grandTotal),
    ];
    styleSubtotalRow(grandRow, SUM_COLS, {
      currencyCols: [3, 4],
      centerCols: [2],
    });
    sumRowNum += 2;

    // GST Breakdown section
    sumRowNum = addSectionTitle(summarySheet, sumRowNum, 'GST Breakdown', SUM_COLS);
    const gstItems: [string, number][] = [
      ['Taxable Amount', round2(grandTaxable)],
      ['CGST (2.5%)', round2(grandCgst)],
      ['SGST (2.5%)', round2(grandSgst)],
      ['Total GST (5%)', round2(grandGst)],
    ];
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
    // Grand total with GST
    const gstGrandRow = summarySheet.getRow(sumRowNum);
    gstGrandRow.getCell(1).value = 'Grand Total (incl. GST)';
    gstGrandRow.getCell(1).font = { bold: true, size: 11, name: 'Calibri' };
    gstGrandRow.getCell(2).value = round2(grandTotal);
    gstGrandRow.getCell(2).numFmt = FMT.CURRENCY_SYMBOL;
    gstGrandRow.getCell(2).alignment = { horizontal: 'right' };
    gstGrandRow.getCell(2).font = { bold: true, size: 11, name: 'Calibri' };
    for (let col = 1; col <= 2; col++) {
      gstGrandRow.getCell(col).border = { top: { style: 'medium' }, bottom: { style: 'double' } };
    }
    sumRowNum += 2;

    // Payment method breakdown
    sumRowNum = addSectionTitle(summarySheet, sumRowNum, 'Payment Method Breakdown', SUM_COLS);
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
    for (const event of paidEvents) {
      const method = 'Event Payment';
      if (!paymentMethods[method]) paymentMethods[method] = { count: 0, total: 0 };
      paymentMethods[method].count++;
      paymentMethods[method].total += toRupees(event.totalAmount);
    }
    const sortedPayMethods = Object.entries(paymentMethods).sort((a, b) => b[1].total - a[1].total);
    for (const [method, data] of sortedPayMethods) {
      const row = summarySheet.getRow(sumRowNum);
      row.getCell(1).value = method;
      row.getCell(1).font = { size: 11, name: 'Calibri' };
      row.getCell(2).value = data.count;
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(2).font = { size: 11, name: 'Calibri' };
      row.getCell(3).value = round2(data.total);
      row.getCell(3).numFmt = FMT.CURRENCY_SYMBOL;
      row.getCell(3).alignment = { horizontal: 'right' };
      row.getCell(3).font = { size: 11, name: 'Calibri' };
      sumRowNum++;
    }

    // ===== Sheet 3: GST Summary (Daily) =====
    const gstSheet = workbook.addWorksheet('GST Summary');
    const GST_COLS = 7;
    addTitleBlock(gstSheet, 'Taiwan Maami — GST Summary (Daily)', `Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, GST_COLS);

    const gstHeaders = ['Date', 'No. of Invoices', 'Taxable Value', 'CGST @ 2.5%', 'SGST @ 2.5%', 'Total GST', 'Invoice Value'];
    const gstHeaderRow = gstSheet.getRow(4);
    gstHeaders.forEach((h, idx) => { gstHeaderRow.getCell(idx + 1).value = h; });
    styleHeaderRow(gstHeaderRow, GST_COLS);

    setColumnWidths(gstSheet, [
      [1, 14], [2, 14], [3, 18], [4, 16], [5, 16], [6, 16], [7, 18],
    ]);

    // Group all transactions by date
    const dailyStats: Record<string, { invoiceCount: number; taxable: number; cgst: number; sgst: number; gst: number; total: number }> = {};

    for (const order of completedOrders) {
      const dateKey = formatDate(order.createdAt);
      if (!dailyStats[dateKey]) dailyStats[dateKey] = { invoiceCount: 0, taxable: 0, cgst: 0, sgst: 0, gst: 0, total: 0 };
      const cgst = toRupees(order.centralGst);
      const sgst = toRupees(order.stateGst);
      const total = toRupees(order.totalAmount);
      dailyStats[dateKey].invoiceCount++;
      dailyStats[dateKey].cgst += cgst;
      dailyStats[dateKey].sgst += sgst;
      dailyStats[dateKey].gst += cgst + sgst;
      dailyStats[dateKey].taxable += total - cgst - sgst;
      dailyStats[dateKey].total += total;
    }

    for (const booking of paidWorkshops) {
      const dateKey = formatDate(booking.createdAt);
      if (!dailyStats[dateKey]) dailyStats[dateKey] = { invoiceCount: 0, taxable: 0, cgst: 0, sgst: 0, gst: 0, total: 0 };
      const total = toRupees(booking.totalAmount);
      const gstRate = 0.05;
      const taxable = total / (1 + gstRate);
      const gst = total - taxable;
      dailyStats[dateKey].invoiceCount++;
      dailyStats[dateKey].cgst += gst / 2;
      dailyStats[dateKey].sgst += gst / 2;
      dailyStats[dateKey].gst += gst;
      dailyStats[dateKey].taxable += taxable;
      dailyStats[dateKey].total += total;
    }

    for (const event of paidEvents) {
      const dateKey = formatDate(event.createdAt);
      if (!dailyStats[dateKey]) dailyStats[dateKey] = { invoiceCount: 0, taxable: 0, cgst: 0, sgst: 0, gst: 0, total: 0 };
      const total = toRupees(event.totalAmount);
      const gst = toRupees(event.gstAmount);
      dailyStats[dateKey].invoiceCount++;
      dailyStats[dateKey].cgst += gst / 2;
      dailyStats[dateKey].sgst += gst / 2;
      dailyStats[dateKey].gst += gst;
      dailyStats[dateKey].taxable += total - gst;
      dailyStats[dateKey].total += total;
    }

    // Sort by date
    const sortedDates = Object.keys(dailyStats).sort((a, b) => {
      const [da, ma, ya] = a.split('/').map(Number);
      const [db, mb, yb] = b.split('/').map(Number);
      return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
    });

    let gstRowNum = 5;
    let gstTotalInvoices = 0, gstTotalTaxable = 0, gstTotalCgst = 0;
    let gstTotalSgst = 0, gstTotalGst = 0, gstTotalValue = 0;

    sortedDates.forEach((dateKey, idx) => {
      const stats = dailyStats[dateKey];
      const row = gstSheet.getRow(gstRowNum);
      row.values = [
        dateKey,
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

      styleDataRow(row, GST_COLS, idx % 2 === 1, {
        currencyCols: [3, 4, 5, 6, 7],
        centerCols: [1, 2],
      });
      gstRowNum++;
    });

    // GST Totals row
    const gstTotalsRow = gstSheet.getRow(gstRowNum);
    gstTotalsRow.values = [
      'TOTAL',
      gstTotalInvoices,
      round2(gstTotalTaxable),
      round2(gstTotalCgst),
      round2(gstTotalSgst),
      round2(gstTotalGst),
      round2(gstTotalValue),
    ];
    styleTotalsRow(gstTotalsRow, GST_COLS, {
      currencyCols: [3, 4, 5, 6, 7],
      centerCols: [2],
    });
    gstTotalsRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

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

    // Aggregate by payment method
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
      const pct = grandTotal > 0 ? (stats.total / grandTotal * 100) : 0;
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

    // Payment totals
    const payTotalsRow = paymentSheet.getRow(payRowNum);
    payTotalsRow.values = ['TOTAL', payGrandCount, round2(payGrandTotal), 100];
    styleTotalsRow(payTotalsRow, PAY_COLS, {
      currencyCols: [3],
      percentCols: [4],
      centerCols: [2],
    });
    payTotalsRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

    // Apply sheet setup to all sheets
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
