import { getDb } from "./db";
import { orders, orderItems, products, subcategories, categories, deliveryItemSales, deliverySalesUploads } from "../drizzle/schema";
import { eq, and, gte, lte, sql, ne } from "drizzle-orm";

// Day of week names (MySQL DAYOFWEEK: 1=Sunday, 2=Monday, ..., 7=Saturday)
const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Food category ID (website)
const FOOD_CATEGORY_ID = 4;

// Delivery categories that map to food items
const DELIVERY_FOOD_CATEGORIES = [
  'Noodles', 'Rice', 'Omelete', 'Savoury Pillow Brioche',
  'Cong You Bing', 'ChickGozilla'
];

/**
 * Monthly Revenue Projection
 * Uses weighted daily averages with day-of-week patterns to project full month revenue
 */
export async function getMonthlyProjection(year: number, month: number) {
  const db = await getDb();
  if (!db) return null;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = monthEnd.getDate();

  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const daysElapsed = isCurrentMonth ? Math.min(currentDay, daysInMonth) : daysInMonth;

  // Get daily revenue for the elapsed period
  const dailyRevenue = await db.select({
    orderDate: sql<string>`DATE(${orders.createdAt})`,
    dayOfWeek: sql<number>`DAYOFWEEK(${orders.createdAt})`,
    revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
    orderCount: sql<number>`COUNT(DISTINCT ${orders.id})`,
  })
  .from(orders)
  .where(and(
    gte(orders.createdAt, monthStart),
    lte(orders.createdAt, isCurrentMonth ? today : monthEnd),
    ne(orders.orderStatus, "cancelled"),
    eq(orders.isTestData, false),
  ))
  .groupBy(sql`DATE(${orders.createdAt})`, sql`DAYOFWEEK(${orders.createdAt})`)
  .orderBy(sql`DATE(${orders.createdAt})`);

  // Calculate actual totals
  let actualRevenue = 0;
  let actualOrders = 0;
  for (const d of dailyRevenue) {
    actualRevenue += Number(d.revenue) || 0;
    actualOrders += Number(d.orderCount) || 0;
  }
  const actualDays = dailyRevenue.length;

  // Day-of-week averages — use actual days with orders, not calendar days
  const dowRevenue: Record<number, { total: number; count: number }> = {};
  const dowOrders: Record<number, { total: number; count: number }> = {};
  for (let i = 1; i <= 7; i++) {
    dowRevenue[i] = { total: 0, count: 0 };
    dowOrders[i] = { total: 0, count: 0 };
  }

  for (const day of dailyRevenue) {
    const dow = Number(day.dayOfWeek);
    const rev = Number(day.revenue) || 0;
    const ords = Number(day.orderCount) || 0;
    dowRevenue[dow].total += rev;
    dowRevenue[dow].count += 1;
    dowOrders[dow].total += ords;
    dowOrders[dow].count += 1;
  }

  const overallDailyAvg = actualDays > 0 ? actualRevenue / actualDays : 0;
  const overallDailyOrders = actualDays > 0 ? actualOrders / actualDays : 0;

  // Project remaining days
  let projectedRemaining = 0;
  let projectedRemainingOrders = 0;

  if (isCurrentMonth) {
    for (let d = currentDay + 1; d <= daysInMonth; d++) {
      const futureDate = new Date(year, month - 1, d);
      const dow = futureDate.getDay() + 1; // JS 0=Sun → MySQL 1=Sun

      const dowAvg = dowRevenue[dow].count > 0
        ? dowRevenue[dow].total / dowRevenue[dow].count
        : overallDailyAvg;
      projectedRemaining += dowAvg;

      const dowOrdAvg = dowOrders[dow].count > 0
        ? dowOrders[dow].total / dowOrders[dow].count
        : overallDailyOrders;
      projectedRemainingOrders += dowOrdAvg;
    }
  }

  const projectedTotal = actualRevenue + projectedRemaining;
  const projectedOrdersTotal = actualOrders + projectedRemainingOrders;

  // Confidence range
  const revenues = dailyRevenue.map((d: typeof dailyRevenue[number]) => Number(d.revenue) || 0);
  const mean = revenues.length > 0 ? revenues.reduce((a: number, b: number) => a + b, 0) / revenues.length : 0;
  const variance = revenues.length > 1
    ? revenues.reduce((sum: number, r: number) => sum + Math.pow(r - mean, 2), 0) / (revenues.length - 1)
    : 0;
  const stdDev = Math.sqrt(variance);
  const remainingDaysCount = daysInMonth - daysElapsed;
  const confidenceMargin = stdDev * Math.sqrt(remainingDaysCount) * 1.5;

  // Day-of-week breakdown
  const dowBreakdown = DOW_NAMES.map((_name: string, i: number) => {
    const dow = i + 1;
    return {
      day: DOW_SHORT[i],
      dayFull: _name,
      avgRevenue: dowRevenue[dow].count > 0 ? Math.round(dowRevenue[dow].total / dowRevenue[dow].count) : 0,
      avgOrders: dowOrders[dow].count > 0 ? Math.round((dowOrders[dow].total / dowOrders[dow].count) * 10) / 10 : 0,
      dataPoints: dowRevenue[dow].count,
    };
  });

  // Previous month comparison
  const prevMonthStart = new Date(year, month - 2, 1);
  const prevMonthEnd = new Date(year, month - 1, 0);
  const [prevMonthData] = await db.select({
    revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
    orderCount: sql<number>`COUNT(DISTINCT ${orders.id})`,
  })
  .from(orders)
  .where(and(
    gte(orders.createdAt, prevMonthStart),
    lte(orders.createdAt, prevMonthEnd),
    ne(orders.orderStatus, "cancelled"),
    eq(orders.isTestData, false),
  ));

  return {
    month: monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    daysElapsed,
    daysInMonth,
    daysRemaining: daysInMonth - daysElapsed,
    isCurrentMonth,
    actualRevenue,
    actualOrders,
    actualDailyAvg: Math.round(overallDailyAvg),
    projectedTotal: Math.round(projectedTotal),
    projectedOrders: Math.round(projectedOrdersTotal),
    projectedAOV: projectedOrdersTotal > 0 ? Math.round(projectedTotal / projectedOrdersTotal) : 0,
    optimistic: Math.round(projectedTotal + confidenceMargin),
    pessimistic: Math.round(Math.max(actualRevenue, projectedTotal - confidenceMargin)),
    confidenceMargin: Math.round(confidenceMargin),
    prevMonthRevenue: Number(prevMonthData?.revenue) || 0,
    prevMonthOrders: Number(prevMonthData?.orderCount) || 0,
    dowBreakdown,
    dailyData: dailyRevenue.map((d: typeof dailyRevenue[number]) => ({
      date: d.orderDate,
      revenue: Number(d.revenue) || 0,
      orders: Number(d.orderCount) || 0,
    })),
  };
}

/**
 * Item-Level Day-of-Week Demand Forecast (Food items only)
 * Combines website orders + delivery channel data (Petpooja)
 * Uses actual days with sales for DOW averages (not calendar days)
 */
export async function getItemDemandForecast(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return null;

  const start = startDate || new Date(2026, 0, 1);
  const end = endDate || new Date();

  // ========== 1. Website food item sales by day of week ==========
  const websiteFoodSales = await db.select({
    productName: orderItems.productName,
    dayOfWeek: sql<number>`DAYOFWEEK(${orders.createdAt})`,
    totalQty: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
    totalRevenue: sql<number>`COALESCE(SUM(${orderItems.lineTotal}), 0)`,
    daysWithSales: sql<number>`COUNT(DISTINCT DATE(${orders.createdAt}))`,
  })
  .from(orderItems)
  .innerJoin(orders, eq(orderItems.orderId, orders.id))
  .innerJoin(products, eq(orderItems.productId, products.id))
  .innerJoin(subcategories, eq(products.subcategoryId, subcategories.id))
  .where(and(
    eq(subcategories.categoryId, FOOD_CATEGORY_ID),
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
    ne(orders.orderStatus, "cancelled"),
    eq(orderItems.status, "active"),
    eq(orders.isTestData, false),
  ))
  .groupBy(orderItems.productName, sql`DAYOFWEEK(${orders.createdAt})`);

  // ========== 2. Delivery channel food item sales (aggregated by period) ==========
  // Delivery data doesn't have daily granularity, so we distribute evenly across
  // the period's days for each item, but we know the total per period
  const deliveryFoodSales = await db.select({
    itemName: deliveryItemSales.itemName,
    totalQty: sql<number>`COALESCE(SUM(${deliveryItemSales.quantity}), 0)`,
    totalAmount: sql<number>`COALESCE(SUM(${deliveryItemSales.amount}), 0)`,
    periodStart: deliveryItemSales.periodStart,
    periodEnd: deliveryItemSales.periodEnd,
  })
  .from(deliveryItemSales)
  .innerJoin(deliverySalesUploads, eq(deliveryItemSales.uploadId, deliverySalesUploads.id))
  .where(and(
    sql`${deliveryItemSales.category} IN ('Noodles', 'Rice', 'Omelete', 'Savoury Pillow Brioche', 'Cong You Bing', 'ChickGozilla')`,
    gte(deliveryItemSales.periodStart, start),
    lte(deliveryItemSales.periodEnd, end),
  ))
  .groupBy(deliveryItemSales.itemName, deliveryItemSales.periodStart, deliveryItemSales.periodEnd);

  // ========== 3. Count actual operating days per DOW from website orders ==========
  // Use raw SQL to avoid only_full_group_by incompatibility with Drizzle's column quoting
  const operatingDaysResult = await db.execute(
    sql`SELECT DAYOFWEEK(${orders.createdAt}) as dayOfWeek, COUNT(DISTINCT DATE(${orders.createdAt})) as dayCount FROM ${orders} WHERE ${orders.createdAt} >= ${start} AND ${orders.createdAt} <= ${end} AND ${orders.orderStatus} <> 'cancelled' AND ${orders.isTestData} = false GROUP BY 1`
  );
  // db.execute returns [rows, fields] tuple
  const operatingDaysByDow = (Array.isArray(operatingDaysResult[0]) ? operatingDaysResult[0] : operatingDaysResult) as { dayOfWeek: number; dayCount: number }[];

  const operatingDowCounts: Record<number, number> = {};
  let totalOperatingDays = 0;
  for (const row of operatingDaysByDow) {
    const dow = Number(row.dayOfWeek);
    const count = Number(row.dayCount) || 0;
    operatingDowCounts[dow] = count;
    totalOperatingDays += count;
  }

  // Also count calendar days for reference
  const calendarDowCounts: Record<number, number> = {};
  const current = new Date(start);
  while (current <= end) {
    const dow = current.getDay() + 1;
    calendarDowCounts[dow] = (calendarDowCounts[dow] || 0) + 1;
    current.setDate(current.getDate() + 1);
  }

  // ========== 4. Build item × day-of-week matrix ==========
  const itemMap: Record<string, {
    totalQty: number;
    totalRevenue: number;
    websiteQty: number;
    deliveryQty: number;
    dow: Record<number, { qty: number; revenue: number; daysWithSales: number }>;
  }> = {};

  // Add website sales (has DOW granularity)
  for (const row of websiteFoodSales) {
    const name = row.productName;
    if (!itemMap[name]) {
      itemMap[name] = { totalQty: 0, totalRevenue: 0, websiteQty: 0, deliveryQty: 0, dow: {} };
    }
    const qty = Number(row.totalQty) || 0;
    const rev = Number(row.totalRevenue) || 0;
    const daysWithSales = Number(row.daysWithSales) || 0;
    itemMap[name].totalQty += qty;
    itemMap[name].totalRevenue += rev;
    itemMap[name].websiteQty += qty;
    itemMap[name].dow[Number(row.dayOfWeek)] = { qty, revenue: rev, daysWithSales };
  }

  // Add delivery sales (distributed proportionally across DOWs based on calendar days)
  for (const row of deliveryFoodSales) {
    const name = row.itemName;
    if (!itemMap[name]) {
      itemMap[name] = { totalQty: 0, totalRevenue: 0, websiteQty: 0, deliveryQty: 0, dow: {} };
    }
    const qty = Number(row.totalQty) || 0;
    const amt = Number(row.totalAmount) || 0;
    itemMap[name].totalQty += qty;
    itemMap[name].totalRevenue += amt;
    itemMap[name].deliveryQty += qty;

    // Distribute delivery qty proportionally across DOWs in the period
    const pStart = new Date(row.periodStart);
    const pEnd = new Date(row.periodEnd);
    const periodDowCounts: Record<number, number> = {};
    let periodTotalDays = 0;
    const d = new Date(pStart);
    while (d <= pEnd) {
      const dow = d.getDay() + 1;
      periodDowCounts[dow] = (periodDowCounts[dow] || 0) + 1;
      periodTotalDays++;
      d.setDate(d.getDate() + 1);
    }

    // Distribute qty evenly across days in the period
    if (periodTotalDays > 0) {
      for (const [dowStr, dayCount] of Object.entries(periodDowCounts)) {
        const dow = Number(dowStr);
        const proportionalQty = (qty * dayCount) / periodTotalDays;
        const proportionalAmt = (amt * dayCount) / periodTotalDays;
        if (!itemMap[name].dow[dow]) {
          itemMap[name].dow[dow] = { qty: 0, revenue: 0, daysWithSales: 0 };
        }
        itemMap[name].dow[dow].qty += proportionalQty;
        itemMap[name].dow[dow].revenue += proportionalAmt;
        // For delivery, assume all days in period had sales
        itemMap[name].dow[dow].daysWithSales = Math.max(
          itemMap[name].dow[dow].daysWithSales,
          dayCount
        );
      }
    }
  }

  // ========== 5. Convert to array with daily averages (with estimated baselines) ==========
  const items = Object.entries(itemMap)
    .map(([name, data]) => {
      // Calculate overall daily avg for minimum baseline
      const overallDailyAvg = totalOperatingDays > 0 ? data.totalQty / totalOperatingDays : 0;
      const minBaseline = Math.round(overallDailyAvg * 0.3 * 10) / 10;

      const dowAvg = DOW_NAMES.map((_: string, i: number) => {
        const dow = i + 1;
        const rawQty = data.dow[dow]?.qty || 0;
        // Use actual days with sales for the average, not calendar days
        const daysWithSales = data.dow[dow]?.daysWithSales || 0;
        // Fall back to operating days if we have them, then calendar days
        const divisor = daysWithSales > 0 ? daysWithSales : (operatingDowCounts[dow] || calendarDowCounts[dow] || 1);
        const computedAvg = Math.round((rawQty / divisor) * 10) / 10;

        // Apply minimum baseline for sparse items: if an item has >=5 total sales
        // but zero on a specific DOW, show a small estimated baseline instead of 0
        const isEstimated = computedAvg === 0 && data.totalQty >= 5 && minBaseline > 0;
        const avgQty = isEstimated ? minBaseline : computedAvg;

        return {
          day: DOW_SHORT[i],
          avgQty,
          totalQty: Math.round(rawQty * 10) / 10,
          isEstimated,
        };
      });

      // Daily avg uses total operating days, not calendar days
      const dailyAvg = totalOperatingDays > 0 ? data.totalQty / totalOperatingDays : 0;
      const peakDay = dowAvg.reduce((max, d) => d.avgQty > max.avgQty ? d : max, dowAvg[0]);
      const hasEstimates = dowAvg.some(d => d.isEstimated);

      // Calculate variance for reliability indicator
      const avgValues = dowAvg.map((d) => d.avgQty);
      const avgMean = avgValues.reduce((a: number, b: number) => a + b, 0) / avgValues.length;
      const avgVariance = avgValues.reduce((sum: number, v: number) => sum + Math.pow(v - avgMean, 2), 0) / avgValues.length;
      const coefficient = avgMean > 0 ? Math.sqrt(avgVariance) / avgMean : 0;
      const reliability: "high" | "medium" | "low" = coefficient < 0.5 ? "high" : coefficient < 1 ? "medium" : "low";

      return {
        productName: name,
        totalQty: Math.round(data.totalQty * 10) / 10,
        totalRevenue: data.totalRevenue,
        websiteQty: data.websiteQty,
        deliveryQty: Math.round(data.deliveryQty * 10) / 10,
        dailyAvg: Math.round(dailyAvg * 10) / 10,
        peakDay: peakDay.day,
        peakDayAvg: peakDay.avgQty,
        reliability,
        hasEstimates,
        dowBreakdown: dowAvg,
      };
    })
    .sort((a, b) => b.totalQty - a.totalQty);

  return {
    dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
    operatingDowCounts,
    calendarDowCounts: calendarDowCounts,
    totalOperatingDays,
    items,
    totalFoodItems: items.length,
  };
}

/**
 * Procurement Planner - Next 7 days expected demand per food item
 * Now accepts optional date range for training data
 */
export async function getProcurementForecast(startDate?: Date, endDate?: Date) {
  const forecast = await getItemDemandForecast(startDate, endDate);
  if (!forecast) return null;

  const today = new Date();
  const nextDays: { date: string; dayName: string; dow: number }[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dow = d.getDay(); // JS: 0=Sun → index into DOW arrays
    nextDays.push({
      date: d.toISOString().split('T')[0],
      dayName: DOW_NAMES[dow],
      dow,
    });
  }

  const procurement = forecast.items
    .filter((item) => item.totalQty >= 3)
    .map((item) => {
      const dailyForecast = nextDays.map((day) => {
        const dowData = item.dowBreakdown[day.dow];
        return {
          date: day.date,
          dayName: day.dayName,
          expectedQty: dowData?.avgQty || 0,
        };
      });

      const weekTotal = dailyForecast.reduce((sum: number, d) => sum + d.expectedQty, 0);

      return {
        productName: item.productName,
        weekTotal: Math.round(weekTotal * 10) / 10,
        dailyForecast,
        peakDay: item.peakDay,
        reliability: item.reliability,
      };
    })
    .sort((a, b) => b.weekTotal - a.weekTotal);

  return {
    generatedAt: new Date().toISOString(),
    dateRange: forecast.dateRange,
    nextDays,
    items: procurement,
  };
}

/**
 * Trend Detection - Compare recent 2 weeks vs previous 2 weeks
 * Now accepts optional date range for the "recent" period
 */
export async function getTrendAlerts(recentEnd?: Date) {
  const db = await getDb();
  if (!db) return null;

  const today = recentEnd || new Date();
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const fourWeeksAgo = new Date(today);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const recentSales = await db.select({
    productName: orderItems.productName,
    totalQty: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
    totalRevenue: sql<number>`COALESCE(SUM(${orderItems.lineTotal}), 0)`,
  })
  .from(orderItems)
  .innerJoin(orders, eq(orderItems.orderId, orders.id))
  .innerJoin(products, eq(orderItems.productId, products.id))
  .innerJoin(subcategories, eq(products.subcategoryId, subcategories.id))
  .where(and(
    eq(subcategories.categoryId, FOOD_CATEGORY_ID),
    gte(orders.createdAt, twoWeeksAgo),
    lte(orders.createdAt, today),
    ne(orders.orderStatus, "cancelled"),
    eq(orderItems.status, "active"),
    eq(orders.isTestData, false),
  ))
  .groupBy(orderItems.productName);

  const previousSales = await db.select({
    productName: orderItems.productName,
    totalQty: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
    totalRevenue: sql<number>`COALESCE(SUM(${orderItems.lineTotal}), 0)`,
  })
  .from(orderItems)
  .innerJoin(orders, eq(orderItems.orderId, orders.id))
  .innerJoin(products, eq(orderItems.productId, products.id))
  .innerJoin(subcategories, eq(products.subcategoryId, subcategories.id))
  .where(and(
    eq(subcategories.categoryId, FOOD_CATEGORY_ID),
    gte(orders.createdAt, fourWeeksAgo),
    lte(orders.createdAt, twoWeeksAgo),
    ne(orders.orderStatus, "cancelled"),
    eq(orderItems.status, "active"),
    eq(orders.isTestData, false),
  ))
  .groupBy(orderItems.productName);

  const prevMap: Record<string, { qty: number; revenue: number }> = {};
  for (const row of previousSales) {
    prevMap[row.productName] = { qty: Number(row.totalQty) || 0, revenue: Number(row.totalRevenue) || 0 };
  }

  const trends = recentSales.map((row: typeof recentSales[number]) => {
    const prev = prevMap[row.productName] || { qty: 0, revenue: 0 };
    const recentQty = Number(row.totalQty) || 0;
    const prevQty = prev.qty;

    const changePercent = prevQty > 0
      ? Math.round(((recentQty - prevQty) / prevQty) * 100)
      : recentQty > 0 ? 100 : 0;

    let trend: "rising" | "falling" | "stable" | "new" = "stable";
    if (prevQty === 0 && recentQty > 0) trend = "new";
    else if (changePercent >= 25) trend = "rising";
    else if (changePercent <= -25) trend = "falling";

    return {
      productName: row.productName,
      recentQty,
      previousQty: prevQty,
      changePercent,
      trend,
      recentRevenue: Number(row.totalRevenue) || 0,
      previousRevenue: prev.revenue,
    };
  }).sort((a: { changePercent: number }, b: { changePercent: number }) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

  // Items that disappeared
  const recentNames = new Set(recentSales.map((r: typeof recentSales[number]) => r.productName));
  const disappeared = previousSales
    .filter((r: typeof previousSales[number]) => !recentNames.has(r.productName) && (Number(r.totalQty) || 0) >= 2)
    .map((r: typeof previousSales[number]) => ({
      productName: r.productName,
      recentQty: 0,
      previousQty: Number(r.totalQty) || 0,
      changePercent: -100,
      trend: "falling" as const,
      recentRevenue: 0,
      previousRevenue: Number(r.totalRevenue) || 0,
    }));

  return {
    period: {
      recent: { start: twoWeeksAgo.toISOString().split('T')[0], end: today.toISOString().split('T')[0] },
      previous: { start: fourWeeksAgo.toISOString().split('T')[0], end: twoWeeksAgo.toISOString().split('T')[0] },
    },
    rising: trends.filter((t: { trend: string }) => t.trend === "rising"),
    falling: [...trends.filter((t: { trend: string }) => t.trend === "falling"), ...disappeared],
    stable: trends.filter((t: { trend: string }) => t.trend === "stable"),
    newItems: trends.filter((t: { trend: string }) => t.trend === "new"),
  };
}

/**
 * Forecast Accuracy - Compare actual vs what would have been projected
 */
export async function getForecastAccuracy(year: number, month: number) {
  const db = await getDb();
  if (!db) return null;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const today = new Date();
  const isComplete = today > monthEnd;

  const actualItems = await db.select({
    productName: orderItems.productName,
    totalQty: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
    totalRevenue: sql<number>`COALESCE(SUM(${orderItems.lineTotal}), 0)`,
  })
  .from(orderItems)
  .innerJoin(orders, eq(orderItems.orderId, orders.id))
  .innerJoin(products, eq(orderItems.productId, products.id))
  .innerJoin(subcategories, eq(products.subcategoryId, subcategories.id))
  .where(and(
    eq(subcategories.categoryId, FOOD_CATEGORY_ID),
    gte(orders.createdAt, monthStart),
    lte(orders.createdAt, isComplete ? monthEnd : today),
    ne(orders.orderStatus, "cancelled"),
    eq(orderItems.status, "active"),
    eq(orders.isTestData, false),
  ))
  .groupBy(orderItems.productName);

  const [actualTotals] = await db.select({
    revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
    orderCount: sql<number>`COUNT(DISTINCT ${orders.id})`,
  })
  .from(orders)
  .where(and(
    gte(orders.createdAt, monthStart),
    lte(orders.createdAt, isComplete ? monthEnd : today),
    ne(orders.orderStatus, "cancelled"),
    eq(orders.isTestData, false),
  ));

  return {
    month: monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    isComplete,
    actualRevenue: Number(actualTotals?.revenue) || 0,
    actualOrders: Number(actualTotals?.orderCount) || 0,
    actualItems: actualItems.map((i: typeof actualItems[number]) => ({
      productName: i.productName,
      qty: Number(i.totalQty) || 0,
      revenue: Number(i.totalRevenue) || 0,
    })).sort((a: { qty: number }, b: { qty: number }) => b.qty - a.qty),
  };
}


/**
 * Total Sales Forecast — ALL categories (drinks, food, desserts, delivery)
 * Combines website order data with delivery channel totals
 */
export async function getTotalSalesForecast(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return null;

  const start = startDate || new Date(2026, 0, 1);
  const end = endDate || new Date();

  // ========== 1. Website sales by DOW (all categories) ==========
  const websiteDowData = await db.select({
    dayOfWeek: sql<number>`DAYOFWEEK(${orders.createdAt})`,
    revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
    orderCount: sql<number>`COUNT(DISTINCT ${orders.id})`,
    itemCount: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
    daysWithOrders: sql<number>`COUNT(DISTINCT DATE(${orders.createdAt}))`,
  })
  .from(orders)
  .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
  .where(and(
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
    ne(orders.orderStatus, "cancelled"),
    eq(orders.isTestData, false),
    eq(orderItems.status, "active"),
  ))
  .groupBy(sql`DAYOFWEEK(${orders.createdAt})`);

  // ========== 2. Website category breakdown ==========
  const websiteCategoryData = await db.select({
    categoryName: sql<string>`COALESCE(cat.name, 'Unknown')`,
    revenue: sql<number>`COALESCE(SUM(${orderItems.lineTotal}), 0)`,
    itemCount: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
  })
  .from(orderItems)
  .innerJoin(orders, eq(orderItems.orderId, orders.id))
  .leftJoin(products, eq(orderItems.productId, products.id))
  .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))
  .leftJoin(sql`categories as cat`, sql`${subcategories.categoryId} = cat.id`)
  .where(and(
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
    ne(orders.orderStatus, "cancelled"),
    eq(orders.isTestData, false),
    eq(orderItems.status, "active"),
  ))
  .groupBy(sql`cat.name`);

  // ========== 3. Website totals ==========
  const [websiteTotals] = await db.select({
    revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
    orderCount: sql<number>`COUNT(DISTINCT ${orders.id})`,
  })
  .from(orders)
  .where(and(
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
    ne(orders.orderStatus, "cancelled"),
    eq(orders.isTestData, false),
  ));

  const websiteItemCount = await db.select({
    total: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
  })
  .from(orderItems)
  .innerJoin(orders, eq(orderItems.orderId, orders.id))
  .where(and(
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
    ne(orders.orderStatus, "cancelled"),
    eq(orders.isTestData, false),
    eq(orderItems.status, "active"),
  ));

  // ========== 4. Delivery totals from uploads ==========
  const deliveryTotals = await db.select({
    totalRevenue: sql<number>`COALESCE(SUM(${deliverySalesUploads.totalAmount}), 0)`,
    totalOrders: sql<number>`COALESCE(SUM(${deliverySalesUploads.totalOrders}), 0)`,
  })
  .from(deliverySalesUploads)
  .where(and(
    gte(deliverySalesUploads.periodStart, start),
    lte(deliverySalesUploads.periodEnd, end),
  ));

  // ========== 5. Count operating days ==========
  const operatingDaysResult = await db.execute(
    sql`SELECT COUNT(DISTINCT DATE(${orders.createdAt})) as totalDays FROM ${orders} WHERE ${orders.createdAt} >= ${start} AND ${orders.createdAt} <= ${end} AND ${orders.orderStatus} <> 'cancelled' AND ${orders.isTestData} = false`
  );
  const opDaysRow = (Array.isArray(operatingDaysResult[0]) ? operatingDaysResult[0] : operatingDaysResult) as { totalDays: number }[];
  const totalOperatingDays = Number(opDaysRow[0]?.totalDays) || 1;

  // ========== 6. Build DOW averages ==========
  const websiteRevenue = Number(websiteTotals?.revenue) || 0;
  const websiteOrders = Number(websiteTotals?.orderCount) || 0;
  const websiteItems = Number(websiteItemCount[0]?.total) || 0;
  const deliveryRevenue = Number(deliveryTotals[0]?.totalRevenue) || 0;
  const deliveryOrders = Number(deliveryTotals[0]?.totalOrders) || 0;
  const combinedRevenue = websiteRevenue + deliveryRevenue;
  const combinedOrders = websiteOrders + deliveryOrders;
  const dailyAvgRevenue = combinedRevenue / totalOperatingDays;
  const dailyAvgOrders = combinedOrders / totalOperatingDays;

  // Delivery daily avg (spread evenly since we don't have DOW granularity)
  const deliveryDailyRevenue = deliveryRevenue / totalOperatingDays;
  const deliveryDailyOrders = deliveryOrders / totalOperatingDays;

  // Website DOW averages
  const dowAverages = DOW_NAMES.map((_: string, i: number) => {
    const dow = i + 1;
    const dowData = websiteDowData.find(d => Number(d.dayOfWeek) === dow);
    const daysWithOrders = Number(dowData?.daysWithOrders) || 1;
    const rev = Number(dowData?.revenue) || 0;
    const ords = Number(dowData?.orderCount) || 0;
    const items = Number(dowData?.itemCount) || 0;
    return {
      day: DOW_SHORT[i],
      dayFull: DOW_NAMES[i],
      websiteRevenue: rev / daysWithOrders,
      websiteOrders: ords / daysWithOrders,
      websiteItems: items / daysWithOrders,
      deliveryRevenue: deliveryDailyRevenue,
      deliveryOrders: deliveryDailyOrders,
      totalRevenue: (rev / daysWithOrders) + deliveryDailyRevenue,
      totalOrders: (ords / daysWithOrders) + deliveryDailyOrders,
    };
  });

  // ========== 7. Next 7 days projection ==========
  const today = new Date();
  const next7Days = [];
  let next7Revenue = 0;
  let next7Orders = 0;
  let next7Items = 0;
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dowIdx = d.getDay(); // JS: 0=Sun
    const dowAvg = dowAverages[dowIdx];
    next7Revenue += dowAvg.totalRevenue;
    next7Orders += dowAvg.totalOrders;
    next7Items += dowAvg.websiteItems + (deliveryDailyOrders > 0 ? deliveryDailyOrders : 0);
    next7Days.push({
      date: d.toISOString().split('T')[0],
      dayName: DOW_NAMES[dowIdx],
      dayShort: DOW_SHORT[dowIdx],
      websiteRevenue: Math.round(dowAvg.websiteRevenue * 100) / 100,
      deliveryRevenue: Math.round(dowAvg.deliveryRevenue * 100) / 100,
      totalRevenue: Math.round(dowAvg.totalRevenue * 100) / 100,
      estOrders: Math.round(dowAvg.totalOrders * 10) / 10,
      estItems: Math.round(dowAvg.websiteItems * 10) / 10,
    });
  }

  // ========== 8. Month remaining projection ==========
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - today.getDate();
  const monthRemainingRevenue = dailyAvgRevenue * daysRemaining;

  // ========== 9. Category breakdown ==========
  const categoryBreakdown = websiteCategoryData
    .map(c => ({
      name: String(c.categoryName),
      revenue: Number(c.revenue) || 0,
      items: Number(c.itemCount) || 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Add delivery as a "category"
  if (deliveryRevenue > 0) {
    categoryBreakdown.push({
      name: "Delivery Channels",
      revenue: deliveryRevenue,
      items: deliveryOrders,
    });
  }

  const totalCategoryRevenue = categoryBreakdown.reduce((sum, c) => sum + c.revenue, 0);

  return {
    dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
    totalOperatingDays,
    dailyAvgRevenue: Math.round(dailyAvgRevenue * 1000) / 1000,
    dailyAvgOrders: Math.round(dailyAvgOrders * 10) / 10,
    next7Days,
    next7Revenue: Math.round(next7Revenue * 1000) / 1000,
    next7Orders: Math.round(next7Orders * 10) / 10,
    monthRemainingRevenue: Math.round(monthRemainingRevenue * 1000) / 1000,
    daysRemaining,
    websiteRevenue,
    websiteOrders,
    websiteItems,
    deliveryRevenue,
    deliveryOrders,
    combinedRevenue,
    combinedOrders,
    websiteShare: combinedRevenue > 0 ? Math.round((websiteRevenue / combinedRevenue) * 100) : 100,
    dowAverages,
    categoryBreakdown: categoryBreakdown.map(c => ({
      ...c,
      percentage: totalCategoryRevenue > 0 ? Math.round((c.revenue / totalCategoryRevenue) * 100) : 0,
    })),
  };
}
