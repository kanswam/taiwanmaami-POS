/**
 * Tiered Delivery Charge Calculator
 * 
 * Uses Google Maps Distance Matrix API to calculate driving distance
 * from T. Nagar outlet to customer's delivery address, then applies
 * tiered pricing:
 * 
 *   0 – 10 km  → ₹100
 *  10+ – 15 km → ₹200
 *  15+ – 25 km → ₹300
 *  25+ km      → ₹400
 * 
 * Free delivery for orders ≥ ₹2,500 (handled by caller, not here).
 */

import { makeRequest, DistanceMatrixResult } from "./_core/map";

// T. Nagar outlet address (origin for all deliveries)
const T_NAGAR_ORIGIN = "New No. 29, Burkit Road, T. Nagar, Chennai, Tamil Nadu 600017";

// Delivery charge tiers (in paise)
export const DELIVERY_TIERS = [
  { maxKm: 10,  chargePaise: 10000, label: "₹100" },  // 0–10 km
  { maxKm: 15,  chargePaise: 20000, label: "₹200" },  // 10+–15 km
  { maxKm: 25,  chargePaise: 30000, label: "₹300" },  // 15+–25 km
  { maxKm: Infinity, chargePaise: 40000, label: "₹400" },  // 25+ km
] as const;

// Fallback charge if Google Maps API fails (minimum tier)
const FALLBACK_CHARGE_PAISE = 10000; // ₹100

/**
 * Get the delivery charge in paise based on distance in km
 */
export function getChargeForDistance(distanceKm: number): {
  chargePaise: number;
  tierLabel: string;
  distanceKm: number;
} {
  for (const tier of DELIVERY_TIERS) {
    if (distanceKm <= tier.maxKm) {
      return {
        chargePaise: tier.chargePaise,
        tierLabel: tier.label,
        distanceKm: Math.round(distanceKm * 10) / 10,
      };
    }
  }
  // Should never reach here, but just in case
  return {
    chargePaise: DELIVERY_TIERS[DELIVERY_TIERS.length - 1].chargePaise,
    tierLabel: DELIVERY_TIERS[DELIVERY_TIERS.length - 1].label,
    distanceKm: Math.round(distanceKm * 10) / 10,
  };
}

/**
 * Calculate delivery charge using Google Maps Distance Matrix API
 * 
 * @param deliveryAddress - Full delivery address string
 * @returns Delivery charge details including distance and charge in paise
 */
export async function calculateDeliveryCharge(deliveryAddress: string): Promise<{
  chargePaise: number;
  tierLabel: string;
  distanceKm: number;
  distanceText: string;
  durationText: string;
  usedFallback: boolean;
}> {
  try {
    const result = await makeRequest<DistanceMatrixResult>(
      "/maps/api/distancematrix/json",
      {
        origins: T_NAGAR_ORIGIN,
        destinations: deliveryAddress,
        mode: "driving",
        units: "metric",
      }
    );

    if (
      result.status === "OK" &&
      result.rows?.[0]?.elements?.[0]?.status === "OK"
    ) {
      const element = result.rows[0].elements[0];
      const distanceKm = element.distance.value / 1000; // Convert meters to km
      const charge = getChargeForDistance(distanceKm);

      return {
        ...charge,
        distanceText: element.distance.text,
        durationText: element.duration.text,
        usedFallback: false,
      };
    }

    // API returned but with an error status (e.g., ZERO_RESULTS, NOT_FOUND)
    console.warn(
      "[DeliveryCharge] Distance Matrix returned non-OK status:",
      result.status,
      result.rows?.[0]?.elements?.[0]?.status
    );
    return {
      chargePaise: FALLBACK_CHARGE_PAISE,
      tierLabel: "₹100",
      distanceKm: 0,
      distanceText: "Unknown",
      durationText: "Unknown",
      usedFallback: true,
    };
  } catch (error) {
    console.error("[DeliveryCharge] Google Maps API error:", error);
    return {
      chargePaise: FALLBACK_CHARGE_PAISE,
      tierLabel: "₹100",
      distanceKm: 0,
      distanceText: "Unknown",
      durationText: "Unknown",
      usedFallback: true,
    };
  }
}
