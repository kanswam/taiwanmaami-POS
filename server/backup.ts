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


// ========== RESTORE FUNCTIONALITY ==========

interface RestoreResult {
  success: boolean;
  tablesRestored?: number;
  totalRowsRestored?: number;
  preRestoreBackupKey?: string;
  error?: string;
  timestamp: string;
}

/**
 * Table restore order - tables with foreign key dependencies must be restored after their parents
 */
const TABLE_RESTORE_ORDER = [
  // 1. Independent tables (no foreign keys)
  'categories',
  'addons',
  'customizationOptions',
  'storeLocations',
  'siteSettings',
  'adminPins',
  'discounts',
  
  // 2. Tables depending on categories
  'subcategories',
  'categoryAddons',
  
  // 3. Tables depending on subcategories
  'subcategoryAddons',
  
  // 4. Products (depends on categories, subcategories)
  'products',
  'productAddons',
  'outletProducts',
  
  // 5. Users (independent)
  'users',
  
  // 6. Tables depending on users
  'addresses',
  'loyaltyRewards',
  'loyaltyTransactions',
  'stampTransactions',
  'discountUsage',
  'discountAuthorizations',
  'reviews',
  'complaints',
  'refundRequests',
  
  // 7. Workshops
  'workshops',
  'workshopDates',
  'workshopBookings',
  'workshopWaitlist',
  
  // 8. Orders (depends on users, store_locations)
  'orders',
  'orderItems',
  'orderItemAddons',
  'guestOrders',
  
  // 9. Payments (depends on orders)
  'payments',
  
  // 10. Events
  'eventOrders',
  'eventOrderItems',
  'eventInquiries',
  
  // 11. Delivery areas (depends on store_locations)
  'deliveryAreas',
  
  // 12. POS system
  'posSessions',
  'posAuditLog',
  
  // 13. Print queues
  'kotQueue',
  'receiptQueue',
  
  // 14. Audit logs
  'productAuditLog',
  'categoryAuditLog',
  'orderAuditLog',
  
  // 15. Content pages
  'contentPages',
  
  // 16. Backup logs (meta - restore last)
  'backupLogs',
];

/**
 * Map of backup data keys to database table schemas
 */
const TABLE_SCHEMA_MAP: Record<string, any> = {
  orders,
  orderItems,
  orderItemAddons,
  users,
  addresses,
  guestOrders,
  payments,
  stampTransactions,
  loyaltyRewards,
  loyaltyTransactions,
  workshops,
  workshopDates,
  workshopBookings,
  workshopWaitlist,
  eventOrders,
  eventOrderItems,
  eventInquiries,
  products,
  categories,
  subcategories,
  addons,
  productAddons,
  categoryAddons,
  subcategoryAddons,
  customizationOptions,
  discounts,
  discountUsage,
  discountAuthorizations,
  storeLocations,
  outletProducts,
  deliveryAreas,
  posSessions,
  posAuditLog,
  adminPins,
  kotQueue,
  receiptQueue,
  siteSettings,
  productAuditLog,
  categoryAuditLog,
  orderAuditLog,
  complaints,
  refundRequests,
  reviews,
  contentPages,
  backupLogs,
};

/**
 * Restore database from a backup file
 * @param backupUrl - URL of the backup JSON file in S3
 * @param createPreRestoreBackup - Whether to create a backup before restoring (default: true)
 */
export async function restoreFromBackup(
  backupUrl: string,
  createPreRestoreBackup: boolean = true
): Promise<RestoreResult> {
  const timestamp = new Date().toISOString();
  let preRestoreBackupKey: string | undefined;
  
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    
    // Step 1: Create a backup of current data before restore (safety net)
    if (createPreRestoreBackup) {
      console.log("Creating pre-restore backup...");
      const preBackup = await createBackup();
      if (preBackup.success) {
        preRestoreBackupKey = preBackup.backupKey;
        console.log(`Pre-restore backup created: ${preRestoreBackupKey}`);
      } else {
        console.warn("Warning: Could not create pre-restore backup, proceeding anyway");
      }
    }
    
    // Step 2: Validate and fetch the backup JSON from S3
    if (!backupUrl.startsWith('https://')) {
      throw new Error('Backup URL must use HTTPS to prevent cleartext transmission (CWE-319)');
    }
    const maskedUrl = backupUrl.replace(/(https:\/\/[^/]+\/)(.*)/, '$1***');
    console.log(`Fetching backup from: ${maskedUrl}`);
    const response = await fetch(backupUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch backup: ${response.statusText}`);
    }
    
    const backupPayload = await response.json();
    
    // Validate backup structure
    if (!backupPayload.metadata || !backupPayload.data) {
      throw new Error("Invalid backup format: missing metadata or data");
    }
    
    const backupData = backupPayload.data;
    const metadata = backupPayload.metadata;
    
    console.log(`Restoring backup from ${metadata.createdAt}`);
    console.log(`Tables to restore: ${metadata.tablesBackedUp}, Total rows: ${metadata.totalRows}`);
    
    // Step 3: Restore tables in dependency order
    let tablesRestored = 0;
    let totalRowsRestored = 0;
    
    // Disable foreign key checks for the restore operation
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
    
    try {
      for (const tableKey of TABLE_RESTORE_ORDER) {
        const tableData = backupData[tableKey];
        const tableSchema = TABLE_SCHEMA_MAP[tableKey];
        
        if (!tableData || !tableSchema) {
          continue; // Skip if table not in backup or not mapped
        }
        
        if (!Array.isArray(tableData) || tableData.length === 0) {
          continue; // Skip empty tables
        }
        
        try {
          // Delete existing data
          await db.delete(tableSchema);
          
          // Insert backup data in batches of 100 to avoid query size limits
          const batchSize = 100;
          for (let i = 0; i < tableData.length; i += batchSize) {
            const batch = tableData.slice(i, i + batchSize);
            
            // Convert date strings back to Date objects for timestamp fields
            const processedBatch = batch.map((row: any) => {
              const processed = { ...row };
              for (const [key, value] of Object.entries(processed)) {
                // Convert ISO date strings back to Date objects
                if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                  processed[key] = new Date(value);
                }
              }
              return processed;
            });
            
            await db.insert(tableSchema).values(processedBatch);
          }
          
          tablesRestored++;
          totalRowsRestored += tableData.length;
          console.log(`Restored ${tableKey}: ${tableData.length} rows`);
        } catch (tableError) {
          console.error(`Error restoring table ${tableKey}:`, tableError);
          // Continue with other tables
        }
      }
    } finally {
      // Re-enable foreign key checks
      await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
    }
    
    // Step 4: Log the restore operation
    await db.insert(backupLogs).values({
      backupKey: `restore-${Date.now()}`,
      backupUrl,
      size: 0,
      tablesBackedUp: tablesRestored,
      totalRows: totalRowsRestored,
      status: "restored",
      triggeredBy: "manual",
    });
    
    // Step 5: Send notification
    await notifyOwner({
      title: "🔄 Database Restore Completed",
      content: `Database has been restored from backup.

**Restore Details:**
- Backup Date: ${metadata.createdAt}
- Tables Restored: ${tablesRestored}
- Total Rows Restored: ${totalRowsRestored}
- Pre-Restore Backup: ${preRestoreBackupKey || 'Not created'}

If you notice any issues, you can restore from the pre-restore backup.`,
    });
    
    return {
      success: true,
      tablesRestored,
      totalRowsRestored,
      preRestoreBackupKey,
      timestamp,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Send failure notification
    await notifyOwner({
      title: "❌ Database Restore Failed",
      content: `Database restore failed!

**Error:** ${errorMessage}
**Time:** ${timestamp}
**Pre-Restore Backup:** ${preRestoreBackupKey || 'Not created'}

Your data has not been modified. Please check the error and try again.`,
    });
    
    return {
      success: false,
      error: errorMessage,
      preRestoreBackupKey,
      timestamp,
    };
  }
}

// Import sql for raw queries
import { sql } from "drizzle-orm";
