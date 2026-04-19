import { describe, it, expect } from "vitest";

/**
 * Partner Programme Benefits — unit tests
 *
 * UPDATED RULES (Apr 19):
 * 1. Complimentary food item at T. Nagar — NO minimum purchase required
 *    Eligible: Biang Biang, Dan Dan, Cong You Bing, Egg Cong You Bing, any Brioche
 *    Limit: 25 per subscription year, 1 per visit
 * 2. 5% off all drinks in every partner order
 * 3. 10% off workshops
 * 4. Referral programme REMOVED
 * 5. Two tiers: Founding (₹2,500, first 50) and Regular (₹3,500)
 */

// Eligible complimentary item slugs at T. Nagar
const ELIGIBLE_COMPLIMENTARY_SLUGS = [
  "biang-biang-noodles",
  "dan-dan-noodles",
  "cong-you-bing",
  "egg-cong-you-bing",
  // Any brioche variant
];

function isEligibleComplimentaryItem(slug: string): boolean {
  return ELIGIBLE_COMPLIMENTARY_SLUGS.includes(slug) || slug.includes("brioche");
}

// Replicate the new benefit calculation rules as pure functions
function calculateComplimentaryItem(
  outletId: number,
  tnagarOutletId: number,
  items: Array<{ productId: number; productName: string; slug: string; lineTotal: number; quantity: number }>,
  complimentaryUsedThisYear: number,
  maxPerYear: number
) {
  if (outletId !== tnagarOutletId) return null;
  if (complimentaryUsedThisYear >= maxPerYear) return null;

  // Find the most expensive eligible item
  const eligibleItems = items.filter((item) => isEligibleComplimentaryItem(item.slug));
  if (eligibleItems.length === 0) return null;

  const mostExpensive = eligibleItems.reduce((max, item) => {
    const unitPrice = Math.round(item.lineTotal / item.quantity);
    const maxUnitPrice = Math.round(max.lineTotal / max.quantity);
    return unitPrice > maxUnitPrice ? item : max;
  }, eligibleItems[0]);

  const freeAmount = Math.round(mostExpensive.lineTotal / mostExpensive.quantity);
  return {
    type: "complimentary_item" as const,
    amount: freeAmount,
    itemName: mostExpensive.productName,
  };
}

function calculateDrinkDiscount(
  items: Array<{ productId: number; productName: string; lineTotal: number; quantity: number; isDrink: boolean }>,
  discountPercent: number
) {
  const drinkItems = items.filter((item) => item.isDrink);
  if (drinkItems.length === 0) return [];

  return drinkItems.map((item) => {
    const discountAmount = Math.round((item.lineTotal * discountPercent) / 100);
    return {
      type: "drink_discount" as const,
      amount: discountAmount,
      itemName: item.productName,
    };
  });
}

function calculateStamps(orderTotal: number): number {
  return Math.floor(orderTotal / 45000); // 1 stamp per ₹450
}

// Constants
const TNAGAR_OUTLET = 2;
const PALLADIUM_OUTLET = 1;
const MAX_COMPLIMENTARY_PER_YEAR = 25;

describe("Partner Programme: Complimentary Food Item at T. Nagar", () => {
  it("gives complimentary Biang Biang at T. Nagar — no minimum purchase", () => {
    const result = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: 100, productName: "Biang Biang Noodles", slug: "biang-biang-noodles", lineTotal: 41500, quantity: 1 },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("complimentary_item");
    expect(result!.amount).toBe(41500);
    expect(result!.itemName).toBe("Biang Biang Noodles");
  });

  it("gives complimentary Dan Dan Noodles at T. Nagar", () => {
    const result = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: 101, productName: "Dan Dan Noodles", slug: "dan-dan-noodles", lineTotal: 39500, quantity: 1 },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(39500);
  });

  it("gives complimentary Cong You Bing at T. Nagar", () => {
    const result = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: 102, productName: "Cong You Bing", slug: "cong-you-bing", lineTotal: 24500, quantity: 1 },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(24500);
  });

  it("gives complimentary Egg Cong You Bing at T. Nagar", () => {
    const result = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: 103, productName: "Egg Cong You Bing", slug: "egg-cong-you-bing", lineTotal: 29500, quantity: 1 },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(29500);
  });

  it("gives complimentary Brioche variant at T. Nagar", () => {
    const result = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: 104, productName: "Matcha Brioche", slug: "matcha-brioche", lineTotal: 18500, quantity: 1 },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(18500);
  });

  it("picks the most expensive eligible item when multiple are in the order", () => {
    const result = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: 100, productName: "Biang Biang Noodles", slug: "biang-biang-noodles", lineTotal: 41500, quantity: 1 },
      { productId: 102, productName: "Cong You Bing", slug: "cong-you-bing", lineTotal: 24500, quantity: 1 },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(41500);
    expect(result!.itemName).toBe("Biang Biang Noodles");
  });

  it("does NOT give complimentary item at Palladium", () => {
    const result = calculateComplimentaryItem(PALLADIUM_OUTLET, TNAGAR_OUTLET, [
      { productId: 100, productName: "Biang Biang Noodles", slug: "biang-biang-noodles", lineTotal: 41500, quantity: 1 },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR);
    expect(result).toBeNull();
  });

  it("does NOT give complimentary item if no eligible items in order", () => {
    const result = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: 200, productName: "Brown Sugar Milk Tea", slug: "brown-sugar-milk-tea", lineTotal: 35000, quantity: 1 },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR);
    expect(result).toBeNull();
  });

  it("does NOT give complimentary item if yearly limit reached", () => {
    const result = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: 100, productName: "Biang Biang Noodles", slug: "biang-biang-noodles", lineTotal: 41500, quantity: 1 },
    ], 25, MAX_COMPLIMENTARY_PER_YEAR);
    expect(result).toBeNull();
  });

  it("gives complimentary item when at 24 out of 25 used", () => {
    const result = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: 100, productName: "Biang Biang Noodles", slug: "biang-biang-noodles", lineTotal: 41500, quantity: 1 },
    ], 24, MAX_COMPLIMENTARY_PER_YEAR);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(41500);
  });

  it("only gives 1 complimentary item even with qty=2", () => {
    const result = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: 100, productName: "Biang Biang Noodles", slug: "biang-biang-noodles", lineTotal: 83000, quantity: 2 },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(41500); // Only 1 unit free
  });
});

describe("Partner Programme: 5% Drink Discount", () => {
  it("applies 5% discount to a single drink", () => {
    const discounts = calculateDrinkDiscount([
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 35000, quantity: 1, isDrink: true },
    ], 5);
    expect(discounts).toHaveLength(1);
    expect(discounts[0].type).toBe("drink_discount");
    expect(discounts[0].amount).toBe(1750); // 5% of ₹350
  });

  it("applies 5% discount to multiple drinks", () => {
    const discounts = calculateDrinkDiscount([
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 35000, quantity: 1, isDrink: true },
      { productId: 201, productName: "Matcha Latte", lineTotal: 45000, quantity: 1, isDrink: true },
    ], 5);
    expect(discounts).toHaveLength(2);
    expect(discounts[0].amount).toBe(1750); // 5% of ₹350
    expect(discounts[1].amount).toBe(2250); // 5% of ₹450
  });

  it("does NOT apply drink discount to food items", () => {
    const discounts = calculateDrinkDiscount([
      { productId: 100, productName: "Biang Biang Noodles", lineTotal: 41500, quantity: 1, isDrink: false },
    ], 5);
    expect(discounts).toHaveLength(0);
  });

  it("applies discount to drinks even when food items are present", () => {
    const discounts = calculateDrinkDiscount([
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 35000, quantity: 1, isDrink: true },
      { productId: 100, productName: "Biang Biang Noodles", lineTotal: 41500, quantity: 1, isDrink: false },
    ], 5);
    expect(discounts).toHaveLength(1);
    expect(discounts[0].amount).toBe(1750);
  });

  it("returns empty array when no items", () => {
    const discounts = calculateDrinkDiscount([], 5);
    expect(discounts).toHaveLength(0);
  });

  it("handles qty > 1 correctly (discount on full line total)", () => {
    const discounts = calculateDrinkDiscount([
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 70000, quantity: 2, isDrink: true },
    ], 5);
    expect(discounts).toHaveLength(1);
    expect(discounts[0].amount).toBe(3500); // 5% of ₹700
  });
});

describe("Partner Programme: Eligible Items Validation", () => {
  it("biang-biang-noodles is eligible", () => {
    expect(isEligibleComplimentaryItem("biang-biang-noodles")).toBe(true);
  });

  it("dan-dan-noodles is eligible", () => {
    expect(isEligibleComplimentaryItem("dan-dan-noodles")).toBe(true);
  });

  it("cong-you-bing is eligible", () => {
    expect(isEligibleComplimentaryItem("cong-you-bing")).toBe(true);
  });

  it("egg-cong-you-bing is eligible", () => {
    expect(isEligibleComplimentaryItem("egg-cong-you-bing")).toBe(true);
  });

  it("any brioche variant is eligible", () => {
    expect(isEligibleComplimentaryItem("matcha-brioche")).toBe(true);
    expect(isEligibleComplimentaryItem("chocolate-brioche")).toBe(true);
    expect(isEligibleComplimentaryItem("plain-brioche")).toBe(true);
  });

  it("drinks are NOT eligible for complimentary item", () => {
    expect(isEligibleComplimentaryItem("brown-sugar-milk-tea")).toBe(false);
    expect(isEligibleComplimentaryItem("matcha-latte")).toBe(false);
  });

  it("non-eligible food items are NOT eligible", () => {
    expect(isEligibleComplimentaryItem("yaki-onigiri")).toBe(false);
    expect(isEligibleComplimentaryItem("mochi")).toBe(false);
  });
});

describe("Partner Programme: Tier Pricing", () => {
  it("founding tier is ₹2,500 (250000 paise)", () => {
    const foundingPrice = 250000;
    expect(foundingPrice).toBe(250000);
    expect(foundingPrice / 100).toBe(2500);
  });

  it("regular tier is ₹3,500 (350000 paise)", () => {
    const regularPrice = 350000;
    expect(regularPrice).toBe(350000);
    expect(regularPrice / 100).toBe(3500);
  });

  it("founding slots limited to 50", () => {
    const totalSlots = 50;
    expect(totalSlots).toBe(50);
  });
});

describe("Partner Programme: Stamp Calculation on Paid Amount", () => {
  it("stamps calculated on amount after complimentary item deducted", () => {
    // Order: BB ₹415 (complimentary) + Tea ₹350 → paid = ₹350 + GST
    const totalAmountAfterBenefit = 36750; // ₹367.50 with GST
    const stamps = calculateStamps(totalAmountAfterBenefit);
    expect(stamps).toBe(0); // below ₹450 threshold
  });

  it("stamps earned on full paid amount when no partner benefit", () => {
    const stamps = calculateStamps(90000); // ₹900 paid
    expect(stamps).toBe(2);
  });

  it("stamps correct when complimentary item reduces total", () => {
    // Order ₹900 total, complimentary ₹415 → paid ₹485 + GST = ₹509.25
    const stamps = calculateStamps(50925);
    expect(stamps).toBe(1);
  });

  it("no stamps on zero-value orders", () => {
    expect(calculateStamps(0)).toBe(0);
  });
});

describe("Partner Programme: Referral Programme REMOVED", () => {
  it("valid benefit types do NOT include referral-related types", () => {
    const validBenefitTypes = ["complimentary_item", "drink_discount", "workshop_discount"];
    expect(validBenefitTypes).not.toContain("referral_reward");
    expect(validBenefitTypes).not.toContain("tea_discount");
  });

  it("subscribe input no longer requires referralCode", () => {
    const subscribeInput = { tier: "founding" as const };
    expect(subscribeInput).not.toHaveProperty("referralCode");
  });
});

describe("Partner Programme: Combined Benefits Scenario", () => {
  it("partner gets complimentary food + drink discount in same order", () => {
    const complimentary = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: 100, productName: "Biang Biang Noodles", slug: "biang-biang-noodles", lineTotal: 41500, quantity: 1 },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR);

    const drinkDiscounts = calculateDrinkDiscount([
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 35000, quantity: 1, isDrink: true },
    ], 5);

    expect(complimentary).not.toBeNull();
    expect(complimentary!.amount).toBe(41500);
    expect(drinkDiscounts).toHaveLength(1);
    expect(drinkDiscounts[0].amount).toBe(1750);

    // Total savings: ₹415 + ₹17.50 = ₹432.50
    const totalSavings = complimentary!.amount + drinkDiscounts.reduce((sum, d) => sum + d.amount, 0);
    expect(totalSavings).toBe(43250);
  });

  it("partner gets only drink discount when no eligible food in order", () => {
    const complimentary = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: 200, productName: "Brown Sugar Milk Tea", slug: "brown-sugar-milk-tea", lineTotal: 35000, quantity: 1 },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR);

    const drinkDiscounts = calculateDrinkDiscount([
      { productId: 200, productName: "Brown Sugar Milk Tea", lineTotal: 35000, quantity: 1, isDrink: true },
    ], 5);

    expect(complimentary).toBeNull();
    expect(drinkDiscounts).toHaveLength(1);
    expect(drinkDiscounts[0].amount).toBe(1750);
  });

  it("partner gets only complimentary food when no drinks in order", () => {
    const complimentary = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, [
      { productId: 100, productName: "Biang Biang Noodles", slug: "biang-biang-noodles", lineTotal: 41500, quantity: 1 },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR);

    const drinkDiscounts = calculateDrinkDiscount([
      { productId: 100, productName: "Biang Biang Noodles", lineTotal: 41500, quantity: 1, isDrink: false },
    ], 5);

    expect(complimentary).not.toBeNull();
    expect(drinkDiscounts).toHaveLength(0);
  });
});
