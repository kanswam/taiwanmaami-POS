/**
 * Petpooja Webhook v2 — Supabase-backed with Raw Archive
 * POST /api/petpooja/webhook
 * 
 * Receives real-time order events from Petpooja POS on bill print.
 * Flow: Archive raw payload → Validate → Process → Update archive status
 * 
 * All data writes go to Supabase (not local MySQL).
 * Tables: petpooja_raw_archive, petpooja_orders, petpooja_order_items, petpooja_ingestion_log
 */

import type { Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './_core/env';

// ── Supabase client (lazy singleton) ────────────────────────────────────────
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
      throw new Error('[petpooja-v2] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
    }
    _supabase = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey);
  }
  return _supabase;
}

// ── Outlet mapping: Petpooja restID → our internal outlet identifiers ───────
// Populate with real restIDs once Petpooja confirms them
const OUTLET_MAP: Record<string, { outletId: string; outletName: string }> = {
  // Will be filled when webhook activates, e.g.:
  // 'cp81ghin': { outletId: 'palladium', outletName: 'Palladium' },
  // 'xxxxxxxx': { outletId: 'tnagar',    outletName: 'T. Nagar'  },
};

// ── Types ────────────────────────────────────────────────────────────────────

interface PetpoojaAddon {
  group_name: string;
  name: string;
  price: number;
  quantity: string;
  addon_id: string;
  addon_group_id: string;
}

interface PetpoojaOrderItem {
  name: string;
  itemid: number;
  itemcode: string;
  price: number;
  quantity: number;
  total: number;
  discount: number;
  tax: number;
  category_name: string;
  addon: PetpoojaAddon[];
  specialnotes: string;
}

interface PetpoojaPartPayment {
  payment_type: string;
  amount: number;
}

interface PetpoojaOrder {
  orderID: number;
  customer_invoice_id: string;
  order_type: 'Dine In' | 'Pick Up' | 'Delivery';
  payment_type: 'Cash' | 'Card' | 'Online' | 'Other' | 'Part Payment';
  table_no: string;
  discount_total: number;
  tax_total: number;
  round_off: string;
  core_total: number;
  total: number;
  created_on: string;          // "YYYY-MM-DD HH:mm:ss" IST (no tz suffix)
  order_from: string;          // POS | Zomato | Swiggy | ...
  order_from_id: string;
  sub_order_type: string;
  packaging_charge: number;
  delivery_charges: number;
  status: 'Success' | 'Cancelled';
  comment: string;
  service_charge: number;
  biller: string;
  assignee: string;
  token_no?: string;
  part_payments?: PetpoojaPartPayment[];
}

interface PetpoojaPayload {
  token?: string;
  Token?: string;             // Petpooja inconsistently capitalises this
  properties: {
    Restaurant: {
      res_name: string;
      restID: string;
    };
    Customer: {
      name: string;
      phone: string;
      address: string;
      gstin: string;
    };
    Order: PetpoojaOrder;
    Tax: { title: string; type: string; rate: number; amount: number }[];
    Discount: { title: string; type: string; rate: number; amount: number }[];
    OrderItem: PetpoojaOrderItem[];
  };
  event: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveOutlet(restID: string): { outletId: string; outletName: string } | null {
  return OUTLET_MAP[restID] ?? null;
}

function normalisePaymentType(order: PetpoojaOrder): string {
  if (order.payment_type === 'Part Payment' && order.part_payments?.length) {
    return order.part_payments.map(p => p.payment_type).join('+');
  }
  return order.payment_type;
}

/**
 * Parse IST timestamp → UTC ISO string
 * Petpooja sends "2025-04-04 11:45:35" with no timezone — it is IST (UTC+5:30)
 */
function parseISTtoUTC(raw: string): string {
  const [date, time] = raw.split(' ');
  const isoIST = `${date}T${time}+05:30`;
  return new Date(isoIST).toISOString();
}

// ── Raw archive write ────────────────────────────────────────────────────────
// Called FIRST before any processing. Even if all downstream logic fails,
// the payload is preserved in petpooja_raw_archive.

async function archiveRawPayload(
  payload: PetpoojaPayload,
  supabase: SupabaseClient
): Promise<number | null> {
  const { data, error } = await supabase
    .from('petpooja_raw_archive')
    .insert({
      outlet_hint: payload.properties?.Restaurant?.restID ?? null,
      event_type: payload.event ?? null,
      petpooja_order_id: payload.properties?.Order?.orderID ?? null,
      raw_payload: payload,
      processing_status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    // Archive failure must never block the main processing path
    console.error('[petpooja-v2] Archive write failed:', error.message);
    return null;
  }

  return data.id;
}

// ── Update archive status after processing ───────────────────────────────────

async function updateArchiveStatus(
  archiveId: number,
  status: 'processed' | 'failed',
  note: string | null,
  supabase: SupabaseClient
): Promise<void> {
  await supabase
    .from('petpooja_raw_archive')
    .update({ processing_status: status, processing_note: note })
    .eq('id', archiveId);
}

// ── Main processing logic ────────────────────────────────────────────────────

async function processWebhook(
  payload: PetpoojaPayload,
  supabase: SupabaseClient
): Promise<{ status: number; body: object }> {

  // 1. Event filter — only process orderdetails for now
  if (payload.event !== 'orderdetails') {
    return { status: 200, body: { message: `Event "${payload.event}" acknowledged, not processed` } };
  }

  const { Restaurant, Order, OrderItem, Discount, Tax } = payload.properties;

  // 2. Idempotency — skip if already ingested
  const idempotencyKey = `petpooja_${Restaurant.restID}_${Order.orderID}`;
  const { data: existing } = await supabase
    .from('petpooja_ingestion_log')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existing) {
    console.log(`[petpooja-v2] Duplicate — ${idempotencyKey} already ingested`);
    return { status: 200, body: { message: 'Already ingested', idempotencyKey } };
  }

  // 3. Outlet resolution
  const outlet = resolveOutlet(Restaurant.restID);
  // Don't hard-reject unknown restIDs — log and continue so we don't lose data
  const outletId = outlet?.outletId ?? `unknown_${Restaurant.restID}`;
  const outletName = outlet?.outletName ?? Restaurant.res_name;

  if (!outlet) {
    console.warn(`[petpooja-v2] Unknown restID "${Restaurant.restID}" — storing with outletId="${outletId}"`);
  }

  // 4. Build order record
  const orderRecord = {
    source: 'petpooja' as const,
    outlet_id: outletId,
    outlet_name: outletName,
    petpooja_order_id: Order.orderID,
    petpooja_invoice_id: Order.customer_invoice_id,
    order_type: Order.order_type,
    payment_type: normalisePaymentType(Order),
    order_from: Order.order_from,
    order_from_id: Order.order_from_id || null,
    table_no: Order.table_no || null,
    status: Order.status,
    core_total: Order.core_total,
    discount_total: Order.discount_total,
    tax_total: Order.tax_total,
    packaging_charge: Order.packaging_charge,
    delivery_charges: Order.delivery_charges,
    service_charge: Order.service_charge,
    round_off: parseFloat(Order.round_off),
    total: Order.total,
    biller: Order.biller || null,
    comment: Order.comment || null,
    petpooja_created_at: parseISTtoUTC(Order.created_on),
    part_payments: Order.part_payments ?? null,
    raw_discounts: Discount.length > 0 ? Discount : null,
    raw_taxes: Tax.length > 0 ? Tax : null,
    idempotency_key: idempotencyKey,
    ingested_at: new Date().toISOString(),
  };

  // 5. Build order item records
  const itemRecords = OrderItem.map(item => ({
    source: 'petpooja' as const,
    outlet_id: outletId,
    petpooja_order_id: Order.orderID,
    petpooja_item_id: item.itemid,
    item_code: item.itemcode,
    item_name: item.name,
    category_name: item.category_name,
    price: item.price,
    quantity: item.quantity,
    total: item.total,
    discount: item.discount,
    tax: item.tax,
    addons: item.addon.length > 0 ? item.addon : null,
    special_notes: item.specialnotes || null,
    petpooja_created_at: parseISTtoUTC(Order.created_on),
  }));

  // 6. Write to Supabase
  const { error: orderError } = await supabase
    .from('petpooja_orders')
    .insert(orderRecord);

  if (orderError) {
    console.error('[petpooja-v2] Failed to insert order:', orderError);
    return { status: 500, body: { error: 'Database write failed', detail: orderError.message } };
  }

  if (itemRecords.length > 0) {
    const { error: itemsError } = await supabase
      .from('petpooja_order_items')
      .insert(itemRecords);

    if (itemsError) {
      console.error('[petpooja-v2] Failed to insert order items:', itemsError);
      // Order is already written — log but don't fail
      console.warn(`[petpooja-v2] Order ${Order.orderID} stored but ${itemRecords.length} items failed`);
    }
  }

  // 7. Log successful ingestion
  await supabase.from('petpooja_ingestion_log').insert({
    idempotency_key: idempotencyKey,
    outlet_id: outletId,
    petpooja_order_id: Order.orderID,
    ingested_at: new Date().toISOString(),
  });

  console.log(`[petpooja-v2] ✓ Ingested order ${Order.orderID} from ${outletName} (${Order.order_from})`);

  return {
    status: 200,
    body: {
      message: 'Ingested',
      orderId: Order.orderID,
      outlet: outletName,
      total: Order.total,
      itemCount: itemRecords.length,
    },
  };
}

// ── Express route handler ────────────────────────────────────────────────────

export async function handlePetpoojaWebhookV2(req: Request, res: Response) {
  const startTime = Date.now();
  let archiveId: number | null = null;

  try {
    const payload = req.body as PetpoojaPayload;

    // Validate basic structure
    if (!payload || !payload.event || !payload.properties) {
      return res.status(400).json({ success: false, error: 'Invalid payload: missing event or properties' });
    }

    const supabase = getSupabase();

    // 1. Archive raw payload FIRST — before anything else
    archiveId = await archiveRawPayload(payload, supabase);

    // 2. Process
    const result = await processWebhook(payload, supabase);

    // 3. Mark archive as processed or failed
    if (archiveId) {
      const status = result.status === 200 ? 'processed' : 'failed';
      const note = result.status !== 200 ? JSON.stringify(result.body) : null;
      await updateArchiveStatus(archiveId, status, note, supabase);
    }

    const processingMs = Date.now() - startTime;
    console.log(`[petpooja-v2] Request processed in ${processingMs}ms`);

    return res.status(result.status).json({ success: result.status === 200, ...result.body });

  } catch (err: any) {
    // Unexpected crash — mark archive as failed if we got that far
    if (archiveId) {
      try {
        const supabase = getSupabase();
        await updateArchiveStatus(archiveId, 'failed', err.message, supabase);
      } catch (updateErr) {
        console.error('[petpooja-v2] Failed to update archive status:', updateErr);
      }
    }
    console.error('[petpooja-v2] Unhandled error:', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
}

// ── Status endpoint ──────────────────────────────────────────────────────────

export async function handlePetpoojaWebhookV2Status(req: Request, res: Response) {
  try {
    const supabase = getSupabase();

    // Recent orders from Supabase
    const { data: recentOrders, error: ordersErr } = await supabase
      .from('petpooja_orders')
      .select('id, outlet_id, order_from, status, petpooja_created_at, ingested_at')
      .order('ingested_at', { ascending: false })
      .limit(10);

    // Recent archive entries
    const { data: recentArchive, error: archiveErr } = await supabase
      .from('petpooja_raw_archive')
      .select('id, event_type, processing_status, received_at')
      .order('received_at', { ascending: false })
      .limit(10);

    // Count by processing status
    const { data: pendingArchive } = await supabase
      .from('petpooja_raw_archive')
      .select('id', { count: 'exact' })
      .eq('processing_status', 'pending');

    const { data: failedArchive } = await supabase
      .from('petpooja_raw_archive')
      .select('id', { count: 'exact' })
      .eq('processing_status', 'failed');

    return res.json({
      status: 'active',
      version: 'v2-supabase',
      webhook_url: '/api/petpooja/webhook',
      outlet_mappings: Object.keys(OUTLET_MAP).length,
      unmapped_outlets_note: Object.keys(OUTLET_MAP).length === 0
        ? 'No outlets mapped yet. First webhook will store with unknown_ prefix. Provide Petpooja restIDs to complete setup.'
        : undefined,
      supabase: {
        connected: !ordersErr && !archiveErr,
        recent_orders: recentOrders?.length ?? 0,
        archive_pending: pendingArchive?.length ?? 0,
        archive_failed: failedArchive?.length ?? 0,
      },
      recent_orders: recentOrders?.slice(0, 5) ?? [],
      recent_archive: recentArchive?.slice(0, 5) ?? [],
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

// ── Exported for testing ─────────────────────────────────────────────────────
export { processWebhook, archiveRawPayload, updateArchiveStatus, parseISTtoUTC, normalisePaymentType, resolveOutlet, OUTLET_MAP };
export type { PetpoojaPayload, PetpoojaOrder, PetpoojaOrderItem };
