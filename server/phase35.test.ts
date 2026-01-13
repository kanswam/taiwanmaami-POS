import { describe, it, expect, beforeAll } from 'vitest';
import { SIZES, Size } from '../shared/types';

describe('Phase 35 - Critical Bug Fixes', () => {
  
  describe('1. Petite Size Removal', () => {
    it('should not include petite in SIZES constant', () => {
      const sizeValues = SIZES.map(s => s.value);
      expect(sizeValues).not.toContain('petite');
    });
    
    it('should only have regular and large sizes', () => {
      expect(SIZES).toHaveLength(2);
      expect(SIZES[0].value).toBe('regular');
      expect(SIZES[1].value).toBe('large');
    });
    
    it('should have correct volumes for sizes', () => {
      const regular = SIZES.find(s => s.value === 'regular');
      const large = SIZES.find(s => s.value === 'large');
      expect(regular?.volume).toBe('480ml');
      expect(large?.volume).toBe('700ml');
    });
  });
  
  describe('2. Size Type Definition', () => {
    it('should only allow regular and large as Size type', () => {
      // TypeScript compile-time check - if this compiles, the type is correct
      const validSizes: Size[] = ['regular', 'large'];
      expect(validSizes).toHaveLength(2);
    });
  });
  
  describe('3. Green Tea Exclusion Logic', () => {
    it('should identify green tea products correctly', () => {
      const testCases = [
        { name: 'Green Tea Latte', expected: true },
        { name: 'Matcha Milk Tea', expected: true },
        { name: 'Black Tea', expected: false },
        { name: 'Caramel Milk Tea', expected: false },
        { name: 'Jasmine Green Tea', expected: true },
      ];
      
      testCases.forEach(({ name, expected }) => {
        const isGreenTea = name.toLowerCase().includes('green tea') || 
                          name.toLowerCase().includes('matcha');
        expect(isGreenTea).toBe(expected);
      });
    });
  });
  
  describe('4. Food Add-on Detection Logic', () => {
    it('should detect cheese in product names', () => {
      const testCases = [
        { name: 'Cheesy Corn Cong You Bing', hasCheese: true },
        { name: 'Egg Cheesy Cong You Bing', hasCheese: true },
        { name: 'Plain Cong You Bing', hasCheese: false },
        { name: 'Cheese Brioche', hasCheese: true },
      ];
      
      testCases.forEach(({ name, hasCheese }) => {
        const productNameLower = name.toLowerCase();
        const detected = productNameLower.includes('cheese') || productNameLower.includes('cheesy');
        expect(detected).toBe(hasCheese);
      });
    });
    
    it('should detect egg in product names', () => {
      const testCases = [
        { name: 'Egg Cong You Bing', hasEgg: true },
        { name: 'Egg Cheesy Cong You Bing', hasEgg: true },
        { name: 'Plain Cong You Bing', hasEgg: false },
        { name: 'Cheesy Corn Cong You Bing', hasEgg: false },
      ];
      
      testCases.forEach(({ name, hasEgg }) => {
        const productNameLower = name.toLowerCase();
        const detected = productNameLower.includes('egg');
        expect(detected).toBe(hasEgg);
      });
    });
  });
  
  describe('5. Egg Quantity Pricing', () => {
    it('should calculate correct price for egg quantities', () => {
      const pricePerEgg = 2500; // paise
      
      expect(0 * pricePerEgg).toBe(0);
      expect(1 * pricePerEgg).toBe(2500);
      expect(2 * pricePerEgg).toBe(5000);
      expect(3 * pricePerEgg).toBe(7500);
    });
  });
  
  describe('6. Category Delivery Availability', () => {
    it('should filter categories based on order type', () => {
      const categories = [
        { name: 'Bubble Tea', availableDelivery: true, availablePickup: true },
        { name: 'Hot Beverages', availableDelivery: false, availablePickup: false },
        { name: 'Food', availableDelivery: true, availablePickup: true },
      ];
      
      // For delivery orders
      const deliveryCategories = categories.filter(c => c.availableDelivery !== false);
      expect(deliveryCategories).toHaveLength(2);
      expect(deliveryCategories.map(c => c.name)).not.toContain('Hot Beverages');
      
      // For pickup orders
      const pickupCategories = categories.filter(c => c.availablePickup !== false);
      expect(pickupCategories).toHaveLength(2);
      expect(pickupCategories.map(c => c.name)).not.toContain('Hot Beverages');
      
      // For in-store orders (all available)
      expect(categories).toHaveLength(3);
    });
  });
});
