import { ClerkProvider } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { OfflineProvider } from "./contexts/OfflineContext";
import "./index.css";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const queryClient = new QueryClient();

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

/**
 * Conditionally wrap with ClerkProvider only when the publishable key is set.
 * This allows the app to render in environments where Clerk isn't configured
 * (e.g., Manus sandbox) — auth features are simply disabled.
 */
function AuthWrapper({ children }: { children: React.ReactNode }) {
  if (CLERK_PUBLISHABLE_KEY) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        {children}
      </ClerkProvider>
    );
  }
  // No Clerk key — render without auth provider
  return <>{children}</>;
}

createRoot(document.getElementById("root")!).render(
  <AuthWrapper>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <OfflineProvider>
            <App />
          </OfflineProvider>
        </HelmetProvider>
      </QueryClientProvider>
    </trpc.Provider>
  </AuthWrapper>
);
