import { getDb } from "./db";
import { orders, orderItems, products, subcategories, deliveryItemSales, deliverySalesUploads } from "../drizzle/schema";
import { eq, and, gte, lte, sql, ne } from "drizzle-orm";

// Day of week names (MySQL DAYOFWEEK: 1=Sunday, 2=Monday, ..., 7=Saturday)
const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Food category ID
const FOOD_CATEGORY_ID = 4;

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

  // Day-of-week averages
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
 */
export async function getItemDemandForecast(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return null;

  const start = startDate || new Date(2026, 0, 1);
  const end = endDate || new Date();

  // Get food item sales by day of week
  const websiteFoodSales = await db.select({
    productName: orderItems.productName,
    dayOfWeek: sql<number>`DAYOFWEEK(${orders.createdAt})`,
    totalQty: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
    totalRevenue: sql<number>`COALESCE(SUM(${orderItems.lineTotal}), 0)`,
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

  // Count how many of each day-of-week exist in the date range
  const dowCounts: Record<number, number> = {};
  const current = new Date(start);
  while (current <= end) {
    const dow = current.getDay() + 1;
    dowCounts[dow] = (dowCounts[dow] || 0) + 1;
    current.setDate(current.getDate() + 1);
  }

  // Build item × day-of-week matrix
  const itemMap: Record<string, {
    totalQty: number;
    totalRevenue: number;
    dow: Record<number, { qty: number; revenue: number }>;
  }> = {};

  for (const row of websiteFoodSales) {
    const name = row.productName;
    if (!itemMap[name]) {
      itemMap[name] = { totalQty: 0, totalRevenue: 0, dow: {} };
    }
    const qty = Number(row.totalQty) || 0;
    const rev = Number(row.totalRevenue) || 0;
    itemMap[name].totalQty += qty;
    itemMap[name].totalRevenue += rev;
    itemMap[name].dow[Number(row.dayOfWeek)] = { qty, revenue: rev };
  }

  // Convert to array with daily averages
  const items = Object.entries(itemMap)
    .map(([name, data]) => {
      const dowAvg = DOW_NAMES.map((_: string, i: number) => {
        const dow = i + 1;
        const rawQty = data.dow[dow]?.qty || 0;
        const daysCount = dowCounts[dow] || 1;
        return {
          day: DOW_SHORT[i],
          avgQty: Math.round((rawQty / daysCount) * 10) / 10,
          totalQty: rawQty,
        };
      });

      const totalDays = Object.values(dowCounts).reduce((a: number, b: number) => a + b, 0);
      const dailyAvg = totalDays > 0 ? data.totalQty / totalDays : 0;
      const peakDay = dowAvg.reduce((max, d) => d.avgQty > max.avgQty ? d : max, dowAvg[0]);

      // Calculate variance for reliability indicator
      const avgValues = dowAvg.map((d) => d.avgQty);
      const avgMean = avgValues.reduce((a: number, b: number) => a + b, 0) / avgValues.length;
      const avgVariance = avgValues.reduce((sum: number, v: number) => sum + Math.pow(v - avgMean, 2), 0) / avgValues.length;
      const coefficient = avgMean > 0 ? Math.sqrt(avgVariance) / avgMean : 0;
      const reliability: "high" | "medium" | "low" = coefficient < 0.5 ? "high" : coefficient < 1 ? "medium" : "low";

      return {
        productName: name,
        totalQty: data.totalQty,
        totalRevenue: data.totalRevenue,
        dailyAvg: Math.round(dailyAvg * 10) / 10,
        peakDay: peakDay.day,
        peakDayAvg: peakDay.avgQty,
        reliability,
        dowBreakdown: dowAvg,
      };
    })
    .sort((a, b) => b.totalQty - a.totalQty);

  return {
    dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
    dowCounts,
    items,
    totalFoodItems: items.length,
  };
}

/**
 * Procurement Planner - Next 7 days expected demand per food item
 */
export async function getProcurementForecast() {
  const forecast = await getItemDemandForecast();
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
    nextDays,
    items: procurement,
  };
}

/**
 * Trend Detection - Compare recent 2 weeks vs previous 2 weeks
 */
export async function getTrendAlerts() {
  const db = await getDb();
  if (!db) return null;

  const today = new Date();
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
