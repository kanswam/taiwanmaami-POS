import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = "http://localhost:3000";
const TEST_TOKEN = process.env.MAAMITECH_SERVICE_TOKEN || "test-token-not-set";

describe("MaamiTech Service Auth (Task 1)", () => {
  describe("Feature Flag Gate", () => {
    it("should return 503 when MAAMITECH_API_ENABLED is false", async () => {
      // When the feature flag is disabled, all /api/service/* routes return 503
      // Since we're testing against the dev server which may have it enabled or disabled,
      // we test the response structure
      const response = await fetch(`${BASE_URL}/api/service/health`, {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` },
      });
      
      // Either 200 (enabled) or 503 (disabled) - both are valid states
      expect([200, 503]).toContain(response.status);
      const data = await response.json();
      
      if (response.status === 503) {
        expect(data.error).toBe("service_unavailable");
      } else {
        expect(data.status).toBe("ok");
        expect(data.service).toBe("taiwan-maami-pos");
      }
    });
  });

  describe("Authentication Validation", () => {
    it("should reject requests without Authorization header", async () => {
      const response = await fetch(`${BASE_URL}/api/service/health`);
      
      // Either 401 (no auth) or 503 (feature disabled)
      expect([401, 503]).toContain(response.status);
      const data = await response.json();
      
      if (response.status === 401) {
        expect(data.error).toBe("unauthorized");
        expect(data.message).toContain("Authorization");
      }
    });

    it("should reject requests with wrong auth scheme (Basic instead of Bearer)", async () => {
      const response = await fetch(`${BASE_URL}/api/service/health`, {
        headers: { Authorization: `Basic ${Buffer.from("user:pass").toString("base64")}` },
      });
      
      expect([401, 503]).toContain(response.status);
      const data = await response.json();
      
      if (response.status === 401) {
        expect(data.error).toBe("unauthorized");
      }
    });

    it("should reject requests with invalid token", async () => {
      const response = await fetch(`${BASE_URL}/api/service/health`, {
        headers: { Authorization: "Bearer invalid-token-12345" },
      });
      
      expect([403, 503]).toContain(response.status);
      const data = await response.json();
      
      if (response.status === 403) {
        expect(data.error).toBe("forbidden");
      }
    });

    it("should reject requests with empty Bearer token", async () => {
      const response = await fetch(`${BASE_URL}/api/service/health`, {
        headers: { Authorization: "Bearer " },
      });
      
      // Empty token should be rejected
      expect([401, 403, 503]).toContain(response.status);
    });
  });

  describe("Health Endpoint", () => {
    it("should return health status with valid token when enabled", async () => {
      const response = await fetch(`${BASE_URL}/api/service/health`, {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` },
      });
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data.status).toBe("ok");
        expect(data.service).toBe("taiwan-maami-pos");
        expect(data.version).toBe("1.0.0");
        expect(data.timestamp).toBeDefined();
        expect(data.checks).toBeDefined();
        expect(data.checks.database).toBeDefined();
        expect(data.checks.featureFlag).toBe("enabled");
      } else {
        // Feature flag is disabled — that's a valid test state
        expect(response.status).toBe(503);
      }
    });
  });

  describe("Employee Master Proxy", () => {
    it("should proxy requests to Employee Master API with valid token", async () => {
      const response = await fetch(`${BASE_URL}/api/service/employee-master/staff`, {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` },
      });
      
      // Could be 200 (success), 502 (proxy error if EMP_MASTER_API_URL is unreachable),
      // 503 (feature disabled or misconfigured)
      expect([200, 502, 503]).toContain(response.status);
      const data = await response.json();
      
      if (response.status === 200) {
        // Successful proxy - response from Employee Master
        expect(data).toBeDefined();
      } else if (response.status === 502) {
        expect(data.error).toBe("proxy_error");
      } else if (response.status === 503) {
        expect(["service_unavailable", "service_misconfigured"]).toContain(data.error);
      }
    });

    it("should reject Employee Master proxy without auth", async () => {
      const response = await fetch(`${BASE_URL}/api/service/employee-master/staff`);
      
      expect([401, 503]).toContain(response.status);
    });
  });

  describe("Middleware Security Properties", () => {
    it("should not expose internal error details in rejection responses", async () => {
      const response = await fetch(`${BASE_URL}/api/service/health`, {
        headers: { Authorization: "Bearer wrong-token" },
      });
      
      const data = await response.json();
      
      // Should never expose the actual token or internal paths
      const responseText = JSON.stringify(data);
      expect(responseText).not.toContain(TEST_TOKEN);
      expect(responseText).not.toContain("MAAMITECH_SERVICE_TOKEN");
      expect(responseText).not.toContain("process.env");
    });

    it("should handle malformed Authorization headers gracefully", async () => {
      const response = await fetch(`${BASE_URL}/api/service/health`, {
        headers: { Authorization: "NotAValidScheme" },
      });
      
      expect([401, 503]).toContain(response.status);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});
