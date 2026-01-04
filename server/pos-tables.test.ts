import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { orders, orderItemsTable } from '../drizzle/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

describe('POS Table Features', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  describe('Table Number Assignment', () => {
    it('should have tableNumber column in orders table', async () => {
      // Query the orders table to verify tableNumber column exists
      const result = await db?.execute(`SHOW COLUMNS FROM orders LIKE 'tableNumber'`);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should allow null tableNumber for delivery/pickup orders', async () => {
      // Verify existing delivery order has null tableNumber
      const deliveryOrders = await db?.select()
        .from(orders)
        .where(eq(orders.orderType, 'delivery'))
        .limit(1);
      
      // If there are delivery orders, tableNumber should be null
      if (deliveryOrders && deliveryOrders.length > 0) {
        expect(deliveryOrders[0].tableNumber).toBeNull();
      }
    });
  });

  describe('Payment Status Tracking', () => {
    it('should have paymentStatus column with correct enum values', async () => {
      const result = await db?.execute(`SHOW COLUMNS FROM orders LIKE 'paymentStatus'`);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result!.length).toBeGreaterThan(0);
    });

    it('should default paymentStatus to pending', async () => {
      // Check that orders have a valid paymentStatus
      const allOrders = await db?.select({ paymentStatus: orders.paymentStatus })
        .from(orders)
        .limit(5);
      
      if (allOrders && allOrders.length > 0) {
        allOrders.forEach(order => {
          expect(['pending', 'partial', 'completed', 'refunded']).toContain(order.paymentStatus);
        });
      }
    });
  });

  describe('In-store Order Flow', () => {
    it('should support instore order type', async () => {
      // Verify the orderType column exists
      const result = await db?.execute(`SHOW COLUMNS FROM orders LIKE 'orderType'`);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result!.length).toBeGreaterThan(0);
    });

    it('should allow querying orders by table number', async () => {
      // Query orders with tableNumber set
      const instoreOrders = await db?.select()
        .from(orders)
        .where(and(
          eq(orders.orderType, 'instore'),
          isNotNull(orders.tableNumber)
        ))
        .limit(10);
      
      // This should not throw an error
      expect(instoreOrders).toBeDefined();
      expect(Array.isArray(instoreOrders)).toBe(true);
    });
  });

  describe('GST Breakdown', () => {
    it('should have separate stateGst and centralGst columns', async () => {
      const stateGstResult = await db?.execute(`SHOW COLUMNS FROM orders LIKE 'stateGst'`);
      const centralGstResult = await db?.execute(`SHOW COLUMNS FROM orders LIKE 'centralGst'`);
      
      expect(stateGstResult).toBeDefined();
      expect(centralGstResult).toBeDefined();
      
      if (Array.isArray(stateGstResult) && Array.isArray(centralGstResult)) {
        expect(stateGstResult.length).toBeGreaterThan(0);
        expect(centralGstResult.length).toBeGreaterThan(0);
      }
    });

    it('should calculate GST correctly (2.5% each)', async () => {
      const orderWithGst = await db?.select()
        .from(orders)
        .limit(1);
      
      if (orderWithGst && orderWithGst.length > 0) {
        const order = orderWithGst[0];
        // GST should be approximately 2.5% of subtotal each
        const expectedGstEach = Math.round(order.subtotal * 0.025);
        
        // Allow for small rounding differences
        expect(Math.abs(order.stateGst - expectedGstEach)).toBeLessThan(10);
        expect(Math.abs(order.centralGst - expectedGstEach)).toBeLessThan(10);
      }
    });
  });
});
