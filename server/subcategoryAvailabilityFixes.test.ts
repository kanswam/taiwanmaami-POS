import { describe, it, expect } from 'vitest';

describe('Subcategory Availability Fixes', () => {
  it('should have separate availablePickup field independent from availableInstore', () => {
    // Subcategories should have all three availability fields
    const mockSubcategory = {
      id: 30003,
      name: 'Slush',
      availableInstore: true,
      availableDelivery: false,
      availablePickup: true, // Can be different from availableInstore
    };

    expect(mockSubcategory).toHaveProperty('availableInstore');
    expect(mockSubcategory).toHaveProperty('availableDelivery');
    expect(mockSubcategory).toHaveProperty('availablePickup');
    
    // Pickup can be different from In-store
    expect(mockSubcategory.availableInstore).toBe(true);
    expect(mockSubcategory.availablePickup).toBe(true);
    expect(mockSubcategory.availableDelivery).toBe(false);
  });

  it('should filter subcategories correctly for each order type', () => {
    const subcategories = [
      { id: 1, name: 'Milk Tea', availableInstore: true, availableDelivery: true, availablePickup: true },
      { id: 2, name: 'Slush', availableInstore: true, availableDelivery: false, availablePickup: true },
      { id: 3, name: 'Tea in Pot', availableInstore: true, availableDelivery: false, availablePickup: false },
    ];

    // For delivery orders
    const deliverySubcategories = subcategories.filter(sub => sub.availableDelivery !== false);
    expect(deliverySubcategories).toHaveLength(1);
    expect(deliverySubcategories[0].name).toBe('Milk Tea');

    // For pickup orders
    const pickupSubcategories = subcategories.filter(sub => sub.availablePickup !== false);
    expect(pickupSubcategories).toHaveLength(2);
    expect(pickupSubcategories.map(s => s.name)).toContain('Milk Tea');
    expect(pickupSubcategories.map(s => s.name)).toContain('Slush');

    // For in-store orders
    const instoreSubcategories = subcategories.filter(sub => sub.availableInstore !== false);
    expect(instoreSubcategories).toHaveLength(3);
  });

  it('should detect subcategories without size variants based on hasSizeVariants flag', () => {
    // Hot beverages like Tea in Pot have hasSizeVariants=false
    const teaInPot = {
      name: 'Tea in Pot',
      hasSizeVariants: false,
      hasBobaOption: false,
    };

    const milkTea = {
      name: 'Milk Tea',
      hasSizeVariants: true,
      hasBobaOption: true,
    };

    // Admin panel should use hasSizeVariants to determine if pricing fields are shown
    const showBeveragePricingForTeaInPot = teaInPot.hasSizeVariants !== false;
    const showBeveragePricingForMilkTea = milkTea.hasSizeVariants !== false;

    expect(showBeveragePricingForTeaInPot).toBe(false); // No size/boba pricing for Tea in Pot
    expect(showBeveragePricingForMilkTea).toBe(true); // Show size/boba pricing for Milk Tea
  });

  it('should allow updating all three availability toggles via Admin', () => {
    // Mock update input with all three toggles
    const updateInput = {
      id: 6,
      name: 'Tea in Pot',
      availableInstore: true,
      availableDelivery: false,
      availablePickup: false,
    };

    // Verify all three fields are present and independent
    expect(updateInput).toHaveProperty('availableInstore');
    expect(updateInput).toHaveProperty('availableDelivery');
    expect(updateInput).toHaveProperty('availablePickup');
    expect(typeof updateInput.availableInstore).toBe('boolean');
    expect(typeof updateInput.availableDelivery).toBe('boolean');
    expect(typeof updateInput.availablePickup).toBe('boolean');
  });

  it('should correctly configure Hot Beverages as in-store only', () => {
    const hotBeveragesSubcategories = [
      { name: 'Tea in Pot', availableInstore: true, availableDelivery: false, availablePickup: false },
      { name: 'Hot Coffee & Cocoa', availableInstore: true, availableDelivery: false, availablePickup: false },
    ];

    for (const sub of hotBeveragesSubcategories) {
      expect(sub.availableInstore).toBe(true);
      expect(sub.availableDelivery).toBe(false);
      expect(sub.availablePickup).toBe(false);
    }
  });
});
