import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

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
  hasSizeVariants: boolean("hasSizeVariants").default(true).notNull(),
  hasBobaOption: boolean("hasBobaOption").default(true).notNull(),
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
  // Price inheritance
  useBasePrice: boolean("useBasePrice").default(true).notNull(), // If true, inherit price from subcategory
  // Availability
  isInStock: boolean("isInStock").default(true).notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(), // Real-time availability toggle for staff
  availableInstore: boolean("availableInstore").default(true).notNull(),
  availableDelivery: boolean("availableDelivery").default(true).notNull(),
  availableAtPalladium: boolean("availableAtPalladium").default(true).notNull(), // For pickup at Palladium outlet
  displayOrder: int("displayOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
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
  tableNumber: varchar("tableNumber", { length: 10 }), // For in-store orders - table number
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
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "upi", "card", "swiggy_dineout", "zomato_dineout", "eazydiner", "other"]),
  // Payment proof screenshot URL (for non-cash payments)
  paymentProofUrl: text("paymentProofUrl"),
  refundAmount: int("refundAmount").default(0).notNull(),
  refundMethod: mysqlEnum("refundMethod", ["store_credit", "original_payment", "none"]).default("none"),
  refundReason: text("refundReason"),
  refundProcessedAt: timestamp("refundProcessedAt"),
  refundProcessedBy: int("refundProcessedBy"),
  // Idempotency key to prevent duplicate orders on network retry
  idempotencyKey: varchar("idempotencyKey", { length: 100 }).unique(),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
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
  action: mysqlEnum("action", ["earn", "bonus", "welcome", "redeem", "expire"]).notNull(),
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
