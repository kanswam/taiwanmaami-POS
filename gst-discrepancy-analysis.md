# GST Report Discrepancy Analysis

## On-Screen Values (from screenshot):
- Total Taxable Value (Retail + B2B): ₹4,98,730.09
- CGST (2.5%): ₹8,036.79
- SGST (2.5%): ₹8,036.79
- IGST (Inter-state): ₹32,071.50
- Total GST (Retail + B2B): ₹48,145.08
- Retail Orders: 301 orders

## Exported Excel GST Summary Sheet:
- Total Taxable Value: ₹4,84,730.09
- CGST: ₹22,812.54
- SGST: ₹22,812.54
- Total GST: ₹45,625.08
- Total Invoices: 302 (includes 1 event order)
- NO IGST column at all
- NO B2B separation

## Key Discrepancies:

### 1. Taxable Value Mismatch
- Screen: ₹4,98,730.09
- Excel: ₹4,84,730.09
- Difference: ₹14,000 — this is likely missing B2B taxable value or partial B2B

Wait — ₹4,98,730.09 - ₹4,84,730.09 = ₹14,000. But B2B taxable = ₹1,78,175.
So screen includes partial B2B? No...

Actually: Screen shows "Retail + B2B" = ₹4,98,730.09
Excel shows ₹4,84,730.09 which is retail only (no B2B)
Difference = ₹14,000 — this doesn't match B2B ₹1,78,175 either.

Let me recalculate: Retail taxable from screen = ₹4,98,730.09 - ₹1,78,175 = ₹3,20,555.09
But Excel says retail taxable = ₹4,84,730.09. These don't match at all.

### 2. CGST/SGST Mismatch  
- Screen: CGST ₹8,036.79, SGST ₹8,036.79
- Excel: CGST ₹22,812.54, SGST ₹22,812.54
- These are WILDLY different

### 3. Total GST Mismatch
- Screen: ₹48,145.08 (includes IGST ₹32,071.50)
- Excel: ₹45,625.08 (no IGST)

### 4. March 11 anomaly in Excel
- Excel shows March 11: 5 orders, Taxable ₹1,68,360, CGST ₹14,880.38
- This is suspicious — ₹1,68,360 for 5 orders? That's ₹33,672 per order average
- The CGST ₹14,880.38 is 8.84% of taxable, not 2.5%
- This looks like event/B2B data is being mixed into the retail daily breakdown

### 5. Invoice count
- Screen: 301 retail orders
- Excel: 302 total (includes 1 event order on Summary sheet)

## Root Cause Analysis:
The export function is using a DIFFERENT data source than the on-screen GST report.
- The on-screen GST report uses the new `getGstReport` procedure with proper B2B separation
- The Excel export likely uses a different/older export function that:
  a) Includes event orders in the daily GST breakdown
  b) Does NOT separate B2B invoices
  c) Does NOT include IGST
  d) Calculates GST differently (possibly including event amounts in taxable value)
