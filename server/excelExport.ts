import ExcelJS from 'exceljs';
import { getDb } from './db';
import { orders, workshopBookings, eventOrders } from '../drizzle/schema';
import { and, eq, sql, desc } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { sdk } from './_core/sdk';

// Paise to Rupees conversion
const toRupees = (paise: number) => paise / 100;

// Format date as DD/MM/YYYY
const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

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
        // Extract short name: "Taiwan Maami - T Nagar" -> "T. Nagar"
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

  // Load outlet names from database
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

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Taiwan Maami';
    workbook.created = new Date();

    // ===== Sheet 1: Sales Report (All Transactions) =====
    const salesSheet = workbook.addWorksheet('Sales Report');

    // Title row
    salesSheet.mergeCells('A1:I1');
    const titleCell = salesSheet.getCell('A1');
    titleCell.value = 'Taiwan Maami - Sales Report';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF8B0000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    salesSheet.getRow(1).height = 30;

    // Date range row
    salesSheet.mergeCells('A2:I2');
    const dateRangeCell = salesSheet.getCell('A2');
    dateRangeCell.value = `Period: ${startDate} to ${endDate}`;
    dateRangeCell.font = { size: 11, italic: true };
    dateRangeCell.alignment = { horizontal: 'center' };
    salesSheet.getRow(2).height = 20;

    // Empty row
    salesSheet.getRow(3).height = 10;

    // Header row
    const headerRow = salesSheet.getRow(4);
    const headers = [
      'S.No', 'Invoice No.', 'Date', 'Source', 'Outlet',
      'Taxable Amount (₹)', 'CGST (₹)', 'SGST (₹)', 'Total GST (₹)',
      'Total Amount (₹)', 'Payment Method'
    ];
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B0000' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    headerRow.height = 28;

    // Column widths
    salesSheet.getColumn(1).width = 6;   // S.No
    salesSheet.getColumn(2).width = 18;  // Invoice No
    salesSheet.getColumn(3).width = 14;  // Date
    salesSheet.getColumn(4).width = 14;  // Source
    salesSheet.getColumn(5).width = 16;  // Outlet
    salesSheet.getColumn(6).width = 18;  // Taxable Amount
    salesSheet.getColumn(7).width = 14;  // CGST
    salesSheet.getColumn(8).width = 14;  // SGST
    salesSheet.getColumn(9).width = 14;  // Total GST
    salesSheet.getColumn(10).width = 18; // Total Amount
    salesSheet.getColumn(11).width = 18; // Payment Method

    let rowNum = 5;
    let serialNo = 1;
    let grandTaxable = 0;
    let grandCgst = 0;
    let grandSgst = 0;
    let grandGst = 0;
    let grandTotal = 0;

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
        taxable,
        cgst,
        sgst,
        gst,
        total,
        (order.paymentMethod || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      ];

      // Style data rows
      for (let col = 1; col <= 11; col++) {
        const cell = row.getCell(col);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };
        if (col >= 6 && col <= 10) {
          cell.numFmt = '"₹"#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
        if (col === 1) cell.alignment = { horizontal: 'center' };
      }

      // Alternate row shading
      if (serialNo % 2 === 0) {
        for (let col = 1; col <= 11; col++) {
          row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5F0' } };
        }
      }

      rowNum++;
    }

    // Add workshop bookings
    for (const booking of paidWorkshops) {
      const total = toRupees(booking.totalAmount);
      // Workshops: GST is typically 18% for event services
      // But for simplicity, if no separate GST fields, we'll back-calculate at 5% (restaurant rate)
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
        Math.round(taxable * 100) / 100,
        Math.round(cgst * 100) / 100,
        Math.round(sgst * 100) / 100,
        Math.round(gst * 100) / 100,
        total,
        (booking.paymentMethod || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      ];

      for (let col = 1; col <= 11; col++) {
        const cell = row.getCell(col);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };
        if (col >= 6 && col <= 10) {
          cell.numFmt = '"₹"#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
        if (col === 1) cell.alignment = { horizontal: 'center' };
      }

      // Highlight workshop rows in light blue
      for (let col = 1; col <= 11; col++) {
        row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } };
      }

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
        Math.round(taxable * 100) / 100,
        Math.round(cgst * 100) / 100,
        Math.round(sgst * 100) / 100,
        Math.round(gst * 100) / 100,
        total,
        'N/A',
      ];

      for (let col = 1; col <= 11; col++) {
        const cell = row.getCell(col);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };
        if (col >= 6 && col <= 10) {
          cell.numFmt = '"₹"#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
        if (col === 1) cell.alignment = { horizontal: 'center' };
      }

      // Highlight event rows in light green
      for (let col = 1; col <= 11; col++) {
        row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FFF0' } };
      }

      rowNum++;
    }

    // Add a thin separator line after the last data row
    const separatorRow = salesSheet.getRow(rowNum);
    for (let col = 1; col <= 11; col++) {
      separatorRow.getCell(col).border = {
        top: { style: 'medium', color: { argb: 'FF8B0000' } },
      };
    }
    separatorRow.height = 6;
    rowNum++;

    // Legend (placed right after data, before the summary sheet)
    const legendTitle = salesSheet.getRow(rowNum);
    legendTitle.getCell(1).value = 'Legend:';
    legendTitle.getCell(1).font = { bold: true, size: 10, italic: true };
    rowNum++;
    const legendItems = [
      { color: 'FFFFF5F0', label: 'Regular Order' },
      { color: 'FFF0F8FF', label: 'Workshop Booking' },
      { color: 'FFF0FFF0', label: 'Event Order' },
    ];
    for (const item of legendItems) {
      const row = salesSheet.getRow(rowNum);
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.color } };
      row.getCell(1).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      row.getCell(2).value = item.label;
      row.getCell(2).font = { size: 10, italic: true };
      rowNum++;
    }

    // Note about summary
    rowNum++;
    const noteRow = salesSheet.getRow(rowNum);
    salesSheet.mergeCells(`A${rowNum}:K${rowNum}`);
    noteRow.getCell(1).value = '\u2192 See "Summary" sheet for totals breakdown (kept separate to prevent double-counting when summing columns)';
    noteRow.getCell(1).font = { size: 10, italic: true, color: { argb: 'FF666666' } };

    // ===== NEW: Summary Sheet (separate from data to prevent double-counting) =====
    const summarySheet = workbook.addWorksheet('Summary');
    
    // Title
    summarySheet.mergeCells('A1:D1');
    const sumTitleCell = summarySheet.getCell('A1');
    sumTitleCell.value = `Sales Summary: ${formatDate(startDate)} to ${formatDate(endDate)}`;
    sumTitleCell.font = { bold: true, size: 14, color: { argb: 'FF8B0000' } };
    sumTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 30;

    // Summary table headers
    const sumHeaderRow = summarySheet.getRow(3);
    const sumHeaders = ['Category', 'Orders', 'Taxable Amount (\u20b9)', 'Total Amount (\u20b9)'];
    sumHeaders.forEach((header, idx) => {
      const cell = sumHeaderRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B0000' } };
      cell.alignment = { horizontal: idx === 0 ? 'left' : (idx === 1 ? 'center' : 'right'), vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    sumHeaderRow.height = 26;
    summarySheet.getColumn(1).width = 30;
    summarySheet.getColumn(2).width = 12;
    summarySheet.getColumn(3).width = 22;
    summarySheet.getColumn(4).width = 22;

    const orderTotal = toRupees(completedOrders.reduce((s, o) => s + o.totalAmount, 0));
    const workshopTotal = toRupees(paidWorkshops.reduce((s, w) => s + w.totalAmount, 0));
    const eventTotal = toRupees(paidEvents.reduce((s, e) => s + e.totalAmount, 0));

    const summaryData: [string, number, number, number][] = [
      ['Food & Beverage Orders', completedOrders.length, Math.round(grandTaxable * 100) / 100, Math.round(orderTotal * 100) / 100],
      ['Workshop Bookings', paidWorkshops.length, 0, Math.round(workshopTotal * 100) / 100],
      ['Event Orders', paidEvents.length, 0, Math.round(eventTotal * 100) / 100],
    ];

    let sumRowNum = 4;
    for (const [label, count, taxable, amount] of summaryData) {
      const row = summarySheet.getRow(sumRowNum);
      row.getCell(1).value = label;
      row.getCell(1).font = { size: 11 };
      row.getCell(2).value = count;
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(3).value = taxable;
      row.getCell(3).numFmt = '"\u20b9"#,##0.00';
      row.getCell(3).alignment = { horizontal: 'right' };
      row.getCell(4).value = amount;
      row.getCell(4).numFmt = '"\u20b9"#,##0.00';
      row.getCell(4).alignment = { horizontal: 'right' };
      for (let col = 1; col <= 4; col++) {
        row.getCell(col).border = { top: { style: 'thin', color: { argb: 'FFD0D0D0' } }, bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } }, left: { style: 'thin', color: { argb: 'FFD0D0D0' } }, right: { style: 'thin', color: { argb: 'FFD0D0D0' } } };
      }
      sumRowNum++;
    }

    // Grand Total row
    const grandRow = summarySheet.getRow(sumRowNum);
    grandRow.getCell(1).value = 'GRAND TOTAL';
    grandRow.getCell(1).font = { bold: true, size: 12 };
    grandRow.getCell(2).value = completedOrders.length + paidWorkshops.length + paidEvents.length;
    grandRow.getCell(2).font = { bold: true, size: 12 };
    grandRow.getCell(2).alignment = { horizontal: 'center' };
    grandRow.getCell(3).value = Math.round(grandTaxable * 100) / 100;
    grandRow.getCell(3).numFmt = '"\u20b9"#,##0.00';
    grandRow.getCell(3).font = { bold: true, size: 12 };
    grandRow.getCell(3).alignment = { horizontal: 'right' };
    grandRow.getCell(4).value = Math.round(grandTotal * 100) / 100;
    grandRow.getCell(4).numFmt = '"\u20b9"#,##0.00';
    grandRow.getCell(4).font = { bold: true, size: 12 };
    grandRow.getCell(4).alignment = { horizontal: 'right' };
    grandRow.height = 28;
    for (let col = 1; col <= 4; col++) {
      grandRow.getCell(col).border = { top: { style: 'medium' }, bottom: { style: 'double' } };
      grandRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0E0' } };
    }
    sumRowNum += 2;

    // GST Breakdown in summary sheet
    const gstBreakdownTitle = summarySheet.getRow(sumRowNum);
    gstBreakdownTitle.getCell(1).value = 'GST Breakdown';
    gstBreakdownTitle.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF8B0000' } };
    sumRowNum++;
    const gstItems: [string, number][] = [
      ['Taxable Amount', Math.round(grandTaxable * 100) / 100],
      ['CGST (2.5%)', Math.round(grandCgst * 100) / 100],
      ['SGST (2.5%)', Math.round(grandSgst * 100) / 100],
      ['Total GST (5%)', Math.round(grandGst * 100) / 100],
      ['Grand Total (incl. GST)', Math.round(grandTotal * 100) / 100],
    ];
    for (const [label, value] of gstItems) {
      const row = summarySheet.getRow(sumRowNum);
      row.getCell(1).value = label;
      row.getCell(1).font = label.startsWith('Grand') ? { bold: true, size: 11 } : { size: 11 };
      row.getCell(2).value = value;
      row.getCell(2).numFmt = '"\u20b9"#,##0.00';
      row.getCell(2).alignment = { horizontal: 'right' };
      row.getCell(2).font = label.startsWith('Grand') ? { bold: true, size: 11 } : { size: 11 };
      if (label.startsWith('Grand')) {
        for (let col = 1; col <= 2; col++) {
          row.getCell(col).border = { top: { style: 'medium' }, bottom: { style: 'double' } };
        }
      }
      sumRowNum++;
    }

    // Payment method breakdown in summary sheet
    sumRowNum += 1;
    const paymentTitle = summarySheet.getRow(sumRowNum);
    paymentTitle.getCell(1).value = 'Payment Method Breakdown';
    paymentTitle.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF8B0000' } };
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
    for (const event of paidEvents) {
      const method = 'Event Payment';
      if (!paymentMethods[method]) paymentMethods[method] = { count: 0, total: 0 };
      paymentMethods[method].count++;
      paymentMethods[method].total += toRupees(event.totalAmount);
    }
    // Sort by total descending
    const sortedPayMethods = Object.entries(paymentMethods).sort((a, b) => b[1].total - a[1].total);
    for (const [method, data] of sortedPayMethods) {
      const row = summarySheet.getRow(sumRowNum);
      row.getCell(1).value = method;
      row.getCell(1).font = { size: 11 };
      row.getCell(2).value = data.count;
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(3).value = Math.round(data.total * 100) / 100;
      row.getCell(3).numFmt = '"\u20b9"#,##0.00';
      row.getCell(3).alignment = { horizontal: 'right' };
      sumRowNum++;
    }

    // ===== Sheet 2: GST Summary (Daily) =====
    const gstSheet = workbook.addWorksheet('GST Summary');

    // Title
    gstSheet.mergeCells('A1:G1');
    gstSheet.getCell('A1').value = 'Taiwan Maami - GST Summary (Daily)';
    gstSheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF8B0000' } };
    gstSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    gstSheet.getRow(1).height = 30;

    gstSheet.mergeCells('A2:G2');
    gstSheet.getCell('A2').value = `Period: ${startDate} to ${endDate}`;
    gstSheet.getCell('A2').font = { size: 11, italic: true };
    gstSheet.getCell('A2').alignment = { horizontal: 'center' };

    // GST Headers
    const gstHeaders = ['Date', 'No. of Invoices', 'Taxable Value (₹)', 'CGST @ 2.5% (₹)', 'SGST @ 2.5% (₹)', 'Total GST (₹)', 'Invoice Value (₹)'];
    const gstHeaderRow = gstSheet.getRow(4);
    gstHeaders.forEach((header, idx) => {
      const cell = gstHeaderRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B0000' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    gstHeaderRow.height = 28;

    gstSheet.getColumn(1).width = 14;
    gstSheet.getColumn(2).width = 14;
    gstSheet.getColumn(3).width = 18;
    gstSheet.getColumn(4).width = 16;
    gstSheet.getColumn(5).width = 16;
    gstSheet.getColumn(6).width = 16;
    gstSheet.getColumn(7).width = 18;

    // Group all transactions by date
    const dailyStats: Record<string, { invoiceCount: number; taxable: number; cgst: number; sgst: number; gst: number; total: number }> = {};

    // Add orders
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

    // Add workshops
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

    // Add events
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

    // Sort by date and write rows
    const sortedDates = Object.keys(dailyStats).sort((a, b) => {
      const [da, ma, ya] = a.split('/').map(Number);
      const [db, mb, yb] = b.split('/').map(Number);
      return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
    });

    let gstRowNum = 5;
    let gstTotalInvoices = 0;
    let gstTotalTaxable = 0;
    let gstTotalCgst = 0;
    let gstTotalSgst = 0;
    let gstTotalGst = 0;
    let gstTotalValue = 0;

    for (const dateKey of sortedDates) {
      const stats = dailyStats[dateKey];
      const row = gstSheet.getRow(gstRowNum);
      row.values = [
        dateKey,
        stats.invoiceCount,
        Math.round(stats.taxable * 100) / 100,
        Math.round(stats.cgst * 100) / 100,
        Math.round(stats.sgst * 100) / 100,
        Math.round(stats.gst * 100) / 100,
        Math.round(stats.total * 100) / 100,
      ];

      gstTotalInvoices += stats.invoiceCount;
      gstTotalTaxable += stats.taxable;
      gstTotalCgst += stats.cgst;
      gstTotalSgst += stats.sgst;
      gstTotalGst += stats.gst;
      gstTotalValue += stats.total;

      for (let col = 1; col <= 7; col++) {
        const cell = row.getCell(col);
        cell.border = { top: { style: 'thin', color: { argb: 'FFD0D0D0' } }, bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } }, left: { style: 'thin', color: { argb: 'FFD0D0D0' } }, right: { style: 'thin', color: { argb: 'FFD0D0D0' } } };
        if (col >= 3) {
          cell.numFmt = '"₹"#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
        if (col === 2) cell.alignment = { horizontal: 'center' };
      }

      if (gstRowNum % 2 === 0) {
        for (let col = 1; col <= 7; col++) {
          row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5F0' } };
        }
      }

      gstRowNum++;
    }

    // GST Totals row
    const gstTotalsRow = gstSheet.getRow(gstRowNum);
    gstTotalsRow.values = [
      'TOTAL',
      gstTotalInvoices,
      Math.round(gstTotalTaxable * 100) / 100,
      Math.round(gstTotalCgst * 100) / 100,
      Math.round(gstTotalSgst * 100) / 100,
      Math.round(gstTotalGst * 100) / 100,
      Math.round(gstTotalValue * 100) / 100,
    ];
    gstTotalsRow.height = 28;
    for (let col = 1; col <= 7; col++) {
      const cell = gstTotalsRow.getCell(col);
      cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B0000' } };
      cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
      if (col >= 3) {
        cell.numFmt = '"₹"#,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      if (col === 1) cell.alignment = { horizontal: 'right', vertical: 'middle' };
      if (col === 2) cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // ===== Sheet 3: Payment Method Summary =====
    const paymentSheet = workbook.addWorksheet('Payment Summary');

    paymentSheet.mergeCells('A1:D1');
    paymentSheet.getCell('A1').value = 'Taiwan Maami - Payment Method Summary';
    paymentSheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF8B0000' } };
    paymentSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    paymentSheet.getRow(1).height = 30;

    paymentSheet.mergeCells('A2:D2');
    paymentSheet.getCell('A2').value = `Period: ${startDate} to ${endDate}`;
    paymentSheet.getCell('A2').font = { size: 11, italic: true };
    paymentSheet.getCell('A2').alignment = { horizontal: 'center' };

    const paymentHeaders = ['Payment Method', 'No. of Transactions', 'Total Amount (₹)', '% of Revenue'];
    const paymentHeaderRow = paymentSheet.getRow(4);
    paymentHeaders.forEach((header, idx) => {
      const cell = paymentHeaderRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B0000' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    paymentSheet.getColumn(1).width = 22;
    paymentSheet.getColumn(2).width = 20;
    paymentSheet.getColumn(3).width = 20;
    paymentSheet.getColumn(4).width = 16;

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
    let payGrandCount = 0;
    let payGrandTotal = 0;

    for (const [method, stats] of sortedMethods) {
      const row = paymentSheet.getRow(payRowNum);
      const pct = grandTotal > 0 ? (stats.total / grandTotal * 100) : 0;
      row.values = [method, stats.count, Math.round(stats.total * 100) / 100, Math.round(pct * 10) / 10];

      payGrandCount += stats.count;
      payGrandTotal += stats.total;

      for (let col = 1; col <= 4; col++) {
        const cell = row.getCell(col);
        cell.border = { top: { style: 'thin', color: { argb: 'FFD0D0D0' } }, bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } }, left: { style: 'thin', color: { argb: 'FFD0D0D0' } }, right: { style: 'thin', color: { argb: 'FFD0D0D0' } } };
        if (col === 3) { cell.numFmt = '"₹"#,##0.00'; cell.alignment = { horizontal: 'right' }; }
        if (col === 4) { cell.numFmt = '0.0"%"'; cell.alignment = { horizontal: 'center' }; }
        if (col === 2) cell.alignment = { horizontal: 'center' };
      }

      if (payRowNum % 2 === 0) {
        for (let col = 1; col <= 4; col++) {
          row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5F0' } };
        }
      }

      payRowNum++;
    }

    // Payment totals
    const payTotalsRow = paymentSheet.getRow(payRowNum);
    payTotalsRow.values = ['TOTAL', payGrandCount, Math.round(payGrandTotal * 100) / 100, 100];
    payTotalsRow.height = 28;
    for (let col = 1; col <= 4; col++) {
      const cell = payTotalsRow.getCell(col);
      cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B0000' } };
      cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
      if (col === 3) { cell.numFmt = '"₹"#,##0.00'; cell.alignment = { horizontal: 'right', vertical: 'middle' }; }
      if (col === 4) { cell.numFmt = '0.0"%"'; cell.alignment = { horizontal: 'center', vertical: 'middle' }; }
      if (col === 1) cell.alignment = { horizontal: 'right', vertical: 'middle' };
      if (col === 2) cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Freeze panes for all sheets
    salesSheet.views = [{ state: 'frozen', ySplit: 4 }];
    summarySheet.views = [{ state: 'frozen', ySplit: 3 }];
    gstSheet.views = [{ state: 'frozen', ySplit: 4 }];
    paymentSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // Print setup
    [salesSheet, summarySheet, gstSheet, paymentSheet].forEach(sheet => {
      sheet.pageSetup = {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      };
    });

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
