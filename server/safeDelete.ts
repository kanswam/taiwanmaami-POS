/**
 * SAFE DELETE FUNCTIONS
 * 
 * These functions ONLY delete data marked as test data (isTestData = true).
 * Production data (isTestData = false) is NEVER deleted by these functions.
 * 
 * CRITICAL: Never use raw DELETE queries on orders/order_items tables.
 * Always use these safe functions instead.
 */

import { getDb } from "./db";
import { orders, orderItems, orderItemAddons, kotQueue, receiptQueue } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { createBackup } from "./backup";

export interface SafeDeleteResult {
  success: boolean;
  deletedOrders: number;
  deletedOrderItems: number;
  deletedAddons: number;
  deletedKotQueue: number;
  deletedReceiptQueue: number;
  backupUrl?: string;
  error?: string;
}

/**
 * Safely delete ONLY test orders and related data.
 * This function:
 * 1. Creates a backup before any deletion
 * 2. Only deletes orders where isTestData = true
 * 3. Returns a detailed report of what was deleted
 */
export async function safeDeleteTestData(): Promise<SafeDeleteResult> {
  try {
    const db = await getDb();
    if (!db) {
      return {
        success: false,
        deletedOrders: 0,
        deletedOrderItems: 0,
        deletedAddons: 0,
        deletedKotQueue: 0,
        deletedReceiptQueue: 0,
        error: "Database not available"
      };
    }

    // Step 1: Create backup BEFORE any deletion
    console.log("[SafeDelete] Creating backup before deletion...");
    const backupResult = await createBackup();
    
    if (!backupResult.success) {
      return {
        success: false,
        deletedOrders: 0,
        deletedOrderItems: 0,
        deletedAddons: 0,
        deletedKotQueue: 0,
        deletedReceiptQueue: 0,
        error: "Failed to create backup before deletion. Aborting for safety."
      };
    }
    
    console.log("[SafeDelete] Backup created:", backupResult.backupUrl);
    
    // Step 2: Get test order IDs
    const testOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.isTestData, true));
    
    if (testOrders.length === 0) {
      return {
        success: true,
        deletedOrders: 0,
        deletedOrderItems: 0,
        deletedAddons: 0,
        deletedKotQueue: 0,
        deletedReceiptQueue: 0,
        backupUrl: backupResult.backupUrl,
        error: "No test data found to delete."
      };
    }
    
    const testOrderIds = testOrders.map((o) => o.id);
    const testOrderIdStrings = testOrderIds.map((id) => String(id));
    console.log(`[SafeDelete] Found ${testOrderIds.length} test orders to delete`);
    
    // Step 3: Get test order item IDs
    const testOrderItems = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.isTestData, true));
    
    const testOrderItemIds = testOrderItems.map((i) => i.id);
    
    // Step 4: Delete in correct order (respecting foreign keys)
    let deletedAddons = 0;
    if (testOrderItemIds.length > 0) {
      const addonResult = await db
        .delete(orderItemAddons)
        .where(inArray(orderItemAddons.orderItemId, testOrderItemIds));
      deletedAddons = (addonResult as any)[0]?.affectedRows || 0;
    }
    
    // Delete test order items
    const itemResult = await db
      .delete(orderItems)
      .where(eq(orderItems.isTestData, true));
    const deletedOrderItems = (itemResult as any)[0]?.affectedRows || 0;
    
    // Delete KOT queue entries for test orders
    let deletedKotQueue = 0;
    if (testOrderIdStrings.length > 0) {
      const kotResult = await db
        .delete(kotQueue)
        .where(inArray(kotQueue.orderId, testOrderIdStrings));
      deletedKotQueue = (kotResult as any)[0]?.affectedRows || 0;
    }
    
    // Delete receipt queue entries for test orders
    let deletedReceiptQueue = 0;
    if (testOrderIds.length > 0) {
      const receiptResult = await db
        .delete(receiptQueue)
        .where(inArray(receiptQueue.orderId, testOrderIds));
      deletedReceiptQueue = (receiptResult as any)[0]?.affectedRows || 0;
    }
    
    // Delete test orders
    const orderResult = await db
      .delete(orders)
      .where(eq(orders.isTestData, true));
    const deletedOrders = (orderResult as any)[0]?.affectedRows || 0;
    
    console.log(`[SafeDelete] Deleted: ${deletedOrders} orders, ${deletedOrderItems} items, ${deletedAddons} addons`);
    
    return {
      success: true,
      deletedOrders,
      deletedOrderItems,
      deletedAddons,
      deletedKotQueue,
      deletedReceiptQueue,
      backupUrl: backupResult.backupUrl
    };
    
  } catch (error) {
    console.error("[SafeDelete] Error:", error);
    return {
      success: false,
      deletedOrders: 0,
      deletedOrderItems: 0,
      deletedAddons: 0,
      deletedKotQueue: 0,
      deletedReceiptQueue: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Mark orders as test data.
 * Use this to flag orders that should be deletable.
 */
export async function markOrdersAsTestData(orderIds: number[]): Promise<{ success: boolean; markedCount: number }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, markedCount: 0 };
    }

    const result = await db
      .update(orders)
      .set({ isTestData: true })
      .where(inArray(orders.id, orderIds));
    
    // Also mark related order items
    await db
      .update(orderItems)
      .set({ isTestData: true })
      .where(inArray(orderItems.orderId, orderIds));
    
    return {
      success: true,
      markedCount: (result as any)[0]?.affectedRows || 0
    };
  } catch (error) {
    console.error("[SafeDelete] Error marking orders as test data:", error);
    return {
      success: false,
      markedCount: 0
    };
  }
}

/**
 * Check if any production data would be affected by a delete operation.
 * Returns true if there is production data that would be at risk.
 */
export async function hasProductionData(): Promise<{ hasProduction: boolean; productionCount: number; testCount: number }> {
  const db = await getDb();
  if (!db) {
    return { hasProduction: false, productionCount: 0, testCount: 0 };
  }

  const productionOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.isTestData, false));
  
  const testOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.isTestData, true));
  
  return {
    hasProduction: productionOrders.length > 0,
    productionCount: productionOrders.length,
    testCount: testOrders.length
  };
}
