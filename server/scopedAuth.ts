/**
 * Scoped Token Authentication System
 * 
 * Replaces the single MAAMITECH_SERVICE_TOKEN with per-agent/system tokens.
 * Each token has explicit scope definitions controlling which endpoints it can access.
 * 
 * Token format: mmt_{agent}_{random} (e.g., mmt_aiagent_a1b2c3d4e5f6)
 * 
 * Token registry is stored as a JSON env var: MAAMITECH_TOKEN_REGISTRY
 * Format: JSON array of { token, agentId, scopes[], description, createdAt }
 * 
 * Scopes:
 *   - orders:read        → GET /api/service/orders
 *   - employees:read     → GET /api/service/employees
 *   - employees:proxy    → ALL /api/service/employee-master/*
 *   - menu:read          → GET /api/service/menu/products
 *   - menu:write         → POST /api/service/menu/toggle-availability
 *   - etl:run            → POST /api/service/etl/run
 *   - etl:read           → GET /api/service/etl/status
 *   - health:read        → GET /api/service/health
 *   - admin:*            → All endpoints (superuser)
 */

import { Request, Response, NextFunction } from "express";
import { ENV } from "./_core/env";
import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TokenEntry {
  token: string;
  agentId: string;
  scopes: string[];
  description: string;
  createdAt: string;
  expiresAt?: string;  // ISO 8601, optional
  active: boolean;
}

export interface AuthenticatedRequest extends Request {
  serviceAgent?: {
    agentId: string;
    scopes: string[];
    token: string;  // masked for logging
  };
}

// ── Scope Definitions ────────────────────────────────────────────────────────

export const ENDPOINT_SCOPE_MAP: Record<string, { method: string; scope: string }[]> = {
  "/api/service/health": [{ method: "GET", scope: "health:read" }],
  "/api/service/orders": [{ method: "GET", scope: "orders:read" }],
  "/api/service/employees": [{ method: "GET", scope: "employees:read" }],
  "/api/service/menu/products": [{ method: "GET", scope: "menu:read" }],
  "/api/service/menu/toggle-availability": [{ method: "POST", scope: "menu:write" }],
  "/api/service/etl/run": [{ method: "POST", scope: "etl:run" }],
  "/api/service/etl/status": [{ method: "GET", scope: "etl:read" }],
};

// Employee master proxy: any method under this prefix
const EMPLOYEE_MASTER_PREFIX = "/api/service/employee-master";

// ── Token Registry ───────────────────────────────────────────────────────────

let tokenRegistry: TokenEntry[] | null = null;

function getTokenRegistry(): TokenEntry[] {
  if (tokenRegistry !== null) return tokenRegistry;

  const registryJson = ENV.maamitechTokenRegistry || process.env.MAAMITECH_TOKEN_REGISTRY;
  if (!registryJson) {
    // Fallback: if no registry is configured, use the legacy single token
    // with admin:* scope for backward compatibility
    if (ENV.maamitechServiceToken) {
      tokenRegistry = [{
        token: ENV.maamitechServiceToken,
        agentId: "legacy_single_token",
        scopes: ["admin:*"],
        description: "Legacy single service token (backward compat)",
        createdAt: "2026-01-01T00:00:00Z",
        active: true,
      }];
    } else {
      tokenRegistry = [];
    }
    return tokenRegistry;
  }

  try {
    tokenRegistry = JSON.parse(registryJson);
    // Also include legacy token with admin:* scope for backward compatibility
    const legacyToken = ENV.maamitechServiceToken;
    if (legacyToken && !tokenRegistry!.some(t => t.token === legacyToken)) {
      tokenRegistry!.push({
        token: legacyToken,
        agentId: "legacy_single_token",
        scopes: ["admin:*"],
        description: "Legacy single service token (backward compat)",
        createdAt: "2026-01-01T00:00:00Z",
        active: true,
      });
    }
    return tokenRegistry!;
  } catch (e) {
    console.error("[ScopedAuth] CRITICAL: Failed to parse MAAMITECH_TOKEN_REGISTRY JSON");
    tokenRegistry = [];
    return tokenRegistry;
  }
}

// Force re-read of registry (useful for hot-reload in dev)
export function invalidateTokenRegistry() {
  tokenRegistry = null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    const dummy = Buffer.alloc(a.length, 0);
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

function maskToken(token: string): string {
  if (token.length <= 8) return "***";
  return token.slice(0, 4) + "..." + token.slice(-4);
}

function getRequiredScope(path: string, method: string): string | null {
  // Check exact match first
  const endpointScopes = ENDPOINT_SCOPE_MAP[path];
  if (endpointScopes) {
    const match = endpointScopes.find(s => s.method === method || s.method === "ALL");
    return match?.scope ?? null;
  }

  // Check employee master proxy prefix
  if (path.startsWith(EMPLOYEE_MASTER_PREFIX)) {
    return "employees:proxy";
  }

  // Unknown endpoint — require admin:*
  return "admin:*";
}

function hasScope(agentScopes: string[], requiredScope: string): boolean {
  // admin:* grants access to everything
  if (agentScopes.includes("admin:*")) return true;
  // Exact match
  if (agentScopes.includes(requiredScope)) return true;
  // Wildcard within namespace: "menu:*" matches "menu:read" and "menu:write"
  const [namespace] = requiredScope.split(":");
  if (agentScopes.includes(`${namespace}:*`)) return true;
  return false;
}

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * Scoped authentication middleware for /api/service/* routes.
 * 
 * 1. Checks MAAMITECH_API_ENABLED feature flag
 * 2. Validates Bearer token against token registry
 * 3. Checks token has required scope for the requested endpoint
 * 4. Attaches agent identity to request for audit logging
 */
export function scopedAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check feature flag
  if (!ENV.maamitechApiEnabled) {
    console.log(`[ScopedAuth] Rejected: API disabled | path=${req.path} | ip=${req.ip}`);
    return res.status(503).json({
      error: "service_unavailable",
      message: "MaamiTech API is not enabled on this instance.",
    });
  }

  // Extract bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log(`[ScopedAuth] Rejected: Missing auth header | path=${req.path} | ip=${req.ip}`);
    return res.status(401).json({
      error: "unauthorized",
      message: "Missing or invalid Authorization header. Expected: Bearer <token>",
    });
  }

  const token = authHeader.slice(7);
  const registry = getTokenRegistry();

  // Find matching token
  let matchedEntry: TokenEntry | null = null;
  for (const entry of registry) {
    if (!entry.active) continue;
    if (secureCompare(token, entry.token)) {
      matchedEntry = entry;
      break;
    }
  }

  if (!matchedEntry) {
    console.log(`[ScopedAuth] Rejected: Invalid token | path=${req.path} | ip=${req.ip} | token=${maskToken(token)}`);
    return res.status(403).json({
      error: "forbidden",
      message: "Invalid service token.",
    });
  }

  // Check expiry
  if (matchedEntry.expiresAt) {
    const expiry = new Date(matchedEntry.expiresAt);
    if (expiry < new Date()) {
      console.log(`[ScopedAuth] Rejected: Token expired | agent=${matchedEntry.agentId} | expired=${matchedEntry.expiresAt}`);
      return res.status(403).json({
        error: "token_expired",
        message: "Service token has expired. Contact administrator for renewal.",
      });
    }
  }

  // Check scope — use originalUrl (not req.path which is relative when mounted via app.use)
  // Strip query string from originalUrl to get the clean path
  const fullPath = (req.originalUrl || req.path).split('?')[0];
  const requiredScope = getRequiredScope(fullPath, req.method);
  if (requiredScope && !hasScope(matchedEntry.scopes, requiredScope)) {
    console.log(`[ScopedAuth] Rejected: Insufficient scope | agent=${matchedEntry.agentId} | required=${requiredScope} | has=${matchedEntry.scopes.join(",")} | path=${fullPath}`);
    return res.status(403).json({
      error: "insufficient_scope",
      message: `Token does not have required scope: ${requiredScope}`,
      requiredScope,
      agentId: matchedEntry.agentId,
    });
  }

  // Attach agent identity to request
  req.serviceAgent = {
    agentId: matchedEntry.agentId,
    scopes: matchedEntry.scopes,
    token: maskToken(token),
  };

  console.log(`[ScopedAuth] Authenticated | agent=${matchedEntry.agentId} | path=${fullPath} | method=${req.method} | scope=${requiredScope}`);
  next();
}

// ── Token Generation Utility ─────────────────────────────────────────────────

/**
 * Generate a new scoped token. Used by admin to create tokens for new agents.
 * Returns the full token (only shown once) and the registry entry.
 */
export function generateScopedToken(agentId: string, scopes: string[], description: string, expiresInDays?: number): { token: string; entry: TokenEntry } {
  const randomPart = crypto.randomBytes(16).toString("hex");
  const token = `mmt_${agentId}_${randomPart}`;

  const entry: TokenEntry = {
    token,
    agentId,
    scopes,
    description,
    createdAt: new Date().toISOString(),
    active: true,
  };

  if (expiresInDays) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + expiresInDays);
    entry.expiresAt = expiry.toISOString();
  }

  return { token, entry };
}
