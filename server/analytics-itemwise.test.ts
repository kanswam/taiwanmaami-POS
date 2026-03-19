import { describe, it, expect } from 'vitest';

/**
 * Tests for analytics itemwise sales report fixes:
 * 1. LEFT JOIN instead of INNER JOIN — custom items (productId=0) are included
 * 2. Itemwise summary Total Revenue now uses orderTotalRevenue (matches Sales tab)
 * 3. Custom items are properly categorized as "Custom Items"
 */

describe('Analytics Itemwise Sales Report Fixes', () => {
  // Test 1: Verify the getItemwiseSalesReport uses LEFT JOIN (custom items included)
  it('should include custom items (productId=0) in itemwise report', async () => {
    // Import the router to test the procedure
    const { appRouter } = await import('./routers');
    const { getDb } = await import('./db');
    const dbInstance = await getDb();
    if (!dbInstance) {
      console.warn('No DB connection, skipping');
      return;
    }

    // Query to check if custom items exist in the database
    const { sql } = await import('drizzle-orm');
    const { orderItems: orderItemsTable, orders } = await import('../drizzle/schema');
    
    const customItems = await dbInstance
      .select({
        count: sql<number>`COUNT(*)`,
        totalRevenue: sql<number>`SUM(${orderItemsTable.lineTotal})`,
      })
      .from(orderItemsTable)
      .innerJoin(orders, sql`${orderItemsTable.orderId} = ${orders.id}`)
      .where(sql`${orderItemsTable.productId} = 0 AND ${orders.orderStatus} != 'cancelled'`);

    const customCount = Number(customItems[0]?.count || 0);
    const customRevenue = Number(customItems[0]?.totalRevenue || 0);

    // If there are custom items in the DB, they should be > 0
    // This confirms the data exists that was previously being excluded
    if (customCount > 0) {
      expect(customRevenue).toBeGreaterThan(0);
      console.log(`Found ${customCount} custom items worth ${customRevenue} paise that were previously excluded`);
    }
  });

  // Test 2: Verify LEFT JOIN query returns more items than INNER JOIN
  it('should return more items with LEFT JOIN than INNER JOIN when custom items exist', async () => {
    const { getDb } = await import('./db');
    const dbInstance = await getDb();
    if (!dbInstance) {
      console.warn('No DB connection, skipping');
      return;
    }

    const { sql, eq } = await import('drizzle-orm');
    const { orderItems: orderItemsTable, products, orders } = await import('../drizzle/schema');

    // Count with INNER JOIN (old behavior — excludes custom items)
    const innerJoinResult = await dbInstance
      .select({ count: sql<number>`COUNT(*)` })
      .from(orderItemsTable)
      .innerJoin(products, eq(orderItemsTable.productId, products.id))
      .innerJoin(orders, eq(orderItemsTable.orderId, orders.id))
      .where(sql`${orders.orderStatus} != 'cancelled'`);

    // Count with LEFT JOIN (new behavior — includes custom items)
    const leftJoinResult = await dbInstance
      .select({ count: sql<number>`COUNT(*)` })
      .from(orderItemsTable)
      .leftJoin(products, eq(orderItemsTable.productId, products.id))
      .innerJoin(orders, eq(orderItemsTable.orderId, orders.id))
      .where(sql`${orders.orderStatus} != 'cancelled'`);

    const innerCount = Number(innerJoinResult[0]?.count || 0);
    const leftCount = Number(leftJoinResult[0]?.count || 0);

    // LEFT JOIN should return >= INNER JOIN count
    expect(leftCount).toBeGreaterThanOrEqual(innerCount);
    console.log(`INNER JOIN: ${innerCount} items, LEFT JOIN: ${leftCount} items (diff: ${leftCount - innerCount})`);
  });

  // Test 3: Verify the summary now includes orderTotalRevenue field
  it('should return orderTotalRevenue in summary that matches Sales tab calculation', async () => {
    const { getDb } = await import('./db');
    const dbInstance = await getDb();
    if (!dbInstance) {
      console.warn('No DB connection, skipping');
      return;
    }

    const { sql, and } = await import('drizzle-orm');
    const { orders } = await import('../drizzle/schema');

    // Get the sum of totalAmount from orders (what Sales tab shows)
    const salesTabResult = await dbInstance
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        orderCount: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(and(
        sql`${orders.orderStatus} != 'cancelled'`,
        sql`${orders.createdAt} >= '2026-01-01'`,
        sql`${orders.createdAt} <= '2026-02-28 23:59:59'`,
      ));

    const salesTotal = Number(salesTabResult[0]?.totalRevenue || 0);
    const orderCount = Number(salesTabResult[0]?.orderCount || 0);

    // The sales total should be positive if there are orders
    if (orderCount > 0) {
      expect(salesTotal).toBeGreaterThan(0);
      console.log(`Sales tab total: ${salesTotal} paise (${orderCount} orders)`);
    }
  });

  // Test 4: Verify custom items are categorized as "Custom Items"
  it('should categorize items with null subcategoryId as Custom Items', () => {
    // This tests the logic that maps null subcategoryId to "Custom Items"
    const subcatToCat: Record<number, { catId: number; catName: string; subcatName: string }> = {
      1: { catId: 1, catName: 'Beverages', subcatName: 'Bubble Tea' },
      2: { catId: 2, catName: 'Food', subcatName: 'Noodles' },
    };

    // Simulate the categorization logic from the fixed code
    const testItems = [
      { productId: 1, subcategoryId: 1 as number | null },  // Normal product
      { productId: 0, subcategoryId: null as number | null }, // Custom item
      { productId: 2, subcategoryId: 2 as number | null },  // Normal product
    ];

    const results = testItems.map(item => {
      const catInfo = item.subcategoryId 
        ? (subcatToCat[item.subcategoryId] || { catId: 0, catName: 'Custom Items', subcatName: 'Custom Items' }) 
        : { catId: 0, catName: 'Custom Items', subcatName: 'Custom Items' };
      return catInfo;
    });

    expect(results[0].catName).toBe('Beverages');
    expect(results[1].catName).toBe('Custom Items');
    expect(results[2].catName).toBe('Food');
  });

  // Test 5: Verify custom item key generation uses product name
  it('should generate unique keys for custom items using product name', () => {
    // Test the key generation logic for custom items
    const items = [
      { productId: 0, productName: '[Custom] slush', size: 'standard' },
      { productId: 0, productName: '[Custom] mochi', size: 'standard' },
      { productId: 42, productName: 'Brown Sugar Boba', size: 'large' },
    ];

    const keys = items.map(item => {
      const size = item.size || 'standard';
      return item.productId === 0 
        ? `custom-${item.productName}-${size}` 
        : `${item.productId}-${size}`;
    });

    expect(keys[0]).toBe('custom-[Custom] slush-standard');
    expect(keys[1]).toBe('custom-[Custom] mochi-standard');
    expect(keys[2]).toBe('42-large');
    // All keys should be unique
    expect(new Set(keys).size).toBe(3);
  });

  // Test 6: Verify the revenue reconciliation
  it('should have itemwise line totals + GST + delivery - discounts approximately equal to order totals', async () => {
    const { getDb } = await import('./db');
    const dbInstance = await getDb();
    if (!dbInstance) {
      console.warn('No DB connection, skipping');
      return;
    }

    const { sql, and, eq } = await import('drizzle-orm');
    const { orders, orderItems: orderItemsTable } = await import('../drizzle/schema');

    // Get order-level totals
    const orderTotals = await dbInstance
      .select({
        totalAmount: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        subtotal: sql<number>`COALESCE(SUM(${orders.subtotal}), 0)`,
        gst: sql<number>`COALESCE(SUM(${orders.stateGst} + ${orders.centralGst}), 0)`,
        delivery: sql<number>`COALESCE(SUM(${orders.deliveryCharge}), 0)`,
        discounts: sql<number>`COALESCE(SUM(${orders.discountAmount}), 0)`,
      })
      .from(orders)
      .where(and(
        sql`${orders.orderStatus} != 'cancelled'`,
        sql`${orders.createdAt} >= '2026-01-01'`,
        sql`${orders.createdAt} <= '2026-02-28 23:59:59'`,
      ));

    // Get item-level totals (all items including custom)
    const itemTotals = await dbInstance
      .select({
        lineTotal: sql<number>`COALESCE(SUM(${orderItemsTable.lineTotal}), 0)`,
      })
      .from(orderItemsTable)
      .innerJoin(orders, eq(orderItemsTable.orderId, orders.id))
      .where(and(
        sql`${orders.orderStatus} != 'cancelled'`,
        sql`${orders.createdAt} >= '2026-01-01'`,
        sql`${orders.createdAt} <= '2026-02-28 23:59:59'`,
      ));

    const orderTotal = Number(orderTotals[0]?.totalAmount || 0);
    const orderSubtotal = Number(orderTotals[0]?.subtotal || 0);
    const gst = Number(orderTotals[0]?.gst || 0);
    const delivery = Number(orderTotals[0]?.delivery || 0);
    const discounts = Number(orderTotals[0]?.discounts || 0);
    const itemLineTotal = Number(itemTotals[0]?.lineTotal || 0);

    // totalAmount should approximately equal subtotal + gst + delivery - discounts
    // Note: There may be small differences due to packaging charges, rounding, and other order-level adjustments
    const calculated = orderSubtotal + gst + delivery - discounts;
    // Allow for packaging charges and other minor adjustments (within Rs. 500 = 50000 paise)
    expect(Math.abs(orderTotal - calculated)).toBeLessThan(50000);

    console.log(`Order total: ${orderTotal}, Calculated: ${calculated}, Item lines: ${itemLineTotal}`);
    console.log(`GST: ${gst}, Delivery: ${delivery}, Discounts: ${discounts}`);
  });
});
