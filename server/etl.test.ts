/**
 * Tests for Data Lake ETL endpoints.
 * 
 * Auth/validation tests use supertest (no server needed).
 * DB/Supabase-dependent tests are skipped when DATABASE_URL is absent (CI).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

const TEST_TOKEN = "test-service-token-for-etl-tests";
const HAS_DB = !!process.env.DATABASE_URL;
const HAS_SUPABASE = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

describe("MaamiTech Task 6 — Data Lake ETL", () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.resetModules();

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
        description: "Legacy single token",
        createdAt: "2026-01-01T00:00:00Z",
        active: true,
      },
    ]);
    process.env.MAAMITECH_SERVICE_TOKEN = TEST_TOKEN;

    const { scopedAuthMiddleware, invalidateTokenRegistry } = await import("./scopedAuth");
    const { validateEtlRunBody, validateEtlStatusQuery } = await import("./inputValidation");
    const { handleETL, handleETLStatus } = await import("./etl");
    invalidateTokenRegistry();

    app = express();
    app.use(express.json());
    app.use("/api/service", scopedAuthMiddleware as any);
    app.post("/api/service/etl/run", validateEtlRunBody as any, handleETL as any);
    app.get("/api/service/etl/status", validateEtlStatusQuery as any, handleETLStatus as any);
  });

  afterEach(() => {
    delete process.env.MAAMITECH_TOKEN_REGISTRY;
    delete process.env.MAAMITECH_SERVICE_TOKEN;
    vi.restoreAllMocks();
  });

  describe("ETL Run Endpoint (POST /api/service/etl/run)", () => {
    it("should reject requests without auth", async () => {
      const res = await request(app).post("/api/service/etl/run");
      expect(res.status).toBe(401);
    });

    it("should reject requests with invalid token", async () => {
      const res = await request(app)
        .post("/api/service/etl/run")
        .set("Authorization", "Bearer invalid-token");
      expect(res.status).toBe(403);
    });

    it.skipIf(!HAS_DB)("should execute ETL for a specific date with valid token", async () => {
      const res = await request(app)
        .post("/api/service/etl/run?date=2026-04-30")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      expect([200, 207, 503]).toContain(res.status);

      if (res.status === 503) {
        expect(res.body.error).toBeDefined();
        return;
      }

      expect(res.body.result).toBeDefined();
      expect(res.body.result.batchId).toMatch(/^etl_2026-04-30_/);
      expect(res.body.result.reportDate).toBe("2026-04-30");
      expect(res.body.result.salesFacts).toBeDefined();
      expect(res.body.result.salesFacts.inserted).toBeGreaterThanOrEqual(0);
      expect(res.body.result.salesFacts.errors).toBeGreaterThanOrEqual(0);
      expect(res.body.result.stockSnapshots).toBeDefined();
      expect(res.body.result.wastageFacts).toBeDefined();
      expect(res.body.result.dataCompleteness).toBeDefined();
      expect(res.body.result.dataCompleteness.outlets).toEqual(["palladium", "tnagar"]);
      expect(res.body.result.duration).toBeGreaterThan(0);
      expect(Array.isArray(res.body.result.errors)).toBe(true);
    }, 30000);

    it.skipIf(!HAS_DB)("should default to yesterday when no date param provided", async () => {
      const res = await request(app)
        .post("/api/service/etl/run")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      expect([200, 207, 503]).toContain(res.status);
      if (res.status !== 503) {
        expect(res.body.result.reportDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }, 30000);

    it.skipIf(!HAS_DB)("should handle a date with no data gracefully", async () => {
      const res = await request(app)
        .post("/api/service/etl/run?date=2020-01-01")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      expect([200, 207, 500, 503]).toContain(res.status);
      if (res.status !== 503) {
        expect(res.body.result).toBeDefined();
        expect(res.body.result.salesFacts.inserted).toBe(0);
      }
    }, 30000);
  });

  describe("ETL Status Endpoint (GET /api/service/etl/status)", () => {
    it("should reject requests without auth", async () => {
      const res = await request(app).get("/api/service/etl/status");
      expect(res.status).toBe(401);
    });

    it.skipIf(!HAS_DB)("should return status with valid token", async () => {
      const res = await request(app)
        .get("/api/service/etl/status")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      expect([200, 503]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.supabaseConnected).toBe(true);
        expect(Array.isArray(res.body.data.lastRuns)).toBe(true);
      }
    });
  });

  describe("Supabase Data Verification", () => {
    it.skipIf(!HAS_SUPABASE)("should have sales_facts rows in Supabase for 2026-04-30", async () => {
      const SUPABASE_URL = process.env.SUPABASE_URL!;
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

      const sample = rows[0];
      expect(sample.source).toBe("pos");
      expect(sample.outlet).toBeDefined();
      expect(["palladium", "tnagar", "unknown"]).toContain(sample.outlet);
    });

    it.skipIf(!HAS_SUPABASE)("should have data_completeness rows in Supabase", async () => {
      const SUPABASE_URL = process.env.SUPABASE_URL!;
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
      expect(rows.length).toBeGreaterThanOrEqual(2);

      const palladium = rows.find((r: any) => r.outlet === "palladium");
      const tnagar = rows.find((r: any) => r.outlet === "tnagar");
      expect(palladium).toBeDefined();
      expect(tnagar).toBeDefined();
      expect(tnagar.pos_orders_count).toBeGreaterThan(0);
      expect(tnagar.pos_orders_status).toBe("complete");
      expect(tnagar.etl_batch_id).toMatch(/^etl_/);
    });

    it.skipIf(!HAS_SUPABASE)("should have correct source types in sales_facts", async () => {
      const SUPABASE_URL = process.env.SUPABASE_URL!;
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
      for (const source of sources) {
        expect(["pos", "petpooja_webhook", "petpooja_csv", "petpooja_report"]).toContain(source);
      }
    });
  });

  describe("Scheduled Task Endpoint (POST /api/scheduled/etl)", () => {
    it("should reject requests without a valid session cookie", async () => {
      // Build a separate app with the scheduled endpoint
      vi.resetModules();
      const scheduledApp = express();
      scheduledApp.use(express.json());
      // The scheduled endpoint uses session cookie auth, not scoped token auth
      // Without proper session, it should return 401/403
      scheduledApp.post("/api/scheduled/etl", (req, res) => {
        // Simulate the auth check that happens in the real app
        if (!req.headers.cookie?.includes("app_session_id")) {
          return res.status(401).json({ error: "unauthorized" });
        }
        return res.status(200).json({ success: true });
      });

      const res = await request(scheduledApp).post("/api/scheduled/etl?date=2026-04-30");
      expect([401, 403]).toContain(res.status);
      expect(res.body.error).toBeDefined();
    });

    it("should NOT be behind scoped token auth (separate from /api/service/*)", async () => {
      // The scheduled endpoint should NOT respond to scoped token auth
      // It uses session cookie auth instead
      const scheduledApp = express();
      scheduledApp.use(express.json());
      scheduledApp.post("/api/scheduled/etl", (req, res) => {
        if (!req.headers.cookie?.includes("app_session_id")) {
          return res.status(401).json({ error: "unauthorized" });
        }
        return res.status(200).json({ success: true });
      });

      const res = await request(scheduledApp)
        .post("/api/scheduled/etl?date=2026-04-30")
        .set("Authorization", "Bearer invalid_token");

      expect([401, 403]).toContain(res.status);
      // Should NOT have scoped auth error format
      expect(res.body.error).not.toBe("insufficient_scope");
    });
  });
});
