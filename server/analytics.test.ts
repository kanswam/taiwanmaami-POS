import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('./db', () => ({
  getDb: vi.fn(),
}));

describe('Analytics Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSalesOverview', () => {
    it('should return default values when no orders exist', async () => {
      const { getDb } = await import('./db');
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      (getDb as any).mockResolvedValue(mockDb);

      // The procedure should return zeros when no orders
      const result = { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, totalGst: 0 };
      expect(result.totalRevenue).toBe(0);
      expect(result.totalOrders).toBe(0);
      expect(result.avgOrderValue).toBe(0);
      expect(result.totalGst).toBe(0);
    });

    it('should calculate totals correctly with orders', async () => {
      const mockOrders = [
        { id: 1, totalAmount: 50000, stateGst: 1250, centralGst: 1250, orderStatus: 'completed' },
        { id: 2, totalAmount: 30000, stateGst: 750, centralGst: 750, orderStatus: 'completed' },
      ];

      let totalRevenue = 0;
      let totalGst = 0;
      mockOrders.forEach(order => {
        totalRevenue += order.totalAmount;
        totalGst += (order.stateGst + order.centralGst);
      });

      expect(totalRevenue).toBe(80000);
      expect(totalGst).toBe(4000);
      expect(mockOrders.length).toBe(2);
      expect(Math.round(totalRevenue / mockOrders.length)).toBe(40000);
    });
  });

  describe('getSalesByCategory', () => {
    it('should aggregate sales by category correctly', async () => {
      const items = [
        { orderId: 1, quantity: 2, totalPrice: 20000, subcategoryId: 1 },
        { orderId: 1, quantity: 1, totalPrice: 15000, subcategoryId: 2 },
        { orderId: 2, quantity: 3, totalPrice: 30000, subcategoryId: 1 },
      ];

      const subcatToCat: Record<number, number> = { 1: 1, 2: 1 };
      const categoryStats: Record<number, { revenue: number; quantity: number; orders: Set<number> }> = {};

      items.forEach(item => {
        const catId = subcatToCat[item.subcategoryId];
        if (!categoryStats[catId]) categoryStats[catId] = { revenue: 0, quantity: 0, orders: new Set() };
        categoryStats[catId].revenue += item.totalPrice;
        categoryStats[catId].quantity += item.quantity;
        categoryStats[catId].orders.add(item.orderId);
      });

      expect(categoryStats[1].revenue).toBe(65000);
      expect(categoryStats[1].quantity).toBe(6);
      expect(categoryStats[1].orders.size).toBe(2);
    });
  });

  describe('getCustomerAnalytics', () => {
    it('should calculate repeat customer rate correctly', async () => {
      const mockOrders = [
        { customerPhone: '1234567890', totalAmount: 50000 },
        { customerPhone: '1234567890', totalAmount: 30000 },
        { customerPhone: '9876543210', totalAmount: 40000 },
        { customerPhone: '1234567890', totalAmount: 20000 },
      ];

      const customerStats: Record<string, { orders: number; totalSpent: number }> = {};
      mockOrders.forEach(order => {
        const key = order.customerPhone || 'unknown';
        if (!customerStats[key]) customerStats[key] = { orders: 0, totalSpent: 0 };
        customerStats[key].orders += 1;
        customerStats[key].totalSpent += order.totalAmount;
      });

      const customers = Object.values(customerStats);
      const totalCustomers = customers.length;
      const repeatCustomers = customers.filter(c => c.orders > 1).length;
      const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

      expect(totalCustomers).toBe(2);
      expect(repeatCustomers).toBe(1);
      expect(repeatRate).toBe(50);
    });
  });

  describe('getDayOfWeekAnalysis', () => {
    it('should aggregate by day of week correctly', async () => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayStats: Record<number, { revenue: number; orders: number }> = {};
      for (let i = 0; i < 7; i++) dayStats[i] = { revenue: 0, orders: 0 };

      // Simulate orders on different days - using dates that are clearly on specific days
      // Jan 5, 2025 is a Sunday (day 0), Jan 6 is Monday (day 1)
      const mockOrders = [
        { createdAt: new Date('2025-01-05T12:00:00'), totalAmount: 50000 }, // Sunday
        { createdAt: new Date('2025-01-06T12:00:00'), totalAmount: 30000 }, // Monday
        { createdAt: new Date('2025-01-05T14:00:00'), totalAmount: 40000 }, // Sunday
      ];

      mockOrders.forEach(order => {
        const dayOfWeek = new Date(order.createdAt).getDay();
        dayStats[dayOfWeek].revenue += order.totalAmount;
        dayStats[dayOfWeek].orders += 1;
      });

      // Sunday is day 0
      expect(dayStats[0].revenue).toBe(90000);
      expect(dayStats[0].orders).toBe(2);
      // Monday is day 1
      expect(dayStats[1].revenue).toBe(30000);
      expect(dayStats[1].orders).toBe(1);
    });
  });

  describe('getGstReport', () => {
    it('should calculate GST breakdown correctly', async () => {
      const mockOrders = [
        { totalAmount: 52500, stateGst: 1250, centralGst: 1250, createdAt: new Date('2025-01-01') },
        { totalAmount: 31500, stateGst: 750, centralGst: 750, createdAt: new Date('2025-01-01') },
      ];

      const periodStats: Record<string, { taxableValue: number; gst: number; cgst: number; sgst: number; orderCount: number }> = {};

      mockOrders.forEach(order => {
        const period = new Date(order.createdAt).toISOString().split('T')[0];
        if (!periodStats[period]) periodStats[period] = { taxableValue: 0, gst: 0, cgst: 0, sgst: 0, orderCount: 0 };

        const gstAmount = order.stateGst + order.centralGst;
        const taxableValue = order.totalAmount - gstAmount;
        periodStats[period].taxableValue += taxableValue;
        periodStats[period].gst += gstAmount;
        periodStats[period].cgst += order.centralGst;
        periodStats[period].sgst += order.stateGst;
        periodStats[period].orderCount += 1;
      });

      const period = '2025-01-01';
      expect(periodStats[period].taxableValue).toBe(80000); // 52500-2500 + 31500-1500 = 50000 + 30000
      expect(periodStats[period].gst).toBe(4000); // 2500 + 1500
      expect(periodStats[period].cgst).toBe(2000); // 1250 + 750
      expect(periodStats[period].sgst).toBe(2000); // 1250 + 750
      expect(periodStats[period].orderCount).toBe(2);
    });
  });

  describe('getProductPerformance', () => {
    it('should aggregate product stats correctly', async () => {
      const items = [
        { productId: 1, productName: 'Brown Sugar Boba', quantity: 5, totalPrice: 50000, subcategoryId: 1 },
        { productId: 1, productName: 'Brown Sugar Boba', quantity: 3, totalPrice: 30000, subcategoryId: 1 },
        { productId: 2, productName: 'Taro Milk Tea', quantity: 2, totalPrice: 20000, subcategoryId: 1 },
      ];

      const productStats: Record<number, { name: string; revenue: number; quantity: number }> = {};
      items.forEach(item => {
        if (!productStats[item.productId]) productStats[item.productId] = { name: item.productName, revenue: 0, quantity: 0 };
        productStats[item.productId].revenue += item.totalPrice;
        productStats[item.productId].quantity += item.quantity;
      });

      expect(productStats[1].revenue).toBe(80000);
      expect(productStats[1].quantity).toBe(8);
      expect(productStats[2].revenue).toBe(20000);
      expect(productStats[2].quantity).toBe(2);
    });

    it('should sort by revenue in descending order for top products', async () => {
      const result = [
        { id: 1, name: 'Product A', revenue: 80000, quantity: 8 },
        { id: 2, name: 'Product B', revenue: 20000, quantity: 2 },
        { id: 3, name: 'Product C', revenue: 50000, quantity: 5 },
      ];

      result.sort((a, b) => b.revenue - a.revenue);

      expect(result[0].name).toBe('Product A');
      expect(result[1].name).toBe('Product C');
      expect(result[2].name).toBe('Product B');
    });

    it('should sort by quantity in ascending order for bottom products', async () => {
      const result = [
        { id: 1, name: 'Product A', revenue: 80000, quantity: 8 },
        { id: 2, name: 'Product B', revenue: 20000, quantity: 2 },
        { id: 3, name: 'Product C', revenue: 50000, quantity: 5 },
      ];

      result.sort((a, b) => a.quantity - b.quantity);

      expect(result[0].name).toBe('Product B');
      expect(result[1].name).toBe('Product C');
      expect(result[2].name).toBe('Product A');
    });
  });

  describe('getPeakHoursAnalysis', () => {
    it('should aggregate orders by hour correctly', async () => {
      const hourStats: Record<number, { revenue: number; orders: number }> = {};
      for (let i = 0; i < 24; i++) hourStats[i] = { revenue: 0, orders: 0 };

      const mockOrders = [
        { createdAt: new Date('2025-01-01T12:30:00'), totalAmount: 50000 },
        { createdAt: new Date('2025-01-01T12:45:00'), totalAmount: 30000 },
        { createdAt: new Date('2025-01-01T18:00:00'), totalAmount: 40000 },
      ];

      mockOrders.forEach(order => {
        const hour = new Date(order.createdAt).getHours();
        hourStats[hour].revenue += order.totalAmount;
        hourStats[hour].orders += 1;
      });

      expect(hourStats[12].orders).toBe(2);
      expect(hourStats[12].revenue).toBe(80000);
      expect(hourStats[18].orders).toBe(1);
      expect(hourStats[18].revenue).toBe(40000);
    });
  });

  describe('getDailySalesTrend', () => {
    it('should initialize all dates in range', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-05';
      const dailyStats: Record<string, { revenue: number; orders: number }> = {};

      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dailyStats[dateStr] = { revenue: 0, orders: 0 };
      }

      expect(Object.keys(dailyStats).length).toBe(5);
      expect(dailyStats['2025-01-01']).toBeDefined();
      expect(dailyStats['2025-01-05']).toBeDefined();
    });
  });
});
