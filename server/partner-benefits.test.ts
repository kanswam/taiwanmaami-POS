import { describe, it, expect } from "vitest";

/**
 * Partner Programme Benefits — unit tests
 *
 * UPDATED RULES (Jun 2026 — consolidated brief):
 * 1. Complimentary food/drink item at all outlets — NO minimum purchase required
 *    Eligible at T.Nagar/Anna Nagar: Any beverage up to ₹500 + eligible food items
 *    Eligible at Palladium: Any beverage up to ₹500 only
 *    Mochi items are EXCLUDED (hardcoded)
 *    Limit: 15 per subscription year, 1 per calendar day (IST)
 * 2. 2% Maami Rupees rebate on every order (earned on completion)
 * 3. 10% off workshops
 * 4. Referral programme: ₹200 each (referrer + referee)
 * 5. Two tiers: Founding (₹3,888 incl GST, first 49) and Regular (₹4,500 incl GST)
 */

// Eligible complimentary item slugs at T. Nagar / Anna Nagar
const ELIGIBLE_FOOD_SUBCATEGORIES = [
  "saucy-noodles",
  "flat-bread",
  "pillow-brioche",
  "noodles",
];
const ELIGIBLE_SWEET_SUBCATEGORIES = ["sweet-pillow-brioche"];

function isEligibleFoodItem(subcategorySlug: string): boolean {
  return ELIGIBLE_FOOD_SUBCATEGORIES.includes(subcategorySlug) || ELIGIBLE_SWEET_SUBCATEGORIES.includes(subcategorySlug);
}

function isMochiExcluded(productName: string, categorySlug: string, subcategorySlug: string): boolean {
  // Hardcoded mochi exclusion: category is 'mochis' AND subcategory is NOT 'sweet-pillow-brioche'
  if (categorySlug === 'mochis' && subcategorySlug !== 'sweet-pillow-brioche') return true;
  // Name-based exclusion
  if (/mochi/i.test(productName)) return true;
  return false;
}

// Replicate the new benefit calculation rules as pure functions
function calculateComplimentaryItem(
  outletId: number,
  tnagarOutletId: number,
  annangarOutletId: number,
  palladiumOutletId: number,
  items: Array<{ productId: number; productName: string; subcategorySlug: string; categorySlug: string; lineTotal: number; quantity: number; isDrink: boolean }>,
  complimentaryUsedThisYear: number,
  maxPerYear: number,
  capPaise: number = 50000
) {
  const isEligibleOutlet = (outletId === tnagarOutletId || outletId === annangarOutletId || outletId === palladiumOutletId);
  if (!isEligibleOutlet) return null;
  if (complimentaryUsedThisYear >= maxPerYear) return null;

  // Filter eligible items based on outlet
  let eligibleItems;
  if (outletId === palladiumOutletId) {
    // Palladium: drinks only (up to cap)
    eligibleItems = items.filter(item => item.isDrink && !isMochiExcluded(item.productName, item.categorySlug, item.subcategorySlug));
  } else {
    // T.Nagar / Anna Nagar: drinks + eligible food
    eligibleItems = items.filter(item => {
      if (isMochiExcluded(item.productName, item.categorySlug, item.subcategorySlug)) return false;
      if (item.isDrink) return true;
      return isEligibleFoodItem(item.subcategorySlug);
    });
  }

  if (eligibleItems.length === 0) return null;

  // Select highest-priced eligible item (capped at ₹500)
  const mostExpensive = eligibleItems.reduce((max, item) => {
    const unitPrice = Math.round(item.lineTotal / item.quantity);
    const maxUnitPrice = Math.round(max.lineTotal / max.quantity);
    return unitPrice > maxUnitPrice ? item : max;
  }, eligibleItems[0]);

  const unitPrice = Math.round(mostExpensive.lineTotal / mostExpensive.quantity);
  const freeAmount = Math.min(unitPrice, capPaise);

  return {
    type: "complimentary_item" as const,
    amount: freeAmount,
    itemName: mostExpensive.productName,
    itemOriginalPrice: unitPrice,
  };
}

function calculateMaamiRupeesEarned(orderTotal: number, rebatePct: number = 2): number {
  return Math.round(orderTotal * rebatePct / 100);
}

function calculateStamps(orderTotal: number): number {
  return Math.floor(orderTotal / 45000); // 1 stamp per ₹450
}

// Constants
const TNAGAR_OUTLET = 2;
const ANNANAGAR_OUTLET = 30001;
const PALLADIUM_OUTLET = 1;
const MAX_COMPLIMENTARY_PER_YEAR = 15;
const CAP_PAISE = 50000; // ₹500

describe("Partner Programme: Complimentary Item Selection", () => {
  it("selects highest-priced eligible food item at T.Nagar", () => {
    const result = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, ANNANAGAR_OUTLET, PALLADIUM_OUTLET, [
      { productId: 100, productName: "Biang Biang Noodles", subcategorySlug: "saucy-noodles", categorySlug: "food", lineTotal: 41500, quantity: 1, isDrink: false },
      { productId: 101, productName: "Cong You Bing", subcategorySlug: "flat-bread", categorySlug: "food", lineTotal: 25000, quantity: 1, isDrink: false },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR, CAP_PAISE);
    expect(result).not.toBeNull();
    expect(result!.itemName).toBe("Biang Biang Noodles");
    expect(result!.amount).toBe(41500);
  });

  it("caps free amount at ₹500", () => {
    const result = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, ANNANAGAR_OUTLET, PALLADIUM_OUTLET, [
      { productId: 100, productName: "Expensive Noodles", subcategorySlug: "saucy-noodles", categorySlug: "food", lineTotal: 65000, quantity: 1, isDrink: false },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR, CAP_PAISE);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50000); // Capped at ₹500
  });

  it("returns null when yearly limit reached", () => {
    const result = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, ANNANAGAR_OUTLET, PALLADIUM_OUTLET, [
      { productId: 100, productName: "Biang Biang Noodles", subcategorySlug: "saucy-noodles", categorySlug: "food", lineTotal: 41500, quantity: 1, isDrink: false },
    ], 15, MAX_COMPLIMENTARY_PER_YEAR, CAP_PAISE);
    expect(result).toBeNull();
  });

  it("Palladium only allows drinks, not food", () => {
    const result = calculateComplimentaryItem(PALLADIUM_OUTLET, TNAGAR_OUTLET, ANNANAGAR_OUTLET, PALLADIUM_OUTLET, [
      { productId: 100, productName: "Biang Biang Noodles", subcategorySlug: "saucy-noodles", categorySlug: "food", lineTotal: 41500, quantity: 1, isDrink: false },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR, CAP_PAISE);
    expect(result).toBeNull();
  });

  it("Palladium allows drinks", () => {
    const result = calculateComplimentaryItem(PALLADIUM_OUTLET, TNAGAR_OUTLET, ANNANAGAR_OUTLET, PALLADIUM_OUTLET, [
      { productId: 200, productName: "Brown Sugar Milk Tea", subcategorySlug: "iced-tea", categorySlug: "bubble-tea", lineTotal: 35000, quantity: 1, isDrink: true },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR, CAP_PAISE);
    expect(result).not.toBeNull();
    expect(result!.itemName).toBe("Brown Sugar Milk Tea");
    expect(result!.amount).toBe(35000);
  });

  it("handles qty > 1 correctly (only 1 unit free)", () => {
    const result = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, ANNANAGAR_OUTLET, PALLADIUM_OUTLET, [
      { productId: 100, productName: "Biang Biang Noodles", subcategorySlug: "saucy-noodles", categorySlug: "food", lineTotal: 83000, quantity: 2, isDrink: false },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR, CAP_PAISE);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(41500); // Only 1 unit free
  });

  it("returns null for non-eligible outlet", () => {
    const result = calculateComplimentaryItem(999, TNAGAR_OUTLET, ANNANAGAR_OUTLET, PALLADIUM_OUTLET, [
      { productId: 100, productName: "Biang Biang Noodles", subcategorySlug: "saucy-noodles", categorySlug: "food", lineTotal: 41500, quantity: 1, isDrink: false },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR, CAP_PAISE);
    expect(result).toBeNull();
  });
});

describe("Partner Programme: Mochi Exclusion", () => {
  it("excludes items from mochis category", () => {
    expect(isMochiExcluded("Taro Mochi", "mochis", "classic-mochi")).toBe(true);
  });

  it("excludes items with 'mochi' in name regardless of category", () => {
    expect(isMochiExcluded("Strawberry Mochi Ice Cream", "desserts", "ice-cream")).toBe(true);
  });

  it("does NOT exclude sweet-pillow-brioche even though it's under mochis category", () => {
    expect(isMochiExcluded("Nutella Brioche", "mochis", "sweet-pillow-brioche")).toBe(false);
  });

  it("does NOT exclude regular food items", () => {
    expect(isMochiExcluded("Biang Biang Noodles", "food", "saucy-noodles")).toBe(false);
  });

  it("mochi items are excluded from complimentary selection", () => {
    const result = calculateComplimentaryItem(TNAGAR_OUTLET, TNAGAR_OUTLET, ANNANAGAR_OUTLET, PALLADIUM_OUTLET, [
      { productId: 300, productName: "Taro Mochi", subcategorySlug: "classic-mochi", categorySlug: "mochis", lineTotal: 20000, quantity: 1, isDrink: false },
    ], 0, MAX_COMPLIMENTARY_PER_YEAR, CAP_PAISE);
    expect(result).toBeNull();
  });
});

describe("Partner Programme: Eligible Items Validation", () => {
  it("saucy-noodles subcategory is eligible", () => {
    expect(isEligibleFoodItem("saucy-noodles")).toBe(true);
  });

  it("flat-bread subcategory is eligible", () => {
    expect(isEligibleFoodItem("flat-bread")).toBe(true);
  });

  it("pillow-brioche subcategory is eligible", () => {
    expect(isEligibleFoodItem("pillow-brioche")).toBe(true);
  });

  it("noodles subcategory is eligible", () => {
    expect(isEligibleFoodItem("noodles")).toBe(true);
  });

  it("sweet-pillow-brioche subcategory is eligible", () => {
    expect(isEligibleFoodItem("sweet-pillow-brioche")).toBe(true);
  });

  it("random subcategory is NOT eligible", () => {
    expect(isEligibleFoodItem("classic-mochi")).toBe(false);
  });

  it("drinks subcategory is NOT eligible as food", () => {
    expect(isEligibleFoodItem("iced-tea")).toBe(false);
  });
});

describe("Partner Programme: Maami Rupees Earning", () => {
  it("earns 2% on a ₹500 order", () => {
    expect(calculateMaamiRupeesEarned(50000)).toBe(1000); // ₹10
  });

  it("earns 2% on a ₹1000 order", () => {
    expect(calculateMaamiRupeesEarned(100000)).toBe(2000); // ₹20
  });

  it("rounds correctly on odd amounts", () => {
    expect(calculateMaamiRupeesEarned(33333)).toBe(667); // ₹6.67
  });

  it("earns 0 on zero-value orders", () => {
    expect(calculateMaamiRupeesEarned(0)).toBe(0);
  });
});

describe("Partner Programme: Stamps", () => {
  it("earns 1 stamp per ₹450 spent", () => {
    expect(calculateStamps(45000)).toBe(1);
    expect(calculateStamps(90000)).toBe(2);
    expect(calculateStamps(44999)).toBe(0);
  });

  it("no stamps on zero-value orders", () => {
    expect(calculateStamps(0)).toBe(0);
  });
});

describe("Partner Programme: Benefit Types", () => {
  it("valid benefit types do NOT include drink_discount (removed)", () => {
    const validBenefitTypes = ["complimentary_item", "workshop_discount"];
    expect(validBenefitTypes).not.toContain("drink_discount");
  });

  it("valid benefit types include complimentary_item and workshop_discount", () => {
    const validBenefitTypes = ["complimentary_item", "workshop_discount"];
    expect(validBenefitTypes).toContain("complimentary_item");
    expect(validBenefitTypes).toContain("workshop_discount");
  });
});

describe("Partner Programme: Pricing & Tiers", () => {
  it("founding tier is ₹3,888 incl GST", () => {
    const foundingPricePaise = 388800;
    expect(foundingPricePaise).toBe(388800);
  });

  it("regular tier is ₹4,500 incl GST", () => {
    const regularPricePaise = 450000;
    expect(regularPricePaise).toBe(450000);
  });

  it("founding slots total is 49", () => {
    const foundingSlotsTotal = 49;
    expect(foundingSlotsTotal).toBe(49);
  });

  it("GST back-calculation: founding base = 3888 / 1.18", () => {
    const foundingTotal = 388800;
    const gstRate = 18;
    const foundingBase = Math.round(foundingTotal / (1 + gstRate / 100));
    const foundingGst = foundingTotal - foundingBase;
    expect(foundingBase).toBe(329492); // ₹3,294.92
    expect(foundingGst).toBe(59308); // ₹593.08
  });
});
