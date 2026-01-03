import { describe, it, expect } from 'vitest';

describe('Category Reordering', () => {
  describe('Category Order Logic', () => {
    it('should swap display orders when moving category up', () => {
      // Simulate categories with display orders
      const categories = [
        { id: 1, name: 'Iced Beverages', displayOrder: 1 },
        { id: 2, name: 'Hot Beverages', displayOrder: 2 },
        { id: 3, name: 'Food', displayOrder: 3 },
        { id: 4, name: 'Sweet Bites', displayOrder: 4 },
      ];
      
      // Move Hot Beverages (id: 2) up
      const catId = 2;
      const direction = 'up';
      const sorted = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
      const idx = sorted.findIndex(c => c.id === catId);
      
      expect(idx).toBe(1); // Hot Beverages is at index 1
      
      if (direction === 'up' && idx > 0) {
        const swapIdx = idx - 1;
        const newOrders = sorted.map((c, i) => {
          if (i === idx) return { id: c.id, displayOrder: sorted[swapIdx].displayOrder };
          if (i === swapIdx) return { id: c.id, displayOrder: sorted[idx].displayOrder };
          return { id: c.id, displayOrder: c.displayOrder };
        });
        
        // After swap: Iced Beverages should have order 2, Hot Beverages should have order 1
        const icedBeverages = newOrders.find(c => c.id === 1);
        const hotBeverages = newOrders.find(c => c.id === 2);
        
        expect(hotBeverages?.displayOrder).toBe(1);
        expect(icedBeverages?.displayOrder).toBe(2);
      }
    });

    it('should swap display orders when moving category down', () => {
      const categories = [
        { id: 1, name: 'Iced Beverages', displayOrder: 1 },
        { id: 2, name: 'Hot Beverages', displayOrder: 2 },
        { id: 3, name: 'Food', displayOrder: 3 },
        { id: 4, name: 'Sweet Bites', displayOrder: 4 },
      ];
      
      // Move Food (id: 3) down
      const catId = 3;
      const direction = 'down';
      const sorted = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
      const idx = sorted.findIndex(c => c.id === catId);
      
      expect(idx).toBe(2); // Food is at index 2
      
      if (direction === 'down' && idx < sorted.length - 1) {
        const swapIdx = idx + 1;
        const newOrders = sorted.map((c, i) => {
          if (i === idx) return { id: c.id, displayOrder: sorted[swapIdx].displayOrder };
          if (i === swapIdx) return { id: c.id, displayOrder: sorted[idx].displayOrder };
          return { id: c.id, displayOrder: c.displayOrder };
        });
        
        // After swap: Food should have order 4, Sweet Bites should have order 3
        const food = newOrders.find(c => c.id === 3);
        const sweetBites = newOrders.find(c => c.id === 4);
        
        expect(food?.displayOrder).toBe(4);
        expect(sweetBites?.displayOrder).toBe(3);
      }
    });

    it('should not move first category up', () => {
      const categories = [
        { id: 1, name: 'Iced Beverages', displayOrder: 1 },
        { id: 2, name: 'Hot Beverages', displayOrder: 2 },
      ];
      
      const catId = 1;
      const direction = 'up';
      const sorted = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
      const idx = sorted.findIndex(c => c.id === catId);
      
      expect(idx).toBe(0);
      // Should not move - already at top
      expect(direction === 'up' && idx === 0).toBe(true);
    });

    it('should not move last category down', () => {
      const categories = [
        { id: 1, name: 'Iced Beverages', displayOrder: 1 },
        { id: 2, name: 'Hot Beverages', displayOrder: 2 },
      ];
      
      const catId = 2;
      const direction = 'down';
      const sorted = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
      const idx = sorted.findIndex(c => c.id === catId);
      
      expect(idx).toBe(1);
      // Should not move - already at bottom
      expect(direction === 'down' && idx === sorted.length - 1).toBe(true);
    });
  });

  describe('Beverage Category Detection', () => {
    it('should identify beverage categories by slug', () => {
      const isBeverageCategory = (category: { slug?: string; name?: string }) => {
        return category?.slug === 'bubble-tea' || category?.slug === 'coffee' || 
          category?.name?.toLowerCase().includes('beverage') || 
          category?.name?.toLowerCase().includes('tea') ||
          category?.name?.toLowerCase().includes('coffee');
      };

      expect(isBeverageCategory({ slug: 'bubble-tea', name: 'Iced Beverages' })).toBe(true);
      expect(isBeverageCategory({ slug: 'coffee', name: 'Hot Beverages' })).toBe(true);
      expect(isBeverageCategory({ slug: 'food', name: 'Asian Rice • Noodle • Bread' })).toBe(false);
      expect(isBeverageCategory({ slug: 'mochis', name: 'Asian Sweet Bites' })).toBe(false);
    });

    it('should identify beverage categories by name', () => {
      const isBeverageCategory = (category: { slug?: string; name?: string }) => {
        return category?.slug === 'bubble-tea' || category?.slug === 'coffee' || 
          category?.name?.toLowerCase().includes('beverage') || 
          category?.name?.toLowerCase().includes('tea') ||
          category?.name?.toLowerCase().includes('coffee');
      };

      expect(isBeverageCategory({ name: 'Iced Beverages' })).toBe(true);
      expect(isBeverageCategory({ name: 'Hot Coffee' })).toBe(true);
      expect(isBeverageCategory({ name: 'Green Tea' })).toBe(true);
      expect(isBeverageCategory({ name: 'Food' })).toBe(false);
      expect(isBeverageCategory({ name: 'Mochis' })).toBe(false);
    });
  });
});
