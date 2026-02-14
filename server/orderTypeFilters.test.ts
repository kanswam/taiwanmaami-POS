import { describe, it, expect } from 'vitest';

describe('Order Type Filters & Color Coding', () => {
  const mockOrders = [
    { id: 1, orderType: 'instore', orderStatus: 'preparing', tableNumber: 'T3' },
    { id: 2, orderType: 'delivery', orderStatus: 'confirmed', tableNumber: null },
    { id: 3, orderType: 'pickup', orderStatus: 'ready', tableNumber: null },
    { id: 4, orderType: 'instore', orderStatus: 'completed', tableNumber: 'T1' },
    { id: 5, orderType: 'delivery', orderStatus: 'out_for_delivery', tableNumber: null },
    { id: 6, orderType: 'delivery', orderStatus: 'cancelled', tableNumber: null },
    { id: 7, orderType: 'pickup', orderStatus: 'pending', tableNumber: null },
    { id: 8, orderType: 'instore', orderStatus: 'pending', tableNumber: 'T5' },
  ];

  describe('Order type filtering', () => {
    it('should return all orders when filter is "all"', () => {
      const filter = 'all';
      const filtered = filter === 'all' ? mockOrders : mockOrders.filter(o => o.orderType === filter);
      expect(filtered.length).toBe(8);
    });

    it('should filter only instore orders', () => {
      const filter = 'instore';
      const filtered = mockOrders.filter(o => o.orderType === filter);
      expect(filtered.length).toBe(3);
      expect(filtered.every(o => o.orderType === 'instore')).toBe(true);
    });

    it('should filter only delivery orders', () => {
      const filter = 'delivery';
      const filtered = mockOrders.filter(o => o.orderType === filter);
      expect(filtered.length).toBe(3);
      expect(filtered.every(o => o.orderType === 'delivery')).toBe(true);
    });

    it('should filter only pickup orders', () => {
      const filter = 'pickup';
      const filtered = mockOrders.filter(o => o.orderType === filter);
      expect(filtered.length).toBe(2);
      expect(filtered.every(o => o.orderType === 'pickup')).toBe(true);
    });
  });

  describe('Order counts by type', () => {
    it('should count orders correctly by type', () => {
      const counts = {
        all: mockOrders.length,
        instore: mockOrders.filter(o => o.orderType === 'instore').length,
        delivery: mockOrders.filter(o => o.orderType === 'delivery').length,
        pickup: mockOrders.filter(o => o.orderType === 'pickup').length,
      };
      expect(counts.all).toBe(8);
      expect(counts.instore).toBe(3);
      expect(counts.delivery).toBe(3);
      expect(counts.pickup).toBe(2);
    });
  });

  describe('Active order counts (non-completed, non-cancelled)', () => {
    it('should count only active orders', () => {
      const active = mockOrders.filter(o => o.orderStatus !== 'completed' && o.orderStatus !== 'cancelled');
      expect(active.length).toBe(6); // 8 total - 1 completed - 1 cancelled

      const activeCounts = {
        all: active.length,
        instore: active.filter(o => o.orderType === 'instore').length,
        delivery: active.filter(o => o.orderType === 'delivery').length,
        pickup: active.filter(o => o.orderType === 'pickup').length,
      };
      expect(activeCounts.all).toBe(6);
      expect(activeCounts.instore).toBe(2); // T3 preparing + T5 pending (T1 is completed)
      expect(activeCounts.delivery).toBe(2); // confirmed + out_for_delivery (cancelled excluded)
      expect(activeCounts.pickup).toBe(2); // ready + pending
    });
  });

  describe('Order type visual config', () => {
    const orderTypeConfig: Record<string, { label: string; badge: string; border: string; icon: string }> = {
      instore: { label: 'In-Store', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', border: 'border-l-4 border-l-emerald-500', icon: '🏪' },
      delivery: { label: 'Delivery', badge: 'bg-blue-100 text-blue-800 border-blue-300', border: 'border-l-4 border-l-blue-500', icon: '🚚' },
      pickup: { label: 'Pickup', badge: 'bg-purple-100 text-purple-800 border-purple-300', border: 'border-l-4 border-l-purple-500', icon: '🛍️' },
    };

    it('should have config for all order types', () => {
      expect(orderTypeConfig.instore).toBeDefined();
      expect(orderTypeConfig.delivery).toBeDefined();
      expect(orderTypeConfig.pickup).toBeDefined();
    });

    it('should have distinct border colors for each type', () => {
      const borders = new Set([
        orderTypeConfig.instore.border,
        orderTypeConfig.delivery.border,
        orderTypeConfig.pickup.border,
      ]);
      expect(borders.size).toBe(3); // All unique
    });

    it('should have distinct badge colors for each type', () => {
      const badges = new Set([
        orderTypeConfig.instore.badge,
        orderTypeConfig.delivery.badge,
        orderTypeConfig.pickup.badge,
      ]);
      expect(badges.size).toBe(3); // All unique
    });

    it('should have distinct icons for each type', () => {
      const icons = new Set([
        orderTypeConfig.instore.icon,
        orderTypeConfig.delivery.icon,
        orderTypeConfig.pickup.icon,
      ]);
      expect(icons.size).toBe(3); // All unique
    });

    it('should map each order to its correct config', () => {
      mockOrders.forEach(order => {
        const conf = orderTypeConfig[order.orderType];
        expect(conf).toBeDefined();
        expect(conf.label).toBeTruthy();
        expect(conf.border).toContain('border-l-4');
      });
    });
  });
});
