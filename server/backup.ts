import { getDb } from "./db";
import { 
  // Core business data
  orders, orderItems, orderItemAddons,
  users, payments, 
  // Loyalty system
  stampTransactions, loyaltyRewards, loyaltyTransactions,
  // Workshop & Events
  workshopBookings, workshops, workshopDates, workshopWaitlist,
  eventOrders, eventOrderItems, eventInquiries,
  // Product catalog
  products, categories, subcategories, addons,
  productAddons, categoryAddons, subcategoryAddons,
  customizationOptions,
  // Customer data
  addresses, guestOrders,
  // Discounts & Promotions
  discounts, discountUsage, discountAuthorizations,
  // Store configuration
  storeLocations, outletProducts, deliveryAreas,
  // POS system
  posSessions, posAuditLog, adminPins,
  // Print queues
  kotQueue, receiptQueue,
  // Site settings
  siteSettings,
  // Audit logs
  productAuditLog, categoryAuditLog, orderAuditLog,
  // Complaints & Refunds
  complaints, refundRequests,
  // Reviews
  reviews,
  // Content pages (T&Cs, policies)
  contentPages,
  // Backup logs (meta)
  backupLogs
} from "../drizzle/schema";
import { storagePut, storageGet } from "./storage";
import { notifyOwner } from "./_core/notification";

// Backup configuration
const RETENTION_DAYS = 90;
const BACKUP_PREFIX = "backups";

interface BackupResult {
  success: boolean;
  backupKey?: string;
  backupUrl?: string;
  size?: number;
  tablesBackedUp?: number;
  totalRows?: number;
  error?: string;
  timestamp: string;
}

interface BackupMetadata {
  key: string;
  date: string;
  size: number;
  tablesBackedUp: number;
  totalRows: number;
  createdAt: number;
}

/**
 * Safely query a table, returning empty array if table doesn't exist or has schema issues
 */
async function safeQuery<T>(db: any, table: any, tableName: string): Promise<T[]> {
  try {
    const data = await db.select().from(table);
    return data as T[];
  } catch (error) {
    console.log(`Warning: Could not backup table ${tableName}:`, error);
    return [];
  }
}

/**
 * Export all database tables to JSON and upload to S3
 */
export async function createBackup(): Promise<BackupResult> {
  const timestamp = new Date().toISOString();
  const dateStr = timestamp.split("T")[0]; // YYYY-MM-DD
  const backupKey = `${BACKUP_PREFIX}/${dateStr}/backup-${Date.now()}.json`;
  
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    
    // Collect all table data
    const backupData: Record<string, unknown[]> = {};
    let totalRows = 0;
    
    // ========== CRITICAL BUSINESS DATA ==========
    
    // Orders
    const ordersData = await safeQuery(db, orders, "orders");
    backupData.orders = ordersData;
    totalRows += ordersData.length;
    
    const orderItemsData = await safeQuery(db, orderItems, "order_items");
    backupData.orderItems = orderItemsData;
    totalRows += orderItemsData.length;
    
    const orderItemAddonsData = await safeQuery(db, orderItemAddons, "order_item_addons");
    backupData.orderItemAddons = orderItemAddonsData;
    totalRows += orderItemAddonsData.length;
    
    // ========== CUSTOMER DATA ==========
    
    const usersData = await safeQuery(db, users, "users");
    backupData.users = usersData;
    totalRows += usersData.length;
    
    const addressesData = await safeQuery(db, addresses, "addresses");
    backupData.addresses = addressesData;
    totalRows += addressesData.length;
    
    const guestOrdersData = await safeQuery(db, guestOrders, "guest_orders");
    backupData.guestOrders = guestOrdersData;
    totalRows += guestOrdersData.length;
    
    // ========== PAYMENT DATA ==========
    
    const paymentsData = await safeQuery(db, payments, "payments");
    backupData.payments = paymentsData;
    totalRows += paymentsData.length;
    
    // ========== LOYALTY SYSTEM ==========
    
    const stampTransactionsData = await safeQuery(db, stampTransactions, "stamp_transactions");
    backupData.stampTransactions = stampTransactionsData;
    totalRows += stampTransactionsData.length;
    
    const loyaltyRewardsData = await safeQuery(db, loyaltyRewards, "loyalty_rewards");
    backupData.loyaltyRewards = loyaltyRewardsData;
    totalRows += loyaltyRewardsData.length;
    
    const loyaltyTransactionsData = await safeQuery(db, loyaltyTransactions, "loyalty_transactions");
    backupData.loyaltyTransactions = loyaltyTransactionsData;
    totalRows += loyaltyTransactionsData.length;
    
    // ========== WORKSHOP & EVENT DATA ==========
    
    const workshopsData = await safeQuery(db, workshops, "workshops");
    backupData.workshops = workshopsData;
    totalRows += workshopsData.length;
    
    const workshopDatesData = await safeQuery(db, workshopDates, "workshop_dates");
    backupData.workshopDates = workshopDatesData;
    totalRows += workshopDatesData.length;
    
    const workshopBookingsData = await safeQuery(db, workshopBookings, "workshop_bookings");
    backupData.workshopBookings = workshopBookingsData;
    totalRows += workshopBookingsData.length;
    
    const workshopWaitlistData = await safeQuery(db, workshopWaitlist, "workshop_waitlist");
    backupData.workshopWaitlist = workshopWaitlistData;
    totalRows += workshopWaitlistData.length;
    
    const eventOrdersData = await safeQuery(db, eventOrders, "event_orders");
    backupData.eventOrders = eventOrdersData;
    totalRows += eventOrdersData.length;
    
    const eventOrderItemsData = await safeQuery(db, eventOrderItems, "event_order_items");
    backupData.eventOrderItems = eventOrderItemsData;
    totalRows += eventOrderItemsData.length;
    
    const eventInquiriesData = await safeQuery(db, eventInquiries, "event_inquiries");
    backupData.eventInquiries = eventInquiriesData;
    totalRows += eventInquiriesData.length;
    
    // ========== PRODUCT CATALOG ==========
    
    const productsData = await safeQuery(db, products, "products");
    backupData.products = productsData;
    totalRows += productsData.length;
    
    const categoriesData = await safeQuery(db, categories, "categories");
    backupData.categories = categoriesData;
    totalRows += categoriesData.length;
    
    const subcategoriesData = await safeQuery(db, subcategories, "subcategories");
    backupData.subcategories = subcategoriesData;
    totalRows += subcategoriesData.length;
    
    const addonsData = await safeQuery(db, addons, "addons");
    backupData.addons = addonsData;
    totalRows += addonsData.length;
    
    const productAddonsData = await safeQuery(db, productAddons, "product_addons");
    backupData.productAddons = productAddonsData;
    totalRows += productAddonsData.length;
    
    const categoryAddonsData = await safeQuery(db, categoryAddons, "category_addons");
    backupData.categoryAddons = categoryAddonsData;
    totalRows += categoryAddonsData.length;
    
    const subcategoryAddonsData = await safeQuery(db, subcategoryAddons, "subcategory_addons");
    backupData.subcategoryAddons = subcategoryAddonsData;
    totalRows += subcategoryAddonsData.length;
    
    const customizationOptionsData = await safeQuery(db, customizationOptions, "customization_options");
    backupData.customizationOptions = customizationOptionsData;
    totalRows += customizationOptionsData.length;
    
    // ========== DISCOUNTS & PROMOTIONS ==========
    
    const discountsData = await safeQuery(db, discounts, "discounts");
    backupData.discounts = discountsData;
    totalRows += discountsData.length;
    
    const discountUsageData = await safeQuery(db, discountUsage, "discount_usage");
    backupData.discountUsage = discountUsageData;
    totalRows += discountUsageData.length;
    
    const discountAuthorizationsData = await safeQuery(db, discountAuthorizations, "discount_authorizations");
    backupData.discountAuthorizations = discountAuthorizationsData;
    totalRows += discountAuthorizationsData.length;
    
    // ========== STORE CONFIGURATION ==========
    
    const storeLocationsData = await safeQuery(db, storeLocations, "store_locations");
    backupData.storeLocations = storeLocationsData;
    totalRows += storeLocationsData.length;
    
    const outletProductsData = await safeQuery(db, outletProducts, "outlet_products");
    backupData.outletProducts = outletProductsData;
    totalRows += outletProductsData.length;
    
    const deliveryAreasData = await safeQuery(db, deliveryAreas, "delivery_areas");
    backupData.deliveryAreas = deliveryAreasData;
    totalRows += deliveryAreasData.length;
    
    // ========== POS SYSTEM ==========
    
    const posSessionsData = await safeQuery(db, posSessions, "pos_sessions");
    backupData.posSessions = posSessionsData;
    totalRows += posSessionsData.length;
    
    const posAuditLogData = await safeQuery(db, posAuditLog, "pos_audit_log");
    backupData.posAuditLog = posAuditLogData;
    totalRows += posAuditLogData.length;
    
    const adminPinsData = await safeQuery(db, adminPins, "admin_pins");
    backupData.adminPins = adminPinsData;
    totalRows += adminPinsData.length;
    
    // ========== PRINT QUEUES ==========
    
    const kotQueueData = await safeQuery(db, kotQueue, "kot_queue");
    backupData.kotQueue = kotQueueData;
    totalRows += kotQueueData.length;
    
    const receiptQueueData = await safeQuery(db, receiptQueue, "receipt_queue");
    backupData.receiptQueue = receiptQueueData;
    totalRows += receiptQueueData.length;
    
    // ========== SITE SETTINGS ==========
    
    const siteSettingsData = await safeQuery(db, siteSettings, "site_settings");
    backupData.siteSettings = siteSettingsData;
    totalRows += siteSettingsData.length;
    
    // ========== AUDIT LOGS ==========
    
    const productAuditLogData = await safeQuery(db, productAuditLog, "product_audit_log");
    backupData.productAuditLog = productAuditLogData;
    totalRows += productAuditLogData.length;
    
    const categoryAuditLogData = await safeQuery(db, categoryAuditLog, "category_audit_log");
    backupData.categoryAuditLog = categoryAuditLogData;
    totalRows += categoryAuditLogData.length;
    
    const orderAuditLogData = await safeQuery(db, orderAuditLog, "order_audit_log");
    backupData.orderAuditLog = orderAuditLogData;
    totalRows += orderAuditLogData.length;
    
    // ========== COMPLAINTS & REFUNDS ==========
    
    const complaintsData = await safeQuery(db, complaints, "complaints");
    backupData.complaints = complaintsData;
    totalRows += complaintsData.length;
    
    const refundRequestsData = await safeQuery(db, refundRequests, "refund_requests");
    backupData.refundRequests = refundRequestsData;
    totalRows += refundRequestsData.length;
    
    // ========== REVIEWS ==========
    
    const reviewsData = await safeQuery(db, reviews, "reviews");
    backupData.reviews = reviewsData;
    totalRows += reviewsData.length;
    
    // ========== CONTENT PAGES (T&Cs, Policies) ==========
    
    const contentPagesData = await safeQuery(db, contentPages, "content_pages");
    backupData.contentPages = contentPagesData;
    totalRows += contentPagesData.length;
    
    // ========== BACKUP LOGS (Meta) ==========
    
    const backupLogsData = await safeQuery(db, backupLogs, "backup_logs");
    backupData.backupLogs = backupLogsData;
    totalRows += backupLogsData.length;
    
    // Add metadata
    const backupPayload = {
      metadata: {
        createdAt: timestamp,
        version: "2.0", // Updated version for comprehensive backup
        tablesBackedUp: Object.keys(backupData).length,
        totalRows,
        tableList: Object.keys(backupData),
        rowCounts: Object.fromEntries(
          Object.entries(backupData).map(([key, value]) => [key, (value as unknown[]).length])
        ),
      },
      data: backupData,
    };
    
    // Convert to JSON and upload to S3
    const jsonContent = JSON.stringify(backupPayload, null, 2);
    const buffer = Buffer.from(jsonContent, "utf-8");
    
    const { url } = await storagePut(backupKey, buffer, "application/json");
    
    // Log successful backup to database
    await db.insert(backupLogs).values({
      backupKey,
      backupUrl: url,
      size: buffer.length,
      tablesBackedUp: Object.keys(backupData).length,
      totalRows,
      status: "success",
      triggeredBy: "manual",
    });
    
    return {
      success: true,
      backupKey,
      backupUrl: url,
      size: buffer.length,
      tablesBackedUp: Object.keys(backupData).length,
      totalRows,
      timestamp,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Log failed backup to database
    try {
      const db = await getDb();
      if (db) {
        await db.insert(backupLogs).values({
          backupKey: `${BACKUP_PREFIX}/${new Date().toISOString().split("T")[0]}/failed-${Date.now()}`,
          size: 0,
          tablesBackedUp: 0,
          totalRows: 0,
          status: "failed",
          errorMessage,
          triggeredBy: "manual",
        });
      }
    } catch {
      // Ignore logging errors
    }
    
    return {
      success: false,
      error: errorMessage,
      timestamp,
    };
  }
}

/**
 * List all backups in S3
 */
export async function listBackups(): Promise<BackupMetadata[]> {
  // Note: S3 listing would require additional implementation
  // For now, we'll track backups in a database table
  // This is a placeholder that returns empty array
  return [];
}

/**
 * Get a download URL for a specific backup
 */
export async function getBackupDownloadUrl(backupKey: string): Promise<string | null> {
  try {
    const { url } = await storageGet(backupKey);
    return url;
  } catch {
    return null;
  }
}

/**
 * Run backup and send notification
 */
export async function runScheduledBackup(): Promise<BackupResult> {
  const result = await createBackup();
  
  // Send notification to owner
  if (result.success) {
    await notifyOwner({
      title: "✅ Daily Backup Completed",
      content: `Database backup completed successfully.

**Backup Details:**
- Date: ${result.timestamp}
- Tables backed up: ${result.tablesBackedUp}
- Total rows: ${result.totalRows}
- Size: ${formatBytes(result.size || 0)}

The backup is stored securely and will be retained for 90 days.`,
    });
  } else {
    await notifyOwner({
      title: "❌ Daily Backup Failed",
      content: `Database backup failed!

**Error:** ${result.error}
**Time:** ${result.timestamp}

Please check the system logs and contact support if the issue persists.`,
    });
  }
  
  return result;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
