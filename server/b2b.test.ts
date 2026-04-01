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

describe("B2B Sales - Access Control", () => {
  it("denies access to non-admin users for b2b.list", async () => {
    const ctx = createCustomerContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.b2b.list()).rejects.toThrow(/admin|forbidden/i);
  });

  it("denies access to non-admin users for b2b.summary", async () => {
    const ctx = createCustomerContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.b2b.summary()).rejects.toThrow(/admin|forbidden/i);
  });

  it("denies access to non-admin users for b2b.create", async () => {
    const ctx = createCustomerContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.b2b.create({
      invoiceNumber: "TEST-001",
      invoiceDate: "2026-03-31",
      clientName: "Test Client",
      category: "popup_event",
      items: [{ description: "Test item", quantity: 1, unitPrice: 100000 }],
    })).rejects.toThrow(/admin|forbidden/i);
  });

  it("denies access to non-admin users for b2b.delete", async () => {
    const ctx = createCustomerContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.b2b.delete({ id: 1 })).rejects.toThrow(/admin|forbidden/i);
  });

  it("denies access to non-admin users for b2b.updatePayment", async () => {
    const ctx = createCustomerContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.b2b.updatePayment({
      id: 1,
      paymentStatus: "paid",
      amountReceived: 100000,
    })).rejects.toThrow(/admin|forbidden/i);
  });
});

describe("B2B Sales - Admin Operations", () => {
  it("admin can list B2B invoices (returns array)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.b2b.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can get B2B summary (returns correct shape)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.b2b.summary();
    expect(result).toHaveProperty("totalInvoiced");
    expect(result).toHaveProperty("totalReceived");
    expect(result).toHaveProperty("totalOutstanding");
    expect(result).toHaveProperty("totalTds");
    expect(result).toHaveProperty("totalGst");
    expect(result).toHaveProperty("invoiceCount");
    expect(typeof result.totalInvoiced).toBe("number");
    expect(typeof result.invoiceCount).toBe("number");
  });

  it("admin can list with date filters", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.b2b.list({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can list with status filter", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.b2b.list({
      paymentStatus: "unpaid",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can list with category filter", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.b2b.list({
      category: "popup_event",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("b2b.getById throws NOT_FOUND for non-existent invoice", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.b2b.getById({ id: 999999 })).rejects.toThrow(/not found/i);
  });
});

describe("B2B Sales - Input Validation", () => {
  it("rejects create with empty invoice number", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.b2b.create({
      invoiceNumber: "",
      invoiceDate: "2026-03-31",
      clientName: "Test",
      category: "popup_event",
      items: [{ description: "Item", quantity: 1, unitPrice: 10000 }],
    })).rejects.toThrow();
  });

  it("rejects create with empty client name", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.b2b.create({
      invoiceNumber: "INV-001",
      invoiceDate: "2026-03-31",
      clientName: "",
      category: "popup_event",
      items: [{ description: "Item", quantity: 1, unitPrice: 10000 }],
    })).rejects.toThrow();
  });

  it("rejects create with no line items", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.b2b.create({
      invoiceNumber: "INV-001",
      invoiceDate: "2026-03-31",
      clientName: "Test",
      category: "popup_event",
      items: [],
    })).rejects.toThrow();
  });

  it("rejects create with invalid category", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.b2b.create({
      invoiceNumber: "INV-001",
      invoiceDate: "2026-03-31",
      clientName: "Test",
      category: "invalid_category" as any,
      items: [{ description: "Item", quantity: 1, unitPrice: 10000 }],
    })).rejects.toThrow();
  });

  it("rejects updatePayment with invalid status", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.b2b.updatePayment({
      id: 1,
      paymentStatus: "invalid" as any,
      amountReceived: 10000,
    })).rejects.toThrow();
  });
});

describe("B2B Sales - GST Report Integration", () => {
  it("GST report returns b2bSummary field", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analytics.getGstReport({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      groupBy: "daily",
    });
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("details");
    expect(result).toHaveProperty("b2bSummary");
    expect(result.b2bSummary).toHaveProperty("totalTaxableValue");
    expect(result.b2bSummary).toHaveProperty("totalCgst");
    expect(result.b2bSummary).toHaveProperty("totalSgst");
    expect(result.b2bSummary).toHaveProperty("totalIgst");
    expect(result.b2bSummary).toHaveProperty("totalGst");
    expect(result.b2bSummary).toHaveProperty("invoiceCount");
  });
});
