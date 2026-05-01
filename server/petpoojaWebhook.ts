import type { Request, Response } from 'express';
import { getDb } from './db';
import { petpoojaWebhookOrders, petpoojaWebhookLog } from '../drizzle/schema';

// =============================================
// Petpooja Webhook — Real-time order push
// =============================================
// Receives JSON payloads from Petpooja POS when a bill is printed.
// Stores raw + parsed order data. No auth required (Petpooja sends
// to an open URL), but optional token validation is supported.

// Outlet mapping: restID → our outlet system
// These will need to be configured once Petpooja provides the restIDs
const OUTLET_MAP: Record<string, { outletId: number; outletName: string }> = {
  // Populate these after Petpooja configures the webhook for each outlet
  // Example:
  // "cp81ghin": { outletId: 1, outletName: "Palladium" },
  // "ab12xyz": { outletId: 2, outletName: "T. Nagar" },
};

// Convert rupees to paise (our standard storage format)
function toPaise(amount: number | string | undefined): number {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  return Math.round(num * 100);
}

// Parse Petpooja order items into our format
function parseItems(orderItems: any[]): Array<{
  name: string;
  quantity: number;
  price: number;
  total: number;
  itemId?: string;
  variation?: string;
  addons?: Array<{ name: string; price: number }>;
}> {
  if (!Array.isArray(orderItems)) return [];

  return orderItems.map(item => ({
    name: item.name || 'Unknown Item',
    quantity: Number(item.quantity) || 1,
    price: toPaise(item.price),
    total: toPaise(item.total),
    itemId: item.itemid ? String(item.itemid) : undefined,
    variation: item.variation_name || undefined,
    addons: Array.isArray(item.addon) && item.addon.length > 0
      ? item.addon.map((a: any) => ({
          name: a.name || 'Unknown Addon',
          price: toPaise(a.price),
        }))
      : undefined,
  }));
}

// Parse part payments array
function parsePartPayments(order: any): Array<{ type: string; amount: number }> | null {
  if (order.payment_type !== 'Part Payment' || !Array.isArray(order.part_payments)) {
    return null;
  }
  return order.part_payments.map((pp: any) => ({
    type: pp.type || 'Unknown',
    amount: toPaise(pp.amount),
  }));
}

// Calculate tax from Tax array
function parseTax(taxArray: any[]): { tax: number; cgst: number; sgst: number } {
  let cgst = 0;
  let sgst = 0;
  let totalTax = 0;

  if (Array.isArray(taxArray)) {
    for (const t of taxArray) {
      const amount = toPaise(t.amount || t.tax_amount || 0);
      const title = (t.title || t.tax_title || '').toLowerCase();
      if (title.includes('cgst')) {
        cgst += amount;
      } else if (title.includes('sgst')) {
        sgst += amount;
      }
      totalTax += amount;
    }
  }

  return { tax: totalTax, cgst, sgst };
}

// Parse order timestamp from Petpooja format "YYYY-MM-DD HH:mm:ss"
function parseOrderTime(createdOn: string): Date {
  if (!createdOn) return new Date();
  // Petpooja sends IST timestamps like "2025-04-04 11:45:35"
  // Parse as-is and treat as IST (UTC+5:30)
  const d = new Date(createdOn.replace(' ', 'T') + '+05:30');
  return isNaN(d.getTime()) ? new Date() : d;
}

// Main webhook handler
export async function handlePetpoojaWebhook(req: Request, res: Response) {
  const startTime = Date.now();
  let logData: {
    eventType: string;
    restId: string | null;
    petpoojaOrderId: string | null;
    httpStatus: number;
    success: boolean;
    errorMessage: string | null;
    processingTimeMs: number | null;
  } = {
    eventType: 'unknown',
    restId: null,
    petpoojaOrderId: null,
    httpStatus: 200,
    success: true,
    errorMessage: null,
    processingTimeMs: null,
  };

  try {
    const body = req.body;

    // Validate basic structure
    if (!body || !body.event || !body.properties) {
      logData.httpStatus = 400;
      logData.success = false;
      logData.errorMessage = 'Invalid payload: missing event or properties';
      return res.status(400).json({ success: false, error: 'Invalid payload structure' });
    }

    logData.eventType = body.event;

    // We only handle "orderdetails" events
    if (body.event !== 'orderdetails') {
      logData.httpStatus = 200;
      logData.errorMessage = `Unhandled event type: ${body.event}`;
      return res.status(200).json({ success: true, message: `Event type '${body.event}' acknowledged but not processed` });
    }

    const { Restaurant, Customer, Order, Tax, Discount, OrderItem } = body.properties;

    if (!Order || !Restaurant) {
      logData.httpStatus = 400;
      logData.success = false;
      logData.errorMessage = 'Missing Order or Restaurant in properties';
      return res.status(400).json({ success: false, error: 'Missing Order or Restaurant data' });
    }

    const restId = Restaurant.restID || Restaurant.res_id || '';
    const orderId = String(Order.orderID || Order.order_id || '');
    logData.restId = restId;
    logData.petpoojaOrderId = orderId;

    // Map outlet
    const outlet = OUTLET_MAP[restId] || { outletId: null, outletName: null };

    // Parse tax
    const taxInfo = parseTax(Tax);

    // Parse discount total
    let discountTotal = 0;
    if (Array.isArray(Discount)) {
      for (const d of Discount) {
        discountTotal += toPaise(d.amount || 0);
      }
    }
    // Also check Order.discount_total
    if (Order.discount_total) {
      discountTotal = Math.max(discountTotal, toPaise(Order.discount_total));
    }

    // Parse items
    const items = parseItems(OrderItem);

    // Build order record
    const orderRecord = {
      petpoojaOrderId: orderId,
      restId: restId,
      outletId: outlet.outletId,
      outletName: outlet.outletName,
      orderType: Order.order_type || 'Unknown',
      orderFrom: Order.order_from || 'POS',
      orderFromId: Order.order_from_id || null,
      subOrderType: Order.sub_order_type || null,
      tokenNo: Order.token_no || Order.table_no || null,
      customerName: Customer?.name || null,
      customerPhone: Customer?.phone || null,
      customerAddress: Customer?.address || null,
      subtotal: toPaise(Order.core_total || Order.total),
      discount: discountTotal,
      tax: taxInfo.tax,
      cgst: taxInfo.cgst,
      sgst: taxInfo.sgst,
      packagingCharge: toPaise(Order.packaging_charge),
      deliveryCharge: toPaise(Order.delivery_charges),
      totalAmount: toPaise(Order.total),
      paymentType: Order.payment_type || 'Unknown',
      partPayments: parsePartPayments(Order),
      status: Order.status || 'Success',
      items: items,
      rawPayload: body,
      orderTime: parseOrderTime(Order.created_on),
    };

    // Store in database
    const dbInstance = await getDb();
    if (!dbInstance) {
      logData.httpStatus = 500;
      logData.success = false;
      logData.errorMessage = 'Database not available';
      return res.status(500).json({ success: false, error: 'Database not available' });
    }

    const result = await dbInstance.insert(petpoojaWebhookOrders).values(orderRecord);
    const insertedId = result[0].insertId;

    console.log(`[Petpooja Webhook] Order ${orderId} from ${restId} (${outlet.outletName || 'unmapped'}) stored as ID ${insertedId}. Type: ${Order.order_type}, From: ${Order.order_from}, Total: ₹${(orderRecord.totalAmount / 100).toFixed(2)}`);

    logData.httpStatus = 200;
    logData.success = true;

    return res.status(200).json({
      success: true,
      message: 'Order received and stored',
      orderId: insertedId,
      petpoojaOrderId: orderId,
      outlet: outlet.outletName || `unmapped (restId: ${restId})`,
    });

  } catch (error: any) {
    console.error('[Petpooja Webhook] Error processing webhook:', error);
    logData.httpStatus = 500;
    logData.success = false;
    logData.errorMessage = error.message || 'Unknown error';

    return res.status(500).json({ success: false, error: 'Internal server error' });
  } finally {
    // Always log the webhook call
    logData.processingTimeMs = Date.now() - startTime;
    try {
      const dbInstance = await getDb();
      if (dbInstance) {
        await dbInstance.insert(petpoojaWebhookLog).values(logData);
      }
    } catch (logError) {
      console.error('[Petpooja Webhook] Failed to write log:', logError);
    }
  }
}

// Health check / status endpoint for the webhook
export async function handlePetpoojaWebhookStatus(req: Request, res: Response) {
  try {
    const dbInstance = await getDb();
    if (!dbInstance) {
      return res.status(500).json({ status: 'error', message: 'Database not available' });
    }

    // Get recent webhook stats
    const [recentOrders] = await dbInstance.execute(
      `SELECT COUNT(*) as total, 
              MAX(receivedAt) as lastReceived,
              COUNT(CASE WHEN status = 'Success' THEN 1 END) as successful,
              COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled
       FROM petpooja_webhook_orders 
       WHERE receivedAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    ) as any;

    const [recentLogs] = await dbInstance.execute(
      `SELECT COUNT(*) as total,
              COUNT(CASE WHEN success = 1 THEN 1 END) as successful,
              COUNT(CASE WHEN success = 0 THEN 1 END) as failed,
              AVG(processingTimeMs) as avgProcessingMs
       FROM petpooja_webhook_log 
       WHERE receivedAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    ) as any;

    const stats = recentOrders[0] || {};
    const logStats = recentLogs[0] || {};

    return res.json({
      status: 'active',
      webhook_url: '/api/petpooja/webhook',
      outlet_mappings: Object.keys(OUTLET_MAP).length,
      unmapped_outlets_note: Object.keys(OUTLET_MAP).length === 0
        ? 'No outlets mapped yet. Provide Petpooja restIDs to complete setup.'
        : undefined,
      last_24h: {
        orders_received: Number(stats.total) || 0,
        last_received: stats.lastReceived || null,
        successful: Number(stats.successful) || 0,
        cancelled: Number(stats.cancelled) || 0,
        webhook_calls: Number(logStats.total) || 0,
        webhook_failures: Number(logStats.failed) || 0,
        avg_processing_ms: logStats.avgProcessingMs ? Math.round(Number(logStats.avgProcessingMs)) : null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
