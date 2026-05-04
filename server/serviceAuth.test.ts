/**
 * MaamiTech Service Auth Tests
 * 
 * Tests the scoped auth middleware in isolation using supertest.
 * No running dev server required — works in CI.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

describe("MaamiTech Service Auth (Task 1)", () => {
  let app: express.Express;
  const TEST_TOKEN = "test-service-token-for-auth-tests";

  beforeEach(async () => {
    vi.resetModules();

    // Mock ENV with API enabled and a known token
    vi.doMock("./_core/env", () => ({
      ENV: {
        maamitechApiEnabled: true,
        maamitechServiceToken: TEST_TOKEN,
        empMasterApiUrl: "https://employees.thamaraifoods.com",
        empMasterApiKey: "test-emp-key",
      },
    }));

    // Mock the token registry (scoped auth uses this)
    process.env.MAAMITECH_TOKEN_REGISTRY = JSON.stringify([
      {
        token: TEST_TOKEN,
        agentId: "legacy_single_token",
        scopes: ["admin:*"],
        description: "Legacy single token",
        createdAt: "2026-01-01T00:00:00Z",
        active: true,
      },
    ]);
    process.env.MAAMITECH_SERVICE_TOKEN = TEST_TOKEN;

    // Import fresh modules after mocking
    const { scopedAuthMiddleware, invalidateTokenRegistry } = await import("./scopedAuth");
    const { handleServiceHealth } = await import("./serviceAuth");
    invalidateTokenRegistry();

    // Build minimal Express app with just the service routes
    app = express();
    app.use(express.json());
    app.use("/api/service", scopedAuthMiddleware as any);
    app.get("/api/service/health", handleServiceHealth as any);
  });

  afterEach(() => {
    delete process.env.MAAMITECH_TOKEN_REGISTRY;
    delete process.env.MAAMITECH_SERVICE_TOKEN;
    vi.restoreAllMocks();
  });

  describe("Feature Flag Gate", () => {
    it("should return 503 when MAAMITECH_API_ENABLED is false", async () => {
      vi.resetModules();
      vi.doMock("./_core/env", () => ({
        ENV: {
          maamitechApiEnabled: false,
          maamitechServiceToken: null,
        },
      }));
      process.env.MAAMITECH_TOKEN_REGISTRY = "";

      const { scopedAuthMiddleware, invalidateTokenRegistry } = await import("./scopedAuth");
      invalidateTokenRegistry();

      const disabledApp = express();
      disabledApp.use(express.json());
      disabledApp.use("/api/service", scopedAuthMiddleware as any);
      disabledApp.get("/api/service/health", (_req, res) => res.json({ status: "ok" }));

      const response = await request(disabledApp)
        .get("/api/service/health")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      expect(response.status).toBe(503);
      expect(response.body.error).toBe("service_unavailable");
    });
  });

  describe("Authentication Validation", () => {
    it("should reject requests without Authorization header", async () => {
      const response = await request(app).get("/api/service/health");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("unauthorized");
      expect(response.body.message).toContain("Authorization");
    });

    it("should reject requests with wrong auth scheme (Basic instead of Bearer)", async () => {
      const response = await request(app)
        .get("/api/service/health")
        .set("Authorization", `Basic ${Buffer.from("user:pass").toString("base64")}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("unauthorized");
    });

    it("should reject requests with invalid token", async () => {
      const response = await request(app)
        .get("/api/service/health")
        .set("Authorization", "Bearer invalid-token-12345");

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("forbidden");
    });

    it("should reject requests with empty Bearer token", async () => {
      const response = await request(app)
        .get("/api/service/health")
        .set("Authorization", "Bearer ");

      // Empty token should be rejected as unauthorized or forbidden
      expect([401, 403]).toContain(response.status);
    });
  });

  describe("Health Endpoint", () => {
    it("should return health status with valid token when enabled", async () => {
      // Mock getDb to avoid real database connection
      vi.resetModules();
      vi.doMock("./db", () => ({
        getDb: vi.fn().mockResolvedValue({}),
      }));
      vi.doMock("./_core/env", () => ({
        ENV: {
          maamitechApiEnabled: true,
          maamitechServiceToken: TEST_TOKEN,
        },
      }));
      process.env.MAAMITECH_TOKEN_REGISTRY = JSON.stringify([
        {
          token: TEST_TOKEN,
          agentId: "legacy_single_token",
          scopes: ["admin:*"],
          description: "Legacy",
          createdAt: "2026-01-01T00:00:00Z",
          active: true,
        },
      ]);

      const { scopedAuthMiddleware, invalidateTokenRegistry } = await import("./scopedAuth");
      const { handleServiceHealth } = await import("./serviceAuth");
      invalidateTokenRegistry();

      const healthApp = express();
      healthApp.use(express.json());
      healthApp.use("/api/service", scopedAuthMiddleware as any);
      healthApp.get("/api/service/health", handleServiceHealth as any);

      const response = await request(healthApp)
        .get("/api/service/health")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.service).toBe("taiwan-maami-pos");
      expect(response.body.version).toBe("1.0.0");
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.checks).toBeDefined();
      expect(response.body.checks.featureFlag).toBe("enabled");
    });
  });

  describe("Middleware Security Properties", () => {
    it("should not expose internal error details in rejection responses", async () => {
      const response = await request(app)
        .get("/api/service/health")
        .set("Authorization", "Bearer wrong-token");

      const responseText = JSON.stringify(response.body);
      // Should never expose the actual token or internal paths
      expect(responseText).not.toContain(TEST_TOKEN);
      expect(responseText).not.toContain("MAAMITECH_SERVICE_TOKEN");
      expect(responseText).not.toContain("process.env");
    });

    it("should handle malformed Authorization headers gracefully", async () => {
      const response = await request(app)
        .get("/api/service/health")
        .set("Authorization", "NotAValidScheme");

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });
});
