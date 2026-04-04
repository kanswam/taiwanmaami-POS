import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 99,
    openId: "test-admin",
    email: "admin@test.com",
    name: "Test Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createStaffContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 98,
    openId: "test-staff",
    email: "staff@test.com",
    name: "Test Staff",
    loginMethod: "manus",
    role: "staff",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createCustomerContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 100,
    openId: "test-customer",
    email: "customer@test.com",
    name: "Test Customer",
    loginMethod: "manus",
    role: "customer",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("orders.mergeOrders", () => {
  it("rejects non-admin users", async () => {
    const ctx = createCustomerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.orders.mergeOrders({
        primaryOrderId: 1,
        secondaryOrderIds: [2],
      })
    ).rejects.toThrow();
  });

  it("requires at least one secondary order", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Zod validation should reject empty array
    await expect(
      caller.orders.mergeOrders({
        primaryOrderId: 1,
        secondaryOrderIds: [],
      })
    ).rejects.toThrow();
  });

  it("rejects when primary order is not found", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.orders.mergeOrders({
        primaryOrderId: 999999,
        secondaryOrderIds: [999998],
      })
    ).rejects.toThrow(/not found/i);
  });

  it("allows staff users to call mergeOrders", async () => {
    const ctx = createStaffContext();
    const caller = appRouter.createCaller(ctx);

    // Should fail with "not found" (not "forbidden"), proving staff has access
    await expect(
      caller.orders.mergeOrders({
        primaryOrderId: 999999,
        secondaryOrderIds: [999998],
      })
    ).rejects.toThrow(/not found/i);
  });
});
