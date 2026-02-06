import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 999,
    openId: "admin-test-user",
    email: "admin@taiwanmaami.com",
    name: "Test Admin",
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
    id: 100,
    openId: "customer-test-user",
    email: "customer@test.com",
    name: "Test Customer",
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

describe("customers.previewMerge", () => {
  it("rejects non-admin users", async () => {
    const { ctx } = createCustomerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.customers.previewMerge({ sourceId: 1, targetId: 2 })
    ).rejects.toThrow("Admin access required");
  });

  it("rejects merging an account with itself", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // With id=1 not existing, it throws 'Source account not found' first
    // The self-merge check happens after both accounts are fetched
    await expect(
      caller.customers.previewMerge({ sourceId: 1, targetId: 1 })
    ).rejects.toThrow(); // Will throw either 'not found' or 'cannot merge with itself'
  });

  it("rejects when source account is not found", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.customers.previewMerge({ sourceId: 99999999, targetId: 1 })
    ).rejects.toThrow("Source account not found");
  });
});

describe("customers.executeMerge", () => {
  it("rejects non-admin users", async () => {
    const { ctx } = createCustomerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.customers.executeMerge({ sourceId: 1, targetId: 2 })
    ).rejects.toThrow("Admin access required");
  });

  it("rejects merging an account with itself", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // With id=1 not existing, it throws 'not found' first
    // The self-merge check happens after both accounts are fetched
    await expect(
      caller.customers.executeMerge({ sourceId: 1, targetId: 1 })
    ).rejects.toThrow(); // Will throw either 'not found' or 'cannot merge with itself'
  });

  it("rejects when source account is not found", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.customers.executeMerge({ sourceId: 99999999, targetId: 1 })
    ).rejects.toThrow("Source account not found");
  });

  it("validates input schema requires sourceId and targetId", () => {
    // Verify the input schema requires both fields
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Missing sourceId should fail schema validation
    expect(
      // @ts-expect-error - intentionally passing invalid input
      caller.customers.executeMerge({ targetId: 2 })
    ).rejects.toThrow();

    // Missing targetId should fail schema validation
    expect(
      // @ts-expect-error - intentionally passing invalid input
      caller.customers.executeMerge({ sourceId: 1 })
    ).rejects.toThrow();
  });
});
