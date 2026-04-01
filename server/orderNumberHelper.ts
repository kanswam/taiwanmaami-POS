/**
 * Financial Year-Aware Order Number Generator
 * 
 * Indian financial year runs April 1 to March 31.
 * Order numbers reset to 00001 at the start of each financial year.
 * 
 * Format: YY-NNNNN (e.g., "26-00001" for FY 2026-27)
 * The FY prefix ensures uniqueness across financial years.
 * 
 * BACKWARD COMPATIBILITY:
 * - Old orders (FY 2025-26) used plain 5-digit numbers like "00001"
 * - New orders (FY 2026-27+) use prefixed format like "26-00001"
 * - The query only counts orders within the current FY to determine the next number
 * - Display: The prefix is part of the order number but staff can refer to just the number portion
 */

import { sql } from 'drizzle-orm';

/**
 * Get the start date of the current Indian financial year.
 * FY starts on April 1st.
 * - If today is Jan-Mar 2026, FY started Apr 1, 2025
 * - If today is Apr-Dec 2026, FY started Apr 1, 2026
 */
export function getCurrentFYStart(): Date {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-indexed: 0=Jan, 3=Apr

  // If we're in Jan (0), Feb (1), or Mar (2), the FY started last year
  // If we're in Apr (3) or later, the FY started this year
  const fyStartYear = month < 3 ? year - 1 : year;
  return new Date(`${fyStartYear}-04-01T00:00:00.000Z`);
}

/**
 * Get the 2-digit FY start year (e.g., "26" for FY 2026-27)
 */
export function getCurrentFYPrefix(): string {
  const fyStart = getCurrentFYStart();
  return String(fyStart.getUTCFullYear()).slice(2); // "2026" -> "26"
}

/**
 * Get the FY label string (e.g., "2026-27" for FY starting Apr 2026)
 */
export function getCurrentFYLabel(): string {
  const fyStart = getCurrentFYStart();
  const startYear = fyStart.getUTCFullYear();
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

/**
 * Generate the next sequential order number for the current financial year.
 * Resets to 1 at the start of each FY (April 1st).
 * 
 * For FY 2025-26 (old format): plain 5-digit numbers like "00001"
 * For FY 2026-27+ (new format): prefixed like "26-00001"
 * 
 * @param dbInstance - The database connection instance
 * @returns An order number string (e.g., "26-00001")
 */
export async function generateNextOrderNumber(dbInstance: any): Promise<string> {
  const fyStart = getCurrentFYStart();
  const fyStartStr = fyStart.toISOString().slice(0, 19).replace('T', ' ');
  const fyPrefix = getCurrentFYPrefix();

  // For FY 2026-27 onwards, use prefixed format
  // Look for orders with the current FY prefix (e.g., "26-NNNNN")
  // Also check for old-format orders in this FY period (in case of transition)
  const [maxPrefixedResult] = await dbInstance.execute(
    sql`SELECT MAX(CAST(SUBSTRING(orderNumber, 4) AS UNSIGNED)) as maxNum 
        FROM orders 
        WHERE orderNumber LIKE CONCAT(${fyPrefix}, '-%')
        AND createdAt >= ${fyStartStr}`
  );

  // Also check old-format orders created in this FY (transition safety)
  const [maxOldResult] = await dbInstance.execute(
    sql`SELECT MAX(CAST(orderNumber AS UNSIGNED)) as maxNum 
        FROM orders 
        WHERE orderNumber REGEXP '^[0-9]+$' 
        AND createdAt >= ${fyStartStr}`
  );

  const maxPrefixed = (maxPrefixedResult as any)[0]?.maxNum || 0;
  const maxOld = (maxOldResult as any)[0]?.maxNum || 0;
  const maxNum = Math.max(maxPrefixed, maxOld);
  const nextNum = maxNum + 1;
  
  return `${fyPrefix}-${String(nextNum).padStart(5, '0')}`;
}
