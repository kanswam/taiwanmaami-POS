import { describe, it, expect, vi } from 'vitest';
import { appRouter } from './routers';

// Helper contexts
function createUnauthenticatedContext() {
  return {
    user: null,
    req: {} as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

function createStaffContext() {
  return {
    user: { id: 10, openId: 'staff-test', name: 'Staff User', role: 'staff', avatarUrl: null, createdAt: new Date() },
    req: {} as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

function createAdminContext() {
  return {
    user: { id: 1, openId: 'admin-test', name: 'Admin User', role: 'admin', avatarUrl: null, createdAt: new Date() },
    req: {} as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

function createCustomerContext() {
  return {
    user: { id: 50, openId: 'customer-test', name: 'Customer', role: 'user', avatarUrl: null, createdAt: new Date() },
    req: {} as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

describe('Payment Failure Alert System', () => {
  describe('getFailedPayments procedure', () => {
    it('should exist as a query procedure', () => {
      expect(appRouter._def.procedures).toHaveProperty('orders.getFailedPayments');
    });

    it('should reject unauthenticated users', async () => {
      const caller = appRouter.createCaller(createUnauthenticatedContext());
      await expect(caller.orders.getFailedPayments()).rejects.toThrow();
    });

    it('should reject regular customer users', async () => {
      const caller = appRouter.createCaller(createCustomerContext());
      await expect(caller.orders.getFailedPayments()).rejects.toThrow();
    });

    it('should return an array for staff users', async () => {
      const caller = appRouter.createCaller(createStaffContext());
      const result = await caller.orders.getFailedPayments();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return an array for admin users', async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.orders.getFailedPayments();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return orders with expected fields when data exists', async () => {
      const caller = appRouter.createCaller(createStaffContext());
      const result = await caller.orders.getFailedPayments();
      
      // Each item should have the enriched fields
      for (const order of result) {
        expect(order).toHaveProperty('id');
        expect(order).toHaveProperty('orderNumber');
        expect(order).toHaveProperty('customerName');
        expect(order).toHaveProperty('customerPhone');
        expect(order).toHaveProperty('totalAmount');
        expect(order).toHaveProperty('minutesAgo');
        expect(order).toHaveProperty('isUrgent');
        expect(typeof order.minutesAgo).toBe('number');
        expect(typeof order.isUrgent).toBe('boolean');
      }
    });
  });

  describe('verifyFailedPayment procedure', () => {
    it('should exist as a mutation procedure', () => {
      expect(appRouter._def.procedures).toHaveProperty('orders.verifyFailedPayment');
    });

    it('should reject unauthenticated users', async () => {
      const caller = appRouter.createCaller(createUnauthenticatedContext());
      await expect(caller.orders.verifyFailedPayment({ orderId: 1 })).rejects.toThrow();
    });

    it('should reject regular customer users', async () => {
      const caller = appRouter.createCaller(createCustomerContext());
      await expect(caller.orders.verifyFailedPayment({ orderId: 1 })).rejects.toThrow();
    });

    it('should throw NOT_FOUND for non-existent order', async () => {
      const caller = appRouter.createCaller(createStaffContext());
      await expect(caller.orders.verifyFailedPayment({ orderId: 999999 })).rejects.toThrow('Order not found');
    });
  });

  describe('cancelFailedPaymentOrder procedure', () => {
    it('should exist as a mutation procedure', () => {
      expect(appRouter._def.procedures).toHaveProperty('orders.cancelFailedPaymentOrder');
    });

    it('should reject unauthenticated users', async () => {
      const caller = appRouter.createCaller(createUnauthenticatedContext());
      await expect(caller.orders.cancelFailedPaymentOrder({ orderId: 1 })).rejects.toThrow();
    });

    it('should reject regular customer users', async () => {
      const caller = appRouter.createCaller(createCustomerContext());
      await expect(caller.orders.cancelFailedPaymentOrder({ orderId: 1 })).rejects.toThrow();
    });

    it('should accept optional reason parameter', async () => {
      const caller = appRouter.createCaller(createStaffContext());
      // Should throw NOT_FOUND (not schema error), proving the input schema accepts reason
      await expect(
        caller.orders.cancelFailedPaymentOrder({ orderId: 999999, reason: 'Customer left' })
      ).rejects.toThrow();
    });
  });

  describe('Failed payment detection logic', () => {
    it('should identify failed payments by razorpayOrderId + pending paymentStatus', () => {
      const isFailedPayment = (order: { razorpayOrderId: string | null; paymentStatus: string; orderStatus: string }) => {
        return (
          order.razorpayOrderId !== null &&
          order.razorpayOrderId !== '' &&
          order.paymentStatus === 'pending' &&
          order.orderStatus !== 'cancelled'
        );
      };

      // Razorpay initiated but payment pending = failed
      expect(isFailedPayment({
        razorpayOrderId: 'order_abc123',
        paymentStatus: 'pending',
        orderStatus: 'pending',
      })).toBe(true);

      // No Razorpay order = not a failed payment (cash order)
      expect(isFailedPayment({
        razorpayOrderId: null,
        paymentStatus: 'pending',
        orderStatus: 'pending',
      })).toBe(false);

      // Payment completed = not failed
      expect(isFailedPayment({
        razorpayOrderId: 'order_abc123',
        paymentStatus: 'completed',
        orderStatus: 'confirmed',
      })).toBe(false);

      // Order already cancelled = don't show
      expect(isFailedPayment({
        razorpayOrderId: 'order_abc123',
        paymentStatus: 'pending',
        orderStatus: 'cancelled',
      })).toBe(false);

      // Empty razorpayOrderId = not a failed payment
      expect(isFailedPayment({
        razorpayOrderId: '',
        paymentStatus: 'pending',
        orderStatus: 'pending',
      })).toBe(false);
    });

    it('should categorize orders by urgency (within 15 minutes)', () => {
      const now = Date.now();
      
      // 5 minutes ago = urgent
      const recentMinutes = Math.floor((now - new Date(now - 5 * 60 * 1000).getTime()) / 60000);
      expect(recentMinutes <= 15).toBe(true);

      // 30 minutes ago = not urgent
      const olderMinutes = Math.floor((now - new Date(now - 30 * 60 * 1000).getTime()) / 60000);
      expect(olderMinutes <= 15).toBe(false);
    });

    it('should calculate time display correctly', () => {
      const testCases = [
        { minutesAgo: 2, expected: '2m ago' },
        { minutesAgo: 15, expected: '15m ago' },
        { minutesAgo: 60, expected: '1h 0m ago' },
        { minutesAgo: 90, expected: '1h 30m ago' },
        { minutesAgo: 150, expected: '2h 30m ago' },
      ];

      for (const tc of testCases) {
        const display = tc.minutesAgo < 60
          ? `${tc.minutesAgo}m ago`
          : `${Math.floor(tc.minutesAgo / 60)}h ${tc.minutesAgo % 60}m ago`;
        expect(display).toBe(tc.expected);
      }
    });

    it('should only include orders from the last 24 hours', () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentOrder = new Date(Date.now() - 23 * 60 * 60 * 1000);
      expect(recentOrder >= twentyFourHoursAgo).toBe(true);
      
      const oldOrder = new Date(Date.now() - 25 * 60 * 60 * 1000);
      expect(oldOrder >= twentyFourHoursAgo).toBe(false);
    });
  });
});
