import { describe, it, expect } from "vitest";

/**
 * Tests for Task 7 (employees.list) and Menu Toggle service endpoints.
 * 
 * These tests validate the endpoint registration, auth enforcement,
 * and response format consistency across all service API endpoints.
 */

// Helper to get the Express app
async function getApp() {
  const mod = await import("./_core/index");
  return (mod as any).app || (mod as any).default;
}

describe("MaamiTech Service Endpoints (Task 7 + Menu Toggle)", () => {
  
  describe("GET /api/service/employees", () => {
    it("should reject requests without auth token", async () => {
      const res = await fetch("http://localhost:3000/api/service/employees");
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("unauthorized");
    });

    it("should reject requests with invalid token", async () => {
      const res = await fetch("http://localhost:3000/api/service/employees", {
        headers: { Authorization: "Bearer invalid_token_123" },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("forbidden");
    });

    it("should return employees with standardized response format", async () => {
      const token = process.env.MAAMITECH_SERVICE_TOKEN;
      if (!token) return; // Skip if no token configured
      
      const res = await fetch("http://localhost:3000/api/service/employees?limit=2", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      
      // Verify standardized format
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
      expect(body.meta).toHaveProperty("total");
      expect(body.meta).toHaveProperty("limit");
      expect(body.meta).toHaveProperty("offset");
      expect(body.meta).toHaveProperty("hasMore");
      expect(body.meta).toHaveProperty("filters");
      expect(body.meta.limit).toBe(2);
    }, 10000);

    it("should return sanitized employee fields without sensitive data", async () => {
      const token = process.env.MAAMITECH_SERVICE_TOKEN;
      if (!token) return;
      
      const res = await fetch("http://localhost:3000/api/service/employees?limit=1", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      
      if (body.data.length > 0) {
        const emp = body.data[0];
        // Should have these fields
        expect(emp).toHaveProperty("id");
        expect(emp).toHaveProperty("name");
        expect(emp).toHaveProperty("employeeCode");
        expect(emp).toHaveProperty("primaryOutlet");
        expect(emp).toHaveProperty("department");
        expect(emp).toHaveProperty("role");
        expect(emp).toHaveProperty("status");
        // Should NOT have password or other sensitive fields
        expect(emp).not.toHaveProperty("password");
        expect(emp).not.toHaveProperty("passwordHash");
      }
    }, 10000);

    it("should support outlet filter", async () => {
      const token = process.env.MAAMITECH_SERVICE_TOKEN;
      if (!token) return;
      
      const res = await fetch("http://localhost:3000/api/service/employees?outlet=palladium", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.meta.filters.outlet).toBe("palladium");
      
      // All returned employees should be from Palladium
      for (const emp of body.data) {
        expect(emp.primaryOutlet.toLowerCase()).toContain("palladium");
      }
    }, 10000);
  });

  describe("GET /api/service/menu/products", () => {
    it("should reject requests without auth token", async () => {
      const res = await fetch("http://localhost:3000/api/service/menu/products");
      expect(res.status).toBe(401);
    });

    it("should return menu products with standardized response format", async () => {
      const token = process.env.MAAMITECH_SERVICE_TOKEN;
      if (!token) return;
      
      const res = await fetch("http://localhost:3000/api/service/menu/products?limit=3", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      
      // Verify standardized format
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
      expect(body.meta).toHaveProperty("total");
      expect(body.meta).toHaveProperty("limit");
      expect(body.meta).toHaveProperty("offset");
      expect(body.meta).toHaveProperty("hasMore");
      expect(body.meta.limit).toBe(3);
      
      if (body.data.length > 0) {
        const product = body.data[0];
        expect(product).toHaveProperty("id");
        expect(product).toHaveProperty("name");
        expect(product).toHaveProperty("isAvailable");
        expect(product).toHaveProperty("isInStock");
        expect(product).toHaveProperty("instorePrice");
        expect(product).toHaveProperty("deliveryPrice");
        expect(product).toHaveProperty("isVegetarian");
      }
    }, 10000);

    it("should support available filter", async () => {
      const token = process.env.MAAMITECH_SERVICE_TOKEN;
      if (!token) return;
      
      const res = await fetch("http://localhost:3000/api/service/menu/products?available=true&limit=5", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.meta.filters.available).toBe("true");
      
      // All returned products should be available
      for (const p of body.data) {
        expect(p.isAvailable).toBe(true);
      }
    }, 10000);
  });

  describe("POST /api/service/menu/toggle-availability", () => {
    it("should reject requests without auth token", async () => {
      const res = await fetch("http://localhost:3000/api/service/menu/toggle-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: 1, available: false }),
      });
      expect(res.status).toBe(401);
    });

    it("should reject invalid input (missing fields)", async () => {
      const token = process.env.MAAMITECH_SERVICE_TOKEN;
      if (!token) return;
      
      const res = await fetch("http://localhost:3000/api/service/menu/toggle-availability", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: "abc" }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_input");
    }, 10000);

    it("should return 404 for non-existent product", async () => {
      const token = process.env.MAAMITECH_SERVICE_TOKEN;
      if (!token) return;
      
      const res = await fetch("http://localhost:3000/api/service/menu/toggle-availability", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: 9999999, available: false }),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("not_found");
    }, 10000);

    it("should toggle product availability and return previous/current state", async () => {
      const token = process.env.MAAMITECH_SERVICE_TOKEN;
      if (!token) return;
      
      // First get a product to test with
      const listRes = await fetch("http://localhost:3000/api/service/menu/products?limit=1&available=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listBody = await listRes.json();
      if (listBody.data.length === 0) return; // No products to test
      
      const testProduct = listBody.data[0];
      const originalAvailability = testProduct.isAvailable;
      
      // Toggle OFF
      const toggleRes = await fetch("http://localhost:3000/api/service/menu/toggle-availability", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: testProduct.id, available: !originalAvailability }),
      });
      expect(toggleRes.status).toBe(200);
      const toggleBody = await toggleRes.json();
      expect(toggleBody.success).toBe(true);
      expect(toggleBody.data.productId).toBe(testProduct.id);
      expect(toggleBody.data.previousAvailability).toBe(originalAvailability);
      expect(toggleBody.data.currentAvailability).toBe(!originalAvailability);
      
      // Toggle BACK to original state (cleanup)
      const restoreRes = await fetch("http://localhost:3000/api/service/menu/toggle-availability", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: testProduct.id, available: originalAvailability }),
      });
      expect(restoreRes.status).toBe(200);
      const restoreBody = await restoreRes.json();
      expect(restoreBody.data.currentAvailability).toBe(originalAvailability);
    }, 15000);
  });

  describe("Response format consistency across all service endpoints", () => {
    it("should use the same meta structure across orders, employees, and menu", async () => {
      const token = process.env.MAAMITECH_SERVICE_TOKEN;
      if (!token) return;
      
      const [ordersRes, employeesRes, menuRes] = await Promise.all([
        fetch("http://localhost:3000/api/service/orders?limit=1", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:3000/api/service/employees?limit=1", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:3000/api/service/menu/products?limit=1", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      const [ordersBody, employeesBody, menuBody] = await Promise.all([
        ordersRes.json(),
        employeesRes.json(),
        menuRes.json(),
      ]);
      
      // All should have the same top-level structure
      for (const body of [ordersBody, employeesBody, menuBody]) {
        expect(body).toHaveProperty("success", true);
        expect(body).toHaveProperty("data");
        expect(body).toHaveProperty("meta");
        expect(body.meta).toHaveProperty("total");
        expect(body.meta).toHaveProperty("limit");
        expect(body.meta).toHaveProperty("offset");
        expect(body.meta).toHaveProperty("hasMore");
      }
    }, 15000);
  });
});
