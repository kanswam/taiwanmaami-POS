/**
 * Offline Mode React Context
 * 
 * Provides offline state management to the entire app.
 * Handles network monitoring, sync progress, and offline order queue.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  startNetworkMonitoring,
  onNetworkChange,
  getNetworkStatus,
  queueOfflineOrder,
  getQueuedOrders,
  getAllOfflineOrders,
  getPendingCount,
  getUnprintedKots,
  markKotPrinted,
  type OfflineOrder,
  type OfflineKot,
} from '@/lib/offlineQueue';
import {
  startAutoSync,
  onSyncProgress,
  runSync,
  retryFailedOrders,
  registerOrderSubmitFn,
  type SyncProgress,
  type SyncStatus,
} from '@/lib/offlineSync';
import { trpc } from '@/lib/trpc';
import type { CartItem } from '@shared/types';

// ─── Context Types ───────────────────────────────────────────────────

interface OfflineContextValue {
  /** Whether the app is currently online (server reachable) */
  isOnline: boolean;
  /** Whether offline mode is enabled (user can toggle) */
  offlineModeEnabled: boolean;
  /** Toggle offline mode on/off */
  setOfflineModeEnabled: (enabled: boolean) => void;
  /** Number of orders waiting to sync */
  pendingOrderCount: number;
  /** Current sync progress */
  syncProgress: SyncProgress;
  /** All offline orders (for display in admin/POS) */
  offlineOrders: OfflineOrder[];
  /** Unprinted KOTs from offline orders */
  unprintedKots: OfflineKot[];
  /** Queue a new offline order (returns the offline order with temp ID) */
  placeOfflineOrder: (params: OfflineOrderParams) => Promise<OfflineOrder>;
  /** Manually trigger sync */
  triggerSync: () => Promise<void>;
  /** Retry all failed orders */
  retryFailed: () => Promise<void>;
  /** Mark a KOT as printed */
  markKotAsPrinted: (offlineOrderId: string) => Promise<void>;
  /** Refresh offline data */
  refreshOfflineData: () => Promise<void>;
}

interface OfflineOrderParams {
  orderType: 'instore' | 'pickup';
  outletId: number;
  outletName: string;
  tableNumber: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  specialInstructions: string;
  discountCode: string | null;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  userId: number | null;
  userName: string | null;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineModeEnabled, setOfflineModeEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('taiwanMaami_offlineMode') === 'true';
  });
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    status: 'idle',
    total: 0,
    synced: 0,
    failed: 0,
    currentOrder: null,
    errors: [],
  });
  const [offlineOrders, setOfflineOrders] = useState<OfflineOrder[]>([]);
  const [unprintedKots, setUnprintedKots] = useState<OfflineKot[]>([]);

  // tRPC mutation for syncing offline orders to server
  const createOrderMutation = trpc.orders.create.useMutation();
  const guestCreateOrderMutation = trpc.guest.createOrder.useMutation();

  // Register the order submit function for the sync engine
  const submitOrderRef = useRef<(order: OfflineOrder) => Promise<{ orderId: number; orderNumber: string }>>(undefined);
  
  submitOrderRef.current = useCallback(async (order: OfflineOrder) => {
    // Build the order data in the format expected by the server
    const orderData = {
      orderType: order.orderType,
      outletId: order.outletId,
      tableNumber: order.tableNumber || undefined,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      paymentMethod: 'cash' as const,
      specialInstructions: order.specialInstructions || undefined,
      discountCode: order.discountCode || undefined,
      offlineCreatedAt: order.createdAt, // Send original timestamp for conflict resolution
      items: order.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        size: item.size,
        withBoba: item.withBoba,
        bobaSize: item.bobaSize,
        bobaType: item.bobaType,
        poppingBobaFlavor: item.poppingBobaFlavor,
        extraBoba: item.extraBoba,
        sugarLevel: item.sugarLevel,
        iceLevel: item.iceLevel,
        addons: item.addons || [],
        productAddons: item.productAddons || [],
        extraEggCount: item.extraEggCount,
        extraCheese: item.extraCheese,
        coconutCreamCap: item.coconutCreamCap,
        extraEspresso: item.extraEspresso,
        specialInstructions: item.specialInstructions,
      })),
    };

    // Use the appropriate mutation based on whether user is authenticated
    if (order.userId) {
      const result = await createOrderMutation.mutateAsync(orderData as any);
      return { orderId: result.orderId, orderNumber: result.orderNumber };
    } else {
      const result = await guestCreateOrderMutation.mutateAsync(orderData as any);
      return { orderId: result.orderId, orderNumber: result.orderNumber };
    }
  }, [createOrderMutation, guestCreateOrderMutation]);

  // Register the submit function with the sync engine
  useEffect(() => {
    registerOrderSubmitFn(async (order) => {
      if (submitOrderRef.current) {
        return submitOrderRef.current(order);
      }
      throw new Error('Order submit function not ready');
    });
  }, []);

  // Persist offline mode setting
  useEffect(() => {
    localStorage.setItem('taiwanMaami_offlineMode', String(offlineModeEnabled));
  }, [offlineModeEnabled]);

  // Start network monitoring
  useEffect(() => {
    const cleanupNetwork = startNetworkMonitoring();
    setIsOnline(getNetworkStatus());

    const cleanupListener = onNetworkChange((online) => {
      setIsOnline(online);
    });

    return () => {
      cleanupNetwork();
      cleanupListener();
    };
  }, []);

  // Start auto-sync when offline mode is enabled
  useEffect(() => {
    if (!offlineModeEnabled) return;

    const cleanupAutoSync = startAutoSync();
    return cleanupAutoSync;
  }, [offlineModeEnabled]);

  // Subscribe to sync progress
  useEffect(() => {
    const cleanup = onSyncProgress((progress) => {
      setSyncProgress(progress);
      // Refresh data after sync completes
      if (progress.status === 'complete' || progress.status === 'error') {
        refreshOfflineData();
      }
    });
    return cleanup;
  }, []);

  // Refresh offline data periodically and on mount
  const refreshOfflineData = useCallback(async () => {
    try {
      const [count, orders, kots] = await Promise.all([
        getPendingCount(),
        getAllOfflineOrders(),
        getUnprintedKots(),
      ]);
      setPendingOrderCount(count);
      setOfflineOrders(orders);
      setUnprintedKots(kots);
    } catch (e) {
      console.error('Failed to refresh offline data:', e);
    }
  }, []);

  useEffect(() => {
    if (offlineModeEnabled) {
      refreshOfflineData();
      // Refresh every 5 seconds when offline mode is active
      const interval = setInterval(refreshOfflineData, 5000);
      return () => clearInterval(interval);
    }
  }, [offlineModeEnabled, refreshOfflineData]);

  // ─── Actions ─────────────────────────────────────────────────────

  const placeOfflineOrder = useCallback(async (params: OfflineOrderParams): Promise<OfflineOrder> => {
    const order = await queueOfflineOrder(params);
    await refreshOfflineData();
    return order;
  }, [refreshOfflineData]);

  const triggerSync = useCallback(async () => {
    await runSync();
    await refreshOfflineData();
  }, [refreshOfflineData]);

  const retryFailed = useCallback(async () => {
    await retryFailedOrders();
    await refreshOfflineData();
  }, [refreshOfflineData]);

  const markKotAsPrinted = useCallback(async (offlineOrderId: string) => {
    await markKotPrinted(offlineOrderId);
    await refreshOfflineData();
  }, [refreshOfflineData]);

  const value: OfflineContextValue = {
    isOnline,
    offlineModeEnabled,
    setOfflineModeEnabled,
    pendingOrderCount,
    syncProgress,
    offlineOrders,
    unprintedKots,
    placeOfflineOrder,
    triggerSync,
    retryFailed,
    markKotAsPrinted,
    refreshOfflineData,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useOffline(): OfflineContextValue {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
