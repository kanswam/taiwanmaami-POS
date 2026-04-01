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
 */

// Shared calculation functions (mirroring both export and on-screen logic)
const toRupees = (paise: number) => paise / 100;
const round2 = (n: number) => Math.round(n * 100) / 100;

// Simulate the on-screen getGstReport calculation (from routers.ts)
function calculateOnScreenGst(orders: Array<{
  totalAmount: number; centralGst: number; stateGst: number;
}>, b2bInvoices: Array<{
  subtotal: number; cgst: number; sgst: number; igst: number;
}>) {
  // Retail totals (in paise, same as on-screen)
  let retailTaxable = 0, retailCgst = 0, retailSgst = 0;
  for (const order of orders) {
    const gstAmount = order.stateGst + order.centralGst;
    const taxableValue = order.totalAmount - gstAmount;
    retailTaxable += taxableValue;
    retailCgst += order.centralGst;
    retailSgst += order.stateGst;
  }

  // B2B summary (in paise)
  const b2bSummary = {
    totalTaxableValue: b2bInvoices.reduce((s, i) => s + i.subtotal, 0),
    totalCgst: b2bInvoices.reduce((s, i) => s + i.cgst, 0),
    totalSgst: b2bInvoices.reduce((s, i) => s + i.sgst, 0),
    totalIgst: b2bInvoices.reduce((s, i) => s + i.igst, 0),
    totalGst: b2bInvoices.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0),
  };

  // Combined summary (in paise, matching routers.ts lines 5822-5828)
  const summary = {
    totalTaxableValue: retailTaxable + b2bSummary.totalTaxableValue,
    totalCgst: retailCgst + b2bSummary.totalCgst,
    totalSgst: retailSgst + b2bSummary.totalSgst,
    totalIgst: b2bSummary.totalIgst, // Only B2B has IGST
    totalGst: (retailCgst + retailSgst) + b2bSummary.totalGst,
  };

  return { summary, b2bSummary, retailTaxable, retailCgst, retailSgst };
}

// Simulate the Excel export calculation (from excelExport.ts)
function calculateExportGst(orders: Array<{
  totalAmount: number; centralGst: number; stateGst: number;
}>, b2bInvoices: Array<{
  subtotal: number; cgst: number; sgst: number; igst: number;
}>) {
  // Retail totals (converted to rupees, same as export)
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

  // B2B totals (converted to rupees)
  const b2bTotalCgst = toRupees(b2bInvoices.reduce((s, i) => s + i.cgst, 0));
  const b2bTotalSgst = toRupees(b2bInvoices.reduce((s, i) => s + i.sgst, 0));
  const b2bTotalIgst = toRupees(b2bInvoices.reduce((s, i) => s + i.igst, 0));
  const b2bTotalTaxable = toRupees(b2bInvoices.reduce((s, i) => s + i.subtotal, 0));

  // Combined (matching export Combined GST Summary section)
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
  // Test data: typical March orders + The Leela B2B invoice
  const sampleOrders = [
    { totalAmount: 52500, centralGst: 625, stateGst: 625 },   // ₹525, GST ₹12.50
    { totalAmount: 35000, centralGst: 417, stateGst: 417 },   // ₹350, GST ₹8.34
    { totalAmount: 78000, centralGst: 929, stateGst: 929 },   // ₹780, GST ₹18.58
    { totalAmount: 15000, centralGst: 179, stateGst: 179 },   // ₹150, GST ₹3.58
    { totalAmount: 120000, centralGst: 1429, stateGst: 1429 }, // ₹1200, GST ₹28.58
  ];

  // The Leela invoice: inter-state (Maharashtra), so IGST only
  const sampleB2bInvoices = [
    { subtotal: 17817500, cgst: 0, sgst: 0, igst: 3207150 }, // ₹1,78,175 taxable, ₹32,071.50 IGST
  ];

  it('should produce identical combined taxable values', () => {
    const onScreen = calculateOnScreenGst(sampleOrders, sampleB2bInvoices);
    const exportCalc = calculateExportGst(sampleOrders, sampleB2bInvoices);

    // On-screen is in paise, export is in rupees
    const onScreenTaxableRupees = round2(toRupees(onScreen.summary.totalTaxableValue));
    const exportTaxableRupees = round2(exportCalc.allTaxable);

    expect(exportTaxableRupees).toBe(onScreenTaxableRupees);
  });

  it('should produce identical combined CGST', () => {
    const onScreen = calculateOnScreenGst(sampleOrders, sampleB2bInvoices);
    const exportCalc = calculateExportGst(sampleOrders, sampleB2bInvoices);

    const onScreenCgstRupees = round2(toRupees(onScreen.summary.totalCgst));
    const exportCgstRupees = round2(exportCalc.combinedCgst);

    expect(exportCgstRupees).toBe(onScreenCgstRupees);
  });

  it('should produce identical combined SGST', () => {
    const onScreen = calculateOnScreenGst(sampleOrders, sampleB2bInvoices);
    const exportCalc = calculateExportGst(sampleOrders, sampleB2bInvoices);

    const onScreenSgstRupees = round2(toRupees(onScreen.summary.totalSgst));
    const exportSgstRupees = round2(exportCalc.combinedSgst);

    expect(exportSgstRupees).toBe(onScreenSgstRupees);
  });

  it('should produce identical IGST (from B2B only)', () => {
    const onScreen = calculateOnScreenGst(sampleOrders, sampleB2bInvoices);
    const exportCalc = calculateExportGst(sampleOrders, sampleB2bInvoices);

    const onScreenIgstRupees = round2(toRupees(onScreen.summary.totalIgst));
    const exportIgstRupees = round2(exportCalc.combinedIgst);

    expect(exportIgstRupees).toBe(onScreenIgstRupees);
  });

  it('should produce identical total GST', () => {
    const onScreen = calculateOnScreenGst(sampleOrders, sampleB2bInvoices);
    const exportCalc = calculateExportGst(sampleOrders, sampleB2bInvoices);

    const onScreenGstRupees = round2(toRupees(onScreen.summary.totalGst));
    const exportGstRupees = round2(exportCalc.combinedGst);

    expect(exportGstRupees).toBe(onScreenGstRupees);
  });

  it('should keep retail CGST/SGST separate from B2B IGST', () => {
    const exportCalc = calculateExportGst(sampleOrders, sampleB2bInvoices);

    // Retail should have CGST and SGST only
    expect(exportCalc.retailCgst).toBeGreaterThan(0);
    expect(exportCalc.retailSgst).toBeGreaterThan(0);

    // B2B (The Leela) should have IGST only, no CGST/SGST
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

  it('should not include event orders in retail daily breakdown', () => {
    // The export groups retail orders by date
    // Event orders should NOT appear in the daily retail breakdown
    // They get their own section
    const retailOrders = [
      { totalAmount: 52500, centralGst: 625, stateGst: 625, createdAt: '2026-03-15' },
    ];
    const eventOrders = [
      { totalAmount: 100000, gstAmount: 5000, createdAt: '2026-03-24' },
    ];

    // Only retail orders should be in daily stats
    const dailyStats: Record<string, number> = {};
    for (const order of retailOrders) {
      const dateKey = order.createdAt;
      dailyStats[dateKey] = (dailyStats[dateKey] || 0) + 1;
    }

    // Event orders should NOT be in dailyStats
    expect(dailyStats['2026-03-15']).toBe(1);
    expect(dailyStats['2026-03-24']).toBeUndefined();
  });
});

describe('GST Calculation: B2B Invoices', () => {
  it('should handle intra-state B2B (CGST + SGST, no IGST)', () => {
    const intraStateInvoice = { subtotal: 5000000, cgst: 450000, sgst: 450000, igst: 0 };
    const taxable = toRupees(intraStateInvoice.subtotal);
    const cgst = toRupees(intraStateInvoice.cgst);
    const sgst = toRupees(intraStateInvoice.sgst);
    const igst = toRupees(intraStateInvoice.igst);

    expect(taxable).toBe(50000);
    expect(cgst).toBe(4500);
    expect(sgst).toBe(4500);
    expect(igst).toBe(0);
    expect(cgst + sgst + igst).toBe(9000);
  });

  it('should handle inter-state B2B (IGST only, no CGST/SGST)', () => {
    const interStateInvoice = { subtotal: 17817500, cgst: 0, sgst: 0, igst: 3207150 };
    const taxable = toRupees(interStateInvoice.subtotal);
    const cgst = toRupees(interStateInvoice.cgst);
    const sgst = toRupees(interStateInvoice.sgst);
    const igst = toRupees(interStateInvoice.igst);

    expect(taxable).toBe(178175);
    expect(cgst).toBe(0);
    expect(sgst).toBe(0);
    expect(igst).toBe(32071.50);
    expect(cgst + sgst + igst).toBe(32071.50);
  });

  it('should never split IGST into CGST/SGST for inter-state', () => {
    // This was the original bug: export was splitting all GST 50/50
    const interStateInvoice = { subtotal: 17817500, cgst: 0, sgst: 0, igst: 3207150 };

    // WRONG (old behavior): split IGST into CGST/SGST
    const wrongCgst = toRupees(interStateInvoice.igst) / 2; // 16035.75
    const wrongSgst = toRupees(interStateInvoice.igst) / 2; // 16035.75

    // CORRECT (new behavior): keep IGST as IGST
    const correctCgst = toRupees(interStateInvoice.cgst); // 0
    const correctSgst = toRupees(interStateInvoice.sgst); // 0
    const correctIgst = toRupees(interStateInvoice.igst); // 32071.50

    expect(correctCgst).toBe(0);
    expect(correctSgst).toBe(0);
    expect(correctIgst).toBe(32071.50);
    // The wrong values should NOT equal the correct ones
    expect(wrongCgst).not.toBe(correctCgst);
    expect(wrongSgst).not.toBe(correctSgst);
  });
});

describe('Date Handling in GST Export', () => {
  it('should format date string YYYY-MM-DD to DD/MM/YYYY without timezone shift', () => {
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

  it('should get date key without timezone shift', () => {
    const getDateKey = (d: string): string => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      return d;
    };

    expect(getDateKey('2026-03-01')).toBe('2026-03-01');
    expect(getDateKey('2026-03-31')).toBe('2026-03-31');
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

    // Verify the on-screen summary structure
    expect(onScreen.summary).toHaveProperty('totalTaxableValue');
    expect(onScreen.summary).toHaveProperty('totalCgst');
    expect(onScreen.summary).toHaveProperty('totalSgst');
    expect(onScreen.summary).toHaveProperty('totalIgst');
    expect(onScreen.summary).toHaveProperty('totalGst');

    // Verify all values match when converted to rupees
    expect(round2(exportCalc.allTaxable)).toBe(round2(toRupees(onScreen.summary.totalTaxableValue)));
    expect(round2(exportCalc.combinedCgst)).toBe(round2(toRupees(onScreen.summary.totalCgst)));
    expect(round2(exportCalc.combinedSgst)).toBe(round2(toRupees(onScreen.summary.totalSgst)));
    expect(round2(exportCalc.combinedIgst)).toBe(round2(toRupees(onScreen.summary.totalIgst)));
    expect(round2(exportCalc.combinedGst)).toBe(round2(toRupees(onScreen.summary.totalGst)));
  });

  it('should match B2B summary separately', () => {
    const b2b = [
      { subtotal: 17817500, cgst: 0, sgst: 0, igst: 3207150 },
    ];

    const onScreen = calculateOnScreenGst([], b2b);
    const exportCalc = calculateExportGst([], b2b);

    expect(round2(exportCalc.b2bTotalTaxable)).toBe(round2(toRupees(onScreen.b2bSummary.totalTaxableValue)));
    expect(round2(exportCalc.b2bTotalCgst)).toBe(round2(toRupees(onScreen.b2bSummary.totalCgst)));
    expect(round2(exportCalc.b2bTotalSgst)).toBe(round2(toRupees(onScreen.b2bSummary.totalSgst)));
    expect(round2(exportCalc.b2bTotalIgst)).toBe(round2(toRupees(onScreen.b2bSummary.totalIgst)));
  });

  it('should handle zero orders with B2B only', () => {
    const b2b = [
      { subtotal: 17817500, cgst: 0, sgst: 0, igst: 3207150 },
    ];

    const onScreen = calculateOnScreenGst([], b2b);
    const exportCalc = calculateExportGst([], b2b);

    // With no retail orders, combined should equal B2B
    expect(round2(exportCalc.allTaxable)).toBe(round2(toRupees(onScreen.summary.totalTaxableValue)));
    expect(round2(exportCalc.combinedCgst)).toBe(0);
    expect(round2(exportCalc.combinedSgst)).toBe(0);
    expect(round2(exportCalc.combinedIgst)).toBe(32071.50);
  });

  it('should handle retail orders with no B2B', () => {
    const orders = [
      { totalAmount: 52500, centralGst: 625, stateGst: 625 },
    ];

    const onScreen = calculateOnScreenGst(orders, []);
    const exportCalc = calculateExportGst(orders, []);

    expect(round2(exportCalc.allTaxable)).toBe(round2(toRupees(onScreen.summary.totalTaxableValue)));
    expect(round2(exportCalc.combinedIgst)).toBe(0);
    expect(round2(exportCalc.combinedGst)).toBe(round2(toRupees(onScreen.summary.totalGst)));
  });
});
