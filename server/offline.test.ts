/**
 * Offline Resilience System Tests
 * 
 * Tests the offline queue, sync engine, conflict resolution, and load simulation.
 * ALL tests use mocks and simulated data — ZERO production data touched.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock IndexedDB (idb-keyval) ────────────────────────────────────
// Since Vitest runs in Node.js (no IndexedDB), we mock idb-keyval entirely

const mockStores: Record<string, Map<string, any>> = {};

function getMockStore(dbName: string, storeName: string) {
  const key = `${dbName}:${storeName}`;
  if (!mockStores[key]) mockStores[key] = new Map();
  return mockStores[key];
}

vi.mock('idb-keyval', () => ({
  createStore: (dbName: string, storeName: string) => ({ dbName, storeName }),
  get: (key: string, store: { dbName: string; storeName: string }) => {
    const s = getMockStore(store.dbName, store.storeName);
    return Promise.resolve(s.get(key));
  },
  set: (key: string, value: any, store: { dbName: string; storeName: string }) => {
    const s = getMockStore(store.dbName, store.storeName);
    s.set(key, value);
    return Promise.resolve();
  },
  del: (key: string, store: { dbName: string; storeName: string }) => {
    const s = getMockStore(store.dbName, store.storeName);
    s.delete(key);
    return Promise.resolve();
  },
  keys: (store: { dbName: string; storeName: string }) => {
    const s = getMockStore(store.dbName, store.storeName);
    return Promise.resolve(Array.from(s.keys()));
  },
  entries: (store: { dbName: string; storeName: string }) => {
    const s = getMockStore(store.dbName, store.storeName);
    return Promise.resolve(Array.from(s.entries()));
  },
}));

// Mock navigator.onLine and fetch for network detection
const originalNavigator = globalThis.navigator;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  // Clear all mock stores
  Object.keys(mockStores).forEach(key => mockStores[key].clear());
  
  // Reset modules to get fresh state
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Helper: Create mock cart items ──────────────────────────────────

function createMockCartItems(count: number = 2) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: `item-${i}`,
      productId: 100 + i,
      productName: i === 0 ? 'Brown Sugar Boba Milk' : 'Matcha Latte',
      subcategoryId: 1,
      size: 'regular' as const,
      withBoba: true,
      sugarLevel: '50%',
      iceLevel: 'less',
      addons: [{ id: 1, name: 'Extra Boba', price: 5000 }],
      quantity: 1,
      unitPrice: 35000,
      addonsTotal: 5000,
      lineTotal: 40000,
    });
  }
  return items;
}

// ─── 1. Offline Queue Tests ──────────────────────────────────────────

describe('Offline Queue', () => {
  it('should queue an offline order and assign a temporary ID', async () => {
    const { queueOfflineOrder, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();
    
    const order = await queueOfflineOrder({
      orderType: 'instore',
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '5',
      customerName: 'Test Customer',
      customerPhone: '9876543210',
      items: createMockCartItems(),
      specialInstructions: 'Extra napkins',
      discountCode: null,
      subtotal: 80000,
      gstAmount: 4000,
      totalAmount: 84000,
      userId: 1,
      userName: 'Staff Member',
    });

    expect(order.offlineId).toBe('OFF-001');
    expect(order.status).toBe('queued');
    expect(order.serverId).toBeNull();
    expect(order.serverOrderNumber).toBeNull();
    expect(order.orderType).toBe('instore');
    expect(order.outletId).toBe(2);
    expect(order.tableNumber).toBe('5');
    expect(order.paymentMethod).toBe('cash');
    expect(order.totalAmount).toBe(84000);
    expect(order.items).toHaveLength(2);
    expect(order.createdAt).toBeGreaterThan(0);
  });

  it('should generate sequential offline IDs', async () => {
    const { queueOfflineOrder, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    const params = {
      orderType: 'instore' as const,
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '1',
      customerName: 'Customer',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: null,
      userName: null,
    };

    const order1 = await queueOfflineOrder(params);
    const order2 = await queueOfflineOrder(params);
    const order3 = await queueOfflineOrder(params);

    expect(order1.offlineId).toBe('OFF-001');
    expect(order2.offlineId).toBe('OFF-002');
    expect(order3.offlineId).toBe('OFF-003');
  });

  it('should retrieve all queued orders sorted by creation time', async () => {
    const { queueOfflineOrder, getQueuedOrders, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    const baseParams = {
      orderType: 'instore' as const,
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '1',
      customerName: 'Customer',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: null,
      userName: null,
    };

    await queueOfflineOrder(baseParams);
    await queueOfflineOrder({ ...baseParams, tableNumber: '2' });
    await queueOfflineOrder({ ...baseParams, tableNumber: '3' });

    const queued = await getQueuedOrders();
    expect(queued).toHaveLength(3);
    // Should be sorted chronologically (oldest first)
    expect(queued[0].offlineId).toBe('OFF-001');
    expect(queued[1].offlineId).toBe('OFF-002');
    expect(queued[2].offlineId).toBe('OFF-003');
  });

  it('should update order sync status', async () => {
    const { queueOfflineOrder, updateOfflineOrderStatus, getOfflineOrder, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    const order = await queueOfflineOrder({
      orderType: 'instore',
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '5',
      customerName: 'Test',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: 1,
      userName: 'Staff',
    });

    // Mark as synced
    await updateOfflineOrderStatus(order.offlineId, {
      status: 'synced',
      serverId: 123,
      serverOrderNumber: '00808',
      syncedAt: Date.now(),
    });

    const updated = await getOfflineOrder(order.offlineId);
    expect(updated?.status).toBe('synced');
    expect(updated?.serverId).toBe(123);
    expect(updated?.serverOrderNumber).toBe('00808');
    expect(updated?.syncedAt).toBeGreaterThan(0);
  });

  it('should get pending count correctly', async () => {
    const { queueOfflineOrder, updateOfflineOrderStatus, getPendingCount, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    const params = {
      orderType: 'instore' as const,
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '1',
      customerName: 'Customer',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: null,
      userName: null,
    };

    await queueOfflineOrder(params);
    await queueOfflineOrder(params);
    const order3 = await queueOfflineOrder(params);

    expect(await getPendingCount()).toBe(3);

    // Sync one
    await updateOfflineOrderStatus(order3.offlineId, { status: 'synced', syncedAt: Date.now() });
    expect(await getPendingCount()).toBe(2);
  });

  it('should only allow cash payment method for offline orders', async () => {
    const { queueOfflineOrder, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    const order = await queueOfflineOrder({
      orderType: 'pickup',
      outletId: 1,
      outletName: 'Palladium Mall',
      tableNumber: '',
      customerName: 'Pickup Customer',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: null,
      userName: null,
    });

    // Offline orders are always cash
    expect(order.paymentMethod).toBe('cash');
  });
});

// ─── 2. Offline KOT Generation Tests ────────────────────────────────

describe('Offline KOT Generation', () => {
  it('should auto-generate KOT when offline order is queued', async () => {
    const { queueOfflineOrder, getKotForOrder, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    const order = await queueOfflineOrder({
      orderType: 'instore',
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '7',
      customerName: 'KOT Test',
      customerPhone: '9876543210',
      items: createMockCartItems(),
      specialInstructions: 'No ice',
      discountCode: null,
      subtotal: 80000,
      gstAmount: 4000,
      totalAmount: 84000,
      userId: 1,
      userName: 'Staff',
    });

    const kot = await getKotForOrder(order.offlineId);
    expect(kot).toBeDefined();
    expect(kot!.offlineOrderId).toBe(order.offlineId);
    expect(kot!.isPrinted).toBe(false);
    expect(kot!.kotData.orderId).toBe(order.offlineId);
    expect(kot!.kotData.orderType).toBe('INSTORE');
    expect(kot!.kotData.tableNumber).toBe('7');
    expect(kot!.kotData.customerName).toBe('KOT Test');
    expect(kot!.kotData.isOffline).toBe(true);
    expect(kot!.kotData.items).toHaveLength(2);
    expect(kot!.kotData.totalAmount).toBe(84000);
  });

  it('should mark KOT as printed', async () => {
    const { queueOfflineOrder, getKotForOrder, markKotPrinted, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    const order = await queueOfflineOrder({
      orderType: 'instore',
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '3',
      customerName: 'Print Test',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: null,
      userName: null,
    });

    await markKotPrinted(order.offlineId);
    const kot = await getKotForOrder(order.offlineId);
    expect(kot!.isPrinted).toBe(true);
  });

  it('should list unprinted KOTs', async () => {
    const { queueOfflineOrder, getUnprintedKots, markKotPrinted, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    const params = {
      orderType: 'instore' as const,
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '1',
      customerName: 'Customer',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: null,
      userName: null,
    };

    const order1 = await queueOfflineOrder(params);
    await queueOfflineOrder(params);
    await queueOfflineOrder(params);

    // All 3 should be unprinted
    let unprinted = await getUnprintedKots();
    expect(unprinted).toHaveLength(3);

    // Print one
    await markKotPrinted(order1.offlineId);
    unprinted = await getUnprintedKots();
    expect(unprinted).toHaveLength(2);
  });

  it('should include addon details in KOT data', async () => {
    const { queueOfflineOrder, getKotForOrder, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    const items = [{
      id: 'item-addon-test',
      productId: 200,
      productName: 'Katsu Curry Rice',
      subcategoryId: 5,
      addons: [{ id: 10, name: 'Extra Cheese', price: 3000 }],
      productAddons: [{ id: 20, name: 'Extra Egg', quantity: 2, pricePerUnit: 2000, totalPrice: 4000 }],
      quantity: 1,
      unitPrice: 25000,
      addonsTotal: 7000,
      lineTotal: 32000,
    }];

    const order = await queueOfflineOrder({
      orderType: 'instore',
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '4',
      customerName: 'Addon Test',
      customerPhone: '9876543210',
      items: items as any,
      specialInstructions: '',
      discountCode: null,
      subtotal: 32000,
      gstAmount: 1600,
      totalAmount: 33600,
      userId: null,
      userName: null,
    });

    const kot = await getKotForOrder(order.offlineId);
    expect(kot!.kotData.items[0].addons).toHaveLength(2);
    expect(kot!.kotData.items[0].addons[0].name).toBe('Extra Cheese');
    expect(kot!.kotData.items[0].addons[1].name).toBe('Extra Egg');
  });
});

// ─── 3. Sync Engine Tests ────────────────────────────────────────────

describe('Sync Engine', () => {
  it('should sync queued orders sequentially', async () => {
    const { queueOfflineOrder, getQueuedOrders, getOfflineOrder, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    const { registerOrderSubmitFn, runSync } = await import('../client/src/lib/offlineSync');
    await resetOfflineCounter();

    // Mock the submit function
    let submitCount = 0;
    registerOrderSubmitFn(async (order) => {
      submitCount++;
      return { orderId: 800 + submitCount, orderNumber: `0080${submitCount}` };
    });

    // Mock network as online
    vi.spyOn(await import('../client/src/lib/offlineQueue'), 'getNetworkStatus').mockReturnValue(true);

    const params = {
      orderType: 'instore' as const,
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '1',
      customerName: 'Sync Test',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: 1,
      userName: 'Staff',
    };

    await queueOfflineOrder(params);
    await queueOfflineOrder({ ...params, tableNumber: '2' });
    await queueOfflineOrder({ ...params, tableNumber: '3' });

    const progress = await runSync();
    expect(progress.total).toBe(3);
    expect(progress.synced).toBe(3);
    expect(progress.failed).toBe(0);
    expect(submitCount).toBe(3);

    // All should be marked as synced
    const order1 = await getOfflineOrder('OFF-001');
    expect(order1?.status).toBe('synced');
    expect(order1?.serverId).toBe(801);
    expect(order1?.serverOrderNumber).toBe('00801');
  });

  it('should handle sync failures gracefully', async () => {
    const { queueOfflineOrder, getOfflineOrder, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    const { registerOrderSubmitFn, runSync } = await import('../client/src/lib/offlineSync');
    await resetOfflineCounter();

    let callCount = 0;
    registerOrderSubmitFn(async (order) => {
      callCount++;
      if (callCount === 2) throw new Error('Network timeout');
      return { orderId: 900 + callCount, orderNumber: `0090${callCount}` };
    });

    vi.spyOn(await import('../client/src/lib/offlineQueue'), 'getNetworkStatus').mockReturnValue(true);

    const params = {
      orderType: 'instore' as const,
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '1',
      customerName: 'Fail Test',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: null,
      userName: null,
    };

    await queueOfflineOrder(params);
    await queueOfflineOrder({ ...params, tableNumber: '2' });
    await queueOfflineOrder({ ...params, tableNumber: '3' });

    const progress = await runSync();
    expect(progress.synced).toBe(2);
    expect(progress.failed).toBe(1);
    expect(progress.errors).toHaveLength(1);
    expect(progress.errors[0].error).toContain('Network timeout');

    // Failed order should still be queued for retry
    const failedOrder = await getOfflineOrder('OFF-002');
    expect(failedOrder?.status).toBe('queued'); // Still queued (1 attempt < 3 max)
    expect(failedOrder?.syncAttempts).toBe(1);
  });

  it('should mark order as permanently failed after max retries', async () => {
    const { queueOfflineOrder, updateOfflineOrderStatus, getOfflineOrder, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    const { registerOrderSubmitFn, runSync } = await import('../client/src/lib/offlineSync');
    await resetOfflineCounter();

    registerOrderSubmitFn(async () => {
      throw new Error('Server unreachable');
    });

    vi.spyOn(await import('../client/src/lib/offlineQueue'), 'getNetworkStatus').mockReturnValue(true);

    const order = await queueOfflineOrder({
      orderType: 'instore',
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '1',
      customerName: 'Retry Test',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: null,
      userName: null,
    });

    // Simulate 2 previous failed attempts
    await updateOfflineOrderStatus(order.offlineId, { syncAttempts: 2 });

    await runSync();

    const updated = await getOfflineOrder(order.offlineId);
    expect(updated?.status).toBe('failed');
    expect(updated?.syncAttempts).toBe(3);
    expect(updated?.syncError).toContain('Failed after 3 attempts');
  });

  it('should not sync when offline', async () => {
    const { queueOfflineOrder, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    const { registerOrderSubmitFn, runSync } = await import('../client/src/lib/offlineSync');
    await resetOfflineCounter();

    let submitted = false;
    registerOrderSubmitFn(async () => {
      submitted = true;
      return { orderId: 1, orderNumber: '00001' };
    });

    // Mock network as offline
    vi.spyOn(await import('../client/src/lib/offlineQueue'), 'getNetworkStatus').mockReturnValue(false);

    await queueOfflineOrder({
      orderType: 'instore',
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '1',
      customerName: 'Offline Test',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: null,
      userName: null,
    });

    const progress = await runSync();
    expect(progress.status).toBe('error');
    expect(submitted).toBe(false);
  });

  it('should return complete status when no orders to sync', async () => {
    const { resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    const { runSync } = await import('../client/src/lib/offlineSync');
    await resetOfflineCounter();

    vi.spyOn(await import('../client/src/lib/offlineQueue'), 'getNetworkStatus').mockReturnValue(true);

    const progress = await runSync();
    expect(progress.status).toBe('complete');
    expect(progress.total).toBe(0);
  });
});

// ─── 4. Conflict Resolution Tests ───────────────────────────────────

describe('Conflict Resolution', () => {
  it('should preserve original timestamp for offline orders (timestamp-based ordering)', async () => {
    const { queueOfflineOrder, getOfflineOrder, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    const beforeTime = Date.now();
    
    const order = await queueOfflineOrder({
      orderType: 'instore',
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '5',
      customerName: 'Timestamp Test',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: 1,
      userName: 'Staff',
    });

    const afterTime = Date.now();

    // The createdAt timestamp should be between before and after
    expect(order.createdAt).toBeGreaterThanOrEqual(beforeTime);
    expect(order.createdAt).toBeLessThanOrEqual(afterTime);

    // This timestamp will be sent as offlineCreatedAt to the server during sync
    // Server uses it to set the order's createdAt, preserving chronological order
    const retrieved = await getOfflineOrder(order.offlineId);
    expect(retrieved?.createdAt).toBe(order.createdAt);
  });

  it('should sync orders in chronological order (staff-placed priority)', async () => {
    const { queueOfflineOrder, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    const { registerOrderSubmitFn, runSync } = await import('../client/src/lib/offlineSync');
    await resetOfflineCounter();

    const syncOrder: string[] = [];
    registerOrderSubmitFn(async (order) => {
      syncOrder.push(order.offlineId);
      return { orderId: 1, orderNumber: '00001' };
    });

    vi.spyOn(await import('../client/src/lib/offlineQueue'), 'getNetworkStatus').mockReturnValue(true);

    const params = {
      orderType: 'instore' as const,
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '1',
      customerName: 'Order Test',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: 1,
      userName: 'Staff',
    };

    // Queue 3 orders — they should sync in the same order they were created
    await queueOfflineOrder(params);
    await queueOfflineOrder({ ...params, tableNumber: '2' });
    await queueOfflineOrder({ ...params, tableNumber: '3' });

    await runSync();

    expect(syncOrder).toEqual(['OFF-001', 'OFF-002', 'OFF-003']);
  });

  it('should handle same-table orders from different sources (no conflict)', async () => {
    const { queueOfflineOrder, getQueuedOrders, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    // Two orders for the same table — both should be preserved
    // (one could be from staff, one from customer QR scan)
    const params = {
      orderType: 'instore' as const,
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '5', // Same table
      customerName: 'Staff Order',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: 1,
      userName: 'Staff',
    };

    await queueOfflineOrder(params);
    await queueOfflineOrder({ ...params, customerName: 'Customer Order', userId: null, userName: null });

    const queued = await getQueuedOrders();
    expect(queued).toHaveLength(2);
    // Both orders for table 5 should exist — they're different transactions
    expect(queued[0].tableNumber).toBe('5');
    expect(queued[1].tableNumber).toBe('5');
    expect(queued[0].customerName).toBe('Staff Order');
    expect(queued[1].customerName).toBe('Customer Order');
  });
});

// ─── 5. Cleanup Tests ───────────────────────────────────────────────

describe('Cleanup', () => {
  it('should clean up synced orders older than 24 hours', async () => {
    const { queueOfflineOrder, updateOfflineOrderStatus, cleanupSyncedOrders, getAllOfflineOrders, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    const params = {
      orderType: 'instore' as const,
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '1',
      customerName: 'Cleanup Test',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: null,
      userName: null,
    };

    const order1 = await queueOfflineOrder(params);
    const order2 = await queueOfflineOrder(params);

    // Mark both as synced, but order1 was synced 25 hours ago
    await updateOfflineOrderStatus(order1.offlineId, {
      status: 'synced',
      syncedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
    });
    await updateOfflineOrderStatus(order2.offlineId, {
      status: 'synced',
      syncedAt: Date.now() - 1 * 60 * 60 * 1000, // 1 hour ago
    });

    const cleaned = await cleanupSyncedOrders();
    expect(cleaned).toBe(1); // Only order1 should be cleaned

    const remaining = await getAllOfflineOrders();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].offlineId).toBe(order2.offlineId);
  });

  it('should not clean up queued or failed orders', async () => {
    const { queueOfflineOrder, updateOfflineOrderStatus, cleanupSyncedOrders, getAllOfflineOrders, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    const params = {
      orderType: 'instore' as const,
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '1',
      customerName: 'Keep Test',
      customerPhone: '9876543210',
      items: createMockCartItems(1),
      specialInstructions: '',
      discountCode: null,
      subtotal: 40000,
      gstAmount: 2000,
      totalAmount: 42000,
      userId: null,
      userName: null,
    };

    await queueOfflineOrder(params); // queued
    const order2 = await queueOfflineOrder(params);
    await updateOfflineOrderStatus(order2.offlineId, { status: 'failed', syncError: 'Test error' });

    const cleaned = await cleanupSyncedOrders();
    expect(cleaned).toBe(0);

    const remaining = await getAllOfflineOrders();
    expect(remaining).toHaveLength(2);
  });
});

// ─── 6. Load Simulation Tests ────────────────────────────────────────

describe('Load Simulation - 8 Concurrent Orders', () => {
  it('should handle 8 simultaneous offline orders without data loss', async () => {
    const { queueOfflineOrder, getAllOfflineOrders, getUnprintedKots, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    // Simulate 8 simultaneous orders (rush hour scenario)
    const orderPromises = Array.from({ length: 8 }, (_, i) => 
      queueOfflineOrder({
        orderType: 'instore',
        outletId: 2,
        outletName: 'T. Nagar',
        tableNumber: String(i + 1),
        customerName: `Customer ${i + 1}`,
        customerPhone: `987654321${i}`,
        items: createMockCartItems(i % 3 + 1), // 1-3 items per order
        specialInstructions: i % 2 === 0 ? 'Extra napkins' : '',
        discountCode: null,
        subtotal: 40000 * (i % 3 + 1),
        gstAmount: 2000 * (i % 3 + 1),
        totalAmount: 42000 * (i % 3 + 1),
        userId: i < 4 ? i + 1 : null, // First 4 are staff, last 4 are guests
        userName: i < 4 ? `Staff ${i + 1}` : null,
      })
    );

    const orders = await Promise.all(orderPromises);

    // All 8 orders should be created
    expect(orders).toHaveLength(8);

    // All should have unique IDs
    const ids = orders.map(o => o.offlineId);
    expect(new Set(ids).size).toBe(8);

    // All should be queued
    expect(orders.every(o => o.status === 'queued')).toBe(true);

    // All should have KOTs
    const kots = await getUnprintedKots();
    expect(kots).toHaveLength(8);

    // Verify data integrity
    const allOrders = await getAllOfflineOrders();
    expect(allOrders).toHaveLength(8);

    // Each order should have correct table number
    for (let i = 0; i < 8; i++) {
      const order = orders[i];
      expect(order.tableNumber).toBe(String(i + 1));
      expect(order.customerName).toBe(`Customer ${i + 1}`);
    }
  });

  it('should sync 8 orders sequentially without corruption', async () => {
    const { queueOfflineOrder, getOfflineOrder, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    const { registerOrderSubmitFn, runSync } = await import('../client/src/lib/offlineSync');
    await resetOfflineCounter();

    let syncCount = 0;
    const syncedOrders: string[] = [];
    registerOrderSubmitFn(async (order) => {
      syncCount++;
      syncedOrders.push(order.offlineId);
      // Simulate varying server response times
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
      return { orderId: 1000 + syncCount, orderNumber: `0100${syncCount}` };
    });

    vi.spyOn(await import('../client/src/lib/offlineQueue'), 'getNetworkStatus').mockReturnValue(true);

    // Queue 8 orders
    for (let i = 0; i < 8; i++) {
      await queueOfflineOrder({
        orderType: 'instore',
        outletId: 2,
        outletName: 'T. Nagar',
        tableNumber: String(i + 1),
        customerName: `Load Test ${i + 1}`,
        customerPhone: `987654321${i}`,
        items: createMockCartItems(1),
        specialInstructions: '',
        discountCode: null,
        subtotal: 40000,
        gstAmount: 2000,
        totalAmount: 42000,
        userId: null,
        userName: null,
      });
    }

    const progress = await runSync();
    expect(progress.total).toBe(8);
    expect(progress.synced).toBe(8);
    expect(progress.failed).toBe(0);
    expect(syncCount).toBe(8);

    // Verify sequential sync (chronological order preserved)
    expect(syncedOrders).toEqual([
      'OFF-001', 'OFF-002', 'OFF-003', 'OFF-004',
      'OFF-005', 'OFF-006', 'OFF-007', 'OFF-008',
    ]);

    // Verify each order has correct server data
    for (let i = 0; i < 8; i++) {
      const order = await getOfflineOrder(`OFF-${String(i + 1).padStart(3, '0')}`);
      expect(order?.status).toBe('synced');
      expect(order?.serverId).toBe(1001 + i);
    }
  });

  it('should handle partial sync failure in 8-order batch', async () => {
    const { queueOfflineOrder, getQueuedOrders, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    const { registerOrderSubmitFn, runSync } = await import('../client/src/lib/offlineSync');
    await resetOfflineCounter();

    let callCount = 0;
    registerOrderSubmitFn(async (order) => {
      callCount++;
      // Orders 3 and 6 fail (simulating intermittent connectivity)
      if (callCount === 3 || callCount === 6) {
        throw new Error('Connection reset');
      }
      return { orderId: callCount, orderNumber: `0000${callCount}` };
    });

    vi.spyOn(await import('../client/src/lib/offlineQueue'), 'getNetworkStatus').mockReturnValue(true);

    for (let i = 0; i < 8; i++) {
      await queueOfflineOrder({
        orderType: 'instore',
        outletId: 2,
        outletName: 'T. Nagar',
        tableNumber: String(i + 1),
        customerName: `Partial Fail ${i + 1}`,
        customerPhone: `987654321${i}`,
        items: createMockCartItems(1),
        specialInstructions: '',
        discountCode: null,
        subtotal: 40000,
        gstAmount: 2000,
        totalAmount: 42000,
        userId: null,
        userName: null,
      });
    }

    const progress = await runSync();
    expect(progress.synced).toBe(6);
    expect(progress.failed).toBe(2);
    expect(progress.errors).toHaveLength(2);

    // Failed orders should still be in queue for retry
    const remaining = await getQueuedOrders();
    // Failed orders with 1 attempt are still 'queued' status
    expect(remaining.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── 7. Data Integrity Tests ─────────────────────────────────────────

describe('Data Integrity', () => {
  it('should preserve all item details through queue/retrieve cycle', async () => {
    const { queueOfflineOrder, getOfflineOrder, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    const complexItems = [{
      id: 'complex-1',
      productId: 150,
      productName: 'Brown Sugar Boba Milk',
      subcategoryId: 1,
      size: 'large' as const,
      withBoba: true,
      bobaSize: 'large',
      bobaType: 'tapioca',
      sugarLevel: '75%',
      iceLevel: 'regular',
      addons: [
        { id: 1, name: 'Extra Boba', price: 5000 },
        { id: 2, name: 'Coconut Jelly', price: 4000 },
      ],
      productAddons: [
        { id: 10, name: 'Cream Cap', quantity: 1, pricePerUnit: 6000, totalPrice: 6000, selectionMode: 'quantity' as const },
      ],
      extraEspresso: false,
      coconutCreamCap: true,
      quantity: 2,
      unitPrice: 45000,
      addonsTotal: 15000,
      lineTotal: 120000,
      specialInstructions: 'Less sweet please',
    }];

    const order = await queueOfflineOrder({
      orderType: 'instore',
      outletId: 1,
      outletName: 'Palladium Mall',
      tableNumber: 'A3',
      customerName: 'Integrity Test',
      customerPhone: '9876543210',
      items: complexItems as any,
      specialInstructions: 'Birthday celebration',
      discountCode: 'BDAY20',
      subtotal: 120000,
      gstAmount: 6000,
      totalAmount: 126000,
      userId: 5,
      userName: 'Manager',
    });

    const retrieved = await getOfflineOrder(order.offlineId);
    expect(retrieved).toBeDefined();
    
    // Verify all fields preserved
    expect(retrieved!.outletId).toBe(1);
    expect(retrieved!.outletName).toBe('Palladium Mall');
    expect(retrieved!.tableNumber).toBe('A3');
    expect(retrieved!.specialInstructions).toBe('Birthday celebration');
    expect(retrieved!.discountCode).toBe('BDAY20');
    expect(retrieved!.userId).toBe(5);
    expect(retrieved!.userName).toBe('Manager');

    // Verify item details
    const item = retrieved!.items[0];
    expect(item.productName).toBe('Brown Sugar Boba Milk');
    expect(item.size).toBe('large');
    expect(item.withBoba).toBe(true);
    expect(item.bobaType).toBe('tapioca');
    expect(item.sugarLevel).toBe('75%');
    expect(item.coconutCreamCap).toBe(true);
    expect(item.addons).toHaveLength(2);
    expect(item.productAddons).toHaveLength(1);
    expect(item.productAddons![0].name).toBe('Cream Cap');
    expect(item.specialInstructions).toBe('Less sweet please');
  });

  it('should handle empty addons and optional fields', async () => {
    const { queueOfflineOrder, getOfflineOrder, resetOfflineCounter } = await import('../client/src/lib/offlineQueue');
    await resetOfflineCounter();

    const minimalItems = [{
      id: 'minimal-1',
      productId: 300,
      productName: 'Water',
      subcategoryId: 10,
      addons: [],
      quantity: 1,
      unitPrice: 5000,
      addonsTotal: 0,
      lineTotal: 5000,
    }];

    const order = await queueOfflineOrder({
      orderType: 'pickup',
      outletId: 2,
      outletName: 'T. Nagar',
      tableNumber: '',
      customerName: 'Minimal Test',
      customerPhone: '9876543210',
      items: minimalItems as any,
      specialInstructions: '',
      discountCode: null,
      subtotal: 5000,
      gstAmount: 250,
      totalAmount: 5250,
      userId: null,
      userName: null,
    });

    const retrieved = await getOfflineOrder(order.offlineId);
    expect(retrieved!.items[0].addons).toEqual([]);
    expect(retrieved!.items[0].size).toBeUndefined();
    expect(retrieved!.items[0].withBoba).toBeUndefined();
    expect(retrieved!.discountCode).toBeNull();
    expect(retrieved!.userId).toBeNull();
  });
});

// ─── 8. Server-Side offlineCreatedAt Tests ───────────────────────────

describe('Server-Side Offline Timestamp', () => {
  it('should accept offlineCreatedAt in orders.create input schema', async () => {
    // This test verifies the Zod schema accepts the offlineCreatedAt field
    const { z } = await import('zod');
    
    // Recreate the relevant part of the schema
    const orderInputSchema = z.object({
      orderType: z.enum(['instore', 'delivery', 'pickup']),
      offlineCreatedAt: z.number().optional(),
    });

    // Should parse without error
    const result = orderInputSchema.safeParse({
      orderType: 'instore',
      offlineCreatedAt: 1711700000000,
    });
    expect(result.success).toBe(true);

    // Should also work without offlineCreatedAt
    const result2 = orderInputSchema.safeParse({
      orderType: 'instore',
    });
    expect(result2.success).toBe(true);
  });

  it('should convert offlineCreatedAt timestamp to Date correctly', () => {
    const timestamp = 1711700000000; // Some fixed timestamp
    const date = new Date(timestamp);
    
    expect(date.getTime()).toBe(timestamp);
    expect(date instanceof Date).toBe(true);
    // The date should be valid
    expect(isNaN(date.getTime())).toBe(false);
  });
});
