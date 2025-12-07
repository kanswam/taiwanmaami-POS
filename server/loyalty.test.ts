import { describe, it, expect } from 'vitest';

describe('Loyalty Stamp Card', () => {
  // Test stamp earning calculation
  it('should calculate stamps correctly based on order total', () => {
    const STAMP_THRESHOLD = 45000; // ₹450 in paise
    
    // Test cases
    const testCases = [
      { orderTotal: 30000, expectedStamps: 0 },   // ₹300 = 0 stamps
      { orderTotal: 45000, expectedStamps: 1 },   // ₹450 = 1 stamp
      { orderTotal: 50000, expectedStamps: 1 },   // ₹500 = 1 stamp
      { orderTotal: 90000, expectedStamps: 3 },   // ₹900 = 3 stamps (2 base + 1 bonus)
      { orderTotal: 135000, expectedStamps: 4 },  // ₹1350 = 4 stamps (3 base + 1 bonus)
      { orderTotal: 180000, expectedStamps: 6 },  // ₹1800 = 6 stamps (4 base + 2 bonus)
    ];
    
    for (const { orderTotal, expectedStamps } of testCases) {
      const baseStamps = Math.floor(orderTotal / STAMP_THRESHOLD);
      const bonusStamps = Math.floor(orderTotal / (STAMP_THRESHOLD * 2)); // Bonus for every ₹900
      const totalStamps = baseStamps + bonusStamps;
      
      expect(totalStamps).toBe(expectedStamps);
    }
  });

  // Test reward creation logic
  it('should create reward when 10 stamps are reached', () => {
    const currentStamps = 9;
    const newStamps = 2;
    const totalAfterEarn = currentStamps + newStamps;
    
    const shouldCreateReward = totalAfterEarn >= 10;
    const remainingStamps = totalAfterEarn % 10;
    
    expect(shouldCreateReward).toBe(true);
    expect(remainingStamps).toBe(1);
  });

  // Test voucher code generation
  it('should generate unique voucher codes', () => {
    const generateVoucherCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = 'TM-';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateVoucherCode());
    }
    
    // All codes should be unique
    expect(codes.size).toBe(100);
    
    // All codes should start with TM-
    for (const code of codes) {
      expect(code.startsWith('TM-')).toBe(true);
      expect(code.length).toBe(9); // TM- + 6 chars
    }
  });

  // Test stamps to next reward calculation
  it('should calculate stamps to next reward correctly', () => {
    const testCases = [
      { currentStamps: 0, expected: 10 },
      { currentStamps: 3, expected: 7 },
      { currentStamps: 9, expected: 1 },
      { currentStamps: 10, expected: 10 }, // After reward, starts fresh
      { currentStamps: 15, expected: 5 },
    ];
    
    for (const { currentStamps, expected } of testCases) {
      const stampsInCurrentCard = currentStamps % 10;
      const stampsToNextReward = 10 - stampsInCurrentCard;
      expect(stampsToNextReward).toBe(expected);
    }
  });
});

describe('Guest Checkout', () => {
  it('should validate guest phone number format', () => {
    const validPhones = [
      '9876543210',
      '+919876543210',
      '09876543210',
    ];
    
    const invalidPhones = [
      '12345',
      'abcdefghij',
      '',
    ];
    
    const isValidPhone = (phone: string) => {
      const cleaned = phone.replace(/[^0-9]/g, '');
      return cleaned.length >= 10;
    };
    
    for (const phone of validPhones) {
      expect(isValidPhone(phone)).toBe(true);
    }
    
    for (const phone of invalidPhones) {
      expect(isValidPhone(phone)).toBe(false);
    }
  });
});
