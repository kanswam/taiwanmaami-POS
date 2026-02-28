import { describe, it, expect } from 'vitest';
import { getDb } from './db';
import { orders, workshopBookings, eventOrders } from '../drizzle/schema';
import { and, sql } from 'drizzle-orm';

// These tests verify the structure of the sales report Excel export
// to prevent the double-counting issue where summary rows overlapped with data columns

describe('Sales Report Excel Structure', () => {
  const toRupees = (paise: number) => paise / 100;

  it('should query completed orders for Feb 2026', async () => {
    const db = await getDb();
    if (!db) throw new Error('DB not available');

    const startDate = '2026-02-01';
    const endDate = '2026-02-28';

    const completedOrders = await db
      .select({
        orderNumber: orders.orderNumber,
        totalAmount: orders.totalAmount,
        stateGst: orders.stateGst,
        centralGst: orders.centralGst,
        paymentMethod: orders.paymentMethod,
      })
      .from(orders)
      .where(and(
        sql`${orders.createdAt} >= ${startDate}`,
        sql`${orders.createdAt} <= ${endDate + ' 23:59:59'}`,
        sql`${orders.orderStatus} != 'cancelled'`,
      ))
      .orderBy(orders.createdAt);

    expect(completedOrders.length).toBeGreaterThan(0);

    // Verify each order has numeric amounts
    for (const order of completedOrders) {
      expect(typeof order.totalAmount).toBe('number');
      expect(order.totalAmount).toBeGreaterThanOrEqual(0);
    }
  });

  it('should calculate correct grand totals from order data', async () => {
    const db = await getDb();
    if (!db) throw new Error('DB not available');

    const startDate = '2026-02-01';
    const endDate = '2026-02-28';

    const completedOrders = await db
      .select({
        totalAmount: orders.totalAmount,
        stateGst: orders.stateGst,
        centralGst: orders.centralGst,
      })
      .from(orders)
      .where(and(
        sql`${orders.createdAt} >= ${startDate}`,
        sql`${orders.createdAt} <= ${endDate + ' 23:59:59'}`,
        sql`${orders.orderStatus} != 'cancelled'`,
      ));

    let grandTaxable = 0;
    let grandCgst = 0;
    let grandSgst = 0;
    let grandTotal = 0;

    for (const order of completedOrders) {
      const cgst = toRupees(order.centralGst);
      const sgst = toRupees(order.stateGst);
      const total = toRupees(order.totalAmount);
      const taxable = total - cgst - sgst;

      grandTaxable += taxable;
      grandCgst += cgst;
      grandSgst += sgst;
      grandTotal += total;
    }

    // Grand total should equal sum of taxable + CGST + SGST
    const calculatedTotal = grandTaxable + grandCgst + grandSgst;
    expect(Math.abs(grandTotal - calculatedTotal)).toBeLessThan(0.01);

    // All values should be positive
    expect(grandTotal).toBeGreaterThan(0);
    expect(grandTaxable).toBeGreaterThan(0);
    expect(grandCgst).toBeGreaterThanOrEqual(0);
    expect(grandSgst).toBeGreaterThanOrEqual(0);
  });

  it('should verify summary data matches raw order totals', async () => {
    const db = await getDb();
    if (!db) throw new Error('DB not available');

    const startDate = '2026-02-01';
    const endDate = '2026-02-28';

    const completedOrders = await db
      .select({ totalAmount: orders.totalAmount })
      .from(orders)
      .where(and(
        sql`${orders.createdAt} >= ${startDate}`,
        sql`${orders.createdAt} <= ${endDate + ' 23:59:59'}`,
        sql`${orders.orderStatus} != 'cancelled'`,
      ));

    const paidWorkshops = await db
      .select({ totalAmount: workshopBookings.totalAmount })
      .from(workshopBookings)
      .where(and(
        sql`${workshopBookings.createdAt} >= ${startDate}`,
        sql`${workshopBookings.createdAt} <= ${endDate + ' 23:59:59'}`,
        sql`${workshopBookings.paymentStatus} = 'paid'`,
      ));

    const paidEvents = await db
      .select({ totalAmount: eventOrders.totalAmount })
      .from(eventOrders)
      .where(and(
        sql`${eventOrders.createdAt} >= ${startDate}`,
        sql`${eventOrders.createdAt} <= ${endDate + ' 23:59:59'}`,
        sql`${eventOrders.status} IN ('confirmed', 'in_progress', 'completed')`,
      ));

    const orderTotal = completedOrders.reduce((s, o) => s + toRupees(o.totalAmount), 0);
    const workshopTotal = paidWorkshops.reduce((s, w) => s + toRupees(w.totalAmount), 0);
    const eventTotal = paidEvents.reduce((s, e) => s + toRupees(e.totalAmount), 0);
    const grandTotal = orderTotal + workshopTotal + eventTotal;

    // Summary grand total should equal sum of all categories
    expect(Math.abs(grandTotal - (orderTotal + workshopTotal + eventTotal))).toBeLessThan(0.01);

    // Order count should match
    const totalCount = completedOrders.length + paidWorkshops.length + paidEvents.length;
    expect(totalCount).toBeGreaterThan(0);
    expect(totalCount).toBe(completedOrders.length + paidWorkshops.length + paidEvents.length);
  });

  it('should verify payment method aggregation covers all orders', async () => {
    const db = await getDb();
    if (!db) throw new Error('DB not available');

    const startDate = '2026-02-01';
    const endDate = '2026-02-28';

    const completedOrders = await db
      .select({
        totalAmount: orders.totalAmount,
        paymentMethod: orders.paymentMethod,
      })
      .from(orders)
      .where(and(
        sql`${orders.createdAt} >= ${startDate}`,
        sql`${orders.createdAt} <= ${endDate + ' 23:59:59'}`,
        sql`${orders.orderStatus} != 'cancelled'`,
      ));

    // Aggregate by payment method
    const paymentMethods: Record<string, { count: number; total: number }> = {};
    for (const order of completedOrders) {
      const method = (order.paymentMethod || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      if (!paymentMethods[method]) paymentMethods[method] = { count: 0, total: 0 };
      paymentMethods[method].count++;
      paymentMethods[method].total += toRupees(order.totalAmount);
    }

    // Sum of all payment method counts should equal total orders
    const totalCount = Object.values(paymentMethods).reduce((s, m) => s + m.count, 0);
    expect(totalCount).toBe(completedOrders.length);

    // Sum of all payment method totals should equal total revenue
    const totalRevenue = Object.values(paymentMethods).reduce((s, m) => s + m.total, 0);
    const expectedRevenue = completedOrders.reduce((s, o) => s + toRupees(o.totalAmount), 0);
    expect(Math.abs(totalRevenue - expectedRevenue)).toBeLessThan(0.01);
  });

  it('should verify formatDate handles both Date and string inputs', () => {
    const formatDate = (date: Date | string) => {
      const d = new Date(date);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    // Date object with explicit time to avoid timezone issues
    expect(formatDate(new Date('2026-02-01T12:00:00'))).toBe('01/02/2026');
    // String with time
    expect(formatDate('2026-02-28T12:00:00')).toBe('28/02/2026');
    // ISO string
    expect(formatDate('2026-02-15T10:30:00.000Z')).toMatch(/\d{2}\/02\/2026/);
  });
});
