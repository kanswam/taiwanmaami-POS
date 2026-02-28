import { describe, expect, it, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Use a unique prefix so we can safely clean up after tests
const TEST_EMAIL_PREFIX = "vitest-popup-";
const TEST_EMAIL_1 = `${TEST_EMAIL_PREFIX}dinner@test-cleanup.local`;
const TEST_EMAIL_2 = `${TEST_EMAIL_PREFIX}masterclass@test-cleanup.local`;

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
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

// Clean up any test entries after all tests complete
afterAll(async () => {
  try {
    const db = await getDb();
    if (db) {
      await db.execute(
        sql`DELETE FROM popup_registrations WHERE customerEmail LIKE ${TEST_EMAIL_PREFIX + '%'}`
      );
    }
  } catch (e) {
    // Cleanup is best-effort
  }
});

describe("popup.registerInterest", () => {
  it("successfully registers interest for dinner and cleans up", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.popup.registerInterest({
      eventSlug: "leela-hyderabad-march-2026",
      customerName: "Vitest Dinner User",
      customerEmail: TEST_EMAIL_1,
      customerPhone: "+919876543210",
      eventType: "dinner",
      selectedDate: "2026-03-05",
      numberOfGuests: 2,
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("id");
    expect(result.id).toBeGreaterThan(0);

    // Immediately clean up the inserted row
    const db = await getDb();
    if (db) {
      await db.execute(sql`DELETE FROM popup_registrations WHERE id = ${result.id}`);
    }
  });

  it("successfully registers interest for masterclass and cleans up", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.popup.registerInterest({
      eventSlug: "leela-hyderabad-march-2026",
      customerName: "Vitest Masterclass User",
      customerEmail: TEST_EMAIL_2,
      customerPhone: "+919876543211",
      eventType: "masterclass",
      selectedDate: "2026-03-07",
      numberOfGuests: 1,
      specialRequirements: "Vegetarian only",
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("id");

    // Immediately clean up the inserted row
    const db = await getDb();
    if (db) {
      await db.execute(sql`DELETE FROM popup_registrations WHERE id = ${result.id}`);
    }
  });

  it("rejects registration with invalid email", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.popup.registerInterest({
        eventSlug: "leela-hyderabad-march-2026",
        customerName: "Test User",
        customerEmail: "not-an-email",
        customerPhone: "+919876543210",
        eventType: "dinner",
        selectedDate: "2026-03-05",
        numberOfGuests: 1,
      })
    ).rejects.toThrow();
  });

  it("rejects registration with empty name", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.popup.registerInterest({
        eventSlug: "leela-hyderabad-march-2026",
        customerName: "",
        customerEmail: TEST_EMAIL_1,
        customerPhone: "+919876543210",
        eventType: "dinner",
        selectedDate: "2026-03-05",
        numberOfGuests: 1,
      })
    ).rejects.toThrow();
  });

  it("rejects registration with invalid event type", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.popup.registerInterest({
        eventSlug: "leela-hyderabad-march-2026",
        customerName: "Test User",
        customerEmail: TEST_EMAIL_1,
        customerPhone: "+919876543210",
        eventType: "brunch" as any,
        selectedDate: "2026-03-05",
        numberOfGuests: 1,
      })
    ).rejects.toThrow();
  });
});

describe("popup.getRegistrations", () => {
  it("requires admin access", async () => {
    const { ctx } = createCustomerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.popup.getRegistrations({
        eventSlug: "leela-hyderabad-march-2026",
      })
    ).rejects.toThrow();
  });

  it("returns registrations for admin", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.popup.getRegistrations({
      eventSlug: "leela-hyderabad-march-2026",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("filters by event type", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const dinnerResults = await caller.popup.getRegistrations({
      eventSlug: "leela-hyderabad-march-2026",
      eventType: "dinner",
    });

    expect(Array.isArray(dinnerResults)).toBe(true);
    for (const reg of dinnerResults) {
      expect(reg.eventType).toBe("dinner");
    }
  });
});

describe("popup.updateRegistrationStatus", () => {
  it("requires admin access", async () => {
    const { ctx } = createCustomerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.popup.updateRegistrationStatus({
        id: 1,
        status: "confirmed",
      })
    ).rejects.toThrow();
  });
});
