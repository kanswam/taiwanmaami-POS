/**
 * Offline Queue Service for Staff POS
 * 
 * Provides offline resilience for in-store and pickup orders.
 * When internet drops, orders are saved to IndexedDB and synced when connectivity returns.
 * 
 * Scope (critical path only):
 * - Place order → save to IndexedDB
 * - Generate KOT data locally
 * - Auto-sync when online
 * 
 * Out of scope (fail gracefully):
 * - Loyalty stamps (sync later)
 * - Analytics/reporting (sync later)
 * - Delivery orders (require payment gateway)
 * - Discount authorization (require server)
 */

import { createStore, get, set, del, keys, entries } from 'idb-keyval';
import type { CartItem } from '@shared/types';

// Dedicated IndexedDB store for offline orders
const offlineStore = createStore('taiwan-maami-offline', 'orders');
const kotStore = createStore('taiwan-maami-offline', 'kots');
const syncMetaStore = createStore('taiwan-maami-offline', 'sync-meta');

// ─── Types ───────────────────────────────────────────────────────────

export type OfflineOrderStatus = 'queued' | 'syncing' | 'synced' | 'failed';

export interface OfflineOrder {
  /** Unique local ID (e.g., "OFF-001") */
  offlineId: string;
  /** Server-assigned order ID after sync (null until synced) */
  serverId: number | null;
  /** Server-assigned order number after sync (null until synced) */
  serverOrderNumber: string | null;
  /** Order type — only instore and pickup supported offline */
  orderType: 'instore' | 'pickup';
  /** Outlet: 1 = Palladium, 2 = T.Nagar */
  outletId: number;
  /** Table number for in-store orders */
  tableNumber: string;
  /** Customer info */
  customerName: string;
  customerPhone: string;
  /** Payment method — only cash supported offline */
  paymentMethod: 'cash';
  /** Cart items snapshot */
  items: OfflineOrderItem[];
  /** Special instructions for the whole order */
  specialInstructions: string;
  /** Discount code (will be validated on sync) */
  discountCode: string | null;
  /** Calculated totals (in paise) */
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  /** Timestamps */
  createdAt: number; // Unix ms — used for conflict resolution
  syncedAt: number | null;
  /** Sync status */
  status: OfflineOrderStatus;
  /** Error message if sync failed */
  syncError: string | null;
  /** Number of sync attempts */
  syncAttempts: number;
  /** User ID of the staff member (if authenticated) */
  userId: number | null;
  userName: string | null;
  /** Outlet name for display */
  outletName: string;
}

export interface OfflineOrderItem {
  productId: number;
  productName: string;
  size?: string;
  withBoba?: boolean;
  bobaSize?: string;
  bobaType?: string;
  poppingBobaFlavor?: string;
  extraBoba?: { type: string; size?: string; flavor?: string; price: number };
  sugarLevel?: string;
  iceLevel?: string;
  addons: { id: number; name: string; price: number }[];
  productAddons?: { id: number; name: string; quantity: number; pricePerUnit: number; totalPrice: number; selectionMode?: string }[];
  extraEggCount?: number;
  extraCheese?: boolean;
  coconutCreamCap?: boolean;
  extraEspresso?: boolean;
  quantity: number;
  unitPrice: number;
  addonsTotal: number;
  lineTotal: number;
  specialInstructions?: string;
}

export interface OfflineKot {
  /** Matches the offline order's offlineId */
  offlineOrderId: string;
  /** KOT data in the same format as server KOTs */
  kotData: KotData;
  /** Whether this KOT has been printed locally */
  isPrinted: boolean;
  /** Timestamp */
  createdAt: number;
}

export interface KotData {
  orderId: string; // offline order number
  orderType: string;
  tableNumber: string;
  customerName: string;
  customerPhone: string;
  specialInstructions: string;
  items: {
    productName: string;
    quantity: number;
    price: number;
    size?: string;
    withBoba?: boolean;
    bobaType?: string;
    poppingBobaFlavor?: string;
    sugarLevel?: string;
    iceLevel?: string;
    specialInstructions: string;
    addons: { name: string; price: number }[];
  }[];
  totalAmount: number;
  createdAt: string;
  isOffline: true; // Flag to identify offline KOTs
}

// ─── Offline Counter ─────────────────────────────────────────────────

let offlineCounter = 0;
let counterLock: Promise<void> = Promise.resolve();

async function getNextOfflineId(): Promise<string> {
  // Mutex lock to prevent race conditions when multiple orders are queued simultaneously
  let resolve: () => void;
  const prevLock = counterLock;
  counterLock = new Promise<void>(r => { resolve = r; });
  await prevLock;
  
  try {
    // Load counter from IndexedDB to persist across page reloads
    const stored = await get<number>('counter', syncMetaStore);
    offlineCounter = (stored || 0) + 1;
    await set('counter', offlineCounter, syncMetaStore);
    return `OFF-${String(offlineCounter).padStart(3, '0')}`;
  } finally {
    resolve!();
  }
}

/** Reset the offline counter (e.g., at start of day) */
export async function resetOfflineCounter(): Promise<void> {
  offlineCounter = 0;
  counterLock = Promise.resolve();
  await set('counter', 0, syncMetaStore);
}

// ─── Network Detection ───────────────────────────────────────────────

type NetworkListener = (online: boolean) => void;
const networkListeners: Set<NetworkListener> = new Set();

let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

/** 
 * Check actual connectivity by pinging the server.
 * navigator.onLine only checks if there's a network interface — 
 * it doesn't verify the server is reachable.
 */
async function checkServerReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    // Ping a lightweight endpoint
    const response = await fetch('/api/trpc/auth.me', {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    return response.ok || response.status === 401; // 401 means server is reachable but not authenticated
  } catch {
    return false;
  }
}

function notifyListeners(online: boolean) {
  if (online !== isOnline) {
    isOnline = online;
    networkListeners.forEach(listener => {
      try { listener(online); } catch (e) { console.error('Network listener error:', e); }
    });
  }
}

/** Start monitoring network status with heartbeat pings */
export function startNetworkMonitoring(): () => void {
  // Browser events (fast detection)
  const handleOnline = () => {
    // Verify with actual server ping before declaring online
    checkServerReachable().then(reachable => notifyListeners(reachable));
  };
  const handleOffline = () => notifyListeners(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Heartbeat ping every 5 seconds (catches cases where browser events miss)
  heartbeatInterval = setInterval(async () => {
    const reachable = await checkServerReachable();
    notifyListeners(reachable);
  }, 5000);

  // Initial check
  checkServerReachable().then(reachable => {
    isOnline = reachable;
  });

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };
}

/** Subscribe to network status changes */
export function onNetworkChange(listener: NetworkListener): () => void {
  networkListeners.add(listener);
  return () => { networkListeners.delete(listener); };
}

/** Get current network status */
export function getNetworkStatus(): boolean {
  return isOnline;
}

// ─── Order Queue Operations ──────────────────────────────────────────

/** Save an order to the offline queue */
export async function queueOfflineOrder(params: {
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
}): Promise<OfflineOrder> {
  const offlineId = await getNextOfflineId();
  
  // Map CartItems to OfflineOrderItems (strip non-serializable data)
  const offlineItems: OfflineOrderItem[] = params.items.map(item => ({
    productId: item.productId,
    productName: item.productName,
    size: item.size,
    withBoba: item.withBoba,
    bobaSize: item.bobaSize,
    bobaType: item.bobaType,
    poppingBobaFlavor: item.poppingBobaFlavor,
    extraBoba: item.extraBoba,
    sugarLevel: item.sugarLevel,
    iceLevel: item.iceLevel,
    addons: item.addons,
    productAddons: item.productAddons,
    extraEggCount: item.extraEggCount,
    extraCheese: item.extraCheese,
    coconutCreamCap: item.coconutCreamCap,
    extraEspresso: item.extraEspresso,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    addonsTotal: item.addonsTotal,
    lineTotal: item.lineTotal,
    specialInstructions: item.specialInstructions,
  }));

  const order: OfflineOrder = {
    offlineId,
    serverId: null,
    serverOrderNumber: null,
    orderType: params.orderType,
    outletId: params.outletId,
    tableNumber: params.tableNumber,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    paymentMethod: 'cash',
    items: offlineItems,
    specialInstructions: params.specialInstructions,
    discountCode: params.discountCode,
    subtotal: params.subtotal,
    gstAmount: params.gstAmount,
    totalAmount: params.totalAmount,
    createdAt: Date.now(),
    syncedAt: null,
    status: 'queued',
    syncError: null,
    syncAttempts: 0,
    userId: params.userId,
    userName: params.userName,
    outletName: params.outletName,
  };

  await set(offlineId, order, offlineStore);
  
  // Also generate KOT data for local printing
  await generateOfflineKot(order);

  return order;
}

/** Get all queued (unsynced) orders */
export async function getQueuedOrders(): Promise<OfflineOrder[]> {
  const allEntries = await entries<string, OfflineOrder>(offlineStore);
  return allEntries
    .map(([, order]) => order)
    .filter(o => o.status === 'queued' || o.status === 'failed')
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** Get all offline orders (including synced) */
export async function getAllOfflineOrders(): Promise<OfflineOrder[]> {
  const allEntries = await entries<string, OfflineOrder>(offlineStore);
  return allEntries
    .map(([, order]) => order)
    .sort((a, b) => b.createdAt - a.createdAt); // newest first
}

/** Get a specific offline order */
export async function getOfflineOrder(offlineId: string): Promise<OfflineOrder | undefined> {
  return get<OfflineOrder>(offlineId, offlineStore);
}

/** Update an offline order's sync status */
export async function updateOfflineOrderStatus(
  offlineId: string,
  updates: Partial<Pick<OfflineOrder, 'status' | 'serverId' | 'serverOrderNumber' | 'syncedAt' | 'syncError' | 'syncAttempts'>>
): Promise<void> {
  const order = await get<OfflineOrder>(offlineId, offlineStore);
  if (!order) return;
  
  const updated = { ...order, ...updates };
  await set(offlineId, updated, offlineStore);
}

/** Remove synced orders older than 24 hours (cleanup) */
export async function cleanupSyncedOrders(): Promise<number> {
  const allEntries = await entries<string, OfflineOrder>(offlineStore);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
  let cleaned = 0;
  
  for (const [key, order] of allEntries) {
    if (order.status === 'synced' && order.syncedAt && order.syncedAt < cutoff) {
      await del(key, offlineStore);
      cleaned++;
    }
  }
  
  return cleaned;
}

/** Get count of pending (unsynced) orders */
export async function getPendingCount(): Promise<number> {
  const allKeys = await keys(offlineStore);
  let count = 0;
  for (const key of allKeys) {
    const order = await get<OfflineOrder>(key as string, offlineStore);
    if (order && (order.status === 'queued' || order.status === 'failed')) {
      count++;
    }
  }
  return count;
}

// ─── Offline KOT Generation ─────────────────────────────────────────

/** Generate KOT data for an offline order (for local printing) */
async function generateOfflineKot(order: OfflineOrder): Promise<OfflineKot> {
  const kotData: KotData = {
    orderId: order.offlineId,
    orderType: order.orderType.toUpperCase(),
    tableNumber: order.tableNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    specialInstructions: order.specialInstructions,
    items: order.items.map(item => ({
      productName: item.productName,
      quantity: item.quantity,
      price: item.unitPrice,
      size: item.size,
      withBoba: item.withBoba,
      sugarLevel: item.sugarLevel,
      iceLevel: item.iceLevel,
      specialInstructions: item.specialInstructions || '',
      addons: [
        ...item.addons.map(a => ({ name: a.name, price: a.price })),
        ...(item.productAddons || []).map(pa => ({ name: pa.name, price: pa.totalPrice })),
      ],
    })),
    totalAmount: order.totalAmount,
    createdAt: new Date(order.createdAt).toISOString(),
    isOffline: true,
  };

  const kot: OfflineKot = {
    offlineOrderId: order.offlineId,
    kotData,
    isPrinted: false,
    createdAt: Date.now(),
  };

  await set(order.offlineId, kot, kotStore);
  return kot;
}

/** Get all unprinted offline KOTs */
export async function getUnprintedKots(): Promise<OfflineKot[]> {
  const allEntries = await entries<string, OfflineKot>(kotStore);
  return allEntries
    .map(([, kot]) => kot)
    .filter(k => !k.isPrinted)
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** Mark an offline KOT as printed */
export async function markKotPrinted(offlineOrderId: string): Promise<void> {
  const kot = await get<OfflineKot>(offlineOrderId, kotStore);
  if (!kot) return;
  await set(offlineOrderId, { ...kot, isPrinted: true }, kotStore);
}

/** Get KOT data for a specific offline order */
export async function getKotForOrder(offlineOrderId: string): Promise<OfflineKot | undefined> {
  return get<OfflineKot>(offlineOrderId, kotStore);
}
