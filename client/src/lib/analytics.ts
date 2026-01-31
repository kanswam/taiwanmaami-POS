/**
 * GA4 Enhanced E-commerce Analytics
 * Tracks the full purchase funnel: view_item → add_to_cart → begin_checkout → purchase
 */

// Declare gtag on window
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

// Helper to safely call gtag
const gtag = (...args: unknown[]) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args);
  }
};

// Product/Item interface for GA4
export interface GA4Item {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_category2?: string;
  item_variant?: string;
  price: number;
  quantity: number;
  currency?: string;
}

// Convert cart item to GA4 item format
export const toGA4Item = (item: {
  id: number | string;
  name: string;
  category?: string;
  variant?: string;
  price: number;
  quantity: number;
}): GA4Item => ({
  item_id: String(item.id),
  item_name: item.name,
  item_category: item.category || 'Bubble Tea',
  item_variant: item.variant,
  price: item.price,
  quantity: item.quantity,
  currency: 'INR',
});

/**
 * Track when a user views a product/item
 * Trigger: When product detail modal/page is opened
 */
export const trackViewItem = (item: GA4Item, value?: number) => {
  gtag('event', 'view_item', {
    currency: 'INR',
    value: value || item.price,
    items: [item],
  });
  console.log('[GA4] view_item:', item.item_name);
};

/**
 * Track when a user adds an item to cart
 * Trigger: When "Add to Cart" button is clicked
 */
export const trackAddToCart = (item: GA4Item, value?: number) => {
  gtag('event', 'add_to_cart', {
    currency: 'INR',
    value: value || item.price * item.quantity,
    items: [item],
  });
  console.log('[GA4] add_to_cart:', item.item_name, 'qty:', item.quantity);
};

/**
 * Track when a user removes an item from cart
 * Trigger: When item is removed from cart
 */
export const trackRemoveFromCart = (item: GA4Item, value?: number) => {
  gtag('event', 'remove_from_cart', {
    currency: 'INR',
    value: value || item.price * item.quantity,
    items: [item],
  });
  console.log('[GA4] remove_from_cart:', item.item_name);
};

/**
 * Track when a user views their cart
 * Trigger: When cart page/modal is opened
 */
export const trackViewCart = (items: GA4Item[], value: number) => {
  gtag('event', 'view_cart', {
    currency: 'INR',
    value,
    items,
  });
  console.log('[GA4] view_cart:', items.length, 'items, value:', value);
};

/**
 * Track when a user begins checkout
 * Trigger: When "Proceed to Checkout" is clicked
 */
export const trackBeginCheckout = (items: GA4Item[], value: number, coupon?: string) => {
  gtag('event', 'begin_checkout', {
    currency: 'INR',
    value,
    coupon,
    items,
  });
  console.log('[GA4] begin_checkout:', items.length, 'items, value:', value);
};

/**
 * Track when a user adds shipping info
 * Trigger: When delivery address is confirmed
 */
export const trackAddShippingInfo = (items: GA4Item[], value: number, shippingTier?: string) => {
  gtag('event', 'add_shipping_info', {
    currency: 'INR',
    value,
    shipping_tier: shippingTier || 'Standard Delivery',
    items,
  });
  console.log('[GA4] add_shipping_info:', shippingTier);
};

/**
 * Track when a user adds payment info
 * Trigger: When payment method is selected
 */
export const trackAddPaymentInfo = (items: GA4Item[], value: number, paymentType: string) => {
  gtag('event', 'add_payment_info', {
    currency: 'INR',
    value,
    payment_type: paymentType,
    items,
  });
  console.log('[GA4] add_payment_info:', paymentType);
};

/**
 * Track completed purchase
 * Trigger: When order is successfully placed
 */
export const trackPurchase = (
  transactionId: string,
  items: GA4Item[],
  value: number,
  options?: {
    tax?: number;
    shipping?: number;
    coupon?: string;
  }
) => {
  gtag('event', 'purchase', {
    transaction_id: transactionId,
    currency: 'INR',
    value,
    tax: options?.tax || 0,
    shipping: options?.shipping || 0,
    coupon: options?.coupon,
    items,
  });
  console.log('[GA4] purchase:', transactionId, 'value:', value);
};

// ============================================
// LEAD GENERATION & ENGAGEMENT EVENTS
// ============================================

/**
 * Track lead generation (birthday signup, newsletter, etc.)
 */
export const trackGenerateLead = (leadType: string, value?: number) => {
  gtag('event', 'generate_lead', {
    currency: 'INR',
    value: value || 0,
    lead_type: leadType,
  });
  console.log('[GA4] generate_lead:', leadType);
};

/**
 * Track sign up completion
 */
export const trackSignUp = (method: string) => {
  gtag('event', 'sign_up', {
    method,
  });
  console.log('[GA4] sign_up:', method);
};

/**
 * Track login
 */
export const trackLogin = (method: string) => {
  gtag('event', 'login', {
    method,
  });
  console.log('[GA4] login:', method);
};

/**
 * Track share action
 */
export const trackShare = (contentType: string, itemId: string, method: string) => {
  gtag('event', 'share', {
    content_type: contentType,
    item_id: itemId,
    method,
  });
  console.log('[GA4] share:', contentType, itemId);
};

/**
 * Track search
 */
export const trackSearch = (searchTerm: string) => {
  gtag('event', 'search', {
    search_term: searchTerm,
  });
  console.log('[GA4] search:', searchTerm);
};

/**
 * Track custom events
 */
export const trackCustomEvent = (eventName: string, params?: Record<string, unknown>) => {
  gtag('event', eventName, params);
  console.log('[GA4] custom:', eventName, params);
};

// ============================================
// ENGAGEMENT EVENTS FOR TAIWAN MAAMI
// ============================================

/**
 * Track birthday signup (lead generation)
 */
export const trackBirthdaySignup = (month: number, day: number) => {
  trackGenerateLead('birthday_signup', 450); // Value of free drink
  trackCustomEvent('birthday_signup', { month, day });
};

/**
 * Track WhatsApp order click
 */
export const trackWhatsAppOrder = () => {
  trackCustomEvent('whatsapp_order_click', {
    method: 'whatsapp',
  });
};

/**
 * Track workshop booking interest
 */
export const trackWorkshopInterest = (workshopName: string) => {
  trackGenerateLead('workshop_interest', 0);
  trackCustomEvent('workshop_interest', { workshop_name: workshopName });
};

/**
 * Track wholesale inquiry
 */
export const trackWholesaleInquiry = () => {
  trackGenerateLead('wholesale_inquiry', 0);
};

/**
 * Track menu category view
 */
export const trackMenuCategoryView = (category: string) => {
  trackCustomEvent('menu_category_view', { category });
};

/**
 * Track discount code application
 */
export const trackApplyDiscount = (couponCode: string, success: boolean) => {
  trackCustomEvent('apply_discount', {
    coupon_code: couponCode,
    success,
  });
};

/**
 * Track store locator interaction
 */
export const trackStoreLocator = (action: 'view' | 'directions' | 'call', storeName: string) => {
  trackCustomEvent('store_locator', {
    action,
    store_name: storeName,
  });
};
