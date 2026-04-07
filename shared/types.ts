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
  // Product-specific addons (e.g., eggs for Katsu Curry, flavor for Ice Cream Mochi)
  productAddons?: { id: number; name: string; quantity: number; pricePerUnit: number; totalPrice: number; selectionMode?: 'quantity' | 'single_select' }[];
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

// Chennai delivery areas - comprehensive list of all localities (145 areas)
export const CHENNAI_AREAS = [
  { area: "Adambakkam", pincode: "600088" },
  { area: "Adyar", pincode: "600020" },
  { area: "Alandur", pincode: "600016" },
  { area: "Alapakkam", pincode: "600116" },
  { area: "Alwarpet", pincode: "600018" },
  { area: "Alwarthirunagar", pincode: "600087" },
  { area: "Ambattur", pincode: "600053" },
  { area: "Aminjikarai", pincode: "600029" },
  { area: "Anakaputhur", pincode: "600070" },
  { area: "Anna Nagar", pincode: "600040" },
  { area: "Anna Nagar East", pincode: "600102" },
  { area: "Anna Nagar West Extension", pincode: "600101" },
  { area: "Anna Salai", pincode: "600002" },
  { area: "Arumbakkam", pincode: "600106" },
  { area: "Ashok Nagar", pincode: "600083" },
  { area: "Ashok Pillar", pincode: "600083" },
  { area: "Avadi", pincode: "600054" },
  { area: "Ayanavaram", pincode: "600023" },
  { area: "Besant Nagar", pincode: "600090" },
  { area: "Boat Club", pincode: "600028" },
  { area: "CIT Nagar", pincode: "600035" },
  { area: "Cathedral Road", pincode: "600086" },
  { area: "Chengalpattu", pincode: "603001" },
  { area: "Chetpet", pincode: "600031" },
  { area: "Chitalapakkam", pincode: "600064" },
  { area: "Choolaimedu", pincode: "600094" },
  { area: "Chromepet", pincode: "600044" },
  { area: "ECR", pincode: "600041" },
  { area: "Egmore", pincode: "600008" },
  { area: "Ekkaduthangal", pincode: "600097" },
  { area: "Eldams Road", pincode: "600018" },
  { area: "Ennore", pincode: "600057" },
  { area: "Gopalapuram", pincode: "600086" },
  { area: "Greams Road", pincode: "600006" },
  { area: "Guduvancheri", pincode: "603202" },
  { area: "Guindy", pincode: "600032" },
  { area: "Haddows Road", pincode: "600006" },
  { area: "ICF", pincode: "600038" },
  { area: "IIT Madras", pincode: "600036" },
  { area: "Injambakkam", pincode: "600041" },
  { area: "Iyyappanthangal", pincode: "600056" },
  { area: "Jafferkhanpet", pincode: "600095" },
  { area: "KK Nagar", pincode: "600078" },
  { area: "Karapakkam", pincode: "600097" },
  { area: "Kelambakkam", pincode: "603103" },
  { area: "Kellys", pincode: "600010" },
  { area: "Kilpauk", pincode: "600010" },
  { area: "Kodambakkam", pincode: "600024" },
  { area: "Kolathur", pincode: "600099" },
  { area: "Korattur", pincode: "600080" },
  { area: "Kottivakkam", pincode: "600041" },
  { area: "Kotturpuram", pincode: "600085" },
  { area: "Koyambedu", pincode: "600107" },
  { area: "Kundrathur", pincode: "600069" },
  { area: "Luz", pincode: "600004" },
  { area: "MRC Nagar", pincode: "600028" },
  { area: "Madhavaram", pincode: "600060" },
  { area: "Madipakkam", pincode: "600091" },
  { area: "Maduravoyal", pincode: "600095" },
  { area: "Mahalingapuram", pincode: "600034" },
  { area: "Mambalam", pincode: "600033" },
  { area: "Manali", pincode: "600068" },
  { area: "Manali New Town", pincode: "600103" },
  { area: "Manapakkam", pincode: "600089" },
  { area: "Mandaveli", pincode: "600028" },
  { area: "Mangadu", pincode: "600122" },
  { area: "Medavakkam", pincode: "600100" },
  { area: "Meenambakkam", pincode: "600027" },
  { area: "Mogappair", pincode: "600037" },
  { area: "Mogappair East", pincode: "600037" },
  { area: "Mogappair West", pincode: "600037" },
  { area: "Mount Road", pincode: "600002" },
  { area: "Mugalivakkam", pincode: "600116" },
  { area: "Mylapore", pincode: "600004" },
  { area: "Nandanam", pincode: "600035" },
  { area: "Nanganallur", pincode: "600061" },
  { area: "Navalur", pincode: "600130" },
  { area: "Neelankarai", pincode: "600041" },
  { area: "Nerkundram", pincode: "600107" },
  { area: "Nesapakkam", pincode: "600078" },
  { area: "Nolambur", pincode: "600037" },
  { area: "Nungambakkam", pincode: "600034" },
  { area: "OMR", pincode: "600097" },
  { area: "Oragadam", pincode: "602105" },
  { area: "Padi", pincode: "600050" },
  { area: "Palavakkam", pincode: "600041" },
  { area: "Palladium Mall", pincode: "600028" },
  { area: "Pallavaram", pincode: "600043" },
  { area: "Pallikaranai", pincode: "600100" },
  { area: "Pammal", pincode: "600075" },
  { area: "Panagal Park", pincode: "600017" },
  { area: "Park Town", pincode: "600003" },
  { area: "Parrys", pincode: "600001" },
  { area: "Pattabiram", pincode: "600072" },
  { area: "Pazhavanthangal", pincode: "600114" },
  { area: "Perambur", pincode: "600011" },
  { area: "Perumbakkam", pincode: "600100" },
  { area: "Perungudi", pincode: "600096" },
  { area: "Poes Garden", pincode: "600086" },
  { area: "Pondy Bazaar", pincode: "600017" },
  { area: "Ponniamman Medu", pincode: "600110" },
  { area: "Poonamallee", pincode: "600056" },
  { area: "Porur", pincode: "600116" },
  { area: "Purasawalkam", pincode: "600007" },
  { area: "RA Puram", pincode: "600028" },
  { area: "Ramapuram", pincode: "600089" },
  { area: "Rangarajapuram", pincode: "600024" },
  { area: "Royapettah", pincode: "600014" },
  { area: "Royapuram", pincode: "600013" },
  { area: "Saidapet", pincode: "600015" },
  { area: "Saligramam", pincode: "600093" },
  { area: "Selaiyur", pincode: "600073" },
  { area: "Shenoy Nagar", pincode: "600030" },
  { area: "Sholinganallur", pincode: "600119" },
  { area: "Singaperumal Koil", pincode: "603204" },
  { area: "Siruseri", pincode: "600130" },
  { area: "Sowcarpet", pincode: "600079" },
  { area: "Sriperumbudur", pincode: "602105" },
  { area: "St Thomas Mount", pincode: "600016" },
  { area: "Sterling Road", pincode: "600034" },
  { area: "T Nagar", pincode: "600017" },
  { area: "TTK Road", pincode: "600018" },
  { area: "Tambaram", pincode: "600045" },
  { area: "Taramani", pincode: "600113" },
  { area: "Teynampet", pincode: "600018" },
  { area: "Thirumangalam", pincode: "600040" },
  { area: "Thiruneermalai", pincode: "600044" },
  { area: "Thiruvanmiyur", pincode: "600041" },
  { area: "Thoraipakkam", pincode: "600097" },
  { area: "Thousand Lights", pincode: "600006" },
  { area: "Tiruvottiyur", pincode: "600019" },
  { area: "Tondiarpet", pincode: "600081" },
  { area: "Triplicane", pincode: "600005" },
  { area: "Urapakkam", pincode: "603210" },
  { area: "Usman Road", pincode: "600017" },
  { area: "Vadapalani", pincode: "600026" },
  { area: "Valasaravakkam", pincode: "600087" },
  { area: "Vandalur", pincode: "600048" },
  { area: "Velachery", pincode: "600042" },
  { area: "Vepery", pincode: "600007" },
  { area: "Villivakkam", pincode: "600049" },
  { area: "Virugambakkam", pincode: "600092" },
  { area: "Vyasarpadi", pincode: "600039" },
  { area: "Washermanpet", pincode: "600021" },
  { area: "West Mambalam", pincode: "600033" },
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
    orderingEnabled: false, // DISABLED: KOT printer not set up yet at Palladium
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
    orderingEnabled: true,
  },
} satisfies Record<string, {
  id: number;
  name: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
  lastOrderMinutesBefore: number;
  onlineLastOrderMinutesBefore: number;
  orderingEnabled: boolean;
}>;

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
  
  // Check if ordering is disabled for this outlet entirely
  if (!hours.orderingEnabled) {
    return {
      available: false,
      message: `Online ordering is not available at ${hours.name} right now. Please visit T Nagar (Moutan) outlet or order for delivery from T Nagar.`,
    };
  }
  
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
  // Tiered delivery charges based on driving distance from T. Nagar
  tiers: [
    { maxKm: 10, chargeRupees: 100, label: 'Within 10 km' },
    { maxKm: 15, chargeRupees: 200, label: '10–15 km' },
    { maxKm: 25, chargeRupees: 300, label: '15–25 km' },
    { maxKm: Infinity, chargeRupees: 400, label: 'Over 25 km' },
  ],
  // Free delivery threshold in paise
  freeDeliveryThresholdPaise: 250000, // ₹2,500
  // Message to show customers
  radiusMessage: 'Delivery charges: ₹100 (0-10km), ₹200 (10-15km), ₹300 (15-25km), ₹400 (25+km). Free delivery on orders above ₹2,500!',
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

// Get delivery charge tier based on distance
export function getDeliveryTier(distanceKm: number): {
  chargeRupees: number;
  label: string;
  distanceKm: number;
} {
  for (const tier of DELIVERY_CONFIG.tiers) {
    if (distanceKm <= tier.maxKm) {
      return {
        chargeRupees: tier.chargeRupees,
        label: tier.label,
        distanceKm: Math.round(distanceKm * 10) / 10,
      };
    }
  }
  // Fallback to highest tier
  const lastTier = DELIVERY_CONFIG.tiers[DELIVERY_CONFIG.tiers.length - 1];
  return {
    chargeRupees: lastTier.chargeRupees,
    label: lastTier.label,
    distanceKm: Math.round(distanceKm * 10) / 10,
  };
}
