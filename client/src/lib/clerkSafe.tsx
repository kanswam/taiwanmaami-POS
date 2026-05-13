/**
 * Safe Clerk wrappers that gracefully degrade when ClerkProvider is absent.
 * This allows the app to render in environments where Clerk isn't configured
 * (e.g., Manus sandbox) — auth features are simply hidden.
 */
import React from "react";
import { SignInButton as ClerkSignInButton, useClerk } from "@clerk/clerk-react";

const CLERK_AVAILABLE = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

// Stub for when Clerk is not configured
const CLERK_STUB = {
  signOut: async () => {},
  openSignIn: () => {},
  openUserProfile: () => {},
};

/**
 * Inner component that calls useClerk() — only rendered when ClerkProvider exists.
 * Uses a render-prop pattern to pass the clerk instance to the parent.
 */
function ClerkBridge({ children }: { children: (clerk: ReturnType<typeof useClerk>) => React.ReactNode }) {
  const clerk = useClerk();
  return <>{children(clerk)}</>;
}

/**
 * Safe useClerk replacement — returns a stub when Clerk isn't configured.
 * IMPORTANT: This cannot be a hook (hooks can't be conditional).
 * Instead, use `<SafeClerk>` render-prop component or check CLERK_AVAILABLE
 * and call useClerk() directly when true.
 */
export function useClerkSafe() {
  if (!CLERK_AVAILABLE) return CLERK_STUB;
  // When Clerk IS available, this is safe because ClerkProvider wraps the app
  return useClerk();
}

/**
 * Safe SignInButton — renders nothing when Clerk isn't configured.
 */
export function SafeSignInButton({
  mode,
  children,
}: {
  mode?: "modal" | "redirect";
  children: React.ReactNode;
}) {
  if (!CLERK_AVAILABLE) return null;
  return <ClerkSignInButton mode={mode}>{children}</ClerkSignInButton>;
}

export { CLERK_AVAILABLE };
