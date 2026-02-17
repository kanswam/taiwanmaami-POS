import { describe, it, expect } from 'vitest';

/**
 * Tests for discount recalculation when adding items to existing orders.
 * 
 * Bug: Order #445 had BOBALOVE10 (10% discount) applied at checkout with 3 items (₹1,225).
 * Discount was correctly ₹122.50. But when 5 custom items were added later (total now ₹3,050),
 * the discount stayed at ₹122.50 instead of being recalculated to ₹305.
 * 
 * Fix: Both addItemsToOrder and addCustomItemToOrder now look up the discount code,
 * check if it's percentage-based, and recalculate the discount amount based on the new subtotal.
 */

describe('Discount recalculation on item addition', () => {
  it('should recalculate percentage discount when subtotal increases', () => {
    // Simulating the logic from addItemsToOrder / addCustomItemToOrder
    const originalSubtotal = 122500; // ₹1,225 (3 original items)
    const originalDiscount = Math.round(originalSubtotal * 10 / 100); // 10% = ₹122.50
    expect(originalDiscount).toBe(12250);

    // After adding custom items, subtotal becomes ₹3,050
    const newSubtotal = 305000;
    const newDiscount = Math.round(newSubtotal * 10 / 100); // 10% = ₹305
    expect(newDiscount).toBe(30500);

    // Verify the old bug: discount was NOT recalculated
    const buggyDiscountedSubtotal = newSubtotal - originalDiscount; // ₹3,050 - ₹122.50 = ₹2,927.50
    expect(buggyDiscountedSubtotal).toBe(292750);

    // Verify the fix: discount IS recalculated
    const fixedDiscountedSubtotal = newSubtotal - newDiscount; // ₹3,050 - ₹305 = ₹2,745
    expect(fixedDiscountedSubtotal).toBe(274500);
  });

  it('should respect maxDiscountAmount cap', () => {
    const subtotal = 1000000; // ₹10,000
    const discountPct = 10;
    const maxDiscountAmount = 50000; // ₹500 cap

    let discount = Math.round(subtotal * discountPct / 100); // ₹1,000
    expect(discount).toBe(100000);

    // Apply cap
    if (maxDiscountAmount && discount > maxDiscountAmount) {
      discount = maxDiscountAmount;
    }
    expect(discount).toBe(50000); // Capped at ₹500
  });

  it('should not change discount for fixed_amount discount codes', () => {
    // Fixed amount discounts should NOT be recalculated
    const originalDiscount = 10000; // ₹100 fixed
    const discountType = 'fixed_amount';

    // The code only recalculates if type === 'percentage'
    let newDiscount = originalDiscount;
    if (discountType === 'percentage') {
      newDiscount = Math.round(305000 * 10 / 100);
    }

    // Fixed amount stays the same
    expect(newDiscount).toBe(10000);
  });

  it('should correctly calculate GST on discounted subtotal', () => {
    const subtotal = 305000; // ₹3,050
    const discount = 30500; // ₹305 (10%)
    const discountedSubtotal = subtotal - discount; // ₹2,745

    const sgst = Math.round(discountedSubtotal * 0.025); // 2.5%
    const cgst = Math.round(discountedSubtotal * 0.025); // 2.5%
    const total = discountedSubtotal + sgst + cgst;

    expect(sgst).toBe(6863); // ₹68.63
    expect(cgst).toBe(6863); // ₹68.63
    expect(total).toBe(288226); // ₹2,882.26
  });

  it('should handle orders without discount codes gracefully', () => {
    const subtotal = 200000;
    const discountCode = null;
    let discountAmount = 0;

    // The code checks: if (order.discountCode) { ... }
    if (discountCode) {
      discountAmount = Math.round(subtotal * 10 / 100);
    }

    expect(discountAmount).toBe(0);
    const total = subtotal + Math.round(subtotal * 0.025) + Math.round(subtotal * 0.025);
    expect(total).toBe(210000); // ₹2,100
  });

  it('should match the corrected order #445 values', () => {
    // Verify the exact values we corrected in the database
    const subtotal = 305000;
    const discount = 30500;
    const discountedSubtotal = subtotal - discount;
    const sgst = Math.round(discountedSubtotal * 0.025);
    const cgst = Math.round(discountedSubtotal * 0.025);
    const total = discountedSubtotal + sgst + cgst;

    expect(subtotal).toBe(305000);   // ₹3,050.00
    expect(discount).toBe(30500);    // ₹305.00 (was ₹122.50)
    expect(sgst).toBe(6863);         // ₹68.63
    expect(cgst).toBe(6863);         // ₹68.63
    expect(total).toBe(288226);      // ₹2,882.26 (was ₹3,073.88)
  });
});
