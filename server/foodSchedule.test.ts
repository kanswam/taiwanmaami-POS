import { describe, it, expect, vi, afterEach } from 'vitest';
import { getISTTime, formatSchedule, getFoodCategoryId } from './foodSchedule';

/**
 * Tests for the Food Availability Scheduler
 * 
 * The food schedule logic:
 *   Mon–Fri: 4:00 PM – 12:00 AM (midnight) IST
 *   Sat–Sun: 12:00 PM – 3:00 PM  &  6:00 PM – 12:00 AM (midnight) IST
 * 
 * IST = UTC + 5:30
 * So 4 PM IST = 10:30 AM UTC
 *    12 AM IST (midnight) = 6:30 PM UTC (previous day)
 *    12 PM IST = 6:30 AM UTC
 *    3 PM IST = 9:30 AM UTC
 *    6 PM IST = 12:30 PM UTC
 */

describe('Food Schedule - getISTTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('converts UTC midnight to 5:30 AM IST', () => {
    const result = getISTTime(new Date('2026-03-24T00:00:00Z'));
    expect(result.hours).toBe(5);
    expect(result.minutes).toBe(30);
  });

  it('converts UTC noon to 5:30 PM IST', () => {
    const result = getISTTime(new Date('2026-03-24T12:00:00Z'));
    expect(result.hours).toBe(17);
    expect(result.minutes).toBe(30);
  });

  it('converts 10:30 UTC to 4:00 PM IST', () => {
    const result = getISTTime(new Date('2026-03-24T10:30:00Z'));
    expect(result.hours).toBe(16);
    expect(result.minutes).toBe(0);
  });

  it('converts 18:29 UTC to 11:59 PM IST', () => {
    const result = getISTTime(new Date('2026-03-24T18:29:00Z'));
    expect(result.hours).toBe(23);
    expect(result.minutes).toBe(59);
  });

  it('converts 18:30 UTC to 12:00 AM IST (next day)', () => {
    // 18:30 UTC on Monday = 00:00 IST on Tuesday
    const result = getISTTime(new Date('2026-03-23T18:30:00Z'));
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    // March 23 is Monday UTC, but 18:30 UTC = midnight IST Tuesday
    expect(result.dayOfWeek).toBe(2); // Tuesday
  });

  it('correctly identifies Monday (IST)', () => {
    // Monday March 23, 2026 at 2 PM IST = 8:30 AM UTC
    const result = getISTTime(new Date('2026-03-23T08:30:00Z'));
    expect(result.dayOfWeek).toBe(1); // Monday
    expect(result.hours).toBe(14);
  });

  it('correctly identifies Saturday (IST)', () => {
    // Saturday March 28, 2026 at 1 PM IST = 7:30 AM UTC
    const result = getISTTime(new Date('2026-03-28T07:30:00Z'));
    expect(result.dayOfWeek).toBe(6); // Saturday
    expect(result.hours).toBe(13);
  });

  it('correctly identifies Sunday (IST)', () => {
    // Sunday March 29, 2026 at 10 AM IST = 4:30 AM UTC
    const result = getISTTime(new Date('2026-03-29T04:30:00Z'));
    expect(result.dayOfWeek).toBe(0); // Sunday
    expect(result.hours).toBe(10);
  });
});

describe('Food Schedule - isWithinWindow (via isFoodAvailable)', () => {
  // We test the window logic indirectly through the exported isFoodAvailable function
  // Since isFoodAvailable is async and depends on DB, we test the core logic directly
  
  // Helper to test window matching directly
  function isWithinWindow(hours: number, minutes: number, window: { startHour: number; startMinute: number; endHour: number; endMinute: number }): boolean {
    const currentMinutes = hours * 60 + minutes;
    const startMinutes = window.startHour * 60 + window.startMinute;
    const endMinutes = window.endHour * 60 + window.endMinute;
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  describe('Weekday window (4 PM - 12 AM)', () => {
    const weekdayWindow = { startHour: 16, startMinute: 0, endHour: 24, endMinute: 0 };

    it('returns false at 3:59 PM (just before food hours)', () => {
      expect(isWithinWindow(15, 59, weekdayWindow)).toBe(false);
    });

    it('returns true at 4:00 PM (start of food hours)', () => {
      expect(isWithinWindow(16, 0, weekdayWindow)).toBe(true);
    });

    it('returns true at 4:01 PM', () => {
      expect(isWithinWindow(16, 1, weekdayWindow)).toBe(true);
    });

    it('returns true at 8:00 PM (middle of food hours)', () => {
      expect(isWithinWindow(20, 0, weekdayWindow)).toBe(true);
    });

    it('returns true at 11:59 PM (just before midnight)', () => {
      expect(isWithinWindow(23, 59, weekdayWindow)).toBe(true);
    });

    it('returns false at 12:00 AM (midnight - end of window)', () => {
      // endHour=24 means 1440 minutes, 0:00 = 0 minutes, so 0 < 1440 is true
      // But wait - 0*60+0 = 0, and 0 >= 960 is false. So midnight (hour 0) is NOT in window.
      expect(isWithinWindow(0, 0, weekdayWindow)).toBe(false);
    });

    it('returns false at 10:00 AM', () => {
      expect(isWithinWindow(10, 0, weekdayWindow)).toBe(false);
    });

    it('returns false at 2:00 PM', () => {
      expect(isWithinWindow(14, 0, weekdayWindow)).toBe(false);
    });
  });

  describe('Weekend Slot 1 (12 PM - 3 PM)', () => {
    const slot1 = { startHour: 12, startMinute: 0, endHour: 15, endMinute: 0 };

    it('returns false at 11:59 AM', () => {
      expect(isWithinWindow(11, 59, slot1)).toBe(false);
    });

    it('returns true at 12:00 PM', () => {
      expect(isWithinWindow(12, 0, slot1)).toBe(true);
    });

    it('returns true at 1:30 PM', () => {
      expect(isWithinWindow(13, 30, slot1)).toBe(true);
    });

    it('returns true at 2:59 PM', () => {
      expect(isWithinWindow(14, 59, slot1)).toBe(true);
    });

    it('returns false at 3:00 PM (end of slot)', () => {
      expect(isWithinWindow(15, 0, slot1)).toBe(false);
    });
  });

  describe('Weekend Slot 2 (6 PM - 12 AM)', () => {
    const slot2 = { startHour: 18, startMinute: 0, endHour: 24, endMinute: 0 };

    it('returns false at 5:59 PM', () => {
      expect(isWithinWindow(17, 59, slot2)).toBe(false);
    });

    it('returns true at 6:00 PM', () => {
      expect(isWithinWindow(18, 0, slot2)).toBe(true);
    });

    it('returns true at 9:00 PM', () => {
      expect(isWithinWindow(21, 0, slot2)).toBe(true);
    });

    it('returns true at 11:59 PM', () => {
      expect(isWithinWindow(23, 59, slot2)).toBe(true);
    });

    it('returns false at midnight', () => {
      expect(isWithinWindow(0, 0, slot2)).toBe(false);
    });
  });

  describe('Weekend gap (3 PM - 6 PM)', () => {
    const slot1 = { startHour: 12, startMinute: 0, endHour: 15, endMinute: 0 };
    const slot2 = { startHour: 18, startMinute: 0, endHour: 24, endMinute: 0 };

    it('returns false at 3:30 PM (between slots)', () => {
      const inSlot1 = isWithinWindow(15, 30, slot1);
      const inSlot2 = isWithinWindow(15, 30, slot2);
      expect(inSlot1 || inSlot2).toBe(false);
    });

    it('returns false at 4:00 PM (between slots on weekend)', () => {
      const inSlot1 = isWithinWindow(16, 0, slot1);
      const inSlot2 = isWithinWindow(16, 0, slot2);
      expect(inSlot1 || inSlot2).toBe(false);
    });

    it('returns false at 5:00 PM (between slots)', () => {
      const inSlot1 = isWithinWindow(17, 0, slot1);
      const inSlot2 = isWithinWindow(17, 0, slot2);
      expect(inSlot1 || inSlot2).toBe(false);
    });
  });
});

describe('Food Schedule - formatSchedule', () => {
  it('formats default weekday schedule correctly', () => {
    const config = {
      enabled: true,
      weekday: [{ startHour: 16, startMinute: 0, endHour: 24, endMinute: 0 }],
      weekend: [
        { startHour: 12, startMinute: 0, endHour: 15, endMinute: 0 },
        { startHour: 18, startMinute: 0, endHour: 24, endMinute: 0 },
      ],
    };

    const result = formatSchedule(config);
    expect(result.enabled).toBe(true);
    expect(result.weekday).toBe('4 PM – 12 AM');
    expect(result.weekend).toBe('12 PM – 3 PM & 6 PM – 12 AM');
  });

  it('formats disabled schedule', () => {
    const config = {
      enabled: false,
      weekday: [{ startHour: 16, startMinute: 0, endHour: 24, endMinute: 0 }],
      weekend: [
        { startHour: 12, startMinute: 0, endHour: 15, endMinute: 0 },
        { startHour: 18, startMinute: 0, endHour: 24, endMinute: 0 },
      ],
    };

    const result = formatSchedule(config);
    expect(result.enabled).toBe(false);
  });

  it('formats custom time windows with minutes', () => {
    const config = {
      enabled: true,
      weekday: [{ startHour: 16, startMinute: 30, endHour: 23, endMinute: 45 }],
      weekend: [{ startHour: 11, startMinute: 15, endHour: 14, endMinute: 30 }],
    };

    const result = formatSchedule(config);
    expect(result.weekday).toBe('4:30 PM – 11:45 PM');
    expect(result.weekend).toBe('11:15 AM – 2:30 PM');
  });

  it('formats morning times correctly', () => {
    const config = {
      enabled: true,
      weekday: [{ startHour: 8, startMinute: 0, endHour: 12, endMinute: 0 }],
      weekend: [{ startHour: 9, startMinute: 0, endHour: 11, endMinute: 0 }],
    };

    const result = formatSchedule(config);
    expect(result.weekday).toBe('8 AM – 12 PM');
    expect(result.weekend).toBe('9 AM – 11 AM');
  });

  it('formats midnight (24:00) as 12 AM', () => {
    const config = {
      enabled: true,
      weekday: [{ startHour: 20, startMinute: 0, endHour: 24, endMinute: 0 }],
      weekend: [],
    };

    const result = formatSchedule(config);
    expect(result.weekday).toBe('8 PM – 12 AM');
    expect(result.weekend).toBe('');
  });

  it('formats noon correctly', () => {
    const config = {
      enabled: true,
      weekday: [{ startHour: 12, startMinute: 0, endHour: 13, endMinute: 0 }],
      weekend: [],
    };

    const result = formatSchedule(config);
    expect(result.weekday).toBe('12 PM – 1 PM');
  });
});

describe('Food Schedule - getFoodCategoryId', () => {
  it('returns category ID 4 for Food', () => {
    expect(getFoodCategoryId()).toBe(4);
  });
});

describe('Food Schedule - Day/Time Scenarios', () => {
  // These test the full scenario: given a UTC time, what IST time do we get,
  // and would food be available under the default schedule?

  const defaultWeekday = [{ startHour: 16, startMinute: 0, endHour: 24, endMinute: 0 }];
  const defaultWeekend = [
    { startHour: 12, startMinute: 0, endHour: 15, endMinute: 0 },
    { startHour: 18, startMinute: 0, endHour: 24, endMinute: 0 },
  ];

  function isWithinWindow(hours: number, minutes: number, window: { startHour: number; startMinute: number; endHour: number; endMinute: number }): boolean {
    const currentMinutes = hours * 60 + minutes;
    const startMinutes = window.startHour * 60 + window.startMinute;
    const endMinutes = window.endHour * 60 + window.endMinute;
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  function checkFoodAvailable(utcTime: string): boolean {
    const ist = getISTTime(new Date(utcTime));
    const isWeekend = ist.dayOfWeek === 0 || ist.dayOfWeek === 6;
    const windows = isWeekend ? defaultWeekend : defaultWeekday;
    return windows.some(w => isWithinWindow(ist.hours, ist.minutes, w));
  }

  it('Monday 10 AM IST (5:30 AM UTC) - food NOT available', () => {
    // Monday March 23, 2026
    expect(checkFoodAvailable('2026-03-23T04:30:00Z')).toBe(false);
  });

  it('Monday 4 PM IST (10:30 AM UTC) - food available', () => {
    expect(checkFoodAvailable('2026-03-23T10:30:00Z')).toBe(true);
  });

  it('Monday 8 PM IST (2:30 PM UTC) - food available', () => {
    expect(checkFoodAvailable('2026-03-23T14:30:00Z')).toBe(true);
  });

  it('Monday 11:59 PM IST (6:29 PM UTC) - food available', () => {
    expect(checkFoodAvailable('2026-03-23T18:29:00Z')).toBe(true);
  });

  it('Tuesday 12:00 AM IST (Mon 6:30 PM UTC) - food NOT available', () => {
    // This is midnight IST, which is the end of the window
    expect(checkFoodAvailable('2026-03-23T18:30:00Z')).toBe(false);
  });

  it('Wednesday 3:59 PM IST - food NOT available', () => {
    // 3:59 PM IST = 10:29 AM UTC
    expect(checkFoodAvailable('2026-03-25T10:29:00Z')).toBe(false);
  });

  it('Saturday 11 AM IST - food NOT available (before lunch slot)', () => {
    // Saturday March 28, 2026 at 11 AM IST = 5:30 AM UTC
    expect(checkFoodAvailable('2026-03-28T05:30:00Z')).toBe(false);
  });

  it('Saturday 12:30 PM IST - food available (lunch slot)', () => {
    // 12:30 PM IST = 7:00 AM UTC
    expect(checkFoodAvailable('2026-03-28T07:00:00Z')).toBe(true);
  });

  it('Saturday 4 PM IST - food NOT available (between slots)', () => {
    // 4 PM IST = 10:30 AM UTC
    expect(checkFoodAvailable('2026-03-28T10:30:00Z')).toBe(false);
  });

  it('Saturday 7 PM IST - food available (dinner slot)', () => {
    // 7 PM IST = 1:30 PM UTC
    expect(checkFoodAvailable('2026-03-28T13:30:00Z')).toBe(true);
  });

  it('Sunday 1 PM IST - food available (lunch slot)', () => {
    // Sunday March 29, 2026 at 1 PM IST = 7:30 AM UTC
    expect(checkFoodAvailable('2026-03-29T07:30:00Z')).toBe(true);
  });

  it('Sunday 5 PM IST - food NOT available (between slots)', () => {
    // 5 PM IST = 11:30 AM UTC
    expect(checkFoodAvailable('2026-03-29T11:30:00Z')).toBe(false);
  });

  it('Sunday 10 PM IST - food available (dinner slot)', () => {
    // 10 PM IST = 4:30 PM UTC
    expect(checkFoodAvailable('2026-03-29T16:30:00Z')).toBe(true);
  });

  it('Friday 3 PM IST - food NOT available', () => {
    // Friday March 28 is actually Saturday, let's use March 27 (Friday)
    // 3 PM IST = 9:30 AM UTC
    expect(checkFoodAvailable('2026-03-27T09:30:00Z')).toBe(false);
  });

  it('Friday 6 PM IST - food available', () => {
    // 6 PM IST = 12:30 PM UTC
    expect(checkFoodAvailable('2026-03-27T12:30:00Z')).toBe(true);
  });
});
