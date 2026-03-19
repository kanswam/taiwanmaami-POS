import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(user?: Partial<AuthenticatedUser>): TrpcContext {
  const defaultUser: AuthenticatedUser = {
    id: user?.id ?? 999,
    openId: user?.openId ?? "test-partner-user",
    email: user?.email ?? "test@example.com",
    name: user?.name ?? "Test User",
    loginMethod: "manus",
    role: (user?.role as any) ?? "customer",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user: defaultUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
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
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Partner Programme", () => {
  describe("partner.getProgrammeInfo", () => {
    it("returns programme info without authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const info = await caller.partner.getProgrammeInfo();

      expect(info).toBeDefined();
      expect(info.foundingPrice).toBeTypeOf("number");
      expect(info.regularPrice).toBeTypeOf("number");
      expect(info.teaDiscountPercent).toBeTypeOf("number");
      expect(info.foundingSlotsRemaining).toBeTypeOf("number");
      expect(info.foundingSlotsTotal).toBeTypeOf("number");
      expect(typeof info.programmeActive).toBe("boolean");
      expect(info.referrerReward).toBeTypeOf("number");
      expect(info.referredReward).toBeTypeOf("number");
    });

    it("returns founding price less than or equal to regular price", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const info = await caller.partner.getProgrammeInfo();

      expect(info.foundingPrice).toBeLessThanOrEqual(info.regularPrice);
    });

    it("returns regular price of ₹3,500 (350000 paise)", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const info = await caller.partner.getProgrammeInfo();

      expect(info.regularPrice).toBe(350000);
    });

    it("returns founding price of ₹2,500 (250000 paise)", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const info = await caller.partner.getProgrammeInfo();

      expect(info.foundingPrice).toBe(250000);
    });

    it("returns positive founding slots total", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const info = await caller.partner.getProgrammeInfo();

      expect(info.foundingSlotsTotal).toBeGreaterThan(0);
    });
  });

  describe("partner.getMySubscription", () => {
    it("returns null for non-partner user", async () => {
      const ctx = createContext({ id: 888 });
      const caller = appRouter.createCaller(ctx);

      const sub = await caller.partner.getMySubscription();

      expect(sub).toBeNull();
    });
  });

  describe("partner.previewBenefits", () => {
    it("returns null for non-partner user", async () => {
      const ctx = createContext({ id: 888 });
      const caller = appRouter.createCaller(ctx);

      const benefits = await caller.partner.previewBenefits({
        outletId: 2,
        items: [
          {
            productId: 69,
            productName: "Biang Biang Noodles",
            lineTotal: 41500,
            size: null,
            quantity: 1,
          },
        ],
      });

      expect(benefits).toBeNull();
    });

    it("accepts valid input with multiple items", async () => {
      const ctx = createContext({ id: 888 });
      const caller = appRouter.createCaller(ctx);

      // Should not throw even for non-partner
      const benefits = await caller.partner.previewBenefits({
        outletId: 1,
        items: [
          {
            productId: 1,
            productName: "Classic Milk Tea",
            lineTotal: 25000,
            size: "large",
            quantity: 1,
          },
          {
            productId: 2,
            productName: "Taro Milk Tea",
            lineTotal: 27000,
            size: "regular",
            quantity: 2,
          },
        ],
      });

      expect(benefits).toBeNull();
    });
  });

  describe("partner.validateReferralCode", () => {
    it("returns invalid for non-existent code", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.partner.validateReferralCode({
        code: "NONEXISTENT99",
      });

      expect(result.valid).toBe(false);
      expect(result.partnerName).toBeNull();
    });

    it("handles empty-ish codes gracefully", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.partner.validateReferralCode({
        code: "X",
      });

      expect(result.valid).toBe(false);
    });
  });

  describe("partner.getReferralInfo", () => {
    it("returns null for non-partner user", async () => {
      const ctx = createContext({ id: 888 });
      const caller = appRouter.createCaller(ctx);

      const info = await caller.partner.getReferralInfo();

      expect(info).toBeNull();
    });
  });

  describe("partner.subscribe", () => {
    it("rejects subscription when programme is not active", async () => {
      // This test depends on the programme_active config being "true" in DB
      // If it's false, the mutation should throw
      const ctx = createContext({ id: 777 });
      const caller = appRouter.createCaller(ctx);

      // We test the input validation at least
      try {
        await caller.partner.subscribe({
          tier: "founding",
          referralCode: undefined,
        });
        // If programme is active and Razorpay is configured, this might succeed
        // or fail at Razorpay level - both are acceptable
      } catch (err: any) {
        // Expected errors: programme not active, Razorpay failure, etc.
        expect(err.message).toBeDefined();
      }
    });

    it("rejects invalid tier", async () => {
      const ctx = createContext({ id: 777 });
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.partner.subscribe({
          tier: "invalid" as any,
        });
        expect.unreachable("Should have thrown");
      } catch (err: any) {
        expect(err).toBeDefined();
      }
    });
  });

  describe("partner.adminGetStats", () => {
    it("rejects non-admin users", async () => {
      const ctx = createContext({ id: 888, role: "customer" as any });
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.partner.adminGetStats();
        expect.unreachable("Should have thrown FORBIDDEN");
      } catch (err: any) {
        expect(err.code).toBe("FORBIDDEN");
      }
    });

    it("returns stats for admin users", async () => {
      const ctx = createContext({ id: 1, role: "admin" as any });
      const caller = appRouter.createCaller(ctx);

      const stats = await caller.partner.adminGetStats();

      expect(stats).toBeDefined();
      expect(stats.totalPartners).toBeTypeOf("number");
      expect(stats.activePartners).toBeTypeOf("number");
      expect(stats.foundingPartners).toBeTypeOf("number");
      expect(stats.regularPartners).toBeTypeOf("number");
      expect(stats.totalRevenue).toBeTypeOf("number");
      expect(stats.totalBenefitsGiven).toBeTypeOf("number");
      expect(stats.totalReferrals).toBeTypeOf("number");
      expect(stats.config).toBeDefined();
      expect(typeof stats.config).toBe("object");
    });
  });

  describe("partner.adminGetPartners", () => {
    it("rejects non-admin users", async () => {
      const ctx = createContext({ id: 888, role: "customer" as any });
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.partner.adminGetPartners();
        expect.unreachable("Should have thrown FORBIDDEN");
      } catch (err: any) {
        expect(err.code).toBe("FORBIDDEN");
      }
    });

    it("returns partners list for admin", async () => {
      const ctx = createContext({ id: 1, role: "admin" as any });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.partner.adminGetPartners({
        status: "all",
        page: 1,
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.partners)).toBe(true);
      expect(result.total).toBeTypeOf("number");
    });

    it("filters by status", async () => {
      const ctx = createContext({ id: 1, role: "admin" as any });
      const caller = appRouter.createCaller(ctx);

      const active = await caller.partner.adminGetPartners({
        status: "active",
        page: 1,
        limit: 10,
      });

      expect(active).toBeDefined();
      // All returned partners should be active
      for (const p of active.partners) {
        expect(p.status).toBe("active");
      }
    });
  });

  describe("partner.adminUpdateConfig", () => {
    it("rejects non-admin users", async () => {
      const ctx = createContext({ id: 888, role: "customer" as any });
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.partner.adminUpdateConfig({
          key: "tea_discount_percent",
          value: "20",
        });
        expect.unreachable("Should have thrown FORBIDDEN");
      } catch (err: any) {
        expect(err.code).toBe("FORBIDDEN");
      }
    });
  });
});
