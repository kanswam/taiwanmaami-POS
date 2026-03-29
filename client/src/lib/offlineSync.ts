/**
 * Offline Sync Engine
 * 
 * Handles syncing offline orders to the server when connectivity returns.
 * 
 * Conflict Resolution Strategy:
 * - Timestamp-based: orders are synced in chronological order
 * - Server is source of truth for customer-placed orders
 * - Local queue takes priority for staff-placed orders
 * - Table conflicts: if same table has a server order AND an offline order,
 *   both orders are preserved (server order from customer, offline order from staff)
 *   since they represent different transactions
 * 
 * Sync Flow:
 * 1. Detect connectivity restored
 * 2. Get all queued orders from IndexedDB
 * 3. Sync each order sequentially (to preserve order numbers)
 * 4. Update local status after each sync
 * 5. Throttle to avoid overwhelming the server
 */

import {
  getQueuedOrders,
  updateOfflineOrderStatus,
  cleanupSyncedOrders,
  getNetworkStatus,
  onNetworkChange,
  type OfflineOrder,
} from './offlineQueue';

// ─── Types ───────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'complete' | 'error';

export interface SyncProgress {
  status: SyncStatus;
  total: number;
  synced: number;
  failed: number;
  currentOrder: string | null;
  errors: { offlineId: string; error: string }[];
}

type SyncListener = (progress: SyncProgress) => void;
type OrderSubmitFn = (order: OfflineOrder) => Promise<{ orderId: number; orderNumber: string }>;

// ─── Sync Engine ─────────────────────────────────────────────────────

const syncListeners: Set<SyncListener> = new Set();
let isSyncing = false;
let syncProgress: SyncProgress = {
  status: 'idle',
  total: 0,
  synced: 0,
  failed: 0,
  currentOrder: null,
  errors: [],
};

// The function that actually submits orders to the server
// This is injected from the React component that has access to tRPC
let submitOrderFn: OrderSubmitFn | null = null;

/** Register the order submission function (called from React component) */
export function registerOrderSubmitFn(fn: OrderSubmitFn): void {
  submitOrderFn = fn;
}

/** Subscribe to sync progress updates */
export function onSyncProgress(listener: SyncListener): () => void {
  syncListeners.add(listener);
  // Immediately send current state
  listener(syncProgress);
  return () => { syncListeners.delete(listener); };
}

/** Get current sync progress */
export function getSyncProgress(): SyncProgress {
  return { ...syncProgress };
}

function notifySyncListeners() {
  const snapshot = { ...syncProgress };
  syncListeners.forEach(listener => {
    try { listener(snapshot); } catch (e) { console.error('Sync listener error:', e); }
  });
}

function updateProgress(updates: Partial<SyncProgress>) {
  syncProgress = { ...syncProgress, ...updates };
  notifySyncListeners();
}

// ─── Sync Logic ──────────────────────────────────────────────────────

/** Throttle delay between order syncs (ms) — prevents overwhelming the server */
const SYNC_THROTTLE_MS = 500;

/** Max retry attempts per order before marking as failed */
const MAX_SYNC_RETRIES = 3;

/** 
 * Sync a single offline order to the server.
 * Returns true if successful, false if failed.
 */
async function syncSingleOrder(order: OfflineOrder): Promise<boolean> {
  if (!submitOrderFn) {
    console.error('No order submit function registered');
    return false;
  }

  // Mark as syncing
  await updateOfflineOrderStatus(order.offlineId, { status: 'syncing' });
  updateProgress({ currentOrder: order.offlineId });

  try {
    // Submit to server via tRPC
    const result = await submitOrderFn(order);

    // Success — update local record
    await updateOfflineOrderStatus(order.offlineId, {
      status: 'synced',
      serverId: result.orderId,
      serverOrderNumber: result.orderNumber,
      syncedAt: Date.now(),
      syncError: null,
    });

    return true;
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown sync error';
    const attempts = (order.syncAttempts || 0) + 1;

    // Check if we should retry or mark as permanently failed
    if (attempts >= MAX_SYNC_RETRIES) {
      await updateOfflineOrderStatus(order.offlineId, {
        status: 'failed',
        syncError: `Failed after ${attempts} attempts: ${errorMessage}`,
        syncAttempts: attempts,
      });
    } else {
      // Keep as queued for retry
      await updateOfflineOrderStatus(order.offlineId, {
        status: 'queued',
        syncError: errorMessage,
        syncAttempts: attempts,
      });
    }

    return false;
  }
}

/** 
 * Run the full sync process.
 * Syncs all queued orders sequentially with throttling.
 */
export async function runSync(): Promise<SyncProgress> {
  // Prevent concurrent syncs
  if (isSyncing) {
    return syncProgress;
  }

  // Check connectivity
  if (!getNetworkStatus()) {
    updateProgress({ status: 'error' });
    return syncProgress;
  }

  isSyncing = true;

  try {
    const queuedOrders = await getQueuedOrders();

    if (queuedOrders.length === 0) {
      updateProgress({ status: 'complete', total: 0, synced: 0, failed: 0, currentOrder: null, errors: [] });
      return syncProgress;
    }

    updateProgress({
      status: 'syncing',
      total: queuedOrders.length,
      synced: 0,
      failed: 0,
      currentOrder: null,
      errors: [],
    });

    let synced = 0;
    let failed = 0;
    const errors: { offlineId: string; error: string }[] = [];

    // Sync orders sequentially (preserves chronological order)
    for (const order of queuedOrders) {
      // Re-check connectivity before each order
      if (!getNetworkStatus()) {
        updateProgress({ status: 'error', currentOrder: null });
        break;
      }

      const success = await syncSingleOrder(order);

      if (success) {
        synced++;
      } else {
        failed++;
        const updatedOrder = await import('./offlineQueue').then(m => m.getOfflineOrder(order.offlineId));
        errors.push({
          offlineId: order.offlineId,
          error: updatedOrder?.syncError || 'Unknown error',
        });
      }

      updateProgress({ synced, failed, errors });

      // Throttle between orders to avoid overwhelming the server
      if (queuedOrders.indexOf(order) < queuedOrders.length - 1) {
        await new Promise(resolve => setTimeout(resolve, SYNC_THROTTLE_MS));
      }
    }

    // Final status
    const finalStatus: SyncStatus = failed > 0 ? 'error' : 'complete';
    updateProgress({ status: finalStatus, currentOrder: null });

    // Cleanup old synced orders (older than 24 hours)
    try {
      await cleanupSyncedOrders();
    } catch (e) {
      console.error('Cleanup error:', e);
    }

    return syncProgress;
  } finally {
    isSyncing = false;
  }
}

/** Force retry all failed orders */
export async function retryFailedOrders(): Promise<void> {
  const queued = await getQueuedOrders();
  const failed = queued.filter(o => o.status === 'failed');

  for (const order of failed) {
    await updateOfflineOrderStatus(order.offlineId, {
      status: 'queued',
      syncAttempts: 0,
      syncError: null,
    });
  }

  // Trigger sync
  if (getNetworkStatus()) {
    await runSync();
  }
}

// ─── Auto-Sync on Reconnect ─────────────────────────────────────────

let autoSyncEnabled = false;
let cleanupNetworkListener: (() => void) | null = null;

/** Start auto-syncing when connectivity returns */
export function startAutoSync(): () => void {
  if (autoSyncEnabled) return () => {};

  autoSyncEnabled = true;

  cleanupNetworkListener = onNetworkChange(async (online) => {
    if (online && autoSyncEnabled) {
      // Small delay to ensure connection is stable
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Re-check connectivity
      if (getNetworkStatus()) {
        console.log('[OfflineSync] Connection restored, starting sync...');
        await runSync();
      }
    }
  });

  // Also try syncing immediately if we're already online and have queued orders
  if (getNetworkStatus()) {
    getQueuedOrders().then(orders => {
      if (orders.length > 0) {
        runSync();
      }
    });
  }

  return () => {
    autoSyncEnabled = false;
    if (cleanupNetworkListener) {
      cleanupNetworkListener();
      cleanupNetworkListener = null;
    }
  };
}
