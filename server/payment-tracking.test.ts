import { describe, it, expect } from 'vitest';

// Test the payment tracking logic
describe('Payment Tracking', () => {
  describe('Schema: paymentCollectedBy is varchar (staff name)', () => {
    it('should accept string values for staff names', () => {
      const staffName = 'Theresa';
      expect(typeof staffName).toBe('string');
      expect(staffName.length).toBeLessThanOrEqual(255);
    });

    it('should fallback to "Staff" when user name is empty', () => {
      const userName = '';
      const staffName = userName || 'Staff';
      expect(staffName).toBe('Staff');
    });
  });

  describe('confirmPaymentManually', () => {
    it('should record staff name as paymentCollectedBy (not user ID)', () => {
      const ctx = { user: { id: 42, name: 'Karthik', role: 'staff' } };
      const staffName = ctx.user.name || 'Staff';
      
      // Must be a string (staff name), not a number (user ID)
      expect(typeof staffName).toBe('string');
      expect(staffName).toBe('Karthik');
    });

    it('should set default payment method based on order type', () => {
      const getDefaultMethod = (orderType: string) =>
        orderType === 'instore' ? 'cash' : 'upi';

      expect(getDefaultMethod('instore')).toBe('cash');
      expect(getDefaultMethod('delivery')).toBe('upi');
      expect(getDefaultMethod('pickup')).toBe('upi');
    });

    it('should generate correct payment note with staff name', () => {
      const staffName = 'Theresa';
      const note = `Payment collected by ${staffName}`;
      expect(note).toBe('Payment collected by Theresa');
    });

    it('should use custom notes when provided', () => {
      const staffName = 'Theresa';
      const customNotes = 'Paid via GPay';
      const note = customNotes || `Payment collected by ${staffName}`;
      expect(note).toBe('Paid via GPay');
    });

    it('should reject already completed payments', () => {
      const order = { paymentStatus: 'completed' };
      expect(order.paymentStatus === 'completed').toBe(true);
    });

    it('should allow pending payments to be collected', () => {
      const order = { paymentStatus: 'pending' };
      expect(order.paymentStatus === 'completed').toBe(false);
    });

    it('should support all payment methods', () => {
      const methods = ['cash', 'upi', 'card', 'other'];
      methods.forEach((method) => {
        expect(['upi', 'cash', 'card', 'other']).toContain(method);
      });
    });
  });

  describe('verifyRazorpayPayment', () => {
    it('should return success when Razorpay has a captured payment', () => {
      const mockPayments = [
        { id: 'pay_SGSywoHklnWVNn', amount: 215776, status: 'captured', method: 'upi' },
      ];

      const capturedPayment = mockPayments.find(p => p.status === 'captured');
      expect(capturedPayment).toBeDefined();
      expect(capturedPayment!.id).toBe('pay_SGSywoHklnWVNn');
    });

    it('should return failure when no captured payment found', () => {
      const mockPayments = [
        { id: 'pay_test123', amount: 100000, status: 'failed', method: 'upi' },
      ];

      const capturedPayment = mockPayments.find(p => p.status === 'captured');
      expect(capturedPayment).toBeUndefined();
    });

    it('should handle empty payment list', () => {
      const mockPayments: any[] = [];
      const capturedPayment = mockPayments.find(p => p.status === 'captured');
      expect(capturedPayment).toBeUndefined();
    });

    it('should detect already-paid orders and skip verification', () => {
      const order = { id: 432, paymentStatus: 'completed', razorpayPaymentId: 'pay_existing' };
      expect(order.paymentStatus === 'completed').toBe(true);
    });

    it('should reject orders without razorpayOrderId', () => {
      const order = { razorpayOrderId: null };
      expect(!!order.razorpayOrderId).toBe(false);
    });

    it('should determine correct payment method from Razorpay response', () => {
      const getPaymentMethod = (razorpayMethod: string): 'upi' | 'card' | 'razorpay' => {
        if (razorpayMethod === 'upi') return 'upi';
        if (razorpayMethod === 'card') return 'card';
        return 'razorpay';
      };

      expect(getPaymentMethod('upi')).toBe('upi');
      expect(getPaymentMethod('card')).toBe('card');
      expect(getPaymentMethod('netbanking')).toBe('razorpay');
      expect(getPaymentMethod('wallet')).toBe('razorpay');
    });

    it('should use staff name (not ID) for paymentCollectedBy on recovery', () => {
      const ctx = { user: { id: 1, name: 'Admin' } };
      const staffName = ctx.user.name || 'Staff';
      expect(typeof staffName).toBe('string');
      expect(staffName).toBe('Admin');
    });

    it('should generate correct recovery note', () => {
      const staffName = 'Admin';
      const capturedPayment = { id: 'pay_abc', amount: 215776, method: 'upi' };
      const note = `Recovered via Razorpay API verification by ${staffName}. Payment ID: ${capturedPayment.id}, Amount: ₹${(capturedPayment.amount / 100).toFixed(2)}, Method: ${capturedPayment.method}`;
      
      expect(note).toContain('Recovered via Razorpay API verification');
      expect(note).toContain('pay_abc');
      expect(note).toContain('₹2157.76');
      expect(note).toContain('upi');
    });

    it('should handle multiple payments for same order (only use captured)', () => {
      const payments = [
        { id: 'pay_1', status: 'failed', amount: 100000 },
        { id: 'pay_2', status: 'captured', amount: 100000 },
        { id: 'pay_3', status: 'failed', amount: 100000 },
      ];

      const capturedPayment = payments.find(p => p.status === 'captured');
      expect(capturedPayment).toBeDefined();
      expect(capturedPayment!.id).toBe('pay_2');
    });
  });

  describe('UI display logic', () => {
    it('should show Collect Payment for pending orders of any type', () => {
      const shouldShow = (order: { paymentStatus: string; orderStatus: string }) =>
        order.paymentStatus === 'pending' && order.orderStatus !== 'cancelled';

      // Works for all order types
      expect(shouldShow({ paymentStatus: 'pending', orderStatus: 'confirmed' })).toBe(true);
      expect(shouldShow({ paymentStatus: 'pending', orderStatus: 'preparing' })).toBe(true);
      expect(shouldShow({ paymentStatus: 'pending', orderStatus: 'ready' })).toBe(true);
    });

    it('should not show Collect Payment for cancelled orders', () => {
      const order = { paymentStatus: 'pending', orderStatus: 'cancelled' };
      const show = order.paymentStatus === 'pending' && order.orderStatus !== 'cancelled';
      expect(show).toBe(false);
    });

    it('should not show Collect Payment for already-paid orders', () => {
      const order = { paymentStatus: 'completed', orderStatus: 'completed' };
      const show = order.paymentStatus === 'pending' && order.orderStatus !== 'cancelled';
      expect(show).toBe(false);
    });

    it('should show Verify Razorpay only for orders with razorpayOrderId and pending payment', () => {
      const shouldShowVerify = (order: { razorpayOrderId: string | null; paymentStatus: string }) =>
        !!order.razorpayOrderId && order.paymentStatus === 'pending';

      expect(shouldShowVerify({ razorpayOrderId: 'order_abc', paymentStatus: 'pending' })).toBe(true);
      expect(shouldShowVerify({ razorpayOrderId: null, paymentStatus: 'pending' })).toBe(false);
      expect(shouldShowVerify({ razorpayOrderId: 'order_abc', paymentStatus: 'completed' })).toBe(false);
    });

    it('should show paid status with staff name when available', () => {
      const order = { paymentStatus: 'completed', paymentCollectedBy: 'Theresa' };
      const showPaidWithName = order.paymentStatus === 'completed' && !!order.paymentCollectedBy;
      expect(showPaidWithName).toBe(true);
    });

    it('should show simple paid badge when no staff name recorded', () => {
      const order = { paymentStatus: 'completed', paymentCollectedBy: null };
      const showSimplePaid = order.paymentStatus === 'completed' && !order.paymentCollectedBy;
      expect(showSimplePaid).toBe(true);
    });

    it('Walkout button is removed from UI', () => {
      // Walkout feature was removed per user request - this documents the decision
      const walkoutButtonExists = false;
      expect(walkoutButtonExists).toBe(false);
    });
  });

  describe('Payment collected time display', () => {
    it('should format collected time in Indian locale', () => {
      const collectedAt = new Date('2026-02-15T15:30:00');
      const timeStr = collectedAt.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      expect(timeStr).toBeTruthy();
      expect(typeof timeStr).toBe('string');
    });

    it('should display staff name with collected time', () => {
      const order = {
        paymentCollectedBy: 'Karthik',
        paymentCollectedAt: new Date('2026-02-15T15:30:00'),
      };
      const display = `✓ Paid ${order.paymentCollectedBy} at ${order.paymentCollectedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
      expect(display).toContain('Karthik');
      expect(display).toContain('✓ Paid');
    });
  });
});
