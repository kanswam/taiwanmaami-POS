import { describe, it, expect } from 'vitest';

const BASE = 'http://localhost:3000';

// Helper to build a valid Petpooja payload
function buildPayload(overrides: any = {}) {
  return {
    token: '',
    properties: {
      Restaurant: {
        res_name: 'Test Restaurant',
        restID: 'test_rest_001',
        address: 'Test Address',
        contact_information: '9876543210',
        ...overrides.Restaurant,
      },
      Customer: {
        name: 'Test Customer',
        phone: '9876543210',
        address: '',
        gstin: '',
        ...overrides.Customer,
      },
      Order: {
        orderID: Math.floor(Math.random() * 900000) + 100000,
        customer_invoice_id: '12345',
        delivery_charges: 0,
        order_type: 'Dine In',
        payment_type: 'Cash',
        table_no: 'A5',
        no_of_persons: 2,
        discount_total: 0,
        tax_total: 0,
        round_off: '0',
        core_total: 750,
        total: 750,
        created_on: '2026-05-01 15:30:00',
        order_from: 'POS',
        order_from_id: '',
        sub_order_type: 'Dine-In',
        packaging_charge: 0,
        status: 'Success',
        comment: '',
        service_charge: 0,
        biller: '12345 (TestBiller)',
        assignee: 'TestStaff',
        ...overrides.Order,
      },
      Tax: overrides.Tax || [],
      Discount: overrides.Discount || [],
      OrderItem: overrides.OrderItem || [
        {
          name: 'Classic Oolong Latte',
          itemid: 100001,
          itemcode: 'COL',
          price: 405,
          quantity: 1,
          total: 405,
          addon: [],
          category_name: 'Bubble Tea',
        },
        {
          name: 'Rocher Mochi',
          itemid: 100002,
          itemcode: 'RM',
          price: 345,
          quantity: 1,
          total: 345,
          addon: [],
          category_name: 'Mochis',
        },
      ],
    },
    event: 'orderdetails',
    ...overrides._root,
  };
}

// Track created order IDs for cleanup
const createdOrderIds: number[] = [];

describe('Petpooja Webhook', () => {
  it('rejects empty body', async () => {
    const res = await fetch(`${BASE}/api/petpooja/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('rejects payload without event field', async () => {
    const res = await fetch(`${BASE}/api/petpooja/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: {} }),
    });
    expect(res.status).toBe(400);
  });

  it('acknowledges unhandled event types', async () => {
    const res = await fetch(`${BASE}/api/petpooja/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'menuupdate', properties: {} }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('menuupdate');
  });

  it('rejects orderdetails without Order or Restaurant', async () => {
    const res = await fetch(`${BASE}/api/petpooja/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'orderdetails',
        properties: { Customer: { name: 'Test' } },
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('stores a standard dine-in order', async () => {
    const payload = buildPayload();
    const res = await fetch(`${BASE}/api/petpooja/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.orderId).toBeGreaterThan(0);
    expect(data.petpoojaOrderId).toBe(String(payload.properties.Order.orderID));
    createdOrderIds.push(data.orderId);
  });

  it('stores an aggregator order with tax and addons', async () => {
    const payload = buildPayload({
      Order: {
        orderID: Math.floor(Math.random() * 900000) + 100000,
        order_type: 'Delivery',
        payment_type: 'Online',
        token_no: 'ZMT-12345',
        order_from: 'Zomato',
        order_from_id: 'ZMT-ORD-12345',
        sub_order_type: 'Zomato',
        packaging_charge: 50,
        core_total: 800,
        total: 894,
        discount_total: 100,
      },
      Tax: [
        { title: 'CGST @2.5%', amount: 22 },
        { title: 'SGST @2.5%', amount: 22 },
      ],
      Discount: [{ title: 'Zomato Discount', type: 'F', rate: 0, amount: 100 }],
      OrderItem: [
        {
          name: 'Hazelnut Milk Tea',
          itemid: 200001,
          price: 385,
          quantity: 2,
          total: 770,
          addon: [
            { group_name: 'Sugar Level', name: '50% Sugar', price: 0, quantity: '2' },
          ],
        },
      ],
    });

    const res = await fetch(`${BASE}/api/petpooja/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    createdOrderIds.push(data.orderId);
  });

  it('stores a part payment order', async () => {
    const payload = buildPayload({
      Order: {
        orderID: Math.floor(Math.random() * 900000) + 100000,
        payment_type: 'Part Payment',
        part_payments: [
          { type: 'Cash', amount: 400 },
          { type: 'Card', amount: 350 },
        ],
      },
    });

    const res = await fetch(`${BASE}/api/petpooja/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    createdOrderIds.push(data.orderId);
  });

  it('returns status with stats', async () => {
    const res = await fetch(`${BASE}/api/petpooja/webhook/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('active');
    expect(data.webhook_url).toBe('/api/petpooja/webhook');
    expect(data.last_24h).toBeDefined();
    expect(data.last_24h.orders_received).toBeGreaterThanOrEqual(3);
    expect(data.last_24h.webhook_calls).toBeGreaterThanOrEqual(3);
  });

  it('reports outlet mappings correctly', async () => {
    const res = await fetch(`${BASE}/api/petpooja/webhook/status`);
    const data = await res.json();
    expect(data.outlet_mappings).toBe(3);
    expect(data.unmapped_outlets_note).toBeUndefined();
  });

  // Cleanup test data
  it('cleanup: remove test webhook orders', async () => {
    if (createdOrderIds.length === 0) return;
    const mysql = await import('mysql2/promise');
    const conn = await mysql.createConnection(process.env.DATABASE_URL!);
    const [r1] = await conn.execute(
      `DELETE FROM petpooja_webhook_orders WHERE restId = 'test_rest_001'`
    );
    const [r2] = await conn.execute(
      `DELETE FROM petpooja_webhook_log WHERE restId = 'test_rest_001' OR restId IS NULL`
    );
    await conn.end();
    expect((r1 as any).affectedRows).toBeGreaterThanOrEqual(createdOrderIds.length);
  });
});
