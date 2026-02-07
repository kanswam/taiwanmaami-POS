import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
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

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createCustomerContext(): { ctx: TrpcContext } {
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

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("analytics.getWebsiteTraffic", () => {
  it("returns traffic data for admin users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.getWebsiteTraffic({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });

    // Should return the expected shape
    expect(result).toHaveProperty("stats");
    expect(result).toHaveProperty("pageviews");
    expect(result).toHaveProperty("referrers");
    expect(result).toHaveProperty("browsers");
    expect(result).toHaveProperty("os");
    expect(result).toHaveProperty("devices");
    expect(result).toHaveProperty("pages");
    expect(result).toHaveProperty("entries");
    expect(result).toHaveProperty("channels");
    expect(result.error).toBeNull();

    // Stats should have the correct structure
    if (result.stats) {
      expect(result.stats).toHaveProperty("pageviews");
      expect(result.stats).toHaveProperty("visitors");
      expect(result.stats).toHaveProperty("visits");
      expect(result.stats).toHaveProperty("totaltime");
      expect(result.stats.pageviews).toHaveProperty("value");
      expect(result.stats.visitors).toHaveProperty("value");
      expect(typeof result.stats.pageviews.value).toBe("number");
      expect(typeof result.stats.visitors.value).toBe("number");
    }

    // Arrays should be arrays
    expect(Array.isArray(result.referrers)).toBe(true);
    expect(Array.isArray(result.browsers)).toBe(true);
    expect(Array.isArray(result.devices)).toBe(true);
    expect(Array.isArray(result.pages)).toBe(true);
    expect(Array.isArray(result.entries)).toBe(true);
    expect(Array.isArray(result.channels)).toBe(true);
  });

  it("returns data with correct pageview counts from test data", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Query for a wide date range that should include our test data
    const result = await caller.analytics.getWebsiteTraffic({
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });

    // We inserted test data, so there should be pageviews
    expect(result.stats).not.toBeNull();
    if (result.stats) {
      expect(result.stats.pageviews.value).toBeGreaterThan(0);
      expect(result.stats.visitors.value).toBeGreaterThan(0);
      expect(result.stats.visits.value).toBeGreaterThan(0);
    }

    // Should have page data
    expect(result.pages.length).toBeGreaterThan(0);

    // Pages should have x (url) and y (count) properties
    if (result.pages.length > 0) {
      expect(result.pages[0]).toHaveProperty("x");
      expect(result.pages[0]).toHaveProperty("y");
      expect(typeof result.pages[0].x).toBe("string");
      expect(typeof result.pages[0].y).toBe("number");
    }
  });

  it("rejects non-admin users", async () => {
    const { ctx } = createCustomerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.analytics.getWebsiteTraffic({
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      })
    ).rejects.toThrow();
  });

  it("returns empty data for date range with no pageviews", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Query for a date range in the past with no data
    const result = await caller.analytics.getWebsiteTraffic({
      startDate: "2020-01-01",
      endDate: "2020-01-31",
    });

    expect(result.error).toBeNull();
    if (result.stats) {
      expect(result.stats.pageviews.value).toBe(0);
      expect(result.stats.visitors.value).toBe(0);
      expect(result.stats.visits.value).toBe(0);
    }
    expect(result.pages).toHaveLength(0);
    expect(result.referrers).toHaveLength(0);
  });
});
