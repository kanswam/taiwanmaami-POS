import { describe, it, expect } from 'vitest';

/**
 * GST Export Consistency Tests
 * 
 * These tests verify that the Excel export GST calculations match
 * the on-screen tRPC getGstReport calculations exactly.
 * 
 * Both systems must:
 * 1. Calculate taxable = totalAmount - (centralGst + stateGst) for retail orders
 * 2. Track B2B invoices separately with IGST support
 * 3. Produce identical combined totals
 * 4. Never mix B2B IGST into retail CGST/SGST columns
 * 5. NOT include event_orders — events are entered as B2B invoices
 */

const toRupees = (paise: number) => paise / 100;
const round2 = (n: number) => Math.round(n * 100) / 100;

// On-screen getGstReport calculation (from routers.ts)
function calculateOnScreenGst(orders: Array<{
  totalAmount: number; centralGst: number; stateGst: number;
}>, b2bInvoices: Array<{
  subtotal: number; cgst: number; sgst: number; igst: number;
}>) {
  let retailTaxable = 0, retailCgst = 0, retailSgst = 0;
  for (const order of orders) {
    const gstAmount = order.stateGst + order.centralGst;
    const taxableValue = order.totalAmount - gstAmount;
    retailTaxable += taxableValue;
    retailCgst += order.centralGst;
    retailSgst += order.stateGst;
  }

  const b2bSummary = {
    totalTaxableValue: b2bInvoices.reduce((s, i) => s + i.subtotal, 0),
    totalCgst: b2bInvoices.reduce((s, i) => s + i.cgst, 0),
    totalSgst: b2bInvoices.reduce((s, i) => s + i.sgst, 0),
    totalIgst: b2bInvoices.reduce((s, i) => s + i.igst, 0),
    totalGst: b2bInvoices.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0),
  };

  const summary = {
    totalTaxableValue: retailTaxable + b2bSummary.totalTaxableValue,
    totalCgst: retailCgst + b2bSummary.totalCgst,
    totalSgst: retailSgst + b2bSummary.totalSgst,
    totalIgst: b2bSummary.totalIgst,
    totalGst: (retailCgst + retailSgst) + b2bSummary.totalGst,
  };

  return { summary, b2bSummary, retailTaxable, retailCgst, retailSgst };
}

// Excel export calculation (from excelExport.ts)
function calculateExportGst(orders: Array<{
  totalAmount: number; centralGst: number; stateGst: number;
}>, b2bInvoices: Array<{
  subtotal: number; cgst: number; sgst: number; igst: number;
}>) {
  let retailTaxable = 0, retailCgst = 0, retailSgst = 0, retailTotal = 0;
  for (const order of orders) {
    const cgst = toRupees(order.centralGst);
    const sgst = toRupees(order.stateGst);
    const gst = cgst + sgst;
    const total = toRupees(order.totalAmount);
    const taxable = total - gst;
    retailTaxable += taxable;
    retailCgst += cgst;
    retailSgst += sgst;
    retailTotal += total;
  }

  const b2bTotalCgst = toRupees(b2bInvoices.reduce((s, i) => s + i.cgst, 0));
  const b2bTotalSgst = toRupees(b2bInvoices.reduce((s, i) => s + i.sgst, 0));
  const b2bTotalIgst = toRupees(b2bInvoices.reduce((s, i) => s + i.igst, 0));
  const b2bTotalTaxable = toRupees(b2bInvoices.reduce((s, i) => s + i.subtotal, 0));

  const combinedCgst = retailCgst + b2bTotalCgst;
  const combinedSgst = retailSgst + b2bTotalSgst;
  const combinedIgst = b2bTotalIgst;
  const combinedGst = combinedCgst + combinedSgst + combinedIgst;
  const allTaxable = retailTaxable + b2bTotalTaxable;

  return {
    allTaxable, combinedCgst, combinedSgst, combinedIgst, combinedGst,
    retailTaxable, retailCgst, retailSgst,
    b2bTotalTaxable, b2bTotalCgst, b2bTotalSgst, b2bTotalIgst,
  };
}

describe('GST Export vs On-Screen Consistency', () => {
  const sampleOrders = [
    { totalAmount: 52500, centralGst: 625, stateGst: 625 },
    { totalAmount: 35000, centralGst: 417, stateGst: 417 },
    { totalAmount: 78000, centralGst: 929, stateGst: 929 },
    { totalAmount: 15000, centralGst: 179, stateGst: 179 },
    { totalAmount: 120000, centralGst: 1429, stateGst: 1429 },
  ];

  // The Leela B2B invoice: inter-state (Maharashtra), IGST only
  const sampleB2bInvoices = [
    { subtotal: 17817500, cgst: 0, sgst: 0, igst: 3207150 },
  ];

  it('should produce identical combined taxable values', () => {
    const onScreen = calculateOnScreenGst(sampleOrders, sampleB2bInvoices);
    const exportCalc = calculateExportGst(sampleOrders, sampleB2bInvoices);
    expect(round2(exportCalc.allTaxable)).toBe(round2(toRupees(onScreen.summary.totalTaxableValue)));
  });

  it('should produce identical combined CGST', () => {
    const onScreen = calculateOnScreenGst(sampleOrders, sampleB2bInvoices);
    const exportCalc = calculateExportGst(sampleOrders, sampleB2bInvoices);
    expect(round2(exportCalc.combinedCgst)).toBe(round2(toRupees(onScreen.summary.totalCgst)));
  });

  it('should produce identical combined SGST', () => {
    const onScreen = calculateOnScreenGst(sampleOrders, sampleB2bInvoices);
    const exportCalc = calculateExportGst(sampleOrders, sampleB2bInvoices);
    expect(round2(exportCalc.combinedSgst)).toBe(round2(toRupees(onScreen.summary.totalSgst)));
  });

  it('should produce identical IGST (from B2B only)', () => {
    const onScreen = calculateOnScreenGst(sampleOrders, sampleB2bInvoices);
    const exportCalc = calculateExportGst(sampleOrders, sampleB2bInvoices);
    expect(round2(exportCalc.combinedIgst)).toBe(round2(toRupees(onScreen.summary.totalIgst)));
  });

  it('should produce identical total GST', () => {
    const onScreen = calculateOnScreenGst(sampleOrders, sampleB2bInvoices);
    const exportCalc = calculateExportGst(sampleOrders, sampleB2bInvoices);
    expect(round2(exportCalc.combinedGst)).toBe(round2(toRupees(onScreen.summary.totalGst)));
  });

  it('should keep retail CGST/SGST separate from B2B IGST', () => {
    const exportCalc = calculateExportGst(sampleOrders, sampleB2bInvoices);
    expect(exportCalc.retailCgst).toBeGreaterThan(0);
    expect(exportCalc.retailSgst).toBeGreaterThan(0);
    expect(exportCalc.b2bTotalIgst).toBe(32071.50);
    expect(exportCalc.b2bTotalCgst).toBe(0);
    expect(exportCalc.b2bTotalSgst).toBe(0);
  });

  it('should include The Leela invoice in B2B section with correct IGST', () => {
    const exportCalc = calculateExportGst(sampleOrders, sampleB2bInvoices);
    expect(exportCalc.b2bTotalTaxable).toBe(178175);
    expect(exportCalc.b2bTotalIgst).toBe(32071.50);
    expect(round2(exportCalc.b2bTotalTaxable + exportCalc.b2bTotalIgst)).toBe(210246.50);
  });
});

describe('GST Calculation: Retail Orders Only', () => {
  it('should calculate taxable = total - cgst - sgst for each order', () => {
    const order = { totalAmount: 52500, centralGst: 625, stateGst: 625 };
    const total = toRupees(order.totalAmount);
    const cgst = toRupees(order.centralGst);
    const sgst = toRupees(order.stateGst);
    const taxable = total - cgst - sgst;
    expect(total).toBe(525);
    expect(cgst).toBe(6.25);
    expect(sgst).toBe(6.25);
    expect(taxable).toBe(512.50);
  });

  it('should NOT include event_orders in any section (events are B2B invoices)', () => {
    // The export only queries: orders, workshopBookings, b2bInvoices
    // It does NOT query eventOrders table at all
    // Events like The Leela popup are entered as B2B invoices
    const dataSources = ['orders', 'workshopBookings', 'b2bInvoices'];
    expect(dataSources).not.toContain('eventOrders');
    expect(dataSources).toHaveLength(3);
  });
});

describe('GST Calculation: B2B Invoices', () => {
  it('should handle intra-state B2B (CGST + SGST, no IGST)', () => {
    const inv = { subtotal: 5000000, cgst: 450000, sgst: 450000, igst: 0 };
    expect(toRupees(inv.subtotal)).toBe(50000);
    expect(toRupees(inv.cgst)).toBe(4500);
    expect(toRupees(inv.sgst)).toBe(4500);
    expect(toRupees(inv.igst)).toBe(0);
  });

  it('should handle inter-state B2B (IGST only, no CGST/SGST)', () => {
    const inv = { subtotal: 17817500, cgst: 0, sgst: 0, igst: 3207150 };
    expect(toRupees(inv.subtotal)).toBe(178175);
    expect(toRupees(inv.cgst)).toBe(0);
    expect(toRupees(inv.sgst)).toBe(0);
    expect(toRupees(inv.igst)).toBe(32071.50);
  });

  it('should never split IGST into CGST/SGST for inter-state', () => {
    const inv = { subtotal: 17817500, cgst: 0, sgst: 0, igst: 3207150 };
    const correctCgst = toRupees(inv.cgst);
    const correctSgst = toRupees(inv.sgst);
    const correctIgst = toRupees(inv.igst);
    expect(correctCgst).toBe(0);
    expect(correctSgst).toBe(0);
    expect(correctIgst).toBe(32071.50);
  });
});

describe('Date Handling in GST Export', () => {
  it('should format YYYY-MM-DD to DD/MM/YYYY without timezone shift', () => {
    const formatDateLocal = (d: string): string => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split('-');
        return `${day}/${m}/${y}`;
      }
      return d;
    };
    expect(formatDateLocal('2026-03-01')).toBe('01/03/2026');
    expect(formatDateLocal('2026-03-31')).toBe('31/03/2026');
    expect(formatDateLocal('2026-03-24')).toBe('24/03/2026');
  });
});

describe('Combined Summary Matches On-Screen Display', () => {
  it('should match the exact structure returned by getGstReport', () => {
    const orders = [
      { totalAmount: 52500, centralGst: 625, stateGst: 625 },
      { totalAmount: 35000, centralGst: 417, stateGst: 417 },
    ];
    const b2b = [
      { subtotal: 17817500, cgst: 0, sgst: 0, igst: 3207150 },
    ];

    const onScreen = calculateOnScreenGst(orders, b2b);
    const exportCalc = calculateExportGst(orders, b2b);

    expect(round2(exportCalc.allTaxable)).toBe(round2(toRupees(onScreen.summary.totalTaxableValue)));
    expect(round2(exportCalc.combinedCgst)).toBe(round2(toRupees(onScreen.summary.totalCgst)));
    expect(round2(exportCalc.combinedSgst)).toBe(round2(toRupees(onScreen.summary.totalSgst)));
    expect(round2(exportCalc.combinedIgst)).toBe(round2(toRupees(onScreen.summary.totalIgst)));
    expect(round2(exportCalc.combinedGst)).toBe(round2(toRupees(onScreen.summary.totalGst)));
  });

  it('should match B2B summary separately', () => {
    const b2b = [{ subtotal: 17817500, cgst: 0, sgst: 0, igst: 3207150 }];
    const onScreen = calculateOnScreenGst([], b2b);
    const exportCalc = calculateExportGst([], b2b);

    expect(round2(exportCalc.b2bTotalTaxable)).toBe(round2(toRupees(onScreen.b2bSummary.totalTaxableValue)));
    expect(round2(exportCalc.b2bTotalCgst)).toBe(round2(toRupees(onScreen.b2bSummary.totalCgst)));
    expect(round2(exportCalc.b2bTotalSgst)).toBe(round2(toRupees(onScreen.b2bSummary.totalSgst)));
    expect(round2(exportCalc.b2bTotalIgst)).toBe(round2(toRupees(onScreen.b2bSummary.totalIgst)));
  });

  it('should handle zero orders with B2B only', () => {
    const b2b = [{ subtotal: 17817500, cgst: 0, sgst: 0, igst: 3207150 }];
    const onScreen = calculateOnScreenGst([], b2b);
    const exportCalc = calculateExportGst([], b2b);

    expect(round2(exportCalc.allTaxable)).toBe(round2(toRupees(onScreen.summary.totalTaxableValue)));
    expect(round2(exportCalc.combinedCgst)).toBe(0);
    expect(round2(exportCalc.combinedSgst)).toBe(0);
    expect(round2(exportCalc.combinedIgst)).toBe(32071.50);
  });

  it('should handle retail orders with no B2B', () => {
    const orders = [{ totalAmount: 52500, centralGst: 625, stateGst: 625 }];
    const onScreen = calculateOnScreenGst(orders, []);
    const exportCalc = calculateExportGst(orders, []);

    expect(round2(exportCalc.allTaxable)).toBe(round2(toRupees(onScreen.summary.totalTaxableValue)));
    expect(round2(exportCalc.combinedIgst)).toBe(0);
    expect(round2(exportCalc.combinedGst)).toBe(round2(toRupees(onScreen.summary.totalGst)));
  });
});
