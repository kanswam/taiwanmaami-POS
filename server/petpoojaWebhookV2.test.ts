import { describe, expect, it, vi, beforeEach } from 'vitest';
import { parseISTtoUTC, normalisePaymentType, resolveOutlet, OUTLET_MAP } from './petpoojaWebhookV2';
import type { PetpoojaOrder, PetpoojaPayload } from './petpoojaWebhookV2';

// ── Helper: build a realistic Petpooja payload ─────────────────────────────

function buildPayload(overrides?: Partial<PetpoojaPayload>): PetpoojaPayload {
  return {
    event: 'orderdetails',
    properties: {
      Restaurant: {
        res_name: 'Taiwan Maami - T. Nagar',
        restID: 'test_rest_001',
      },
      Customer: {
        name: 'Test Customer',
        phone: '9876543210',
        address: '123 Test Street',
        gstin: '',
      },
      Order: {
        orderID: 12345,
        customer_invoice_id: 'INV-12345',
        order_type: 'Dine In',
        payment_type: 'Cash',
        table_no: 'T5',
        discount_total: 0,
        tax_total: 25.50,
        round_off: '0.50',
        core_total: 500,
        total: 526,
        created_on: '2026-05-01 14:30:00',
        order_from: 'POS',
        order_from_id: '',
        sub_order_type: '',
        packaging_charge: 0,
        delivery_charges: 0,
        status: 'Success',
        comment: '',
        service_charge: 0,
        biller: 'Staff1',
        assignee: '',
      },
      Tax: [
        { title: 'CGST', type: 'percentage', rate: 2.5, amount: 12.75 },
        { title: 'SGST', type: 'percentage', rate: 2.5, amount: 12.75 },
      ],
      Discount: [],
      OrderItem: [
        {
          name: 'Classic Taiwan Milk Tea',
          itemid: 1001,
          itemcode: 'TMT001',
          price: 250,
          quantity: 2,
          total: 500,
          discount: 0,
          tax: 25.50,
          category_name: 'Iced Beverages',
          addon: [],
          specialnotes: '',
        },
      ],
    },
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('petpoojaWebhookV2 — pure functions', () => {

  describe('parseISTtoUTC', () => {
    it('converts IST timestamp to UTC ISO string', () => {
      const result = parseISTtoUTC('2026-05-01 14:30:00');
      // 14:30 IST = 09:00 UTC
      expect(result).toBe('2026-05-01T09:00:00.000Z');
    });

    it('handles midnight IST correctly', () => {
      const result = parseISTtoUTC('2026-05-01 00:00:00');
      // 00:00 IST = 18:30 UTC previous day
      expect(result).toBe('2026-04-30T18:30:00.000Z');
    });

    it('handles end of day IST', () => {
      const result = parseISTtoUTC('2026-05-01 23:59:59');
      // 23:59:59 IST = 18:29:59 UTC same day
      expect(result).toBe('2026-05-01T18:29:59.000Z');
    });
  });

  describe('normalisePaymentType', () => {
    it('returns simple payment type as-is', () => {
      const order = { payment_type: 'Cash' } as PetpoojaOrder;
      expect(normalisePaymentType(order)).toBe('Cash');
    });

    it('returns Card as-is', () => {
      const order = { payment_type: 'Card' } as PetpoojaOrder;
      expect(normalisePaymentType(order)).toBe('Card');
    });

    it('joins part payment types with +', () => {
      const order = {
        payment_type: 'Part Payment',
        part_payments: [
          { payment_type: 'Cash', amount: 200 },
          { payment_type: 'Card', amount: 300 },
        ],
      } as PetpoojaOrder;
      expect(normalisePaymentType(order)).toBe('Cash+Card');
    });

    it('returns "Part Payment" if no part_payments array', () => {
      const order = { payment_type: 'Part Payment' } as PetpoojaOrder;
      expect(normalisePaymentType(order)).toBe('Part Payment');
    });

    it('returns "Part Payment" if part_payments is empty', () => {
      const order = {
        payment_type: 'Part Payment',
        part_payments: [],
      } as PetpoojaOrder;
      expect(normalisePaymentType(order)).toBe('Part Payment');
    });
  });

  describe('resolveOutlet', () => {
    it('returns null for unknown restID', () => {
      expect(resolveOutlet('unknown_rest_id')).toBeNull();
    });

    it('resolves Palladium In-store (s16db4mw)', () => {
      expect(resolveOutlet('s16db4mw')).toEqual({ outletId: 'palladium_instore', outletName: 'Palladium In-store' });
    });

    it('resolves Palladium Delivery (9itpu6o0)', () => {
      expect(resolveOutlet('9itpu6o0')).toEqual({ outletId: 'palladium_delivery', outletName: 'Palladium Delivery' });
    });

    it('resolves T.Nagar Delivery (que6b2myco)', () => {
      expect(resolveOutlet('que6b2myco')).toEqual({ outletId: 'tnagar_delivery', outletName: 'T.Nagar Delivery' });
    });

    it('has exactly 3 outlet mappings configured', () => {
      expect(Object.keys(OUTLET_MAP)).toHaveLength(3);
    });
  });

  describe('payload structure', () => {
    it('builds a valid payload with all required fields', () => {
      const payload = buildPayload();
      expect(payload.event).toBe('orderdetails');
      expect(payload.properties.Restaurant.restID).toBe('test_rest_001');
      expect(payload.properties.Order.orderID).toBe(12345);
      expect(payload.properties.OrderItem).toHaveLength(1);
      expect(payload.properties.OrderItem[0].name).toBe('Classic Taiwan Milk Tea');
    });

    it('builds payload with overrides', () => {
      const payload = buildPayload({ event: 'other_event' });
      expect(payload.event).toBe('other_event');
    });

    it('has correct tax structure', () => {
      const payload = buildPayload();
      expect(payload.properties.Tax).toHaveLength(2);
      expect(payload.properties.Tax[0].title).toBe('CGST');
      expect(payload.properties.Tax[1].title).toBe('SGST');
    });
  });
});

describe('petpoojaWebhookV2 — Express handler', () => {

  function mockRes() {
    const res: any = {
      statusCode: 200,
      body: null,
      status(code: number) { res.statusCode = code; return res; },
      json(data: any) { res.body = data; return res; },
    };
    return res;
  }

  it('rejects payload without event field', async () => {
    const { handlePetpoojaWebhookV2 } = await import('./petpoojaWebhookV2');
    const req = { body: { properties: {} } } as any;
    const res = mockRes();

    await handlePetpoojaWebhookV2(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid payload');
  });

  it('rejects payload without properties field', async () => {
    const { handlePetpoojaWebhookV2 } = await import('./petpoojaWebhookV2');
    const req = { body: { event: 'orderdetails' } } as any;
    const res = mockRes();

    await handlePetpoojaWebhookV2(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects null/empty body', async () => {
    const { handlePetpoojaWebhookV2 } = await import('./petpoojaWebhookV2');
    const req = { body: null } as any;
    const res = mockRes();

    await handlePetpoojaWebhookV2(req, res);

    expect(res.statusCode).toBe(400);
  });
});
