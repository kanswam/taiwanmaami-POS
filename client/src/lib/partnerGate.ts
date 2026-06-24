// Partner Programme access gate
// During testing phase, Partner pages are only accessible with a secret key
// Once the programme launches publicly, set PARTNER_GATE_ACTIVE to false

const PARTNER_GATE_ACTIVE = true;
const PARTNER_GATE_KEY = "tmpartner2026";
const SESSION_STORAGE_KEY = "partner_access_granted";

/**
 * Check if the current URL has the partner gate key.
 * If found, store it in sessionStorage so the user doesn't need to keep it in the URL.
 * Returns true if access is granted.
 */
export function checkPartnerAccess(): boolean {
  if (!PARTNER_GATE_ACTIVE) return true;

  // Check sessionStorage first (persists for the browser session)
  if (typeof window !== "undefined") {
    if (sessionStorage.getItem(SESSION_STORAGE_KEY) === "true") {
      return true;
    }

    // Check URL parameter
    const params = new URLSearchParams(window.location.search);
    const key = params.get("key");
    if (key === PARTNER_GATE_KEY) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
      return true;
    }

    // Allow access via referral link (?ref=CODE)
    const ref = params.get("ref");
    if (ref && ref.length > 0) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
      return true;
    }
  }

  return false;
}

/**
 * Whether the Partner nav link should be visible
 */
export function isPartnerNavVisible(): boolean {
  if (!PARTNER_GATE_ACTIVE) return true;

  if (typeof window !== "undefined") {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) === "true";
  }

  return false;
}

/**
 * Whether the gate is currently active
 */
export function isPartnerGateActive(): boolean {
  return PARTNER_GATE_ACTIVE;
}
