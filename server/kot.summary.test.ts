import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { kotQueue, users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('KOT Daily Summary', () => {
  let adminContext: any;
  let testUserId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Find or create admin user
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1);

    if (!adminUser) {
      throw new Error('No admin user found in database');
    }

    testUserId = adminUser.id;

    // Create admin context
    adminContext = {
      user: {
        id: adminUser.id,
        openId: adminUser.openId,
        name: adminUser.name,
        email: adminUser.email,
        role: 'admin',
        stampCount: adminUser.stampCount,
      },
      req: {} as any,
      res: {} as any,
    };
  });

  it('should return daily summary for today', async () => {
    const caller = appRouter.createCaller(adminContext);
    
    const result = await caller.kot.getDailySummary({});
    
    expect(result).toBeDefined();
    expect(result).toHaveProperty('totalKots');
    expect(result).toHaveProperty('busiestHour');
    expect(result).toHaveProperty('topItems');
    expect(result).toHaveProperty('date');
    expect(typeof result.totalKots).toBe('number');
    expect(Array.isArray(result.topItems)).toBe(true);
  });

  it('should return daily summary for specific date', async () => {
    const caller = appRouter.createCaller(adminContext);
    const testDate = '2025-12-22';
    
    const result = await caller.kot.getDailySummary({ date: testDate });
    
    expect(result).toBeDefined();
    expect(result.date).toBe(testDate);
    expect(typeof result.totalKots).toBe('number');
  });

  it('should calculate top items correctly', async () => {
    const caller = appRouter.createCaller(adminContext);
    
    const result = await caller.kot.getDailySummary({});
    
    // If there are items, they should be sorted by quantity descending
    if (result.topItems.length > 1) {
      for (let i = 0; i < result.topItems.length - 1; i++) {
        expect(result.topItems[i].quantity).toBeGreaterThanOrEqual(
          result.topItems[i + 1].quantity
        );
      }
    }
    
    // Each item should have required fields
    result.topItems.forEach(item => {
      expect(item).toHaveProperty('productName');
      expect(item).toHaveProperty('quantity');
      expect(typeof item.productName).toBe('string');
      expect(typeof item.quantity).toBe('number');
    });
  });

  it('should reject non-admin users', async () => {
    const userContext = {
      user: {
        id: testUserId,
        openId: 'test-user',
        name: 'Test User',
        email: 'user@test.com',
        role: 'user' as const, // Non-admin
        stampCount: 0,
      },
      req: {} as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(userContext);
    
    await expect(caller.kot.getDailySummary({})).rejects.toThrow();
  });
});
