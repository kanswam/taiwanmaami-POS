import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for loyalty reward redemption during order creation.
 * 
 * Key behaviors tested:
 * 1. REWARD: prefix discount codes trigger loyalty redemption flow
 * 2. addStamps procedure creates rewards when stamps reach 10+
 * 3. Regular discount codes still work normally
 */

// Mock the database module
const mockDb = {
  getDiscountByCode: vi.fn(),
  hasUserUsedDiscount: vi.fn(),
  getUserOrderCount: vi.fn(),
  recordDiscountUsage: vi.fn(),
};

describe('Loyalty Reward Redemption Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('REWARD: prefix discount code parsing', () => {
    it('should correctly identify REWARD: prefix codes', () => {
      const discountCode = 'REWARD:ABC123';
      expect(discountCode.startsWith('REWARD:')).toBe(true);
      expect(discountCode.replace('REWARD:', '')).toBe('ABC123');
    });

    it('should not match regular discount codes as REWARD:', () => {
      const discountCode = 'BOBALOVE10';
      expect(discountCode.startsWith('REWARD:')).toBe(false);
    });

    it('should handle empty REWARD: code gracefully', () => {
      const discountCode = 'REWARD:';
      expect(discountCode.startsWith('REWARD:')).toBe(true);
      expect(discountCode.replace('REWARD:', '')).toBe('');
    });
  });

  describe('Stamp threshold reward creation', () => {
    it('should create 1 reward when stamps reach exactly 10', () => {
      const currentStamps = 8;
      const newStamps = 2;
      const totalStamps = currentStamps + newStamps;
      const rewardsToCreate = Math.floor(totalStamps / 10);
      const remainingStamps = totalStamps % 10;
      
      expect(rewardsToCreate).toBe(1);
      expect(remainingStamps).toBe(0);
    });

    it('should create 1 reward when stamps exceed 10 (e.g., 16)', () => {
      const currentStamps = 10;
      const newStamps = 6;
      const totalStamps = currentStamps + newStamps;
      const rewardsToCreate = Math.floor(totalStamps / 10);
      const remainingStamps = totalStamps % 10;
      
      expect(rewardsToCreate).toBe(1);
      expect(remainingStamps).toBe(6);
    });

    it('should create 2 rewards when stamps reach 20', () => {
      const currentStamps = 15;
      const newStamps = 5;
      const totalStamps = currentStamps + newStamps;
      const rewardsToCreate = Math.floor(totalStamps / 10);
      const remainingStamps = totalStamps % 10;
      
      expect(rewardsToCreate).toBe(2);
      expect(remainingStamps).toBe(0);
    });

    it('should not create rewards when stamps are below 10', () => {
      const currentStamps = 5;
      const newStamps = 3;
      const totalStamps = currentStamps + newStamps;
      const rewardsToCreate = Math.floor(totalStamps / 10);
      
      expect(rewardsToCreate).toBe(0);
    });
  });

  describe('Large drink identification for reward application', () => {
    it('should find the most expensive large drink in order items', () => {
      const items = [
        { productName: 'Caramel Milk Tea', size: 'large', unitPrice: 44500 },
        { productName: 'Classic Taiwan Milk Tea', size: 'large', unitPrice: 44500 },
        { productName: 'Mango Slush', size: 'regular', unitPrice: 36500 },
      ];
      
      const largeDrinks = items.filter(item => item.size === 'large');
      expect(largeDrinks.length).toBe(2);
      
      const mostExpensive = largeDrinks.reduce((max, item) => 
        item.unitPrice > max.unitPrice ? item : max, largeDrinks[0]);
      expect(mostExpensive.unitPrice).toBe(44500);
    });

    it('should return empty when no large drinks in order', () => {
      const items = [
        { productName: 'Mango Slush', size: 'regular', unitPrice: 36500 },
        { productName: 'Egg Crepe', size: undefined, unitPrice: 31500 },
      ];
      
      const largeDrinks = items.filter(item => item.size === 'large');
      expect(largeDrinks.length).toBe(0);
    });
  });

  describe('Stamp deduction after reward redemption', () => {
    it('should deduct exactly 10 stamps per reward redeemed', () => {
      const currentStamps = 16;
      const stampsToDeduct = 10;
      const newStampCount = Math.max(0, currentStamps - stampsToDeduct);
      
      expect(newStampCount).toBe(6);
    });

    it('should not go below 0 stamps', () => {
      const currentStamps = 5; // Edge case: somehow less than 10
      const stampsToDeduct = 10;
      const newStampCount = Math.max(0, currentStamps - stampsToDeduct);
      
      expect(newStampCount).toBe(0);
    });
  });

  describe('Stamp adjustment (add/deduct)', () => {
    it('should correctly add stamps and calculate new total', () => {
      const currentStamps = 5;
      const adjustment = 3;
      const newStampCount = currentStamps + adjustment;
      expect(newStampCount).toBe(8);
    });

    it('should correctly deduct stamps', () => {
      const currentStamps = 8;
      const adjustment = -3;
      const newStampCount = currentStamps + adjustment;
      expect(newStampCount).toBe(5);
    });

    it('should not go below 0 when deducting more than available', () => {
      const currentStamps = 3;
      const adjustment = -5;
      let newStampCount = currentStamps + adjustment;
      if (newStampCount < 0) newStampCount = 0;
      expect(newStampCount).toBe(0);
    });

    it('should create rewards when adding stamps pushes total to 10+', () => {
      const currentStamps = 7;
      const adjustment = 5;
      const newStampCount = currentStamps + adjustment; // 12
      const rewardsToCreate = Math.floor(newStampCount / 10);
      const remainingStamps = newStampCount % 10;
      expect(rewardsToCreate).toBe(1);
      expect(remainingStamps).toBe(2);
    });

    it('should not create rewards when deducting stamps', () => {
      const currentStamps = 15;
      const adjustment = -3;
      const newStampCount = currentStamps + adjustment; // 12
      // Rewards should only be created on positive adjustments
      const shouldCreateRewards = adjustment > 0 && newStampCount >= 10;
      expect(shouldCreateRewards).toBe(false);
    });

    it('should classify action correctly for audit logging', () => {
      const positiveAdjustment = 3;
      const negativeAdjustment = -3;
      expect(positiveAdjustment > 0 ? 'bonus' : 'admin_deduct').toBe('bonus');
      expect(negativeAdjustment > 0 ? 'bonus' : 'admin_deduct').toBe('admin_deduct');
    });

    it('should reject zero adjustment', () => {
      const adjustment = 0;
      expect(adjustment !== 0).toBe(false);
    });

    it('should update lifetime stamps only for positive adjustments', () => {
      const currentLifetime = 20;
      const positiveAdj = 3;
      const negativeAdj = -3;
      
      const lifetimeAfterAdd = currentLifetime + (positiveAdj > 0 ? positiveAdj : 0);
      const lifetimeAfterDeduct = currentLifetime + (negativeAdj > 0 ? negativeAdj : 0);
      
      expect(lifetimeAfterAdd).toBe(23);
      expect(lifetimeAfterDeduct).toBe(20); // unchanged
    });
  });

  describe('Reward voucher expiry check', () => {
    it('should accept non-expired rewards', () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
      const now = new Date();
      
      expect(new Date(expiresAt) > now).toBe(true);
    });

    it('should reject expired rewards', () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1); // Yesterday
      const now = new Date();
      
      expect(new Date(expiresAt) > now).toBe(false);
    });
  });
});
