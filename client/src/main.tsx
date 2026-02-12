import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

/**
 * Show a branded transition overlay before redirecting to OAuth.
 * Used for automatic unauthorized redirects from tRPC errors.
 */
function showLoginTransitionAndRedirect() {
  // Prevent duplicate overlays
  if (document.getElementById('login-transition-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'login-transition-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background-color: rgb(210, 180, 140);
    opacity: 0; transition: opacity 0.3s ease;
  `;
  overlay.innerHTML = `
    <img src="https://files.manuscdn.com/user_upload_by_module/session_file/114675165/PNSTmVAGBQQgOlVy.png" alt="Taiwan Maami" style="height: 8rem; width: auto; margin-bottom: 1.5rem;" />
    <div style="width: 2rem; height: 2rem; border: 3px solid #bd302c; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
    <p style="font-size: 1rem; font-weight: 500; color: #3d2c24; letter-spacing: 0.025em;">Redirecting to secure login\u2026</p>
    <p style="font-size: 0.875rem; color: #7a6a5f; margin-top: 0.25rem;">You\u2019ll be right back</p>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  setTimeout(() => {
    window.location.href = getLoginUrl();
  }, 1400);
}

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  showLoginTransitionAndRedirect();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

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

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
