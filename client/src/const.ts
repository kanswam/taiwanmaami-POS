export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Hardcoded production domain as fallback when window.location.origin is unavailable
const PRODUCTION_ORIGIN = "https://www.taiwanmaami.com";

/**
 * Reliably get the current origin, with fallback to production domain.
 * On some mobile browsers (especially iOS Safari), window.location.origin
 * can occasionally be empty or "null" during page load or navigation.
 */
function getReliableOrigin(): string {
  try {
    const origin = window.location.origin;
    // Validate origin is a real URL (not empty, "null", or "file://")
    if (origin && origin !== "null" && origin.startsWith("http")) {
      return origin;
    }
  } catch {
    // window.location may throw in some edge cases
  }

  // Try constructing from protocol + host
  try {
    const { protocol, host } = window.location;
    if (protocol && host && protocol.startsWith("http")) {
      return `${protocol}//${host}`;
    }
  } catch {
    // fallback below
  }

  return PRODUCTION_ORIGIN;
}

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const origin = getReliableOrigin();
  const redirectUri = `${origin}/api/oauth/callback`;

  // Validate that we have all required parameters before building the URL
  if (!oauthPortalUrl || !appId) {
    console.error("[Login] Missing OAuth config: oauthPortalUrl or appId");
    // Return a URL that will at least show a meaningful error
    return `${origin}/login-error?reason=missing_config`;
  }

  // Use encodeURIComponent for the state to handle special characters safely
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
