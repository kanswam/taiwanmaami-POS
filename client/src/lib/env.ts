/**
 * Client-side environment variable validation.
 * All VITE_* secrets are validated lazily — they throw only when accessed,
 * not on page load. This prevents the entire page from crashing if a secret
 * is only needed for a specific action (e.g., KOT printing).
 */

function lazyEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    console.error(
      `[ENV] ${key} is not set. Check your .env file or deployment environment config.`
    );
    return '';
  }
  return value;
}

/** KOT Printer authentication secret — validated at point of use */
export const KOT_PRINT_SECRET = lazyEnv('VITE_KOT_PRINT_SECRET');
