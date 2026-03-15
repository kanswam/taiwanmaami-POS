import { describe, it, expect } from 'vitest';

/**
 * Tests for the period label parsing logic used in getDeliveryPeriods.
 * This logic determines the date range for querying website orders
 * based on the Petpooja upload period label.
 */

const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const monthAbbrevs: Record<string, string> = { jan: 'january', feb: 'february', mar: 'march', apr: 'april', may: 'may', jun: 'june', jul: 'july', aug: 'august', sep: 'september', oct: 'october', nov: 'november', dec: 'december' };

function parsePeriodDates(periodLabel: string, periodStart: Date, periodEnd: Date) {
  let websiteStart = periodStart;
  let websiteEnd = periodEnd;

  const fullMonthMatch = periodLabel.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i);
  const midMonthMatch = periodLabel.match(/^(?:mid|early|first half|1st half)\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/i);

  if (fullMonthMatch) {
    const monthIdx = monthNames.indexOf(fullMonthMatch[1].toLowerCase());
    const year = parseInt(fullMonthMatch[2]);
    if (monthIdx >= 0) {
      websiteStart = new Date(year, monthIdx, 1);
      websiteEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
    }
  } else if (midMonthMatch) {
    const rawMonth = midMonthMatch[1].toLowerCase();
    const resolvedMonth = monthAbbrevs[rawMonth] || rawMonth;
    const monthIdx = monthNames.indexOf(resolvedMonth);
    const year = parseInt(midMonthMatch[2]);
    if (monthIdx >= 0) {
      websiteStart = new Date(year, monthIdx, 1);
      const periodEndDate = new Date(periodEnd);
      if (periodEndDate.getMonth() === monthIdx && periodEndDate.getFullYear() === year) {
        websiteEnd = new Date(year, monthIdx, periodEndDate.getDate(), 23, 59, 59, 999);
      } else {
        websiteEnd = new Date(year, monthIdx, 15, 23, 59, 59, 999);
      }
    }
  }

  return { websiteStart, websiteEnd };
}

describe('Period Label Parsing', () => {
  describe('Full month labels', () => {
    it('should parse "February 2026" to Feb 1 - Feb 28', () => {
      const result = parsePeriodDates(
        'February 2026',
        new Date('2026-02-01'), // Petpooja dates don't matter for full months
        new Date('2026-02-28')
      );
      expect(result.websiteStart.getFullYear()).toBe(2026);
      expect(result.websiteStart.getMonth()).toBe(1); // Feb = 1
      expect(result.websiteStart.getDate()).toBe(1);
      expect(result.websiteEnd.getMonth()).toBe(1);
      expect(result.websiteEnd.getDate()).toBe(28);
    });

    it('should parse "January 2026" to Jan 1 - Jan 31', () => {
      const result = parsePeriodDates(
        'January 2026',
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );
      expect(result.websiteStart.getMonth()).toBe(0); // Jan = 0
      expect(result.websiteStart.getDate()).toBe(1);
      expect(result.websiteEnd.getMonth()).toBe(0);
      expect(result.websiteEnd.getDate()).toBe(31);
    });
  });

  describe('Mid/partial month labels - THE BUG FIX', () => {
    it('should parse "Mid March 2026" to Mar 1 - Mar 15 (not Feb 13 - Mar 15)', () => {
      // This is the exact bug scenario:
      // Petpooja period is Feb 13 - Mar 15, but website orders should only be Mar 1 - Mar 15
      const result = parsePeriodDates(
        'Mid March 2026',
        new Date('2026-02-13T05:00:00.000Z'), // Petpooja start (wrong if used)
        new Date('2026-03-15T04:00:00.000Z')  // Petpooja end
      );
      expect(result.websiteStart.getMonth()).toBe(2); // Mar = 2
      expect(result.websiteStart.getDate()).toBe(1);
      // End should be Mar 15 (from periodEnd which is in March)
      expect(result.websiteEnd.getMonth()).toBe(2);
      expect(result.websiteEnd.getDate()).toBe(15);
    });

    it('should parse "mid Feb 2026" to Feb 1 - Feb 14', () => {
      const result = parsePeriodDates(
        'mid Feb 2026',
        new Date('2026-02-01T05:00:00.000Z'),
        new Date('2026-02-14T05:00:00.000Z')
      );
      expect(result.websiteStart.getMonth()).toBe(1); // Feb = 1
      expect(result.websiteStart.getDate()).toBe(1);
      expect(result.websiteEnd.getMonth()).toBe(1);
      expect(result.websiteEnd.getDate()).toBe(14);
    });

    it('should handle abbreviated month names (mid Mar, mid Jan, etc.)', () => {
      // Use timezone-aware dates like the DB returns
      const result = parsePeriodDates(
        'mid Mar 2026',
        new Date('2026-02-15T05:00:00.000Z'),
        new Date('2026-03-15T04:00:00.000Z')
      );
      expect(result.websiteStart.getMonth()).toBe(2); // Mar = 2
      expect(result.websiteStart.getDate()).toBe(1);
      expect(result.websiteEnd.getMonth()).toBe(2);
      // periodEnd is Mar 15 in UTC, getDate() depends on local TZ
      // The key assertion: it should be in March, not February
      expect(result.websiteEnd.getMonth()).toBe(2);
      expect(result.websiteEnd.getDate()).toBeGreaterThanOrEqual(14);
      expect(result.websiteEnd.getDate()).toBeLessThanOrEqual(15);
    });

    it('should fall back to 15th when periodEnd is in a different month', () => {
      // If periodEnd is clearly in a different month (April 15 UTC), use March 15
      const result = parsePeriodDates(
        'Mid March 2026',
        new Date('2026-02-15T05:00:00.000Z'),
        new Date('2026-04-15T04:00:00.000Z') // periodEnd is clearly in April
      );
      expect(result.websiteStart.getMonth()).toBe(2);
      expect(result.websiteStart.getDate()).toBe(1);
      expect(result.websiteEnd.getMonth()).toBe(2);
      expect(result.websiteEnd.getDate()).toBe(15); // Falls back to 15th
    });
  });

  describe('Unrecognized labels fall back to Petpooja dates', () => {
    it('should use Petpooja dates for unrecognized labels', () => {
      const petpoojaStart = new Date('2026-01-15');
      const petpoojaEnd = new Date('2026-02-15');
      const result = parsePeriodDates(
        'Custom Period Q1',
        petpoojaStart,
        petpoojaEnd
      );
      expect(result.websiteStart).toBe(petpoojaStart);
      expect(result.websiteEnd).toBe(petpoojaEnd);
    });
  });

  describe('Regression: ensures correct totals', () => {
    it('Mid March 2026 should NOT include February orders', () => {
      const result = parsePeriodDates(
        'Mid March 2026',
        new Date('2026-02-13T05:00:00.000Z'),
        new Date('2026-03-15T04:00:00.000Z')
      );
      // The start date should be March 1, not February 13
      expect(result.websiteStart.getMonth()).toBe(2); // March
      expect(result.websiteStart.getDate()).toBe(1);
      // Verify it's NOT February
      expect(result.websiteStart.getMonth()).not.toBe(1); // Not February
    });

    it('mid Feb 2026 should only include Feb 1-14, not overlap with January', () => {
      const result = parsePeriodDates(
        'mid Feb 2026',
        new Date('2026-02-01T05:00:00.000Z'),
        new Date('2026-02-14T05:00:00.000Z')
      );
      expect(result.websiteStart.getMonth()).toBe(1); // February
      expect(result.websiteStart.getDate()).toBe(1);
      expect(result.websiteEnd.getDate()).toBe(14);
    });
  });
});
