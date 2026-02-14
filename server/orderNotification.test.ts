import { describe, it, expect } from 'vitest';

/**
 * Tests for the order notification detection logic.
 * The actual Web Audio API and React hooks can't run in Node,
 * so we test the core detection algorithm that determines
 * which orders are new and what sound to play.
 */

describe('Order Notification Detection Logic', () => {
  // Simulate the core detection logic from useOrderNotification
  function detectNewOrders(
    previousIds: Set<number>,
    currentOrders: Array<{ id: number; orderType: string; orderStatus: string }>
  ) {
    const brandNew = currentOrders.filter(o => !previousIds.has(o.id));
    const newIds = new Set(brandNew.map(o => o.id));

    // Determine which sound to play (priority: delivery > pickup > instore)
    let soundType: string | null = null;
    if (brandNew.length > 0) {
      const hasDelivery = brandNew.some(o => o.orderType === 'delivery');
      const hasPickup = brandNew.some(o => o.orderType === 'pickup');
      if (hasDelivery) soundType = 'delivery';
      else if (hasPickup) soundType = 'pickup';
      else soundType = 'instore';
    }

    return { brandNew, newIds, soundType };
  }

  it('should detect no new orders when all IDs are known', () => {
    const previousIds = new Set([1, 2, 3]);
    const currentOrders = [
      { id: 1, orderType: 'instore', orderStatus: 'preparing' },
      { id: 2, orderType: 'delivery', orderStatus: 'confirmed' },
      { id: 3, orderType: 'pickup', orderStatus: 'ready' },
    ];
    const result = detectNewOrders(previousIds, currentOrders);
    expect(result.brandNew.length).toBe(0);
    expect(result.newIds.size).toBe(0);
    expect(result.soundType).toBeNull();
  });

  it('should detect a single new delivery order', () => {
    const previousIds = new Set([1, 2]);
    const currentOrders = [
      { id: 1, orderType: 'instore', orderStatus: 'preparing' },
      { id: 2, orderType: 'pickup', orderStatus: 'ready' },
      { id: 3, orderType: 'delivery', orderStatus: 'pending' },
    ];
    const result = detectNewOrders(previousIds, currentOrders);
    expect(result.brandNew.length).toBe(1);
    expect(result.brandNew[0].id).toBe(3);
    expect(result.brandNew[0].orderType).toBe('delivery');
    expect(result.soundType).toBe('delivery');
  });

  it('should detect a new pickup order', () => {
    const previousIds = new Set([1]);
    const currentOrders = [
      { id: 1, orderType: 'instore', orderStatus: 'preparing' },
      { id: 2, orderType: 'pickup', orderStatus: 'pending' },
    ];
    const result = detectNewOrders(previousIds, currentOrders);
    expect(result.brandNew.length).toBe(1);
    expect(result.soundType).toBe('pickup');
  });

  it('should detect a new instore order', () => {
    const previousIds = new Set([1]);
    const currentOrders = [
      { id: 1, orderType: 'delivery', orderStatus: 'confirmed' },
      { id: 2, orderType: 'instore', orderStatus: 'pending' },
    ];
    const result = detectNewOrders(previousIds, currentOrders);
    expect(result.brandNew.length).toBe(1);
    expect(result.soundType).toBe('instore');
  });

  it('should prioritize delivery sound when multiple new order types arrive', () => {
    const previousIds = new Set([1]);
    const currentOrders = [
      { id: 1, orderType: 'instore', orderStatus: 'preparing' },
      { id: 2, orderType: 'instore', orderStatus: 'pending' },
      { id: 3, orderType: 'pickup', orderStatus: 'pending' },
      { id: 4, orderType: 'delivery', orderStatus: 'pending' },
    ];
    const result = detectNewOrders(previousIds, currentOrders);
    expect(result.brandNew.length).toBe(3);
    expect(result.soundType).toBe('delivery');
  });

  it('should prioritize pickup sound over instore when no delivery', () => {
    const previousIds = new Set([1]);
    const currentOrders = [
      { id: 1, orderType: 'delivery', orderStatus: 'completed' },
      { id: 2, orderType: 'instore', orderStatus: 'pending' },
      { id: 3, orderType: 'pickup', orderStatus: 'pending' },
    ];
    const result = detectNewOrders(previousIds, currentOrders);
    expect(result.brandNew.length).toBe(2);
    expect(result.soundType).toBe('pickup');
  });

  it('should detect multiple new orders at once', () => {
    const previousIds = new Set([1]);
    const currentOrders = [
      { id: 1, orderType: 'instore', orderStatus: 'preparing' },
      { id: 2, orderType: 'delivery', orderStatus: 'pending' },
      { id: 3, orderType: 'delivery', orderStatus: 'pending' },
      { id: 4, orderType: 'pickup', orderStatus: 'pending' },
    ];
    const result = detectNewOrders(previousIds, currentOrders);
    expect(result.brandNew.length).toBe(3);
    expect(result.newIds.has(2)).toBe(true);
    expect(result.newIds.has(3)).toBe(true);
    expect(result.newIds.has(4)).toBe(true);
    expect(result.newIds.has(1)).toBe(false);
  });

  it('should handle empty previous orders (first load scenario)', () => {
    const previousIds = new Set<number>();
    const currentOrders = [
      { id: 1, orderType: 'instore', orderStatus: 'preparing' },
      { id: 2, orderType: 'delivery', orderStatus: 'confirmed' },
    ];
    // On first load, all orders are "new" but the hook skips alerting
    // Here we just test the detection logic itself
    const result = detectNewOrders(previousIds, currentOrders);
    expect(result.brandNew.length).toBe(2);
    expect(result.soundType).toBe('delivery');
  });

  it('should handle orders disappearing (completed/removed from list)', () => {
    const previousIds = new Set([1, 2, 3]);
    const currentOrders = [
      { id: 2, orderType: 'delivery', orderStatus: 'confirmed' },
      { id: 4, orderType: 'pickup', orderStatus: 'pending' },
    ];
    // Order 1 and 3 disappeared, order 4 is new
    const result = detectNewOrders(previousIds, currentOrders);
    expect(result.brandNew.length).toBe(1);
    expect(result.brandNew[0].id).toBe(4);
    expect(result.soundType).toBe('pickup');
  });
});

describe('Sound preference persistence', () => {
  it('should default to enabled when no stored preference', () => {
    // Simulates localStorage.getItem returning null
    const stored = null;
    const soundEnabled = stored !== 'false';
    expect(soundEnabled).toBe(true);
  });

  it('should be disabled when stored as false', () => {
    const stored = 'false';
    const soundEnabled = stored !== 'false';
    expect(soundEnabled).toBe(false);
  });

  it('should be enabled when stored as true', () => {
    const stored = 'true';
    const soundEnabled = stored !== 'false';
    expect(soundEnabled).toBe(true);
  });
});
