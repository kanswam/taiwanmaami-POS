import { describe, it, expect } from 'vitest';
import { getDb } from './db';
import { orders, orderItems, products, categories, subcategories, deliverySalesUploads } from '../drizzle/schema';
import { sql, eq, and, desc, sum, count } from 'drizzle-orm';

describe('Excel Export Data Queries', () => {
  describe('Itemwise Sales Report', () => {
    it('should query itemwise data aggregated by product', async () => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');

      const startDate = '2026-01-01';
      const endDate = '2026-02-21';

      const itemData = await db
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

      expect(Array.isArray(itemData)).toBe(true);
      expect(itemData.length).toBeGreaterThan(0);

      // Each item should have required fields
      const firstItem = itemData[0];
      expect(firstItem.productName).toBeTruthy();
      expect(Number(firstItem.quantity)).toBeGreaterThan(0);
      expect(Number(firstItem.revenue)).toBeGreaterThan(0);
      expect(Number(firstItem.orderCount)).toBeGreaterThan(0);
    });

    it('should fetch categories and subcategories for name mapping', async () => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');

      const allCategories = await db.select().from(categories);
      const allSubcategories = await db.select().from(subcategories);

      expect(allCategories.length).toBeGreaterThan(0);
      expect(allSubcategories.length).toBeGreaterThan(0);

      // Categories should have id and name
      const cat = allCategories[0];
      expect(cat.id).toBeDefined();
      expect(cat.name).toBeTruthy();
    });

    it('should calculate correct totals from itemwise data', async () => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');

      const startDate = '2026-01-01';
      const endDate = '2026-02-21';

      const itemData = await db
        .select({
          quantity: sql<number>`SUM(${orderItems.quantity})`.as('total_qty'),
          revenue: sql<number>`SUM(${orderItems.lineTotal})`.as('total_revenue'),
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(
          sql`${orders.createdAt} >= ${startDate}`,
          sql`${orders.createdAt} <= ${endDate + ' 23:59:59'}`,
          sql`${orders.orderStatus} != 'cancelled'`,
        ))
        .groupBy(orderItems.productId, orderItems.productName, orderItems.size);

      const totalRevenue = itemData.reduce((s, i) => s + Number(i.revenue), 0);
      const totalQuantity = itemData.reduce((s, i) => s + Number(i.quantity), 0);

      expect(totalRevenue).toBeGreaterThan(0);
      expect(totalQuantity).toBeGreaterThan(0);
    });
  });

  describe('Channels Report', () => {
    it('should query website order totals', async () => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');

      const startDate = '2026-01-01';
      const endDate = '2026-02-21';

      const websiteOrders = await db
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

      expect(websiteOrders.length).toBe(1);
      expect(Number(websiteOrders[0].orderCount)).toBeGreaterThan(0);
      expect(Number(websiteOrders[0].totalRevenue)).toBeGreaterThan(0);
    });

    it('should query daily website orders with GROUP BY 1 pattern', async () => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');

      const startDate = '2026-01-01';
      const endDate = '2026-02-21';

      // This is the exact query pattern used in the channels export
      const dailyWebsite = await db.execute(
        sql`SELECT DATE(${orders.createdAt}) as order_date, COUNT(*) as order_count, SUM(${orders.totalAmount}) as total_revenue FROM ${orders} WHERE ${orders.createdAt} >= ${startDate} AND ${orders.createdAt} <= ${endDate + ' 23:59:59'} AND ${orders.orderStatus} != 'cancelled' GROUP BY 1 ORDER BY 1`
      ) as any;

      // Should return array of daily records
      const rows = Array.isArray(dailyWebsite) ? (dailyWebsite[0] || dailyWebsite) : dailyWebsite;
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0);

      // Each row should have date, order_count, total_revenue
      const firstRow = rows[0];
      expect(firstRow.order_date).toBeTruthy();
      expect(Number(firstRow.order_count)).toBeGreaterThan(0);
      expect(Number(firstRow.total_revenue)).toBeGreaterThan(0);
    });

    it('should query delivery sales uploads', async () => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');

      const deliveryUploads = await db.select().from(deliverySalesUploads);

      // Should have at least some delivery data uploaded
      expect(Array.isArray(deliveryUploads)).toBe(true);
      expect(deliveryUploads.length).toBeGreaterThan(0);

      // Each upload should have channel data
      const upload = deliveryUploads[0];
      expect(upload.periodLabel).toBeTruthy();
      // At least one channel should have data
      const hasChannelData = (upload.zomatoOrders || 0) > 0 || 
                             (upload.swiggyOrders || 0) > 0 || 
                             (upload.dineInOrders || 0) > 0;
      expect(hasChannelData).toBe(true);
    });
  });

  describe('Paise to Rupees conversion', () => {
    it('should correctly convert paise to rupees', () => {
      const toRupees = (paise: number) => paise / 100;
      expect(toRupees(10000)).toBe(100);
      expect(toRupees(45050)).toBe(450.5);
      expect(toRupees(0)).toBe(0);
      expect(toRupees(1)).toBe(0.01);
    });
  });
});
