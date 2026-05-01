/**
 * MaamiTech Data Lake ETL Handler
 * 
 * Route: POST /api/scheduled/etl
 * Protected by: serviceAuthMiddleware (MAAMITECH_SERVICE_TOKEN)
 * 
 * Pulls data from:
 *   - POS orders (local DB via service endpoint logic)
 *   - Inventory stock levels (inventory.thamaraifoods.com)
 *   - Inventory wastage logs (inventory.thamaraifoods.com)
 *   - Petpooja uploads (local DB)
 * 
 * Writes to:
 *   - Supabase data lake (sales_facts, stock_snapshots, wastage_facts, data_completeness)
 * 
 * Runs daily at 1am IST via Manus scheduled task trigger.
 */

import { Request, Response } from "express";
import { ENV } from "./_core/env";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { orders, orderItems, orderItemAddons, petpoojaWebhookOrders, deliverySalesUploads, deliveryItemSales } from "../drizzle/schema";
import { getDb } from "./db";

const MAAMITECH_SERVICE_TOKEN = ENV.maamitechServiceToken;
const INVENTORY_BASE_URL = "https://inventory.thamaraifoods.com";

// Outlet mapping for POS
const OUTLET_MAP: Record<number, string> = {
  1: "palladium",
  2: "tnagar",
};

interface ETLResult {
  batchId: string;
  reportDate: string;
  salesFacts: { inserted: number; errors: number };
  stockSnapshots: { inserted: number; errors: number };
  wastageFacts: { inserted: number; errors: number };
  dataCompleteness: { outlets: string[] };
  duration: number;
  errors: string[];
}

/**
 * Supabase REST API helper - inserts rows into a table
 */
async function supabaseInsert(table: string, rows: any[]): Promise<{ count: number; error?: string }> {
  if (!rows.length) return { count: 0 };

  const url = `${ENV.supabaseUrl}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: ENV.supabaseServiceRoleKey,
      Authorization: `Bearer ${ENV.supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { count: 0, error: `${res.status}: ${errText}` };
  }

  return { count: rows.length };
}

/**
 * Supabase REST API helper - upsert rows (for data_completeness)
 */
async function supabaseUpsert(table: string, rows: any[], onConflict: string): Promise<{ count: number; error?: string }> {
  if (!rows.length) return { count: 0 };

  const url = `${ENV.supabaseUrl}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: ENV.supabaseServiceRoleKey,
      Authorization: `Bearer ${ENV.supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal,resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { count: 0, error: `${res.status}: ${errText}` };
  }

  return { count: rows.length };
}

/**
 * Pull POS orders for a given date range and transform into sales_facts rows
 */
async function pullPOSOrders(reportDate: string, batchId: string): Promise<{ rows: any[]; count: number; errors: string[] }> {
  const errors: string[] = [];
  const rows: any[] = [];

  try {
    const db = await getDb();
    if (!db) { errors.push("Database not available"); return { rows, count: 0, errors }; }

    // Query directly from the local database (we're in the same process)
    const startOfDay = new Date(`${reportDate}T00:00:00.000+05:30`);
    const endOfDay = new Date(`${reportDate}T23:59:59.999+05:30`);

    const orderResults = await db
      .select()
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, startOfDay),
          lte(orders.createdAt, endOfDay),
          eq(orders.isTestData, false)
        )
      );

    for (const order of orderResults) {
      // Get order items
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      const outlet = OUTLET_MAP[order.outletId ?? 1] || "unknown";
      const orderTotal = (order.totalAmount ?? 0) / 100; // paise to rupees
      const orderTax = ((order.stateGst ?? 0) + (order.centralGst ?? 0)) / 100;
      const orderDiscount = (order.discountAmount ?? 0) / 100;
      const orderSubtotal = (order.subtotal ?? 0) / 100;

      for (const item of items) {
        rows.push({
          source: "pos",
          source_order_id: order.orderNumber || String(order.id),
          order_date: reportDate,
          order_timestamp: order.createdAt?.toISOString() || new Date().toISOString(),
          outlet,
          order_type: order.orderType || "instore",
          payment_method: order.paymentMethod || null,
          payment_status: order.paymentStatus || null,
          customer_name: order.customerName || null,
          customer_phone: order.customerPhone || null,
          item_name: item.productName || "Unknown",
          item_category: null,
          item_quantity: item.quantity ?? 1,
          item_unit_price_rupees: ((item.unitPrice ?? 0) / 100).toFixed(2),
          item_total_rupees: ((item.lineTotal ?? 0) / 100).toFixed(2),
          order_subtotal_rupees: orderSubtotal.toFixed(2),
          order_tax_rupees: orderTax.toFixed(2),
          order_discount_rupees: orderDiscount.toFixed(2),
          order_total_rupees: orderTotal.toFixed(2),
          aggregator: null,
          channel: order.orderType === "delivery" ? "delivery" : "instore",
          raw_data: { orderId: order.id, itemId: item.id },
          etl_batch_id: batchId,
        });
      }
    }

    return { rows, count: orderResults.length, errors };
  } catch (err: any) {
    errors.push(`POS orders pull failed: ${err.message}`);
    return { rows, count: 0, errors };
  }
}

/**
 * Pull Petpooja webhook orders for a given date
 */
async function pullPetpoojaWebhookOrders(reportDate: string, batchId: string): Promise<{ rows: any[]; count: number; errors: string[] }> {
  const errors: string[] = [];
  const rows: any[] = [];

  try {
    const db = await getDb();
    if (!db) { errors.push("Database not available"); return { rows, count: 0, errors }; }

    // Query petpooja_webhook_orders from local DB using Drizzle ORM
    const startOfDay = new Date(`${reportDate}T00:00:00.000+05:30`);
    const endOfDay = new Date(`${reportDate}T23:59:59.999+05:30`);

    const webhookOrders = await db
      .select()
      .from(petpoojaWebhookOrders)
      .where(
        and(
          gte(petpoojaWebhookOrders.receivedAt, startOfDay),
          lte(petpoojaWebhookOrders.receivedAt, endOfDay)
        )
      );

    for (const order of webhookOrders) {
      const items = order.items || [];
      const outlet = OUTLET_MAP[order.outletId ?? 0] || order.outletName || "unknown";

      for (const item of items) {
        rows.push({
          source: "petpooja_webhook",
          source_order_id: order.petpoojaOrderId || String(order.id),
          order_date: reportDate,
          order_timestamp: order.receivedAt?.toISOString() || new Date().toISOString(),
          outlet,
          order_type: order.orderType || "delivery",
          payment_method: order.paymentType || null,
          payment_status: order.status === "Success" ? "completed" : "cancelled",
          customer_name: order.customerName || null,
          customer_phone: order.customerPhone || null,
          item_name: item.name || "Unknown",
          item_category: null,
          item_quantity: item.quantity || 1,
          item_unit_price_rupees: ((item.price || 0) / 100).toFixed(2),
          item_total_rupees: ((item.total || 0) / 100).toFixed(2),
          order_subtotal_rupees: ((order.subtotal ?? 0) / 100).toFixed(2),
          order_tax_rupees: ((order.tax ?? 0) / 100).toFixed(2),
          order_discount_rupees: ((order.discount ?? 0) / 100).toFixed(2),
          order_total_rupees: ((order.totalAmount ?? 0) / 100).toFixed(2),
          aggregator: order.orderFrom !== "POS" ? order.orderFrom : null,
          channel: "petpooja",
          raw_data: { webhookOrderId: order.id },
          etl_batch_id: batchId,
        });
      }
    }

    return { rows, count: webhookOrders.length, errors };
  } catch (err: any) {
    errors.push(`Petpooja webhook pull failed: ${err.message}`);
    return { rows, count: 0, errors };
  }
}

/**
 * Pull Petpooja CSV upload data for a given date
 */
async function pullPetpoojaCSVData(reportDate: string, batchId: string): Promise<{ rows: any[]; uploadCount: number; itemCount: number; errors: string[] }> {
  const errors: string[] = [];
  const rows: any[] = [];

  try {
    const db = await getDb();
    if (!db) { errors.push("Database not available"); return { rows, uploadCount: 0, itemCount: 0, errors }; }

    // Find uploads whose period covers this date
    const targetDate = new Date(`${reportDate}T12:00:00.000+05:30`);

    const uploads = await db
      .select()
      .from(deliverySalesUploads)
      .where(
        and(
          lte(deliverySalesUploads.periodStart, targetDate),
          gte(deliverySalesUploads.periodEnd, targetDate)
        )
      );

    let uploadIds = new Set<number>();

    for (const upload of uploads) {
      uploadIds.add(upload.id);

      // Get items for this upload
      const items = await db
        .select()
        .from(deliveryItemSales)
        .where(eq(deliveryItemSales.uploadId, upload.id));

      for (const item of items) {
        rows.push({
          source: "petpooja_csv",
          source_order_id: `csv_${upload.id}_${item.itemName}`,
          order_date: reportDate,
          order_timestamp: new Date(reportDate + "T12:00:00.000+05:30").toISOString(),
          outlet: upload.periodLabel?.toLowerCase().includes("tnagar") ? "tnagar" : "palladium",
          order_type: "delivery",
          payment_method: null,
          payment_status: "completed",
          customer_name: null,
          customer_phone: null,
          item_name: item.itemName,
          item_category: item.category || null,
          item_quantity: item.quantity || 1,
          item_unit_price_rupees: ((item.amount || 0) / 100 / (item.quantity || 1)).toFixed(2),
          item_total_rupees: ((item.amount || 0) / 100).toFixed(2),
          order_subtotal_rupees: null,
          order_tax_rupees: null,
          order_discount_rupees: null,
          order_total_rupees: null,
          aggregator: null,
          channel: "petpooja_csv",
          raw_data: { uploadId: upload.id, itemId: item.id },
          etl_batch_id: batchId,
        });
      }
    }

    return { rows, uploadCount: uploadIds.size, itemCount: rows.length, errors };
  } catch (err: any) {
    errors.push(`Petpooja CSV pull failed: ${err.message}`);
    return { rows, uploadCount: 0, itemCount: 0, errors };
  }
}

/**
 * Pull stock levels from Inventory system
 */
async function pullInventoryStock(reportDate: string, batchId: string): Promise<{ rows: any[]; count: number; errors: string[] }> {
  const errors: string[] = [];
  const rows: any[] = [];

  try {
    // Call Inventory system tRPC endpoint
    const res = await fetch(`${INVENTORY_BASE_URL}/api/trpc/stock.levels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MAAMITECH_SERVICE_TOKEN}`,
      },
      body: JSON.stringify({ json: { date: reportDate } }),
    });

    if (!res.ok) {
      const errText = await res.text();
      errors.push(`Inventory stock API returned ${res.status}: ${errText.substring(0, 200)}`);
      return { rows, count: 0, errors };
    }

    const data = await res.json();
    const stockItems = data?.result?.data?.json || data?.result?.data || [];

    if (Array.isArray(stockItems)) {
      for (const item of stockItems) {
        rows.push({
          snapshot_date: reportDate,
          item_name: item.name || item.itemName || "Unknown",
          item_sku: item.sku || item.code || null,
          category: item.category || null,
          current_quantity: item.currentQuantity ?? item.quantity ?? 0,
          unit: item.unit || null,
          min_stock_level: item.minStockLevel ?? item.reorderLevel ?? null,
          is_low_stock: item.isLowStock ?? (item.currentQuantity < (item.minStockLevel || 0)),
          outlet: item.outlet || "all",
          raw_data: item,
          etl_batch_id: batchId,
        });
      }
    }

    return { rows, count: rows.length, errors };
  } catch (err: any) {
    errors.push(`Inventory stock pull failed: ${err.message}`);
    return { rows, count: 0, errors };
  }
}

/**
 * Pull wastage logs from Inventory system
 */
async function pullInventoryWastage(reportDate: string, batchId: string): Promise<{ rows: any[]; count: number; errors: string[] }> {
  const errors: string[] = [];
  const rows: any[] = [];

  try {
    const res = await fetch(`${INVENTORY_BASE_URL}/api/trpc/wastage.logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MAAMITECH_SERVICE_TOKEN}`,
      },
      body: JSON.stringify({ json: { date: reportDate } }),
    });

    if (!res.ok) {
      const errText = await res.text();
      errors.push(`Inventory wastage API returned ${res.status}: ${errText.substring(0, 200)}`);
      return { rows, count: 0, errors };
    }

    const data = await res.json();
    const wastageItems = data?.result?.data?.json || data?.result?.data || [];

    if (Array.isArray(wastageItems)) {
      for (const item of wastageItems) {
        rows.push({
          wastage_date: reportDate,
          item_name: item.name || item.itemName || "Unknown",
          item_sku: item.sku || item.code || null,
          quantity: item.quantity ?? 0,
          unit: item.unit || null,
          reason: item.reason || null,
          reported_by: item.reportedBy || item.createdBy || null,
          outlet: item.outlet || "all",
          cost_rupees: item.cost ?? item.costRupees ?? null,
          raw_data: item,
          etl_batch_id: batchId,
        });
      }
    }

    return { rows, count: rows.length, errors };
  } catch (err: any) {
    errors.push(`Inventory wastage pull failed: ${err.message}`);
    return { rows, count: 0, errors };
  }
}

/**
 * Main ETL handler — orchestrates the full pipeline
 */
export async function handleETL(req: Request, res: Response) {
  const startTime = Date.now();
  const errors: string[] = [];

  // Validate Supabase config
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    return res.status(503).json({
      error: "service_misconfigured",
      message: "Supabase credentials not configured.",
    });
  }

  // Determine report date — default to yesterday IST
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const yesterday = new Date(istNow.getTime() - 24 * 60 * 60 * 1000);
  const reportDate = req.query.date as string || yesterday.toISOString().split("T")[0];

  // Generate batch ID
  const batchId = `etl_${reportDate}_${Date.now()}`;

  console.log(`[ETL] Starting batch ${batchId} for date ${reportDate}`);

  // ===== 1. Pull POS Orders =====
  console.log(`[ETL] Pulling POS orders...`);
  const posResult = await pullPOSOrders(reportDate, batchId);
  errors.push(...posResult.errors);

  // ===== 2. Pull Petpooja Webhook Orders =====
  console.log(`[ETL] Pulling Petpooja webhook orders...`);
  const petpoojaWebhookResult = await pullPetpoojaWebhookOrders(reportDate, batchId);
  errors.push(...petpoojaWebhookResult.errors);

  // ===== 3. Pull Petpooja CSV Data =====
  console.log(`[ETL] Pulling Petpooja CSV data...`);
  const petpoojaCSVResult = await pullPetpoojaCSVData(reportDate, batchId);
  errors.push(...petpoojaCSVResult.errors);

  // ===== 4. Pull Inventory Stock =====
  console.log(`[ETL] Pulling inventory stock levels...`);
  const stockResult = await pullInventoryStock(reportDate, batchId);
  errors.push(...stockResult.errors);

  // ===== 5. Pull Inventory Wastage =====
  console.log(`[ETL] Pulling inventory wastage logs...`);
  const wastageResult = await pullInventoryWastage(reportDate, batchId);
  errors.push(...wastageResult.errors);

  // ===== 6. Write to Supabase =====
  console.log(`[ETL] Writing to Supabase...`);

  // Combine all sales facts
  const allSalesFacts = [...posResult.rows, ...petpoojaWebhookResult.rows, ...petpoojaCSVResult.rows];
  
  let salesInserted = 0;
  let salesErrors = 0;
  // Insert in batches of 500 to avoid payload limits
  for (let i = 0; i < allSalesFacts.length; i += 500) {
    const batch = allSalesFacts.slice(i, i + 500);
    const result = await supabaseInsert("sales_facts", batch);
    if (result.error) {
      errors.push(`Sales facts insert batch ${i}: ${result.error}`);
      salesErrors += batch.length;
    } else {
      salesInserted += result.count;
    }
  }

  // Insert stock snapshots
  let stockInserted = 0;
  let stockErrors = 0;
  if (stockResult.rows.length > 0) {
    const result = await supabaseInsert("stock_snapshots", stockResult.rows);
    if (result.error) {
      errors.push(`Stock snapshots insert: ${result.error}`);
      stockErrors = stockResult.rows.length;
    } else {
      stockInserted = result.count;
    }
  }

  // Insert wastage facts
  let wastageInserted = 0;
  let wastageErrors = 0;
  if (wastageResult.rows.length > 0) {
    const result = await supabaseInsert("wastage_facts", wastageResult.rows);
    if (result.error) {
      errors.push(`Wastage facts insert: ${result.error}`);
      wastageErrors = wastageResult.rows.length;
    } else {
      wastageInserted = result.count;
    }
  }

  // ===== 7. Write Data Completeness =====
  console.log(`[ETL] Writing data completeness records...`);
  const outlets = ["palladium", "tnagar"];
  const completenessRows = outlets.map(outlet => {
    const outletPosCount = posResult.rows.filter(r => r.outlet === outlet).length;
    const outletPetpoojaCount = petpoojaWebhookResult.rows.filter(r => r.outlet === outlet).length;
    const hasPetpoojaCSV = petpoojaCSVResult.rows.some(r => r.outlet?.includes(outlet));
    
    const posStatus = outletPosCount > 0 ? "complete" : "missing";
    const inventoryStockStatus = stockResult.count > 0 ? "complete" : (stockResult.errors.length > 0 ? "error" : "missing");
    const inventoryWastageStatus = wastageResult.count > 0 ? "complete" : (wastageResult.errors.length > 0 ? "error" : "missing");

    // Determine overall status
    let overallStatus = "complete";
    if (posStatus === "missing") overallStatus = "incomplete";
    if (inventoryStockStatus !== "complete") overallStatus = "incomplete";
    if (!hasPetpoojaCSV && outletPetpoojaCount === 0) overallStatus = "incomplete";

    const notes: string[] = [];
    if (posStatus === "missing") notes.push("No POS orders found");
    if (!hasPetpoojaCSV && outletPetpoojaCount === 0) notes.push("No Petpooja data (CSV or webhook)");
    if (inventoryStockStatus !== "complete") notes.push(`Inventory stock: ${inventoryStockStatus}`);
    if (inventoryWastageStatus !== "complete") notes.push(`Inventory wastage: ${inventoryWastageStatus}`);

    return {
      report_date: reportDate,
      outlet,
      pos_orders_count: outletPosCount,
      pos_orders_status: posStatus,
      petpooja_csv_uploaded: hasPetpoojaCSV,
      petpooja_csv_items_count: petpoojaCSVResult.rows.filter(r => r.outlet?.includes(outlet)).length,
      petpooja_webhook_count: outletPetpoojaCount,
      inventory_stock_status: inventoryStockStatus,
      inventory_stock_items: stockResult.rows.filter(r => r.outlet === outlet || r.outlet === "all").length,
      inventory_wastage_status: inventoryWastageStatus,
      inventory_wastage_items: wastageResult.rows.filter(r => r.outlet === outlet || r.outlet === "all").length,
      overall_status: overallStatus,
      notes: notes.length > 0 ? notes.join("; ") : null,
      etl_batch_id: batchId,
    };
  });

  const completenessResult = await supabaseInsert("data_completeness", completenessRows);
  if (completenessResult.error) {
    errors.push(`Data completeness insert: ${completenessResult.error}`);
  }

  // ===== 8. Return results =====
  const duration = Date.now() - startTime;
  const result: ETLResult = {
    batchId,
    reportDate,
    salesFacts: { inserted: salesInserted, errors: salesErrors },
    stockSnapshots: { inserted: stockInserted, errors: stockErrors },
    wastageFacts: { inserted: wastageInserted, errors: wastageErrors },
    dataCompleteness: { outlets },
    duration,
    errors,
  };

  console.log(`[ETL] Batch ${batchId} complete in ${duration}ms. Sales: ${salesInserted}, Stock: ${stockInserted}, Wastage: ${wastageInserted}, Errors: ${errors.length}`);

  const status = errors.length === 0 ? 200 : (salesInserted > 0 || stockInserted > 0 ? 207 : 500);
  return res.status(status).json({
    success: errors.length === 0,
    result,
  });
}

/**
 * GET /api/service/etl/status — Check last ETL run status from Supabase
 */
export async function handleETLStatus(req: Request, res: Response) {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    return res.status(503).json({ error: "service_misconfigured", message: "Supabase not configured." });
  }

  try {
    // Get latest data_completeness records
    const url = `${ENV.supabaseUrl}/rest/v1/data_completeness?order=etl_timestamp.desc&limit=10`;
    const response = await fetch(url, {
      headers: {
        apikey: ENV.supabaseServiceRoleKey,
        Authorization: `Bearer ${ENV.supabaseServiceRoleKey}`,
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: "supabase_error", message: await response.text() });
    }

    const records = await response.json();
    return res.json({
      success: true,
      data: {
        lastRuns: records,
        supabaseConnected: true,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: "internal_error", message: err.message });
  }
}
