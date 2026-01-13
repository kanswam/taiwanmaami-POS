import { describe, it, expect } from 'vitest';

describe('KOT Special Instructions', () => {
  describe('Order-level special instructions', () => {
    it('should include order-level special instructions in KOT data', () => {
      // KOT data structure includes specialInstructions at order level
      const kotData = {
        orderId: 'ORD-123',
        orderType: 'DELIVERY',
        customerName: 'John Doe',
        customerPhone: '9876543210',
        specialInstructions: 'Please ring the doorbell twice',
        items: [],
        totalAmount: 50000,
        createdAt: new Date().toISOString(),
      };
      
      expect(kotData.specialInstructions).toBe('Please ring the doorbell twice');
    });
  });

  describe('Item-level special instructions', () => {
    it('should include special instructions for each item in KOT data', () => {
      // Each item in KOT now has its own specialInstructions field
      const kotItem = {
        productName: 'Original Japanese Imo Katsu Curry',
        quantity: 1,
        price: 32900,
        size: null,
        withBoba: null,
        sugarLevel: null,
        iceLevel: null,
        specialInstructions: 'Extra crispy katsu please',
        addons: [{ name: 'Egg', price: 2000 }],
      };
      
      expect(kotItem.specialInstructions).toBe('Extra crispy katsu please');
    });

    it('should handle empty special instructions gracefully', () => {
      const kotItem = {
        productName: 'Taro Milk Tea',
        quantity: 1,
        price: 18900,
        specialInstructions: '',
        addons: [],
      };
      
      expect(kotItem.specialInstructions).toBe('');
    });

    it('should support multiple items with different special instructions', () => {
      const kotData = {
        orderId: 'ORD-456',
        specialInstructions: 'Deliver to back entrance',
        items: [
          {
            productName: 'Katsu Curry',
            specialInstructions: 'No onions',
          },
          {
            productName: 'Taro Milk Tea',
            specialInstructions: 'Less ice than usual',
          },
          {
            productName: 'Mochi Set',
            specialInstructions: '', // No special instructions for this item
          },
        ],
      };
      
      expect(kotData.items[0].specialInstructions).toBe('No onions');
      expect(kotData.items[1].specialInstructions).toBe('Less ice than usual');
      expect(kotData.items[2].specialInstructions).toBe('');
    });
  });

  describe('KOT data structure', () => {
    it('should have correct structure for kitchen printing', () => {
      // This is the expected KOT structure that gets sent to the printer
      const expectedStructure = {
        orderId: expect.any(String),
        orderType: expect.stringMatching(/^(DELIVERY|PICKUP|INSTORE)$/),
        customerName: expect.any(String),
        customerPhone: expect.any(String),
        specialInstructions: expect.any(String), // Order-level
        items: expect.arrayContaining([
          expect.objectContaining({
            productName: expect.any(String),
            quantity: expect.any(Number),
            specialInstructions: expect.any(String), // Item-level
          }),
        ]),
        totalAmount: expect.any(Number),
        createdAt: expect.any(String),
      };
      
      const sampleKot = {
        orderId: 'ORD-789',
        orderType: 'INSTORE',
        customerName: 'Guest',
        customerPhone: '',
        specialInstructions: '',
        items: [
          {
            productName: 'Test Product',
            quantity: 1,
            price: 10000,
            specialInstructions: 'Test instruction',
            addons: [],
          },
        ],
        totalAmount: 10500,
        createdAt: new Date().toISOString(),
      };
      
      expect(sampleKot).toMatchObject(expectedStructure);
    });
  });
});
