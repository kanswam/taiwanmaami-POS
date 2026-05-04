/**
 * Tests for service endpoints (employees, menu, toggle).
 * 
 * Auth/validation tests use supertest (no server needed).
 * DB-dependent tests are skipped when DATABASE_URL is absent (CI).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

const TEST_TOKEN = "test-service-token-for-endpoint-tests";
const HAS_DB = !!process.env.DATABASE_URL;

describe("MaamiTech Service Endpoints (Task 7 + Menu Toggle)", () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("./_core/env", () => ({
      ENV: {
        maamitechApiEnabled: true,
        maamitechServiceToken: TEST_TOKEN,
        empMasterApiUrl: "https://employees.thamaraifoods.com",
        empMasterApiKey: "test-emp-key",
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
    const { validateEmployeesQuery, validateMenuProductsQuery, validateMenuToggleBody } = await import("./inputValidation");
    const { handleEmployeesList, handleMenuProducts, handleMenuToggleAvailability } = await import("./serviceAuth");
    invalidateTokenRegistry();

    app = express();
    app.use(express.json());
    app.use("/api/service", scopedAuthMiddleware as any);
    app.get("/api/service/employees", validateEmployeesQuery as any, handleEmployeesList as any);
    app.get("/api/service/menu/products", validateMenuProductsQuery as any, handleMenuProducts as any);
    app.post("/api/service/menu/toggle-availability", validateMenuToggleBody as any, handleMenuToggleAvailability as any);
  });

  afterEach(() => {
    delete process.env.MAAMITECH_TOKEN_REGISTRY;
    delete process.env.MAAMITECH_SERVICE_TOKEN;
    vi.restoreAllMocks();
  });

  describe("GET /api/service/employees", () => {
    it("should reject requests without auth token", async () => {
      const res = await request(app).get("/api/service/employees");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("unauthorized");
    });

    it("should reject requests with invalid token", async () => {
      const res = await request(app)
        .get("/api/service/employees")
        .set("Authorization", "Bearer invalid_token_123");
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("forbidden");
    });

    it.skipIf(!HAS_DB)("should return employees with standardized response format", async () => {
      const res = await request(app)
        .get("/api/service/employees?limit=2")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta).toHaveProperty("total");
      expect(res.body.meta).toHaveProperty("limit");
      expect(res.body.meta).toHaveProperty("offset");
      expect(res.body.meta).toHaveProperty("hasMore");
      expect(res.body.meta).toHaveProperty("filters");
      expect(res.body.meta.limit).toBe(2);
    });

    it.skipIf(!HAS_DB)("should return sanitized employee fields without sensitive data", async () => {
      const res = await request(app)
        .get("/api/service/employees?limit=1")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);
      const body = res.body;
      if (body.data.length > 0) {
        const emp = body.data[0];
        expect(emp).toHaveProperty("id");
        expect(emp).toHaveProperty("name");
        expect(emp).toHaveProperty("employeeCode");
        expect(emp).toHaveProperty("primaryOutlet");
        expect(emp).toHaveProperty("department");
        expect(emp).toHaveProperty("role");
        expect(emp).toHaveProperty("status");
        expect(emp).not.toHaveProperty("password");
        expect(emp).not.toHaveProperty("passwordHash");
      }
    });

    it.skipIf(!HAS_DB)("should support outlet filter", async () => {
      const res = await request(app)
        .get("/api/service/employees?outlet=palladium")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);
      expect(res.body.success).toBe(true);
      expect(res.body.meta.filters.outlet).toBe("palladium");
      for (const emp of res.body.data) {
        expect(emp.primaryOutlet.toLowerCase()).toContain("palladium");
      }
    });
  });

  describe("GET /api/service/menu/products", () => {
    it("should reject requests without auth token", async () => {
      const res = await request(app).get("/api/service/menu/products");
      expect(res.status).toBe(401);
    });

    it.skipIf(!HAS_DB)("should return menu products with standardized response format", async () => {
      const res = await request(app)
        .get("/api/service/menu/products?limit=3")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta).toHaveProperty("total");
      expect(res.body.meta).toHaveProperty("limit");
      expect(res.body.meta).toHaveProperty("offset");
      expect(res.body.meta).toHaveProperty("hasMore");
      expect(res.body.meta.limit).toBe(3);
      if (res.body.data.length > 0) {
        const product = res.body.data[0];
        expect(product).toHaveProperty("id");
        expect(product).toHaveProperty("name");
        expect(product).toHaveProperty("isAvailable");
        expect(product).toHaveProperty("isInStock");
        expect(product).toHaveProperty("instorePrice");
        expect(product).toHaveProperty("deliveryPrice");
        expect(product).toHaveProperty("isVegetarian");
      }
    });

    it.skipIf(!HAS_DB)("should support available filter", async () => {
      const res = await request(app)
        .get("/api/service/menu/products?available=true&limit=5")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);
      expect(res.body.success).toBe(true);
      expect(res.body.meta.filters.available).toBe("true");
      for (const p of res.body.data) {
        expect(p.isAvailable).toBe(true);
      }
    });
  });

  describe("POST /api/service/menu/toggle-availability", () => {
    it("should reject requests without auth token", async () => {
      const res = await request(app)
        .post("/api/service/menu/toggle-availability")
        .send({ productId: 1, available: false });
      expect(res.status).toBe(401);
    });

    it("should reject invalid input (missing fields)", async () => {
      const res = await request(app)
        .post("/api/service/menu/toggle-availability")
        .set("Authorization", `Bearer ${TEST_TOKEN}`)
        .send({ productId: "abc" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });

    it.skipIf(!HAS_DB)("should return 404 for non-existent product", async () => {
      const res = await request(app)
        .post("/api/service/menu/toggle-availability")
        .set("Authorization", `Bearer ${TEST_TOKEN}`)
        .send({ productId: 9999999, available: false });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });

    it.skipIf(!HAS_DB)("should toggle product availability and return previous/current state", async () => {
      // First get a product to test with
      const listRes = await request(app)
        .get("/api/service/menu/products?limit=1&available=true")
        .set("Authorization", `Bearer ${TEST_TOKEN}`);
      if (listRes.body.data.length === 0) return;

      const testProduct = listRes.body.data[0];
      const originalAvailability = testProduct.isAvailable;

      // Toggle OFF
      const toggleRes = await request(app)
        .post("/api/service/menu/toggle-availability")
        .set("Authorization", `Bearer ${TEST_TOKEN}`)
        .send({ productId: testProduct.id, available: !originalAvailability });
      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.success).toBe(true);
      expect(toggleRes.body.data.productId).toBe(testProduct.id);
      expect(toggleRes.body.data.previousAvailability).toBe(originalAvailability);
      expect(toggleRes.body.data.currentAvailability).toBe(!originalAvailability);

      // Toggle BACK to original state (cleanup)
      const restoreRes = await request(app)
        .post("/api/service/menu/toggle-availability")
        .set("Authorization", `Bearer ${TEST_TOKEN}`)
        .send({ productId: testProduct.id, available: originalAvailability });
      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.data.currentAvailability).toBe(originalAvailability);
    });
  });

  describe("Response format consistency across all service endpoints", () => {
    it.skipIf(!HAS_DB)("should use the same meta structure across orders, employees, and menu", async () => {
      // Need orders endpoint too for this test
      vi.resetModules();
      vi.doMock("./_core/env", () => ({
        ENV: {
          maamitechApiEnabled: true,
          maamitechServiceToken: TEST_TOKEN,
        },
      }));
      process.env.MAAMITECH_TOKEN_REGISTRY = JSON.stringify([
        { token: TEST_TOKEN, agentId: "legacy_single_token", scopes: ["admin:*"], description: "Legacy", createdAt: "2026-01-01T00:00:00Z", active: true },
      ]);

      const { scopedAuthMiddleware, invalidateTokenRegistry } = await import("./scopedAuth");
      const { validateOrdersQuery, validateEmployeesQuery, validateMenuProductsQuery } = await import("./inputValidation");
      const { handleOrdersList, handleEmployeesList, handleMenuProducts } = await import("./serviceAuth");
      invalidateTokenRegistry();

      const fullApp = express();
      fullApp.use(express.json());
      fullApp.use("/api/service", scopedAuthMiddleware as any);
      fullApp.get("/api/service/orders", validateOrdersQuery as any, handleOrdersList as any);
      fullApp.get("/api/service/employees", validateEmployeesQuery as any, handleEmployeesList as any);
      fullApp.get("/api/service/menu/products", validateMenuProductsQuery as any, handleMenuProducts as any);

      const [ordersRes, employeesRes, menuRes] = await Promise.all([
        request(fullApp).get("/api/service/orders?limit=1").set("Authorization", `Bearer ${TEST_TOKEN}`),
        request(fullApp).get("/api/service/employees?limit=1").set("Authorization", `Bearer ${TEST_TOKEN}`),
        request(fullApp).get("/api/service/menu/products?limit=1").set("Authorization", `Bearer ${TEST_TOKEN}`),
      ]);

      for (const res of [ordersRes, employeesRes, menuRes]) {
        expect(res.body).toHaveProperty("success", true);
        expect(res.body).toHaveProperty("data");
        expect(res.body).toHaveProperty("meta");
        expect(res.body.meta).toHaveProperty("total");
        expect(res.body.meta).toHaveProperty("limit");
        expect(res.body.meta).toHaveProperty("offset");
        expect(res.body.meta).toHaveProperty("hasMore");
      }
    });
  });
});
