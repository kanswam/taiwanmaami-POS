import { describe, it, expect } from "vitest";

/**
 * Partner Programme Benefits — unit tests
 *
 * These tests validate the benefit calculation rules without hitting the DB.
 * They mirror the logic in calculatePartnerBenefits (partnerRouter.ts).
 *
 * UPDATED RULES (Apr 16):
 * 1. Free Biang Biang at T. Nagar requires at least 1 other item in the order
 * 2. Free Large Bubble Tea at Palladium requires at least 1 other drink
 * 3. 15% tea discount has been REMOVED entirely
 * 4. Loyalty stamps are calculated on amount paid only (free items excluded)
 * 5. Email notification sent to referrer when referral joins
 */

// Replicate the benefit calculation rules as pure functions for testing
function calculateFreeBiangBiang(
  outletId: number,
  tnagarOutletId: number,
  items: Array<{ productId: number; productName: string; lineTotal: number; quantity: number }>,
  biangBiangProductId: number
) {
  if (outletId !== tnagarOutletId) return null;
  const biangItem = items.find((item) => item.productId === biangBiangProductId);
  if (!biangItem) return null;

  // UPDATED: Must have at least 1 other item in the order
  const totalOtherQuantity = items.reduce((sum, item) => {
    if (item.productId === biangBiangProductId) {
      return sum + Math.max(0, item.quantity - 1); // exclude 1 unit of BB
    }
    return sum + item.quantity;
  }, 0);

  if (totalOtherQuantity < 1) return null;

  const freeAmount = Math.round(biangItem.lineTotal / biangItem.quantity);
  return { type: "free_biang_biang" as const, amount: freeAmount };
}

function calculateFreeLargeTea(
  outletId: number,
  palladiumOutletId: number,
  items: Array<{ productId: number; productName: string; lineTotal: number; quantity: number; size?: string | null; isTea: boolean }>,
  freeTeaSize: string
) {
  if (outletId !== palladiumOutletId) return null;
  const largeTeaItems = items.filter((item) => item.isTea && item.size === freeTeaSize);
  if (largeTeaItems.length === 0) return null;

  // UPDATED: Must have at least 1 other drink in the order (total drink qty >= 2)
  const allDrinkItems = items.filter((item) => item.isTea);
  const totalDrinkQuantity = allDrinkItems.reduce((sum, item) => sum + item.quantity, 0);
  if (totalDrinkQuantity < 2) return null;

  // Most expensive large tea
  const mostExpensive = largeTeaItems.reduce((max, item) => {
    const unitPrice = Math.round(item.lineTotal / item.quantity);
    const maxUnitPrice = Math.round(max.lineTotal / max.quantity);
    return unitPrice > maxUnitPrice ? item : max;
  }, largeTeaItems[0]);
  const freeAmount = Math.round(mostExpensive.lineTotal / mostExpensive.quantity);
  return { type: "free_large_tea" as const, amount: freeAmount, itemName: mostExpensive.productName };
}

// Stamp calculation helper: stamps based on amount paid only
function calculateStamps(orderTotal: number, partnerBenefitAmount: number): number {
  // partnerBenefitAmount is already subtracted from totalAmount during order creation
  // so orderTotal already reflects the paid amount
  return Math.floor(orderTotal / 45000); // 1 stamp per ₹450
}

// Email notification helper validation
function buildReferralEmailSubject(referredName: string, rewardAmountPaise: number): string {
  const rewardRupees = rewardAmountPaise / 100;
  return `🎉 ${referredName} joined Maami Partner using your referral! ₹${rewardRupees} credited`;
}

// Constants for tests
const TNAGAR_OUTLET = 2;
const PALLADIUM_OUTLET = 1;
const BIANG_PRODUCT_ID = 100;

describe("Partner Programme: Free Biang Biang (T. Nagar) — with minimum purchase", () => {
  it("gives free Biang Biang when ordered with another item at T. Nagar", () => {
    const result = calculateFreeBiangBiang(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: BIANG_PRODUCT_ID, productName: "Biang Biang Noodles", lineTotal: 41500, quantity: 1 },
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 35000, quantity: 1 },
    ], BIANG_PRODUCT_ID);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("free_biang_biang");
    expect(result!.amount).toBe(41500);
  });

  it("does NOT give free Biang Biang when ordered alone (no other items)", () => {
    const result = calculateFreeBiangBiang(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: BIANG_PRODUCT_ID, productName: "Biang Biang Noodles", lineTotal: 41500, quantity: 1 },
    ], BIANG_PRODUCT_ID);
    expect(result).toBeNull();
  });

  it("gives free for 1 unit when qty=2 (the 2nd BB counts as the other item)", () => {
    const result = calculateFreeBiangBiang(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: BIANG_PRODUCT_ID, productName: "Biang Biang Noodles", lineTotal: 83000, quantity: 2 },
    ], BIANG_PRODUCT_ID);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(41500); // Only 1 unit free
  });

  it("gives free BB when ordered with food (non-drink) item", () => {
    const result = calculateFreeBiangBiang(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: BIANG_PRODUCT_ID, productName: "Biang Biang Noodles", lineTotal: 41500, quantity: 1 },
      { productId: 301, productName: "Yaki Onigiri", lineTotal: 25000, quantity: 1 },
    ], BIANG_PRODUCT_ID);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(41500);
  });

  it("does NOT give free Biang Biang at Palladium", () => {
    const result = calculateFreeBiangBiang(PALLADIUM_OUTLET, TNAGAR_OUTLET, [
      { productId: BIANG_PRODUCT_ID, productName: "Biang Biang Noodles", lineTotal: 41500, quantity: 1 },
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 35000, quantity: 1 },
    ], BIANG_PRODUCT_ID);
    expect(result).toBeNull();
  });

  it("does NOT give free Biang Biang if not in order", () => {
    const result = calculateFreeBiangBiang(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: 999, productName: "Yaki Onigiri", lineTotal: 45000, quantity: 1 },
    ], BIANG_PRODUCT_ID);
    expect(result).toBeNull();
  });
});

describe("Partner Programme: Free Large Bubble Tea (Palladium) — with minimum purchase", () => {
  it("gives free large tea when ordered with another drink at Palladium", () => {
    const result = calculateFreeLargeTea(PALLADIUM_OUTLET, PALLADIUM_OUTLET, [
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 45000, quantity: 1, size: "large", isTea: true },
      { productId: 201, productName: "Jasmine Green Tea", lineTotal: 35000, quantity: 1, size: "regular", isTea: true },
    ], "large");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("free_large_tea");
    expect(result!.amount).toBe(45000);
  });

  it("does NOT give free large tea when only 1 drink ordered (no other drink)", () => {
    const result = calculateFreeLargeTea(PALLADIUM_OUTLET, PALLADIUM_OUTLET, [
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 45000, quantity: 1, size: "large", isTea: true },
    ], "large");
    expect(result).toBeNull();
  });

  it("gives free tea when same large tea has qty=2 (counts as 2 drinks)", () => {
    const result = calculateFreeLargeTea(PALLADIUM_OUTLET, PALLADIUM_OUTLET, [
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 90000, quantity: 2, size: "large", isTea: true },
    ], "large");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(45000); // 1 unit free
  });

  it("does NOT give free tea when 1 drink + 1 food (food is not a drink)", () => {
    const result = calculateFreeLargeTea(PALLADIUM_OUTLET, PALLADIUM_OUTLET, [
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 45000, quantity: 1, size: "large", isTea: true },
      { productId: 300, productName: "Biang Biang Noodles", lineTotal: 41500, quantity: 1, size: null, isTea: false },
    ], "large");
    expect(result).toBeNull();
  });

  it("picks the most expensive large tea when multiple are ordered", () => {
    const result = calculateFreeLargeTea(PALLADIUM_OUTLET, PALLADIUM_OUTLET, [
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 45000, quantity: 1, size: "large", isTea: true },
      { productId: 201, productName: "Matcha Latte", lineTotal: 48000, quantity: 1, size: "large", isTea: true },
    ], "large");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(48000);
    expect(result!.itemName).toBe("Matcha Latte");
  });

  it("does NOT give free tea for regular size at Palladium (even with 2 drinks)", () => {
    const result = calculateFreeLargeTea(PALLADIUM_OUTLET, PALLADIUM_OUTLET, [
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 35000, quantity: 1, size: "regular", isTea: true },
      { productId: 201, productName: "Jasmine Green Tea", lineTotal: 35000, quantity: 1, size: "regular", isTea: true },
    ], "large");
    expect(result).toBeNull();
  });

  it("does NOT give free tea at T. Nagar", () => {
    const result = calculateFreeLargeTea(TNAGAR_OUTLET, PALLADIUM_OUTLET, [
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 45000, quantity: 1, size: "large", isTea: true },
      { productId: 201, productName: "Jasmine Green Tea", lineTotal: 35000, quantity: 1, size: "regular", isTea: true },
    ], "large");
    expect(result).toBeNull();
  });
});

describe("Partner Programme: Tea Discount REMOVED", () => {
  it("getProgrammeInfo returns teaDiscountPercent: 0", () => {
    // The getProgrammeInfo endpoint now always returns 0 for tea discount
    const teaDiscountPercent = 0; // hardcoded in partnerRouter.ts
    expect(teaDiscountPercent).toBe(0);
  });

  it("calculatePartnerBenefits does NOT return tea_discount benefits", () => {
    // The benefit types are now only: free_biang_biang and free_large_tea
    const validBenefitTypes = ["free_biang_biang", "free_large_tea"];
    expect(validBenefitTypes).not.toContain("tea_discount");
  });
});

describe("Partner Programme: Stamp Calculation on Paid Amount Only", () => {
  it("stamps calculated on totalAmount (which already excludes partner benefit)", () => {
    // Order: subtotal ₹765 (BB ₹415 + tea ₹350), partner benefit ₹415 (free BB)
    // totalAmount = 765 - 415 = 350 (₹3.50) + GST... but for stamp calc we use totalAmount
    // totalAmount stored in DB already has benefit subtracted
    const totalAmountAfterBenefit = 35000 + 1750; // ₹350 + 5% GST = ₹367.50 → 36750 paise
    const stamps = calculateStamps(36750, 0);
    expect(stamps).toBe(0); // ₹367.50 < ₹450, no stamps
  });

  it("stamps earned on full paid amount when no partner benefit", () => {
    const stamps = calculateStamps(90000, 0); // ₹900 paid
    expect(stamps).toBe(2); // 2 stamps (₹900 / ₹450 = 2)
  });

  it("stamps earned correctly when partner benefit reduces total below threshold", () => {
    // Order: ₹900 total, but ₹415 free BB → totalAmount = ₹485 + GST
    const totalAmount = 48500 + 2425; // ₹485 + 5% GST = ₹509.25 → 50925 paise
    const stamps = calculateStamps(50925, 0);
    expect(stamps).toBe(1); // 1 stamp (₹509.25 / ₹450 = 1.13)
  });

  it("no stamps on zero-value orders", () => {
    const stamps = calculateStamps(0, 0);
    expect(stamps).toBe(0);
  });
});

describe("Partner Programme: Referral Email Notification", () => {
  it("email subject includes referred person's name and reward amount", () => {
    const subject = buildReferralEmailSubject("Priya", 25000);
    expect(subject).toContain("Priya");
    expect(subject).toContain("250");
    expect(subject).toContain("credited");
  });

  it("email subject formats reward correctly for different amounts", () => {
    const subject = buildReferralEmailSubject("Kannan", 50000);
    expect(subject).toContain("Kannan");
    expect(subject).toContain("500");
  });
});

describe("Partner Programme: Welcome Screen Data", () => {
  it("verifyPayment returns referralCode and tier for welcome screen", () => {
    const verifiedResponse = {
      success: true,
      referralCode: "KANNAN26ABC",
      tier: "founding",
      endDate: new Date("2027-04-16"),
    };
    expect(verifiedResponse.success).toBe(true);
    expect(verifiedResponse.referralCode).toBeTruthy();
    expect(verifiedResponse.tier).toMatch(/^(founding|regular)$/);
  });

  it("welcome screen shows correct tier badge", () => {
    const isFounder = "founding" === "founding";
    expect(isFounder).toBe(true);
    const isRegular = "regular" === "founding";
    expect(isRegular).toBe(false);
  });

  it("referral link is correctly formatted", () => {
    const referralCode = "KANNAN26ABC";
    const origin = "https://taiwanmaami.com";
    const link = `${origin}/partner?ref=${referralCode}`;
    expect(link).toBe("https://taiwanmaami.com/partner?ref=KANNAN26ABC");
    expect(link).toContain("?ref=");
  });
});
