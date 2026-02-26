import { describe, it, expect } from 'vitest';

/**
 * Tests for the delivery upload deduplication logic used in channel analytics.
 * When multiple overlapping Petpooja uploads exist (e.g. "mid Feb 2026" Feb 1-14 
 * and "February 2026" Jan 27-Feb 26), the newer upload that fully covers the older 
 * one should take priority, and the older one should be excluded.
 */

// Extract the dedup logic as a pure function for testing
function deduplicateUploads(uploads: Array<{
  id: number;
  periodStart: Date | string;
  periodEnd: Date | string;
  createdAt: Date | string;
  grandTotal: number;
  totalOrders: number;
}>) {
  const sorted = [...uploads].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return sorted.filter((upload, idx) => {
    const uploadStart = new Date(upload.periodStart).getTime();
    const uploadEnd = new Date(upload.periodEnd).getTime();
    for (let i = 0; i < idx; i++) {
      const newerStart = new Date(sorted[i].periodStart).getTime();
      const newerEnd = new Date(sorted[i].periodEnd).getTime();
      if (newerStart <= uploadStart && newerEnd >= uploadEnd) {
        return false; // Skip: newer upload fully covers this period
      }
    }
    return true;
  });
}

// Extract the calendar month date parsing logic for testing
function getCalendarMonthDates(periodLabel: string): { start: string; end: string } | null {
  const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const monthMatch = periodLabel.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i);
  if (monthMatch) {
    const monthIdx = monthNames.indexOf(monthMatch[1].toLowerCase());
    const year = parseInt(monthMatch[2]);
    if (monthIdx >= 0) {
      const calStart = new Date(year, monthIdx, 1);
      const calEnd = new Date(year, monthIdx + 1, 0);
      return {
        start: calStart.toISOString().split('T')[0],
        end: calEnd.toISOString().split('T')[0],
      };
    }
  }
  return null;
}

describe('Channel Analytics - Delivery Upload Deduplication', () => {
  it('should keep only the newer upload when it fully covers the older one', () => {
    const uploads = [
      {
        id: 30001,
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-02-14'),
        createdAt: new Date('2026-02-15'),
        grandTotal: 9561100,
        totalOrders: 114,
      },
      {
        id: 60001,
        periodStart: new Date('2026-01-27'),
        periodEnd: new Date('2026-02-26'),
        createdAt: new Date('2026-02-26'),
        grandTotal: 17659400,
        totalOrders: 222,
      },
    ];

    const result = deduplicateUploads(uploads);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(60001);
  });

  it('should keep both uploads when neither fully covers the other', () => {
    const uploads = [
      {
        id: 1,
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        createdAt: new Date('2026-02-07'),
        grandTotal: 23950900,
        totalOrders: 271,
      },
      {
        id: 2,
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-02-28'),
        createdAt: new Date('2026-03-01'),
        grandTotal: 17659400,
        totalOrders: 222,
      },
    ];

    const result = deduplicateUploads(uploads);
    expect(result).toHaveLength(2);
  });

  it('should keep a single upload as-is', () => {
    const uploads = [
      {
        id: 60001,
        periodStart: new Date('2026-01-27'),
        periodEnd: new Date('2026-02-26'),
        createdAt: new Date('2026-02-26'),
        grandTotal: 17659400,
        totalOrders: 222,
      },
    ];

    const result = deduplicateUploads(uploads);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(60001);
  });

  it('should handle three overlapping uploads correctly', () => {
    // Scenario: mid-month, full-month, and a partial that overlaps with full
    const uploads = [
      {
        id: 1,
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-02-07'),
        createdAt: new Date('2026-02-08'),
        grandTotal: 5000000,
        totalOrders: 50,
      },
      {
        id: 2,
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-02-14'),
        createdAt: new Date('2026-02-15'),
        grandTotal: 9000000,
        totalOrders: 100,
      },
      {
        id: 3,
        periodStart: new Date('2026-01-27'),
        periodEnd: new Date('2026-02-26'),
        createdAt: new Date('2026-02-26'),
        grandTotal: 17000000,
        totalOrders: 220,
      },
    ];

    const result = deduplicateUploads(uploads);
    // Upload 3 (newest, widest) should cover both 1 and 2
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it('should handle empty array', () => {
    const result = deduplicateUploads([]);
    expect(result).toHaveLength(0);
  });
});

describe('Channel Analytics - Calendar Month Date Parsing', () => {
  it('should parse "February 2026" to Feb 1-28', () => {
    const result = getCalendarMonthDates('February 2026');
    expect(result).not.toBeNull();
    expect(result!.start).toBe('2026-02-01');
    expect(result!.end).toBe('2026-02-28');
  });

  it('should parse "January 2026" to Jan 1-31', () => {
    const result = getCalendarMonthDates('January 2026');
    expect(result).not.toBeNull();
    expect(result!.start).toBe('2026-01-01');
    expect(result!.end).toBe('2026-01-31');
  });

  it('should return null for partial periods like "mid Feb 2026"', () => {
    const result = getCalendarMonthDates('mid Feb 2026');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = getCalendarMonthDates('');
    expect(result).toBeNull();
  });

  it('should handle leap year February correctly', () => {
    const result = getCalendarMonthDates('February 2028');
    expect(result).not.toBeNull();
    expect(result!.end).toBe('2028-02-29');
  });

  it('should parse "December 2025" correctly', () => {
    const result = getCalendarMonthDates('December 2025');
    expect(result).not.toBeNull();
    expect(result!.start).toBe('2025-12-01');
    expect(result!.end).toBe('2025-12-31');
  });
});
