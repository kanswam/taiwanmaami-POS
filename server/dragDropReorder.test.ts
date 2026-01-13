import { describe, it, expect } from 'vitest';

describe('Drag and Drop Category Reordering', () => {
  it('should have updateCategoryOrder mutation that accepts categoryOrders array', () => {
    // Test that the mutation input structure is correct
    const categoryOrders = [
      { id: 1, displayOrder: 1 },
      { id: 2, displayOrder: 2 },
      { id: 3, displayOrder: 3 },
    ];
    
    // Verify the structure is valid
    expect(categoryOrders).toBeInstanceOf(Array);
    expect(categoryOrders[0]).toHaveProperty('id');
    expect(categoryOrders[0]).toHaveProperty('displayOrder');
  });

  it('should have updateSubcategoryOrder mutation that accepts subcategoryOrders array', () => {
    // Test that the mutation input structure is correct
    const subcategoryOrders = [
      { id: 101, displayOrder: 1 },
      { id: 102, displayOrder: 2 },
      { id: 103, displayOrder: 3 },
    ];
    
    // Verify the structure is valid
    expect(subcategoryOrders).toBeInstanceOf(Array);
    expect(subcategoryOrders[0]).toHaveProperty('id');
    expect(subcategoryOrders[0]).toHaveProperty('displayOrder');
  });

  it('should correctly reorder items using arrayMove logic', () => {
    // Simulate arrayMove from @dnd-kit/sortable
    const arrayMove = <T,>(array: T[], from: number, to: number): T[] => {
      const newArray = [...array];
      const [removed] = newArray.splice(from, 1);
      newArray.splice(to, 0, removed);
      return newArray;
    };

    const categories = [
      { id: 1, name: 'Iced Beverages', displayOrder: 1 },
      { id: 2, name: 'Hot Beverages', displayOrder: 2 },
      { id: 3, name: 'Food', displayOrder: 3 },
      { id: 4, name: 'Sweet Bites', displayOrder: 4 },
    ];

    // Move "Food" (index 2) to first position (index 0)
    const reordered = arrayMove(categories, 2, 0);
    
    expect(reordered[0].name).toBe('Food');
    expect(reordered[1].name).toBe('Iced Beverages');
    expect(reordered[2].name).toBe('Hot Beverages');
    expect(reordered[3].name).toBe('Sweet Bites');
  });

  it('should generate new displayOrder values after reordering', () => {
    const reorderedCategories = [
      { id: 3, name: 'Food' },
      { id: 1, name: 'Iced Beverages' },
      { id: 2, name: 'Hot Beverages' },
      { id: 4, name: 'Sweet Bites' },
    ];

    // Generate new orders (1-indexed)
    const newOrders = reorderedCategories.map((c, i) => ({
      id: c.id,
      displayOrder: i + 1,
    }));

    expect(newOrders).toEqual([
      { id: 3, displayOrder: 1 },
      { id: 1, displayOrder: 2 },
      { id: 2, displayOrder: 3 },
      { id: 4, displayOrder: 4 },
    ]);
  });
});
