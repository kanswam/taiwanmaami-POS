import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
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

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
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

describe("audit.getProductLogs", () => {
  it("returns audit logs for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.audit.getProductLogs();

    expect(result).toHaveProperty("logs");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.logs)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("filters logs by action type", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.audit.getProductLogs({
      action: "update",
      limit: 10,
    });

    expect(result).toHaveProperty("logs");
    // All returned logs should have action = 'update' (if any exist)
    result.logs.forEach((log) => {
      expect(log.action).toBe("update");
    });
  });

  it("filters logs by date range", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

    const result = await caller.audit.getProductLogs({
      startDate,
      endDate: endDate + "T23:59:59",
      limit: 50,
    });

    expect(result).toHaveProperty("logs");
    expect(result).toHaveProperty("total");
  });

  it("denies access to non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.audit.getProductLogs()).rejects.toThrow();
  });
});

describe("audit.getSummary", () => {
  it("returns summary statistics for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.audit.getSummary();

    expect(result).toHaveProperty("byAction");
    expect(result).toHaveProperty("byUser");
    expect(result).toHaveProperty("recentChanges");
    expect(Array.isArray(result.byAction)).toBe(true);
    expect(Array.isArray(result.byUser)).toBe(true);
    expect(Array.isArray(result.recentChanges)).toBe(true);
  });

  it("denies access to non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.audit.getSummary()).rejects.toThrow();
  });
});

describe("audit.getProductHistory", () => {
  it("returns history for a specific product", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Use product ID 1 (should exist in database)
    const result = await caller.audit.getProductHistory({ productId: 1 });

    expect(Array.isArray(result)).toBe(true);
  });

  it("denies access to non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.audit.getProductHistory({ productId: 1 })).rejects.toThrow();
  });
});

describe("admin.getAllProducts", () => {
  it("returns all products including inactive ones for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getAllProducts();

    expect(Array.isArray(result)).toBe(true);
    // Should include both active and inactive products
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("isActive");
    }
  });

  it("denies access to non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getAllProducts()).rejects.toThrow();
  });
});
