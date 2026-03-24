import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Create context for public procedures (no user)
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// Create context for admin procedures
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

// Create context for regular user
function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
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

describe("Events Router - Input Validation", () => {
  it("validates required fields for inquiry submission", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Missing required fields should throw
    await expect(
      caller.events.submitInquiry({
        customerName: "", // Empty name should fail
        email: "test@example.com",
        phone: "9876543210",
        eventType: "wedding",
        eventDate: "2026-03-15",
        eventTime: "18:00",
        venue: "Test Venue",
        guestCount: 50,
        serviceType: "beverages_only",
      })
    ).rejects.toThrow();
  });

  it("validates email format for inquiry submission", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Invalid email should throw
    await expect(
      caller.events.submitInquiry({
        customerName: "Test User",
        email: "invalid-email", // Invalid email format
        phone: "9876543210",
        eventType: "wedding",
        eventDate: "2026-03-15",
        eventTime: "18:00",
        venue: "Test Venue",
        guestCount: 50,
        serviceType: "beverages_only",
      })
    ).rejects.toThrow();
  });

  it("validates phone number length for inquiry submission", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Short phone number should throw
    await expect(
      caller.events.submitInquiry({
        customerName: "Test User",
        email: "test@example.com",
        phone: "123", // Too short
        eventType: "wedding",
        eventDate: "2026-03-15",
        eventTime: "18:00",
        venue: "Test Venue",
        guestCount: 50,
        serviceType: "beverages_only",
      })
    ).rejects.toThrow();
  });

  it("validates guest count is positive", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Zero or negative guest count should throw
    await expect(
      caller.events.submitInquiry({
        customerName: "Test User",
        email: "test@example.com",
        phone: "9876543210",
        eventType: "wedding",
        eventDate: "2026-03-15",
        eventTime: "18:00",
        venue: "Test Venue",
        guestCount: 0, // Zero guests
        serviceType: "beverages_only",
      })
    ).rejects.toThrow();
  });
});

describe("Events Router - Access Control", () => {
  it("non-admin cannot access getInquiries", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.events.getInquiries()).rejects.toThrow();
  });

  it("non-admin cannot access getOrders", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.events.getOrders()).rejects.toThrow();
  });

  it("public user cannot access admin procedures", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.events.getInquiries()).rejects.toThrow();
  });
});

describe("Workshops Router - Input Validation", () => {
  it("validates ticket count is positive", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Zero tickets should throw
    await expect(
      caller.workshops.bookTickets({
        workshopId: 1,
        customerName: "Test User",
        customerEmail: "test@example.com",
        customerPhone: "9876543210",
        ticketCount: 0, // Zero tickets
      })
    ).rejects.toThrow();
  });

  it("validates ticket count does not exceed maximum", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // More than 5 tickets should throw
    await expect(
      caller.workshops.bookTickets({
        workshopId: 1,
        customerName: "Test User",
        customerEmail: "test@example.com",
        customerPhone: "9876543210",
        ticketCount: 10, // Exceeds max of 5
      })
    ).rejects.toThrow();
  });
});

describe("Workshops Router - Access Control", () => {
  it("public can access getPublished", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // This should not throw (public access)
    const result = await caller.workshops.getPublished();
    expect(Array.isArray(result)).toBe(true);
  });

  it("non-admin cannot access getAll workshops", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.workshops.getAll()).rejects.toThrow();
  });

  it("non-admin cannot create workshops", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.workshops.create({
        title: "Test Workshop",
        description: "Test description",
        instructorName: "Test Instructor",
        workshopDate: "2026-03-01",
        startTime: "10:00",
        endTime: "12:00",
        venue: "Test Venue",
        totalCapacity: 10,
        price: 100000,
        status: "draft",
      })
    ).rejects.toThrow();
  });
});
