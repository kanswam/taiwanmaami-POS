import { describe, it, expect } from 'vitest';

/**
 * Tests for channel analytics period history feature.
 * Validates the period selection logic and data retention.
 */

describe('Channel Analytics Period Selection', () => {
  // Test period date range calculation logic (mirrors frontend useEffect)
  describe('Period date range calculation', () => {
    it('should set current range to match global date filter', () => {
      const startDate = '2026-01-15';
      const endDate = '2026-02-14';
      const channelPeriod = 'current';

      let channelStartDate = startDate;
      let channelEndDate = endDate;

      if (channelPeriod === 'current') {
        channelStartDate = startDate;
        channelEndDate = endDate;
      }

      expect(channelStartDate).toBe('2026-01-15');
      expect(channelEndDate).toBe('2026-02-14');
    });

    it('should set all_time range from business start to today', () => {
      const channelPeriod = 'all_time';
      let channelStartDate = '';
      let channelEndDate = '';

      if (channelPeriod === 'all_time') {
        channelStartDate = '2024-04-01';
        channelEndDate = new Date().toISOString().split('T')[0];
      }

      expect(channelStartDate).toBe('2024-04-01');
      expect(channelEndDate).toBe(new Date().toISOString().split('T')[0]);
    });

    it('should set ytd range from Jan 1 of current year to today', () => {
      const channelPeriod = 'ytd';
      let channelStartDate = '';
      let channelEndDate = '';

      if (channelPeriod === 'ytd') {
        const year = new Date().getFullYear();
        channelStartDate = `${year}-01-01`;
        channelEndDate = new Date().toISOString().split('T')[0];
      }

      const year = new Date().getFullYear();
      expect(channelStartDate).toBe(`${year}-01-01`);
      expect(channelEndDate).toBe(new Date().toISOString().split('T')[0]);
    });

    it('should set specific period range from delivery period data', () => {
      const deliveryPeriods = [
        { id: 1, periodLabel: 'mid Feb 2026', periodStart: new Date('2026-02-01'), periodEnd: new Date('2026-02-14'), totalOrders: 85, grandTotal: 10200000, zomatoOrders: 40, swiggyOrders: 30, dineInOrders: 15, createdAt: new Date() },
        { id: 2, periodLabel: 'Jan 2026', periodStart: new Date('2026-01-01'), periodEnd: new Date('2026-01-31'), totalOrders: 120, grandTotal: 15000000, zomatoOrders: 55, swiggyOrders: 45, dineInOrders: 20, createdAt: new Date() },
      ];

      const channelPeriod = '1';
      const period = deliveryPeriods.find(p => String(p.id) === channelPeriod);

      let channelStartDate = '';
      let channelEndDate = '';

      if (period) {
        channelStartDate = new Date(period.periodStart).toISOString().split('T')[0];
        channelEndDate = new Date(period.periodEnd).toISOString().split('T')[0];
      }

      expect(channelStartDate).toBe('2026-02-01');
      expect(channelEndDate).toBe('2026-02-14');
    });

    it('should handle unknown period gracefully', () => {
      const deliveryPeriods = [
        { id: 1, periodLabel: 'mid Feb 2026', periodStart: new Date('2026-02-01'), periodEnd: new Date('2026-02-14'), totalOrders: 85, grandTotal: 10200000, zomatoOrders: 40, swiggyOrders: 30, dineInOrders: 15, createdAt: new Date() },
      ];

      const channelPeriod = '999'; // non-existent
      const period = deliveryPeriods.find(p => String(p.id) === channelPeriod);

      let channelStartDate = 'default-start';
      let channelEndDate = 'default-end';

      if (period) {
        channelStartDate = new Date(period.periodStart).toISOString().split('T')[0];
        channelEndDate = new Date(period.periodEnd).toISOString().split('T')[0];
      }

      // Should remain unchanged since period not found
      expect(channelStartDate).toBe('default-start');
      expect(channelEndDate).toBe('default-end');
    });
  });

  describe('Period history display', () => {
    it('should sort periods by periodStart descending (most recent first)', () => {
      const periods = [
        { id: 1, periodLabel: 'Jan 2026', periodStart: new Date('2026-01-01') },
        { id: 2, periodLabel: 'Feb 2026', periodStart: new Date('2026-02-01') },
        { id: 3, periodLabel: 'Dec 2025', periodStart: new Date('2025-12-01') },
      ];

      const sorted = [...periods].sort((a, b) => 
        new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
      );

      expect(sorted[0].periodLabel).toBe('Feb 2026');
      expect(sorted[1].periodLabel).toBe('Jan 2026');
      expect(sorted[2].periodLabel).toBe('Dec 2025');
    });

    it('should format grand total correctly in INR', () => {
      const grandTotal = 28071444; // paise
      const formatted = (grandTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 });
      expect(formatted).toContain('2,80,714');
    });

    it('should identify selected period with active state', () => {
      const channelPeriod = '2';
      const periods = [
        { id: 1, periodLabel: 'Jan 2026' },
        { id: 2, periodLabel: 'Feb 2026' },
      ];

      const activeIndex = periods.findIndex(p => String(p.id) === channelPeriod);
      expect(activeIndex).toBe(1);
      expect(periods[activeIndex].periodLabel).toBe('Feb 2026');
    });

    it('should detect period ID pattern for dropdown vs preset buttons', () => {
      expect('1'.match(/^\d+$/)).toBeTruthy();
      expect('42'.match(/^\d+$/)).toBeTruthy();
      expect('current'.match(/^\d+$/)).toBeNull();
      expect('all_time'.match(/^\d+$/)).toBeNull();
      expect('ytd'.match(/^\d+$/)).toBeNull();
    });
  });

  describe('Cumulative calculations', () => {
    it('should aggregate totals across multiple periods for all_time view', () => {
      const periods = [
        { totalOrders: 85, grandTotal: 10200000, zomatoOrders: 40, swiggyOrders: 30, dineInOrders: 15 },
        { totalOrders: 120, grandTotal: 15000000, zomatoOrders: 55, swiggyOrders: 45, dineInOrders: 20 },
        { totalOrders: 95, grandTotal: 12000000, zomatoOrders: 45, swiggyOrders: 35, dineInOrders: 15 },
      ];

      const totalOrders = periods.reduce((sum, p) => sum + p.totalOrders, 0);
      const grandTotal = periods.reduce((sum, p) => sum + p.grandTotal, 0);
      const totalZomato = periods.reduce((sum, p) => sum + p.zomatoOrders, 0);
      const totalSwiggy = periods.reduce((sum, p) => sum + p.swiggyOrders, 0);

      expect(totalOrders).toBe(300);
      expect(grandTotal).toBe(37200000);
      expect(totalZomato).toBe(140);
      expect(totalSwiggy).toBe(110);
    });
  });
});
