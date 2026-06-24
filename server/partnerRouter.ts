// Maami Partner Programme - Backend procedures
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { partnerSubscriptions, partnerReferrals, partnerBenefitsLog, partnerConfig, users, orders, products, subcategories, categories, maamiRupeesTransactions, stampTransactions } from "../drizzle/schema";
import { eq, and, desc, asc, sql, gte, lte } from "drizzle-orm";
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

// Helper: Check if a partner subscription is eligible for refund
// ALL conditions must be true: age ≤60 days, 0 complimentary items, 0 MR earned, 0 stamps (excl welcome)
async function checkRefundEligibility(subscriptionId: number, userId: number, startDate: Date): Promise<{ eligible: boolean; reasons: string[] }> {
  const dbInstance = await getDb();
  if (!dbInstance) return { eligible: false, reasons: ["Database unavailable"] };

  const reasons: string[] = [];

  // Condition 1: Account age ≤ 60 days from subscription startDate
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceStart > 60) {
    reasons.push(`Subscription is ${daysSinceStart} days old (max 60 days)`);
  }

  // Condition 2: 0 complimentary items used
  const [benefitsResult] = await dbInstance
    .select({ count: sql<number>`COUNT(*)` })
    .from(partnerBenefitsLog)
    .where(
      and(
        eq(partnerBenefitsLog.subscriptionId, subscriptionId),
        eq(partnerBenefitsLog.userId, userId),
        sql`${partnerBenefitsLog.benefitType} IN ('complimentary_item', 'free_biang_biang', 'free_large_tea')`
      )
    );
  const complimentaryUsed = Number(benefitsResult?.count) || 0;
  if (complimentaryUsed > 0) {
    reasons.push(`${complimentaryUsed} complimentary item(s) used`);
  }

  // Condition 3: 0 Maami Rupees earned
  const [mrResult] = await dbInstance
    .select({ count: sql<number>`COUNT(*)` })
    .from(maamiRupeesTransactions)
    .where(
      and(
        eq(maamiRupeesTransactions.userId, userId),
        sql`${maamiRupeesTransactions.type} IN ('earn_order', 'earn_referral')`,
        gte(maamiRupeesTransactions.createdAt, startDate)
      )
    );
  const mrEarned = Number(mrResult?.count) || 0;
  if (mrEarned > 0) {
    reasons.push(`${mrEarned} Maami Rupees transaction(s) earned`);
  }

  // Condition 4: 0 stamps earned (excluding welcome stamp)
  const [stampsResult] = await dbInstance
    .select({ count: sql<number>`COUNT(*)` })
    .from(stampTransactions)
    .where(
      and(
        eq(stampTransactions.userId, userId),
        sql`${stampTransactions.action} != 'welcome'`,
        sql`${stampTransactions.stamps} > 0`,
        gte(stampTransactions.createdAt, startDate)
      )
    );
  const stampsEarned = Number(stampsResult?.count) || 0;
  if (stampsEarned > 0) {
    reasons.push(`${stampsEarned} stamp transaction(s) earned (excl. welcome)`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

// Helper: calculate Partner benefits for an order
// UPDATED RULES (Jun 24):
// 1. Complimentary item at T. Nagar & Anna Nagar — drinks (up to ₹500) + food items
//    Complimentary item at Palladium — drinks (up to ₹500) only, no food
//    Limit: 1 per visit, 24 per subscription year
// 2. 5% off all drinks in the order (all outlets)
// 3. 10% off workshops (handled separately in workshop booking)
// 4. Referral programme: Maami Money (store credit)
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
  }>,
  overrideProductId?: number // Partner's chosen free item (validated server-side)
) {
  const subscription = await getActivePartnerSubscription(userId);
  if (!subscription) return null;
  const config = await getConfigs([
    "tnagar_outlet_id",
    "annanagar_outlet_id",
    "palladium_outlet_id",
    "complimentary_items_per_year",
    "complimentary_item_cap_paise",
    "eligible_food_subcategories",
    "eligible_sweet_subcategories",
  ]);
  const tnagarOutletId = parseInt(config.tnagar_outlet_id || "2");
  const annangarOutletId = parseInt(config.annanagar_outlet_id || "30001");
  const palladiumOutletId = parseInt(config.palladium_outlet_id || "1");
  const maxComplimentaryPerYear = parseInt(config.complimentary_items_per_year || "15");
  const complimentaryCapPaise = parseInt(config.complimentary_item_cap_paise || "50000"); // ₹500
  const eligibleFoodSubcats = (config.eligible_food_subcategories || "saucy-noodles,flat-bread,pillow-brioche,noodles").split(",").map(s => s.trim());
  const eligibleSweetSubcats = (config.eligible_sweet_subcategories || "sweet-pillow-brioche").split(",").map(s => s.trim());
  const dbInstance = await getDb();
  if (!dbInstance) return null;
  const benefits: Array<{
    type: "complimentary_item" | "free_biang_biang" | "free_large_tea";
    amount: number; // paise saved
    itemName?: string;
    itemOriginalPrice?: number;
  }> = [];
  let totalBenefitAmount = 0;

  // Determine if this outlet qualifies for complimentary items
  const isEligibleOutlet = (outletId === tnagarOutletId || outletId === annangarOutletId || outletId === palladiumOutletId);
  const isPalladium = (outletId === palladiumOutletId);

  // Hoisted so it's accessible for the eligibleItems return value
  let eligibleOrderItems: typeof items = [];

  // 1. COMPLIMENTARY ITEM (all outlets, but different eligible items per outlet)
  if (isEligibleOutlet) {
    // Check daily limit (IST timezone) — one free item per calendar day
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const todayStartIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate());
    // Convert IST midnight back to UTC for DB comparison
    const todayStartUTC = new Date(todayStartIST.getTime() - (5.5 * 60 * 60 * 1000));
    const usedToday = await dbInstance
      .select({ count: sql<number>`COUNT(*)` })
      .from(partnerBenefitsLog)
      .where(
        and(
          eq(partnerBenefitsLog.userId, userId),
          sql`${partnerBenefitsLog.benefitType} IN ('complimentary_item', 'free_biang_biang')`,
          gte(partnerBenefitsLog.createdAt, todayStartUTC)
        )
      );
    const usedTodayCount = Number(usedToday[0]?.count) || 0;

    // Check how many complimentary items used this subscription year (15/year cap)
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
    if (usedTodayCount === 0 && usedCount < maxComplimentaryPerYear) {
      // Get drink category IDs
      const drinkCategories = await dbInstance
        .select({ id: categories.id })
        .from(categories)
        .where(sql`${categories.slug} IN ('bubble-tea', 'coffee')`);
      const drinkCategoryIds = drinkCategories.map(c => c.id);
      let drinkProductIds = new Set<number>();
      if (drinkCategoryIds.length > 0) {
        const drinkProducts = await dbInstance
          .select({ productId: products.id })
          .from(products)
          .innerJoin(subcategories, eq(products.subcategoryId, subcategories.id))
          .where(sql`${subcategories.categoryId} IN (${sql.join(drinkCategoryIds.map(id => sql`${id}`), sql`, `)})`);
        drinkProductIds = new Set(drinkProducts.map(p => p.productId));
      }

      // HARDCODED MOCHI EXCLUSION — cannot be overridden by config
      // Any item whose name contains "Mochi" (case-insensitive) is excluded from complimentary benefits
      const isMochiExcluded = (itemName: string): boolean => {
        return /mochi/i.test(itemName);
      };

      // Get all products from Sweet Bites category (slug: 'mochis') to exclude them
      // EXCEPT sweet-pillow-brioche which is explicitly eligible
      const sweetBitesCategory = await dbInstance
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, "mochis"));
      const sweetBitesCategoryId = sweetBitesCategory[0]?.id;
      let mochiProductIds = new Set<number>();
      if (sweetBitesCategoryId) {
        const mochiProducts = await dbInstance
          .select({ productId: products.id })
          .from(products)
          .innerJoin(subcategories, eq(products.subcategoryId, subcategories.id))
          .where(
            and(
              eq(subcategories.categoryId, sweetBitesCategoryId),
              // Exclude sweet-pillow-brioche from the exclusion (it IS eligible)
              sql`${subcategories.slug} NOT IN ('sweet-pillow-brioche')`
            )
          );
        mochiProductIds = new Set(mochiProducts.map(p => p.productId));
      }

      if (isPalladium) {
        // Palladium: Only drinks up to ₹500 are eligible (no mochis)
        eligibleOrderItems = items.filter(item => {
          const unitPrice = Math.round(item.lineTotal / item.quantity);
          // Exclude mochis by product ID and by name
          if (mochiProductIds.has(item.productId) || isMochiExcluded(item.productName)) return false;
          return drinkProductIds.has(item.productId) && unitPrice <= complimentaryCapPaise;
        });
      } else {
        // T. Nagar & Anna Nagar: Drinks (up to ₹500) + eligible food items (no mochis)
        const allEligibleSubcats = [...eligibleFoodSubcats, ...eligibleSweetSubcats];
        const eligibleFoodProducts = await dbInstance
          .select({
            productId: products.id,
            productName: products.name,
            subcatSlug: subcategories.slug,
          })
          .from(products)
          .innerJoin(subcategories, eq(products.subcategoryId, subcategories.id))
          .where(sql`${subcategories.slug} IN (${sql.join(allEligibleSubcats.map(s => sql`${s}`), sql`, `)})`);
        const eligibleFoodProductIds = new Set(eligibleFoodProducts.map(p => p.productId));

        eligibleOrderItems = items.filter(item => {
          const unitPrice = Math.round(item.lineTotal / item.quantity);
          // HARDCODED: Exclude mochis by product ID and by name
          if (mochiProductIds.has(item.productId) || isMochiExcluded(item.productName)) return false;
          // Eligible if it's a drink under cap OR an eligible food item under cap
          return unitPrice <= complimentaryCapPaise && (
            drinkProductIds.has(item.productId) || eligibleFoodProductIds.has(item.productId)
          );
        });
      }

      if (eligibleOrderItems.length > 0) {
        // If partner chose a specific item, validate it's in the eligible list
        let selectedItem;
        if (overrideProductId) {
          selectedItem = eligibleOrderItems.find(item => item.productId === overrideProductId);
        }
        // Default: highest-priced eligible item
        if (!selectedItem) {
          selectedItem = eligibleOrderItems.reduce((max, item) => {
            const unitPrice = Math.round(item.lineTotal / item.quantity);
            const maxUnitPrice = Math.round(max.lineTotal / max.quantity);
            return unitPrice > maxUnitPrice ? item : max;
          }, eligibleOrderItems[0]);
        }
        const unitPrice = Math.round(selectedItem.lineTotal / selectedItem.quantity);
        const freeAmount = Math.min(unitPrice, complimentaryCapPaise);
        benefits.push({
          type: "complimentary_item",
          amount: freeAmount,
          itemName: selectedItem.productName,
          itemOriginalPrice: unitPrice,
        });
        totalBenefitAmount += freeAmount;
      }
    }
  }


  // Build eligible items list for the "Change?" picker (only when complimentary benefit is active)
  const eligibleItemsList = (isEligibleOutlet && eligibleOrderItems.length > 0)
    ? eligibleOrderItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: Math.round(item.lineTotal / item.quantity),
        freeAmount: Math.min(Math.round(item.lineTotal / item.quantity), complimentaryCapPaise),
      }))
    : [];

  // Lazy expiry sweep — zero out expired earn rows and decrement balance
  if (dbInstance) {
    const expiredRows = await dbInstance
      .select({ id: maamiRupeesTransactions.id, remainingAmount: maamiRupeesTransactions.remainingAmount })
      .from(maamiRupeesTransactions)
      .where(
        and(
          eq(maamiRupeesTransactions.userId, userId),
          sql`${maamiRupeesTransactions.type} IN ('earn_order', 'earn_referral')`,
          sql`${maamiRupeesTransactions.expiresAt} < NOW()`,
          sql`${maamiRupeesTransactions.remainingAmount} > 0`
        )
      );

    if (expiredRows.length > 0) {
      let totalExpired = 0;
      for (const row of expiredRows) {
        totalExpired += row.remainingAmount || 0;
        await dbInstance
          .update(maamiRupeesTransactions)
          .set({ remainingAmount: 0 })
          .where(eq(maamiRupeesTransactions.id, row.id));
      }
      // Atomic decrement of balance
      await dbInstance
        .update(users)
        .set({ maamiRupeesBalance: sql`GREATEST(0, maamiRupeesBalance - ${totalExpired})` })
        .where(eq(users.id, userId));
      // Read updated balance for expire transaction logs
      const [updatedAfterExpiry] = await dbInstance
        .select({ maamiRupeesBalance: users.maamiRupeesBalance })
        .from(users)
        .where(eq(users.id, userId));
      const balanceAfterExpiry = updatedAfterExpiry?.maamiRupeesBalance || 0;
      // Insert expire transaction rows with correct balanceAfter
      for (const row of expiredRows) {
        await dbInstance.insert(maamiRupeesTransactions).values({
          userId,
          type: 'expire',
          amount: -(row.remainingAmount || 0),
          balanceAfter: balanceAfterExpiry,
          description: `Expired Maami Rupees credit`,
          expiresAt: null,
          remainingAmount: null,
        });
      }
      console.log(`[Maami Rupees] Expired ${expiredRows.length} credit(s) totalling \u20b9${(totalExpired / 100).toFixed(2)} for user ${userId}`);
    }
  }

  // Read current Maami Rupees balance (after any expiry sweep)
  let maamiRupeesBalance = 0;
  if (dbInstance) {
    const [userBalance] = await dbInstance
      .select({ maamiRupeesBalance: users.maamiRupeesBalance })
      .from(users)
      .where(eq(users.id, userId));
    maamiRupeesBalance = userBalance?.maamiRupeesBalance || 0;
  }

  return {
    subscription,
    benefits,
    totalBenefitAmount,
    eligibleItems: eligibleItemsList,
    maamiRupeesBalance,
    complimentaryItemsUsedThisYear: undefined as number | undefined, // populated in getMySubscription
  };
}

export const partnerRouter = router({
  // Get Partner Programme info (public - for landing page)
  // When programme_active = false, returns only the gate status — no pricing or details exposed
  getProgrammeInfo: publicProcedure.query(async () => {
    const config = await getConfigs([
      "founding_price_paise",
      "regular_price_paise",
      "founding_slots_remaining",
      "founding_slots_total",
      "programme_active",
      "complimentary_items_per_year",
      "workshop_discount_percent",
      "gst_rate_percent",
    ]);
    const isActive = config.programme_active === "true";

    // Gate check: if programme is not active, return minimal response
    if (!isActive) {
      return {
        programmeActive: false,
        foundingPrice: 0,
        regularPrice: 0,
        foundingBasePrice: 0,
        regularBasePrice: 0,
        gstRatePercent: 0,
        foundingGstAmount: 0,
        regularGstAmount: 0,
        foundingSlotsRemaining: 0,
        foundingSlotsTotal: 0,
        complimentaryItemsPerYear: 0,
        workshopDiscountPercent: 0,
        maamiRupeesRebatePct: 0,
      };
    }

    const foundingTotal = parseInt(config.founding_price_paise || "388800"); // Total incl. GST
    const regularTotal = parseInt(config.regular_price_paise || "450000"); // Total incl. GST
    const gstRate = parseInt(config.gst_rate_percent || "18");
    // Back-calculate base from GST-inclusive amount: base = total / (1 + rate/100)
    const foundingBase = Math.round(foundingTotal / (1 + gstRate / 100));
    const regularBase = Math.round(regularTotal / (1 + gstRate / 100));
    const foundingGst = foundingTotal - foundingBase;
    const regularGst = regularTotal - regularBase;
    return {
      foundingPrice: foundingTotal, // Total incl. GST (₹3,888)
      regularPrice: regularTotal, // Total incl. GST (₹4,500)
      foundingBasePrice: foundingBase, // Net of GST (₹3,295)
      regularBasePrice: regularBase, // Net of GST (₹3,814)
      gstRatePercent: gstRate,
      foundingGstAmount: foundingGst,
      regularGstAmount: regularGst,
      foundingSlotsRemaining: parseInt(config.founding_slots_remaining || "49"),
      foundingSlotsTotal: parseInt(config.founding_slots_total || "49"),
      programmeActive: true,
      complimentaryItemsPerYear: parseInt(config.complimentary_items_per_year || "15"),
      workshopDiscountPercent: parseInt(config.workshop_discount_percent || "10"),
      maamiRupeesRebatePct: 2,
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
    const maxComplimentaryPerYear = parseInt((await getConfig("complimentary_items_per_year")) || "15");

    // Get total lifetime savings
    const allBenefits = await dbInstance
      .select({
        total: sql<number>`SUM(${partnerBenefitsLog.benefitAmount})`,
      })
      .from(partnerBenefitsLog)
      .where(eq(partnerBenefitsLog.userId, ctx.user.id));

    const lifetimeSavings = Number(allBenefits[0]?.total) || 0;

    // Get user record with Maami Rupees balance and stamps
    const [userRecord] = await dbInstance
      .select({
        storeCredit: users.storeCredit,
        storeCreditExpiresAt: users.storeCreditExpiresAt,
        maamiRupeesBalance: users.maamiRupeesBalance,
        stampCount: users.stampCount,
        lifetimeStamps: users.lifetimeStamps,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id));

    // Check today's complimentary usage (IST)
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const todayStartIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate());
    const todayStartUTC = new Date(todayStartIST.getTime() - (5.5 * 60 * 60 * 1000));
    const [usedTodayResult] = await dbInstance
      .select({ count: sql<number>`COUNT(*)` })
      .from(partnerBenefitsLog)
      .where(
        and(
          eq(partnerBenefitsLog.userId, ctx.user.id),
          sql`${partnerBenefitsLog.benefitType} IN ('complimentary_item', 'free_biang_biang')`,
          gte(partnerBenefitsLog.createdAt, todayStartUTC)
        )
      );
    const usedToday = Number(usedTodayResult?.count) || 0;

    // Get recent Maami Rupees transactions (last 10)
    const recentMRTransactions = await dbInstance
      .select()
      .from(maamiRupeesTransactions)
      .where(eq(maamiRupeesTransactions.userId, ctx.user.id))
      .orderBy(desc(maamiRupeesTransactions.createdAt))
      .limit(10);

    // Get soonest-expiring MR credit
    const [expiringCredit] = await dbInstance
      .select({
        amount: maamiRupeesTransactions.remainingAmount,
        expiresAt: maamiRupeesTransactions.expiresAt,
      })
      .from(maamiRupeesTransactions)
      .where(
        and(
          eq(maamiRupeesTransactions.userId, ctx.user.id),
          sql`${maamiRupeesTransactions.type} IN ('earn_order', 'earn_referral')`,
          sql`${maamiRupeesTransactions.remainingAmount} > 0`,
          sql`${maamiRupeesTransactions.expiresAt} > NOW()`
        )
      )
      .orderBy(asc(maamiRupeesTransactions.expiresAt))
      .limit(1);

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
        usedToday,
      },
      maamiRupees: {
        balance: userRecord?.maamiRupeesBalance || 0,
        expiringSoon: expiringCredit ? {
          amount: expiringCredit.amount || 0,
          expiresAt: expiringCredit.expiresAt,
        } : null,
        recentTransactions: recentMRTransactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          createdAt: t.createdAt,
        })),
      },
      stamps: {
        current: userRecord?.stampCount || 0,
        lifetime: userRecord?.lifetimeStamps || 0,
      },
      // Legacy — keep for backward compat
      maamiMoney: {
        balance: userRecord?.storeCredit || 0,
        expiresAt: userRecord?.storeCreditExpiresAt || null,
      },
      // Refund eligibility (Section 8)
      refundEligibility: await checkRefundEligibility(sub.id, ctx.user.id, sub.startDate),
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
        overrideProductId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return calculatePartnerBenefits(ctx.user.id, input.outletId, input.items, input.overrideProductId);
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

      // Get price (already GST-inclusive in partner_config)
      const priceKey =
        input.tier === "founding"
          ? "founding_price_paise"
          : "regular_price_paise";
      const pricePaise = parseInt((await getConfig(priceKey)) || "388800"); // Already incl. GST
      const gstRate = parseInt((await getConfig("gst_rate_percent")) || "18");
      const basePricePaise = Math.round(pricePaise / (1 + gstRate / 100));
      const gstAmountPaise = pricePaise - basePricePaise;

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

      // GUARD: Maami Rupees CANNOT be used to pay for Partner Programme membership.
      // The full amount must be paid via Razorpay. This is enforced by architecture:
      // the subscribe flow uses a separate Razorpay order (not the order placement flow)
      // and has no maamiRupeesUsed input field.

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
              config.referrer_reward_paise || "20000"
            ),
            referredRewardAmount: parseInt(
              config.referred_reward_paise || "20000"
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
        baseAmount: basePricePaise,
        gstAmount: gstAmountPaise,
        gstRate,
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

      // Process referral — mark as 'subscribed' only.
      // Actual ₹200 MR credit to BOTH parties happens on the referred partner's FIRST completed order.
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
          await dbInstance
            .update(partnerReferrals)
            .set({
              status: "subscribed",
              referredSubscriptionId: input.subscriptionId,
            })
            .where(eq(partnerReferrals.id, referral.id));
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
      referrerReward: parseInt(config.referrer_reward_paise || "20000"),
      referredReward: parseInt(config.referred_reward_paise || "20000"),
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
        status: z.enum(["all", "active", "expired", "cancelled", "paused", "refund_requested"]).default("all"),
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
  // If withRefund=true, enforces refund eligibility check before cancelling
  adminCancelSubscription: adminProcedure
    .input(
      z.object({
        subscriptionId: z.number(),
        reason: z.string().optional(),
        withRefund: z.boolean().optional(), // If true, validate refund eligibility first
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // If processing as refund, validate eligibility
      if (input.withRefund) {
        const [sub] = await dbInstance
          .select()
          .from(partnerSubscriptions)
          .where(eq(partnerSubscriptions.id, input.subscriptionId));

        if (!sub) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
        }

        const { eligible, reasons } = await checkRefundEligibility(sub.id, sub.userId, sub.startDate);
        if (!eligible) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot process refund: ${reasons.join("; ")}`,
          });
        }
      }

      await dbInstance
        .update(partnerSubscriptions)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancellationReason: input.reason || (input.withRefund ? "Cancelled with refund by admin" : "Cancelled by admin"),
        })
        .where(eq(partnerSubscriptions.id, input.subscriptionId));

      return { success: true, refundProcessed: !!input.withRefund };

    }),

  // Early renewal - renew membership before expiry
  renewEarly: protectedProcedure
    .input(
      z.object({
        tier: z.enum(["founding", "regular"]).optional(), // If not provided, uses current tier
      }).optional()
    )
    .mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Must have an active subscription to renew early
      const existingSub = await getActivePartnerSubscription(ctx.user.id);
      if (!existingSub) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You don't have an active subscription to renew.",
        });
      }

      // Use current tier unless upgrading
      const tier = input?.tier || existingSub.tier;

      // Check founding slots if founding tier
      if (tier === "founding" && existingSub.tier !== "founding") {
        const remaining = parseInt(
          (await getConfig("founding_slots_remaining")) || "0"
        );
        if (remaining <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "All Founding Partner slots have been taken.",
          });
        }
      }

      // Get price with GST
      const priceKey =
        tier === "founding"
          ? "founding_price_paise"
          : "regular_price_paise";
      const basePricePaise = parseInt((await getConfig(priceKey)) || "400000");
      const gstRate = parseInt((await getConfig("gst_rate_percent")) || "18");
      const gstAmountPaise = Math.round(basePricePaise * gstRate / 100);
      const pricePaise = basePricePaise + gstAmountPaise;

      // Create Razorpay order for renewal payment
      const razorpayOrder = await createRazorpayOrder({
        amount: pricePaise,
        currency: "INR",
        receipt: `PARTNER-RENEW-${ctx.user.id}-${Date.now()}`,
        notes: {
          userId: String(ctx.user.id),
          tier,
          type: "partner_renewal",
          existingSubscriptionId: String(existingSub.id),
        },
      });

      return {
        existingSubscriptionId: existingSub.id,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: getRazorpayKeyId(),
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        baseAmount: basePricePaise,
        gstAmount: gstAmountPaise,
        gstRate,
        tier,
        description: `Maami Partner Renewal - ${tier === "founding" ? "Founding" : "Regular"} (Annual)`,
      };
    }),

  // Verify renewal payment and extend subscription
  verifyRenewalPayment: protectedProcedure
    .input(
      z.object({
        existingSubscriptionId: z.number(),
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
        tier: z.enum(["founding", "regular"]),
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

      // Get existing subscription
      const [existingSub] = await dbInstance
        .select()
        .from(partnerSubscriptions)
        .where(
          and(
            eq(partnerSubscriptions.id, input.existingSubscriptionId),
            eq(partnerSubscriptions.userId, ctx.user.id)
          )
        );

      if (!existingSub) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      // Extend from renewal date (today), NOT from original expiry
      const now = new Date();
      const newEndDate = new Date(now);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);

      // Get price for recording
      const priceKey =
        input.tier === "founding"
          ? "founding_price_paise"
          : "regular_price_paise";
      const basePricePaise = parseInt((await getConfig(priceKey)) || "400000");
      const gstRate = parseInt((await getConfig("gst_rate_percent")) || "18");
      const gstAmountPaise = Math.round(basePricePaise * gstRate / 100);
      const pricePaise = basePricePaise + gstAmountPaise;

      // Update the existing subscription with new dates and reset
      await dbInstance
        .update(partnerSubscriptions)
        .set({
          status: "active",
          tier: input.tier,
          startDate: now, // Reset start to renewal date
          endDate: newEndDate, // 12 months from renewal date
          amountPaid: pricePaise,
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySubscriptionId: input.razorpayOrderId,
        })
        .where(eq(partnerSubscriptions.id, input.existingSubscriptionId));

      // NOTE: Stamps carry over — do NOT reset stamps
      // Complimentary item quota resets because we reset startDate,
      // and the benefits log query uses subscriptionId + date range from startDate

      // Notify owner
      try {
        const tierLabel = input.tier === "founding" ? "Founding" : "Regular";
        await notifyOwner({
          title: `Partner Renewed: ${ctx.user.name || "Unknown"}`,
          content: `${ctx.user.name} renewed their ${tierLabel} Partner subscription (\u20b9${pricePaise / 100}). New expiry: ${newEndDate.toLocaleDateString('en-IN')}.`,
        });
      } catch (e) {
        console.error("Failed to notify owner about renewal:", e);
      }

      return {
        success: true,
        newEndDate,
        tier: input.tier,
      };
    }),

  // Section 8: Request refund (customer-facing)
  // Validates eligibility, marks subscription as refund_requested. Admin reviews manually.
  requestRefund: protectedProcedure
    .mutation(async ({ ctx }) => {
      const dbInstance = await getDb();
      if (!dbInstance)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const sub = await getActivePartnerSubscription(ctx.user.id);
      if (!sub) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active subscription found.",
        });
      }

      // Check eligibility
      const { eligible, reasons } = await checkRefundEligibility(sub.id, ctx.user.id, sub.startDate);
      if (!eligible) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Refund not available: ${reasons.join("; ")}`,
        });
      }

      // Mark as refund_requested (admin processes the actual Razorpay refund)
      await dbInstance
        .update(partnerSubscriptions)
        .set({
          status: "refund_requested",
          refundRequestedAt: new Date(),
          cancellationReason: "Refund requested by customer (all eligibility conditions met)",
        })
        .where(eq(partnerSubscriptions.id, sub.id));

      // Notify owner
      try {
        await notifyOwner({
          title: `Partner Refund Requested: ${ctx.user.name || "Unknown"}`,
          content: `${ctx.user.name} has requested a refund for their ${sub.tier} Partner subscription (\u20b9${sub.amountPaid / 100}). All eligibility conditions verified. Please process via Razorpay dashboard.`,
        });
      } catch (e) {
        console.error("Failed to notify owner about refund request:", e);
      }

      return { success: true, message: "Refund request submitted. Our team will process it within 5-7 business days." };
    }),

  // Section 8: Check refund eligibility (for admin panel display)
  adminCheckRefundEligibility: adminProcedure
    .input(z.object({ subscriptionId: z.number() }))
    .query(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [sub] = await dbInstance
        .select()
        .from(partnerSubscriptions)
        .where(eq(partnerSubscriptions.id, input.subscriptionId));

      if (!sub) return { eligible: false, reasons: ["Subscription not found"] };

      return checkRefundEligibility(sub.id, sub.userId, sub.startDate);
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
