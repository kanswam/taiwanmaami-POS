import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, categories, subcategories, products, addons, 
  orders, orderItems, orderItemAddons, payments, discounts, discountUsage,
  addresses, loyaltyTransactions, storeLocations, deliveryAreas,
  productAddons, customizationOptions, orderAuditLog
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// User functions
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const dbInstance = await getDb();
  if (!dbInstance) return;

  // Check if user already exists and their current role
  const existingUser = await dbInstance.select().from(users).where(eq(users.openId, user.openId)).limit(1);
  const currentRole = existingUser.length > 0 ? existingUser[0].role : null;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  if (user.name !== undefined) { values.name = user.name; updateSet.name = user.name; }
  if (user.email !== undefined) { values.email = user.email; updateSet.email = user.email; }
  if (user.phone !== undefined) { values.phone = user.phone; updateSet.phone = user.phone; }
  if (user.loginMethod !== undefined) { values.loginMethod = user.loginMethod; updateSet.loginMethod = user.loginMethod; }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  
  // Role logic: never downgrade admin to staff, but upgrade user to staff if employee
  if (user.role !== undefined) {
    // Don't downgrade admin to staff
    if (currentRole === 'admin' && user.role === 'staff') {
      // Keep admin role, don't update
    } else {
      values.role = user.role;
      updateSet.role = user.role;
    }
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = 'admin';
    updateSet.role = 'admin';
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await dbInstance.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Birthday functions
export async function updateUserBirthday(userId: number, birthMonth: number, birthDay: number) {
  const db = await getDb();
  if (!db) return false;
  await db.update(users).set({ birthMonth, birthDay }).where(eq(users.id, userId));
  return true;
}

export async function getUserBirthday(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    birthMonth: users.birthMonth,
    birthDay: users.birthDay,
    birthdayCodeUsedYear: users.birthdayCodeUsedYear
  }).from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// Category functions
export async function getCategories(activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  const query = activeOnly 
    ? db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.displayOrder))
    : db.select().from(categories).orderBy(asc(categories.displayOrder));
  return query;
}

export async function getCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return result[0];
}

// Subcategory functions
export async function getSubcategories(categoryId?: number, activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  let conditions = activeOnly ? [eq(subcategories.isActive, true)] : [];
  if (categoryId) conditions.push(eq(subcategories.categoryId, categoryId));
  return db.select().from(subcategories).where(and(...conditions)).orderBy(asc(subcategories.displayOrder));
}

export async function getSubcategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subcategories).where(eq(subcategories.slug, slug)).limit(1);
  return result[0];
}

// Product functions
export async function getProducts(subcategoryId?: number, activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  let conditions = activeOnly ? [eq(products.isActive, true)] : [];
  if (subcategoryId) conditions.push(eq(products.subcategoryId, subcategoryId));
  return db.select().from(products).where(and(...conditions)).orderBy(asc(products.displayOrder));
}

export async function getAllProductsForStaff() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).orderBy(asc(products.displayOrder));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function getProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return result[0];
}

export async function getProductsWithSubcategory(categoryId?: number, isDelivery = false, includeUnavailable = false) {
  const db = await getDb();
  if (!db) return [];
  
  const availabilityField = isDelivery ? products.availableDelivery : products.availableInstore;
  
  // If includeUnavailable is true, only filter by availability channel (not by isActive or isInStock)
  // This allows showing inactive/out-of-stock items with visual indicators
  let conditions = includeUnavailable 
    ? [eq(availabilityField, true)]
    : [eq(products.isActive, true), eq(availabilityField, true), eq(products.isInStock, true)];
  
  const result = await db.select({
    product: products,
    subcategory: subcategories,
  }).from(products)
    .innerJoin(subcategories, eq(products.subcategoryId, subcategories.id))
    .where(and(...conditions))
    .orderBy(asc(subcategories.displayOrder), asc(products.displayOrder));
  
  if (categoryId) {
    return result.filter(r => r.subcategory.categoryId === categoryId);
  }
  return result;
}

// Addon functions
export async function getAddons(type?: string) {
  const db = await getDb();
  if (!db) return [];
  if (type) {
    return db.select().from(addons).where(and(eq(addons.isActive, true), eq(addons.type, type as any))).orderBy(asc(addons.displayOrder));
  }
  return db.select().from(addons).where(eq(addons.isActive, true)).orderBy(asc(addons.displayOrder));
}

// Get addons linked to a specific product
export async function getProductAddonsForProduct(productId: number) {
  const db = await getDb();
  if (!db) return [];
  const links = await db.select().from(productAddons).where(eq(productAddons.productId, productId));
  if (links.length === 0) return [];
  const addonIds = links.map(l => l.addonId);
  return db.select().from(addons).where(and(
    eq(addons.isActive, true),
    sql`${addons.id} IN (${sql.join(addonIds.map(id => sql`${id}`), sql`, `)})`
  )).orderBy(asc(addons.displayOrder));
}

// Order functions
export async function createOrder(orderData: typeof orders.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orders).values(orderData);
  return result[0].insertId;
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}

export async function getOrderByNumber(orderNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  return result[0];
}

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function updateOrderStatus(orderId: number, status: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ orderStatus: status as any }).where(eq(orders.id, orderId));
}

export async function getRecentOrders(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
}

// Order items functions
export async function createOrderItem(itemData: typeof orderItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orderItems).values(itemData);
  return result[0].insertId;
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get order items
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  
  // Get addons for each item
  const itemsWithAddons = await Promise.all(
    items.map(async (item) => {
      const addons = await db.select().from(orderItemAddons).where(eq(orderItemAddons.orderItemId, item.id));
      return { ...item, addons };
    })
  );
  
  return itemsWithAddons;
}

// Discount functions
export async function getDiscountByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(discounts).where(and(eq(discounts.code, code), eq(discounts.isActive, true))).limit(1);
  return result[0];
}

export async function getAllDiscounts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discounts).orderBy(desc(discounts.createdAt));
}

export async function hasUserUsedDiscount(userId: number, discountId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(discountUsage).where(
    and(eq(discountUsage.userId, userId), eq(discountUsage.discountId, discountId))
  ).limit(1);
  return result.length > 0;
}

export async function recordDiscountUsage(discountId: number, userId: number, orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(discountUsage).values({ discountId, userId, orderId });
}

export async function getUserOrderCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.userId, userId));
  return result[0]?.count || 0;
}

// Address functions
export async function getUserAddresses(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(addresses).where(eq(addresses.userId, userId));
}

export async function createAddress(addressData: typeof addresses.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(addresses).values(addressData);
  return result[0].insertId;
}

// Store locations
export async function getStoreLocations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storeLocations).where(eq(storeLocations.isActive, true));
}

// Delivery areas
export async function getDeliveryAreas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deliveryAreas).where(eq(deliveryAreas.isActive, true));
}

// Loyalty functions
export async function addLoyaltyPoints(userId: number, orderId: number, points: number) {
  const db = await getDb();
  if (!db) return;
  
  const user = await getUserById(userId);
  if (!user) return;
  
  const newBalance = user.loyaltyPoints + points;
  await db.update(users).set({ loyaltyPoints: newBalance }).where(eq(users.id, userId));
  await db.insert(loyaltyTransactions).values({
    userId,
    orderId,
    pointsEarned: points,
    balanceAfter: newBalance,
    transactionType: 'earned',
  });
}

// Customization options
export async function getCustomizationOptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customizationOptions).where(eq(customizationOptions.isActive, true)).orderBy(asc(customizationOptions.displayOrder));
}


// Order Audit Log functions
export async function logOrderAudit(params: {
  orderId: number;
  orderNumber: string;
  userId?: number;
  userName?: string;
  userRole: 'customer' | 'staff' | 'admin';
  actionType: 'payment_collected' | 'item_added' | 'item_cancelled' | 'discount_applied' | 'order_cancelled' | 'status_changed' | 'manual_discount_applied' | 'refund_issued' | 'order_locked' | 'order_unlocked';
  description: string;
  oldValue?: string;
  newValue?: string;
  itemId?: number;
  itemName?: string;
  itemQuantity?: number;
  amount?: number;
  ipAddress?: string;
}) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(orderAuditLog).values({
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      actionType: params.actionType,
      description: params.description,
      oldValue: params.oldValue,
      newValue: params.newValue,
      itemId: params.itemId,
      itemName: params.itemName,
      itemQuantity: params.itemQuantity,
      amount: params.amount,
      ipAddress: params.ipAddress,
    });
  } catch (error) {
    console.error('[Audit Log] Failed to log order audit:', error);
  }
}

// Get order audit history
export async function getOrderAuditHistory(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(orderAuditLog)
    .where(eq(orderAuditLog.orderId, orderId))
    .orderBy(desc(orderAuditLog.createdAt));
}

// Get recent staff actions for dashboard
export async function getRecentStaffActions(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(orderAuditLog)
    .where(inArray(orderAuditLog.actionType, ['payment_collected', 'item_added', 'item_cancelled', 'order_cancelled']))
    .orderBy(desc(orderAuditLog.createdAt))
    .limit(limit);
}

// Check if order is locked (24 hours after completion)
export async function isOrderLocked(orderId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const order = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.length === 0) return false;

  const orderData = order[0];
  if (orderData.orderStatus !== 'completed') return false;

  // Check if 24 hours have passed since completion
  const completedTime = new Date(orderData.updatedAt).getTime();
  const now = new Date().getTime();
  const hoursElapsed = (now - completedTime) / (1000 * 60 * 60);

  return hoursElapsed >= 24;
}


// Helper function to serialize Date objects to ISO strings
export function serializeDates<T extends Record<string, any>>(obj: T): T {
  if (!obj) return obj;
  
  const serialized = { ...obj };
  for (const key in serialized) {
    const value = serialized[key];
    if (value && typeof value === 'object' && 'toISOString' in value && typeof (value as any).toISOString === 'function') {
      // Convert Date to ISO string
      (serialized as any)[key] = (value as any).toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively handle nested objects
      (serialized as any)[key] = serializeDates(value);
    }
  }
  return serialized;
}

// Helper function to serialize an array of objects
export function serializeDateArray<T extends Record<string, any>>(arr: T[]): T[] {
  return arr.map(item => serializeDates(item));
}
