import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isOutletOpen, OUTLET_HOURS } from '../shared/types';

describe('Business Hours Enforcement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Palladium Mall - Ordering Disabled', () => {
    it('should be unavailable regardless of time when orderingEnabled is false', () => {
      // Even during normal business hours, Palladium should be disabled
      vi.setSystemTime(new Date('2026-01-08T08:30:00Z')); // 2:00 PM IST
      const result = isOutletOpen('palladium', 'pickup');
      expect(result.available).toBe(false);
      expect(result.message).toContain('not available');
      expect(result.message).toContain('Palladium Mall');
    });

    it('should be unavailable for instore orders when disabled', () => {
      vi.setSystemTime(new Date('2026-01-08T08:30:00Z')); // 2:00 PM IST
      const result = isOutletOpen('palladium', 'instore');
      expect(result.available).toBe(false);
      expect(result.message).toContain('not available');
    });

    it('should be unavailable for pickup orders when disabled', () => {
      vi.setSystemTime(new Date('2026-01-08T04:30:00Z')); // 10:00 AM IST
      const result = isOutletOpen('palladium', 'pickup');
      expect(result.available).toBe(false);
    });

    it('should have orderingEnabled set to false', () => {
      expect(OUTLET_HOURS.palladium.orderingEnabled).toBe(false);
    });
  });

  describe('T Nagar (12 PM - 12 AM)', () => {
    it('should be closed before 12 PM', () => {
      // Set time to 11:30 AM IST
      vi.setSystemTime(new Date('2026-01-08T06:00:00Z')); // 11:30 AM IST
      const result = isOutletOpen('tnagar', 'pickup');
      expect(result.available).toBe(false);
      expect(result.message).toContain('opens at');
    });

    it('should be open at 12 PM', () => {
      // Set time to 12:00 PM IST
      vi.setSystemTime(new Date('2026-01-08T06:30:00Z')); // 12:00 PM IST
      const result = isOutletOpen('tnagar', 'pickup');
      expect(result.available).toBe(true);
    });

    it('should be open at 6 PM', () => {
      // Set time to 6:00 PM IST
      vi.setSystemTime(new Date('2026-01-08T12:30:00Z')); // 6:00 PM IST
      const result = isOutletOpen('tnagar', 'pickup');
      expect(result.available).toBe(true);
    });

    it('should allow online orders until 11:45 PM', () => {
      // Set time to 11:44 PM IST
      vi.setSystemTime(new Date('2026-01-08T18:14:00Z')); // 11:44 PM IST
      const result = isOutletOpen('tnagar', 'pickup');
      expect(result.available).toBe(true);
    });

    it('should block online orders after 11:45 PM', () => {
      // Set time to 11:46 PM IST
      vi.setSystemTime(new Date('2026-01-08T18:16:00Z')); // 11:46 PM IST
      const result = isOutletOpen('tnagar', 'pickup');
      expect(result.available).toBe(false);
      expect(result.message).toContain('closed');
    });

    it('should allow in-store orders until 11:45 PM', () => {
      // Set time to 11:44 PM IST
      vi.setSystemTime(new Date('2026-01-08T18:14:00Z')); // 11:44 PM IST
      const result = isOutletOpen('tnagar', 'instore');
      expect(result.available).toBe(true);
    });

    it('should block in-store orders after 11:45 PM', () => {
      // Set time to 11:46 PM IST
      vi.setSystemTime(new Date('2026-01-08T18:16:00Z')); // 11:46 PM IST
      const result = isOutletOpen('tnagar', 'instore');
      expect(result.available).toBe(false);
    });

    it('should have orderingEnabled set to true', () => {
      expect(OUTLET_HOURS.tnagar.orderingEnabled).toBe(true);
    });
  });

  describe('OUTLET_HOURS configuration', () => {
    it('should have correct Palladium hours', () => {
      expect(OUTLET_HOURS.palladium.openHour).toBe(10);
      expect(OUTLET_HOURS.palladium.closeHour).toBe(22);
      expect(OUTLET_HOURS.palladium.lastOrderMinutesBefore).toBe(0); // In-store till 10 PM
      expect(OUTLET_HOURS.palladium.onlineLastOrderMinutesBefore).toBe(15); // Online till 9:45 PM
    });

    it('should have correct T Nagar hours', () => {
      expect(OUTLET_HOURS.tnagar.openHour).toBe(12);
      expect(OUTLET_HOURS.tnagar.closeHour).toBe(24); // Midnight
      expect(OUTLET_HOURS.tnagar.lastOrderMinutesBefore).toBe(15); // In-store till 11:45 PM
      expect(OUTLET_HOURS.tnagar.onlineLastOrderMinutesBefore).toBe(15); // Online till 11:45 PM
    });
  });
});
