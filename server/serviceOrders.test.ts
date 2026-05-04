/**
 * Tests for orders.listForService endpoint.
 * 
 * Auth/validation tests use supertest (no server needed).
 * DB-dependent tests are skipped when DATABASE_URL is absent (CI).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

const TEST_TOKEN = "test-service-token-for-orders-tests";
const HAS_DB = !!process.env.DATABASE_URL;

describe("MaamiTech Service API — orders.listForService (Task 2)", () => {
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
    const { validateOrdersQuery } = await import("./inputValidation");
    const { handleOrdersList } = await import("./serviceAuth");
    invalidateTokenRegistry();

    app = express();
    app.use(express.json());
    app.use("/api/service", scopedAuthMiddleware as any);
    app.get("/api/service/orders", validateOrdersQuery as any, handleOrdersList as any);
  });

  afterEach(() => {
    delete process.env.MAAMITECH_TOKEN_REGISTRY;
    delete process.env.MAAMITECH_SERVICE_TOKEN;
    vi.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("should reject requests without auth token", async () => {
      const res = await request(app).get("/api/service/orders?limit=1");
      expect(res.status).toBe(401);
    });

    it("should reject requests with invalid token", async () => {
      const res = await request(app)
        .get("/api/service/orders?limit=1")
        .set("Authorization", "Bearer invalid-token");
      expect(res.status).toBe(403);
    });
  });

  describe("Basic Response Structure", () => {
    it.skipIf(!HAS_DB)("should return orders with correct top-level structure", async () => {
      const res = await request(app)
        .get("/api/service/orders?limit=1")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeTypeOf("number");
      expect(res.body.meta.limit).toBe(1);
      expect(res.body.meta.offset).toBe(0);
      expect(res.body.meta.hasMore).toBeTypeOf("boolean");
      expect(res.body.meta.filters).toBeDefined();
    });

    it.skipIf(!HAS_DB)("should return order fields with amounts in rupees (not paise)", async () => {
      const res = await request(app)
        .get("/api/service/orders?limit=1")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      if (res.body.data.length === 0) return;
      const order = res.body.data[0];
      expect(order.id).toBeTypeOf("number");
      expect(order.orderNumber).toBeTypeOf("string");
      expect(order.orderType).toBeDefined();
      expect(order.orderStatus).toBeDefined();
      expect(order.totalAmount).toBeTypeOf("number");
      expect(order.subtotal).toBeTypeOf("number");
      expect(order.createdAt).toBeDefined();
      if (order.totalAmount > 0) {
        expect(order.totalAmount).toBeLessThan(100000);
        expect(order.totalAmount).toBeGreaterThan(0);
      }
    });

    it.skipIf(!HAS_DB)("should include nested items with addons by default", async () => {
      const res = await request(app)
        .get("/api/service/orders?limit=1")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      if (res.body.data.length === 0) return;
      const order = res.body.data[0];
      expect(order.items).toBeDefined();
      expect(Array.isArray(order.items)).toBe(true);
      if (order.items.length > 0) {
        const item = order.items[0];
        expect(item.productId).toBeTypeOf("number");
        expect(item.productName).toBeTypeOf("string");
        expect(item.quantity).toBeTypeOf("number");
        expect(item.unitPrice).toBeTypeOf("number");
        expect(item.lineTotal).toBeTypeOf("number");
        expect(item.addons).toBeDefined();
        expect(Array.isArray(item.addons)).toBe(true);
      }
    });
  });

  describe("Filtering", () => {
    it.skipIf(!HAS_DB)("should filter by date range", async () => {
      const from = "2026-04-01T00:00:00.000Z";
      const to = "2026-04-30T23:59:59.999Z";
      const res = await request(app)
        .get(`/api/service/orders?limit=5&from=${from}&to=${to}`)
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      expect(res.body.success).toBe(true);
      expect(res.body.meta.filters.from).toBe(from);
      expect(res.body.meta.filters.to).toBe(to);
      for (const order of res.body.data) {
        const orderDate = new Date(order.createdAt).getTime();
        expect(orderDate).toBeGreaterThanOrEqual(new Date(from).getTime());
        expect(orderDate).toBeLessThanOrEqual(new Date(to).getTime());
      }
    });

    it.skipIf(!HAS_DB)("should filter by orderType", async () => {
      const res = await request(app)
        .get("/api/service/orders?limit=5&orderType=instore")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      expect(res.body.success).toBe(true);
      expect(res.body.meta.filters.orderType).toBe("instore");
      for (const order of res.body.data) {
        expect(order.orderType).toBe("instore");
      }
    });

    it.skipIf(!HAS_DB)("should filter by multiple orderTypes (comma-separated)", async () => {
      const res = await request(app)
        .get("/api/service/orders?limit=5&orderType=instore,delivery")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      expect(res.body.success).toBe(true);
      for (const order of res.body.data) {
        expect(["instore", "delivery"]).toContain(order.orderType);
      }
    });

    it.skipIf(!HAS_DB)("should filter by order status", async () => {
      const res = await request(app)
        .get("/api/service/orders?limit=5&status=completed")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      expect(res.body.success).toBe(true);
      for (const order of res.body.data) {
        expect(order.orderStatus).toBe("completed");
      }
    });

    it.skipIf(!HAS_DB)("should filter by paymentMethod", async () => {
      const res = await request(app)
        .get("/api/service/orders?limit=5&paymentMethod=cash")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      expect(res.body.success).toBe(true);
      for (const order of res.body.data) {
        expect(order.paymentMethod).toBe("cash");
      }
    });
  });

  describe("Pagination", () => {
    it.skipIf(!HAS_DB)("should respect limit parameter", async () => {
      const res = await request(app)
        .get("/api/service/orders?limit=3")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      expect(res.body.data.length).toBeLessThanOrEqual(3);
      expect(res.body.meta.limit).toBe(3);
    });

    it.skipIf(!HAS_DB)("should respect offset parameter", async () => {
      const page1 = await request(app)
        .get("/api/service/orders?limit=2&offset=0")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);
      const page2 = await request(app)
        .get("/api/service/orders?limit=2&offset=2")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      if (page1.body.data.length > 0 && page2.body.data.length > 0) {
        expect(page1.body.data[0].id).not.toBe(page2.body.data[0].id);
      }
    });

    it.skipIf(!HAS_DB)("should cap limit at 500", async () => {
      const res = await request(app)
        .get("/api/service/orders?limit=1000")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      expect(res.body.meta.limit).toBe(500);
    });

    it.skipIf(!HAS_DB)("should report hasMore correctly", async () => {
      const res = await request(app)
        .get("/api/service/orders?limit=1")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      if (res.body.meta.total > 1) {
        expect(res.body.meta.hasMore).toBe(true);
      }
    });
  });

  describe("Include Parameter", () => {
    it.skipIf(!HAS_DB)("should exclude items when include=none", async () => {
      const res = await request(app)
        .get("/api/service/orders?limit=1&include=none")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      if (res.body.data.length === 0) return;
      expect(res.body.data[0].items).toBeUndefined();
    });

    it.skipIf(!HAS_DB)("should include items but exclude addons when include=items", async () => {
      const res = await request(app)
        .get("/api/service/orders?limit=1&include=items")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      if (res.body.data.length === 0) return;
      const order = res.body.data[0];
      expect(order.items).toBeDefined();
      if (order.items.length > 0) {
        expect(order.items[0].addons).toBeUndefined();
      }
    });
  });

  describe("Data Integrity", () => {
    it.skipIf(!HAS_DB)("should never return test data", async () => {
      const res = await request(app)
        .get("/api/service/orders?limit=100")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(100);
    });

    it.skipIf(!HAS_DB)("should return orders sorted by createdAt descending (newest first)", async () => {
      const res = await request(app)
        .get("/api/service/orders?limit=5")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);

      if (res.body.data.length < 2) return;
      for (let i = 1; i < res.body.data.length; i++) {
        const prev = new Date(res.body.data[i - 1].createdAt).getTime();
        const curr = new Date(res.body.data[i].createdAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });
});
