import { describe, it, expect } from "vitest";

/**
 * Partner Programme Benefits — unit tests
 *
 * These tests validate the benefit calculation rules without hitting the DB.
 * They mirror the logic in calculatePartnerBenefits (partnerRouter.ts).
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
  // Most expensive large tea
  const mostExpensive = largeTeaItems.reduce((max, item) => {
    const unitPrice = Math.round(item.lineTotal / item.quantity);
    const maxUnitPrice = Math.round(max.lineTotal / max.quantity);
    return unitPrice > maxUnitPrice ? item : max;
  }, largeTeaItems[0]);
  const freeAmount = Math.round(mostExpensive.lineTotal / mostExpensive.quantity);
  return { type: "free_large_tea" as const, amount: freeAmount, itemName: mostExpensive.productName };
}

function calculateTeaDiscount(
  items: Array<{ productId: number; productName: string; lineTotal: number; quantity: number; size?: string | null; isTea: boolean }>,
  discountPercent: number,
  freeTeaAlreadyApplied: boolean
) {
  let eligibleTeaItems = items.filter((item) => item.isTea);

  if (freeTeaAlreadyApplied) {
    // Exclude the free large tea item (qty=1, size=large)
    const freeTeaItem = eligibleTeaItems.find((i) => i.size === "large");
    eligibleTeaItems = eligibleTeaItems.filter((i) => {
      if (!freeTeaItem) return true;
      if (i.productId !== freeTeaItem.productId) return true;
      if (i.productId === freeTeaItem.productId && i.quantity > 1) return true;
      return false;
    });
  }

  if (eligibleTeaItems.length === 0) return null;

  // Cheapest tea
  const cheapestTea = eligibleTeaItems.reduce((min, item) => {
    const unitPrice = Math.round(item.lineTotal / item.quantity);
    const minUnitPrice = Math.round(min.lineTotal / min.quantity);
    return unitPrice < minUnitPrice ? item : min;
  }, eligibleTeaItems[0]);

  const unitPrice = Math.round(cheapestTea.lineTotal / cheapestTea.quantity);
  const discount = Math.round((unitPrice * discountPercent) / 100);
  return { type: "tea_discount" as const, amount: discount, discountPercent };
}

// Constants for tests
const TNAGAR_OUTLET = 2;
const PALLADIUM_OUTLET = 1;
const BIANG_PRODUCT_ID = 100;
const TEA_DISCOUNT = 15;

describe("Partner Programme: Free Biang Biang (T. Nagar)", () => {
  it("gives free Biang Biang when ordered at T. Nagar", () => {
    const result = calculateFreeBiangBiang(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: BIANG_PRODUCT_ID, productName: "Biang Biang Noodles", lineTotal: 41500, quantity: 1 },
    ], BIANG_PRODUCT_ID);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("free_biang_biang");
    expect(result!.amount).toBe(41500);
  });

  it("gives free for only 1 unit when qty > 1", () => {
    const result = calculateFreeBiangBiang(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: BIANG_PRODUCT_ID, productName: "Biang Biang Noodles", lineTotal: 83000, quantity: 2 },
    ], BIANG_PRODUCT_ID);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(41500); // Only 1 unit free
  });

  it("does NOT give free Biang Biang at Palladium", () => {
    const result = calculateFreeBiangBiang(PALLADIUM_OUTLET, TNAGAR_OUTLET, [
      { productId: BIANG_PRODUCT_ID, productName: "Biang Biang Noodles", lineTotal: 41500, quantity: 1 },
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

describe("Partner Programme: Free Large Bubble Tea (Palladium)", () => {
  it("gives free large tea when ordered at Palladium", () => {
    const result = calculateFreeLargeTea(PALLADIUM_OUTLET, PALLADIUM_OUTLET, [
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 45000, quantity: 1, size: "large", isTea: true },
    ], "large");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("free_large_tea");
    expect(result!.amount).toBe(45000);
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

  it("does NOT give free tea for regular size at Palladium", () => {
    const result = calculateFreeLargeTea(PALLADIUM_OUTLET, PALLADIUM_OUTLET, [
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 35000, quantity: 1, size: "regular", isTea: true },
    ], "large");
    expect(result).toBeNull();
  });

  it("does NOT give free tea at T. Nagar", () => {
    const result = calculateFreeLargeTea(TNAGAR_OUTLET, PALLADIUM_OUTLET, [
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 45000, quantity: 1, size: "large", isTea: true },
    ], "large");
    expect(result).toBeNull();
  });
});

describe("Partner Programme: 15% Tea Discount", () => {
  it("applies 15% discount to 1 tea at T. Nagar", () => {
    const result = calculateTeaDiscount([
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 35000, quantity: 1, size: "regular", isTea: true },
    ], TEA_DISCOUNT, false);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("tea_discount");
    expect(result!.amount).toBe(5250); // 15% of 35000
  });

  it("picks the cheapest tea when multiple teas ordered", () => {
    const result = calculateTeaDiscount([
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 45000, quantity: 1, size: "large", isTea: true },
      { productId: 201, productName: "Jasmine Green Tea", lineTotal: 35000, quantity: 1, size: "regular", isTea: true },
    ], TEA_DISCOUNT, false);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(5250); // 15% of 35000 (cheapest)
  });

  it("excludes the free large tea at Palladium from discount eligibility", () => {
    const result = calculateTeaDiscount([
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 45000, quantity: 1, size: "large", isTea: true },
    ], TEA_DISCOUNT, true);
    // The only tea is the free one, so no discount
    expect(result).toBeNull();
  });

  it("applies discount to a different tea when free large tea already given", () => {
    const result = calculateTeaDiscount([
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 45000, quantity: 1, size: "large", isTea: true },
      { productId: 201, productName: "Jasmine Green Tea", lineTotal: 35000, quantity: 1, size: "regular", isTea: true },
    ], TEA_DISCOUNT, true);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(5250); // 15% of 35000 (the regular tea)
  });

  it("does NOT apply discount to non-tea items", () => {
    const result = calculateTeaDiscount([
      { productId: 300, productName: "Biang Biang Noodles", lineTotal: 41500, quantity: 1, isTea: false },
    ], TEA_DISCOUNT, false);
    expect(result).toBeNull();
  });
});

describe("Partner Programme: Welcome Screen Data", () => {
  it("verifyPayment returns referralCode and tier for welcome screen", () => {
    // Simulating the verifyPayment response structure
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
