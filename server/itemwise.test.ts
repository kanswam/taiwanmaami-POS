import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@taiwanmaami.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createCustomerContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "customer-user",
    email: "customer@example.com",
    name: "Customer User",
    loginMethod: "manus",
    role: "customer",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("analytics.getItemwiseSalesReport", () => {
  it("returns itemwise report for admin user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.getItemwiseSalesReport({
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      orderType: "all",
    });

    // Should return the expected shape
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("summary");
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.summary).toHaveProperty("totalItems");
    expect(result.summary).toHaveProperty("totalQuantity");
    expect(result.summary).toHaveProperty("totalRevenue");
    expect(result.summary).toHaveProperty("totalOrders");
    expect(typeof result.summary.totalItems).toBe("number");
    expect(typeof result.summary.totalQuantity).toBe("number");
    expect(typeof result.summary.totalRevenue).toBe("number");
    expect(typeof result.summary.totalOrders).toBe("number");
  });

  it("returns items with correct fields", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.getItemwiseSalesReport({
      startDate: "2026-01-01",
      endDate: "2026-02-28",
      orderType: "all",
    });

    if (result.items.length > 0) {
      const item = result.items[0];
      expect(item).toHaveProperty("productId");
      expect(item).toHaveProperty("productName");
      expect(item).toHaveProperty("size");
      expect(item).toHaveProperty("categoryName");
      expect(item).toHaveProperty("subcategoryName");
      expect(item).toHaveProperty("quantity");
      expect(item).toHaveProperty("revenue");
      expect(item).toHaveProperty("avgPrice");
      expect(item).toHaveProperty("orderCount");
      expect(item).toHaveProperty("revenueShare");
      expect(item).toHaveProperty("quantityShare");
      expect(typeof item.quantity).toBe("number");
      expect(typeof item.revenue).toBe("number");
      expect(item.quantity).toBeGreaterThan(0);
    }
  });

  it("filters by category when categoryId is provided", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const allResult = await caller.analytics.getItemwiseSalesReport({
      startDate: "2026-01-01",
      endDate: "2026-02-28",
      orderType: "all",
    });

    // If there are items, try filtering by the first item's category
    if (allResult.items.length > 0) {
      const categoryId = allResult.items[0].categoryId;
      const filteredResult = await caller.analytics.getItemwiseSalesReport({
        startDate: "2026-01-01",
        endDate: "2026-02-28",
        orderType: "all",
        categoryId,
      });

      expect(filteredResult.items.length).toBeLessThanOrEqual(allResult.items.length);
      // All filtered items should belong to the same category
      for (const item of filteredResult.items) {
        expect(item.categoryId).toBe(categoryId);
      }
    }
  });

  it("filters by order type", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const deliveryResult = await caller.analytics.getItemwiseSalesReport({
      startDate: "2026-01-01",
      endDate: "2026-02-28",
      orderType: "delivery",
    });

    expect(deliveryResult).toHaveProperty("items");
    expect(deliveryResult).toHaveProperty("summary");
    expect(Array.isArray(deliveryResult.items)).toBe(true);
  });

  it("returns empty results for future date range", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.getItemwiseSalesReport({
      startDate: "2030-01-01",
      endDate: "2030-12-31",
      orderType: "all",
    });

    expect(result.items).toHaveLength(0);
    expect(result.summary.totalItems).toBe(0);
    expect(result.summary.totalQuantity).toBe(0);
    expect(result.summary.totalRevenue).toBe(0);
  });

  it("rejects non-admin users", async () => {
    const ctx = createCustomerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.analytics.getItemwiseSalesReport({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        orderType: "all",
      })
    ).rejects.toThrow();
  });

  it("revenue shares sum to approximately 100%", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.getItemwiseSalesReport({
      startDate: "2026-01-01",
      endDate: "2026-02-28",
      orderType: "all",
    });

    if (result.items.length > 0) {
      const totalRevenueShare = result.items.reduce((sum, i) => sum + i.revenueShare, 0);
      const totalQuantityShare = result.items.reduce((sum, i) => sum + i.quantityShare, 0);
      // Allow for rounding errors
      expect(totalRevenueShare).toBeGreaterThan(95);
      expect(totalRevenueShare).toBeLessThan(105);
      expect(totalQuantityShare).toBeGreaterThan(95);
      expect(totalQuantityShare).toBeLessThan(105);
    }
  });
});
