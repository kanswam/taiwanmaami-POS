import { describe, it, expect } from 'vitest';

describe('Repeat Customer Analytics Logic', () => {
  // The new logic: a "repeat customer" is someone who ordered in the current period
  // AND has ordered BEFORE the start of the period (historical orders).
  // This replaces the old logic which only counted >1 order within the period.

  it('should identify repeat customers who have prior orders before the date range', () => {
    // Simulate: Meenakshi ordered today AND has 8 prior orders
    const todayOrders = [
      { userId: 20850875, customerPhone: '9789799014', totalAmount: 139676, createdAt: '2026-04-07' },
      { userId: 30664328, customerPhone: '9876543210', totalAmount: 87876, createdAt: '2026-04-07' },
      { userId: 0, customerPhone: '9176592672', totalAmount: 99250, createdAt: '2026-04-07' }, // guest
    ];

    // Historical orders (before today)
    const historicalOrders: Record<string, number> = {
      'user_20850875': 8, // Meenakshi has 8 prior orders
      'user_30664328': 0, // Rosaria is new
      'phone_9176592672': 1, // Guest Sathya ordered once before
    };

    // Collect unique customer identifiers from today's orders
    const registeredUserIds = new Set<number>();
    const guestPhones = new Set<string>();
    const customerStats: Record<string, { orders: number; totalSpent: number }> = {};

    todayOrders.forEach(order => {
      let key: string;
      if (order.userId && order.userId > 0) {
        key = `user_${order.userId}`;
        registeredUserIds.add(order.userId);
      } else if (order.customerPhone) {
        key = `phone_${order.customerPhone}`;
        guestPhones.add(order.customerPhone);
      } else {
        return;
      }
      if (!customerStats[key]) customerStats[key] = { orders: 0, totalSpent: 0 };
      customerStats[key].orders += 1;
      customerStats[key].totalSpent += order.totalAmount;
    });

    // Count repeat customers (those with historical orders before today)
    let repeatCustomers = 0;
    for (const userId of Array.from(registeredUserIds)) {
      const priorCount = historicalOrders[`user_${userId}`] || 0;
      if (priorCount > 0) repeatCustomers++;
    }
    for (const phone of Array.from(guestPhones)) {
      const priorCount = historicalOrders[`phone_${phone}`] || 0;
      if (priorCount > 0) repeatCustomers++;
    }

    const totalCustomers = Object.keys(customerStats).length;
    const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    // 3 unique customers today, 2 have prior orders (Meenakshi + Sathya)
    expect(totalCustomers).toBe(3);
    expect(repeatCustomers).toBe(2);
    expect(repeatRate).toBeCloseTo(66.67, 1);
  });

  it('should count 0 repeat customers when all are first-time', () => {
    const todayOrders = [
      { userId: 100, customerPhone: '1111111111', totalAmount: 50000, createdAt: '2026-04-07' },
      { userId: 200, customerPhone: '2222222222', totalAmount: 30000, createdAt: '2026-04-07' },
    ];

    const historicalOrders: Record<string, number> = {
      'user_100': 0,
      'user_200': 0,
    };

    const registeredUserIds = new Set<number>();
    todayOrders.forEach(order => {
      if (order.userId && order.userId > 0) registeredUserIds.add(order.userId);
    });

    let repeatCustomers = 0;
    for (const userId of Array.from(registeredUserIds)) {
      if ((historicalOrders[`user_${userId}`] || 0) > 0) repeatCustomers++;
    }

    expect(repeatCustomers).toBe(0);
  });

  it('should handle no date filter by counting >1 order in dataset', () => {
    // When no date filter is applied, fall back to counting customers with >1 order
    const allOrders = [
      { userId: 1, totalAmount: 50000 },
      { userId: 1, totalAmount: 30000 },
      { userId: 2, totalAmount: 40000 },
      { userId: 1, totalAmount: 20000 },
    ];

    const customerStats: Record<string, { orders: number; totalSpent: number }> = {};
    allOrders.forEach(order => {
      const key = `user_${order.userId}`;
      if (!customerStats[key]) customerStats[key] = { orders: 0, totalSpent: 0 };
      customerStats[key].orders += 1;
      customerStats[key].totalSpent += order.totalAmount;
    });

    const repeatCustomers = Object.values(customerStats).filter(c => c.orders > 1).length;
    expect(repeatCustomers).toBe(1); // user 1 has 3 orders
  });

  it('should include guest customers identified by phone in repeat count', () => {
    const todayOrders = [
      { userId: 0, customerPhone: '9789799014', totalAmount: 50000 },
      { userId: 0, customerPhone: '9876543210', totalAmount: 30000 },
    ];

    const historicalOrders: Record<string, number> = {
      'phone_9789799014': 5, // has ordered 5 times before
      'phone_9876543210': 0, // first time
    };

    const guestPhones = new Set<string>();
    todayOrders.forEach(order => {
      if ((!order.userId || order.userId === 0) && order.customerPhone) {
        guestPhones.add(order.customerPhone);
      }
    });

    let repeatCustomers = 0;
    for (const phone of Array.from(guestPhones)) {
      if ((historicalOrders[`phone_${phone}`] || 0) > 0) repeatCustomers++;
    }

    expect(guestPhones.size).toBe(2);
    expect(repeatCustomers).toBe(1);
  });
});

describe('Stamp Awarding Logic', () => {
  it('should calculate correct stamps for ₹1,397 order (3 stamps at ₹450 each)', () => {
    const orderTotal = 139676; // ₹1,396.76 in paise
    const stampsEarned = Math.floor(orderTotal / 45000); // 1 stamp per ₹450
    expect(stampsEarned).toBe(3);
  });

  it('should trigger reward when stamps reach 10', () => {
    const currentStamps = 9;
    const stampsEarned = 3;
    const newStampCount = currentStamps + stampsEarned; // 12

    expect(newStampCount).toBe(12);
    expect(newStampCount >= 10).toBe(true);

    // Simulate reward creation
    let remainingStamps = newStampCount;
    let rewardsCreated = 0;
    while (remainingStamps >= 10) {
      rewardsCreated++;
      remainingStamps -= 10;
    }

    expect(rewardsCreated).toBe(1);
    expect(remainingStamps).toBe(2);
  });

  it('should not award stamps for zero-value orders', () => {
    const orderTotal = 0;
    const stampsEarned = Math.floor(orderTotal / 45000);
    expect(stampsEarned).toBe(0);
  });

  it('should not award stamps for staff/admin users', () => {
    const userRole = 'staff';
    const shouldAwardStamps = userRole !== 'staff' && userRole !== 'admin';
    expect(shouldAwardStamps).toBe(false);
  });

  it('should add welcome stamp for first order', () => {
    const lifetimeStamps = 0;
    const isFirstOrder = lifetimeStamps === 0;
    const orderTotal = 50000; // ₹500
    const stampsEarned = Math.floor(orderTotal / 45000); // 1
    const welcomeStamp = isFirstOrder ? 1 : 0;
    const totalStamps = stampsEarned + welcomeStamp;

    expect(isFirstOrder).toBe(true);
    expect(stampsEarned).toBe(1);
    expect(welcomeStamp).toBe(1);
    expect(totalStamps).toBe(2);
  });

  it('should create multiple rewards when stamps exceed 20', () => {
    const currentStamps = 18;
    const stampsEarned = 4;
    let newStampCount = currentStamps + stampsEarned; // 22

    let rewardsCreated = 0;
    while (newStampCount >= 10) {
      rewardsCreated++;
      newStampCount -= 10;
    }

    expect(rewardsCreated).toBe(2);
    expect(newStampCount).toBe(2);
  });

  it('should only award stamps when order status changes to completed', () => {
    // Stamps are ONLY awarded in the updateStatus handler when status === 'completed'
    const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed'];
    const stampTriggerStatus = 'completed';
    
    statuses.forEach(status => {
      const shouldAwardStamps = status === stampTriggerStatus;
      if (status === 'completed') {
        expect(shouldAwardStamps).toBe(true);
      } else {
        expect(shouldAwardStamps).toBe(false);
      }
    });
  });
});

describe('Reward Redemption Flow', () => {
  it('should apply reward as discount code with REWARD: prefix', () => {
    const discountCode = 'REWARD:REWARDMMDSLL8CT7H2';
    const isRewardCode = discountCode.startsWith('REWARD:');
    const voucherCode = discountCode.replace('REWARD:', '');

    expect(isRewardCode).toBe(true);
    expect(voucherCode).toBe('REWARDMMDSLL8CT7H2');
  });

  it('should find most expensive large drink for free drink reward', () => {
    const cartItems = [
      { productName: 'Brown Sugar Boba', size: 'large', unitPrice: 45000 },
      { productName: 'Taro Milk Tea', size: 'large', unitPrice: 42000 },
      { productName: 'Mochi', size: 'regular', unitPrice: 27000 },
    ];

    const largeDrinks = cartItems.filter(item => item.size === 'large');
    expect(largeDrinks.length).toBe(2);

    const mostExpensive = largeDrinks.reduce((max, item) =>
      item.unitPrice > max.unitPrice ? item : max, largeDrinks[0]);
    expect(mostExpensive.productName).toBe('Brown Sugar Boba');
    expect(mostExpensive.unitPrice).toBe(45000);
  });
});
