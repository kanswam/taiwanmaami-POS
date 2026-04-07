import { describe, expect, it } from "vitest";
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

describe("customers.getDetails", () => {
  it("returns structured customer details or NOT_FOUND for admin caller", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Try to get details for a user - may or may not exist in test DB
    try {
      const result = await caller.customers.getDetails({ customerId: 1 });
      // If found, verify the response shape
      expect(result).toBeDefined();
      expect(result.type).toBe("registered");
      expect(result).toHaveProperty("totalOrders");
      expect(result).toHaveProperty("totalSpent");
      expect(result).toHaveProperty("stampCount");
      expect(result).toHaveProperty("orders");
      expect(result).toHaveProperty("addresses");
      expect(result).toHaveProperty("rewards");
      expect(result).toHaveProperty("stampHistory");
      expect(Array.isArray(result.orders)).toBe(true);
      expect(Array.isArray(result.addresses)).toBe(true);
      expect(Array.isArray(result.rewards)).toBe(true);
      expect(Array.isArray(result.stampHistory)).toBe(true);
    } catch (e: any) {
      // If user doesn't exist in test DB, should be NOT_FOUND
      expect(e.code).toBe("NOT_FOUND");
    }
  });

  it("rejects non-admin/non-staff callers", async () => {
    const ctx = createCustomerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.customers.getDetails({ customerId: 1 })).rejects.toThrow();
  });

  it("returns guest customer details when queried with guest prefix", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Guest IDs are prefixed with 'guest_' - this may not exist but should handle gracefully
    try {
      const result = await caller.customers.getDetails({ customerId: "guest_1" });
      expect(result).toBeDefined();
      expect(result.type).toBe("guest");
    } catch (e: any) {
      // If guest doesn't exist, it should throw a NOT_FOUND error
      expect(e.code).toBe("NOT_FOUND");
    }
  });
});
