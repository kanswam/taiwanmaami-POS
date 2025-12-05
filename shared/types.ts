/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// GST Constants
export const GST_RATE = 0.05; // 5% total
export const STATE_GST_RATE = 0.025; // 2.5%
export const CENTRAL_GST_RATE = 0.025; // 2.5%

// Size options
export type Size = "petite" | "regular" | "large";
export const SIZES: { value: Size; label: string; volume: string }[] = [
  { value: "petite", label: "Petite", volume: "350ml" },
  { value: "regular", label: "Regular", volume: "480ml" },
  { value: "large", label: "Large", volume: "700ml" },
];

// Sugar levels (free customization)
export const SUGAR_LEVELS = [
  { value: "0%", label: "No Sugar (0%)" },
  { value: "25%", label: "Less Sugar (25%)" },
  { value: "50%", label: "Half Sugar (50%)" },
  { value: "75%", label: "Less Sweet (75%)" },
  { value: "100%", label: "Regular (100%)" },
];

// Ice levels (free customization)
export const ICE_LEVELS = [
  { value: "no_ice", label: "No Ice" },
  { value: "less_ice", label: "Less Ice" },
  { value: "regular_ice", label: "Regular Ice" },
  { value: "extra_ice", label: "Extra Ice" },
];

// Order types
export type OrderType = "instore" | "delivery" | "pickup";

// Order status
export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";

// Payment methods
export type PaymentMethod = "cash" | "card" | "upi" | "razorpay";

// User roles
export type UserRole = "customer" | "staff" | "admin";

// Boba types
export type BobaSize = 'small' | 'big';
export type BobaType = 'tapioca' | 'popping';

// Extra boba type
export interface ExtraBoba {
  type: BobaType;
  size?: BobaSize;
  flavor?: string;
  price: number;
}

// Cart item type
export interface CartItem {
  id: string;
  productId: number;
  productName: string;
  chineseName?: string;
  subcategoryId: number;
  imageUrl?: string;
  size?: Size;
  withBoba?: boolean;
  bobaSize?: BobaSize;
  bobaType?: BobaType;
  poppingBobaFlavor?: string;
  extraBoba?: ExtraBoba;
  sugarLevel?: string;
  iceLevel?: string;
  addons: { id: number; name: string; price: number }[];
  quantity: number;
  unitPrice: number;
  addonsTotal: number;
  lineTotal: number;
  specialInstructions?: string;
}

// Price calculation helpers
export function calculateGst(subtotal: number): { stateGst: number; centralGst: number; total: number } {
  const stateGst = Math.round(subtotal * STATE_GST_RATE);
  const centralGst = Math.round(subtotal * CENTRAL_GST_RATE);
  return { stateGst, centralGst, total: stateGst + centralGst };
}

export function formatPrice(priceInPaise: number): string {
  return `₹${(priceInPaise / 100).toFixed(0)}`;
}

export function formatPriceWithGst(priceInPaise: number): string {
  const withGst = Math.round(priceInPaise * (1 + GST_RATE));
  return formatPrice(withGst);
}

// Chennai delivery areas
export const CHENNAI_AREAS = [
  { area: "T Nagar", pincode: "600017" },
  { area: "Velachery", pincode: "600042" },
  { area: "Palladium Mall", pincode: "600042" },
  { area: "Adyar", pincode: "600020" },
  { area: "Anna Nagar", pincode: "600040" },
  { area: "Mylapore", pincode: "600004" },
  { area: "Triplicane", pincode: "600005" },
  { area: "Nungambakkam", pincode: "600034" },
  { area: "Kodambakkam", pincode: "600024" },
  { area: "Alwarpet", pincode: "600018" },
  { area: "Besant Nagar", pincode: "600090" },
  { area: "Thiruvanmiyur", pincode: "600041" },
  { area: "Guindy", pincode: "600032" },
  { area: "Ashok Nagar", pincode: "600083" },
  { area: "KK Nagar", pincode: "600078" },
  { area: "Vadapalani", pincode: "600026" },
  { area: "Porur", pincode: "600116" },
  { area: "Tambaram", pincode: "600045" },
  { area: "Chromepet", pincode: "600044" },
  { area: "Perungudi", pincode: "600096" },
  { area: "Sholinganallur", pincode: "600119" },
  { area: "OMR", pincode: "600097" },
  { area: "ECR", pincode: "600041" },
  { area: "Egmore", pincode: "600008" },
  { area: "Chetpet", pincode: "600031" },
  { area: "Kilpauk", pincode: "600010" },
  { area: "Royapettah", pincode: "600014" },
  { area: "Teynampet", pincode: "600018" },
  { area: "Saidapet", pincode: "600015" },
  { area: "Kotturpuram", pincode: "600085" },
];

// Generate order number
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TM${timestamp}${random}`;
}
