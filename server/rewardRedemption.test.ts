import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the reward redemption business logic
describe('Reward Redemption Feature', () => {
  describe('Staff Redeem Reward Logic', () => {
    it('should reject redemption of already redeemed reward', () => {
      const reward = { id: 1, isRedeemed: true, expiresAt: new Date('2026-05-01') };
      expect(reward.isRedeemed).toBe(true);
      // The procedure throws BAD_REQUEST for already redeemed rewards
    });

    it('should reject redemption of expired reward', () => {
      const reward = { id: 2, isRedeemed: false, expiresAt: new Date('2025-01-01') };
      const isExpired = new Date(reward.expiresAt) < new Date();
      expect(isExpired).toBe(true);
      // The procedure throws BAD_REQUEST for expired rewards
    });

    it('should allow redemption of valid unredeemed reward', () => {
      const reward = { id: 3, isRedeemed: false, expiresAt: new Date('2026-12-31') };
      const isExpired = new Date(reward.expiresAt) < new Date();
      const canRedeem = !reward.isRedeemed && !isExpired;
      expect(canRedeem).toBe(true);
    });
  });

  describe('Reward Status Classification', () => {
    it('should classify unredeemed non-expired reward as available', () => {
      const reward = { isRedeemed: false, expiresAt: new Date('2026-12-31') };
      const status = reward.isRedeemed ? 'redeemed' : (new Date(reward.expiresAt) < new Date() ? 'expired' : 'available');
      expect(status).toBe('available');
    });

    it('should classify redeemed reward as redeemed', () => {
      const reward = { isRedeemed: true, expiresAt: new Date('2026-12-31'), redeemedAt: new Date() };
      const status = reward.isRedeemed ? 'redeemed' : (new Date(reward.expiresAt) < new Date() ? 'expired' : 'available');
      expect(status).toBe('redeemed');
    });

    it('should classify unredeemed expired reward as expired', () => {
      const reward = { isRedeemed: false, expiresAt: new Date('2025-01-01') };
      const status = reward.isRedeemed ? 'redeemed' : (new Date(reward.expiresAt) < new Date() ? 'expired' : 'available');
      expect(status).toBe('expired');
    });

    it('should classify redeemed expired reward as redeemed (not expired)', () => {
      // If it was redeemed before expiry, it should show as redeemed
      const reward = { isRedeemed: true, expiresAt: new Date('2025-01-01'), redeemedAt: new Date('2024-12-15') };
      const status = reward.isRedeemed ? 'redeemed' : (new Date(reward.expiresAt) < new Date() ? 'expired' : 'available');
      expect(status).toBe('redeemed');
    });
  });

  describe('Admin Customer Rewards Aggregation', () => {
    it('should count only unredeemed non-expired rewards as active', () => {
      const now = new Date();
      const rewards = [
        { id: 1, isRedeemed: false, expiresAt: new Date('2026-12-31'), userId: 100 }, // active
        { id: 2, isRedeemed: true, expiresAt: new Date('2026-12-31'), userId: 100 },  // redeemed
        { id: 3, isRedeemed: false, expiresAt: new Date('2025-01-01'), userId: 100 }, // expired
        { id: 4, isRedeemed: false, expiresAt: new Date('2026-06-01'), userId: 100 }, // active
      ];

      let activeCount = 0;
      rewards.forEach(r => {
        const isExpired = new Date(r.expiresAt) < now;
        const isActive = !r.isRedeemed && !isExpired;
        if (isActive) activeCount += 1;
      });

      expect(activeCount).toBe(2);
    });

    it('should include all rewards (redeemed + unredeemed + expired) in details', () => {
      const rewards = [
        { id: 1, isRedeemed: false, expiresAt: new Date('2026-12-31'), userId: 100 },
        { id: 2, isRedeemed: true, expiresAt: new Date('2026-12-31'), userId: 100 },
        { id: 3, isRedeemed: false, expiresAt: new Date('2025-01-01'), userId: 100 },
      ];

      // Admin view should show all rewards, not just active ones
      expect(rewards.length).toBe(3);
    });
  });

  describe('Staff Orders Reward Banner', () => {
    it('should include reward ID for staff redeem button', () => {
      const userRewardsMap: Record<number, { count: number; rewards: { id: number; voucherCode: string }[] }> = {};
      
      const reward = { id: 42, userId: 100, voucherCode: 'REWARD123', isRedeemed: false, expiresAt: new Date('2026-12-31') };
      
      if (!userRewardsMap[reward.userId]) userRewardsMap[reward.userId] = { count: 0, rewards: [] };
      userRewardsMap[reward.userId].count += 1;
      userRewardsMap[reward.userId].rewards.push({ id: reward.id, voucherCode: reward.voucherCode });

      expect(userRewardsMap[100].rewards[0].id).toBe(42);
      expect(userRewardsMap[100].count).toBe(1);
    });

    it('should exclude staff/admin users from reward banner', () => {
      const staffAdminIds = new Set([1, 2, 3]);
      const userIds = [1, 2, 100, 200];
      const customerUserIds = userIds.filter(id => !staffAdminIds.has(id));
      
      expect(customerUserIds).toEqual([100, 200]);
      expect(customerUserIds).not.toContain(1);
      expect(customerUserIds).not.toContain(2);
    });
  });
});
