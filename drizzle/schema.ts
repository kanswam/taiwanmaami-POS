import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, decimal, date } from "drizzle-orm/mysql-core";

// Users table with extended fields for bubble tea shop
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["customer", "staff", "admin"]).default("customer").notNull(),
  loyaltyPoints: int("loyaltyPoints").default(0).notNull(),
  // Store credit for refunds/compensation (in paise)
  storeCredit: int("storeCredit").default(0).notNull(),
  // Digital stamp card fields
  stampCount: int("stampCount").default(0).notNull(),
  lifetimeStamps: int("lifetimeStamps").default(0).notNull(),
  lastStampDate: timestamp("lastStampDate"),
  // Admin notes for customer
  notes: text("notes"),
  // Birthday fields for birthday offer
  birthMonth: int("birthMonth"), // 1-12
  birthDay: int("birthDay"), // 1-31
  birthdayCodeUsedYear: int("birthdayCodeUsedYear"), // Track which year they used their birthday code
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// Customer addresses for delivery
export const addresses = mysqlTable("addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  addressLine1: text("addressLine1").notNull(),
  addressLine2: text("addressLine2"),
  area: varchar("area", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).default("Chennai").notNull(),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  landmark: text("landmark"),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Main categories: Bubble Tea, Coffee, Mochis, Food
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  displayOrder: int("displayOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  availableInstore: boolean("availableInstore").default(true).notNull(), // All items available in-store including hot beverages
  availableDelivery: boolean("availableDelivery").default(true).notNull(), // For hot beverages = false
  availablePickup: boolean("availablePickup").default(true).notNull(), // For hot beverages = false
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Subcategories with base pricing (e.g., Black Tea, Green Tea, Fruit Mochi)
export const subcategories = mysqlTable("subcategories", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  chineseName: varchar("chineseName", { length: 100 }),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  // Base pricing for size variants (in-store) - prices in paise/cents
  basePricePetiteWithBoba: int("basePricePetiteWithBoba"),
  basePricePetiteNoBoba: int("basePricePetiteNoBoba"),
  basePriceRegularWithBoba: int("basePriceRegularWithBoba"),
  basePriceRegularNoBoba: int("basePriceRegularNoBoba"),
  basePriceLargeWithBoba: int("basePriceLargeWithBoba"),
  basePriceLargeNoBoba: int("basePriceLargeNoBoba"),
  // Delivery pricing (higher, no petite)
  deliveryPriceRegularWithBoba: int("deliveryPriceRegularWithBoba"),
  deliveryPriceRegularNoBoba: int("deliveryPriceRegularNoBoba"),
  deliveryPriceLargeWithBoba: int("deliveryPriceLargeWithBoba"),
  deliveryPriceLargeNoBoba: int("deliveryPriceLargeNoBoba"),
  hasSizeVariants: boolean("hasSizeVariants").default(false).notNull(),
  hasBobaOption: boolean("hasBobaOption").default(false).notNull(),
  availableInstore: boolean("availableInstore").default(true).notNull(),
  availableDelivery: boolean("availableDelivery").default(true).notNull(),
  availablePickup: boolean("availablePickup").default(true).notNull(),
  availableAtPalladium: boolean("availableAtPalladium").default(true).notNull(),
  availableAtTnagar: boolean("availableAtTnagar").default(true).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Products (flavor variants under subcategories)
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  subcategoryId: int("subcategoryId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  chineseName: varchar("chineseName", { length: 200 }),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  imageUrl2: text("imageUrl2"), // Second product image
  imageUrl3: text("imageUrl3"), // Third product image
  // Image crop data (JSON: {x, y, width, height, zoom})
  imageCropData: json("imageCropData"),
  // For items with fixed pricing (food, mochis)
  instorePrice: int("instorePrice"),
  deliveryPrice: int("deliveryPrice"),
  deliveryUnitMultiplier: int("deliveryUnitMultiplier").default(1).notNull(),
  // Mochi quantity pricing (in-store only) - prices in paise
  mochiPrice1pc: int("mochiPrice1pc"),
  mochiPrice2pc: int("mochiPrice2pc"),
  mochiPrice3pc: int("mochiPrice3pc"),
  // Dietary info
  isVegetarian: boolean("isVegetarian").default(true).notNull(),
  isVegan: boolean("isVegan").default(false).notNull(),
  containsEgg: boolean("containsEgg").default(false).notNull(),
  isNonVeg: boolean("isNonVeg").default(false).notNull(),
  // Price inheritance
  useBasePrice: boolean("useBasePrice").default(true).notNull(), // If true, inherit price from subcategory
  // Availability
  isInStock: boolean("isInStock").default(true).notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(), // Real-time availability toggle for staff
  availableInstore: boolean("availableInstore").default(true).notNull(),
  availableDelivery: boolean("availableDelivery").default(true).notNull(),
  availableAtPalladium: boolean("availableAtPalladium").default(true).notNull(), // Product availability at Palladium outlet
  availableAtTnagar: boolean("availableAtTnagar").default(true).notNull(), // Product availability at T.Nagar outlet
  // Size availability override (JSON array of sizes, null means all sizes from subcategory)
  // Example: ["large"] means only large size available
  availableSizes: json("availableSizes").$type<string[] | null>(),
  displayOrder: int("displayOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  // Featured product for homepage carousel
  isFeatured: boolean("isFeatured").default(false).notNull(),
  featuredOrder: int("featuredOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Add-ons (popping boba, vegan milk, food add-ons)
export const addons = mysqlTable("addons", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  chineseName: varchar("chineseName", { length: 100 }),
  type: mysqlEnum("type", ["boba_flavor", "boba_size", "extra_boba", "vegan_milk", "food_addon"]).notNull(),
  // Size-based pricing for boba/milk add-ons
  pricePetite: int("pricePetite"),
  priceRegular: int("priceRegular"),
  priceLarge: int("priceLarge"),
  // Fixed price for food add-ons
  fixedPrice: int("fixedPrice"),
  // Maximum quantity for quantity-based addons (e.g., max 3 eggs)
  maxQuantity: int("maxQuantity").default(3),
  isActive: boolean("isActive").default(true).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Junction table for products and their available add-ons
export const productAddons = mysqlTable("product_addons", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  addonId: int("addonId").notNull(),
  // Selection mode: 'quantity' = traditional qty picker (None/1/2/3), 'single_select' = radio-style pick-one
  // When all addons for a product use 'single_select', they render as a radio group (pick one flavor)
  selectionMode: mysqlEnum("selectionMode", ["quantity", "single_select"]).default("quantity"),
});

// Junction table for category-specific add-ons
export const categoryAddons = mysqlTable("category_addons", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  addonId: int("addonId").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(), // Show by default for all products in category
});

// Junction table for subcategory-specific add-ons
export const subcategoryAddons = mysqlTable("subcategory_addons", {
  id: int("id").autoincrement().primaryKey(),
  subcategoryId: int("subcategoryId").notNull(),
  addonId: int("addonId").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
});

// Free customization options (sugar level, ice level)
export const customizationOptions = mysqlTable("customization_options", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["sugar_level", "ice_level"]).notNull(),
  value: varchar("value", { length: 50 }).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
});

// Orders
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 20 }).notNull().unique(),
  userId: int("userId"),
  customerName: varchar("customerName", { length: 200 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  orderType: mysqlEnum("orderType", ["instore", "delivery", "pickup"]).notNull(),
  tableNumber: varchar("tableNumber", { length: 50 }), // For in-store orders - table number
  orderStatus: mysqlEnum("orderStatus", ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "completed", "cancelled"]).default("pending").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "partial", "completed", "refunded"]).default("pending").notNull(),
  // Amounts in paise
  subtotal: int("subtotal").notNull(),
  stateGst: int("stateGst").notNull(),
  centralGst: int("centralGst").notNull(),
  deliveryCharge: int("deliveryCharge").default(0).notNull(),
  discountAmount: int("discountAmount").default(0).notNull(),
  loyaltyPointsUsed: int("loyaltyPointsUsed").default(0).notNull(),
  totalAmount: int("totalAmount").notNull(),
  // Delivery info
  deliveryAddressId: int("deliveryAddressId"),
  deliveryAddress: text("deliveryAddress"),
  // Scheduled pickup
  scheduledTime: timestamp("scheduledTime"),
  // Payment info
  razorpayOrderId: varchar("razorpayOrderId", { length: 100 }),
  razorpayPaymentId: varchar("razorpayPaymentId", { length: 100 }),
  porterOrderId: varchar("porterOrderId", { length: 100 }),
  // Staff info for POS orders
  staffId: int("staffId"),
  outletId: int("outletId"), // Which outlet processed this order
  posSessionId: int("posSessionId"), // Link to POS session for audit
  specialInstructions: text("specialInstructions"),
  discountCode: varchar("discountCode", { length: 50 }),
  // Manual discount (for in-store orders)
  manualDiscountAmount: int("manualDiscountAmount").default(0), // Amount in paise
  manualDiscountType: mysqlEnum("manualDiscountType", ["fixed", "percentage"]), // Type of discount
  manualDiscountPercent: int("manualDiscountPercent"), // If percentage type, the percent value
  manualDiscountReason: text("manualDiscountReason"), // Reason for discount
  manualDiscountApprovedBy: int("manualDiscountApprovedBy"), // Admin user ID who approved
  staffNotes: text("staffNotes"), // Internal notes from staff about the order
  // Payment method for in-store orders (recorded at collection)
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "upi", "card", "razorpay", "swiggy_dineout", "zomato_dineout", "eazydiner", "birthday_gift", "complimentary", "other"]),
  // Payment proof screenshot URL (for non-cash payments)
  paymentProofUrl: text("paymentProofUrl"),
  // Partner programme benefit tracking
  partnerBenefitAmount: int("partnerBenefitAmount").default(0).notNull(), // Total Partner benefit discount (paise)
  partnerSubscriptionId: int("partnerSubscriptionId"), // FK to partner_subscriptions if Partner benefits applied
  refundAmount: int("refundAmount").default(0).notNull(),
  refundMethod: mysqlEnum("refundMethod", ["store_credit", "original_payment", "none"]).default("none"),
  refundReason: text("refundReason"),
  refundProcessedAt: timestamp("refundProcessedAt"),
  refundProcessedBy: int("refundProcessedBy"),
  // Idempotency key to prevent duplicate orders on network retry
  idempotencyKey: varchar("idempotencyKey", { length: 100 }).unique(),
  // Test data flag - NEVER delete orders where isTestData = false
  isTestData: boolean("isTestData").default(false).notNull(),
  // Payment collection tracking
  paymentCollectedBy: varchar("paymentCollectedBy", { length: 255 }), // Staff name who collected/confirmed payment
  paymentCollectedAt: timestamp("paymentCollectedAt"), // When payment was collected
  paymentNote: text("paymentNote"), // Note about payment (e.g., "verified via Razorpay API")
  // Reconciliation fields for payment discrepancy tracking
  reconciliationNote: text("reconciliationNote"), // Note explaining how discrepancy was resolved
  reconciledAt: timestamp("reconciledAt"), // When the order was marked as reconciled
  reconciledBy: int("reconciledBy"), // Admin user ID who reconciled
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

// Order items
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 200 }).notNull(),
  size: mysqlEnum("size", ["petite", "regular", "large"]),
  withBoba: boolean("withBoba"),
  sugarLevel: varchar("sugarLevel", { length: 50 }),
  iceLevel: varchar("iceLevel", { length: 50 }),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: int("unitPrice").notNull(),
  addonsTotal: int("addonsTotal").default(0).notNull(),
  lineTotal: int("lineTotal").notNull(),
  specialInstructions: text("specialInstructions"),
  // Item status for cancellation/replacement tracking
  status: mysqlEnum("status", ["active", "cancelled", "replaced"]).default("active"),
  cancelledAt: timestamp("cancelledAt"),
  cancelledBy: int("cancelledBy"),
  cancellationReason: text("cancellationReason"),
  // Test data flag - NEVER delete order items where isTestData = false
  isTestData: boolean("isTestData").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Order item add-ons
export const orderItemAddons = mysqlTable("order_item_addons", {
  id: int("id").autoincrement().primaryKey(),
  orderItemId: int("orderItemId").notNull(),
  addonId: int("addonId").notNull(),
  addonName: varchar("addonName", { length: 100 }).notNull(),
  addonPrice: int("addonPrice").notNull(),
});

// Payments (for split payment support)
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "upi", "razorpay", "eazydiner"]).notNull(),
  amount: int("amount").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "success", "failed"]).default("pending").notNull(),
  razorpayPaymentId: varchar("razorpayPaymentId", { length: 100 }),
  razorpaySignature: varchar("razorpaySignature", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Discounts and promo codes
export const discounts = mysqlTable("discounts", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  type: mysqlEnum("type", ["percentage", "fixed_amount"]).notNull(),
  value: int("value").notNull(),
  minOrderAmount: int("minOrderAmount").default(0).notNull(),
  maxDiscountAmount: int("maxDiscountAmount"),
  validFrom: timestamp("validFrom"),
  validUntil: timestamp("validUntil"),
  usageLimit: int("usageLimit"),
  usageCount: int("usageCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  firstTimeOnly: boolean("firstTimeOnly").default(false).notNull(), // Only for first-time registered customers
  orderTypeRestriction: mysqlEnum("orderTypeRestriction", ["all", "delivery", "pickup", "dine_in"]).default("all").notNull(), // Restrict to specific order types
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Track which users have used which discount codes (for firstTimeOnly enforcement)
export const discountUsage = mysqlTable("discount_usage", {
  id: int("id").autoincrement().primaryKey(),
  discountId: int("discountId").notNull(),
  userId: int("userId").notNull(),
  orderId: int("orderId").notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

// Loyalty transactions
export const loyaltyTransactions = mysqlTable("loyalty_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  pointsEarned: int("pointsEarned").default(0).notNull(),
  pointsRedeemed: int("pointsRedeemed").default(0).notNull(),
  balanceAfter: int("balanceAfter").notNull(),
  transactionType: mysqlEnum("transactionType", ["earned", "redeemed", "adjustment"]).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Store locations
export const storeLocations = mysqlTable("store_locations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  address: text("address").notNull(),
  area: varchar("area", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).default("Chennai").notNull(),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  openingHours: text("openingHours"),
  googleMapsUrl: text("googleMapsUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Outlet-specific product availability and pricing
export const outletProducts = mysqlTable("outlet_products", {
  id: int("id").autoincrement().primaryKey(),
  outletId: int("outletId").notNull(), // References storeLocations.id
  productId: int("productId").notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  // Price overrides (null means use default product price)
  instorePriceOverride: int("instorePriceOverride"),
  deliveryPriceOverride: int("deliveryPriceOverride"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// POS staff sessions for audit trail
export const posSessions = mysqlTable("pos_sessions", {
  id: int("id").autoincrement().primaryKey(),
  // Employee Master data
  employeeId: varchar("employeeId", { length: 50 }).notNull(),
  employeeCode: varchar("employeeCode", { length: 50 }).notNull(),
  employeeName: varchar("employeeName", { length: 200 }).notNull(),
  employeeMobile: varchar("employeeMobile", { length: 20 }).notNull(),
  // Outlet assignment
  outletId: int("outletId").notNull(),
  outletName: varchar("outletName", { length: 200 }).notNull(),
  // Session timing
  loginTime: timestamp("loginTime").defaultNow().notNull(),
  logoutTime: timestamp("logoutTime"),
  isActive: boolean("isActive").default(true).notNull(),
  // Device info for security
  deviceInfo: text("deviceInfo"),
  ipAddress: varchar("ipAddress", { length: 50 }),
});

// POS audit log for all actions
export const posAuditLog = mysqlTable("pos_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  employeeCode: varchar("employeeCode", { length: 50 }).notNull(),
  outletId: int("outletId").notNull(),
  action: mysqlEnum("action", [
    "login", "logout", "create_order", "void_order", "apply_discount",
    "refund", "cash_drawer_open", "price_override", "item_void"
  ]).notNull(),
  orderId: int("orderId"),
  details: json("details"), // Additional action-specific data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Chennai areas for delivery validation
export const deliveryAreas = mysqlTable("delivery_areas", {
  id: int("id").autoincrement().primaryKey(),
  areaName: varchar("areaName", { length: 100 }).notNull().unique(),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  deliveryCharge: int("deliveryCharge").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
});

// Loyalty rewards (vouchers earned from stamp card)
export const loyaltyRewards = mysqlTable("loyalty_rewards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  rewardType: varchar("rewardType", { length: 50 }).notNull(), // 'free_large_bubble_tea'
  voucherCode: varchar("voucherCode", { length: 20 }).notNull().unique(),
  isRedeemed: boolean("isRedeemed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  redeemedAt: timestamp("redeemedAt"),
  redeemedOrderId: int("redeemedOrderId"),
});

// Stamp transaction log for audit
export const stampTransactions = mysqlTable("stamp_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  action: mysqlEnum("action", ["earn", "bonus", "welcome", "redeem", "expire", "deduct", "admin_deduct"]).notNull(),
  stamps: int("stamps").notNull(), // positive for earn, negative for redeem
  orderTotal: int("orderTotal"), // in paise
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Guest orders (for checkout without login)
export const guestOrders = mysqlTable("guest_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  guestName: varchar("guestName", { length: 200 }).notNull(),
  guestPhone: varchar("guestPhone", { length: 20 }).notNull(),
  guestEmail: varchar("guestEmail", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Customer reviews
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  rating: int("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  customerName: varchar("customerName", { length: 200 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  adminResponse: text("adminResponse"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// KOT Queue for kitchen order tickets
export const kotQueue = mysqlTable("kot_queue", {
  id: int("id").autoincrement().primaryKey(),
  orderId: varchar("orderId", { length: 255 }).notNull(),
  outletId: int("outletId").notNull(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull(),
  kotData: json("kotData").notNull(), // JSON object with order details
  isPrinted: boolean("isPrinted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  printedAt: timestamp("printedAt"),
});

// Receipt Queue for customer receipts
export const receiptQueue = mysqlTable("receipt_queue", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  outletId: int("outletId"),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull(),
  receiptData: json("receiptData").notNull(), // JSON object with receipt details
  isPrinted: boolean("isPrinted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  printedAt: timestamp("printedAt"),
});

// Site settings for CMS (key-value pairs for all editable site content)
export const siteSettings = mysqlTable("site_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Product audit log for tracking all changes
export const productAuditLog = mysqlTable("product_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 200 }).notNull(), // Store name at time of change
  userId: int("userId"), // Who made the change (null for system changes)
  userName: varchar("userName", { length: 200 }), // Store user name at time of change
  action: mysqlEnum("action", [
    "create",
    "update",
    "delete",
    "deactivate",
    "reactivate",
    "stock_in",
    "stock_out",
    "price_change",
    "image_change"
  ]).notNull(),
  fieldChanged: varchar("fieldChanged", { length: 100 }), // Which field was changed
  oldValue: text("oldValue"), // Previous value (JSON for complex fields)
  newValue: text("newValue"), // New value (JSON for complex fields)
  ipAddress: varchar("ipAddress", { length: 45 }), // For additional security
  userAgent: text("userAgent"), // Browser/device info
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Category audit log
export const categoryAuditLog = mysqlTable("category_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  entityType: mysqlEnum("entityType", ["category", "subcategory"]).notNull(),
  entityId: int("entityId").notNull(),
  entityName: varchar("entityName", { length: 200 }).notNull(),
  userId: int("userId"),
  userName: varchar("userName", { length: 200 }),
  action: mysqlEnum("action", ["create", "update", "delete", "deactivate", "reactivate"]).notNull(),
  fieldChanged: varchar("fieldChanged", { length: 100 }),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Customer complaints for delivery issues, refunds, etc.
export const complaints = mysqlTable("complaints", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // Null for guest complaints
  orderId: int("orderId"),
  orderNumber: varchar("orderNumber", { length: 50 }),
  customerName: varchar("customerName", { length: 200 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  complaintType: mysqlEnum("complaintType", [
    "delivery_issue",
    "quality_issue",
    "missing_item",
    "wrong_order",
    "late_delivery",
    "payment_issue",
    "staff_behavior",
    "other"
  ]).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  // Resolution details
  resolution: text("resolution"),
  resolutionType: mysqlEnum("resolutionType", ["refund", "store_credit", "replacement", "apology", "no_action"]),
  refundAmount: int("refundAmount"), // In paise
  storeCreditAmount: int("storeCreditAmount"), // In paise
  resolvedBy: int("resolvedBy"), // Admin user ID who resolved
  resolvedByName: varchar("resolvedByName", { length: 200 }),
  resolvedAt: timestamp("resolvedAt"),
  // Audit
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Admin PINs for discount authorization
export const adminPins = mysqlTable("admin_pins", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pinHash: varchar("pinHash", { length: 255 }).notNull(), // Hashed PIN
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Discount authorization log
export const discountAuthorizations = mysqlTable("discount_authorizations", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId"),
  orderNumber: varchar("orderNumber", { length: 50 }),
  discountAmount: int("discountAmount").notNull(), // In paise
  discountReason: text("discountReason"),
  authorizedBy: int("authorizedBy").notNull(), // Admin user ID
  authorizedByName: varchar("authorizedByName", { length: 200 }),
  requestedBy: int("requestedBy"), // Staff user ID
  requestedByName: varchar("requestedByName", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Refund requests for approval workflow
export const refundRequests = mysqlTable("refund_requests", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull(),
  refundAmount: int("refundAmount").notNull(), // In paise
  refundReason: text("refundReason").notNull(),
  refundType: mysqlEnum("refundType", ["full", "partial", "store_credit"]).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  requestedBy: int("requestedBy").notNull(), // Staff user ID
  requestedByName: varchar("requestedByName", { length: 200 }),
  reviewedBy: int("reviewedBy"), // Admin user ID
  reviewedByName: varchar("reviewedByName", { length: 200 }),
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Subcategory = typeof subcategories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Addon = typeof addons.$inferSelect;
export type CategoryAddon = typeof categoryAddons.$inferSelect;
export type SubcategoryAddon = typeof subcategoryAddons.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Discount = typeof discounts.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type StoreLocation = typeof storeLocations.$inferSelect;
export type DeliveryArea = typeof deliveryAreas.$inferSelect;
export type OutletProduct = typeof outletProducts.$inferSelect;
export type PosSession = typeof posSessions.$inferSelect;
export type PosAuditLog = typeof posAuditLog.$inferSelect;
export type LoyaltyReward = typeof loyaltyRewards.$inferSelect;
export type StampTransaction = typeof stampTransactions.$inferSelect;
export type GuestOrder = typeof guestOrders.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type KotQueue = typeof kotQueue.$inferSelect;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type ProductAuditLog = typeof productAuditLog.$inferSelect;
export type CategoryAuditLog = typeof categoryAuditLog.$inferSelect;
export type Complaint = typeof complaints.$inferSelect;
export type InsertComplaint = typeof complaints.$inferInsert;
export type AdminPin = typeof adminPins.$inferSelect;
export type DiscountAuthorization = typeof discountAuthorizations.$inferSelect;
export type RefundRequest = typeof refundRequests.$inferSelect;

// Order Audit Log - Track all modifications to orders for compliance and dispute resolution
export const orderAuditLog = mysqlTable("order_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  orderNumber: varchar("orderNumber", { length: 20 }).notNull(),
  userId: int("userId"), // Staff/admin who made the change
  userName: varchar("userName", { length: 200 }), // Name of staff/admin
  userRole: mysqlEnum("userRole", ["customer", "staff", "admin"]).notNull(),
  actionType: mysqlEnum("actionType", [
    "payment_collected",
    "item_added",
    "item_cancelled",
    "discount_applied",
    "order_cancelled",
    "status_changed",
    "manual_discount_applied",
    "refund_issued",
    "order_locked",
    "order_unlocked"
  ]).notNull(),
  description: text("description"), // Human-readable description of what changed
  oldValue: text("oldValue"), // Previous value (JSON stringified if needed)
  newValue: text("newValue"), // New value (JSON stringified if needed)
  itemId: int("itemId"), // For item-specific actions
  itemName: varchar("itemName", { length: 200 }), // Product name for item actions
  itemQuantity: int("itemQuantity"), // Quantity of item affected
  amount: int("amount"), // Amount affected (in paise) for payment/discount actions
  ipAddress: varchar("ipAddress", { length: 45 }), // IP address of the user making change
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderAuditLog = typeof orderAuditLog.$inferSelect;
export type InsertOrderAuditLog = typeof orderAuditLog.$inferInsert;


// =============================================
// EVENTS & WORKSHOPS TABLES
// =============================================

// Event Inquiries - Customer submissions for catering
export const eventInquiries = mysqlTable("event_inquiries", {
  id: int("id").autoincrement().primaryKey(),
  referenceNumber: varchar("referenceNumber", { length: 20 }).notNull().unique(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  company: varchar("company", { length: 255 }),
  eventType: mysqlEnum("eventType", ["wedding", "corporate", "school", "birthday", "private", "festival", "other"]).notNull(),
  eventDate: timestamp("eventDate").notNull(),
  eventTime: varchar("eventTime", { length: 20 }).notNull(),
  venue: text("venue").notNull(),
  guestCount: int("guestCount").notNull(),
  serviceType: mysqlEnum("serviceType", ["beverages_only", "food_only", "both"]).notNull(),
  preferredBeverages: text("preferredBeverages"),
  preferredFood: text("preferredFood"),
  budgetRange: varchar("budgetRange", { length: 50 }),
  specialRequirements: text("specialRequirements"),
  referralSource: varchar("referralSource", { length: 50 }),
  status: mysqlEnum("status", ["new", "contacted", "quoted", "confirmed", "completed", "cancelled"]).default("new").notNull(),
  assignedTo: varchar("assignedTo", { length: 255 }),
  internalNotes: text("internalNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EventInquiry = typeof eventInquiries.$inferSelect;
export type InsertEventInquiry = typeof eventInquiries.$inferInsert;

// Event Orders - Confirmed event orders with pricing
export const eventOrders = mysqlTable("event_orders", {
  id: int("id").autoincrement().primaryKey(),
  inquiryId: int("inquiryId"),
  orderNumber: varchar("orderNumber", { length: 20 }).notNull().unique(),
  customerName: varchar("customerName", { length: 200 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }).notNull(),
  companyName: varchar("companyName", { length: 200 }),
  eventType: mysqlEnum("eventType", ["wedding", "corporate", "school", "private", "other"]).notNull(),
  eventDate: varchar("eventDate", { length: 20 }).notNull(),
  eventTime: varchar("eventTime", { length: 20 }),
  venue: text("venue").notNull(),
  guestCount: int("guestCount").notNull(),
  subtotal: int("subtotal").default(0).notNull(), // in paise
  gstAmount: int("gstAmount").default(0).notNull(), // in paise
  discountAmount: int("discountAmount").default(0).notNull(), // in paise
  totalAmount: int("totalAmount").default(0).notNull(), // in paise
  advancePercentage: int("advancePercentage").default(50).notNull(),
  advanceAmount: int("advanceAmount").default(0).notNull(), // in paise
  advancePaid: boolean("advancePaid").default(false).notNull(),
  advancePaidAt: timestamp("advancePaidAt"),
  balanceAmount: int("balanceAmount").default(0).notNull(), // in paise
  balancePaid: boolean("balancePaid").default(false).notNull(),
  balancePaidAt: timestamp("balancePaidAt"),
  status: mysqlEnum("status", ["draft", "quoted", "confirmed", "in_progress", "completed", "cancelled"]).default("draft").notNull(),
  adminNotes: text("adminNotes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EventOrder = typeof eventOrders.$inferSelect;
export type InsertEventOrder = typeof eventOrders.$inferInsert;

// Event Order Items - Line items for event orders
export const eventOrderItems = mysqlTable("event_order_items", {
  id: int("id").autoincrement().primaryKey(),
  eventOrderId: int("eventOrderId").notNull(),
  itemType: mysqlEnum("itemType", ["beverage", "food", "staff", "delivery", "equipment", "other"]).notNull(),
  itemName: varchar("itemName", { length: 200 }).notNull(),
  description: text("description"),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: int("unitPrice").default(0).notNull(), // in paise
  totalPrice: int("totalPrice").default(0).notNull(), // in paise
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EventOrderItem = typeof eventOrderItems.$inferSelect;
export type InsertEventOrderItem = typeof eventOrderItems.$inferInsert;

// Workshops - Cooking workshops/classes
export const workshops = mysqlTable("workshops", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  shortDescription: varchar("shortDescription", { length: 255 }),
  description: text("description"),
  instructorName: varchar("instructorName", { length: 255 }),
  instructor: varchar("instructor", { length: 255 }).notNull(),
  instructorTitle: varchar("instructorTitle", { length: 100 }),
  instructorImage: varchar("instructorImage", { length: 500 }),
  workshopDate: timestamp("workshopDate").notNull(),
  duration: varchar("duration", { length: 50 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  maxCapacity: int("maxCapacity").notNull(),
  ticketsSold: int("ticketsSold").default(0).notNull(),
  ticketPrice: int("ticketPrice").notNull(), // in paise
  imageUrl: varchar("imageUrl", { length: 500 }),
  highlights: text("highlights"),
  whatYouLearn: text("whatYouLearn"),
  includes: text("includes"),
  status: mysqlEnum("status", ["draft", "published", "cancelled", "completed"]).default("draft").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  // Additional columns that exist in DB
  startTime: varchar("startTime", { length: 10 }),
  endTime: varchar("endTime", { length: 10 }),
  venue: varchar("venue", { length: 500 }),
  totalCapacity: int("totalCapacity").default(0),
  bookedCount: int("bookedCount").default(0),
  earlyBirdPrice: int("earlyBirdPrice"), // in paise
  earlyBirdDeadline: date("earlyBirdDeadline"),
  price: int("price").default(0), // in paise
});

export type Workshop = typeof workshops.$inferSelect;
export type InsertWorkshop = typeof workshops.$inferInsert;

// Workshop Dates - Multiple dates per workshop
export const workshopDates = mysqlTable("workshop_dates", {
  id: int("id").autoincrement().primaryKey(),
  workshopId: int("workshopId").notNull(),
  sessionDate: date("sessionDate").notNull(),
  startTime: varchar("startTime", { length: 10 }),
  endTime: varchar("endTime", { length: 10 }),
  maxCapacity: int("maxCapacity").default(8).notNull(),
  bookedCount: int("bookedCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkshopDate = typeof workshopDates.$inferSelect;
export type InsertWorkshopDate = typeof workshopDates.$inferInsert;

// Workshop Bookings - Ticket purchases
export const workshopBookings = mysqlTable("workshop_bookings", {
  id: int("id").autoincrement().primaryKey(),
  workshopId: int("workshopId").notNull(),
  workshopDateId: int("workshopDateId"), // Reference to specific date session
  bookingNumber: varchar("bookingNumber", { length: 20 }).notNull().unique(),
  customerName: varchar("customerName", { length: 200 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }).notNull(),
  ticketCount: int("ticketCount").default(1).notNull(),
  totalAmount: int("totalAmount").notNull(), // in paise
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "refunded", "cancelled"]).default("pending").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  paymentId: varchar("paymentId", { length: 100 }),
  invoiceUrl: varchar("invoiceUrl", { length: 500 }),
  specialRequirements: text("specialRequirements"),
  attendedStatus: mysqlEnum("attendedStatus", ["not_attended", "attended", "no_show"]).default("not_attended").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkshopBooking = typeof workshopBookings.$inferSelect;
export type InsertWorkshopBooking = typeof workshopBookings.$inferInsert;


// Workshop Waitlist - For sold-out dates
export const workshopWaitlist = mysqlTable("workshop_waitlist", {
  id: int("id").autoincrement().primaryKey(),
  workshopId: int("workshopId").notNull(),
  workshopDateId: int("workshopDateId").notNull(),
  customerName: varchar("customerName", { length: 200 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }).notNull(),
  ticketCount: int("ticketCount").default(1).notNull(),
  status: mysqlEnum("status", ["waiting", "notified", "booked", "expired"]).default("waiting").notNull(),
  notifiedAt: timestamp("notifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkshopWaitlist = typeof workshopWaitlist.$inferSelect;
export type InsertWorkshopWaitlist = typeof workshopWaitlist.$inferInsert;

// Backup Logs - Track database backups
export const backupLogs = mysqlTable("backup_logs", {
  id: int("id").autoincrement().primaryKey(),
  backupKey: varchar("backupKey", { length: 500 }).notNull(),
  backupUrl: text("backupUrl"),
  size: int("size").default(0).notNull(), // Size in bytes
  tablesBackedUp: int("tablesBackedUp").default(0).notNull(),
  totalRows: int("totalRows").default(0).notNull(),
  status: mysqlEnum("status", ["success", "failed", "restored"]).default("success").notNull(),
  errorMessage: text("errorMessage"),
  triggeredBy: mysqlEnum("triggeredBy", ["scheduled", "manual"]).default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BackupLog = typeof backupLogs.$inferSelect;
export type InsertBackupLog = typeof backupLogs.$inferInsert;

// Content Pages - Store T&Cs, Privacy Policy, and other editable content
export const contentPages = mysqlTable("content_pages", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // e.g., "terms-and-conditions", "privacy-policy"
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // HTML content from rich text editor
  metaDescription: varchar("metaDescription", { length: 500 }), // SEO meta description
  isPublished: boolean("isPublished").default(true).notNull(),
  lastEditedBy: varchar("lastEditedBy", { length: 255 }), // User who last edited
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentPage = typeof contentPages.$inferSelect;
export type InsertContentPage = typeof contentPages.$inferInsert;


// =============================================
// WHOLESALE PORTAL TABLES
// =============================================

// Wholesale Product Categories
export const wholesaleCategories = mysqlTable("wholesale_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  displayOrder: int("displayOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WholesaleCategory = typeof wholesaleCategories.$inferSelect;
export type InsertWholesaleCategory = typeof wholesaleCategories.$inferInsert;

// Wholesale Products
export const wholesaleProducts = mysqlTable("wholesale_products", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  description: text("description"),
  specifications: text("specifications"), // Technical specs, ingredients, etc.
  // Media
  imageUrl: text("imageUrl"),
  imageUrl2: text("imageUrl2"),
  imageUrl3: text("imageUrl3"),
  videoUrl: text("videoUrl"),
  // Pricing (in paise)
  basePrice: int("basePrice").notNull(), // Price per unit
  unit: varchar("unit", { length: 50 }).notNull(), // kg, pack, case, piece, etc.
  unitsPerCase: int("unitsPerCase"), // If sold in cases
  // Bulk pricing tiers (JSON array: [{minQty: 10, price: 9000}, {minQty: 50, price: 8500}])
  pricingTiers: json("pricingTiers"),
  // Stock
  stockQuantity: int("stockQuantity").default(0).notNull(),
  lowStockThreshold: int("lowStockThreshold").default(10).notNull(),
  // Flags
  isActive: boolean("isActive").default(true).notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  // Test data flag
  isTestData: boolean("isTestData").default(false).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WholesaleProduct = typeof wholesaleProducts.$inferSelect;
export type InsertWholesaleProduct = typeof wholesaleProducts.$inferInsert;

// Wholesale Customers (B2B buyers)
export const wholesaleCustomers = mysqlTable("wholesale_customers", {
  id: int("id").autoincrement().primaryKey(),
  // Business info
  businessName: varchar("businessName", { length: 255 }).notNull(),
  gstNumber: varchar("gstNumber", { length: 20 }),
  businessType: mysqlEnum("businessType", ["cafe", "restaurant", "retailer", "distributor", "caterer", "other"]).default("other"),
  // Contact person
  contactPerson: varchar("contactPerson", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  // Address
  addressLine1: text("addressLine1").notNull(),
  addressLine2: text("addressLine2"),
  city: varchar("city", { length: 100 }).default("Chennai").notNull(),
  state: varchar("state", { length: 100 }).default("Tamil Nadu").notNull(),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  // Auth
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  // Status
  isVerified: boolean("isVerified").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  // Test data flag
  isTestData: boolean("isTestData").default(false).notNull(),
  // Metadata
  notes: text("notes"), // Admin notes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
});

export type WholesaleCustomer = typeof wholesaleCustomers.$inferSelect;
export type InsertWholesaleCustomer = typeof wholesaleCustomers.$inferInsert;

// Wholesale Cart (persistent cart for logged-in customers)
export const wholesaleCart = mysqlTable("wholesale_cart", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WholesaleCartItem = typeof wholesaleCart.$inferSelect;
export type InsertWholesaleCartItem = typeof wholesaleCart.$inferInsert;

// Wholesale Orders
export const wholesaleOrders = mysqlTable("wholesale_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 20 }).notNull().unique(),
  customerId: int("customerId").notNull(),
  // Customer snapshot (in case customer info changes)
  businessName: varchar("businessName", { length: 255 }).notNull(),
  gstNumber: varchar("gstNumber", { length: 20 }),
  contactPerson: varchar("contactPerson", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  // Pickup address (store location)
  pickupLocation: text("pickupLocation"),
  // Amounts (in paise)
  subtotal: int("subtotal").notNull(),
  cgst: int("cgst").notNull(), // Central GST (9%)
  sgst: int("sgst").notNull(), // State GST (9%)
  totalGst: int("totalGst").notNull(), // Total GST (18%)
  totalAmount: int("totalAmount").notNull(),
  // Payment
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "failed", "refunded"]).default("pending").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["razorpay", "bank_transfer", "cash"]).default("razorpay"),
  razorpayOrderId: varchar("razorpayOrderId", { length: 100 }),
  razorpayPaymentId: varchar("razorpayPaymentId", { length: 100 }),
  // Order status
  orderStatus: mysqlEnum("orderStatus", ["pending", "confirmed", "processing", "ready", "completed", "cancelled"]).default("pending").notNull(),
  // Notes
  customerNotes: text("customerNotes"),
  adminNotes: text("adminNotes"),
  // Test data flag
  isTestData: boolean("isTestData").default(false).notNull(),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type WholesaleOrder = typeof wholesaleOrders.$inferSelect;
export type InsertWholesaleOrder = typeof wholesaleOrders.$inferInsert;

// Wholesale Order Items
export const wholesaleOrderItems = mysqlTable("wholesale_order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  // Product snapshot
  productName: varchar("productName", { length: 200 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  // Pricing
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(), // Price per unit at time of order (in paise)
  lineTotal: int("lineTotal").notNull(), // quantity * unitPrice (in paise)
  // Test data flag
  isTestData: boolean("isTestData").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WholesaleOrderItem = typeof wholesaleOrderItems.$inferSelect;
export type InsertWholesaleOrderItem = typeof wholesaleOrderItems.$inferInsert;

// Wholesale Password Reset Tokens
export const wholesalePasswordResets = mysqlTable("wholesale_password_resets", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  token: varchar("token", { length: 100 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WholesalePasswordReset = typeof wholesalePasswordResets.$inferSelect;
export type InsertWholesalePasswordReset = typeof wholesalePasswordResets.$inferInsert;

// Blog Articles for SEO
export const blogArticles = mysqlTable("blog_articles", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt"), // Short summary for listing pages
  content: text("content").notNull(), // Full article content (HTML or Markdown)
  metaTitle: varchar("metaTitle", { length: 100 }), // SEO meta title
  metaDescription: varchar("metaDescription", { length: 160 }), // SEO meta description
  keywords: text("keywords"), // Comma-separated SEO keywords
  imageUrl: text("imageUrl"), // Featured image
  authorName: varchar("authorName", { length: 100 }).default("Taiwan Maami"),
  status: mysqlEnum("status", ["draft", "pending_review", "published", "archived"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  viewCount: int("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlogArticle = typeof blogArticles.$inferSelect;
export type InsertBlogArticle = typeof blogArticles.$inferInsert;


// Delivery sales data uploads (from Petpooja POS - Zomato/Swiggy)
export const deliverySalesUploads = mysqlTable("delivery_sales_uploads", {
  id: int("id").autoincrement().primaryKey(),
  periodLabel: varchar("periodLabel", { length: 50 }).notNull(), // e.g., "January 2026"
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  fileName: varchar("fileName", { length: 255 }),
  // Summary data from TNagar report
  totalOrders: int("totalOrders").default(0),
  totalAmount: int("totalAmount").default(0), // in paise
  totalDiscount: int("totalDiscount").default(0), // in paise
  netSales: int("netSales").default(0), // in paise
  totalTax: int("totalTax").default(0), // in paise
  grandTotal: int("grandTotal").default(0), // in paise
  // Channel breakdown
  zomatoOrders: int("zomatoOrders").default(0),
  zomatoAmount: int("zomatoAmount").default(0), // in paise
  swiggyOrders: int("swiggyOrders").default(0),
  swiggyAmount: int("swiggyAmount").default(0), // in paise
  dineInOrders: int("dineInOrders").default(0),
  dineInAmount: int("dineInAmount").default(0), // in paise
  // Payment breakdown (in paise)
  cashAmount: int("cashAmount").default(0),
  cardAmount: int("cardAmount").default(0),
  upiAmount: int("upiAmount").default(0),
  swiggyDineoutAmount: int("swiggyDineoutAmount").default(0),
  zomatoDineoutAmount: int("zomatoDineoutAmount").default(0),
  // GST (in paise)
  cgst: int("cgst").default(0),
  sgst: int("sgst").default(0),
  uploadedBy: int("uploadedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeliverySalesUpload = typeof deliverySalesUploads.$inferSelect;

// Delivery item-level sales data
export const deliveryItemSales = mysqlTable("delivery_item_sales", {
  id: int("id").autoincrement().primaryKey(),
  uploadId: int("uploadId").notNull(), // FK to deliverySalesUploads
  category: varchar("category", { length: 100 }).notNull(),
  itemName: varchar("itemName", { length: 255 }).notNull(),
  // Normalized base product name (without size/boba variants)
  baseProductName: varchar("baseProductName", { length: 255 }),
  itemCode: varchar("itemCode", { length: 50 }),
  quantity: int("quantity").default(0).notNull(),
  amount: int("amount").default(0).notNull(), // in paise
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeliveryItemSale = typeof deliveryItemSales.$inferSelect;

// ============================================
// Website Traffic Analytics (Self-hosted tracking)
// ============================================

// Pageview events - one row per pageview
export const pageviews = mysqlTable("pageviews", {
  id: int("id").autoincrement().primaryKey(),
  // Session tracking
  sessionId: varchar("sessionId", { length: 64 }).notNull(), // Anonymous session hash
  // Page info
  url: varchar("url", { length: 500 }).notNull(), // Page path (e.g., /menu, /checkout)
  referrer: varchar("referrer", { length: 500 }), // Referrer URL
  // Visitor info (anonymized)
  country: varchar("country", { length: 10 }),
  city: varchar("city", { length: 100 }),
  browser: varchar("browser", { length: 50 }),
  os: varchar("os", { length: 50 }),
  device: mysqlEnum("device", ["desktop", "mobile", "tablet"]).default("desktop"),
  // UTM tracking
  utmSource: varchar("utmSource", { length: 200 }),
  utmMedium: varchar("utmMedium", { length: 200 }),
  utmCampaign: varchar("utmCampaign", { length: 200 }),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Pageview = typeof pageviews.$inferSelect;
export type InsertPageview = typeof pageviews.$inferInsert;

// Daily aggregated stats for faster queries
export const dailyTrafficStats = mysqlTable("daily_traffic_stats", {
  id: int("id").autoincrement().primaryKey(),
  date: date("date").notNull(), // YYYY-MM-DD
  uniqueVisitors: int("uniqueVisitors").default(0).notNull(),
  pageviews: int("pageviews").default(0).notNull(),
  sessions: int("sessions").default(0).notNull(),
  // Top referrers as JSON
  topReferrers: json("topReferrers").$type<Array<{ source: string; count: number }>>(),
  // Top pages as JSON
  topPages: json("topPages").$type<Array<{ url: string; views: number }>>(),
  // Device breakdown
  desktopViews: int("desktopViews").default(0).notNull(),
  mobileViews: int("mobileViews").default(0).notNull(),
  tabletViews: int("tabletViews").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyTrafficStat = typeof dailyTrafficStats.$inferSelect;
export type InsertDailyTrafficStat = typeof dailyTrafficStats.$inferInsert;


// =============================================
// POPUP EVENT REGISTRATIONS
// =============================================

// Popup Event Registrations - Interest registrations for popup events (e.g., The Leela Hyderabad)
export const popupRegistrations = mysqlTable("popup_registrations", {
  id: int("id").autoincrement().primaryKey(),
  eventSlug: varchar("eventSlug", { length: 100 }).notNull(), // e.g., "leela-hyderabad-march-2026"
  customerName: varchar("customerName", { length: 200 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }).notNull(),
  eventType: mysqlEnum("eventType", ["dinner", "masterclass"]).notNull(),
  selectedDate: varchar("selectedDate", { length: 20 }).notNull(), // e.g., "2026-03-05"
  numberOfGuests: int("numberOfGuests").default(1).notNull(),
  specialRequirements: text("specialRequirements"),
  status: mysqlEnum("status", ["registered", "confirmed", "cancelled"]).default("registered").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PopupRegistration = typeof popupRegistrations.$inferSelect;
export type InsertPopupRegistration = typeof popupRegistrations.$inferInsert;

// =============================================
// HOMEPAGE CMS SECTIONS
// =============================================

// Homepage sections for CMS-driven content
export const homepageSections = mysqlTable("homepage_sections", {
  id: int("id").autoincrement().primaryKey(),
  sectionKey: varchar("sectionKey", { length: 100 }).notNull().unique(), // e.g., "announcement_bar", "hero", "freshness_story"
  title: text("title"),
  subtitle: text("subtitle"),
  content: json("content"), // Flexible JSON for section-specific data
  isActive: boolean("isActive").default(true).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HomepageSection = typeof homepageSections.$inferSelect;
export type InsertHomepageSection = typeof homepageSections.$inferInsert;


// =============================================
// CHATBOT ANALYTICS
// =============================================

// Chat conversations - one per session
export const chatConversations = mysqlTable("chat_conversations", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 100 }).notNull(), // unique per browser session
  userId: int("userId"), // null for anonymous users
  userName: varchar("userName", { length: 200 }),
  messageCount: int("messageCount").default(0).notNull(),
  channel: mysqlEnum("channel", ["text", "voice"]).default("text").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = typeof chatConversations.$inferInsert;

// Chat messages - individual messages within a conversation
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  intents: json("intents"), // array of detected intents for user messages
  searchQuery: varchar("searchQuery", { length: 500 }), // what the user searched for
  productsShown: int("productsShown").default(0), // number of product cards shown
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;


// =============================================
// MAAMI PARTNER PROGRAMME
// =============================================

// Partner Subscriptions - tracks who is a Partner and their subscription status
export const partnerSubscriptions = mysqlTable("partner_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK to users.id
  // Subscription tier
  tier: mysqlEnum("tier", ["founding", "regular"]).notNull(),
  // Status
  status: mysqlEnum("status", ["active", "expired", "cancelled", "paused"]).default("active").notNull(),
  // Pricing (in paise) - snapshot at time of subscription
  amountPaid: int("amountPaid").notNull(), // Amount paid for this subscription period
  // Razorpay subscription tracking
  razorpaySubscriptionId: varchar("razorpaySubscriptionId", { length: 100 }),
  razorpayPaymentId: varchar("razorpayPaymentId", { length: 100 }), // Initial payment
  // Referral
  referralCode: varchar("referralCode", { length: 20 }).notNull().unique(), // Unique code for this partner to share
  referredByCode: varchar("referredByCode", { length: 20 }), // Code of partner who referred this user
  // Dates
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(), // 1 year from start
  // Renewal tracking
  isAutoRenew: boolean("isAutoRenew").default(true).notNull(),
  renewalReminderSent: boolean("renewalReminderSent").default(false).notNull(),
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  cancelledAt: timestamp("cancelledAt"),
  cancellationReason: text("cancellationReason"),
});

export type PartnerSubscription = typeof partnerSubscriptions.$inferSelect;
export type InsertPartnerSubscription = typeof partnerSubscriptions.$inferInsert;

// Partner Referrals - tracks referral conversions and rewards
export const partnerReferrals = mysqlTable("partner_referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerUserId: int("referrerUserId").notNull(), // Partner who shared the code
  referrerSubscriptionId: int("referrerSubscriptionId").notNull(), // FK to partner_subscriptions
  referredUserId: int("referredUserId").notNull(), // New user who signed up
  referredSubscriptionId: int("referredSubscriptionId"), // FK to their new subscription (null until they subscribe)
  referralCode: varchar("referralCode", { length: 20 }).notNull(), // The code that was used
  // Reward tracking
  referrerRewardAmount: int("referrerRewardAmount").default(0).notNull(), // Maami Rupees (paise) awarded to referrer
  referredRewardAmount: int("referredRewardAmount").default(0).notNull(), // Maami Rupees (paise) awarded to referred
  referrerRewardCredited: boolean("referrerRewardCredited").default(false).notNull(),
  referredRewardCredited: boolean("referredRewardCredited").default(false).notNull(),
  // Status
  status: mysqlEnum("status", ["clicked", "registered", "subscribed", "rewarded"]).default("clicked").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PartnerReferral = typeof partnerReferrals.$inferSelect;
export type InsertPartnerReferral = typeof partnerReferrals.$inferInsert;

// Partner Benefits Log - audit trail of every benefit used per order
export const partnerBenefitsLog = mysqlTable("partner_benefits_log", {
  id: int("id").autoincrement().primaryKey(),
  subscriptionId: int("subscriptionId").notNull(), // FK to partner_subscriptions
  userId: int("userId").notNull(),
  orderId: int("orderId").notNull(), // FK to orders
  orderNumber: varchar("orderNumber", { length: 20 }).notNull(),
  outletId: int("outletId").notNull(), // Which outlet
  // Benefit details
  benefitType: mysqlEnum("benefitType", [
    "free_biang_biang",     // Free Biang Biang Noodles at T.Nagar
    "free_large_tea",       // Free Large Bubble Tea at Palladium
    "tea_discount",         // 10-15% off tea items
    "maami_rupee_credit",   // Store credit from referral rewards
  ]).notNull(),
  // Amount saved (in paise)
  benefitAmount: int("benefitAmount").notNull(), // How much the partner saved
  // Item details (for free item benefits)
  itemName: varchar("itemName", { length: 200 }), // e.g., "Biang Biang Noodles" or "Taro Milk Tea - Large"
  itemOriginalPrice: int("itemOriginalPrice"), // Original price before discount (paise)
  // Tea discount details
  discountPercent: int("discountPercent"), // e.g., 15 for 15%
  teaItemsCount: int("teaItemsCount"), // Number of tea items discounted
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PartnerBenefitLog = typeof partnerBenefitsLog.$inferSelect;
export type InsertPartnerBenefitLog = typeof partnerBenefitsLog.$inferInsert;

// Partner Programme Config - admin-configurable settings
export const partnerConfig = mysqlTable("partner_config", {
  id: int("id").autoincrement().primaryKey(),
  configKey: varchar("configKey", { length: 100 }).notNull().unique(),
  configValue: text("configValue").notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy"), // Admin user ID
});

export type PartnerConfig = typeof partnerConfig.$inferSelect;
export type InsertPartnerConfig = typeof partnerConfig.$inferInsert;

// ============================================================
// B2B / External Sales (popup events, catering, corporate orders)
// ============================================================

// B2B Sales Invoices - records external invoices raised to businesses
export const b2bInvoices = mysqlTable("b2b_invoices", {
  id: int("id").autoincrement().primaryKey(),
  // Invoice details
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  invoiceDate: date("invoiceDate").notNull(),
  // Client details
  clientName: varchar("clientName", { length: 200 }).notNull(),
  clientGstin: varchar("clientGstin", { length: 20 }), // GSTIN if registered
  clientAddress: text("clientAddress"),
  clientState: varchar("clientState", { length: 100 }),
  clientStateCode: varchar("clientStateCode", { length: 5 }), // For IGST determination
  // Description / category
  category: mysqlEnum("category", [
    "popup_event",
    "catering",
    "corporate_order",
    "masterclass",
    "franchise_fee",
    "other",
  ]).default("popup_event").notNull(),
  description: text("description"),
  // Amounts (all in paise for consistency with orders table)
  subtotal: int("subtotal").notNull(), // Pre-GST total
  gstRate: int("gstRate").default(18).notNull(), // GST percentage (5, 12, 18, 28)
  cgst: int("cgst").notNull(), // Central GST
  sgst: int("sgst").notNull(), // State GST (intra-state)
  igst: int("igst").default(0).notNull(), // Integrated GST (inter-state)
  totalAmount: int("totalAmount").notNull(), // subtotal + GST
  // TDS tracking
  tdsApplicable: boolean("tdsApplicable").default(false).notNull(),
  tdsSection: varchar("tdsSection", { length: 20 }), // e.g., "194J", "194C"
  tdsRate: int("tdsRate"), // TDS percentage (e.g., 10 for 10%)
  tdsAmount: int("tdsAmount").default(0).notNull(), // TDS deducted (in paise)
  // Payment tracking
  paymentStatus: mysqlEnum("paymentStatus", [
    "unpaid",
    "partial",
    "paid",
    "overdue",
  ]).default("unpaid").notNull(),
  amountReceived: int("amountReceived").default(0).notNull(), // Actual amount received (in paise)
  paymentDate: date("paymentDate"),
  paymentReference: varchar("paymentReference", { length: 200 }), // NEFT ref, cheque no, etc.
  paymentMode: mysqlEnum("paymentMode", [
    "bank_transfer",
    "upi",
    "cheque",
    "cash",
    "other",
  ]),
  // Notes
  notes: text("notes"),
  // Audit
  createdBy: int("createdBy"), // Admin user ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type B2bInvoice = typeof b2bInvoices.$inferSelect;
export type InsertB2bInvoice = typeof b2bInvoices.$inferInsert;

// B2B Invoice Line Items - individual items on each invoice
export const b2bInvoiceItems = mysqlTable("b2b_invoice_items", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: int("unitPrice").notNull(), // Price per unit in paise
  totalPrice: int("totalPrice").notNull(), // quantity × unitPrice in paise
  hsnCode: varchar("hsnCode", { length: 20 }), // HSN/SAC code for GST
  gstRate: int("gstRate").default(18).notNull(), // GST % for this line item
});
export type B2bInvoiceItem = typeof b2bInvoiceItems.$inferSelect;
export type InsertB2bInvoiceItem = typeof b2bInvoiceItems.$inferInsert;
