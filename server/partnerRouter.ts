// Maami Partner Programme - Backend procedures
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { partnerSubscriptions, partnerReferrals, partnerBenefitsLog, partnerConfig, users, orders, products, subcategories, categories } from "../drizzle/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { createRazorpayOrder, verifyPaymentSignature, getRazorpayKeyId } from "./razorpay";
import { notifyOwner } from "./_core/notification";
import crypto from "crypto";

// Admin procedure - only allows admin role
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Generate a unique referral code like "MAAMI-PRIYA26"
function generateReferralCode(userName: string): string {
  const cleanName = (userName || "PARTNER")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 6);
  const year = new Date().getFullYear().toString().slice(-2);
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase().slice(0, 3);
  return `${cleanName}${year}${rand}`;
}

// Helper: get a config value
async function getConfig(key: string): Promise<string | null> {
  const dbInstance = await getDb();
  if (!dbInstance) return null;
  const [row] = await dbInstance
    .select({ configValue: partnerConfig.configValue })
    .from(partnerConfig)
    .where(eq(partnerConfig.configKey, key));
  return row?.configValue ?? null;
}

// Helper: get multiple config values
async function getConfigs(keys: string[]): Promise<Record<string, string>> {
  const dbInstance = await getDb();
  if (!dbInstance) return {};
  const rows = await dbInstance
    .select({ configKey: partnerConfig.configKey, configValue: partnerConfig.configValue })
    .from(partnerConfig);
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (keys.includes(row.configKey)) {
      map[row.configKey] = row.configValue;
    }
  }
  return map;
}

// Helper: check if user has an active Partner subscription
export async function getActivePartnerSubscription(userId: number) {
  const dbInstance = await getDb();
  if (!dbInstance) return null;
  const [sub] = await dbInstance
    .select()
    .from(partnerSubscriptions)
    .where(
      and(
        eq(partnerSubscriptions.userId, userId),
        eq(partnerSubscriptions.status, "active"),
        lte(partnerSubscriptions.startDate, new Date()),
        gte(partnerSubscriptions.endDate, new Date())
      )
    )
    .orderBy(desc(partnerSubscriptions.createdAt))
    .limit(1);
  return sub ?? null;
}

// Helper: calculate Partner benefits for an order
// UPDATED RULES (Apr 19):
// 1. Complimentary food item at T. Nagar — NO minimum purchase required
//    Eligible items: Biang Biang, Dan Dan Noodles, any Cong You Bing, any Brioche
//    Limit: 1 per visit, 25 per subscription year
// 2. 5% off all drinks in the order (all outlets)
// 3. 10% off workshops (handled separately in workshop booking)
// 4. Referral programme REMOVED
// 5. Loyalty stamps should NOT be awarded on free items (handled in order creation)
export async function calculatePartnerBenefits(
  userId: number,
  outletId: number,
  items: Array<{
    productId: number;
    productName: string;
    lineTotal: number; // paise
    size?: string | null;
    quantity: number;
    categorySlug?: string;
  }>
) {
  const subscription = await getActivePartnerSubscription(userId);
  if (!subscription) return null;

  const config = await getConfigs([
    "tnagar_outlet_id",
    "complimentary_items_per_year",
    "drink_discount_percent",
    "eligible_food_subcategories",
    "eligible_sweet_subcategories",
  ]);

  const tnagarOutletId = parseInt(config.tnagar_outlet_id || "2");
  const maxComplimentaryPerYear = parseInt(config.complimentary_items_per_year || "25");
  const drinkDiscountPercent = parseInt(config.drink_discount_percent || "5");
  const eligibleFoodSubcats = (config.eligible_food_subcategories || "saucy-noodles,flat-bread,pillow-brioche").split(",").map(s => s.trim());
  const eligibleSweetSubcats = (config.eligible_sweet_subcategories || "sweet-pillow-brioche").split(",").map(s => s.trim());

  const dbInstance = await getDb();
  if (!dbInstance) return null;

  const benefits: Array<{
    type: "complimentary_item" | "drink_discount" | "free_biang_biang" | "free_large_tea";
    amount: number; // paise saved
    itemName?: string;
    itemOriginalPrice?: number;
    discountPercent?: number;
    drinkItemsCount?: number;
  }> = [];

  let totalBenefitAmount = 0;

  // 1. COMPLIMENTARY FOOD ITEM at T. Nagar (no minimum purchase required)
  if (outletId === tnagarOutletId) {
    // Check how many complimentary items used this subscription year
    const complimentaryUsed = await dbInstance
      .select({ count: sql<number>`COUNT(*)` })
      .from(partnerBenefitsLog)
      .where(
        and(
          eq(partnerBenefitsLog.userId, userId),
          eq(partnerBenefitsLog.subscriptionId, subscription.id),
          sql`${partnerBenefitsLog.benefitType} IN ('complimentary_item', 'free_biang_biang')`
        )
      );
    const usedCount = Number(complimentaryUsed[0]?.count) || 0;

    if (usedCount < maxComplimentaryPerYear) {
      // Get all eligible product IDs from eligible subcategories
      const allEligibleSubcats = [...eligibleFoodSubcats, ...eligibleSweetSubcats];
      const eligibleProducts = await dbInstance
        .select({
          productId: products.id,
          productName: products.name,
          subcatSlug: subcategories.slug,
        })
        .from(products)
        .innerJoin(subcategories, eq(products.subcategoryId, subcategories.id))
        .where(sql`${subcategories.slug} IN (${sql.join(allEligibleSubcats.map(s => sql`${s}`), sql`, `)})`);

      const eligibleProductIds = new Set(eligibleProducts.map(p => p.productId));

      // Find eligible items in the order
      const eligibleOrderItems = items.filter(item => eligibleProductIds.has(item.productId));

      if (eligibleOrderItems.length > 0) {
        // Make the most expensive eligible item complimentary (1 unit)
        const mostExpensive = eligibleOrderItems.reduce((max, item) => {
          const unitPrice = Math.round(item.lineTotal / item.quantity);
          const maxUnitPrice = Math.round(max.lineTotal / max.quantity);
          return unitPrice > maxUnitPrice ? item : max;
        }, eligibleOrderItems[0]);

        const freeAmount = Math.round(mostExpensive.lineTotal / mostExpensive.quantity);
        benefits.push({
          type: "complimentary_item",
          amount: freeAmount,
          itemName: mostExpensive.productName,
          itemOriginalPrice: freeAmount,
        });
        totalBenefitAmount += freeAmount;
      }
    }
  }

  // 2. 5% OFF ALL DRINKS in the order (any outlet)
  if (drinkDiscountPercent > 0) {
    // Get drink category IDs (Iced Beverages + Hot Beverages)
    const drinkCategories = await dbInstance
      .select({ id: categories.id })
      .from(categories)
      .where(sql`${categories.slug} IN ('bubble-tea', 'coffee')`);
    const drinkCategoryIds = drinkCategories.map(c => c.id);

    if (drinkCategoryIds.length > 0) {
      const drinkProducts = await dbInstance
        .select({ productId: products.id })
        .from(products)
        .innerJoin(subcategories, eq(products.subcategoryId, subcategories.id))
        .where(sql`${subcategories.categoryId} IN (${sql.join(drinkCategoryIds.map(id => sql`${id}`), sql`, `)})`);

      const drinkProductIds = new Set(drinkProducts.map(p => p.productId));

      // Calculate discount on all drink items
      const drinkItems = items.filter(item => drinkProductIds.has(item.productId));
      if (drinkItems.length > 0) {
        let totalDrinkDiscount = 0;
        let drinkItemsCount = 0;
        for (const item of drinkItems) {
          const discount = Math.round(item.lineTotal * drinkDiscountPercent / 100);
          totalDrinkDiscount += discount;
          drinkItemsCount += item.quantity;
        }

        if (totalDrinkDiscount > 0) {
          benefits.push({
            type: "drink_discount",
            amount: totalDrinkDiscount,
            discountPercent: drinkDiscountPercent,
            drinkItemsCount,
          });
          totalBenefitAmount += totalDrinkDiscount;
        }
      }
    }
  }

  return {
    subscription,
    benefits,
    totalBenefitAmount,
    complimentaryItemsUsedThisYear: undefined as number | undefined, // populated in getMySubscription
  };
}

export const partnerRouter = router({
  // Get Partner Programme info (public - for landing page)
  getProgrammeInfo: publicProcedure.query(async () => {
    const config = await getConfigs([
      "founding_price_paise",
      "regular_price_paise",
      "founding_slots_remaining",
      "founding_slots_total",
      "programme_active",
      "complimentary_items_per_year",
      "drink_discount_percent",
      "workshop_discount_percent",
    ]);

    return {
      foundingPrice: parseInt(config.founding_price_paise || "250000"),
      regularPrice: parseInt(config.regular_price_paise || "350000"),
      foundingSlotsRemaining: parseInt(config.founding_slots_remaining || "50"),
      foundingSlotsTotal: parseInt(config.founding_slots_total || "50"),
      programmeActive: config.programme_active === "true",
      complimentaryItemsPerYear: parseInt(config.complimentary_items_per_year || "25"),
      drinkDiscountPercent: parseInt(config.drink_discount_percent || "5"),
      workshopDiscountPercent: parseInt(config.workshop_discount_percent || "10"),
    };
  }),

  // Get current user's Partner status
  getMySubscription: protectedProcedure.query(async ({ ctx }) => {
    const sub = await getActivePartnerSubscription(ctx.user.id);
    if (!sub) return null;

    const dbInstance = await getDb();
    if (!dbInstance) return null;

    // Get referral stats
    const referrals = await dbInstance
      .select()
      .from(partnerReferrals)
      .where(eq(partnerReferrals.referrerUserId, ctx.user.id));

    const totalReferrals = referrals.length;
    const subscribedReferrals = referrals.filter(
      (r) => r.status === "subscribed" || r.status === "rewarded"
    ).length;
    const totalRewardsEarned = referrals.reduce(
      (sum, r) => sum + (r.referrerRewardCredited ? r.referrerRewardAmount : 0),
      0
    );

    // Get benefits usage this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyBenefits = await dbInstance
      .select()
      .from(partnerBenefitsLog)
      .where(
        and(
          eq(partnerBenefitsLog.userId, ctx.user.id),
          gte(partnerBenefitsLog.createdAt, startOfMonth)
        )
      );

    const totalSavedThisMonth = monthlyBenefits.reduce(
      (sum, b) => sum + b.benefitAmount,
      0
    );
    const freeItemsThisMonth = monthlyBenefits.filter(
      (b) =>
        b.benefitType === "free_biang_biang" || b.benefitType === "free_large_tea" || b.benefitType === "complimentary_item"
    ).length;

    // Count complimentary items used this subscription year
    const complimentaryUsed = await dbInstance
      .select({ count: sql<number>`COUNT(*)` })
      .from(partnerBenefitsLog)
      .where(
        and(
          eq(partnerBenefitsLog.userId, ctx.user.id),
          eq(partnerBenefitsLog.subscriptionId, sub.id),
          sql`${partnerBenefitsLog.benefitType} IN ('complimentary_item', 'free_biang_biang')`
        )
      );
    const complimentaryItemsUsed = Number(complimentaryUsed[0]?.count) || 0;
    const maxComplimentaryPerYear = parseInt((await getConfig("complimentary_items_per_year")) || "25");

    // Get total lifetime savings
    const allBenefits = await dbInstance
      .select({
        total: sql<number>`SUM(${partnerBenefitsLog.benefitAmount})`,
      })
      .from(partnerBenefitsLog)
      .where(eq(partnerBenefitsLog.userId, ctx.user.id));

    const lifetimeSavings = Number(allBenefits[0]?.total) || 0;

    return {
      ...sub,
      referralStats: {
        totalReferrals,
        subscribedReferrals,
        totalRewardsEarned,
      },
      usageStats: {
        totalSavedThisMonth,
        freeItemsThisMonth,
        lifetimeSavings,
        complimentaryItemsUsed,
        maxComplimentaryPerYear,
      },
    };
  }),

  // Preview Partner benefits for current cart (before checkout)
  previewBenefits: protectedProcedure
    .input(
      z.object({
        outletId: z.number(),
        items: z.array(
          z.object({
            productId: z.number(),
            productName: z.string(),
            lineTotal: z.number(),
            size: z.string().nullable().optional(),
            quantity: z.number(),
          })
        ),
      })
    )
    .query(async ({ ctx, input }) => {
      return calculatePartnerBenefits(ctx.user.id, input.outletId, input.items);
    }),

  // Subscribe to Partner Programme
  subscribe: protectedProcedure
    .input(
      z.object({
        tier: z.enum(["founding", "regular"]),
        referralCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check if already a Partner
      const existing = await getActivePartnerSubscription(ctx.user.id);
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already have an active Partner subscription",
        });
      }

      // Check programme is active
      const programmeActive = await getConfig("programme_active");
      if (programmeActive !== "true") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The Partner Programme is not currently accepting new subscriptions",
        });
      }

      // Check founding slots if founding tier
      if (input.tier === "founding") {
        const remaining = parseInt(
          (await getConfig("founding_slots_remaining")) || "0"
        );
        if (remaining <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "All Founding Partner slots have been taken. Please choose Regular tier.",
          });
        }
      }

      // Get price
      const priceKey =
        input.tier === "founding"
          ? "founding_price_paise"
          : "regular_price_paise";
      const pricePaise = parseInt((await getConfig(priceKey)) || "250000");

      // Generate referral code
      let referralCode = generateReferralCode(ctx.user.name || "");
      // Ensure uniqueness
      let attempts = 0;
      while (attempts < 10) {
        const [existing] = await dbInstance
          .select({ id: partnerSubscriptions.id })
          .from(partnerSubscriptions)
          .where(eq(partnerSubscriptions.referralCode, referralCode));
        if (!existing) break;
        referralCode = generateReferralCode(ctx.user.name || "");
        attempts++;
      }

      // Create Razorpay order for payment
      const razorpayOrder = await createRazorpayOrder({
        amount: pricePaise,
        currency: "INR",
        receipt: `PARTNER-${ctx.user.id}-${Date.now()}`,
        notes: {
          userId: String(ctx.user.id),
          tier: input.tier,
          type: "partner_subscription",
        },
      });

      // Create subscription record (pending until payment confirmed)
      const now = new Date();
      const endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 1);

      const [subResult] = await dbInstance.insert(partnerSubscriptions).values({
        userId: ctx.user.id,
        tier: input.tier,
        status: "paused", // Will be activated after payment
        amountPaid: pricePaise,
        referralCode,
        referredByCode: input.referralCode || null,
        startDate: now,
        endDate,
        razorpaySubscriptionId: razorpayOrder.id,
      });

      const subscriptionId = subResult.insertId;

      // If referred by someone, create referral record
      if (input.referralCode) {
        const [referrerSub] = await dbInstance
          .select()
          .from(partnerSubscriptions)
          .where(eq(partnerSubscriptions.referralCode, input.referralCode));

        if (referrerSub) {
          const config = await getConfigs([
            "referrer_reward_paise",
            "referred_reward_paise",
          ]);

          await dbInstance.insert(partnerReferrals).values({
            referrerUserId: referrerSub.userId,
            referrerSubscriptionId: referrerSub.id,
            referredUserId: ctx.user.id,
            referredSubscriptionId: subscriptionId,
            referralCode: input.referralCode,
            referrerRewardAmount: parseInt(
              config.referrer_reward_paise || "25000"
            ),
            referredRewardAmount: parseInt(
              config.referred_reward_paise || "10000"
            ),
            status: "registered",
          });
        }
      }

      return {
        subscriptionId,
        referralCode,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: getRazorpayKeyId(),
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        description: `Maami Partner - ${input.tier === "founding" ? "Founding" : "Regular"} (Annual)`,
      };
    }),

  // Verify payment and activate subscription
  verifyPayment: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.number(),
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify signature
      const isValid = verifyPaymentSignature(
        input.razorpayOrderId,
        input.razorpayPaymentId,
        input.razorpaySignature
      );

      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment verification failed",
        });
      }

      // Get subscription
      const [sub] = await dbInstance
        .select()
        .from(partnerSubscriptions)
        .where(
          and(
            eq(partnerSubscriptions.id, input.subscriptionId),
            eq(partnerSubscriptions.userId, ctx.user.id)
          )
        );

      if (!sub) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      // Activate subscription
      const now = new Date();
      const endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 1);

      await dbInstance
        .update(partnerSubscriptions)
        .set({
          status: "active",
          razorpayPaymentId: input.razorpayPaymentId,
          startDate: now,
          endDate,
        })
        .where(eq(partnerSubscriptions.id, input.subscriptionId));

      // Decrement founding slots if applicable
      if (sub.tier === "founding") {
        const remaining = parseInt(
          (await getConfig("founding_slots_remaining")) || "100"
        );
        await dbInstance
          .update(partnerConfig)
          .set({ configValue: String(Math.max(0, remaining - 1)) })
          .where(eq(partnerConfig.configKey, "founding_slots_remaining"));
      }

      // Process referral rewards
      if (sub.referredByCode) {
        const [referral] = await dbInstance
          .select()
          .from(partnerReferrals)
          .where(
            and(
              eq(partnerReferrals.referredUserId, ctx.user.id),
              eq(partnerReferrals.referralCode, sub.referredByCode)
            )
          );

        if (referral) {
          // Update referral status
          await dbInstance
            .update(partnerReferrals)
            .set({
              status: "subscribed",
              referredSubscriptionId: input.subscriptionId,
            })
            .where(eq(partnerReferrals.id, referral.id));

          // Credit Maami Rupees to referrer (store credit)
          if (referral.referrerRewardAmount > 0) {
            await dbInstance
              .update(users)
              .set({
                storeCredit: sql`${users.storeCredit} + ${referral.referrerRewardAmount}`,
              })
              .where(eq(users.id, referral.referrerUserId));

            await dbInstance
              .update(partnerReferrals)
              .set({
                referrerRewardCredited: true,
                status: "rewarded",
              })
              .where(eq(partnerReferrals.id, referral.id));
          }

          // Credit Maami Rupees to referred (new partner)
          if (referral.referredRewardAmount > 0) {
            await dbInstance
              .update(users)
              .set({
                storeCredit: sql`${users.storeCredit} + ${referral.referredRewardAmount}`,
              })
              .where(eq(users.id, ctx.user.id));

            await dbInstance
              .update(partnerReferrals)
              .set({ referredRewardCredited: true })
              .where(eq(partnerReferrals.id, referral.id));
          }

          // Send email notification to the referrer about the successful referral
          try {
            const [referrerUser] = await dbInstance
              .select({ name: users.name, email: users.email })
              .from(users)
              .where(eq(users.id, referral.referrerUserId));

            if (referrerUser?.email) {
              await sendReferralNotificationEmail(
                referrerUser.email,
                referrerUser.name || "Partner",
                ctx.user.name || "Someone",
                referral.referrerRewardAmount
              );
            }
          } catch (e) {
            console.error("Failed to send referral notification email:", e);
          }
        }
      }

      // Notify owner
      try {
        const tierLabel = sub.tier === "founding" ? "Founding" : "Regular";
        await notifyOwner({
          title: `New Maami Partner: ${ctx.user.name || "Unknown"}`,
          content: `${ctx.user.name} just subscribed as a ${tierLabel} Partner (₹${sub.amountPaid / 100}). Referral code: ${sub.referralCode}${sub.referredByCode ? `. Referred by: ${sub.referredByCode}` : ""}`,
        });
      } catch (e) {
        console.error("Failed to notify owner about new partner:", e);
      }

      return {
        success: true,
        referralCode: sub.referralCode,
        tier: sub.tier,
        endDate,
      };
    }),

  // Get referral link info (for sharing)
  getReferralInfo: protectedProcedure.query(async ({ ctx }) => {
    const sub = await getActivePartnerSubscription(ctx.user.id);
    if (!sub) return null;

    const config = await getConfigs([
      "referrer_reward_paise",
      "referred_reward_paise",
    ]);

    return {
      referralCode: sub.referralCode,
      referrerReward: parseInt(config.referrer_reward_paise || "25000"),
      referredReward: parseInt(config.referred_reward_paise || "10000"),
    };
  }),

  // Validate a referral code (for subscription page)
  validateReferralCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return { valid: false, partnerName: null };

      const [sub] = await dbInstance
        .select({
          id: partnerSubscriptions.id,
          userId: partnerSubscriptions.userId,
          status: partnerSubscriptions.status,
        })
        .from(partnerSubscriptions)
        .where(
          and(
            eq(partnerSubscriptions.referralCode, input.code.toUpperCase()),
            eq(partnerSubscriptions.status, "active")
          )
        );

      if (!sub) return { valid: false, partnerName: null };

      // Get partner name
      const [user] = await dbInstance
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, sub.userId));

      return {
        valid: true,
        partnerName: user?.name || "A Maami Partner",
      };
    }),

  // Admin: Get all partners
  adminGetPartners: adminProcedure
    .input(
      z.object({
        status: z.enum(["all", "active", "expired", "cancelled", "paused"]).default("all"),
        page: z.number().default(1),
        limit: z.number().default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return { partners: [], total: 0 };

      const status = input?.status || "all";
      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (status !== "all") {
        conditions.push(eq(partnerSubscriptions.status, status));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const partnersRaw = await dbInstance
        .select({
          id: partnerSubscriptions.id,
          userId: partnerSubscriptions.userId,
          tier: partnerSubscriptions.tier,
          status: partnerSubscriptions.status,
          amountPaid: partnerSubscriptions.amountPaid,
          referralCode: partnerSubscriptions.referralCode,
          referredByCode: partnerSubscriptions.referredByCode,
          startDate: partnerSubscriptions.startDate,
          endDate: partnerSubscriptions.endDate,
          createdAt: partnerSubscriptions.createdAt,
          userName: users.name,
          userEmail: users.email,
          userPhone: users.phone,
        })
        .from(partnerSubscriptions)
        .leftJoin(users, eq(partnerSubscriptions.userId, users.id))
        .where(whereClause)
        .orderBy(desc(partnerSubscriptions.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [countResult] = await dbInstance
        .select({ count: sql<number>`COUNT(*)` })
        .from(partnerSubscriptions)
        .where(whereClause);

      const total = Number(countResult?.count) || 0;

      // Get referral counts for each partner
      const partners = await Promise.all(
        partnersRaw.map(async (p) => {
          const [refCount] = await dbInstance
            .select({ count: sql<number>`COUNT(*)` })
            .from(partnerReferrals)
            .where(eq(partnerReferrals.referrerUserId, p.userId));

          const [benefitTotal] = await dbInstance
            .select({
              total: sql<number>`COALESCE(SUM(${partnerBenefitsLog.benefitAmount}), 0)`,
            })
            .from(partnerBenefitsLog)
            .where(eq(partnerBenefitsLog.userId, p.userId));

          return {
            ...p,
            referralCount: Number(refCount?.count) || 0,
            totalBenefitsUsed: Number(benefitTotal?.total) || 0,
          };
        })
      );

      return { partners, total };
    }),

  // Admin: Get Partner Programme stats
  adminGetStats: adminProcedure.query(async () => {
    const dbInstance = await getDb();
    if (!dbInstance)
      return {
        totalPartners: 0,
        activePartners: 0,
        foundingPartners: 0,
        regularPartners: 0,
        totalRevenue: 0,
        totalBenefitsGiven: 0,
        totalReferrals: 0,
        config: {},
      };

    const [activeCount] = await dbInstance
      .select({ count: sql<number>`COUNT(*)` })
      .from(partnerSubscriptions)
      .where(eq(partnerSubscriptions.status, "active"));

    const [foundingCount] = await dbInstance
      .select({ count: sql<number>`COUNT(*)` })
      .from(partnerSubscriptions)
      .where(
        and(
          eq(partnerSubscriptions.tier, "founding"),
          eq(partnerSubscriptions.status, "active")
        )
      );

    const [regularCount] = await dbInstance
      .select({ count: sql<number>`COUNT(*)` })
      .from(partnerSubscriptions)
      .where(
        and(
          eq(partnerSubscriptions.tier, "regular"),
          eq(partnerSubscriptions.status, "active")
        )
      );

    const [totalRevenue] = await dbInstance
      .select({
        total: sql<number>`COALESCE(SUM(${partnerSubscriptions.amountPaid}), 0)`,
      })
      .from(partnerSubscriptions)
      .where(eq(partnerSubscriptions.status, "active"));

    const [totalBenefits] = await dbInstance
      .select({
        total: sql<number>`COALESCE(SUM(${partnerBenefitsLog.benefitAmount}), 0)`,
      })
      .from(partnerBenefitsLog);

    const [totalReferrals] = await dbInstance
      .select({ count: sql<number>`COUNT(*)` })
      .from(partnerReferrals);

    // Get all config
    const allConfig = await dbInstance.select().from(partnerConfig);
    const configMap: Record<string, string> = {};
    for (const c of allConfig) {
      configMap[c.configKey] = c.configValue;
    }

    return {
      totalPartners: Number(activeCount?.count) || 0,
      activePartners: Number(activeCount?.count) || 0,
      foundingPartners: Number(foundingCount?.count) || 0,
      regularPartners: Number(regularCount?.count) || 0,
      totalRevenue: Number(totalRevenue?.total) || 0,
      totalBenefitsGiven: Number(totalBenefits?.total) || 0,
      totalReferrals: Number(totalReferrals?.count) || 0,
      config: configMap,
    };
  }),

  // Admin: Update Partner config
  adminUpdateConfig: adminProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await dbInstance
        .update(partnerConfig)
        .set({
          configValue: input.value,
          updatedBy: ctx.user.id,
        })
        .where(eq(partnerConfig.configKey, input.key));

      return { success: true };
    }),

  // Admin: Cancel a partner subscription
  adminCancelSubscription: adminProcedure
    .input(
      z.object({
        subscriptionId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await dbInstance
        .update(partnerSubscriptions)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancellationReason: input.reason || "Cancelled by admin",
        })
        .where(eq(partnerSubscriptions.id, input.subscriptionId));

      return { success: true };
    }),
});

// Helper: Send email notification to referrer when their referral joins
async function sendReferralNotificationEmail(
  referrerEmail: string,
  referrerName: string,
  referredName: string,
  rewardAmountPaise: number
) {
  const rewardRupees = rewardAmountPaise / 100;
  const env = process.env;
  const forgeApiUrl = env.BUILT_IN_FORGE_API_URL;
  const forgeApiKey = env.BUILT_IN_FORGE_API_KEY;

  if (!forgeApiUrl || !forgeApiKey) {
    console.error("Missing FORGE API credentials for email notification");
    return;
  }

  if (!forgeApiUrl.startsWith('https://')) {
    console.error('FORGE API URL must use HTTPS to prevent cleartext credential transmission (CWE-319)');
    return;
  }

  const emailHtml = `
    <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #FFF8F0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); padding: 32px; text-align: center;">
        <h1 style="color: #FFD700; margin: 0; font-size: 24px;">Taiwan Maami\u2122</h1>
        <p style="color: #FFF8F0; margin: 8px 0 0; font-size: 14px;">Partner Programme</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #8B4513; margin: 0 0 16px;">Great news, ${referrerName}! \ud83c\udf89</h2>
        <p style="color: #5D4037; line-height: 1.6; font-size: 16px;">
          Your friend <strong>${referredName}</strong> just joined the Maami Partner Programme using your referral!
        </p>
        <div style="background: #FFF3E0; border-left: 4px solid #FFD700; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #8B4513; margin: 0; font-size: 18px; font-weight: bold;">
            \u20b9${rewardRupees} Maami Rupees credited to your account!
          </p>
          <p style="color: #5D4037; margin: 8px 0 0; font-size: 14px;">
            Use them on your next order at any Taiwan Maami outlet.
          </p>
        </div>
        <p style="color: #5D4037; line-height: 1.6; font-size: 16px;">
          Keep sharing your referral link and earn \u20b9${rewardRupees} for every friend who joins. The more friends you refer, the more you save!
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://www.taiwanmaami.com/partner/dashboard" 
             style="background: #8B4513; color: #FFD700; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
            View Your Dashboard
          </a>
        </div>
        <p style="color: #8D6E63; font-size: 13px; text-align: center; margin-top: 24px;">
          Thank you for being a valued Maami Partner!
        </p>
      </div>
    </div>
  `;

  try {
    const response = await fetch(`${forgeApiUrl}/v1/notification/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${forgeApiKey}`,
      },
      body: JSON.stringify({
        to: referrerEmail,
        subject: `\ud83c\udf89 ${referredName} joined Maami Partner using your referral! \u20b9${rewardRupees} credited`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      console.error("Email notification failed:", await response.text());
    }
  } catch (e) {
    console.error("Failed to send referral email notification:", e);
  }
}
