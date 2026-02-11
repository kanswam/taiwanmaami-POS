import { describe, it, expect } from "vitest";
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

function createStaffContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "staff-user",
    email: "staff@example.com",
    name: "Staff User",
    loginMethod: "manus",
    role: "staff",
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

function createUnauthenticatedContext(): TrpcContext {
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

describe("admin.getFullMenuAdmin", () => {
  it("returns all categories, subcategories, and products for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getFullMenuAdmin();

    // Should return the expected shape
    expect(result).toHaveProperty("categories");
    expect(result).toHaveProperty("subcategories");
    expect(result).toHaveProperty("products");
    expect(result).toHaveProperty("addons");
    expect(Array.isArray(result.categories)).toBe(true);
    expect(Array.isArray(result.subcategories)).toBe(true);
    expect(Array.isArray(result.products)).toBe(true);
    expect(Array.isArray(result.addons)).toBe(true);
  });

  it("returns all categories, subcategories, and products for staff", async () => {
    const ctx = createStaffContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getFullMenuAdmin();

    expect(result).toHaveProperty("categories");
    expect(result).toHaveProperty("subcategories");
    expect(result).toHaveProperty("products");
    expect(Array.isArray(result.categories)).toBe(true);
    expect(Array.isArray(result.subcategories)).toBe(true);
    expect(Array.isArray(result.products)).toBe(true);
  });

  it("returns more or equal products than the customer-facing getFullMenu", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const adminMenu = await caller.admin.getFullMenuAdmin();
    const customerMenu = await caller.menu.getFullMenu({ isDelivery: false });

    // Admin menu should always return >= products than customer menu
    // because admin menu doesn't filter by availability
    expect(adminMenu.products.length).toBeGreaterThanOrEqual(customerMenu.products.length);
    expect(adminMenu.subcategories.length).toBeGreaterThanOrEqual(customerMenu.subcategories.length);
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getFullMenuAdmin()).rejects.toThrow();
  });

  it("includes all Iced Beverages subcategories regardless of availability flags", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getFullMenuAdmin();

    // Find Iced Beverages category (id=1)
    const icedBeveragesCat = result.categories.find(c => c.name.includes("Iced") || c.id === 1);
    
    if (icedBeveragesCat) {
      // Get subcategories for this category
      const icedSubs = result.subcategories.filter(s => s.categoryId === icedBeveragesCat.id);
      
      // Should have subcategories (they should not be filtered out)
      expect(icedSubs.length).toBeGreaterThan(0);
      
      // Get products for these subcategories
      const icedSubIds = icedSubs.map(s => s.id);
      const icedProducts = result.products.filter(p => icedSubIds.includes(p.subcategoryId));
      
      // Should have products
      expect(icedProducts.length).toBeGreaterThan(0);
    }
  });
});
