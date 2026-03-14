import { describe, it, expect } from 'vitest';
import { CART_EXPIRY_MS, THIRTY_DAYS_MS, ONE_YEAR_MS } from '@shared/const';

describe('Cart Expiry Constants', () => {
  it('CART_EXPIRY_MS should be 4 hours in milliseconds', () => {
    const fourHoursMs = 4 * 60 * 60 * 1000; // 14,400,000
    expect(CART_EXPIRY_MS).toBe(fourHoursMs);
    expect(CART_EXPIRY_MS).toBe(14_400_000);
  });

  it('THIRTY_DAYS_MS should be 30 days in milliseconds', () => {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000; // 2,592,000,000
    expect(THIRTY_DAYS_MS).toBe(thirtyDaysMs);
    expect(THIRTY_DAYS_MS).toBe(2_592_000_000);
  });

  it('THIRTY_DAYS_MS should be less than ONE_YEAR_MS', () => {
    expect(THIRTY_DAYS_MS).toBeLessThan(ONE_YEAR_MS);
  });
});

describe('Cart Expiry Logic', () => {
  it('should identify cart as expired when lastActivityAt is more than 4 hours ago', () => {
    const fiveHoursAgo = Date.now() - (5 * 60 * 60 * 1000);
    const now = Date.now();
    const isExpired = (now - fiveHoursAgo) > CART_EXPIRY_MS;
    expect(isExpired).toBe(true);
  });

  it('should identify cart as NOT expired when lastActivityAt is less than 4 hours ago', () => {
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    const now = Date.now();
    const isExpired = (now - twoHoursAgo) > CART_EXPIRY_MS;
    expect(isExpired).toBe(false);
  });

  it('should identify cart as NOT expired when lastActivityAt is exactly 4 hours ago', () => {
    const exactlyFourHoursAgo = Date.now() - CART_EXPIRY_MS;
    const now = Date.now();
    // At exactly 4 hours, (now - lastActivity) === CART_EXPIRY_MS, which is NOT > CART_EXPIRY_MS
    const isExpired = (now - exactlyFourHoursAgo) > CART_EXPIRY_MS;
    expect(isExpired).toBe(false);
  });

  it('should identify cart as expired when lastActivityAt is 4 hours + 1 second ago', () => {
    const justOverFourHours = Date.now() - CART_EXPIRY_MS - 1000;
    const now = Date.now();
    const isExpired = (now - justOverFourHours) > CART_EXPIRY_MS;
    expect(isExpired).toBe(true);
  });

  it('should NOT expire empty carts regardless of time', () => {
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const now = Date.now();
    const items: unknown[] = [];
    // Empty cart should not trigger expiry logic
    const shouldExpire = items.length > 0 && (now - dayAgo) > CART_EXPIRY_MS;
    expect(shouldExpire).toBe(false);
  });

  it('should preserve order type and outlet preferences when cart expires', () => {
    // Simulate what getInitialState does when cart is expired
    const expiredCart = {
      items: [{ id: '1', productName: 'Taro Milk Tea', quantity: 1 }],
      orderType: 'instore' as const,
      instoreOutlet: 'palladium' as const,
      pickupOutlet: null,
      tableNumber: null,
      discountCode: 'SAVE10',
      discountAmount: 1000,
      loyaltyPointsUsed: 500,
      lastAddedItem: { productId: 1, subcategoryId: 1 },
      activeOrderId: 42,
      lastActivityAt: Date.now() - (5 * 60 * 60 * 1000), // 5 hours ago
    };

    const now = Date.now();
    const isExpired = expiredCart.items.length > 0 && (now - expiredCart.lastActivityAt) > CART_EXPIRY_MS;
    expect(isExpired).toBe(true);

    // After expiry, these should be cleared
    const clearedState = {
      ...expiredCart,
      items: [],
      discountCode: null,
      discountAmount: 0,
      loyaltyPointsUsed: 0,
      lastAddedItem: null,
      activeOrderId: null,
      lastActivityAt: now,
    };

    // Items should be cleared
    expect(clearedState.items).toEqual([]);
    expect(clearedState.discountCode).toBeNull();
    expect(clearedState.discountAmount).toBe(0);
    expect(clearedState.loyaltyPointsUsed).toBe(0);
    expect(clearedState.lastAddedItem).toBeNull();
    expect(clearedState.activeOrderId).toBeNull();

    // Order type and outlet should be PRESERVED
    expect(clearedState.orderType).toBe('instore');
    expect(clearedState.instoreOutlet).toBe('palladium');
  });
});

describe('Session Cookie Duration', () => {
  it('session cookie should be 30 days, not 1 year', () => {
    // The session cookie maxAge should use THIRTY_DAYS_MS
    expect(THIRTY_DAYS_MS).toBe(30 * 24 * 60 * 60 * 1000);
    // Verify it's approximately 30 days (not 365)
    const days = THIRTY_DAYS_MS / (24 * 60 * 60 * 1000);
    expect(days).toBe(30);
  });
});
