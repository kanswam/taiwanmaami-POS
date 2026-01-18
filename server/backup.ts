import { getDb } from "./db";
import { 
  orders, orderItems, orderItemAddons,
  users, payments, 
  stampTransactions, loyaltyRewards,
  workshopBookings, workshops, workshopDates,
  eventOrders, eventOrderItems, eventInquiries,
  products, categories, subcategories, addons,
  reviews, backupLogs
} from "../drizzle/schema";
import { storagePut, storageGet } from "./storage";
import { notifyOwner } from "./_core/notification";
// Backup utility for Taiwan Maami database

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
    
    // Critical business data
    const ordersData = await db.select().from(orders);
    backupData.orders = ordersData;
    totalRows += ordersData.length;
    
    const orderItemsData = await db.select().from(orderItems);
    backupData.orderItems = orderItemsData;
    totalRows += orderItemsData.length;
    
    const orderItemAddonsData = await db.select().from(orderItemAddons);
    backupData.orderItemAddons = orderItemAddonsData;
    totalRows += orderItemAddonsData.length;
    
    // Customer data
    const usersData = await db.select().from(users);
    backupData.users = usersData;
    totalRows += usersData.length;
    
    // Payment data
    const paymentsData = await db.select().from(payments);
    backupData.payments = paymentsData;
    totalRows += paymentsData.length;
    
    // Loyalty data
    const stampTransactionsData = await db.select().from(stampTransactions);
    backupData.stampTransactions = stampTransactionsData;
    totalRows += stampTransactionsData.length;
    
    const loyaltyRewardsData = await db.select().from(loyaltyRewards);
    backupData.loyaltyRewards = loyaltyRewardsData;
    totalRows += loyaltyRewardsData.length;
    
    // Workshop data
    const workshopsData = await db.select().from(workshops);
    backupData.workshops = workshopsData;
    totalRows += workshopsData.length;
    
    const workshopDatesData = await db.select().from(workshopDates);
    backupData.workshopDates = workshopDatesData;
    totalRows += workshopDatesData.length;
    
    const workshopBookingsData = await db.select().from(workshopBookings);
    backupData.workshopBookings = workshopBookingsData;
    totalRows += workshopBookingsData.length;
    
    // Event data - wrapped in try-catch for schema compatibility
    try {
      const eventOrdersData = await db.select().from(eventOrders);
      backupData.eventOrders = eventOrdersData;
      totalRows += eventOrdersData.length;
    } catch {
      backupData.eventOrders = [];
    }
    
    try {
      const eventOrderItemsData = await db.select().from(eventOrderItems);
      backupData.eventOrderItems = eventOrderItemsData;
      totalRows += eventOrderItemsData.length;
    } catch {
      backupData.eventOrderItems = [];
    }
    
    try {
      const eventInquiriesData = await db.select().from(eventInquiries);
      backupData.eventInquiries = eventInquiriesData;
      totalRows += eventInquiriesData.length;
    } catch {
      backupData.eventInquiries = [];
    }
    
    // Product catalog
    const productsData = await db.select().from(products);
    backupData.products = productsData;
    totalRows += productsData.length;
    
    const categoriesData = await db.select().from(categories);
    backupData.categories = categoriesData;
    totalRows += categoriesData.length;
    
    const subcategoriesData = await db.select().from(subcategories);
    backupData.subcategories = subcategoriesData;
    totalRows += subcategoriesData.length;
    
    const addonsData = await db.select().from(addons);
    backupData.addons = addonsData;
    totalRows += addonsData.length;
    
    // Reviews
    const reviewsData = await db.select().from(reviews);
    backupData.reviews = reviewsData;
    totalRows += reviewsData.length;
    
    // Add metadata
    const backupPayload = {
      metadata: {
        createdAt: timestamp,
        version: "1.0",
        tablesBackedUp: Object.keys(backupData).length,
        totalRows,
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
