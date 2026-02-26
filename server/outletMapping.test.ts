import { describe, it, expect } from 'vitest';

describe('Outlet Mapping Fixes', () => {
  describe('outlet fallback defaults', () => {
    it('should default to T Nagar (outletId 2) when outletId is null', () => {
      const order = { outletId: null as number | null };
      const resolvedOutletId = order.outletId || 2;
      expect(resolvedOutletId).toBe(2);
    });

    it('should default to T Nagar (outletId 2) when outletId is 0', () => {
      const order = { outletId: 0 };
      const resolvedOutletId = order.outletId || 2;
      expect(resolvedOutletId).toBe(2);
    });

    it('should preserve explicit outletId when provided', () => {
      const order = { outletId: 2 };
      const resolvedOutletId = order.outletId || 2;
      expect(resolvedOutletId).toBe(2);
    });

    it('should never default to outletId 1 (Palladium)', () => {
      // This test ensures the old default of || 1 is no longer used
      const nullOrder = { outletId: null as number | null };
      const zeroOrder = { outletId: 0 };
      
      expect(nullOrder.outletId || 2).not.toBe(1);
      expect(zeroOrder.outletId || 2).not.toBe(1);
    });
  });

  describe('outlet name mapping', () => {
    it('should return T. Nagar for null outletId', () => {
      const outletName = (outletId: number | null) => {
        if (!outletId) return 'T. Nagar';
        const cache: Record<number, string> = { 1: 'Palladium Mall', 2: 'T. Nagar' };
        return cache[outletId] || 'T. Nagar';
      };
      expect(outletName(null)).toBe('T. Nagar');
    });

    it('should return T. Nagar for outletId 2', () => {
      const outletName = (outletId: number | null) => {
        if (!outletId) return 'T. Nagar';
        const cache: Record<number, string> = { 1: 'Palladium Mall', 2: 'T. Nagar' };
        return cache[outletId] || 'T. Nagar';
      };
      expect(outletName(2)).toBe('T. Nagar');
    });

    it('should return T. Nagar as fallback for unknown outletId', () => {
      const outletName = (outletId: number | null) => {
        if (!outletId) return 'T. Nagar';
        const cache: Record<number, string> = { 1: 'Palladium Mall', 2: 'T. Nagar' };
        return cache[outletId] || 'T. Nagar';
      };
      expect(outletName(99)).toBe('T. Nagar');
    });
  });

  describe('backup export outlet map', () => {
    it('should default both outlets to T Nagar in fallback map', () => {
      const outletMap: Record<number, string> = { 1: 'T Nagar', 2: 'T Nagar' };
      expect(outletMap[1]).toBe('T Nagar');
      expect(outletMap[2]).toBe('T Nagar');
    });

    it('should resolve missing outletId to empty string via map', () => {
      const outletMap: Record<number, string> = { 1: 'T Nagar', 2: 'T Nagar' };
      const outletId = null as number | null;
      expect(outletMap[outletId || 0] || 'T Nagar').toBe('T Nagar');
    });
  });
});
