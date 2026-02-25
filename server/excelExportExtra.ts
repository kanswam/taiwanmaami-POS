import ExcelJS from 'exceljs';
import { getDb } from './db';
import { orders, orderItems, products, categories, subcategories, deliverySalesUploads } from '../drizzle/schema';
import { and, eq, sql, desc, sum, count } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { sdk } from './_core/sdk';

// Paise to Rupees conversion
const toRupees = (paise: number) => paise / 100;

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

// Shared styling helpers
const BRAND_COLOR = 'FF8B0000';
const LIGHT_BG = 'FFFFF5F0';
const WHITE = 'FFFFFFFF';

function applyHeaderStyle(row: ExcelJS.Row, colCount: number, height: number = 28) {
  row.height = height;
  for (let col = 1; col <= colCount; col++) {
    const cell = row.getCell(col);
    cell.font = { bold: true, color: { argb: WHITE }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLOR } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  }
}

function applyDataRowStyle(row: ExcelJS.Row, colCount: number, isAlternate: boolean, currencyCols: number[] = []) {
  for (let col = 1; col <= colCount; col++) {
    const cell = row.getCell(col);
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    };
    if (currencyCols.includes(col)) {
      cell.numFmt = '"\u20b9"#,##0.00';
      cell.alignment = { horizontal: 'right' };
    }
    if (isAlternate) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BG } };
    }
  }
}

function applyTotalsRowStyle(row: ExcelJS.Row, colCount: number, currencyCols: number[] = []) {
  row.height = 28;
  for (let col = 1; col <= colCount; col++) {
    const cell = row.getCell(col);
    cell.font = { bold: true, size: 12, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLOR } };
    cell.border = {
      top: { style: 'medium' },
      bottom: { style: 'medium' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
    if (currencyCols.includes(col)) {
      cell.numFmt = '"\u20b9"#,##0.00';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
  }
}

function addTitle(sheet: ExcelJS.Worksheet, title: string, subtitle: string, colCount: number) {
  // Title row
  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: BRAND_COLOR } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  // Subtitle row
  sheet.mergeCells(2, 1, 2, colCount);
  const subtitleCell = sheet.getCell('A2');
  subtitleCell.value = subtitle;
  subtitleCell.font = { size: 11, italic: true };
  subtitleCell.alignment = { horizontal: 'center' };
  sheet.getRow(2).height = 20;

  // Spacer
  sheet.getRow(3).height = 10;
}

// ============================================================
// ITEMWISE SALES REPORT EXPORT
// ============================================================
export async function handleItemwiseExport(req: Request, res: Response) {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

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
    // Query itemwise data - aggregate order_items for completed orders in date range
    // products only has subcategoryId, need to join subcategories to get categoryId
    const itemData = await dbInstance
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        size: orderItems.size,
        quantity: sql<number>`SUM(${orderItems.quantity})`.as('total_qty'),
        revenue: sql<number>`SUM(${orderItems.lineTotal})`.as('total_revenue'),
        orderCount: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`.as('order_count'),
        categoryId: subcategories.categoryId,
        subcategoryId: products.subcategoryId,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))
      .where(and(
        sql`${orders.createdAt} >= ${startDate}`,
        sql`${orders.createdAt} <= ${endDate + ' 23:59:59'}`,
        sql`${orders.orderStatus} != 'cancelled'`,
      ))
      .groupBy(orderItems.productId, orderItems.productName, orderItems.size, subcategories.categoryId, products.subcategoryId)
      .orderBy(desc(sql`total_revenue`));

    // Fetch categories and subcategories for names
    const allCategories = await dbInstance.select().from(categories);
    const allSubcategories = await dbInstance.select().from(subcategories);
    const catMap = new Map(allCategories.map(c => [c.id, c.name]));
    const subMap = new Map(allSubcategories.map(s => [s.id, s.name]));

    // Calculate totals
    const totalRevenue = itemData.reduce((s, i) => s + Number(i.revenue), 0);
    const totalQuantity = itemData.reduce((s, i) => s + Number(i.quantity), 0);

    // Build workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Taiwan Maami';
    workbook.created = new Date();

    // ===== Sheet 1: Itemwise Sales (All Items) =====
    const sheet = workbook.addWorksheet('Itemwise Sales');
    addTitle(sheet, 'Taiwan Maami - Itemwise Sales Report', `Period: ${startDate} to ${endDate}`, 10);

    // Headers
    const headers = ['S.No', 'Item Name', 'Size', 'Category', 'Subcategory', 'Qty Sold', 'Revenue (₹)', 'Avg Price (₹)', '% of Revenue', '% of Qty'];
    const headerRow = sheet.getRow(4);
    headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
    applyHeaderStyle(headerRow, 10);

    // Column widths
    sheet.getColumn(1).width = 6;    // S.No
    sheet.getColumn(2).width = 35;   // Item Name
    sheet.getColumn(3).width = 12;   // Size
    sheet.getColumn(4).width = 20;   // Category
    sheet.getColumn(5).width = 20;   // Subcategory
    sheet.getColumn(6).width = 10;   // Qty Sold
    sheet.getColumn(7).width = 16;   // Revenue
    sheet.getColumn(8).width = 14;   // Avg Price
    sheet.getColumn(9).width = 12;   // % Revenue
    sheet.getColumn(10).width = 10;  // % Qty

    let rowNum = 5;
    itemData.forEach((item, idx) => {
      const row = sheet.getRow(rowNum);
      const rev = Number(item.revenue);
      const qty = Number(item.quantity);
      const avgPrice = qty > 0 ? rev / qty : 0;
      const revShare = totalRevenue > 0 ? (rev / totalRevenue * 100) : 0;
      const qtyShare = totalQuantity > 0 ? (qty / totalQuantity * 100) : 0;

      row.values = [
        idx + 1,
        item.productName,
        item.size || 'Regular',
        catMap.get(item.categoryId ?? 0) || 'Uncategorized',
        subMap.get(item.subcategoryId ?? 0) || '-',
        qty,
        Math.round(toRupees(rev) * 100) / 100,
        Math.round(toRupees(avgPrice) * 100) / 100,
        Math.round(revShare * 10) / 10,
        Math.round(qtyShare * 10) / 10,
      ];

      applyDataRowStyle(row, 10, idx % 2 === 1, [7, 8]);
      row.getCell(7).numFmt = '"₹"#,##0.00';
      row.getCell(8).numFmt = '"₹"#,##0.00';
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(6).alignment = { horizontal: 'center' };
      row.getCell(9).numFmt = '0.0"%"';
      row.getCell(9).alignment = { horizontal: 'center' };
      row.getCell(10).numFmt = '0.0"%"';
      row.getCell(10).alignment = { horizontal: 'center' };

      rowNum++;
    });

    // Totals row
    const totalsRow = sheet.getRow(rowNum);
    totalsRow.values = [
      '', 'TOTAL', '', '', '',
      totalQuantity,
      Math.round(toRupees(totalRevenue) * 100) / 100,
      totalQuantity > 0 ? Math.round(toRupees(totalRevenue / totalQuantity) * 100) / 100 : 0,
      100,
      100,
    ];
    applyTotalsRowStyle(totalsRow, 10, [7, 8]);
    totalsRow.getCell(7).numFmt = '"₹"#,##0.00';
    totalsRow.getCell(8).numFmt = '"₹"#,##0.00';
    totalsRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    totalsRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    totalsRow.getCell(9).numFmt = '0.0"%"';
    totalsRow.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
    totalsRow.getCell(10).numFmt = '0.0"%"';
    totalsRow.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

    // ===== Sheet 2: Category Summary =====
    const catSheet = workbook.addWorksheet('Category Summary');
    addTitle(catSheet, 'Taiwan Maami - Category Sales Summary', `Period: ${startDate} to ${endDate}`, 5);

    const catHeaders = ['S.No', 'Category', 'Qty Sold', 'Revenue (₹)', '% of Revenue'];
    const catHeaderRow = catSheet.getRow(4);
    catHeaders.forEach((h, i) => { catHeaderRow.getCell(i + 1).value = h; });
    applyHeaderStyle(catHeaderRow, 5);

    catSheet.getColumn(1).width = 6;
    catSheet.getColumn(2).width = 30;
    catSheet.getColumn(3).width = 12;
    catSheet.getColumn(4).width = 18;
    catSheet.getColumn(5).width = 14;

    // Aggregate by category
    const catStats: Record<string, { qty: number; revenue: number }> = {};
    itemData.forEach(item => {
      const catName = catMap.get(item.categoryId ?? 0) || 'Uncategorized';
      if (!catStats[catName]) catStats[catName] = { qty: 0, revenue: 0 };
      catStats[catName].qty += Number(item.quantity);
      catStats[catName].revenue += Number(item.revenue);
    });

    const sortedCats = Object.entries(catStats).sort((a, b) => b[1].revenue - a[1].revenue);
    let catRowNum = 5;
    sortedCats.forEach(([catName, stats], idx) => {
      const row = catSheet.getRow(catRowNum);
      const revShare = totalRevenue > 0 ? (stats.revenue / totalRevenue * 100) : 0;
      row.values = [idx + 1, catName, stats.qty, Math.round(toRupees(stats.revenue) * 100) / 100, Math.round(revShare * 10) / 10];
      applyDataRowStyle(row, 5, idx % 2 === 1, [4]);
      row.getCell(4).numFmt = '"₹"#,##0.00';
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(5).numFmt = '0.0"%"';
      row.getCell(5).alignment = { horizontal: 'center' };
      catRowNum++;
    });

    const catTotalsRow = catSheet.getRow(catRowNum);
    catTotalsRow.values = ['', 'TOTAL', totalQuantity, Math.round(toRupees(totalRevenue) * 100) / 100, 100];
    applyTotalsRowStyle(catTotalsRow, 5, [4]);
    catTotalsRow.getCell(4).numFmt = '"₹"#,##0.00';
    catTotalsRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    catTotalsRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    catTotalsRow.getCell(5).numFmt = '0.0"%"';
    catTotalsRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

    // Freeze panes
    sheet.views = [{ state: 'frozen', ySplit: 4 }];
    catSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // Print setup
    [sheet, catSheet].forEach(s => {
      s.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    });

    // Generate and send
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Taiwan_Maami_Itemwise_Sales_${startDate}_to_${endDate}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', (buffer as any).length);
    res.send(Buffer.from(buffer as ArrayBuffer));

  } catch (error) {
    console.error('Itemwise export error:', error);
    res.status(500).json({ error: 'Failed to generate itemwise report' });
  }
}

// ============================================================
// CHANNELS REPORT EXPORT
// ============================================================
export async function handleChannelsExport(req: Request, res: Response) {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

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
    console.log('[Channels Export] Starting export for', startDate, 'to', endDate);
    // 1. Website orders
    const websiteOrders = await dbInstance
      .select({
        orderCount: sql<number>`COUNT(*)`.as('order_count'),
        totalRevenue: sql<number>`SUM(${orders.totalAmount})`.as('total_revenue'),
      })
      .from(orders)
      .where(and(
        sql`${orders.createdAt} >= ${startDate}`,
        sql`${orders.createdAt} <= ${endDate + ' 23:59:59'}`,
        sql`${orders.orderStatus} != 'cancelled'`,
      ));

    console.log('[Channels Export] Website orders:', JSON.stringify(websiteOrders));
    // 2. Delivery data from Petpooja uploads (Zomato, Swiggy, Dine-in)
    const deliveryUploads = await dbInstance.select()
      .from(deliverySalesUploads)
      .where(and(
        sql`DATE(${deliverySalesUploads.periodStart}) >= ${startDate}`,
        sql`DATE(${deliverySalesUploads.periodEnd}) <= DATE_ADD(${endDate}, INTERVAL 1 DAY)`
      ));

    // Aggregate delivery channel data from uploads
    let zomatoOrders = 0, zomatoAmount = 0, swiggyOrders = 0, swiggyAmount = 0;
    let dineInOrders = 0, dineInAmount = 0;
    for (const u of deliveryUploads) {
      zomatoOrders += u.zomatoOrders || 0;
      zomatoAmount += u.zomatoAmount || 0;
      swiggyOrders += u.swiggyOrders || 0;
      swiggyAmount += u.swiggyAmount || 0;
      dineInOrders += u.dineInOrders || 0;
      dineInAmount += u.dineInAmount || 0;
    }

    // Build channel data
    const channels: { name: string; orders: number; revenue: number }[] = [];
    
    const webOrders = Number(websiteOrders[0]?.orderCount || 0);
    const webRevenue = Number(websiteOrders[0]?.totalRevenue || 0);
    if (webOrders > 0) {
      channels.push({ name: 'Website / Direct', orders: webOrders, revenue: webRevenue });
    }
    if (zomatoOrders > 0) {
      channels.push({ name: 'Zomato', orders: zomatoOrders, revenue: zomatoAmount });
    }
    if (swiggyOrders > 0) {
      channels.push({ name: 'Swiggy', orders: swiggyOrders, revenue: swiggyAmount });
    }
    if (dineInOrders > 0) {
      channels.push({ name: 'Dine-in', orders: dineInOrders, revenue: dineInAmount });
    }

    // Sort by revenue descending
    channels.sort((a, b) => b.revenue - a.revenue);

    const totalOrders = channels.reduce((s, c) => s + c.orders, 0);
    const totalRevenue = channels.reduce((s, c) => s + c.revenue, 0);

    // Build workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Taiwan Maami';
    workbook.created = new Date();

    // ===== Sheet 1: Channel Summary =====
    const sheet = workbook.addWorksheet('Channel Summary');
    addTitle(sheet, 'Taiwan Maami - Channel Sales Report', `Period: ${startDate} to ${endDate}`, 6);

    const headers = ['S.No', 'Channel', 'Orders', 'Revenue (₹)', 'Avg Order Value (₹)', '% of Revenue'];
    const headerRow = sheet.getRow(4);
    headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
    applyHeaderStyle(headerRow, 6);

    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 22;
    sheet.getColumn(3).width = 12;
    sheet.getColumn(4).width = 18;
    sheet.getColumn(5).width = 20;
    sheet.getColumn(6).width = 14;

    let rowNum = 5;
    channels.forEach((ch, idx) => {
      const row = sheet.getRow(rowNum);
      const aov = ch.orders > 0 ? ch.revenue / ch.orders : 0;
      const revShare = totalRevenue > 0 ? (ch.revenue / totalRevenue * 100) : 0;

      row.values = [
        idx + 1,
        ch.name,
        ch.orders,
        Math.round(toRupees(ch.revenue) * 100) / 100,
        Math.round(toRupees(aov) * 100) / 100,
        Math.round(revShare * 10) / 10,
      ];

      applyDataRowStyle(row, 6, idx % 2 === 1, [4, 5]);
      row.getCell(4).numFmt = '"₹"#,##0.00';
      row.getCell(5).numFmt = '"₹"#,##0.00';
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(6).numFmt = '0.0"%"';
      row.getCell(6).alignment = { horizontal: 'center' };

      rowNum++;
    });

    // Totals row
    const totalsRow = sheet.getRow(rowNum);
    totalsRow.values = [
      '', 'TOTAL',
      totalOrders,
      Math.round(toRupees(totalRevenue) * 100) / 100,
      totalOrders > 0 ? Math.round(toRupees(totalRevenue / totalOrders) * 100) / 100 : 0,
      100,
    ];
    applyTotalsRowStyle(totalsRow, 6, [4, 5]);
    totalsRow.getCell(4).numFmt = '"₹"#,##0.00';
    totalsRow.getCell(5).numFmt = '"₹"#,##0.00';
    totalsRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    totalsRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    totalsRow.getCell(6).numFmt = '0.0"%"';
    totalsRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

    // ===== Sheet 2: Daily Channel Breakdown =====
    const dailySheet = workbook.addWorksheet('Daily Breakdown');
    addTitle(dailySheet, 'Taiwan Maami - Daily Channel Breakdown', `Period: ${startDate} to ${endDate}`, 3 + channels.length * 2);

    // Build daily data - website orders by date
    // Use GROUP BY 1 (positional) to satisfy only_full_group_by with DATE() expressions
    const dailyWebsite = await dbInstance.execute(
      sql`SELECT DATE(${orders.createdAt}) as order_date, COUNT(*) as order_count, SUM(${orders.totalAmount}) as total_revenue FROM ${orders} WHERE ${orders.createdAt} >= ${startDate} AND ${orders.createdAt} <= ${endDate + ' 23:59:59'} AND ${orders.orderStatus} != 'cancelled' GROUP BY 1 ORDER BY 1`
    ) as any;

    // Note: Delivery data from Petpooja uploads is aggregate per period, not daily
    // So the daily breakdown only shows website orders with daily granularity
    // Delivery totals are shown in the Channel Summary sheet

    const allDates = new Set<string>();
    const dailyRows = (Array.isArray(dailyWebsite) ? (dailyWebsite[0] || dailyWebsite) : dailyWebsite) as any[];
    dailyRows.forEach((d: any) => allDates.add(String(d.order_date)));
    const sortedDates = Array.from(allDates).sort();

    const dailyMap: Record<string, Record<string, { orders: number; revenue: number }>> = {};
    for (const date of sortedDates) {
      dailyMap[date] = {};
    }
    dailyRows.forEach((d: any) => {
      dailyMap[String(d.order_date)]['Website / Direct'] = { orders: Number(d.order_count), revenue: Number(d.total_revenue) };
    });

    // Channel names for columns
    const channelNames = channels.map(c => c.name);
    const dailyHeaders = ['S.No', 'Date', ...channelNames.flatMap(n => [`${n} Orders`, `${n} Revenue (₹)`]), 'Total Orders', 'Total Revenue (₹)'];
    const dailyHeaderRow = dailySheet.getRow(4);
    dailyHeaders.forEach((h, i) => { dailyHeaderRow.getCell(i + 1).value = h; });
    applyHeaderStyle(dailyHeaderRow, dailyHeaders.length);

    dailySheet.getColumn(1).width = 6;
    dailySheet.getColumn(2).width = 14;
    for (let i = 0; i < channelNames.length; i++) {
      dailySheet.getColumn(3 + i * 2).width = 14;
      dailySheet.getColumn(4 + i * 2).width = 16;
    }
    dailySheet.getColumn(dailyHeaders.length - 1).width = 14;
    dailySheet.getColumn(dailyHeaders.length).width = 18;

    let dailyRowNum = 5;
    const currCols: number[] = [];
    for (let i = 0; i < channelNames.length; i++) {
      currCols.push(4 + i * 2); // revenue columns
    }
    currCols.push(dailyHeaders.length); // total revenue

    sortedDates.forEach((date, idx) => {
      const row = dailySheet.getRow(dailyRowNum);
      const vals: (string | number)[] = [idx + 1, date];
      let dayOrders = 0;
      let dayRevenue = 0;
      for (const chName of channelNames) {
        const chData = dailyMap[date]?.[chName];
        vals.push(chData?.orders || 0);
        vals.push(chData ? Math.round(toRupees(chData.revenue) * 100) / 100 : 0);
        dayOrders += chData?.orders || 0;
        dayRevenue += chData?.revenue || 0;
      }
      vals.push(dayOrders);
      vals.push(Math.round(toRupees(dayRevenue) * 100) / 100);
      row.values = vals;

      applyDataRowStyle(row, dailyHeaders.length, idx % 2 === 1, currCols);
      row.getCell(1).alignment = { horizontal: 'center' };
      // Center order count columns and format revenue columns
      for (let i = 0; i < channelNames.length; i++) {
        row.getCell(3 + i * 2).alignment = { horizontal: 'center' };
        row.getCell(4 + i * 2).numFmt = '"₹"#,##0.00';
      }
      row.getCell(dailyHeaders.length - 1).alignment = { horizontal: 'center' };
      row.getCell(dailyHeaders.length).numFmt = '"₹"#,##0.00';

      dailyRowNum++;
    });

    // Daily totals
    const dailyTotalsRow = dailySheet.getRow(dailyRowNum);
    const totalVals: (string | number)[] = ['', 'TOTAL'];
    for (const chName of channelNames) {
      const ch = channels.find(c => c.name === chName);
      totalVals.push(ch?.orders || 0);
      totalVals.push(Math.round(toRupees(ch?.revenue || 0) * 100) / 100);
    }
    totalVals.push(totalOrders);
    totalVals.push(Math.round(toRupees(totalRevenue) * 100) / 100);
    dailyTotalsRow.values = totalVals;
    applyTotalsRowStyle(dailyTotalsRow, dailyHeaders.length, currCols);
    dailyTotalsRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    // Format revenue columns in totals
    for (let i = 0; i < channelNames.length; i++) {
      dailyTotalsRow.getCell(4 + i * 2).numFmt = '"₹"#,##0.00';
    }
    dailyTotalsRow.getCell(dailyHeaders.length).numFmt = '"₹"#,##0.00';

    // Freeze panes
    sheet.views = [{ state: 'frozen', ySplit: 4 }];
    dailySheet.views = [{ state: 'frozen', ySplit: 4 }];

    // Print setup
    [sheet, dailySheet].forEach(s => {
      s.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    });

    // Generate and send
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Taiwan_Maami_Channel_Report_${startDate}_to_${endDate}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', (buffer as any).length);
    res.send(Buffer.from(buffer as ArrayBuffer));

  } catch (error) {
    console.error('Channels export error:', error);
    console.error('Channels export stack:', (error as any)?.stack);
    res.status(500).json({ error: 'Failed to generate channels report', details: String(error) });
  }
}

// ============================================================
// LEELA REGISTRATIONS EXPORT
// ============================================================
export async function handleLeelaRegistrationsExport(req: Request, res: Response) {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const dbInstance = await getDb();
    if (!dbInstance) { res.status(500).json({ error: 'Database not available' }); return; }
    const { popupRegistrations } = await import('../drizzle/schema');

    const registrations = await dbInstance
      .select()
      .from(popupRegistrations)
      .where(eq(popupRegistrations.eventSlug, 'leela-hyderabad-march-2026'))
      .orderBy(popupRegistrations.selectedDate, popupRegistrations.customerName);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Taiwan Maami';
    workbook.created = new Date();

    // ---- Sheet 1: All Registrations ----
    const sheet = workbook.addWorksheet('Registrations');

    const COL_COUNT = 9;
    addTitle(sheet, 'Taiwan Maami — The Leela Hyderabad', 'Edible Journey · 5–8 March 2026 · Guest Registrations', COL_COUNT);

    // Headers
    const headerRow = sheet.getRow(4);
    headerRow.values = ['#', 'Customer Name', 'Email', 'Phone', 'Event Type', 'Date', 'No. of Guests', 'Status', 'Notes'];
    applyHeaderStyle(headerRow, COL_COUNT);

    // Column widths
    sheet.getColumn(1).width = 5;
    sheet.getColumn(2).width = 25;
    sheet.getColumn(3).width = 32;
    sheet.getColumn(4).width = 18;
    sheet.getColumn(5).width = 16;
    sheet.getColumn(6).width = 14;
    sheet.getColumn(7).width = 14;
    sheet.getColumn(8).width = 14;
    sheet.getColumn(9).width = 30;

    // Data rows
    let rowNum = 5;
    let totalGuests = 0;
    registrations.forEach((reg, idx) => {
      const row = sheet.getRow(rowNum);
      row.values = [
        idx + 1,
        reg.customerName,
        reg.customerEmail,
        reg.customerPhone,
        reg.eventType === 'dinner' ? 'Dinner' : 'Master Class',
        reg.selectedDate,
        reg.numberOfGuests,
        reg.status.charAt(0).toUpperCase() + reg.status.slice(1),
        reg.specialRequirements || '',
      ];
      applyDataRowStyle(row, COL_COUNT, idx % 2 === 1);
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(6).alignment = { horizontal: 'center' };
      row.getCell(7).alignment = { horizontal: 'center' };
      row.getCell(8).alignment = { horizontal: 'center' };
      row.getCell(9).alignment = { horizontal: 'left', wrapText: true };
      totalGuests += reg.numberOfGuests;
      rowNum++;
    });

    // Totals row
    const totalsRow = sheet.getRow(rowNum);
    totalsRow.values = ['', 'TOTAL', '', '', '', '', totalGuests, `${registrations.length} registrations`, ''];
    applyTotalsRowStyle(totalsRow, COL_COUNT);
    totalsRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    totalsRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
    totalsRow.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

    // ---- Sheet 2: Summary by Date ----
    const summarySheet = workbook.addWorksheet('Summary by Date');

    const SUMMARY_COLS = 5;
    addTitle(summarySheet, 'Taiwan Maami — The Leela Hyderabad', 'Registration Summary by Date', SUMMARY_COLS);

    const summaryHeaderRow = summarySheet.getRow(4);
    summaryHeaderRow.values = ['Date', 'Event Type', 'Registrations', 'Total Guests', 'Confirmed'];
    applyHeaderStyle(summaryHeaderRow, SUMMARY_COLS);

    summarySheet.getColumn(1).width = 16;
    summarySheet.getColumn(2).width = 16;
    summarySheet.getColumn(3).width = 16;
    summarySheet.getColumn(4).width = 16;
    summarySheet.getColumn(5).width = 16;

    // Group by date + event type
    const dateMap: Record<string, { dinner: { count: number; guests: number; confirmed: number }; masterclass: { count: number; guests: number; confirmed: number } }> = {};
    registrations.forEach(reg => {
      if (!dateMap[reg.selectedDate]) {
        dateMap[reg.selectedDate] = {
          dinner: { count: 0, guests: 0, confirmed: 0 },
          masterclass: { count: 0, guests: 0, confirmed: 0 },
        };
      }
      const bucket = dateMap[reg.selectedDate][reg.eventType as 'dinner' | 'masterclass'];
      bucket.count++;
      bucket.guests += reg.numberOfGuests;
      if (reg.status === 'confirmed') bucket.confirmed++;
    });

    let summaryRowNum = 5;
    const sortedDates = Object.keys(dateMap).sort();
    let grandTotalRegs = 0;
    let grandTotalGuests = 0;
    let grandTotalConfirmed = 0;

    sortedDates.forEach((date, dateIdx) => {
      const d = dateMap[date];
      const types: Array<{ label: string; data: { count: number; guests: number; confirmed: number } }> = [];
      if (d.dinner.count > 0) types.push({ label: 'Dinner', data: d.dinner });
      if (d.masterclass.count > 0) types.push({ label: 'Master Class', data: d.masterclass });

      types.forEach((t, tIdx) => {
        const row = summarySheet.getRow(summaryRowNum);
        row.values = [date, t.label, t.data.count, t.data.guests, t.data.confirmed];
        applyDataRowStyle(row, SUMMARY_COLS, (dateIdx + tIdx) % 2 === 1);
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(3).alignment = { horizontal: 'center' };
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(5).alignment = { horizontal: 'center' };
        grandTotalRegs += t.data.count;
        grandTotalGuests += t.data.guests;
        grandTotalConfirmed += t.data.confirmed;
        summaryRowNum++;
      });
    });

    // Summary totals
    const summaryTotalsRow = summarySheet.getRow(summaryRowNum);
    summaryTotalsRow.values = ['TOTAL', '', grandTotalRegs, grandTotalGuests, grandTotalConfirmed];
    applyTotalsRowStyle(summaryTotalsRow, SUMMARY_COLS);
    summaryTotalsRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    for (let c = 3; c <= 5; c++) {
      summaryTotalsRow.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Freeze panes
    sheet.views = [{ state: 'frozen', ySplit: 4 }];
    summarySheet.views = [{ state: 'frozen', ySplit: 4 }];

    // Print setup
    [sheet, summarySheet].forEach(s => {
      s.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    });

    // Generate and send
    const buffer = await workbook.xlsx.writeBuffer();
    const today = new Date().toISOString().split('T')[0];
    const filename = `Leela_Hyderabad_Registrations_${today}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', (buffer as any).length);
    res.send(Buffer.from(buffer as ArrayBuffer));

  } catch (error) {
    console.error('Leela registrations export error:', error);
    res.status(500).json({ error: 'Failed to generate registrations report', details: String(error) });
  }
}
