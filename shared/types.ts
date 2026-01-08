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

// Size options (Petite removed per business decision)
export type Size = "regular" | "large";
export const SIZES: { value: Size; label: string; volume: string }[] = [
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
  // Food add-ons
  extraEggCount?: number; // 0-3 eggs
  extraCheese?: boolean;
  coconutCreamCap?: boolean;
  // Hot beverage add-ons
  extraEspresso?: boolean;
  // Product-specific addons (e.g., eggs for Katsu Curry)
  productAddons?: { id: number; name: string; quantity: number; pricePerUnit: number; totalPrice: number }[];
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

// Generate order number - will be replaced with actual sequential number from database
// This generates a temporary placeholder that gets replaced during order creation
export function generateOrderNumber(): string {
  // This is a placeholder - the actual sequential number is generated in routers.ts
  // by querying the max order number and incrementing
  return 'TEMP';
}

// Operating Hours Configuration
export const OUTLET_HOURS = {
  palladium: {
    id: 1,
    name: 'Palladium Mall',
    openHour: 10, // 10:00 AM
    openMinute: 0,
    closeHour: 22, // 10:00 PM
    closeMinute: 0,
    lastOrderMinutesBefore: 0, // In-store orders till 10:00 PM
    onlineLastOrderMinutesBefore: 15, // Online orders till 9:45 PM
  },
  tnagar: {
    id: 2,
    name: 'T Nagar (Moutan)',
    openHour: 12, // 12:00 PM (noon)
    openMinute: 0,
    closeHour: 24, // 12:00 AM (midnight)
    closeMinute: 0,
    lastOrderMinutesBefore: 15, // In-store orders till 11:45 PM
    onlineLastOrderMinutesBefore: 15, // Online orders till 11:45 PM
  },
} as const;

// Global ordering hours (most restrictive for delivery which can go to either outlet)
export const GLOBAL_ORDER_HOURS = {
  openHour: 10, // 10:00 AM - earliest opening time (Palladium)
  openMinute: 0,
  closeHour: 21, // 9:00 PM
  closeMinute: 45, // 9:45 PM - earliest last order time (Palladium online)
};

// Check if a specific outlet is currently accepting orders
export function isOutletOpen(
  outlet: 'palladium' | 'tnagar',
  orderType: 'instore' | 'delivery' | 'pickup' = 'pickup',
  timezone: string = 'Asia/Kolkata'
): { available: boolean; message: string; opensAt?: string; closesAt?: string } {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const currentHour = istTime.getHours();
  const currentMinute = istTime.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  const hours = OUTLET_HOURS[outlet];
  const openTimeInMinutes = hours.openHour * 60 + hours.openMinute;
  
  // For in-store, use lastOrderMinutesBefore; for online, use onlineLastOrderMinutesBefore
  const lastOrderBuffer = orderType === 'instore' ? hours.lastOrderMinutesBefore : hours.onlineLastOrderMinutesBefore;
  
  // Handle midnight (24:00) as 1440 minutes
  const closeTimeInMinutes = (hours.closeHour === 24 ? 24 * 60 : hours.closeHour * 60 + hours.closeMinute) - lastOrderBuffer;
  
  const formatTime = (hour: number, minute: number) => {
    const h = hour === 24 ? 12 : hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const ampm = hour >= 12 && hour < 24 ? 'PM' : 'AM';
    return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };
  
  const opensAt = formatTime(hours.openHour, hours.openMinute);
  const closesAt = formatTime(
    Math.floor((hours.closeHour * 60 + hours.closeMinute - lastOrderBuffer) / 60) % 24,
    (hours.closeHour * 60 + hours.closeMinute - lastOrderBuffer) % 60
  );
  
  if (currentTimeInMinutes < openTimeInMinutes) {
    return {
      available: false,
      message: `${hours.name} opens at ${opensAt}. Please try again later.`,
      opensAt,
      closesAt,
    };
  }
  
  if (currentTimeInMinutes >= closeTimeInMinutes) {
    return {
      available: false,
      message: `${hours.name} is closed for ${orderType === 'instore' ? 'in-store' : 'online'} orders today. Last order was at ${closesAt}.`,
      opensAt,
      closesAt,
    };
  }
  
  return { available: true, message: '', opensAt, closesAt };
}

// Check if ordering is currently available
export function isOrderingAvailable(timezone: string = 'Asia/Kolkata'): { available: boolean; message: string } {
  const now = new Date();
  // Convert to IST
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const currentHour = istTime.getHours();
  const currentMinute = istTime.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  const openTimeInMinutes = GLOBAL_ORDER_HOURS.openHour * 60 + GLOBAL_ORDER_HOURS.openMinute;
  const closeTimeInMinutes = GLOBAL_ORDER_HOURS.closeHour * 60 + GLOBAL_ORDER_HOURS.closeMinute;
  
  if (currentTimeInMinutes < openTimeInMinutes) {
    return {
      available: false,
      message: `Online ordering opens at 12:00 PM. Please try again after noon.`,
    };
  }
  
  if (currentTimeInMinutes >= closeTimeInMinutes) {
    return {
      available: false,
      message: `Online ordering is closed for today. Last order is at 11:45 PM. Please try again tomorrow after 12:00 PM.`,
    };
  }
  
  return { available: true, message: '' };
}

// Delivery Configuration
export const DELIVERY_CONFIG = {
  // T Nagar location coordinates (delivery hub)
  hubLocation: {
    lat: 13.0418,
    lng: 80.2341,
    name: 'T Nagar',
  },
  // Maximum delivery radius in kilometers
  maxRadiusKm: 15,
  // Message to show customers
  radiusMessage: 'Delivery available within 15km of T Nagar, Chennai',
} as const;

// Haversine formula to calculate distance between two coordinates
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if delivery address is within service area
export function isWithinDeliveryRadius(lat: number, lng: number): {
  withinRadius: boolean;
  distanceKm: number;
  message: string;
} {
  const distance = calculateDistanceKm(
    DELIVERY_CONFIG.hubLocation.lat,
    DELIVERY_CONFIG.hubLocation.lng,
    lat,
    lng
  );
  
  if (distance <= DELIVERY_CONFIG.maxRadiusKm) {
    return {
      withinRadius: true,
      distanceKm: Math.round(distance * 10) / 10,
      message: `Delivery available (${Math.round(distance * 10) / 10}km from T Nagar)`,
    };
  }
  
  return {
    withinRadius: false,
    distanceKm: Math.round(distance * 10) / 10,
    message: `Sorry, your location is ${Math.round(distance * 10) / 10}km away. We currently deliver within ${DELIVERY_CONFIG.maxRadiusKm}km of our T Nagar location.`,
  };
}
