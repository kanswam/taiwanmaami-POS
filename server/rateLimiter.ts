/**
 * Rate Limiter for /api/service/* endpoints
 * 
 * Implements a sliding window rate limiter with per-token tracking.
 * Limit: 100 requests per minute per token.
 * 
 * Uses in-memory store (suitable for single-instance deployment).
 * For multi-instance, replace with Redis-backed store.
 */

import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./scopedAuth";

// ── Configuration ────────────────────────────────────────────────────────────

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;    // per token per window

// ── In-Memory Store ──────────────────────────────────────────────────────────

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const cutoff = now - WINDOW_MS * 2;
  const keys = Array.from(store.keys());
  for (const key of keys) {
    const entry = store.get(key)!;
    // Remove entries with no recent activity
    if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < cutoff) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * Rate limiting middleware. Must be placed AFTER scopedAuthMiddleware
 * so that req.serviceAgent is populated.
 * 
 * Falls back to IP-based limiting if no agent is identified.
 */
export function rateLimitMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Identify the client: prefer agentId, fallback to IP
  const clientId = req.serviceAgent?.agentId || req.ip || "unknown";
  const key = `ratelimit:${clientId}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Get or create entry
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

  // Check limit
  if (entry.timestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + WINDOW_MS - now;
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);

    console.log(`[RateLimit] Exceeded | agent=${clientId} | count=${entry.timestamps.length} | retryAfter=${retryAfterSec}s`);

    res.set("Retry-After", String(retryAfterSec));
    res.set("X-RateLimit-Limit", String(MAX_REQUESTS));
    res.set("X-RateLimit-Remaining", "0");
    res.set("X-RateLimit-Reset", String(Math.ceil((oldestInWindow + WINDOW_MS) / 1000)));

    return res.status(429).json({
      error: "rate_limit_exceeded",
      message: `Rate limit exceeded. Maximum ${MAX_REQUESTS} requests per minute per token.`,
      retryAfterSeconds: retryAfterSec,
      limit: MAX_REQUESTS,
      windowMs: WINDOW_MS,
    });
  }

  // Record this request
  entry.timestamps.push(now);

  // Set rate limit headers
  const remaining = MAX_REQUESTS - entry.timestamps.length;
  res.set("X-RateLimit-Limit", String(MAX_REQUESTS));
  res.set("X-RateLimit-Remaining", String(remaining));
  res.set("X-RateLimit-Reset", String(Math.ceil((now + WINDOW_MS) / 1000)));

  next();
}
