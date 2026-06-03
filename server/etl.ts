/**
 * MaamiTech Data Lake ETL Handler
 * 
 * Route: POST /api/scheduled/etl
 * Protected by: serviceAuthMiddleware (MAAMITECH_SERVICE_TOKEN)
 * 
 * Pulls data from:
 *   - POS orders (local DB — T.Nagar in-store)
 *   - Petpooja webhook orders (local DB — Palladium in-store + delivery for both outlets)
 *   - Inventory stock levels (inventory.thamaraifoods.com)
 *   - Inventory wastage logs (inventory.thamaraifoods.com)
 * 
 * Writes to:
 *   - Supabase data lake (sales_facts, stock_snapshots, wastage_facts, data_completeness)
 * 
 * Idempotency: DELETE WHERE outlet=X AND order_date=Y AND source=Z before inserting.
 * Runs daily at 1am IST via Manus scheduled task trigger.
 */

import { Request, Response } from "express";
import { ENV } from "./_core/env";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { orders, orderItems } from "../drizzle/schema";
import { getDb } from "./db";

const MAAMITECH_SERVICE_TOKEN = ENV.maamitechServiceToken;
const INVENTORY_BASE_URL = "https://inventory.thamaraifoods.com";

// Outlet mapping for our website POS (outletId in orders table)
// outletId 1 = Palladium (but no POS orders come from here — Palladium uses Petpooja POS)
// outletId 2 = T.Nagar (our website POS)
const POS_OUTLET_MAP: Record<number, string> = {
  1: "palladium",
  2: "tnagar",
  3: "annanagar",
};

// Petpooja restId to outlet mapping (confirmed May 2026)
// Maps to the same outlet names used in sales_facts ("palladium" or "tnagar")
const PETPOOJA_OUTLET_MAP: Record<string, string> = {
  's16db4mw':   'palladium',  // License 157805 — Palladium In-store
  '9itpu6o0':   'palladium',  // License 334130 — Palladium Delivery
  'que6b2myco': 'tnagar',     // License 395793 — T.Nagar Delivery
  'ANNANAGAR_TBD': 'annanagar', // Placeholder — Anna Nagar Delivery (restId TBD once Petpooja licence set up)
};

interface ETLResult {
  batchId: string;
  reportDate: string;
  salesFacts: { inserted: number; deleted: number; errors: number };
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
 * Supabase REST API helper - delete rows matching a filter
 * Used for idempotent re-runs: delete old data before re-inserting
 */
async function supabaseDelete(table: string, filters: Record<string, string>): Promise<{ error?: string }> {
  const params = Object.entries(filters).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&");
  const url = `${ENV.supabaseUrl}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: ENV.supabaseServiceRoleKey,
      Authorization: `Bearer ${ENV.supabaseServiceRoleKey}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    return { error: `Delete ${table} failed: ${res.status}: ${errText}` };
  }

  return {};
}

/**
 * Idempotent delete: removes existing rows for a specific outlet + date + source
 * This ensures re-runs don't create duplicates
 */
async function idempotentDeleteSalesFacts(reportDate: string, outlet: string, source: string): Promise<{ error?: string }> {
  return supabaseDelete("sales_facts", {
    order_date: reportDate,
    outlet,
    source,
  });
}

/**
 * Pull POS orders for a given date and transform into sales_facts rows
 * Source: Our website POS (taiwanmaami.com) — primarily T.Nagar in-store orders
 */
async function pullPOSOrders(reportDate: string, batchId: string): Promise<{ rows: any[]; count: number; errors: string[] }> {
  const errors: string[] = [];
  const rows: any[] = [];

  try {
    const db = await getDb();
    if (!db) { errors.push("Database not available"); return { rows, count: 0, errors }; }

    const startOfDay = new Date(`${reportDate}T00:00:00.000+05:30`);
    const endOfDay = new Date(`${reportDate}T23:59:59.999+05:30`);

    const { ne } = await import("drizzle-orm");

    const joinResults = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        createdAt: orders.createdAt,
        outletId: orders.outletId,
        orderType: orders.orderType,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        totalAmount: orders.totalAmount,
        stateGst: orders.stateGst,
        centralGst: orders.centralGst,
        discountAmount: orders.discountAmount,
        subtotal: orders.subtotal,
        itemId: orderItems.id,
        productName: orderItems.productName,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        lineTotal: orderItems.lineTotal,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          gte(orders.createdAt, startOfDay),
          lte(orders.createdAt, endOfDay),
          eq(orders.isTestData, false),
          ne(orders.orderStatus, "cancelled"),
          eq(orderItems.status, "active")
        )
      )
      .orderBy(orders.id, orderItems.id);

    const orderMap = new Map<number, { order: typeof joinResults[0]; items: typeof joinResults }>();
    for (const row of joinResults) {
      if (!orderMap.has(row.orderId)) {
        orderMap.set(row.orderId, { order: row, items: [] });
      }
      orderMap.get(row.orderId)!.items.push(row);
    }

    for (const { order, items } of Array.from(orderMap.values())) {
      const outlet = POS_OUTLET_MAP[order.outletId ?? 1] || "unknown";
      const orderTotal = (order.totalAmount ?? 0) / 100;
      const orderTax = ((order.stateGst ?? 0) + (order.centralGst ?? 0)) / 100;
      const orderDiscount = (order.discountAmount ?? 0) / 100;
      const orderSubtotal = (order.subtotal ?? 0) / 100;

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        rows.push({
          source: "pos",
          source_order_id: order.orderNumber || String(order.orderId),
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
          order_subtotal_rupees: idx === 0 ? orderSubtotal.toFixed(2) : null,
          order_tax_rupees: idx === 0 ? orderTax.toFixed(2) : null,
          order_discount_rupees: idx === 0 ? orderDiscount.toFixed(2) : null,
          order_total_rupees: idx === 0 ? orderTotal.toFixed(2) : null,
          aggregator: null,
          channel: order.orderType === "delivery" ? "delivery" : "instore",
          raw_data: { orderId: order.orderId, itemId: item.itemId },
          etl_batch_id: batchId,
          item_sequence: idx,
        });
      }
    }

    return { rows, count: orderMap.size, errors };
  } catch (err: any) {
    errors.push(`POS orders pull failed: ${err.message}`);
    return { rows, count: 0, errors };
  }
}

/**
 * Pull Petpooja webhook orders for a given date
 * Source: Petpooja POS — covers Palladium in-store + delivery for both outlets
 * 
 * Key fields from webhook:
 *   orderType: "Dine In" | "Pick Up" | "Delivery"
 *   orderFrom: "POS" | "Zomato" | "Swiggy"
 *   restId: identifies which Petpooja license/outlet
 *   outletId: mapped to our outlet ID (if configured)
 *   outletName: resolved outlet name
 */
async function pullPetpoojaWebhookOrders(reportDate: string, batchId: string): Promise<{ rows: any[]; count: number; errors: string[] }> {
  const errors: string[] = [];
  const rows: any[] = [];

  try {
    if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
      errors.push("Supabase not configured");
      return { rows, count: 0, errors };
    }

    // Query Supabase petpooja_orders for this date (IST)
    const startISO = `${reportDate}T00:00:00+05:30`;
    const endISO = `${reportDate}T23:59:59+05:30`;
    const ordersUrl = `${ENV.supabaseUrl}/rest/v1/petpooja_orders?select=*&petpooja_created_at=gte.${encodeURIComponent(startISO)}&petpooja_created_at=lte.${encodeURIComponent(endISO)}&status=eq.Success`;
    const ordersRes = await fetch(ordersUrl, {
      headers: {
        apikey: ENV.supabaseServiceRoleKey,
        Authorization: `Bearer ${ENV.supabaseServiceRoleKey}`,
      },
    });
    if (!ordersRes.ok) {
      const errText = await ordersRes.text();
      errors.push(`Supabase petpooja_orders fetch failed: ${ordersRes.status}: ${errText}`);
      return { rows, count: 0, errors };
    }
    const webhookOrders: any[] = await ordersRes.json();
    console.log(`[ETL] Petpooja webhook: found ${webhookOrders.length} orders in Supabase for ${reportDate}`);

    // Fetch all items for these orders
    const orderIds = webhookOrders.map(o => o.petpooja_order_id);
    let allItems: any[] = [];
    if (orderIds.length > 0) {
      // Fetch items in batches of 50 order IDs
      for (let i = 0; i < orderIds.length; i += 50) {
        const batch = orderIds.slice(i, i + 50);
        const itemFilter = batch.map(id => `petpooja_order_id.eq.${id}`).join(',');
        const itemsUrl = `${ENV.supabaseUrl}/rest/v1/petpooja_order_items?select=*&or=(${itemFilter})`;
        const itemsRes = await fetch(itemsUrl, {
          headers: {
            apikey: ENV.supabaseServiceRoleKey,
            Authorization: `Bearer ${ENV.supabaseServiceRoleKey}`,
          },
        });
        if (itemsRes.ok) {
          const batchItems = await itemsRes.json();
          allItems = allItems.concat(batchItems);
        }
      }
    }

    // Group items by composite key petpooja_order_id + outlet_id
    // petpooja_order_id alone is not unique — Palladium and T.Nagar use independent
    // sequential counters and collide on 193 order IDs. outlet_id disambiguates.
    const itemsByKey: Record<string, any[]> = {};
    for (const item of allItems) {
      const key = `${item.petpooja_order_id}__${item.outlet_id}`;
      if (!itemsByKey[key]) itemsByKey[key] = [];
      itemsByKey[key].push(item);
    }

    for (const order of webhookOrders) {
      // outlet_id from Supabase already has the mapped value (e.g. "palladium_instore", "tnagar_delivery")
      // Extract base outlet name: "palladium_instore" → "palladium", "tnagar_delivery" → "tnagar"
      let outlet = "unknown";
      const outletId = order.outlet_id || "";
      if (outletId.startsWith("palladium")) outlet = "palladium";
      else if (outletId.startsWith("tnagar")) outlet = "tnagar";
      else outlet = outletId;

      // Determine order type from Supabase order_type field
      let orderType = "delivery";
      const rawOrderType = (order.order_type || "").toLowerCase();
      if (rawOrderType.includes("dine")) orderType = "instore";
      else if (rawOrderType.includes("pick")) orderType = "pickup";
      else orderType = "delivery";

      // Determine aggregator (Zomato, Swiggy, or null for POS/dine-in)
      const aggregator = order.order_from !== "POS" ? order.order_from : null;

      const items = itemsByKey[`${order.petpooja_order_id}__${order.outlet_id}`] || [];
      
      if (items.length === 0) {
        // If no line items, still create a single row for the order total
        rows.push({
          source: "petpooja_webhook",
          source_order_id: `${order.petpooja_order_id}_${order.outlet_id}`,
          order_date: reportDate,
          order_timestamp: order.petpooja_created_at || order.ingested_at,
          outlet,
          order_type: orderType,
          payment_method: order.payment_type || null,
          payment_status: "completed",
          customer_name: null,
          customer_phone: null,
          item_name: "Order Total (no line items)",
          item_category: null,
          item_quantity: 1,
          item_unit_price_rupees: String(order.total || 0),
          item_total_rupees: String(order.total || 0),
          order_subtotal_rupees: String(order.core_total || 0),
          order_tax_rupees: String(order.tax_total || 0),
          order_discount_rupees: String(order.discount_total || 0),
          order_total_rupees: String(order.total || 0),
          aggregator,
          channel: "petpooja",
          raw_data: { supabaseOrderId: order.id },
          etl_batch_id: batchId,
          item_sequence: 0,
        });
      } else {
        for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx];
          rows.push({
            source: "petpooja_webhook",
            source_order_id: `${order.petpooja_order_id}_${order.outlet_id}`,
            order_date: reportDate,
            order_timestamp: order.petpooja_created_at || order.ingested_at,
            outlet,
            order_type: orderType,
            payment_method: order.payment_type || null,
            payment_status: "completed",
            customer_name: null,
            customer_phone: null,
            item_name: item.item_name || "Unknown",
            item_category: item.category_name || null,
            item_quantity: item.quantity || 1,
            item_unit_price_rupees: String(item.price || 0),
            item_total_rupees: String(item.total || 0),
            order_subtotal_rupees: idx === 0 ? String(order.core_total || 0) : null,
            order_tax_rupees: idx === 0 ? String(order.tax_total || 0) : null,
            order_discount_rupees: idx === 0 ? String(order.discount_total || 0) : null,
            order_total_rupees: idx === 0 ? String(order.total || 0) : null,
            aggregator,
            channel: "petpooja",
            raw_data: { supabaseOrderId: order.id },
            etl_batch_id: batchId,
            item_sequence: idx,
          });
        }
      }
    }

    return { rows, count: webhookOrders.length, errors };
  } catch (err: any) {
    errors.push(`Petpooja webhook pull failed: ${err.message}`);
    return { rows, count: 0, errors };
  }
}

/**
 * Pull stock levels from Inventory system
 */
async function pullInventoryStock(reportDate: string, batchId: string): Promise<{ rows: any[]; count: number; errors: string[] }> {
  const errors: string[] = [];
  const rows: any[] = [];

  try {
    // tRPC query procedures require GET with input as URL-encoded JSON
    const input = encodeURIComponent(JSON.stringify({ json: { date: reportDate } }));
    const res = await fetch(`${INVENTORY_BASE_URL}/api/trpc/stock.levels?input=${input}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${MAAMITECH_SERVICE_TOKEN}`,
      },
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
        // Map locationName to outlet slug
        const locName = (item.locationName || "").toLowerCase();
        const outlet = locName.includes("palladium") ? "palladium" : locName.includes("nagar") ? "tnagar" : "all";
        rows.push({
          snapshot_date: reportDate,
          item_name: item.itemName || item.name || "Unknown",
          item_sku: item.itemCode || item.sku || null,
          category: item.category || null,
          current_quantity: item.totalIssueUnits ?? item.currentQuantity ?? 0,
          unit: item.uomIssue || item.unit || null,
          min_stock_level: parseFloat(item.lowStockThreshold) || null,
          is_low_stock: item.isLowStock ?? false,
          outlet,
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
    // tRPC query procedures require GET with input as URL-encoded JSON
    const input = encodeURIComponent(JSON.stringify({ json: { date: reportDate } }));
    const res = await fetch(`${INVENTORY_BASE_URL}/api/trpc/wastage.logs?input=${input}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${MAAMITECH_SERVICE_TOKEN}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      // wastage.logs may require user-level auth — log but don't fail the whole ETL
      if (res.status === 401) {
        errors.push(`Inventory wastage API requires user auth (401) — skipping`);
      } else {
        errors.push(`Inventory wastage API returned ${res.status}: ${errText.substring(0, 200)}`);
      }
      return { rows, count: 0, errors };
    }

    const data = await res.json();
    const wastageItems = data?.result?.data?.json || data?.result?.data || [];

    if (Array.isArray(wastageItems)) {
      for (const item of wastageItems) {
        const locName = (item.locationName || "").toLowerCase();
        const outlet = locName.includes("palladium") ? "palladium" : locName.includes("nagar") ? "tnagar" : "all";
        rows.push({
          wastage_date: reportDate,
          item_name: item.itemName || item.name || "Unknown",
          item_sku: item.itemCode || item.sku || null,
          quantity: item.quantity ?? 0,
          unit: item.uomIssue || item.unit || null,
          reason: item.reason || null,
          reported_by: item.reportedBy || item.createdBy || null,
          outlet,
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
 * 
 * Idempotency strategy:
 *   For each (outlet, date, source) combo, DELETE existing rows THEN INSERT new ones.
 *   This means re-running the ETL for the same date is safe and produces the same result.
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

  // ===== 3. Pull Inventory Stock =====
  console.log(`[ETL] Pulling inventory stock levels...`);
  const stockResult = await pullInventoryStock(reportDate, batchId);
  errors.push(...stockResult.errors);

  // ===== 4. Pull Inventory Wastage =====
  console.log(`[ETL] Pulling inventory wastage logs...`);
  const wastageResult = await pullInventoryWastage(reportDate, batchId);
  errors.push(...wastageResult.errors);

  // ===== 5. Idempotent Delete — scoped per outlet + date + source =====
  console.log(`[ETL] Performing idempotent delete (scoped per outlet/date/source)...`);
  let totalDeleted = 0;

  // Determine which outlet+source combos we have data for
  const posOutlets = Array.from(new Set(posResult.rows.map(r => r.outlet)));
  const webhookOutlets = Array.from(new Set(petpoojaWebhookResult.rows.map(r => r.outlet)));

  // Delete POS data for outlets that have new POS data
  for (const outlet of posOutlets) {
    const delResult = await idempotentDeleteSalesFacts(reportDate, outlet, "pos");
    if (delResult.error) errors.push(delResult.error);
    else totalDeleted++;
  }

  // Delete webhook data for outlets that have new webhook data
  for (const outlet of webhookOutlets) {
    const delResult = await idempotentDeleteSalesFacts(reportDate, outlet, "petpooja_webhook");
    if (delResult.error) errors.push(delResult.error);
    else totalDeleted++;
  }

  // If no webhook data but we ran the query (webhook not activated yet),
  // still delete any stale webhook data for all outlets for this date
  if (webhookOutlets.length === 0) {
    for (const outlet of ["palladium", "tnagar"]) {
      await idempotentDeleteSalesFacts(reportDate, outlet, "petpooja_webhook");
    }
  }

  // Also delete any old petpooja_csv data for this date (we no longer use CSV)
  for (const outlet of ["palladium", "tnagar"]) {
    await supabaseDelete("sales_facts", { order_date: reportDate, outlet, source: "petpooja_csv" });
  }

  // Delete old stock/wastage for this date
  await supabaseDelete("stock_snapshots", { snapshot_date: reportDate });
  await supabaseDelete("wastage_facts", { wastage_date: reportDate });

  // Delete old data_completeness for this date
  await supabaseDelete("data_completeness", { report_date: reportDate });

  // ===== 6. Write to Supabase =====
  console.log(`[ETL] Writing to Supabase...`);

  // Combine all sales facts (POS + webhook only, no CSV)
  const allSalesFacts = [...posResult.rows, ...petpoojaWebhookResult.rows];
  
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
    const outletWebhookCount = petpoojaWebhookResult.rows.filter(r => r.outlet === outlet).length;
    
    // For T.Nagar: POS data comes from our website
    // For Palladium: POS data comes from Petpooja webhook (orderType="Dine In")
    const posStatus = outletPosCount > 0 ? "complete" : "missing";
    const webhookStatus = outletWebhookCount > 0 ? "complete" : "missing";
    const inventoryStockStatus = stockResult.count > 0 ? "complete" : (stockResult.errors.length > 0 ? "error" : "missing");
    const inventoryWastageStatus = wastageResult.count > 0 ? "complete" : (wastageResult.errors.length > 0 ? "error" : "missing");

    // Determine overall status
    let overallStatus = "complete";
    if (outlet === "tnagar" && posStatus === "missing") overallStatus = "incomplete";
    if (outlet === "palladium" && webhookStatus === "missing") overallStatus = "incomplete";
    if (webhookStatus === "missing") overallStatus = "incomplete"; // delivery data missing
    if (inventoryStockStatus !== "complete") overallStatus = "incomplete";

    const notes: string[] = [];
    if (outlet === "tnagar" && posStatus === "missing") notes.push("No website POS orders");
    if (outlet === "palladium" && webhookStatus === "missing") notes.push("No Petpooja webhook data (in-store)");
    if (webhookStatus === "missing") notes.push("Petpooja webhook pending activation");
    if (inventoryStockStatus !== "complete") notes.push(`Inventory stock: ${inventoryStockStatus}`);
    if (inventoryWastageStatus !== "complete") notes.push(`Inventory wastage: ${inventoryWastageStatus}`);

    return {
      report_date: reportDate,
      outlet,
      pos_orders_count: outletPosCount,
      pos_orders_status: posStatus,
      petpooja_csv_uploaded: false, // No longer using CSV
      petpooja_csv_items_count: 0,
      petpooja_webhook_count: outletWebhookCount,
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
    salesFacts: { inserted: salesInserted, deleted: totalDeleted, errors: salesErrors },
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
