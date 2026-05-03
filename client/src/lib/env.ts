/**
 * Client-side environment variable validation.
 * All VITE_* secrets must be validated here — no inline fallbacks allowed.
 * If a required variable is missing, the app will fail fast with a clear error.
 */

function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `${key} is not set. Check your .env file or deployment environment config.`
    );
  }
  return value;
}

/** KOT Printer authentication secret */
export const KOT_PRINT_SECRET = requireEnv('VITE_KOT_PRINT_SECRET');
