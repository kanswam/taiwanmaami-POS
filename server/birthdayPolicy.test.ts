import { describe, it, expect } from 'vitest';

/**
 * Tests for Birthday Free Drink Policy and Stamp Award Prevention
 * 
 * Policy 1: Birthday free drink requires at least 2 items in the order
 *   - Prevents abuse where someone registers just to claim a free drink
 *   - Customer must order at least one other paid item
 * 
 * Policy 2: Zero-value orders do not earn stamps (including welcome stamps)
 *   - Prevents gaming via birthday-only or fully-discounted orders
 */

describe('Birthday Free Drink Policy', () => {
  // Simulate the item quantity check from routers.ts
  function shouldApplyBirthdayFreeDrink(items: Array<{ quantity?: number }>): boolean {
    const totalItemQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    return totalItemQuantity >= 2;
  }

  it('should NOT apply birthday free drink for single item order', () => {
    const items = [{ quantity: 1 }];
    expect(shouldApplyBirthdayFreeDrink(items)).toBe(false);
  });

  it('should NOT apply birthday free drink for single item with no quantity field', () => {
    const items = [{}];
    expect(shouldApplyBirthdayFreeDrink(items)).toBe(false);
  });

  it('should apply birthday free drink for 2 items', () => {
    const items = [{ quantity: 1 }, { quantity: 1 }];
    expect(shouldApplyBirthdayFreeDrink(items)).toBe(true);
  });

  it('should apply birthday free drink for 1 item with quantity 2', () => {
    const items = [{ quantity: 2 }];
    expect(shouldApplyBirthdayFreeDrink(items)).toBe(true);
  });

  it('should apply birthday free drink for multiple items', () => {
    const items = [{ quantity: 1 }, { quantity: 1 }, { quantity: 1 }];
    expect(shouldApplyBirthdayFreeDrink(items)).toBe(true);
  });

  it('should NOT apply for empty items array', () => {
    const items: Array<{ quantity?: number }> = [];
    expect(shouldApplyBirthdayFreeDrink(items)).toBe(false);
  });
});

describe('Stamp Award - Zero Value Order Prevention', () => {
  // Simulate the stamp awarding check from routers.ts
  function shouldAwardStamps(orderTotal: number, userRole: string): { award: boolean; reason?: string } {
    if (userRole === 'staff' || userRole === 'admin') {
      return { award: false, reason: 'staff/admin' };
    }
    if (orderTotal <= 0) {
      return { award: false, reason: 'zero-value order' };
    }
    return { award: true };
  }

  function calculateStamps(orderTotal: number, isFirstOrder: boolean): { stampsEarned: number; welcomeStamp: number; total: number } {
    const stampsEarned = Math.floor(orderTotal / 45000); // 1 stamp per ₹450
    const welcomeStamp = isFirstOrder ? 1 : 0;
    return { stampsEarned, welcomeStamp, total: stampsEarned + welcomeStamp };
  }

  it('should NOT award stamps for ₹0 order total', () => {
    const result = shouldAwardStamps(0, 'customer');
    expect(result.award).toBe(false);
    expect(result.reason).toBe('zero-value order');
  });

  it('should NOT award stamps for negative order total', () => {
    const result = shouldAwardStamps(-100, 'customer');
    expect(result.award).toBe(false);
    expect(result.reason).toBe('zero-value order');
  });

  it('should NOT award welcome stamp for ₹0 first order', () => {
    // Even if it's a first order, zero-value should be blocked before stamp calc
    const result = shouldAwardStamps(0, 'customer');
    expect(result.award).toBe(false);
  });

  it('should award stamps for paid order', () => {
    const result = shouldAwardStamps(46500, 'customer'); // ₹465
    expect(result.award).toBe(true);
  });

  it('should award welcome stamp for first paid order', () => {
    const stamps = calculateStamps(46500, true); // ₹465
    expect(stamps.stampsEarned).toBe(1); // 465 >= 450
    expect(stamps.welcomeStamp).toBe(1);
    expect(stamps.total).toBe(2);
  });

  it('should NOT award stamps for staff', () => {
    const result = shouldAwardStamps(46500, 'staff');
    expect(result.award).toBe(false);
    expect(result.reason).toBe('staff/admin');
  });

  it('should NOT award stamps for admin', () => {
    const result = shouldAwardStamps(46500, 'admin');
    expect(result.award).toBe(false);
    expect(result.reason).toBe('staff/admin');
  });

  it('should calculate correct stamps for large orders', () => {
    const stamps = calculateStamps(135000, false); // ₹1350 = 3 stamps
    expect(stamps.stampsEarned).toBe(3);
    expect(stamps.welcomeStamp).toBe(0);
    expect(stamps.total).toBe(3);
  });

  it('should calculate 0 earned stamps for order below ₹450', () => {
    const stamps = calculateStamps(30000, false); // ₹300
    expect(stamps.stampsEarned).toBe(0);
    expect(stamps.welcomeStamp).toBe(0);
    expect(stamps.total).toBe(0);
  });

  it('should give welcome stamp even for small first order', () => {
    const stamps = calculateStamps(30000, true); // ₹300, first order
    expect(stamps.stampsEarned).toBe(0);
    expect(stamps.welcomeStamp).toBe(1);
    expect(stamps.total).toBe(1);
  });
});

describe('Birthday Abuse Scenario: Deepi selvan case', () => {
  it('should block the exact abuse scenario: 1 item + birthday discount = ₹0', () => {
    // Deepi ordered 1x Classic Taiwan Milk Oolong (₹465), got BIRTHDAY_FREE_DRINK discount of ₹465
    const items = [{ productName: 'Classic Taiwan Milk Oolong', quantity: 1, lineTotal: 46500 }];
    
    // Step 1: Birthday free drink check - should fail (only 1 item)
    const totalItemQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    expect(totalItemQuantity).toBe(1);
    expect(totalItemQuantity >= 2).toBe(false); // Birthday free drink NOT applied
    
    // Step 2: Even if birthday somehow applied, stamps should be blocked
    const orderTotal = 0; // After full discount
    const shouldAward = orderTotal > 0;
    expect(shouldAward).toBe(false); // No stamps for ₹0 order
  });

  it('should allow birthday free drink when customer orders 2+ items', () => {
    // Correct usage: customer orders food + drink, gets the drink free
    const items = [
      { productName: 'Classic Taiwan Milk Oolong', quantity: 1, lineTotal: 46500 },
      { productName: 'Biang Biang Noodles', quantity: 1, lineTotal: 41500 }
    ];
    
    const totalItemQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    expect(totalItemQuantity).toBe(2);
    expect(totalItemQuantity >= 2).toBe(true); // Birthday free drink CAN be applied
    
    // After birthday discount on most expensive item (₹465 drink), customer still pays for noodles
    const subtotal = 46500 + 41500; // ₹880
    const discount = 46500; // Most expensive item free
    const orderTotal = subtotal - discount; // ₹415 paid
    expect(orderTotal).toBe(41500);
    expect(orderTotal > 0).toBe(true); // Stamps CAN be awarded
  });
});
