import { eq, and, desc, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, categories, subcategories, products, addons, 
  orders, orderItems, orderItemAddons, payments, discounts, 
  addresses, loyaltyTransactions, storeLocations, deliveryAreas,
  productAddons, customizationOptions
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
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  if (user.name !== undefined) { values.name = user.name; updateSet.name = user.name; }
  if (user.email !== undefined) { values.email = user.email; updateSet.email = user.email; }
  if (user.phone !== undefined) { values.phone = user.phone; updateSet.phone = user.phone; }
  if (user.loginMethod !== undefined) { values.loginMethod = user.loginMethod; updateSet.loginMethod = user.loginMethod; }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = 'admin';
    updateSet.role = 'admin';
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
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

export async function getProductsWithSubcategory(categoryId?: number, isDelivery = false) {
  const db = await getDb();
  if (!db) return [];
  
  const availabilityField = isDelivery ? products.availableDelivery : products.availableInstore;
  let conditions = [eq(products.isActive, true), eq(availabilityField, true), eq(products.isInStock, true)];
  
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
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
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
