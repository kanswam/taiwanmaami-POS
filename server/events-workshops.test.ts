import { describe, expect, it, vi, beforeEach } from "vitest";
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
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
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
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Events Router", () => {
  describe("events.submitInquiry", () => {
    it("allows public users to submit event inquiries", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.events.submitInquiry({
        customerName: "Test Customer",
        email: "test@example.com",
        phone: "9876543210",
        eventType: "corporate",
        eventDate: "2026-02-15",
        eventTime: "18:00",
        venue: "Test Venue",
        guestCount: 100,
        serviceType: "both",
        specialRequirements: "Vegetarian options needed",
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("id");
    });

    it("validates required fields for event inquiry", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.events.submitInquiry({
          customerName: "",
          email: "test@example.com",
          phone: "9876543210",
          eventType: "corporate",
          eventDate: "2026-02-15",
          eventTime: "18:00",
          venue: "Test Venue",
          guestCount: 100,
          serviceType: "both",
        })
      ).rejects.toThrow();
    });
  });

  describe("events.getInquiries", () => {
    it("allows admin to get all inquiries", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.events.getInquiries({ status: "all" });

      expect(Array.isArray(result)).toBe(true);
    });

    it("denies non-admin users from getting inquiries", async () => {
      const ctx = createCustomerContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.events.getInquiries({ status: "all" })).rejects.toThrow();
    });
  });

  describe("events.createOrder", () => {
    it("allows admin to create event orders", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.events.createOrder({
        customerName: "Test Customer",
        customerEmail: "test@example.com",
        customerPhone: "9876543210",
        eventType: "wedding",
        eventDate: "2026-03-20",
        venue: "Wedding Hall",
        guestCount: 200,
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("orderNumber");
      expect(result.orderNumber).toMatch(/^EVT/);
    });

    it("denies non-admin users from creating event orders", async () => {
      const ctx = createCustomerContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.events.createOrder({
          customerName: "Test Customer",
          customerEmail: "test@example.com",
          customerPhone: "9876543210",
          eventType: "wedding",
          eventDate: "2026-03-20",
          venue: "Wedding Hall",
          guestCount: 200,
        })
      ).rejects.toThrow();
    });
  });

  describe("events.getOrders", () => {
    it("allows admin to get all event orders", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.events.getOrders({ status: "all" });

      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("Workshops Router", () => {
  describe("workshops.getPublished", () => {
    it("allows public users to view published workshops", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workshops.getPublished();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("workshops.create", () => {
    it("allows admin to create workshops", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workshops.create({
        title: "Test Workshop",
        description: "A test workshop description",
        instructorName: "Test Instructor",
        workshopDate: "2026-02-20",
        startTime: "10:00",
        endTime: "13:00",
        venue: "Test Venue",
        totalCapacity: 20,
        price: 150000, // ₹1500 in paise
        status: "draft",
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("id");
    });

    it("denies non-admin users from creating workshops", async () => {
      const ctx = createCustomerContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.workshops.create({
          title: "Test Workshop",
          description: "A test workshop description",
          instructorName: "Test Instructor",
          workshopDate: "2026-02-20",
          startTime: "10:00",
          endTime: "13:00",
          venue: "Test Venue",
          totalCapacity: 20,
          price: 150000,
          status: "draft",
        })
      ).rejects.toThrow();
    });
  });

  describe("workshops.getAll", () => {
    it("allows admin to get all workshops", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.workshops.getAll();

      expect(Array.isArray(result)).toBe(true);
    });

    it("denies non-admin users from getting all workshops", async () => {
      const ctx = createCustomerContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.workshops.getAll()).rejects.toThrow();
    });
  });

  describe("workshops.bookTicket", () => {
    it("validates required fields for booking", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // This should fail because workshopId doesn't exist
      await expect(
        caller.workshops.bookTicket({
          workshopId: 99999,
          customerName: "Test Customer",
          customerEmail: "test@example.com",
          customerPhone: "9876543210",
          ticketCount: 2,
        })
      ).rejects.toThrow();
    });
  });

  describe("workshops.getBookings", () => {
    it("allows admin to get workshop bookings", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // This may return empty array if no bookings exist
      const result = await caller.workshops.getBookings({ workshopId: 1 });

      expect(Array.isArray(result)).toBe(true);
    });

    it("denies non-admin users from getting bookings", async () => {
      const ctx = createCustomerContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.workshops.getBookings({ workshopId: 1 })).rejects.toThrow();
    });
  });
});
