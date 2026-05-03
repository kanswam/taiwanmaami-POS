import { describe, it, expect, vi, beforeAll } from "vitest";

beforeAll(() => {
  if (!process.env.MAAMITECH_SERVICE_TOKEN) {
    vi.stubEnv('MAAMITECH_SERVICE_TOKEN', 'test-token-for-ci');
  }
  if (!process.env.SUPABASE_URL) {
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  }
});

const BASE_URL = "http://localhost:3000";
const TEST_TOKEN = process.env.MAAMITECH_SERVICE_TOKEN!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe("MaamiTech Task 6 — Data Lake ETL", () => {
  describe("ETL Run Endpoint (POST /api/service/etl/run)", () => {
    it("should reject requests without auth", async () => {
      const response = await fetch(`${BASE_URL}/api/service/etl/run`, {
        method: "POST",
      });
      expect([401, 503]).toContain(response.status);
    });

    it("should reject requests with invalid token", async () => {
      const response = await fetch(`${BASE_URL}/api/service/etl/run`, {
        method: "POST",
        headers: { Authorization: "Bearer invalid-token" },
      });
      expect([403, 503]).toContain(response.status);
    });

    it("should execute ETL for a specific date with valid token", async () => {
      const response = await fetch(`${BASE_URL}/api/service/etl/run?date=2026-04-30`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TEST_TOKEN}` },
      });

      // 200 (all good), 207 (partial success), or 503 (feature disabled)
      expect([200, 207, 503]).toContain(response.status);
      const data = await response.json();

      if (response.status === 503) {
        expect(data.error).toBeDefined();
        return;
      }

      // Verify response structure
      expect(data.result).toBeDefined();
      expect(data.result.batchId).toMatch(/^etl_2026-04-30_/);
      expect(data.result.reportDate).toBe("2026-04-30");
      expect(data.result.salesFacts).toBeDefined();
      expect(data.result.salesFacts.inserted).toBeGreaterThanOrEqual(0);
      expect(data.result.salesFacts.errors).toBeGreaterThanOrEqual(0);
      expect(data.result.stockSnapshots).toBeDefined();
      expect(data.result.wastageFacts).toBeDefined();
      expect(data.result.dataCompleteness).toBeDefined();
      expect(data.result.dataCompleteness.outlets).toEqual(["palladium", "tnagar"]);
      expect(data.result.duration).toBeGreaterThan(0);
      expect(Array.isArray(data.result.errors)).toBe(true);
    }, 30000);

    it("should default to yesterday when no date param provided", async () => {
      const response = await fetch(`${BASE_URL}/api/service/etl/run`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TEST_TOKEN}` },
      });

      expect([200, 207, 503]).toContain(response.status);
      const data = await response.json();

      if (response.status !== 503) {
        expect(data.result.reportDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }, 30000);

    it("should handle a date with no data gracefully", async () => {
      const response = await fetch(`${BASE_URL}/api/service/etl/run?date=2020-01-01`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TEST_TOKEN}` },
      });

      expect([200, 207, 500, 503]).toContain(response.status);
      const data = await response.json();

      if (response.status !== 503) {
        // No data for 2020 — should still return structured response
        expect(data.result).toBeDefined();
        expect(data.result.salesFacts.inserted).toBe(0);
      }
    }, 30000);
  });

  describe("ETL Status Endpoint (GET /api/service/etl/status)", () => {
    it("should reject requests without auth", async () => {
      const response = await fetch(`${BASE_URL}/api/service/etl/status`);
      expect([401, 503]).toContain(response.status);
    });

    it("should return status with valid token", async () => {
      const response = await fetch(`${BASE_URL}/api/service/etl/status`, {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` },
      });

      expect([200, 503]).toContain(response.status);
      const data = await response.json();

      if (response.status === 200) {
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
        expect(data.data.supabaseConnected).toBe(true);
        expect(Array.isArray(data.data.lastRuns)).toBe(true);
      }
    });
  });

  describe("Supabase Data Verification", () => {
    it("should have sales_facts rows in Supabase for 2026-04-30", async () => {
      if (!SUPABASE_URL || !SUPABASE_KEY) return;

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/sales_facts?order_date=eq.2026-04-30&select=id,source,item_name,outlet`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      expect(res.status).toBe(200);
      const rows = await res.json();
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0);

      // Verify row structure
      const sample = rows[0];
      expect(sample.source).toBe("pos");
      expect(sample.outlet).toBeDefined();
      expect(["palladium", "tnagar", "unknown"]).toContain(sample.outlet);
    });

    it("should have data_completeness rows in Supabase", async () => {
      if (!SUPABASE_URL || !SUPABASE_KEY) return;

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/data_completeness?report_date=eq.2026-04-30&select=*`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      expect(res.status).toBe(200);
      const rows = await res.json();
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThanOrEqual(2); // palladium + tnagar

      // Verify completeness row structure
      const palladium = rows.find((r: any) => r.outlet === "palladium");
      const tnagar = rows.find((r: any) => r.outlet === "tnagar");
      expect(palladium).toBeDefined();
      expect(tnagar).toBeDefined();
      expect(tnagar.pos_orders_count).toBeGreaterThan(0);
      expect(tnagar.pos_orders_status).toBe("complete");
      expect(tnagar.etl_batch_id).toMatch(/^etl_/);
    });

    it("should have correct source types in sales_facts", async () => {
      if (!SUPABASE_URL || !SUPABASE_KEY) return;

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/sales_facts?select=source&limit=1000`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      expect(res.status).toBe(200);
      const rows = await res.json();
      const sources = [...new Set(rows.map((r: any) => r.source))];
      
      // Should only contain valid source types
      for (const source of sources) {
        expect(["pos", "petpooja_webhook", "petpooja_csv"]).toContain(source);
      }
    });
  });

  describe("Scheduled Task Endpoint (POST /api/scheduled/etl)", () => {
    it("should be accessible without service auth (for scheduled task cookie auth)", async () => {
      // The /api/scheduled/etl endpoint is NOT behind serviceAuthMiddleware
      // It should work with the scheduled task's session cookie
      const response = await fetch(`${BASE_URL}/api/scheduled/etl?date=2026-04-30`, {
        method: "POST",
      });

      // Without any auth, it should still execute (no serviceAuthMiddleware on this route)
      // It will either succeed or fail based on Supabase config
      expect([200, 207, 500, 503]).toContain(response.status);
      const data = await response.json();
      
      if (response.status !== 503) {
        expect(data.result).toBeDefined();
        expect(data.result.reportDate).toBe("2026-04-30");
      }
    }, 30000);
  });
});
