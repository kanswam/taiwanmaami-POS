import { describe, it, expect } from 'vitest';
import { createRazorpayOrder, getRazorpayKeyId } from './razorpay';

describe('Razorpay Integration', () => {
  it('should have Razorpay key ID configured', () => {
    const keyId = getRazorpayKeyId();
    expect(keyId).toBeTruthy();
    expect(keyId.startsWith('rzp_test_') || keyId.startsWith('rzp_live_')).toBe(true);
  });

  it('should create a test order with valid credentials', async () => {
    const order = await createRazorpayOrder({
      amount: 100, // 1 INR in paise
      currency: 'INR',
      receipt: `test_${Date.now()}`,
      notes: { test: 'true' },
    });

    expect(order).toBeDefined();
    expect(order.id).toBeTruthy();
    expect(order.id.startsWith('order_')).toBe(true);
    expect(order.amount).toBe(100);
    expect(order.currency).toBe('INR');
    expect(order.status).toBe('created');
  });
});
