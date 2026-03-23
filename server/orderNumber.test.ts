import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentFYStart, getCurrentFYLabel } from './orderNumberHelper';

describe('Order Number - Financial Year Logic', () => {
  
  describe('getCurrentFYStart', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns Apr 1 of previous year when current date is in Jan', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15T10:00:00.000Z'));
      const fyStart = getCurrentFYStart();
      expect(fyStart.getUTCFullYear()).toBe(2025);
      expect(fyStart.getUTCMonth()).toBe(3); // April = 3
      expect(fyStart.getUTCDate()).toBe(1);
    });

    it('returns Apr 1 of previous year when current date is in Feb', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-28T10:00:00.000Z'));
      const fyStart = getCurrentFYStart();
      expect(fyStart.getUTCFullYear()).toBe(2025);
      expect(fyStart.getUTCMonth()).toBe(3);
      expect(fyStart.getUTCDate()).toBe(1);
    });

    it('returns Apr 1 of previous year when current date is in Mar', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-31T23:59:59.000Z'));
      const fyStart = getCurrentFYStart();
      expect(fyStart.getUTCFullYear()).toBe(2025);
      expect(fyStart.getUTCMonth()).toBe(3);
      expect(fyStart.getUTCDate()).toBe(1);
    });

    it('returns Apr 1 of current year when current date is Apr 1', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-01T00:00:00.000Z'));
      const fyStart = getCurrentFYStart();
      expect(fyStart.getUTCFullYear()).toBe(2026);
      expect(fyStart.getUTCMonth()).toBe(3);
      expect(fyStart.getUTCDate()).toBe(1);
    });

    it('returns Apr 1 of current year when current date is in May', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-15T10:00:00.000Z'));
      const fyStart = getCurrentFYStart();
      expect(fyStart.getUTCFullYear()).toBe(2026);
      expect(fyStart.getUTCMonth()).toBe(3);
      expect(fyStart.getUTCDate()).toBe(1);
    });

    it('returns Apr 1 of current year when current date is in Dec', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-12-25T10:00:00.000Z'));
      const fyStart = getCurrentFYStart();
      expect(fyStart.getUTCFullYear()).toBe(2026);
      expect(fyStart.getUTCMonth()).toBe(3);
      expect(fyStart.getUTCDate()).toBe(1);
    });
  });

  describe('getCurrentFYLabel', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "2025-26" for dates in Jan-Mar 2026', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-15T10:00:00.000Z'));
      expect(getCurrentFYLabel()).toBe('2025-26');
    });

    it('returns "2026-27" for dates in Apr-Dec 2026', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-01T00:00:00.000Z'));
      expect(getCurrentFYLabel()).toBe('2026-27');
    });

    it('returns "2026-27" for dates in Jul 2026', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-15T10:00:00.000Z'));
      expect(getCurrentFYLabel()).toBe('2026-27');
    });

    it('returns "2026-27" for dates in Jan 2027 (still FY 2026-27)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2027-01-15T10:00:00.000Z'));
      expect(getCurrentFYLabel()).toBe('2026-27');
    });
  });

  describe('FY boundary - critical Apr 1 transition', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('Mar 31 23:59 UTC is still in previous FY', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-31T23:59:59.000Z'));
      const fyStart = getCurrentFYStart();
      expect(fyStart.getUTCFullYear()).toBe(2025);
    });

    it('Apr 1 00:00 UTC is in new FY', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-01T00:00:00.000Z'));
      const fyStart = getCurrentFYStart();
      expect(fyStart.getUTCFullYear()).toBe(2026);
    });
  });
});
