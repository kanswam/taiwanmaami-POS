import ExcelJS from 'exceljs';
import { getDb } from './db';
import { orders, orderItems, products, categories, subcategories, deliverySalesUploads } from '../drizzle/schema';
import { and, eq, sql, desc, sum, count } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { authenticateClerkRequest } from './_core/clerk';
import {
  BRAND, FMT,
  addTitleBlock, styleHeaderRow, styleDataRow, styleTotalsRow, styleSubtotalRow,
  addSectionTitle, addFooterNote, applySheetSetup, createWorkbook,
  setColumnWidths, formatDate, toRupees, round2, addLegend,
} from './excelStyles';

// Admin auth middleware
async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  try {
    const user = await authenticateClerkRequest(req as any);
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
    // Query itemwise data
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
    const workbook = createWorkbook();

    // ===== Sheet 1: Itemwise Sales =====
    const sheet = workbook.addWorksheet('Itemwise Sales');
    const COL_COUNT = 10;
    addTitleBlock(sheet, 'Taiwan Maami — Itemwise Sales Report', `Period: ${formatDate(startDate)} to ${formatDate(endDate)}  ·  ${itemData.length} items  ·  ${totalQuantity} units sold`, COL_COUNT);

    // Headers
    const headers = ['S.No', 'Item Name', 'Size', 'Category', 'Subcategory', 'Qty Sold', 'Revenue', 'Avg Price', '% of Revenue', '% of Qty'];
    const headerRow = sheet.getRow(4);
    headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
    styleHeaderRow(headerRow, COL_COUNT);

    // Column widths
    setColumnWidths(sheet, [
      [1, 6], [2, 38], [3, 12], [4, 22], [5, 22],
      [6, 11], [7, 16], [8, 14], [9, 13], [10, 11],
    ]);

    // Data rows
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
        catMap.get(item.categoryId ?? 0) || 'Custom Items',
        subMap.get(item.subcategoryId ?? 0) || '—',
        qty,
        round2(toRupees(rev)),
        round2(toRupees(avgPrice)),
        round2(revShare),
        round2(qtyShare),
      ];

      styleDataRow(row, COL_COUNT, idx % 2 === 1, {
        currencyCols: [7, 8],
        percentCols: [9, 10],
        centerCols: [1, 6],
      });
      rowNum++;
    });

    // Totals row
    const totalsRow = sheet.getRow(rowNum);
    totalsRow.values = [
      '', 'TOTAL', '', '', '',
      totalQuantity,
      round2(toRupees(totalRevenue)),
      totalQuantity > 0 ? round2(toRupees(totalRevenue / totalQuantity)) : 0,
      100,
      100,
    ];
    styleTotalsRow(totalsRow, COL_COUNT, {
      currencyCols: [7, 8],
      percentCols: [9, 10],
      centerCols: [6],
    });
    totalsRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

    // ===== Sheet 2: Category Summary =====
    const catSheet = workbook.addWorksheet('Category Summary');
    const CAT_COLS = 6;
    addTitleBlock(catSheet, 'Taiwan Maami — Category Sales Summary', `Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, CAT_COLS);

    const catHeaders = ['S.No', 'Category', 'Qty Sold', 'Revenue', 'Avg Price', '% of Revenue'];
    const catHeaderRow = catSheet.getRow(4);
    catHeaders.forEach((h, i) => { catHeaderRow.getCell(i + 1).value = h; });
    styleHeaderRow(catHeaderRow, CAT_COLS);

    setColumnWidths(catSheet, [
      [1, 6], [2, 30], [3, 12], [4, 18], [5, 16], [6, 14],
    ]);

    // Aggregate by category
    const catStats: Record<string, { qty: number; revenue: number }> = {};
    itemData.forEach(item => {
      const catName = catMap.get(item.categoryId ?? 0) || 'Custom Items';
      if (!catStats[catName]) catStats[catName] = { qty: 0, revenue: 0 };
      catStats[catName].qty += Number(item.quantity);
      catStats[catName].revenue += Number(item.revenue);
    });

    const sortedCats = Object.entries(catStats).sort((a, b) => b[1].revenue - a[1].revenue);
    let catRowNum = 5;
    sortedCats.forEach(([catName, stats], idx) => {
      const row = catSheet.getRow(catRowNum);
      const revShare = totalRevenue > 0 ? (stats.revenue / totalRevenue * 100) : 0;
      const avgPrice = stats.qty > 0 ? stats.revenue / stats.qty : 0;
      row.values = [
        idx + 1,
        catName,
        stats.qty,
        round2(toRupees(stats.revenue)),
        round2(toRupees(avgPrice)),
        round2(revShare),
      ];
      styleDataRow(row, CAT_COLS, idx % 2 === 1, {
        currencyCols: [4, 5],
        percentCols: [6],
        centerCols: [1, 3],
      });
      catRowNum++;
    });

    // Category totals
    const catTotalsRow = catSheet.getRow(catRowNum);
    catTotalsRow.values = [
      '', 'TOTAL',
      totalQuantity,
      round2(toRupees(totalRevenue)),
      totalQuantity > 0 ? round2(toRupees(totalRevenue / totalQuantity)) : 0,
      100,
    ];
    styleTotalsRow(catTotalsRow, CAT_COLS, {
      currencyCols: [4, 5],
      percentCols: [6],
      centerCols: [3],
    });
    catTotalsRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

    // ===== Sheet 3: Subcategory Summary =====
    const subSheet = workbook.addWorksheet('Subcategory Summary');
    const SUB_COLS = 7;
    addTitleBlock(subSheet, 'Taiwan Maami — Subcategory Sales Summary', `Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, SUB_COLS);

    const subHeaders = ['S.No', 'Category', 'Subcategory', 'Qty Sold', 'Revenue', 'Avg Price', '% of Revenue'];
    const subHeaderRow = subSheet.getRow(4);
    subHeaders.forEach((h, i) => { subHeaderRow.getCell(i + 1).value = h; });
    styleHeaderRow(subHeaderRow, SUB_COLS);

    setColumnWidths(subSheet, [
      [1, 6], [2, 22], [3, 26], [4, 12], [5, 18], [6, 14], [7, 14],
    ]);

    // Aggregate by subcategory
    const subStats: Record<string, { category: string; qty: number; revenue: number }> = {};
    itemData.forEach(item => {
      const catName = catMap.get(item.categoryId ?? 0) || 'Custom Items';
      const subName = subMap.get(item.subcategoryId ?? 0) || '—';
      const key = `${catName}|||${subName}`;
      if (!subStats[key]) subStats[key] = { category: catName, qty: 0, revenue: 0 };
      subStats[key].qty += Number(item.quantity);
      subStats[key].revenue += Number(item.revenue);
    });

    const sortedSubs = Object.entries(subStats).sort((a, b) => b[1].revenue - a[1].revenue);
    let subRowNum = 5;
    sortedSubs.forEach(([key, stats], idx) => {
      const [catName, subName] = key.split('|||');
      const row = subSheet.getRow(subRowNum);
      const revShare = totalRevenue > 0 ? (stats.revenue / totalRevenue * 100) : 0;
      const avgPrice = stats.qty > 0 ? stats.revenue / stats.qty : 0;
      row.values = [
        idx + 1,
        catName,
        subName,
        stats.qty,
        round2(toRupees(stats.revenue)),
        round2(toRupees(avgPrice)),
        round2(revShare),
      ];
      styleDataRow(row, SUB_COLS, idx % 2 === 1, {
        currencyCols: [5, 6],
        percentCols: [7],
        centerCols: [1, 4],
      });
      subRowNum++;
    });

    // Subcategory totals
    const subTotalsRow = subSheet.getRow(subRowNum);
    subTotalsRow.values = [
      '', '', 'TOTAL',
      totalQuantity,
      round2(toRupees(totalRevenue)),
      totalQuantity > 0 ? round2(toRupees(totalRevenue / totalQuantity)) : 0,
      100,
    ];
    styleTotalsRow(subTotalsRow, SUB_COLS, {
      currencyCols: [5, 6],
      percentCols: [7],
      centerCols: [4],
    });
    subTotalsRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

    // Apply sheet setup
    applySheetSetup(sheet);
    applySheetSetup(catSheet);
    applySheetSetup(subSheet);

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

    // 2. Delivery data from Petpooja uploads
    const deliveryUploads = await dbInstance.select()
      .from(deliverySalesUploads)
      .where(and(
        sql`DATE(${deliverySalesUploads.periodStart}) >= ${startDate}`,
        sql`DATE(${deliverySalesUploads.periodEnd}) <= DATE_ADD(${endDate}, INTERVAL 1 DAY)`
      ));

    // Aggregate delivery channel data
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
    if (webOrders > 0) channels.push({ name: 'Website / Direct', orders: webOrders, revenue: webRevenue });
    if (zomatoOrders > 0) channels.push({ name: 'Zomato', orders: zomatoOrders, revenue: zomatoAmount });
    if (swiggyOrders > 0) channels.push({ name: 'Swiggy', orders: swiggyOrders, revenue: swiggyAmount });
    if (dineInOrders > 0) channels.push({ name: 'Dine-in', orders: dineInOrders, revenue: dineInAmount });

    channels.sort((a, b) => b.revenue - a.revenue);
    const totalOrders = channels.reduce((s, c) => s + c.orders, 0);
    const totalRevenue = channels.reduce((s, c) => s + c.revenue, 0);

    // Build workbook
    const workbook = createWorkbook();

    // ===== Sheet 1: Channel Summary =====
    const sheet = workbook.addWorksheet('Channel Summary');
    const COL_COUNT = 6;
    addTitleBlock(sheet, 'Taiwan Maami — Channel Sales Report', `Period: ${formatDate(startDate)} to ${formatDate(endDate)}  ·  ${channels.length} channels  ·  ${totalOrders} orders`, COL_COUNT);

    const headers = ['S.No', 'Channel', 'Orders', 'Revenue', 'Avg Order Value', '% of Revenue'];
    const headerRow = sheet.getRow(4);
    headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
    styleHeaderRow(headerRow, COL_COUNT);

    setColumnWidths(sheet, [
      [1, 6], [2, 24], [3, 12], [4, 18], [5, 18], [6, 14],
    ]);

    let rowNum = 5;
    channels.forEach((ch, idx) => {
      const row = sheet.getRow(rowNum);
      const aov = ch.orders > 0 ? ch.revenue / ch.orders : 0;
      const revShare = totalRevenue > 0 ? (ch.revenue / totalRevenue * 100) : 0;

      row.values = [
        idx + 1,
        ch.name,
        ch.orders,
        round2(toRupees(ch.revenue)),
        round2(toRupees(aov)),
        round2(revShare),
      ];

      styleDataRow(row, COL_COUNT, idx % 2 === 1, {
        currencyCols: [4, 5],
        percentCols: [6],
        centerCols: [1, 3],
      });
      rowNum++;
    });

    // Totals row
    const totalsRow = sheet.getRow(rowNum);
    totalsRow.values = [
      '', 'TOTAL',
      totalOrders,
      round2(toRupees(totalRevenue)),
      totalOrders > 0 ? round2(toRupees(totalRevenue / totalOrders)) : 0,
      100,
    ];
    styleTotalsRow(totalsRow, COL_COUNT, {
      currencyCols: [4, 5],
      percentCols: [6],
      centerCols: [3],
    });
    totalsRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

    // ===== Sheet 2: Daily Channel Breakdown =====
    const dailySheet = workbook.addWorksheet('Daily Breakdown');
    const channelNames = channels.map(c => c.name);
    const dailyColCount = 3 + channelNames.length * 2;
    addTitleBlock(dailySheet, 'Taiwan Maami — Daily Channel Breakdown', `Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, dailyColCount);

    // Build daily data
    const dailyWebsite = await dbInstance.execute(
      sql`SELECT DATE(${orders.createdAt}) as order_date, COUNT(*) as order_count, SUM(${orders.totalAmount}) as total_revenue FROM ${orders} WHERE ${orders.createdAt} >= ${startDate} AND ${orders.createdAt} <= ${endDate + ' 23:59:59'} AND ${orders.orderStatus} != 'cancelled' GROUP BY 1 ORDER BY 1`
    ) as any;

    const allDates = new Set<string>();
    const dailyRows = (Array.isArray(dailyWebsite) ? (dailyWebsite[0] || dailyWebsite) : dailyWebsite) as any[];
    dailyRows.forEach((d: any) => allDates.add(String(d.order_date)));
    const sortedDates = Array.from(allDates).sort();

    const dailyMap: Record<string, Record<string, { orders: number; revenue: number }>> = {};
    for (const date of sortedDates) dailyMap[date] = {};
    dailyRows.forEach((d: any) => {
      dailyMap[String(d.order_date)]['Website / Direct'] = { orders: Number(d.order_count), revenue: Number(d.total_revenue) };
    });

    const dailyHeaders = ['S.No', 'Date', ...channelNames.flatMap(n => [`${n} Orders`, `${n} Revenue`]), 'Total Orders', 'Total Revenue'];
    const dailyHeaderRow = dailySheet.getRow(4);
    dailyHeaders.forEach((h, i) => { dailyHeaderRow.getCell(i + 1).value = h; });
    styleHeaderRow(dailyHeaderRow, dailyColCount);

    // Set column widths
    const dailyWidths: [number, number][] = [[1, 6], [2, 14]];
    for (let i = 0; i < channelNames.length; i++) {
      dailyWidths.push([3 + i * 2, 14]);
      dailyWidths.push([4 + i * 2, 16]);
    }
    dailyWidths.push([dailyColCount - 1, 14]);
    dailyWidths.push([dailyColCount, 18]);
    setColumnWidths(dailySheet, dailyWidths);

    // Revenue columns for formatting
    const revCols: number[] = [];
    for (let i = 0; i < channelNames.length; i++) revCols.push(4 + i * 2);
    revCols.push(dailyColCount);
    const orderCols: number[] = [1];
    for (let i = 0; i < channelNames.length; i++) orderCols.push(3 + i * 2);
    orderCols.push(dailyColCount - 1);

    let dailyRowNum = 5;
    sortedDates.forEach((date, idx) => {
      const row = dailySheet.getRow(dailyRowNum);
      const vals: (string | number)[] = [idx + 1, date];
      let dayOrders = 0, dayRevenue = 0;
      for (const chName of channelNames) {
        const chData = dailyMap[date]?.[chName];
        vals.push(chData?.orders || 0);
        vals.push(chData ? round2(toRupees(chData.revenue)) : 0);
        dayOrders += chData?.orders || 0;
        dayRevenue += chData?.revenue || 0;
      }
      vals.push(dayOrders);
      vals.push(round2(toRupees(dayRevenue)));
      row.values = vals;

      styleDataRow(row, dailyColCount, idx % 2 === 1, {
        currencyCols: revCols,
        centerCols: orderCols,
      });
      dailyRowNum++;
    });

    // Daily totals
    const dailyTotalsRow = dailySheet.getRow(dailyRowNum);
    const totalVals: (string | number)[] = ['', 'TOTAL'];
    for (const chName of channelNames) {
      const ch = channels.find(c => c.name === chName);
      totalVals.push(ch?.orders || 0);
      totalVals.push(round2(toRupees(ch?.revenue || 0)));
    }
    totalVals.push(totalOrders);
    totalVals.push(round2(toRupees(totalRevenue)));
    dailyTotalsRow.values = totalVals;
    styleTotalsRow(dailyTotalsRow, dailyColCount, {
      currencyCols: revCols,
      centerCols: orderCols,
    });
    dailyTotalsRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

    // Apply sheet setup
    applySheetSetup(sheet);
    applySheetSetup(dailySheet);

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

    const workbook = createWorkbook();

    // ---- Sheet 1: All Registrations ----
    const sheet = workbook.addWorksheet('Registrations');
    const COL_COUNT = 9;
    addTitleBlock(sheet, 'Taiwan Maami — The Leela Hyderabad', 'Edible Journey · 5–8 March 2026 · Guest Registrations', COL_COUNT);

    const headerRow = sheet.getRow(4);
    headerRow.values = ['#', 'Customer Name', 'Email', 'Phone', 'Event Type', 'Date', 'No. of Guests', 'Status', 'Notes'];
    styleHeaderRow(headerRow, COL_COUNT);

    setColumnWidths(sheet, [
      [1, 5], [2, 25], [3, 32], [4, 18], [5, 16],
      [6, 14], [7, 14], [8, 14], [9, 30],
    ]);

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
      styleDataRow(row, COL_COUNT, idx % 2 === 1, {
        centerCols: [1, 5, 6, 7, 8],
      });
      // Wrap notes column
      row.getCell(9).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      totalGuests += reg.numberOfGuests;
      rowNum++;
    });

    // Totals row
    const totalsRow = sheet.getRow(rowNum);
    totalsRow.values = ['', 'TOTAL', '', '', '', '', totalGuests, `${registrations.length} registrations`, ''];
    styleTotalsRow(totalsRow, COL_COUNT, { centerCols: [7, 8] });
    totalsRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

    // ---- Sheet 2: Summary by Date ----
    const summarySheet = workbook.addWorksheet('Summary by Date');
    const SUMMARY_COLS = 5;
    addTitleBlock(summarySheet, 'Taiwan Maami — The Leela Hyderabad', 'Registration Summary by Date', SUMMARY_COLS);

    const summaryHeaderRow = summarySheet.getRow(4);
    summaryHeaderRow.values = ['Date', 'Event Type', 'Registrations', 'Total Guests', 'Confirmed'];
    styleHeaderRow(summaryHeaderRow, SUMMARY_COLS);

    setColumnWidths(summarySheet, [
      [1, 16], [2, 16], [3, 16], [4, 16], [5, 16],
    ]);

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
    const sortedRegDates = Object.keys(dateMap).sort();
    let grandTotalRegs = 0, grandTotalGuests = 0, grandTotalConfirmed = 0;

    sortedRegDates.forEach((date, dateIdx) => {
      const d = dateMap[date];
      const types: Array<{ label: string; data: { count: number; guests: number; confirmed: number } }> = [];
      if (d.dinner.count > 0) types.push({ label: 'Dinner', data: d.dinner });
      if (d.masterclass.count > 0) types.push({ label: 'Master Class', data: d.masterclass });

      types.forEach((t, tIdx) => {
        const row = summarySheet.getRow(summaryRowNum);
        row.values = [date, t.label, t.data.count, t.data.guests, t.data.confirmed];
        styleDataRow(row, SUMMARY_COLS, (dateIdx + tIdx) % 2 === 1, {
          centerCols: [1, 2, 3, 4, 5],
        });
        grandTotalRegs += t.data.count;
        grandTotalGuests += t.data.guests;
        grandTotalConfirmed += t.data.confirmed;
        summaryRowNum++;
      });
    });

    const summaryTotalsRow = summarySheet.getRow(summaryRowNum);
    summaryTotalsRow.values = ['TOTAL', '', grandTotalRegs, grandTotalGuests, grandTotalConfirmed];
    styleTotalsRow(summaryTotalsRow, SUMMARY_COLS, { centerCols: [3, 4, 5] });
    summaryTotalsRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

    // Apply sheet setup
    applySheetSetup(sheet);
    applySheetSetup(summarySheet);

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


// ============================================================
// CUSTOMER DATABASE EXPORT
// ============================================================
export async function handleCustomerDatabaseExport(req: Request, res: Response) {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  const dbInstance = await getDb();
  if (!dbInstance) {
    return res.status(500).json({ error: 'Database not available' });
  }

  try {
    const { users, orders, loyaltyRewards } = await import('../drizzle/schema');

    // Get all customers (exclude staff/admin)
    const allCustomers = await dbInstance
      .select()
      .from(users)
      .where(eq(users.role, 'customer'))
      .orderBy(desc(users.createdAt));

    // Get order stats per customer
    const orderStats = await dbInstance
      .select({
        userId: orders.userId,
        orderCount: sql<number>`COUNT(*)`.as('order_count'),
        totalSpent: sql<number>`SUM(${orders.totalAmount})`.as('total_spent'),
        lastOrderDate: sql<string>`MAX(${orders.createdAt})`.as('last_order_date'),
      })
      .from(orders)
      .where(sql`${orders.orderStatus} != 'cancelled'`)
      .groupBy(orders.userId);

    const orderMap = new Map(orderStats.map(o => [o.userId, o]));

    // Get reward counts per customer
    const rewardCounts = await dbInstance
      .select({
        userId: loyaltyRewards.userId,
        unredeemedCount: sql<number>`SUM(CASE WHEN ${loyaltyRewards.isRedeemed} = 0 AND ${loyaltyRewards.expiresAt} > NOW() THEN 1 ELSE 0 END)`.as('unredeemed'),
        redeemedCount: sql<number>`SUM(CASE WHEN ${loyaltyRewards.isRedeemed} = 1 THEN 1 ELSE 0 END)`.as('redeemed'),
        totalRewards: sql<number>`COUNT(*)`.as('total_rewards'),
      })
      .from(loyaltyRewards)
      .groupBy(loyaltyRewards.userId);

    const rewardMap = new Map(rewardCounts.map(r => [r.userId, r]));

    // Build workbook
    const workbook = createWorkbook();
    const exportDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    // ===== Sheet 1: Customer Database =====
    const sheet = workbook.addWorksheet('Customer Database');
    const COL_COUNT = 14;
    addTitleBlock(sheet, 'Taiwan Maami — Customer Database', `Exported on ${exportDate}  ·  ${allCustomers.length} customers`, COL_COUNT);

    const headers = [
      'S.No', 'Customer Name', 'Phone', 'Email', 'Type',
      'Orders', 'Total Spent', 'Avg Order Value', 'Store Credit',
      'Stamps', 'Lifetime Stamps', 'Active Rewards', 'Redeemed Rewards',
      'Last Order'
    ];
    const headerRow = sheet.getRow(4);
    headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
    styleHeaderRow(headerRow, COL_COUNT);

    setColumnWidths(sheet, [
      [1, 6], [2, 25], [3, 16], [4, 30], [5, 12],
      [6, 10], [7, 18], [8, 18], [9, 16],
      [10, 10], [11, 16], [12, 16], [13, 18], [14, 16],
    ]);

    let rowNum = 5;
    let totalOrderCount = 0, totalRevenueSum = 0, totalStoreCreditSum = 0;

    allCustomers.forEach((customer, idx) => {
      const stats = orderMap.get(customer.id);
      const rewards = rewardMap.get(customer.id);
      const orderCount = stats ? Number(stats.orderCount) : 0;
      const totalSpent = stats ? Number(stats.totalSpent) : 0;
      const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
      const lastOrder = stats?.lastOrderDate
        ? new Date(stats.lastOrderDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '—';

      const customerType = customer.phone ? 'Registered' : (customer.email ? 'Email Only' : 'Guest');

      totalOrderCount += orderCount;
      totalRevenueSum += totalSpent;
      totalStoreCreditSum += customer.storeCredit;

      const row = sheet.getRow(rowNum);
      row.values = [
        idx + 1,
        customer.name || 'Unknown',
        customer.phone || '—',
        customer.email || '—',
        customerType,
        orderCount,
        round2(toRupees(totalSpent)),
        round2(toRupees(avgOrderValue)),
        round2(toRupees(customer.storeCredit)),
        `${customer.stampCount}/10`,
        customer.lifetimeStamps,
        rewards ? Number(rewards.unredeemedCount) : 0,
        rewards ? Number(rewards.redeemedCount) : 0,
        lastOrder,
      ];

      styleDataRow(row, COL_COUNT, idx % 2 === 1, {
        currencyCols: [7, 8, 9],
        centerCols: [1, 5, 6, 10, 11, 12, 13, 14],
      });
      rowNum++;
    });

    // Totals row
    const totalsRow = sheet.getRow(rowNum);
    totalsRow.values = [
      '', `TOTAL (${allCustomers.length} customers)`, '', '', '',
      totalOrderCount,
      round2(toRupees(totalRevenueSum)),
      totalOrderCount > 0 ? round2(toRupees(totalRevenueSum / totalOrderCount)) : 0,
      round2(toRupees(totalStoreCreditSum)),
      '', '', '', '', '',
    ];
    styleTotalsRow(totalsRow, COL_COUNT, {
      currencyCols: [7, 8, 9],
      centerCols: [6],
    });
    totalsRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

    // ===== Sheet 2: Top Customers =====
    const topSheet = workbook.addWorksheet('Top Customers');
    const TOP_COLS = 8;
    addTitleBlock(topSheet, 'Taiwan Maami — Top Customers by Spending', `Top 30 customers  ·  ${exportDate}`, TOP_COLS);

    const topHeaders = ['Rank', 'Customer Name', 'Phone', 'Email', 'Orders', 'Total Spent', 'Avg Order', 'Stamps'];
    const topHeaderRow = topSheet.getRow(4);
    topHeaders.forEach((h, i) => { topHeaderRow.getCell(i + 1).value = h; });
    styleHeaderRow(topHeaderRow, TOP_COLS);

    setColumnWidths(topSheet, [
      [1, 8], [2, 25], [3, 16], [4, 30], [5, 10], [6, 18], [7, 16], [8, 10],
    ]);

    const sortedCustomers = allCustomers
      .map(c => {
        const stats = orderMap.get(c.id);
        return {
          ...c,
          orderCount: stats ? Number(stats.orderCount) : 0,
          totalSpent: stats ? Number(stats.totalSpent) : 0,
        };
      })
      .filter(c => c.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 30);

    let topRowNum = 5;
    sortedCustomers.forEach((customer, idx) => {
      const avgOrder = customer.orderCount > 0 ? customer.totalSpent / customer.orderCount : 0;
      const row = topSheet.getRow(topRowNum);
      row.values = [
        idx + 1,
        customer.name || 'Unknown',
        customer.phone || '—',
        customer.email || '—',
        customer.orderCount,
        round2(toRupees(customer.totalSpent)),
        round2(toRupees(avgOrder)),
        `${customer.stampCount}/10`,
      ];
      styleDataRow(row, TOP_COLS, idx % 2 === 1, {
        currencyCols: [6, 7],
        centerCols: [1, 5, 8],
      });
      topRowNum++;
    });

    // ===== Sheet 3: Birthday Calendar =====
    const bdaySheet = workbook.addWorksheet('Birthday Calendar');
    const BDAY_COLS = 6;
    addTitleBlock(bdaySheet, 'Taiwan Maami — Customer Birthday Calendar', `Customers with birthdays on file  ·  ${exportDate}`, BDAY_COLS);

    const bdayHeaders = ['Month', 'Day', 'Customer Name', 'Phone', 'Email', 'Birthday Gift Used'];
    const bdayHeaderRow = bdaySheet.getRow(4);
    bdayHeaders.forEach((h, i) => { bdayHeaderRow.getCell(i + 1).value = h; });
    styleHeaderRow(bdayHeaderRow, BDAY_COLS);

    setColumnWidths(bdaySheet, [
      [1, 14], [2, 8], [3, 25], [4, 16], [5, 30], [6, 20],
    ]);

    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const birthdayCustomers = allCustomers
      .filter(c => c.birthMonth && c.birthDay)
      .sort((a, b) => (a.birthMonth! - b.birthMonth!) || (a.birthDay! - b.birthDay!));

    let bdayRowNum = 5;
    birthdayCustomers.forEach((customer, idx) => {
      const row = bdaySheet.getRow(bdayRowNum);
      const currentYear = new Date().getFullYear();
      const giftUsed = customer.birthdayCodeUsedYear === currentYear ? `Yes (${currentYear})` : 'No';
      row.values = [
        monthNames[customer.birthMonth!],
        customer.birthDay,
        customer.name || 'Unknown',
        customer.phone || '—',
        customer.email || '—',
        giftUsed,
      ];
      styleDataRow(row, BDAY_COLS, idx % 2 === 1, {
        centerCols: [1, 2, 6],
      });
      bdayRowNum++;
    });

    // Apply sheet setup
    applySheetSetup(sheet);
    applySheetSetup(topSheet);
    applySheetSetup(bdaySheet);

    // Generate and send
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Taiwan_Maami_Customer_Database_${exportDate.replace(/ /g, '_')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', (buffer as any).length);
    res.send(Buffer.from(buffer as ArrayBuffer));

  } catch (error) {
    console.error('Customer database export error:', error);
    res.status(500).json({ error: 'Failed to generate customer database report', details: String(error) });
  }
}
