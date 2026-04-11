import { describe, it, expect } from 'vitest';

// Test the birthday detection logic in isolation
describe('Birthday Free Drink Detection', () => {
  
  function isBirthdayWeek(birthMonth: number, birthDay: number, now: Date): boolean {
    const currentYear = now.getFullYear();
    const birthdayThisYear = new Date(currentYear, birthMonth - 1, birthDay);
    const diffMs = now.getTime() - birthdayThisYear.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= -3 && diffDays <= 3;
  }

  function calculateBirthdayDiscount(
    items: { productName: string; lineTotal: number }[],
    birthMonth: number | null,
    birthDay: number | null,
    birthdayCodeUsedYear: number | null,
    now: Date
  ): { discountAmount: number; birthdayFreeApplied: boolean; freeItemName: string | null } {
    if (!birthMonth || !birthDay) {
      return { discountAmount: 0, birthdayFreeApplied: false, freeItemName: null };
    }

    const currentYear = now.getFullYear();
    if (birthdayCodeUsedYear === currentYear) {
      return { discountAmount: 0, birthdayFreeApplied: false, freeItemName: null };
    }

    if (!isBirthdayWeek(birthMonth, birthDay, now)) {
      return { discountAmount: 0, birthdayFreeApplied: false, freeItemName: null };
    }

    // Find most expensive item
    const mostExpensive = items.reduce((max, item) =>
      item.lineTotal > max.lineTotal ? item : max, items[0]);

    return {
      discountAmount: mostExpensive.lineTotal,
      birthdayFreeApplied: true,
      freeItemName: mostExpensive.productName,
    };
  }

  describe('isBirthdayWeek', () => {
    it('returns true on the exact birthday', () => {
      const now = new Date(2026, 1, 17); // Feb 17, 2026
      expect(isBirthdayWeek(2, 17, now)).toBe(true);
    });

    it('returns true 3 days before birthday', () => {
      const now = new Date(2026, 1, 14); // Feb 14, 2026
      expect(isBirthdayWeek(2, 17, now)).toBe(true);
    });

    it('returns true 3 days after birthday', () => {
      const now = new Date(2026, 1, 20); // Feb 20, 2026
      expect(isBirthdayWeek(2, 17, now)).toBe(true);
    });

    it('returns false 4 days before birthday', () => {
      const now = new Date(2026, 1, 13); // Feb 13, 2026
      expect(isBirthdayWeek(2, 17, now)).toBe(false);
    });

    it('returns false 4 days after birthday', () => {
      const now = new Date(2026, 1, 21); // Feb 21, 2026
      expect(isBirthdayWeek(2, 17, now)).toBe(false);
    });

    it('handles year boundary - birthday on Jan 1', () => {
      const now = new Date(2026, 0, 1); // Jan 1, 2026
      expect(isBirthdayWeek(1, 1, now)).toBe(true);
    });

    it('handles Dec 31 birthday checked on Jan 2', () => {
      // Dec 31 birthday, checking on Jan 2 next year
      const now = new Date(2026, 0, 2); // Jan 2, 2026
      // Birthday this year would be Dec 31, 2026 - way in the future
      expect(isBirthdayWeek(12, 31, now)).toBe(false);
    });
  });

  describe('calculateBirthdayDiscount', () => {
    const items = [
      { productName: 'Cappuccino', lineTotal: 24500 },
      { productName: 'Tiramisu Oolong Latte', lineTotal: 46500 },
    ];

    it('applies free drink on birthday - picks most expensive item', () => {
      const result = calculateBirthdayDiscount(
        items, 2, 17, null, new Date(2026, 1, 17)
      );
      expect(result.birthdayFreeApplied).toBe(true);
      expect(result.discountAmount).toBe(46500); // Tiramisu Oolong Latte
      expect(result.freeItemName).toBe('Tiramisu Oolong Latte');
    });

    it('does not apply if birthday already used this year', () => {
      const result = calculateBirthdayDiscount(
        items, 2, 17, 2026, new Date(2026, 1, 17)
      );
      expect(result.birthdayFreeApplied).toBe(false);
      expect(result.discountAmount).toBe(0);
    });

    it('does not apply if no birthday set', () => {
      const result = calculateBirthdayDiscount(
        items, null, null, null, new Date(2026, 1, 17)
      );
      expect(result.birthdayFreeApplied).toBe(false);
      expect(result.discountAmount).toBe(0);
    });

    it('does not apply if not actual birthday', () => {
      const result = calculateBirthdayDiscount(
        items, 5, 15, null, new Date(2026, 1, 17) // Birthday in May
      );
      expect(result.birthdayFreeApplied).toBe(false);
      expect(result.discountAmount).toBe(0);
    });

    it('applies if used last year but not this year', () => {
      const result = calculateBirthdayDiscount(
        items, 2, 17, 2025, new Date(2026, 1, 17) // Used in 2025, now 2026
      );
      expect(result.birthdayFreeApplied).toBe(true);
      expect(result.discountAmount).toBe(46500);
    });

    it('picks the single item when only one item in order', () => {
      const singleItem = [{ productName: 'Cappuccino', lineTotal: 24500 }];
      const result = calculateBirthdayDiscount(
        singleItem, 2, 17, null, new Date(2026, 1, 17)
      );
      expect(result.birthdayFreeApplied).toBe(true);
      expect(result.discountAmount).toBe(24500);
      expect(result.freeItemName).toBe('Cappuccino');
    });
  });

  describe('GST calculation on net after birthday discount', () => {
    function calculateGst(amountPaise: number) {
      const stateGst = Math.round(amountPaise * 0.025);
      const centralGst = Math.round(amountPaise * 0.025);
      return { stateGst, centralGst, total: stateGst + centralGst };
    }

    it('calculates GST on net amount after birthday discount', () => {
      const subtotal = 71000; // ₹710
      const discountAmount = 46500; // ₹465 (Tiramisu Oolong Latte free)
      const net = subtotal - discountAmount; // ₹245 = 24500 paise
      const gst = calculateGst(net);
      
      expect(gst.stateGst).toBe(613); // ₹6.13
      expect(gst.centralGst).toBe(613); // ₹6.13
      expect(gst.total).toBe(1226); // ₹12.26
      
      const total = net + gst.total;
      expect(total).toBe(25726); // ₹257.26
    });

    it('calculates GST on full amount when no birthday discount', () => {
      const subtotal = 71000; // ₹710
      const gst = calculateGst(subtotal);
      
      expect(gst.stateGst).toBe(1775); // ₹17.75
      expect(gst.centralGst).toBe(1775); // ₹17.75
      expect(gst.total).toBe(3550); // ₹35.50
      
      const total = subtotal + gst.total;
      expect(total).toBe(74550); // ₹745.50
    });
  });
});
