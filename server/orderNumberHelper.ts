/**
 * Financial Year-Aware Order Number Generator
 * 
 * Indian financial year runs April 1 to March 31.
 * Order numbers reset to 00001 at the start of each financial year.
 * 
 * The helper queries only orders created within the current FY
 * to determine the next sequential number.
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
 * @param dbInstance - The database connection instance
 * @returns A zero-padded 5-digit order number string (e.g., "00001")
 */
export async function generateNextOrderNumber(dbInstance: any): Promise<string> {
  const fyStart = getCurrentFYStart();
  const fyStartStr = fyStart.toISOString().slice(0, 19).replace('T', ' ');

  // Only look at orders created within the current financial year
  const [maxOrderResult] = await dbInstance.execute(
    sql`SELECT MAX(CAST(orderNumber AS UNSIGNED)) as maxNum 
        FROM orders 
        WHERE orderNumber REGEXP '^[0-9]+$' 
        AND createdAt >= ${fyStartStr}`
  );

  const maxNum = (maxOrderResult as any)[0]?.maxNum || 0;
  const nextNum = maxNum + 1;
  return String(nextNum).padStart(5, '0');
}
