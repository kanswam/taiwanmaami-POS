/**
 * Food Availability Scheduler
 * 
 * Automatically determines whether food items should be shown on the menu
 * based on the current day and time in IST (Indian Standard Time).
 * 
 * Default food timings: 12:00 PM – 12:00 AM (midnight) every day
 * 
 * Beverages & Mochis: always available during store hours (12 Noon – 12 Midnight)
 * 
 * The schedule is configurable via the site_settings table so the admin
 * can adjust windows without code changes.
 */

import { getDb } from "./db";
import { siteSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Food category ID — "Food" category in the database
const FOOD_CATEGORY_ID = 4;

/**
 * Time window definition
 */
interface TimeWindow {
  startHour: number;   // 0-23
  startMinute: number; // 0-59
  endHour: number;     // 0-23 (24 = midnight next day)
  endMinute: number;   // 0-59
}

/**
 * Full schedule config
 */
interface FoodScheduleConfig {
  enabled: boolean;
  manualOverride?: 'on' | 'off' | null;  // Force food on/off regardless of schedule
  weekday: TimeWindow[];  // Mon-Fri
  weekend: TimeWindow[];  // Sat-Sun
}

/**
 * Default schedule matching the business requirements
 */
const DEFAULT_SCHEDULE: FoodScheduleConfig = {
  enabled: true,
  weekday: [
    { startHour: 12, startMinute: 0, endHour: 24, endMinute: 0 }  // 12 PM - 12 AM
  ],
  weekend: [
    { startHour: 12, startMinute: 0, endHour: 24, endMinute: 0 }  // 12 PM - 12 AM
  ]
};

// Cache the schedule for 5 minutes to avoid hitting DB on every menu request
let cachedSchedule: FoodScheduleConfig | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get the food schedule from site_settings, falling back to defaults
 */
export async function getFoodSchedule(): Promise<FoodScheduleConfig> {
  const now = Date.now();
  if (cachedSchedule && now < cacheExpiry) {
    return cachedSchedule;
  }

  try {
    const dbInstance = await getDb();
    if (!dbInstance) return DEFAULT_SCHEDULE;

    const rows = await dbInstance.select().from(siteSettings).where(
      eq(siteSettings.key, 'food_schedule')
    );

    if (rows.length > 0 && rows[0].value) {
      const parsed = JSON.parse(rows[0].value) as FoodScheduleConfig;
      cachedSchedule = parsed;
      cacheExpiry = now + CACHE_TTL_MS;
      return parsed;
    }
  } catch (e) {
    console.error('[FoodSchedule] Error loading schedule from DB, using defaults:', e);
  }

  cachedSchedule = DEFAULT_SCHEDULE;
  cacheExpiry = now + CACHE_TTL_MS;
  return DEFAULT_SCHEDULE;
}

/**
 * Save the food schedule to site_settings
 */
export async function saveFoodSchedule(config: FoodScheduleConfig): Promise<boolean> {
  try {
    const dbInstance = await getDb();
    if (!dbInstance) return false;

    const existing = await dbInstance.select().from(siteSettings).where(
      eq(siteSettings.key, 'food_schedule')
    );

    const value = JSON.stringify(config);

    if (existing.length > 0) {
      await dbInstance.update(siteSettings).set({ value }).where(
        eq(siteSettings.key, 'food_schedule')
      );
    } else {
      await dbInstance.insert(siteSettings).values({
        key: 'food_schedule',
        value
      });
    }

    // Invalidate cache
    cachedSchedule = config;
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return true;
  } catch (e) {
    console.error('[FoodSchedule] Error saving schedule:', e);
    return false;
  }
}

/**
 * Get current time in IST
 */
export function getISTTime(now?: Date): { hours: number; minutes: number; dayOfWeek: number } {
  const date = now || new Date();
  // IST is UTC+5:30
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const istMs = utcMs + (5.5 * 60 * 60 * 1000);
  const istDate = new Date(istMs);

  return {
    hours: istDate.getHours(),
    minutes: istDate.getMinutes(),
    dayOfWeek: istDate.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
  };
}

/**
 * Check if the current time falls within a time window
 */
function isWithinWindow(hours: number, minutes: number, window: TimeWindow): boolean {
  const currentMinutes = hours * 60 + minutes;
  const startMinutes = window.startHour * 60 + window.startMinute;
  // endHour=24 means midnight (end of day = 1440 minutes)
  const endMinutes = window.endHour * 60 + window.endMinute;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if food is currently available based on the schedule
 */
export async function isFoodAvailable(now?: Date): Promise<boolean> {
  const schedule = await getFoodSchedule();

  // Manual override takes highest priority
  if (schedule.manualOverride === 'on') return true;
  if (schedule.manualOverride === 'off') return false;

  // If scheduling is disabled, food is always available
  if (!schedule.enabled) return true;

  const { hours, minutes, dayOfWeek } = getISTTime(now);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

  const windows = isWeekend ? schedule.weekend : schedule.weekday;

  return windows.some(w => isWithinWindow(hours, minutes, w));
}

/**
 * Get the food category ID for filtering
 */
export function getFoodCategoryId(): number {
  return FOOD_CATEGORY_ID;
}

/**
 * Get a human-readable description of the current food schedule
 */
export function formatSchedule(config: FoodScheduleConfig): {
  weekday: string;
  weekend: string;
  enabled: boolean;
} {
  const formatWindow = (w: TimeWindow): string => {
    const formatTime = (h: number, m: number): string => {
      if (h === 24 || h === 0) return '12 AM';
      if (h === 12) return `12${m > 0 ? ':' + String(m).padStart(2, '0') : ''} PM`;
      if (h > 12) return `${h - 12}${m > 0 ? ':' + String(m).padStart(2, '0') : ''} PM`;
      return `${h}${m > 0 ? ':' + String(m).padStart(2, '0') : ''} AM`;
    };
    return `${formatTime(w.startHour, w.startMinute)} – ${formatTime(w.endHour, w.endMinute)}`;
  };

  return {
    weekday: config.weekday.map(formatWindow).join(' & '),
    weekend: config.weekend.map(formatWindow).join(' & '),
    enabled: config.enabled
  };
}

/**
 * Invalidate the schedule cache (useful after admin updates)
 */
export function invalidateScheduleCache(): void {
  cachedSchedule = null;
  cacheExpiry = 0;
}
