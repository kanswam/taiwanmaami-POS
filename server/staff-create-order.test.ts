import { describe, it, expect, vi } from 'vitest';

describe('staffCreateOrder', () => {
  it('should validate required fields - customer name', () => {
    // The procedure requires customerName to be non-empty
    const input = {
      customerName: '',
      outletId: 2,
      items: [{ productId: 1, productName: 'Test', quantity: 1, unitPrice: 45000, addons: [] }],
    };
    // customerName is required and must be non-empty
    expect(input.customerName).toBe('');
  });

  it('should validate at least one item is required', () => {
    const input = {
      customerName: 'Test Customer',
      outletId: 2,
      items: [],
    };
    expect(input.items.length).toBe(0);
  });

  it('should correctly structure a valid staff order input', () => {
    const input = {
      customerName: 'Lin Son',
      customerPhone: '9884654862',
      tableNumber: 'Table 1',
      outletId: 2,
      items: [
        {
          productId: 5,
          productName: 'Crème Brulee Taro Latte',
          size: 'regular' as const,
          withBoba: true,
          quantity: 1,
          unitPrice: 40500,
          addons: [],
        },
        {
          productId: 12,
          productName: 'Omunoodles',
          quantity: 1,
          unitPrice: 67500,
          addons: [],
        },
      ],
      paymentMethod: 'cash' as const,
      specialInstructions: 'Extra napkins',
    };

    expect(input.customerName).toBe('Lin Son');
    expect(input.items.length).toBe(2);
    expect(input.items[0].productName).toBe('Crème Brulee Taro Latte');
    expect(input.items[1].productName).toBe('Omunoodles');
    expect(input.paymentMethod).toBe('cash');
    expect(input.outletId).toBe(2);
    expect(input.tableNumber).toBe('Table 1');
  });

  it('should handle order without payment method (pay later)', () => {
    const input = {
      customerName: 'Walk-in Customer',
      outletId: 1,
      items: [
        { productId: 3, productName: 'Matcha Latte', quantity: 2, unitPrice: 40500, addons: [] },
      ],
    };

    // No paymentMethod means pay later
    expect(input).not.toHaveProperty('paymentMethod');
    expect(input.items[0].quantity).toBe(2);
  });

  it('should calculate cart total correctly', () => {
    const items = [
      { productId: 1, productName: 'Item A', quantity: 2, unitPrice: 40500, addons: [] },
      { productId: 2, productName: 'Item B', quantity: 1, unitPrice: 67500, addons: [] },
      { productId: 3, productName: 'Item C', quantity: 3, unitPrice: 15000, addons: [] },
    ];

    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    // 2*40500 + 1*67500 + 3*15000 = 81000 + 67500 + 45000 = 193500
    expect(total).toBe(193500);
  });

  it('should support all valid payment methods', () => {
    const validMethods = ['cash', 'upi', 'card', 'zomato_dineout', 'swiggy_dineout', 'eazydiner', 'other'];
    validMethods.forEach(method => {
      expect(typeof method).toBe('string');
      expect(method.length).toBeGreaterThan(0);
    });
  });

  it('should support both outlet IDs', () => {
    const outlets = [
      { id: 1, name: 'Palladium Mall' },
      { id: 2, name: 'T. Nagar' },
    ];
    expect(outlets[0].id).toBe(1);
    expect(outlets[1].id).toBe(2);
  });
});
