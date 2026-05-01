/**
 * MaamiTech Service-to-Service Authentication Middleware
 * 
 * This module provides a static API key middleware for machine-to-machine
 * communication. It is gated behind the MAAMITECH_API_ENABLED feature flag
 * and validates requests using the MAAMITECH_SERVICE_TOKEN bearer token.
 * 
 * Usage:
 *   All /api/service/* routes pass through this middleware.
 *   Requests must include: Authorization: Bearer <MAAMITECH_SERVICE_TOKEN>
 * 
 * Security:
 *   - Feature flag must be enabled (MAAMITECH_API_ENABLED=true)
 *   - Token must match exactly (constant-time comparison)
 *   - All requests are logged with timestamp and path
 */

import { Request, Response, NextFunction } from "express";
import { ENV } from "./_core/env";
import crypto from "crypto";

// Constant-time string comparison to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to maintain constant time behavior
    const dummy = Buffer.alloc(a.length, 0);
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

/**
 * Express middleware that validates the MaamiTech service token.
 * 
 * Checks:
 * 1. Feature flag is enabled
 * 2. Authorization header is present with Bearer scheme
 * 3. Token matches MAAMITECH_SERVICE_TOKEN (constant-time comparison)
 */
export function serviceAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check feature flag first
  if (!ENV.maamitechApiEnabled) {
    console.log(`[ServiceAuth] Rejected: API disabled | path=${req.path} | ip=${req.ip}`);
    return res.status(503).json({
      error: "service_unavailable",
      message: "MaamiTech API is not enabled on this instance.",
    });
  }

  // Check token is configured
  if (!ENV.maamitechServiceToken) {
    console.error(`[ServiceAuth] CRITICAL: MAAMITECH_SERVICE_TOKEN not configured`);
    return res.status(503).json({
      error: "service_misconfigured",
      message: "Service token not configured. Contact administrator.",
    });
  }

  // Extract bearer token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log(`[ServiceAuth] Rejected: Missing/invalid auth header | path=${req.path} | ip=${req.ip}`);
    return res.status(401).json({
      error: "unauthorized",
      message: "Missing or invalid Authorization header. Expected: Bearer <token>",
    });
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  // Constant-time token comparison
  if (!secureCompare(token, ENV.maamitechServiceToken)) {
    console.log(`[ServiceAuth] Rejected: Invalid token | path=${req.path} | ip=${req.ip}`);
    return res.status(403).json({
      error: "forbidden",
      message: "Invalid service token.",
    });
  }

  // Token valid — log and proceed
  console.log(`[ServiceAuth] Authenticated | path=${req.path} | method=${req.method} | ip=${req.ip}`);
  next();
}

/**
 * Health check handler for /api/service/health
 * Returns system status without exposing sensitive data.
 */
export async function handleServiceHealth(req: Request, res: Response) {
  const { getDb } = await import("./db");
  
  let dbStatus = "unknown";
  try {
    const dbInstance = await getDb();
    if (dbInstance) {
      dbStatus = "connected";
    } else {
      dbStatus = "unavailable";
    }
  } catch {
    dbStatus = "error";
  }

  return res.json({
    status: "ok",
    service: "taiwan-maami-pos",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    checks: {
      database: dbStatus,
      featureFlag: "enabled",
    },
  });
}

/**
 * Employee Master proxy handler.
 * Forwards authenticated requests to the Employee Master API.
 * 
 * The Employee Master API uses /api/v1/ prefix and X-API-Key header.
 * 
 * Supported sub-paths (mapped from /api/service/employee-master/*):
 *   GET /employees — List all active employees
 *   GET /employees/:id — Get specific employee by ID
 *   GET /employees/by-mobile/:mobile — Look up employee by phone
 */
export async function handleEmployeeMasterProxy(req: Request, res: Response) {
  if (!ENV.empMasterApiUrl || !ENV.empMasterApiKey) {
    return res.status(503).json({
      error: "service_misconfigured",
      message: "Employee Master API credentials not configured.",
    });
  }

  // Build the target URL: strip /api/service/employee-master prefix, prepend /api/v1
  const subPath = req.path.replace(/^\/api\/service\/employee-master/, "") || "/";
  const targetUrl = `${ENV.empMasterApiUrl}/api/v1${subPath}`;

  // Forward query parameters
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
  const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

  console.log(`[ServiceAuth:EmpMaster] Proxying ${req.method} ${fullUrl}`);

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": ENV.empMasterApiKey,
      },
    };

    // Forward body for POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(fullUrl, fetchOptions);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error(`[ServiceAuth:EmpMaster] Proxy error:`, error.message);
    return res.status(502).json({
      error: "proxy_error",
      message: "Failed to reach Employee Master API.",
      detail: error.message,
    });
  }
}
