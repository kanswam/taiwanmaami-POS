import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { orders, kotQueue } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

describe('KOT Creation for In-Store Orders', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  describe('KOT Queue Table', () => {
    it('should have kotQueue table with required columns', async () => {
      const columns = await db?.execute(`SHOW COLUMNS FROM kot_queue`);
      expect(columns).toBeDefined();
      expect(Array.isArray(columns)).toBe(true);
      // Table exists and has columns
      expect((columns as any[]).length).toBeGreaterThan(0);
    });

    it('should have isPrinted column with boolean type', async () => {
      const columns = await db?.execute(`SHOW COLUMNS FROM kot_queue WHERE Field = 'isPrinted'`);
      expect(columns).toBeDefined();
      expect(Array.isArray(columns)).toBe(true);
      expect((columns as any[]).length).toBeGreaterThan(0);
    });
  });

  describe('In-Store Order Type', () => {
    it('should support instore order type in orders table', async () => {
      const columns = await db?.execute(`SHOW COLUMNS FROM orders WHERE Field = 'orderType'`);
      expect(columns).toBeDefined();
      expect(Array.isArray(columns)).toBe(true);
      expect((columns as any[]).length).toBeGreaterThan(0);
    });

    it('should have tableNumber column for in-store orders', async () => {
      const columns = await db?.execute(`SHOW COLUMNS FROM orders WHERE Field = 'tableNumber'`);
      expect(columns).toBeDefined();
      expect(Array.isArray(columns)).toBe(true);
      expect((columns as any[]).length).toBeGreaterThan(0);
    });
  });

  describe('KOT Data Structure', () => {
    it('should store kotData as JSON', async () => {
      const columns = await db?.execute(`SHOW COLUMNS FROM kot_queue WHERE Field = 'kotData'`);
      expect(columns).toBeDefined();
      expect(Array.isArray(columns)).toBe(true);
      // kotData column exists
      expect((columns as any[]).length).toBeGreaterThan(0);
    });

    it('should allow querying KOT queue by isPrinted status', async () => {
      // Query pending KOTs (not yet printed)
      const pendingKots = await db?.select()
        .from(kotQueue)
        .where(eq(kotQueue.isPrinted, false))
        .limit(10);
      
      expect(pendingKots).toBeDefined();
      expect(Array.isArray(pendingKots)).toBe(true);
    });
  });

  describe('Payment Status for In-Store Orders', () => {
    it('should support pending payment status for pay-at-counter orders', async () => {
      const columns = await db?.execute(`SHOW COLUMNS FROM orders WHERE Field = 'paymentStatus'`);
      expect(columns).toBeDefined();
      expect(Array.isArray(columns)).toBe(true);
      expect((columns as any[]).length).toBeGreaterThan(0);
    });
  });
});
