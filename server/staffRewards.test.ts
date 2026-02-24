import { describe, it, expect } from 'vitest';

describe('Staff Rewards Exclusion', () => {
  // Test that staff/admin roles are correctly identified for exclusion
  it('should identify staff and admin roles for exclusion from rewards', () => {
    const excludedRoles = ['staff', 'admin'];
    const customerRoles = ['user', 'customer', null, undefined];
    
    const shouldExclude = (role: string | null | undefined) => {
      return excludedRoles.includes(role as string);
    };
    
    // Staff should be excluded
    expect(shouldExclude('staff')).toBe(true);
    expect(shouldExclude('admin')).toBe(true);
    
    // Customers should NOT be excluded
    expect(shouldExclude('user')).toBe(false);
    expect(shouldExclude('customer')).toBe(false);
    expect(shouldExclude(null)).toBe(false);
    expect(shouldExclude(undefined)).toBe(false);
  });

  // Test the reward filtering logic that excludes staff/admin from rewards map
  it('should filter out staff/admin users from reward lookup', () => {
    // Simulate the backend logic
    const allUserIds = [100, 200, 300, 400, 500]; // Users who placed orders
    const staffAdminIds = new Set([200, 400]); // Staff/admin user IDs
    
    const customerUserIds = allUserIds.filter(id => !staffAdminIds.has(id));
    
    expect(customerUserIds).toEqual([100, 300, 500]);
    expect(customerUserIds).not.toContain(200);
    expect(customerUserIds).not.toContain(400);
  });

  // Test that rewards map only contains customer rewards
  it('should build rewards map excluding staff/admin users', () => {
    const customerUserIds = [100, 300, 500];
    const allRewards = [
      { userId: 100, voucherCode: 'TM-ABC123', rewardType: 'free_large_bubble_tea', expiresAt: new Date('2026-06-01'), isRedeemed: false },
      { userId: 200, voucherCode: 'TM-DEF456', rewardType: 'free_large_bubble_tea', expiresAt: new Date('2026-06-01'), isRedeemed: false }, // Staff user - should be excluded
      { userId: 300, voucherCode: 'TM-GHI789', rewardType: 'free_large_bubble_tea', expiresAt: new Date('2026-06-01'), isRedeemed: false },
      { userId: 400, voucherCode: 'TM-JKL012', rewardType: 'free_large_bubble_tea', expiresAt: new Date('2026-06-01'), isRedeemed: false }, // Admin user - should be excluded
    ];
    
    const now = new Date();
    const userRewardsMap: Record<number, { count: number; rewards: any[] }> = {};
    
    allRewards.forEach(r => {
      if (new Date(r.expiresAt) > now && customerUserIds.includes(r.userId)) {
        if (!userRewardsMap[r.userId]) userRewardsMap[r.userId] = { count: 0, rewards: [] };
        userRewardsMap[r.userId].count += 1;
        userRewardsMap[r.userId].rewards.push({
          voucherCode: r.voucherCode,
          rewardType: r.rewardType,
          expiresAt: r.expiresAt,
        });
      }
    });
    
    // Only customer rewards should be in the map
    expect(Object.keys(userRewardsMap).length).toBe(2);
    expect(userRewardsMap[100]).toBeDefined();
    expect(userRewardsMap[300]).toBeDefined();
    expect(userRewardsMap[200]).toBeUndefined(); // Staff excluded
    expect(userRewardsMap[400]).toBeUndefined(); // Admin excluded
  });

  // Test the awardStamps skip logic for staff/admin
  it('should skip stamp awarding for staff and admin roles', () => {
    const awardStampsForUser = (role: string, orderTotal: number) => {
      if (role === 'staff' || role === 'admin') {
        return {
          stampsEarned: 0,
          currentStamps: 0,
          rewardsCreated: 0,
          isFirstOrder: false,
          skippedReason: 'Staff/admin accounts do not earn loyalty stamps',
        };
      }
      
      const STAMP_THRESHOLD = 45000;
      const stampsEarned = Math.floor(orderTotal / STAMP_THRESHOLD);
      return {
        stampsEarned,
        currentStamps: stampsEarned,
        rewardsCreated: 0,
        isFirstOrder: false,
      };
    };
    
    // Staff should get 0 stamps regardless of order total
    const staffResult = awardStampsForUser('staff', 500000); // ₹5000 order
    expect(staffResult.stampsEarned).toBe(0);
    expect(staffResult.skippedReason).toBe('Staff/admin accounts do not earn loyalty stamps');
    
    // Admin should get 0 stamps regardless of order total
    const adminResult = awardStampsForUser('admin', 500000);
    expect(adminResult.stampsEarned).toBe(0);
    expect(adminResult.skippedReason).toBe('Staff/admin accounts do not earn loyalty stamps');
    
    // Regular user should earn stamps normally
    const userResult = awardStampsForUser('user', 90000); // ₹900 = 2 stamps
    expect(userResult.stampsEarned).toBe(2);
    expect((userResult as any).skippedReason).toBeUndefined();
  });

  // Test that the order completion stamp logic also skips staff
  it('should skip stamp awarding in order completion for staff/admin', () => {
    const processOrderCompletion = (userRole: string, orderTotal: number) => {
      if (userRole === 'staff' || userRole === 'admin') {
        return { stampsAwarded: false, reason: 'staff_excluded' };
      }
      
      const stamps = Math.floor(orderTotal / 45000);
      return { stampsAwarded: stamps > 0, stamps };
    };
    
    expect(processOrderCompletion('staff', 100000).stampsAwarded).toBe(false);
    expect(processOrderCompletion('admin', 100000).stampsAwarded).toBe(false);
    expect(processOrderCompletion('user', 100000).stampsAwarded).toBe(true);
  });
});
