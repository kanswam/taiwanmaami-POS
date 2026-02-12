import { describe, it, expect } from 'vitest';

describe('Top Customers - Staff/Admin Exclusion', () => {
  it('should exclude orders from staff users by userId', () => {
    const staffUserIds = new Set([10, 20]);
    const staffPhones = new Set(['7085637756', '9999999999']);

    const mockOrders = [
      { userId: 1, customerName: 'Customer A', customerPhone: '1111111111', totalAmount: 5000, orderStatus: 'completed' },
      { userId: 10, customerName: 'Rinold Thousen', customerPhone: '7085637756', totalAmount: 21000, orderStatus: 'completed' },
      { userId: 2, customerName: 'Customer B', customerPhone: '2222222222', totalAmount: 3000, orderStatus: 'completed' },
      { userId: 20, customerName: 'Admin User', customerPhone: '9999999999', totalAmount: 15000, orderStatus: 'completed' },
      { userId: 3, customerName: 'Customer C', customerPhone: '3333333333', totalAmount: 8000, orderStatus: 'completed' },
    ];

    const customerStats: Record<string, { name: string; phone: string; orders: number; totalSpent: number }> = {};
    mockOrders.forEach(order => {
      // Skip orders from staff/admin users
      if (order.userId && staffUserIds.has(order.userId)) return;
      if (order.customerPhone && staffPhones.has(order.customerPhone)) return;

      const key = order.customerPhone || `user_${order.userId}`;
      if (!customerStats[key]) customerStats[key] = {
        name: order.customerName || 'Guest',
        phone: order.customerPhone || '',
        orders: 0,
        totalSpent: 0,
      };
      customerStats[key].orders += 1;
      customerStats[key].totalSpent += order.totalAmount;
    });

    const result = Object.values(customerStats);
    result.sort((a, b) => b.totalSpent - a.totalSpent);

    // Should have 3 customers (staff excluded)
    expect(result.length).toBe(3);
    // Rinold and Admin should NOT be in the list
    expect(result.find(c => c.name === 'Rinold Thousen')).toBeUndefined();
    expect(result.find(c => c.name === 'Admin User')).toBeUndefined();
    // Real customers should be present
    expect(result[0].name).toBe('Customer C');
    expect(result[0].totalSpent).toBe(8000);
    expect(result[1].name).toBe('Customer A');
    expect(result[1].totalSpent).toBe(5000);
    expect(result[2].name).toBe('Customer B');
    expect(result[2].totalSpent).toBe(3000);
  });

  it('should exclude orders from staff users by phone number even without userId match', () => {
    const staffUserIds = new Set([10]);
    const staffPhones = new Set(['7085637756']);

    const mockOrders = [
      { userId: null, customerName: 'Rinold Thousen', customerPhone: '7085637756', totalAmount: 5000, orderStatus: 'completed' },
      { userId: null, customerName: 'Guest Customer', customerPhone: '4444444444', totalAmount: 2000, orderStatus: 'completed' },
    ];

    const customerStats: Record<string, { name: string; phone: string; orders: number; totalSpent: number }> = {};
    mockOrders.forEach(order => {
      if (order.userId && staffUserIds.has(order.userId)) return;
      if (order.customerPhone && staffPhones.has(order.customerPhone)) return;

      const key = order.customerPhone || `user_${order.userId}`;
      if (!customerStats[key]) customerStats[key] = {
        name: order.customerName || 'Guest',
        phone: order.customerPhone || '',
        orders: 0,
        totalSpent: 0,
      };
      customerStats[key].orders += 1;
      customerStats[key].totalSpent += order.totalAmount;
    });

    const result = Object.values(customerStats);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Guest Customer');
  });

  it('should still include customers when no staff exist', () => {
    const staffUserIds = new Set<number>();
    const staffPhones = new Set<string>();

    const mockOrders = [
      { userId: 1, customerName: 'Customer A', customerPhone: '1111111111', totalAmount: 5000, orderStatus: 'completed' },
      { userId: 2, customerName: 'Customer B', customerPhone: '2222222222', totalAmount: 3000, orderStatus: 'completed' },
    ];

    const customerStats: Record<string, { name: string; phone: string; orders: number; totalSpent: number }> = {};
    mockOrders.forEach(order => {
      if (order.userId && staffUserIds.has(order.userId)) return;
      if (order.customerPhone && staffPhones.has(order.customerPhone)) return;

      const key = order.customerPhone || `user_${order.userId}`;
      if (!customerStats[key]) customerStats[key] = {
        name: order.customerName || 'Guest',
        phone: order.customerPhone || '',
        orders: 0,
        totalSpent: 0,
      };
      customerStats[key].orders += 1;
      customerStats[key].totalSpent += order.totalAmount;
    });

    const result = Object.values(customerStats);
    expect(result.length).toBe(2);
  });

  it('should aggregate multiple orders per customer after exclusion', () => {
    const staffUserIds = new Set([10]);
    const staffPhones = new Set(['7085637756']);

    const mockOrders = [
      { userId: 1, customerName: 'Customer A', customerPhone: '1111111111', totalAmount: 5000, orderStatus: 'completed' },
      { userId: 1, customerName: 'Customer A', customerPhone: '1111111111', totalAmount: 3000, orderStatus: 'completed' },
      { userId: 10, customerName: 'Rinold Thousen', customerPhone: '7085637756', totalAmount: 21000, orderStatus: 'completed' },
    ];

    const customerStats: Record<string, { name: string; phone: string; orders: number; totalSpent: number }> = {};
    mockOrders.forEach(order => {
      if (order.userId && staffUserIds.has(order.userId)) return;
      if (order.customerPhone && staffPhones.has(order.customerPhone)) return;

      const key = order.customerPhone || `user_${order.userId}`;
      if (!customerStats[key]) customerStats[key] = {
        name: order.customerName || 'Guest',
        phone: order.customerPhone || '',
        orders: 0,
        totalSpent: 0,
      };
      customerStats[key].orders += 1;
      customerStats[key].totalSpent += order.totalAmount;
    });

    const result = Object.values(customerStats);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Customer A');
    expect(result[0].orders).toBe(2);
    expect(result[0].totalSpent).toBe(8000);
  });
});
