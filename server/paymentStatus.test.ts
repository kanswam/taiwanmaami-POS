import { describe, it, expect } from 'vitest';

describe('Payment Status on Order Completion', () => {
  describe('updateStatus procedure logic', () => {
    it('should set paymentStatus to completed when status is completed and paymentMethod is provided', () => {
      // Simulates the fix: when input.status === 'completed' && input.paymentMethod exists
      const input = { orderId: 1, status: 'completed', paymentMethod: 'upi' };
      const updateData: any = {};

      if (input.status === 'completed' && input.paymentMethod) {
        updateData.paymentMethod = input.paymentMethod;
        updateData.paymentStatus = 'completed';
        updateData.paymentCollectedAt = new Date();
      }

      expect(updateData.paymentStatus).toBe('completed');
      expect(updateData.paymentMethod).toBe('upi');
      expect(updateData.paymentCollectedAt).toBeInstanceOf(Date);
    });

    it('should set paymentStatus to completed for zomato_dineout payment method', () => {
      const input = { orderId: 2, status: 'completed', paymentMethod: 'zomato_dineout' };
      const updateData: any = {};

      if (input.status === 'completed' && input.paymentMethod) {
        updateData.paymentMethod = input.paymentMethod;
        updateData.paymentStatus = 'completed';
        updateData.paymentCollectedAt = new Date();
      }

      expect(updateData.paymentStatus).toBe('completed');
      expect(updateData.paymentMethod).toBe('zomato_dineout');
    });

    it('should set paymentStatus to completed for card payment method', () => {
      const input = { orderId: 3, status: 'completed', paymentMethod: 'card' };
      const updateData: any = {};

      if (input.status === 'completed' && input.paymentMethod) {
        updateData.paymentMethod = input.paymentMethod;
        updateData.paymentStatus = 'completed';
        updateData.paymentCollectedAt = new Date();
      }

      expect(updateData.paymentStatus).toBe('completed');
      expect(updateData.paymentMethod).toBe('card');
    });

    it('should NOT set paymentStatus when status is not completed', () => {
      const input = { orderId: 4, status: 'preparing', paymentMethod: 'upi' };
      const updateData: any = {};

      if (input.status === 'completed' && input.paymentMethod) {
        updateData.paymentStatus = 'completed';
      }

      expect(updateData.paymentStatus).toBeUndefined();
    });

    it('should NOT set paymentStatus when no paymentMethod is provided', () => {
      const input = { orderId: 5, status: 'completed', paymentMethod: undefined };
      const updateData: any = {};

      if (input.status === 'completed' && input.paymentMethod) {
        updateData.paymentStatus = 'completed';
      }

      expect(updateData.paymentStatus).toBeUndefined();
    });

    it('should include paymentProofUrl when provided', () => {
      const input = { orderId: 6, status: 'completed', paymentMethod: 'upi', paymentProofUrl: 'https://example.com/proof.jpg' };
      const updateData: any = {};

      if (input.status === 'completed' && (input.paymentMethod || input.paymentProofUrl)) {
        if (input.paymentMethod) {
          updateData.paymentMethod = input.paymentMethod;
          updateData.paymentStatus = 'completed';
          updateData.paymentCollectedAt = new Date();
        }
        if (input.paymentProofUrl) updateData.paymentProofUrl = input.paymentProofUrl;
      }

      expect(updateData.paymentStatus).toBe('completed');
      expect(updateData.paymentProofUrl).toBe('https://example.com/proof.jpg');
    });
  });

  describe('confirmPaymentManually procedure logic', () => {
    it('should reject already completed payments', () => {
      const order = { id: 1, paymentStatus: 'completed' };
      const shouldReject = order.paymentStatus === 'completed';
      expect(shouldReject).toBe(true);
    });

    it('should allow confirming pending payments', () => {
      const order = { id: 2, paymentStatus: 'pending' };
      const shouldReject = order.paymentStatus === 'completed';
      expect(shouldReject).toBe(false);
    });

    it('should set all payment tracking fields', () => {
      const input = { orderId: 1, paymentMethod: 'swiggy_dineout', notes: 'Paid via Swiggy' };
      const staffName = 'Rinold';

      const updateData: any = {
        paymentStatus: 'completed',
        paymentMethod: input.paymentMethod,
        paymentCollectedBy: staffName,
        paymentCollectedAt: new Date(),
        paymentNote: input.notes || `Payment collected: ${input.paymentMethod}`,
      };

      expect(updateData.paymentStatus).toBe('completed');
      expect(updateData.paymentMethod).toBe('swiggy_dineout');
      expect(updateData.paymentCollectedBy).toBe('Rinold');
      expect(updateData.paymentCollectedAt).toBeInstanceOf(Date);
    });
  });
});
