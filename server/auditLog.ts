/**
 * Audit Logging for Write Operations
 * 
 * Logs all write operations (POST, PUT, PATCH, DELETE) on /api/service/* endpoints.
 * Records: token/agent, timestamp, IP, endpoint, request body, response status, before/after state.
 * 
 * Writes to Supabase `audit_log` table for persistence and queryability.
 * Falls back to console logging if Supabase is unavailable.
 */

import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./scopedAuth";
import { ENV } from "./_core/env";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuditEntry {
  timestamp: string;
  agentId: string;
  tokenMasked: string;
  ip: string;
  method: string;
  path: string;
  requestBody: any;
  responseStatus: number;
  responseBody: any;
  beforeState: any;
  afterState: any;
  durationMs: number;
}

// ── Supabase Writer ──────────────────────────────────────────────────────────

async function writeToSupabase(entry: AuditEntry): Promise<boolean> {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    return false;
  }

  try {
    const response = await fetch(`${ENV.supabaseUrl}/rest/v1/audit_log`, {
      method: "POST",
      headers: {
        "apikey": ENV.supabaseServiceRoleKey,
        "Authorization": `Bearer ${ENV.supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        timestamp: entry.timestamp,
        agent_id: entry.agentId,
        token_masked: entry.tokenMasked,
        ip_address: entry.ip,
        method: entry.method,
        path: entry.path,
        request_body: entry.requestBody,
        response_status: entry.responseStatus,
        response_body: entry.responseBody,
        before_state: entry.beforeState,
        after_state: entry.afterState,
        duration_ms: entry.durationMs,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AuditLog] Supabase write failed: ${response.status} ${errText}`);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error(`[AuditLog] Supabase write error: ${err.message}`);
    return false;
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * Audit logging middleware for write operations.
 * Intercepts the response to capture the response body and status.
 * 
 * Must be placed AFTER scopedAuthMiddleware (needs req.serviceAgent).
 * Only logs POST, PUT, PATCH, DELETE methods.
 */
export function auditLogMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Only audit write operations
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  const startTime = Date.now();
  const originalJson = res.json.bind(res);

  // Intercept res.json to capture response body
  res.json = function (body: any) {
    const durationMs = Date.now() - startTime;

    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      agentId: req.serviceAgent?.agentId || "unknown",
      tokenMasked: req.serviceAgent?.token || "***",
      ip: req.ip || req.socket.remoteAddress || "unknown",
      method: req.method,
      path: req.path,
      requestBody: sanitizeBody(req.body),
      responseStatus: res.statusCode,
      responseBody: sanitizeBody(body),
      beforeState: (body as any)?.data?.previousAvailability !== undefined
        ? { available: (body as any).data.previousAvailability }
        : null,
      afterState: (body as any)?.data?.currentAvailability !== undefined
        ? { available: (body as any).data.currentAvailability }
        : null,
      durationMs,
    };

    // Write async — don't block response
    writeToSupabase(entry).then(success => {
      if (!success) {
        // Fallback: log to console
        console.log(`[AuditLog] ${JSON.stringify(entry)}`);
      }
    });

    return originalJson(body);
  } as any;

  next();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sanitize request/response bodies for audit logging.
 * Removes sensitive fields and truncates large payloads.
 */
function sanitizeBody(body: any): any {
  if (!body) return null;

  // Truncate large arrays
  if (Array.isArray(body)) {
    if (body.length > 10) {
      return { _truncated: true, count: body.length, sample: body.slice(0, 3) };
    }
    return body;
  }

  // Clone and remove sensitive fields
  const sanitized = { ...body };
  const sensitiveKeys = ["password", "token", "secret", "apiKey", "authorization"];
  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = "[REDACTED]";
    }
  }

  // Truncate large string fields
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === "string" && value.length > 1000) {
      sanitized[key] = value.slice(0, 1000) + "...[truncated]";
    }
  }

  return sanitized;
}
