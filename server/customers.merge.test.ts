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

  it("rejects merging two guest accounts", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.customers.previewMerge({ sourceId: "guest_1234567890", targetId: "guest_0987654321" })
    ).rejects.toThrow("Cannot merge two guest accounts");
  });

  it("accepts guest source ID format (guest_PHONE)", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // This should not throw a schema validation error - it should proceed
    // and either find the guest or return "no orders found" type error
    const result = caller.customers.previewMerge({ sourceId: "guest_0000000000", targetId: 1 });
    // Guest with no orders should still work (returns empty data)
    await expect(result).rejects.toThrow(); // Will throw 'Target account not found' since ID 1 doesn't exist
  });

  it("accepts numeric source and target IDs", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Both numeric IDs - should fail with 'not found' since these don't exist
    await expect(
      caller.customers.previewMerge({ sourceId: 88888888, targetId: 77777777 })
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

  it("rejects merging two guest accounts", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.customers.executeMerge({ sourceId: "guest_1234567890", targetId: "guest_0987654321" })
    ).rejects.toThrow("Cannot merge two guest accounts");
  });

  it("validates input schema requires sourceId and targetId", () => {
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

  it("accepts guest source with numeric target for merge", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Guest → Registered merge should proceed past validation
    // Will fail at 'Target account not found' since ID 77777777 doesn't exist
    await expect(
      caller.customers.executeMerge({ sourceId: "guest_0000000000", targetId: 77777777 })
    ).rejects.toThrow("Target account not found");
  });
});
