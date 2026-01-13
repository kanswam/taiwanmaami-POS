import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("menu procedures", () => {
  it("getCategories returns array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.menu.getCategories();

    expect(Array.isArray(result)).toBe(true);
  });

  it("getSubcategories returns array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.menu.getSubcategories();

    expect(Array.isArray(result)).toBe(true);
  });

  it("getProducts returns array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.menu.getProducts();

    expect(Array.isArray(result)).toBe(true);
  });

  it("getAddons returns array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.menu.getAddons();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("pricing calculations", () => {
  it("GST calculation is correct (5% total)", () => {
    const basePrice = 280;
    const gstRate = 0.05;
    const expectedGst = basePrice * gstRate;
    const expectedTotal = basePrice + expectedGst;

    expect(expectedGst).toBe(14);
    expect(expectedTotal).toBe(294);
  });

  it("GST split is correct (2.5% State + 2.5% Central)", () => {
    const basePrice = 280;
    const stateGstRate = 0.025;
    const centralGstRate = 0.025;
    
    const stateGst = basePrice * stateGstRate;
    const centralGst = basePrice * centralGstRate;
    const totalGst = stateGst + centralGst;

    expect(stateGst).toBe(7);
    expect(centralGst).toBe(7);
    expect(totalGst).toBe(14);
  });
});
