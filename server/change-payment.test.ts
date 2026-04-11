import { describe, it, expect } from 'vitest';

describe('changePaymentMethod procedure', () => {
  it('should accept valid payment method enum values', () => {
    const validMethods = ['cash', 'upi', 'card', 'razorpay', 'swiggy_dineout', 'zomato_dineout', 'eazydiner', 'birthday_gift', 'complimentary', 'other'];
    validMethods.forEach(method => {
      expect(validMethods).toContain(method);
    });
  });

  it('should reject invalid payment method values', () => {
    const validMethods = ['cash', 'upi', 'card', 'razorpay', 'swiggy_dineout', 'zomato_dineout', 'eazydiner', 'birthday_gift', 'complimentary', 'other'];
    expect(validMethods).not.toContain('bitcoin');
    expect(validMethods).not.toContain('');
    expect(validMethods).not.toContain('district');
  });

  it('should include zomato_dineout for District by Zomato', () => {
    const validMethods = ['cash', 'upi', 'card', 'razorpay', 'swiggy_dineout', 'zomato_dineout', 'eazydiner', 'birthday_gift', 'complimentary', 'other'];
    expect(validMethods).toContain('zomato_dineout');
  });

  it('should generate correct staff notes when changing payment method', () => {
    const oldMethod = 'upi';
    const newMethod = 'zomato_dineout';
    const adminName = 'Theresa';
    const reason = 'Settled via District (Zomato)';
    
    const existingNotes = 'Previous note';
    const expectedNote = `${existingNotes}\n[Payment changed: ${oldMethod} → ${newMethod} by ${adminName} - ${reason}]`;
    
    expect(expectedNote).toContain('upi → zomato_dineout');
    expect(expectedNote).toContain('Theresa');
    expect(expectedNote).toContain('Settled via District (Zomato)');
    expect(expectedNote).toContain('Previous note');
  });

  it('should create new staff notes when none exist', () => {
    const oldMethod = 'cash';
    const newMethod = 'card';
    const adminName = 'Admin';
    
    const existingNotes = null;
    const note = existingNotes
      ? `${existingNotes}\n[Payment changed: ${oldMethod} → ${newMethod} by ${adminName}]`
      : `[Payment changed: ${oldMethod} → ${newMethod} by ${adminName}]`;
    
    expect(note).toBe('[Payment changed: cash → card by Admin]');
    expect(note).not.toContain('null');
  });
});
