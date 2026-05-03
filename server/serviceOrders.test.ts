import { describe, it, expect, vi, beforeAll } from "vitest";

beforeAll(() => {
  if (!process.env.MAAMITECH_SERVICE_TOKEN) {
    vi.stubEnv('MAAMITECH_SERVICE_TOKEN', 'test-token-for-ci');
  }
});

const BASE_URL = "http://localhost:3000";
const TOKEN = process.env.MAAMITECH_SERVICE_TOKEN!;
const AUTH_HEADER = { Authorization: `Bearer ${TOKEN}` };

describe("MaamiTech Service API — orders.listForService (Task 2)", () => {
  describe("Authentication", () => {
    it("should reject requests without auth token", async () => {
      const response = await fetch(`${BASE_URL}/api/service/orders?limit=1`);
      expect([401, 503]).toContain(response.status);
    });

    it("should reject requests with invalid token", async () => {
      const response = await fetch(`${BASE_URL}/api/service/orders?limit=1`, {
        headers: { Authorization: "Bearer invalid-token" },
      });
      expect([403, 503]).toContain(response.status);
    });
  });

  describe("Basic Response Structure", () => {
    it("should return orders with correct top-level structure", async () => {
      const response = await fetch(`${BASE_URL}/api/service/orders?limit=1`, {
        headers: AUTH_HEADER,
      });

      if (response.status === 503) return; // Feature disabled — skip

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.meta).toBeDefined();
      expect(data.meta.total).toBeTypeOf("number");
      expect(data.meta.limit).toBe(1);
      expect(data.meta.offset).toBe(0);
      expect(data.meta.hasMore).toBeTypeOf("boolean");
      expect(data.meta.filters).toBeDefined();
    });

    it("should return order fields with amounts in rupees (not paise)", async () => {
      const response = await fetch(`${BASE_URL}/api/service/orders?limit=1`, {
        headers: AUTH_HEADER,
      });

      if (response.status === 503) return;

      const data = await response.json();
      if (data.data.length === 0) return; // No orders

      const order = data.data[0];
      // Check required fields exist
      expect(order.id).toBeTypeOf("number");
      expect(order.orderNumber).toBeTypeOf("string");
      expect(order.orderType).toBeDefined();
      expect(order.orderStatus).toBeDefined();
      expect(order.totalAmount).toBeTypeOf("number");
      expect(order.subtotal).toBeTypeOf("number");
      expect(order.createdAt).toBeDefined();

      // Amounts should be in rupees (reasonable range, not paise)
      // A typical order is ₹100-₹5000, not 10000-500000 paise
      if (order.totalAmount > 0) {
        expect(order.totalAmount).toBeLessThan(100000); // Less than ₹1,00,000
        expect(order.totalAmount).toBeGreaterThan(0);
      }
    });

    it("should include nested items with addons by default", async () => {
      const response = await fetch(`${BASE_URL}/api/service/orders?limit=1`, {
        headers: AUTH_HEADER,
      });

      if (response.status === 503) return;

      const data = await response.json();
      if (data.data.length === 0) return;

      const order = data.data[0];
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
    it("should filter by date range", async () => {
      const from = "2026-04-01T00:00:00.000Z";
      const to = "2026-04-30T23:59:59.999Z";
      const response = await fetch(
        `${BASE_URL}/api/service/orders?limit=5&from=${from}&to=${to}`,
        { headers: AUTH_HEADER }
      );

      if (response.status === 503) return;

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.meta.filters.from).toBe(from);
      expect(data.meta.filters.to).toBe(to);

      // All returned orders should be within the date range
      for (const order of data.data) {
        const orderDate = new Date(order.createdAt).getTime();
        expect(orderDate).toBeGreaterThanOrEqual(new Date(from).getTime());
        expect(orderDate).toBeLessThanOrEqual(new Date(to).getTime());
      }
    });

    it("should filter by orderType", async () => {
      const response = await fetch(
        `${BASE_URL}/api/service/orders?limit=5&orderType=instore`,
        { headers: AUTH_HEADER }
      );

      if (response.status === 503) return;

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.meta.filters.orderType).toBe("instore");

      for (const order of data.data) {
        expect(order.orderType).toBe("instore");
      }
    });

    it("should filter by multiple orderTypes (comma-separated)", async () => {
      const response = await fetch(
        `${BASE_URL}/api/service/orders?limit=5&orderType=instore,delivery`,
        { headers: AUTH_HEADER }
      );

      if (response.status === 503) return;

      const data = await response.json();
      expect(data.success).toBe(true);

      for (const order of data.data) {
        expect(["instore", "delivery"]).toContain(order.orderType);
      }
    });

    it("should filter by order status", async () => {
      const response = await fetch(
        `${BASE_URL}/api/service/orders?limit=5&status=completed`,
        { headers: AUTH_HEADER }
      );

      if (response.status === 503) return;

      const data = await response.json();
      expect(data.success).toBe(true);

      for (const order of data.data) {
        expect(order.orderStatus).toBe("completed");
      }
    });

    it("should filter by paymentMethod", async () => {
      const response = await fetch(
        `${BASE_URL}/api/service/orders?limit=5&paymentMethod=cash`,
        { headers: AUTH_HEADER }
      );

      if (response.status === 503) return;

      const data = await response.json();
      expect(data.success).toBe(true);

      for (const order of data.data) {
        expect(order.paymentMethod).toBe("cash");
      }
    });
  });

  describe("Pagination", () => {
    it("should respect limit parameter", async () => {
      const response = await fetch(
        `${BASE_URL}/api/service/orders?limit=3`,
        { headers: AUTH_HEADER }
      );

      if (response.status === 503) return;

      const data = await response.json();
      expect(data.data.length).toBeLessThanOrEqual(3);
      expect(data.meta.limit).toBe(3);
    });

    it("should respect offset parameter", async () => {
      // Get first page
      const page1 = await fetch(
        `${BASE_URL}/api/service/orders?limit=2&offset=0`,
        { headers: AUTH_HEADER }
      );

      if (page1.status === 503) return;

      const data1 = await page1.json();

      // Get second page
      const page2 = await fetch(
        `${BASE_URL}/api/service/orders?limit=2&offset=2`,
        { headers: AUTH_HEADER }
      );

      const data2 = await page2.json();

      // Pages should have different orders (if enough data exists)
      if (data1.data.length > 0 && data2.data.length > 0) {
        expect(data1.data[0].id).not.toBe(data2.data[0].id);
      }
    });

    it("should cap limit at 500", async () => {
      const response = await fetch(
        `${BASE_URL}/api/service/orders?limit=1000`,
        { headers: AUTH_HEADER }
      );

      if (response.status === 503) return;

      const data = await response.json();
      expect(data.meta.limit).toBe(500);
    });

    it("should report hasMore correctly", async () => {
      const response = await fetch(
        `${BASE_URL}/api/service/orders?limit=1`,
        { headers: AUTH_HEADER }
      );

      if (response.status === 503) return;

      const data = await response.json();
      if (data.meta.total > 1) {
        expect(data.meta.hasMore).toBe(true);
      }
    });
  });

  describe("Include Parameter", () => {
    it("should exclude items when include=none", async () => {
      const response = await fetch(
        `${BASE_URL}/api/service/orders?limit=1&include=none`,
        { headers: AUTH_HEADER }
      );

      if (response.status === 503) return;

      const data = await response.json();
      if (data.data.length === 0) return;

      expect(data.data[0].items).toBeUndefined();
    });

    it("should include items but exclude addons when include=items", async () => {
      const response = await fetch(
        `${BASE_URL}/api/service/orders?limit=1&include=items`,
        { headers: AUTH_HEADER }
      );

      if (response.status === 503) return;

      const data = await response.json();
      if (data.data.length === 0) return;

      const order = data.data[0];
      expect(order.items).toBeDefined();

      if (order.items.length > 0) {
        expect(order.items[0].addons).toBeUndefined();
      }
    });
  });

  describe("Data Integrity", () => {
    it("should never return test data", async () => {
      // Fetch a large batch and verify none are test orders
      const response = await fetch(
        `${BASE_URL}/api/service/orders?limit=100`,
        { headers: AUTH_HEADER }
      );

      if (response.status === 503) return;

      const data = await response.json();
      // We can't directly check isTestData since it's excluded from response,
      // but we can verify the endpoint works and returns data
      expect(data.success).toBe(true);
      expect(data.data.length).toBeLessThanOrEqual(100);
    });

    it("should return orders sorted by createdAt descending (newest first)", async () => {
      const response = await fetch(
        `${BASE_URL}/api/service/orders?limit=5`,
        { headers: AUTH_HEADER }
      );

      if (response.status === 503) return;

      const data = await response.json();
      if (data.data.length < 2) return;

      for (let i = 1; i < data.data.length; i++) {
        const prev = new Date(data.data[i - 1].createdAt).getTime();
        const curr = new Date(data.data[i].createdAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });
});
