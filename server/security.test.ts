/**
 * Security Hardening Tests
 * 
 * Tests for: scoped auth, rate limiting, input validation, audit logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Request, Response, NextFunction } from "express";

// ── Scoped Auth Tests ────────────────────────────────────────────────────────

describe("Scoped Auth Middleware", () => {
  let scopedAuthMiddleware: any;
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(async () => {
    vi.resetModules();
    
    // Mock ENV
    vi.doMock("./_core/env", () => ({
      ENV: {
        maamitechApiEnabled: true,
        maamitechServiceToken: "test_legacy_token_12345",
      },
    }));

    // Mock MAAMITECH_TOKEN_REGISTRY env
    process.env.MAAMITECH_TOKEN_REGISTRY = JSON.stringify([
      {
        token: "mmt_testagent_abcdef1234567890",
        agentId: "test_agent",
        scopes: ["orders:read", "health:read"],
        description: "Test agent",
        createdAt: "2026-01-01T00:00:00Z",
        active: true,
      },
      {
        token: "mmt_expired_abcdef1234567890",
        agentId: "expired_agent",
        scopes: ["admin:*"],
        description: "Expired agent",
        createdAt: "2025-01-01T00:00:00Z",
        expiresAt: "2025-12-31T00:00:00Z",
        active: true,
      },
      {
        token: "mmt_inactive_abcdef1234567890",
        agentId: "inactive_agent",
        scopes: ["admin:*"],
        description: "Inactive agent",
        createdAt: "2026-01-01T00:00:00Z",
        active: false,
      },
    ]);

    const mod = await import("./scopedAuth");
    scopedAuthMiddleware = mod.scopedAuthMiddleware;
    mod.invalidateTokenRegistry();

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  afterEach(() => {
    delete process.env.MAAMITECH_TOKEN_REGISTRY;
    vi.restoreAllMocks();
  });

  it("rejects requests when API is disabled", async () => {
    vi.resetModules();
    vi.doMock("./_core/env", () => ({
      ENV: { maamitechApiEnabled: false, maamitechServiceToken: null },
    }));
    const mod = await import("./scopedAuth");
    mod.invalidateTokenRegistry();

    mockReq = { path: "/api/service/health", method: "GET", headers: {}, ip: "127.0.0.1" };
    mod.scopedAuthMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "service_unavailable" })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("rejects requests without Authorization header", () => {
    mockReq = { path: "/api/service/health", method: "GET", headers: {}, ip: "127.0.0.1" };
    scopedAuthMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "unauthorized" })
    );
  });

  it("rejects invalid tokens", () => {
    mockReq = {
      path: "/api/service/health",
      method: "GET",
      headers: { authorization: "Bearer invalid_token_xyz" },
      ip: "127.0.0.1",
    };
    scopedAuthMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "forbidden" })
    );
  });

  it("rejects expired tokens", () => {
    mockReq = {
      path: "/api/service/health",
      method: "GET",
      headers: { authorization: "Bearer mmt_expired_abcdef1234567890" },
      ip: "127.0.0.1",
    };
    scopedAuthMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "token_expired" })
    );
  });

  it("rejects inactive tokens", () => {
    mockReq = {
      path: "/api/service/health",
      method: "GET",
      headers: { authorization: "Bearer mmt_inactive_abcdef1234567890" },
      ip: "127.0.0.1",
    };
    scopedAuthMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "forbidden" })
    );
  });

  it("rejects tokens with insufficient scope", () => {
    mockReq = {
      path: "/api/service/employees",
      method: "GET",
      headers: { authorization: "Bearer mmt_testagent_abcdef1234567890" },
      ip: "127.0.0.1",
    };
    scopedAuthMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "insufficient_scope" })
    );
  });

  it("allows valid token with correct scope", () => {
    mockReq = {
      path: "/api/service/orders",
      method: "GET",
      headers: { authorization: "Bearer mmt_testagent_abcdef1234567890" },
      ip: "127.0.0.1",
    };
    scopedAuthMiddleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.serviceAgent).toBeDefined();
    expect(mockReq.serviceAgent.agentId).toBe("test_agent");
  });

  it("allows legacy token with admin:* scope", async () => {
    vi.resetModules();
    delete process.env.MAAMITECH_TOKEN_REGISTRY;
    vi.doMock("./_core/env", () => ({
      ENV: { maamitechApiEnabled: true, maamitechServiceToken: "legacy_token_123" },
    }));
    const mod = await import("./scopedAuth");
    mod.invalidateTokenRegistry();

    mockReq = {
      path: "/api/service/employees",
      method: "GET",
      headers: { authorization: "Bearer legacy_token_123" },
      ip: "127.0.0.1",
    };
    mod.scopedAuthMiddleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.serviceAgent.agentId).toBe("legacy_single_token");
  });
});

// ── Rate Limiter Tests ───────────────────────────────────────────────────────

describe("Rate Limiter Middleware", () => {
  let rateLimitMiddleware: any;
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("./rateLimiter");
    rateLimitMiddleware = mod.rateLimitMiddleware;

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      set: vi.fn(),
    };
    mockNext = vi.fn();
  });

  it("allows requests under the limit", () => {
    mockReq = {
      serviceAgent: { agentId: "rate_test_agent_1", scopes: [], token: "***" },
      ip: "127.0.0.1",
    };

    rateLimitMiddleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.set).toHaveBeenCalledWith("X-RateLimit-Remaining", "99");
  });

  it("sets rate limit headers on every request", () => {
    mockReq = {
      serviceAgent: { agentId: "rate_test_agent_2", scopes: [], token: "***" },
      ip: "127.0.0.1",
    };

    rateLimitMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.set).toHaveBeenCalledWith("X-RateLimit-Limit", "100");
    expect(mockRes.set).toHaveBeenCalledWith("X-RateLimit-Remaining", expect.any(String));
    expect(mockRes.set).toHaveBeenCalledWith("X-RateLimit-Reset", expect.any(String));
  });

  it("rejects requests over the limit with 429", () => {
    mockReq = {
      serviceAgent: { agentId: "rate_test_agent_3", scopes: [], token: "***" },
      ip: "127.0.0.1",
    };

    // Send 100 requests (all should pass)
    for (let i = 0; i < 100; i++) {
      mockNext = vi.fn();
      mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), set: vi.fn() };
      rateLimitMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    }

    // 101st should be rejected
    mockNext = vi.fn();
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), set: vi.fn() };
    rateLimitMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "rate_limit_exceeded" })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("tracks rate limits per agent independently", () => {
    // Agent A sends 50 requests
    for (let i = 0; i < 50; i++) {
      mockReq = { serviceAgent: { agentId: "agent_a_rate", scopes: [], token: "***" }, ip: "1.1.1.1" };
      mockNext = vi.fn();
      mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), set: vi.fn() };
      rateLimitMiddleware(mockReq, mockRes, mockNext);
    }

    // Agent B should still have full quota
    mockReq = { serviceAgent: { agentId: "agent_b_rate", scopes: [], token: "***" }, ip: "2.2.2.2" };
    mockNext = vi.fn();
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), set: vi.fn() };
    rateLimitMiddleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.set).toHaveBeenCalledWith("X-RateLimit-Remaining", "99");
  });
});

// ── Input Validation Tests ───────────────────────────────────────────────────

describe("Input Validation", () => {
  let validateOrdersQuery: any;
  let validateMenuToggleBody: any;
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(async () => {
    const mod = await import("./inputValidation");
    validateOrdersQuery = mod.validateOrdersQuery;
    validateMenuToggleBody = mod.validateMenuToggleBody;

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it("passes valid orders query parameters", () => {
    mockReq = {
      query: { from: "2026-04-01", to: "2026-04-30", limit: "50" },
      path: "/api/service/orders",
    };
    validateOrdersQuery(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("rejects invalid date format in orders query", () => {
    mockReq = {
      query: { from: "not-a-date" },
      path: "/api/service/orders",
    };
    validateOrdersQuery(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "validation_error" })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("rejects unknown query parameters (strict mode)", () => {
    mockReq = {
      query: { from: "2026-04-01", malicious_param: "drop table" },
      path: "/api/service/orders",
    };
    validateOrdersQuery(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("rejects limit over 500 for orders", () => {
    mockReq = {
      query: { limit: "1000" },
      path: "/api/service/orders",
    };
    validateOrdersQuery(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("passes valid menu toggle body", () => {
    mockReq = {
      body: { productId: 123, available: true },
      path: "/api/service/menu/toggle-availability",
    };
    validateMenuToggleBody(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("rejects menu toggle with missing productId", () => {
    mockReq = {
      body: { available: true },
      path: "/api/service/menu/toggle-availability",
    };
    validateMenuToggleBody(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("rejects menu toggle with non-boolean available", () => {
    mockReq = {
      body: { productId: 123, available: "yes" },
      path: "/api/service/menu/toggle-availability",
    };
    validateMenuToggleBody(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

// ── Token Generation Tests ───────────────────────────────────────────────────

describe("Token Generation", () => {
  it("generates tokens with correct format", async () => {
    const { generateScopedToken } = await import("./scopedAuth");
    const result = generateScopedToken("new_client", ["orders:read", "menu:read"], "Test client");

    expect(result.token).toMatch(/^mmt_new_client_[a-f0-9]{32}$/);
    expect(result.entry.agentId).toBe("new_client");
    expect(result.entry.scopes).toEqual(["orders:read", "menu:read"]);
    expect(result.entry.active).toBe(true);
  });

  it("generates tokens with expiry when specified", async () => {
    const { generateScopedToken } = await import("./scopedAuth");
    const result = generateScopedToken("temp_client", ["health:read"], "Temp", 30);

    expect(result.entry.expiresAt).toBeDefined();
    const expiry = new Date(result.entry.expiresAt!);
    const now = new Date();
    const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);
  });
});
