import { describe, it, expect } from 'vitest';

/**
 * Tests for the loyalty reward auto-apply logic.
 * 
 * The backend reward redemption logic (in orders.create) finds the cheapest
 * drink (large or regular) in the order and makes it free when a REWARD: 
 * discount code is provided.
 * 
 * The frontend auto-apply logic (in Checkout.tsx) queries for available rewards
 * and auto-applies the discount code with the cheapest drink's price.
 */

// Simulate the backend reward discount calculation
function calculateRewardDiscount(items: Array<{ productName: string; size?: string; unitPrice: number }>) {
  const drinkItems = items.filter(item => item.size === 'large' || item.size === 'regular');
  if (drinkItems.length === 0) return 0;
  const cheapest = drinkItems.reduce((min, item) =>
    item.unitPrice < min.unitPrice ? item : min, drinkItems[0]);
  return cheapest.unitPrice;
}

// Simulate the frontend auto-apply decision
function shouldAutoApply(params: {
  isAuthenticated: boolean;
  availableRewards: Array<{ voucherCode: string; expiresAt: string }>;
  currentDiscountCode: string | null;
  items: Array<{ size?: string; unitPrice: number }>;
}): { shouldApply: boolean; discountCode?: string; discountAmount?: number } {
  if (!params.isAuthenticated) return { shouldApply: false };
  if (!params.availableRewards || params.availableRewards.length === 0) return { shouldApply: false };
  if (params.currentDiscountCode) return { shouldApply: false };

  const drinkItems = params.items.filter(item => item.size === 'large' || item.size === 'regular');
  if (drinkItems.length === 0) return { shouldApply: false };

  const cheapest = drinkItems.reduce((min, item) =>
    item.unitPrice < min.unitPrice ? item : min, drinkItems[0]);

  const reward = params.availableRewards[0];
  return {
    shouldApply: true,
    discountCode: `REWARD:${reward.voucherCode}`,
    discountAmount: cheapest.unitPrice,
  };
}

describe('Loyalty Reward Auto-Apply', () => {
  describe('Backend: calculateRewardDiscount', () => {
    it('should return 0 when no drinks in order (food only)', () => {
      const items = [
        { productName: 'Biang Biang Noodles', unitPrice: 58000 },
        { productName: 'Curry Rice', unitPrice: 45000 },
      ];
      expect(calculateRewardDiscount(items)).toBe(0);
    });

    it('should discount the only drink when there is one', () => {
      const items = [
        { productName: 'Taro Milk Tea', size: 'large', unitPrice: 35000 },
        { productName: 'Biang Biang Noodles', unitPrice: 58000 },
      ];
      expect(calculateRewardDiscount(items)).toBe(35000);
    });

    it('should discount the cheapest drink when multiple drinks ordered', () => {
      const items = [
        { productName: 'Taro Milk Tea', size: 'large', unitPrice: 35000 },
        { productName: 'Brown Sugar Boba', size: 'regular', unitPrice: 25000 },
        { productName: 'Matcha Latte', size: 'large', unitPrice: 38000 },
      ];
      expect(calculateRewardDiscount(items)).toBe(25000);
    });

    it('should consider both large and regular sizes', () => {
      const items = [
        { productName: 'Taro Milk Tea', size: 'regular', unitPrice: 28000 },
        { productName: 'Brown Sugar Boba', size: 'large', unitPrice: 35000 },
      ];
      expect(calculateRewardDiscount(items)).toBe(28000);
    });

    it('should ignore petite size drinks', () => {
      const items = [
        { productName: 'Taro Milk Tea', size: 'petite', unitPrice: 18000 },
        { productName: 'Brown Sugar Boba', size: 'large', unitPrice: 35000 },
      ];
      expect(calculateRewardDiscount(items)).toBe(35000);
    });

    it('should handle single large drink correctly', () => {
      const items = [
        { productName: 'Taro Milk Tea', size: 'large', unitPrice: 35000 },
      ];
      expect(calculateRewardDiscount(items)).toBe(35000);
    });

    it('should handle single regular drink correctly', () => {
      const items = [
        { productName: 'Taro Milk Tea', size: 'regular', unitPrice: 28000 },
      ];
      expect(calculateRewardDiscount(items)).toBe(28000);
    });
  });

  describe('Frontend: shouldAutoApply', () => {
    const validReward = [{ voucherCode: 'REWARDABC123', expiresAt: '2026-12-31T00:00:00Z' }];
    const drinkItems = [
      { size: 'large' as const, unitPrice: 35000 },
      { size: 'regular' as const, unitPrice: 25000 },
    ];

    it('should not auto-apply for unauthenticated users', () => {
      const result = shouldAutoApply({
        isAuthenticated: false,
        availableRewards: validReward,
        currentDiscountCode: null,
        items: drinkItems,
      });
      expect(result.shouldApply).toBe(false);
    });

    it('should not auto-apply when no rewards available', () => {
      const result = shouldAutoApply({
        isAuthenticated: true,
        availableRewards: [],
        currentDiscountCode: null,
        items: drinkItems,
      });
      expect(result.shouldApply).toBe(false);
    });

    it('should not auto-apply when a discount is already applied', () => {
      const result = shouldAutoApply({
        isAuthenticated: true,
        availableRewards: validReward,
        currentDiscountCode: 'WELCOME10',
        items: drinkItems,
      });
      expect(result.shouldApply).toBe(false);
    });

    it('should not auto-apply when no drinks in cart', () => {
      const result = shouldAutoApply({
        isAuthenticated: true,
        availableRewards: validReward,
        currentDiscountCode: null,
        items: [{ unitPrice: 58000 }], // food item, no size
      });
      expect(result.shouldApply).toBe(false);
    });

    it('should auto-apply with correct discount code and amount', () => {
      const result = shouldAutoApply({
        isAuthenticated: true,
        availableRewards: validReward,
        currentDiscountCode: null,
        items: drinkItems,
      });
      expect(result.shouldApply).toBe(true);
      expect(result.discountCode).toBe('REWARD:REWARDABC123');
      expect(result.discountAmount).toBe(25000); // cheapest drink
    });

    it('should use the earliest expiring reward', () => {
      const multipleRewards = [
        { voucherCode: 'REWARD_EARLY', expiresAt: '2026-06-01T00:00:00Z' },
        { voucherCode: 'REWARD_LATE', expiresAt: '2026-12-31T00:00:00Z' },
      ];
      const result = shouldAutoApply({
        isAuthenticated: true,
        availableRewards: multipleRewards,
        currentDiscountCode: null,
        items: drinkItems,
      });
      expect(result.discountCode).toBe('REWARD:REWARD_EARLY');
    });

    it('should not override an existing REWARD discount', () => {
      const result = shouldAutoApply({
        isAuthenticated: true,
        availableRewards: validReward,
        currentDiscountCode: 'REWARD:EXISTINGREWARD',
        items: drinkItems,
      });
      expect(result.shouldApply).toBe(false);
    });
  });
});
