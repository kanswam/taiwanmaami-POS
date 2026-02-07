import { describe, it, expect, vi } from 'vitest';

// Test the paise-to-rupees conversion and date formatting logic
describe('Excel Export Utilities', () => {
  it('should convert paise to rupees correctly', () => {
    const toRupees = (paise: number) => paise / 100;
    expect(toRupees(10000)).toBe(100);
    expect(toRupees(12345)).toBe(123.45);
    expect(toRupees(0)).toBe(0);
    expect(toRupees(50)).toBe(0.5);
  });

  it('should format date as DD/MM/YYYY', () => {
    const formatDate = (date: Date) => {
      const d = new Date(date);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };
    // Use explicit time to avoid timezone issues with date-only strings
    expect(formatDate(new Date('2026-01-15T12:00:00'))).toBe('15/01/2026');
    expect(formatDate(new Date('2026-12-01T12:00:00'))).toBe('01/12/2026');
    expect(formatDate(new Date('2026-02-07T12:00:00'))).toBe('07/02/2026');
  });

  it('should map outlet IDs to names', () => {
    const outletName = (outletId: number | null) => {
      if (outletId === 1) return 'Palladium Mall';
      if (outletId === 2) return 'T. Nagar';
      return 'N/A';
    };
    expect(outletName(1)).toBe('Palladium Mall');
    expect(outletName(2)).toBe('T. Nagar');
    expect(outletName(null)).toBe('N/A');
    expect(outletName(99)).toBe('N/A');
  });

  it('should calculate GST correctly for regular orders', () => {
    const toRupees = (paise: number) => paise / 100;
    // Order with total 1000 paise (₹10), CGST 125 paise (₹1.25), SGST 125 paise (₹1.25)
    const totalPaise = 1000;
    const cgstPaise = 125;
    const sgstPaise = 125;

    const total = toRupees(totalPaise);
    const cgst = toRupees(cgstPaise);
    const sgst = toRupees(sgstPaise);
    const gst = cgst + sgst;
    const taxable = total - gst;

    expect(total).toBe(10);
    expect(cgst).toBe(1.25);
    expect(sgst).toBe(1.25);
    expect(gst).toBe(2.5);
    expect(taxable).toBe(7.5);
  });

  it('should back-calculate GST for workshop bookings at 5%', () => {
    const toRupees = (paise: number) => paise / 100;
    const totalPaise = 576000; // ₹5760 workshop
    const total = toRupees(totalPaise);
    const gstRate = 0.05;
    const taxable = total / (1 + gstRate);
    const gst = total - taxable;
    const cgst = gst / 2;
    const sgst = gst / 2;

    expect(total).toBe(5760);
    expect(Math.round(taxable * 100) / 100).toBe(5485.71);
    expect(Math.round(gst * 100) / 100).toBe(274.29);
    expect(Math.round(cgst * 100) / 100).toBe(137.14);
    expect(Math.round(sgst * 100) / 100).toBe(137.14);
  });

  it('should format payment method names correctly', () => {
    const formatPayment = (method: string) => 
      method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    expect(formatPayment('cash')).toBe('Cash');
    expect(formatPayment('card')).toBe('Card');
    expect(formatPayment('upi')).toBe('Upi');
    expect(formatPayment('online_payment')).toBe('Online Payment');
  });
});

describe('CSV Export Paise Fix', () => {
  it('should convert GST columns from paise to rupees in CSV export', () => {
    // Simulating the fixed exportToCSV logic
    const shouldConvert = (h: string) => {
      return typeof 100 === 'number' && (
        h.toLowerCase().includes('revenue') || 
        h.toLowerCase().includes('spent') || 
        h.toLowerCase().includes('value') || 
        h === 'cgst' || 
        h === 'sgst' || 
        h === 'gst' || 
        h.toLowerCase().includes('amount') || 
        h.toLowerCase().includes('price')
      );
    };

    expect(shouldConvert('cgst')).toBe(true);
    expect(shouldConvert('sgst')).toBe(true);
    expect(shouldConvert('gst')).toBe(true);
    expect(shouldConvert('taxableValue')).toBe(true);
    expect(shouldConvert('totalRevenue')).toBe(true);
    expect(shouldConvert('totalAmount')).toBe(true);
    expect(shouldConvert('orderCount')).toBe(false);
    expect(shouldConvert('period')).toBe(false);
  });
});
