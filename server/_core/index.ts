import "dotenv/config";
import express from "express";
import { ENV } from "./env";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { clerkMiddleware } from "@clerk/express";
import { registerClerkWebhookRoute } from "./clerkWebhook";
import { appRouter } from "../routers";
import { handleSalesReportExport } from "../excelExport";
import { handleItemwiseExport, handleChannelsExport, handleLeelaRegistrationsExport, handleCustomerDatabaseExport } from "../excelExportExtra";
import { handleBackupExcelExport } from "../excelBackupExport";
import { handleDeliveryUpload, handleGetDeliveryUploads, handleDeleteDeliveryUpload, deliveryUploadMiddleware } from "../deliveryUpload";
import { handlePetpoojaQuickUpload, handleVerifyPin, handlePetpoojaHistory, petpoojaUploadMiddleware } from "../petpoojaQuickUpload";
import { handlePetpoojaWebhook, handlePetpoojaWebhookStatus } from "../petpoojaWebhook";
import { handlePetpoojaWebhookV2, handlePetpoojaWebhookV2Status } from "../petpoojaWebhookV2";
import { serviceAuthMiddleware, handleServiceHealth, handleOrdersList, handleEmployeesList, handleMenuProducts, handleMenuToggleAvailability, handleEmployeeMasterProxy } from "../serviceAuth";
import { scopedAuthMiddleware } from "../scopedAuth";
import { rateLimitMiddleware } from "../rateLimiter";
import { validateOrdersQuery, validateEmployeesQuery, validateMenuProductsQuery, validateMenuToggleBody, validateEtlRunBody, validateEtlStatusQuery } from "../inputValidation";
import { auditLogMiddleware } from "../auditLog";
import { handleETL, handleETLStatus } from "../etl";
import { createContext } from "./context";
import { authenticateClerkRequest } from "./clerk";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Razorpay webhook handler - shared between both URL paths
  const razorpayWebhookHandler = async (req: any, res: any) => {
    try {
      const webhookSecret = ENV.razorpayKeySecret;
      if (!webhookSecret) {
        console.error('[Razorpay Webhook] RAZORPAY_KEY_SECRET is not set');
        return res.status(500).json({ error: 'Server misconfiguration' });
      }
      const signature = req.headers['x-razorpay-signature'] as string;
      const body = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      
      if (!signature) {
        console.error('[Razorpay Webhook] Missing signature header');
        return res.status(400).json({ error: 'Missing signature' });
      }
      
      // Verify webhook signature
      const { verifyWebhookSignature } = await import('../razorpay');
      const isValid = verifyWebhookSignature(body, signature, webhookSecret);
      
      if (!isValid) {
        console.error('[Razorpay Webhook] Invalid signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }
      
      const event = JSON.parse(body);
      console.log(`[Razorpay Webhook] Received event: ${event.event}`);
      
      // Handle payment.captured event
      if (event.event === 'payment.captured') {
        const payment = event.payload.payment.entity;
        const razorpayOrderId = payment.order_id;
        const razorpayPaymentId = payment.id;
        const amount = payment.amount; // in paise
        const receipt = payment.notes?.orderid || '';
        
        console.log(`[Razorpay Webhook] Payment captured: ${razorpayPaymentId}, order: ${razorpayOrderId}, amount: ${amount}, receipt: ${receipt}`);
        
        const { getDb } = await import('../db');
        const { orders, payments: paymentsTable, kotQueue, orderItems: orderItemsTable, orderItemAddons } = await import('../../drizzle/schema');
        const { eq, sql } = await import('drizzle-orm');
        
        const dbInstance = await getDb();
        if (!dbInstance) {
          console.error('[Razorpay Webhook] Database not available');
          return res.status(500).json({ error: 'Database not available' });
        }
        
        // Find the order by razorpayOrderId or by receipt (orderNumber)
        let order;
        if (razorpayOrderId) {
          const [found] = await dbInstance.select().from(orders).where(eq(orders.razorpayOrderId, razorpayOrderId));
          order = found;
        }
        if (!order && receipt) {
          const [found] = await dbInstance.select().from(orders).where(eq(orders.orderNumber, receipt));
          order = found;
        }
        
        if (!order) {
          console.error(`[Razorpay Webhook] Order not found for razorpayOrderId: ${razorpayOrderId}, receipt: ${receipt}`);
          return res.status(200).json({ status: 'order_not_found' });
        }
        
        // Check if payment is already processed (idempotency)
        if (order.paymentStatus === 'completed') {
          console.log(`[Razorpay Webhook] Order ${order.orderNumber} already has completed payment, skipping`);
          return res.status(200).json({ status: 'already_processed' });
        }
        
        console.log(`[Razorpay Webhook] Updating order ${order.orderNumber} (id: ${order.id}) payment status to completed`);
        
        // Insert payment record
        await dbInstance.insert(paymentsTable).values({
          orderId: order.id,
          paymentMethod: 'razorpay',
          paymentStatus: 'success',
          amount: amount,
          razorpayPaymentId: razorpayPaymentId,
          razorpaySignature: 'webhook',
        });
        
        // Update order status
        await dbInstance.update(orders)
          .set({
            orderStatus: 'confirmed',
            paymentStatus: 'completed',
            paymentMethod: 'razorpay',
            razorpayOrderId: razorpayOrderId,
            razorpayPaymentId: razorpayPaymentId,
          })
          .where(eq(orders.id, order.id));
        
        // Create KOT for kitchen printing (if not already created)
        const existingKots = await dbInstance.select().from(kotQueue).where(eq(kotQueue.orderNumber, order.orderNumber));
        if (existingKots.length === 0) {
          const items = await dbInstance.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
          const itemIds = items.map(i => i.id);
          const itemAddons = itemIds.length > 0
            ? await dbInstance.select().from(orderItemAddons).where(sql`${orderItemAddons.orderItemId} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`)
            : [];
          
          const kotData = {
            orderId: order.orderNumber,
            orderType: order.orderType.toUpperCase(),
            customerName: order.customerName || 'Guest',
            customerPhone: order.customerPhone || '',
            specialInstructions: order.specialInstructions || '',
            items: items.filter(i => i.status !== 'cancelled').map(item => {
              const addons = itemAddons.filter(a => a.orderItemId === item.id);
              return {
                productName: item.productName,
                quantity: item.quantity,
                price: item.unitPrice,
                size: item.size,
                withBoba: item.withBoba,
                sugarLevel: item.sugarLevel,
                iceLevel: item.iceLevel,
                specialInstructions: item.specialInstructions || '',
                addons: addons.map(a => ({ name: a.addonName, price: a.addonPrice })),
              };
            }),
            totalAmount: order.totalAmount,
            createdAt: new Date().toISOString(),
          };
          
          await dbInstance.insert(kotQueue).values({
            orderId: order.id.toString(),
            outletId: order.outletId || 2, // Default to T Nagar
            orderNumber: order.orderNumber,
            kotData: kotData,
            isPrinted: false,
          });
          
          console.log(`[Razorpay Webhook] KOT created for order ${order.orderNumber}`);
        } else {
          console.log(`[Razorpay Webhook] KOT already exists for order ${order.orderNumber}, skipping`);
        }
        
        console.log(`[Razorpay Webhook] Order ${order.orderNumber} successfully updated via webhook`);
      }
      
      return res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error('[Razorpay Webhook] Error:', error);
      return res.status(200).json({ status: 'error_logged' });
    }
  };

  // Register webhook on both paths to match any Razorpay Dashboard config
  app.post('/api/razorpay/webhook', express.raw({ type: 'application/json' }), razorpayWebhookHandler);
  app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), razorpayWebhookHandler);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Clerk middleware — must be applied before any route that uses getAuth()
  app.use(clerkMiddleware());
  registerClerkWebhookRoute(app);
  
  // Version marker for deployment verification: v2025.12.14.3
  app.get('/api/version', (req, res) => res.json({ version: '2025.12.14.3', timestamp: new Date().toISOString() }));
  
  // Simple REST endpoint for KOT polling (easier for external clients)
  app.get('/api/kot/poll', async (req, res) => {
    try {
      const secret = req.query.secret as string;
      const outletId = req.query.outletId ? parseInt(req.query.outletId as string) : null;
      
      if (!secret || secret !== process.env.KOT_PRINT_SECRET) {
        return res.status(401).json({ error: 'Invalid KOT secret' });
      }
      
      const { getDb } = await import('../db');
      const { kotQueue } = await import('../../drizzle/schema');
      const { eq, asc, and } = await import('drizzle-orm');
      
      const dbInstance = await getDb();
      if (!dbInstance) {
        return res.json({ kots: [] });
      }
      
      // Filter by outlet if specified, otherwise return all pending KOTs
      const whereCondition = outletId 
        ? and(eq(kotQueue.isPrinted, false), eq(kotQueue.outletId, outletId))
        : eq(kotQueue.isPrinted, false);
      
      const pendingKots = await dbInstance
        .select()
        .from(kotQueue)
        .where(whereCondition)
        .orderBy(asc(kotQueue.createdAt));
      
      return res.json({
        kots: pendingKots.map(kot => ({
          id: kot.id,
          orderId: kot.orderId,
          orderNumber: kot.orderNumber,
          kotData: kot.kotData,
          createdAt: kot.createdAt,
        }))
      });
    } catch (error) {
      console.error('KOT poll error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Simple REST endpoint to mark KOT as printed
  app.post('/api/kot/printed', async (req, res) => {
    try {
      const { secret, kotId } = req.body;
      if (!secret || secret !== process.env.KOT_PRINT_SECRET) {
        return res.status(401).json({ error: 'Invalid KOT secret' });
      }
      
      const { getDb } = await import('../db');
      const { kotQueue } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      
      const dbInstance = await getDb();
      if (!dbInstance) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      await dbInstance
        .update(kotQueue)
        .set({
          isPrinted: true,
          printedAt: new Date(),
        })
        .where(eq(kotQueue.id, kotId));
      
      return res.json({ success: true });
    } catch (error) {
      console.error('KOT mark printed error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Reprint KOT endpoint (for admin to reprint lost/damaged tickets)
  app.post('/api/kot/reprint', async (req, res) => {
    try {
      const { secret, orderId } = req.body;
      if (!secret || secret !== process.env.KOT_PRINT_SECRET) {
        return res.status(401).json({ error: 'Invalid KOT secret' });
      }
      
      const { getDb } = await import('../db');
      const { kotQueue, orders, orderItems, orderItemAddons } = await import('../../drizzle/schema');
      const { eq, sql } = await import('drizzle-orm');
      
      const dbInstance = await getDb();
      if (!dbInstance) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Get order details
      const [order] = await dbInstance.select().from(orders).where(eq(orders.id, orderId));
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Get order items with details (exclude cancelled items)
      const allItems = await dbInstance.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      const items = allItems.filter(item => item.status !== 'cancelled');
      const itemIds = items.map(i => i.id);
      const itemAddons = itemIds.length > 0 
        ? await dbInstance.select().from(orderItemAddons).where(sql`${orderItemAddons.orderItemId} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      // Build KOT data (same structure as original KOT creation)
      const kotData = {
        orderId: order.orderNumber,
        orderType: order.orderType.toUpperCase(),
        customerName: order.customerName || 'Guest',
        customerPhone: order.customerPhone || '',
        specialInstructions: order.specialInstructions || '',
        items: items.map(item => {
          const addons = itemAddons.filter(a => a.orderItemId === item.id);
          // Derive bobaType from DB columns or from addons (fallback for older orders)
          let bobaType = item.bobaType;
          let poppingBobaFlavor = item.poppingBobaFlavor;
          if (!bobaType && item.withBoba) {
            // Check addons for popping boba flavor
            const poppingAddon = addons.find(a => a.addonName.toLowerCase().includes('popping'));
            if (poppingAddon) {
              bobaType = 'popping';
              poppingBobaFlavor = poppingAddon.addonName.replace(/popping\s*boba/i, '').trim() || poppingAddon.addonName;
            } else {
              bobaType = 'tapioca';
            }
          }
          return {
            productName: item.productName,
            quantity: item.quantity,
            price: item.unitPrice,
            size: item.size,
            withBoba: item.withBoba,
            bobaType: bobaType || undefined,
            bobaSize: item.bobaSize || undefined,
            poppingBobaFlavor: poppingBobaFlavor || undefined,
            sugarLevel: item.sugarLevel,
            iceLevel: item.iceLevel,
            specialInstructions: item.specialInstructions || '',
            addons: addons.map(a => ({
              name: a.addonName,
              price: a.addonPrice,
            })),
          };
        }),
        totalAmount: order.totalAmount,
        createdAt: new Date().toISOString(),
      };
      
      // Insert new KOT for reprinting
      await dbInstance.insert(kotQueue).values({
        orderId: order.id.toString(),
        outletId: order.outletId || 2, // Default to T Nagar
        orderNumber: order.orderNumber,
        kotData: kotData,
        isPrinted: false,
      });
      
      return res.json({ success: true, message: 'KOT queued for reprinting' });
    } catch (error) {
      console.error('KOT reprint error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ============ RECEIPT PRINTING ENDPOINTS ============
  
  // Poll for pending receipts
  app.get('/api/receipt/poll', async (req, res) => {
    try {
      const secret = req.query.secret as string;
      if (!secret || secret !== process.env.KOT_PRINT_SECRET) {
        return res.status(401).json({ error: 'Invalid secret' });
      }
      
      const { getDb } = await import('../db');
      const { receiptQueue } = await import('../../drizzle/schema');
      const { eq, asc } = await import('drizzle-orm');
      
      const dbInstance = await getDb();
      if (!dbInstance) {
        return res.json({ receipts: [] });
      }
      
      const pendingReceipts = await dbInstance
        .select()
        .from(receiptQueue)
        .where(eq(receiptQueue.isPrinted, false))
        .orderBy(asc(receiptQueue.createdAt));
      
      return res.json({
        receipts: pendingReceipts.map(receipt => ({
          id: receipt.id,
          orderId: receipt.orderId,
          orderNumber: receipt.orderNumber,
          receiptData: receipt.receiptData,
          createdAt: receipt.createdAt,
        }))
      });
    } catch (error) {
      console.error('Receipt poll error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Mark receipt as printed
  app.post('/api/receipt/printed', async (req, res) => {
    try {
      const { secret, receiptId } = req.body;
      if (!secret || secret !== process.env.KOT_PRINT_SECRET) {
        return res.status(401).json({ error: 'Invalid secret' });
      }
      
      const { getDb } = await import('../db');
      const { receiptQueue } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      
      const dbInstance = await getDb();
      if (!dbInstance) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      await dbInstance
        .update(receiptQueue)
        .set({
          isPrinted: true,
          printedAt: new Date(),
        })
        .where(eq(receiptQueue.id, receiptId));
      
      return res.json({ success: true });
    } catch (error) {
      console.error('Receipt mark printed error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Queue a receipt for printing (called when payment is collected)
  app.post('/api/receipt/queue', async (req, res) => {
    try {
      const { secret, orderId } = req.body;
      if (!secret || secret !== process.env.KOT_PRINT_SECRET) {
        return res.status(401).json({ error: 'Invalid secret' });
      }
      
      const { getDb } = await import('../db');
      const { receiptQueue, orders, orderItems, orderItemAddons } = await import('../../drizzle/schema');
      const { eq, sql } = await import('drizzle-orm');
      
      const dbInstance = await getDb();
      if (!dbInstance) {
        return res.status(500).json({ error: 'Database not available' });
      }
      
      // Get order details
      const [order] = await dbInstance.select().from(orders).where(eq(orders.id, orderId));
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Get order items with details (exclude cancelled items)
      const allItems = await dbInstance.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      const items = allItems.filter(item => item.status !== 'cancelled');
      const itemIds = items.map(i => i.id);
      const itemAddons = itemIds.length > 0 
        ? await dbInstance.select().from(orderItemAddons).where(sql`${orderItemAddons.orderItemId} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      // Build receipt data
      const receiptData = {
        orderNumber: order.orderNumber,
        orderType: order.orderType.toUpperCase(),
        customerName: order.customerName || 'Guest',
        customerPhone: order.customerPhone || '',
        tableNumber: order.tableNumber || '',
        items: items.map(item => {
          const addons = itemAddons.filter(a => a.orderItemId === item.id);
          return {
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            size: item.size,
            withBoba: item.withBoba,
            sugarLevel: item.sugarLevel,
            iceLevel: item.iceLevel,
            addons: addons.map(a => ({
              name: a.addonName,
              price: a.addonPrice,
            })),
          };
        }),
        subtotal: order.subtotal,
        discountAmount: order.discountAmount || 0,
        manualDiscountAmount: order.manualDiscountAmount || 0,
        stateGst: order.stateGst,
        centralGst: order.centralGst,
        deliveryCharge: order.deliveryCharge,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        printedAt: new Date().toISOString(),
      };
      
      // Insert receipt into queue
      await dbInstance.insert(receiptQueue).values({
        orderId: order.id,
        outletId: order.outletId || 2, // Default to T Nagar
        orderNumber: order.orderNumber,
        receiptData: receiptData,
        isPrinted: false,
      });
      
      return res.json({ success: true, message: 'Receipt queued for printing' });
    } catch (error) {
      console.error('Receipt queue error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Excel Sales Report Export
  app.get('/api/export/sales-report', handleSalesReportExport as any);
  app.get('/api/export/itemwise-report', handleItemwiseExport as any);
  app.get('/api/export/channels-report', handleChannelsExport as any);
  app.get('/api/export/leela-registrations', handleLeelaRegistrationsExport as any);
  app.get('/api/export/database-excel', handleBackupExcelExport as any);
  app.get('/api/export/customer-database', handleCustomerDatabaseExport as any);

  // Delivery data upload/management
  app.post('/api/delivery/upload', deliveryUploadMiddleware as any, handleDeliveryUpload as any);
  app.get('/api/delivery/uploads', handleGetDeliveryUploads as any);
  app.delete('/api/delivery/uploads/:id', handleDeleteDeliveryUpload as any);

  // Petpooja quick upload (PIN-protected, no login required)
  app.post('/api/petpooja/verify-pin', handleVerifyPin as any);
  app.post('/api/petpooja/upload', petpoojaUploadMiddleware as any, handlePetpoojaQuickUpload as any);
  app.get('/api/petpooja/history', handlePetpoojaHistory as any);

  // ============ PETPOOJA WEBHOOK v2 (Supabase-backed with raw archive) ============
  // Open endpoint — Petpooja sends orders here when bills are printed
  // No auth required (Petpooja does not support auth headers)
  // v2 writes to Supabase: raw archive → parsed orders/items → ingestion log
  app.post('/api/petpooja/webhook', handlePetpoojaWebhookV2 as any);
  app.get('/api/petpooja/webhook/status', handlePetpoojaWebhookV2Status as any);
  // Legacy v1 endpoints (MySQL-backed) — kept for reference, mounted on /v1 path
  app.post('/api/petpooja/webhook/v1', handlePetpoojaWebhook as any);
  app.get('/api/petpooja/webhook/v1/status', handlePetpoojaWebhookStatus as any);

  // ============ MAAMITECH SERVICE API ============
  // All /api/service/* routes require scoped token auth + rate limiting + audit logging
  // Middleware chain: scopedAuth → rateLimit → audit → [validation] → handler
  app.use('/api/service', scopedAuthMiddleware as any);
  app.use('/api/service', rateLimitMiddleware as any);
  app.use('/api/service', auditLogMiddleware as any);
  app.get('/api/service/health', handleServiceHealth as any);
  app.get('/api/service/orders', validateOrdersQuery as any, handleOrdersList as any);
  app.get('/api/service/employees', validateEmployeesQuery as any, handleEmployeesList as any);
  app.get('/api/service/menu/products', validateMenuProductsQuery as any, handleMenuProducts as any);
  app.post('/api/service/menu/toggle-availability', validateMenuToggleBody as any, handleMenuToggleAvailability as any);
  app.all('/api/service/employee-master/*', handleEmployeeMasterProxy as any);
  app.post('/api/service/etl/run', validateEtlRunBody as any, handleETL as any);
  app.get('/api/service/etl/status', validateEtlStatusQuery as any, handleETLStatus as any);

  // ============ SCHEDULED TASK ENDPOINT ============
  // POST /api/scheduled/etl — triggered by Manus scheduled task (uses OAuth session cookie)
  // Platform auto-injects $SCHEDULED_TASK_COOKIE which resolves to a valid session
  // Any authenticated user (customer/staff/admin) can trigger the ETL
  app.post('/api/scheduled/etl', async (req: any, res: any, next: any) => {
    try {
      const user = await authenticateClerkRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'unauthorized', message: 'Valid session cookie required' });
      }
      // Any valid authenticated session can trigger ETL (scheduled task uses platform-assigned role)
      next();
    } catch (err: any) {
      return res.status(403).json({ error: 'auth_failed', message: err.message || 'Authentication failed' });
    }
  }, handleETL as any);

  // POST /api/service/digest — triggered by GitHub Actions to send daily digest notification
  // Uses scopedAuthMiddleware (Bearer token) since it's under /api/service/*
  // If title/content provided in body, sends that directly.
  // If no body, auto-composes full digest from yesterday's Supabase data.
  app.post('/api/service/digest', async (req: any, res: any) => {
    try {
      let { title, content } = req.body || {};

      // Auto-compose from Supabase if no content provided
      if (!title || !content) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
          return res.status(500).json({ error: 'config_error', message: 'Supabase credentials not configured' });
        }
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get yesterday's date in IST (UTC+5:30)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffset);
        const yesterday = new Date(istNow);
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        // Query sales_facts for that date (include item_name, order_type for breakdown)
        const { data: salesData, error: sfError } = await supabase
          .from('sales_facts')
          .select('outlet, item_name, item_total_rupees, order_total_rupees, order_subtotal_rupees, order_tax_rupees, order_discount_rupees, source, channel, order_type, source_order_id')
          .eq('order_date', dateStr);

        if (sfError) {
          return res.status(500).json({ error: 'query_error', message: sfError.message });
        }

        // Query stock_snapshots for low stock alerts
        const { data: stockData } = await supabase
          .from('stock_snapshots')
          .select('item_name, current_quantity, unit, outlet, is_low_stock')
          .eq('snapshot_date', dateStr)
          .eq('is_low_stock', true);

        // Query wastage_facts
        const { data: wastageData } = await supabase
          .from('wastage_facts')
          .select('item_name, quantity, unit, outlet, cost_rupees')
          .eq('wastage_date', dateStr);

        // Query margin data from sales_facts directly (items that have ingredient_cost_inr populated)
        const { data: marginRawData } = await supabase
          .from('sales_facts')
          .select('outlet, item_quantity, item_unit_price_rupees, ingredient_cost_inr, gross_margin_inr')
          .eq('order_date', dateStr)
          .not('ingredient_cost_inr', 'is', null);

        // Also get total line count for coverage %
        const { count: totalLineCount } = await supabase
          .from('sales_facts')
          .select('*', { count: 'exact', head: true })
          .eq('order_date', dateStr);

        // ═══ REVENUE BREAKDOWN ═══
        // Use order_subtotal_rupees (pre-GST) and order_tax_rupees per UNIQUE order
        // Exclude voided orders (order_total_rupees = 0)
        type ChannelData = { subtotal: number; tax: number; total: number; discount: number; orders: Set<string> };
        const byChannel: Record<string, ChannelData> = {};
        const itemCounts: Record<string, number> = {};
        let totalSubtotal = 0;
        let totalTax = 0;
        let totalRevenue = 0;
        let totalDiscount = 0;
        const allOrders = new Set<string>();
        // Track unique orders to avoid double-counting
        const seenOrders: Record<string, { key: string }> = {};
        // Track voided orders to exclude them
        const voidedOrders = new Set<string>();

        // First pass: identify voided orders (order_total = 0)
        for (const row of (salesData || [])) {
          const orderId = `${row.source}_${row.source_order_id}`;
          const orderTotal = parseFloat(row.order_total_rupees) || 0;
          if (orderTotal === 0 && !voidedOrders.has(orderId)) {
            voidedOrders.add(orderId);
          }
        }

        for (const row of (salesData || [])) {
          const orderId = `${row.source}_${row.source_order_id}`;
          // Skip voided orders entirely
          if (voidedOrders.has(orderId)) continue;

          const outlet = row.outlet || 'unknown';
          // Determine channel: delivery vs instore (pickup = instore)
          let channelLabel: string;
          if (row.order_type === 'delivery') {
            channelLabel = 'delivery';
          } else {
            // instore, pickup, dine_in all count as instore
            channelLabel = 'instore';
          }

          const key = `${outlet}_${channelLabel}`;
          if (!byChannel[key]) byChannel[key] = { subtotal: 0, tax: 0, total: 0, discount: 0, orders: new Set() };

          // Track unique orders — only count totals once per order
          if (!seenOrders[orderId]) {
            const orderSubtotal = parseFloat(row.order_subtotal_rupees) || 0;
            const orderTax = parseFloat(row.order_tax_rupees) || 0;
            const orderTotal = parseFloat(row.order_total_rupees) || 0;
            const orderDiscount = parseFloat(row.order_discount_rupees) || 0;
            seenOrders[orderId] = { key };
            byChannel[key].subtotal += orderSubtotal;
            byChannel[key].tax += orderTax;
            byChannel[key].total += orderTotal;
            byChannel[key].discount += orderDiscount;
            totalSubtotal += orderSubtotal;
            totalTax += orderTax;
            totalRevenue += orderTotal;
            totalDiscount += orderDiscount;
          }
          byChannel[key].orders.add(orderId);
          allOrders.add(orderId);

          // Track item popularity (count each line item row)
          const itemName = row.item_name || 'Unknown';
          if (itemName !== 'Order Total (no line items)') {
            itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
          }
        }

        // ═══ FORMAT DIGEST ═══
        title = `Taiwan Maami Daily Digest — ${dateStr}`;
        const lines: string[] = [];

        if (totalRevenue === 0 && (salesData || []).length === 0) {
          lines.push(`⚠️ No sales data found for ${dateStr}. ETL may not have run or no orders were placed.`);
        } else {
          // 💰 REVENUE section
          lines.push(`🏪 *Taiwan Maami Daily Digest* _${dateStr}_`);
          lines.push('');
          lines.push(`💰 *REVENUE*`);

          const channelOrder = ['palladium_instore', 'palladium_delivery', 'tnagar_instore', 'tnagar_delivery'];
          const channelLabels: Record<string, string> = {
            'palladium_instore': 'Palladium In-store',
            'palladium_delivery': 'Palladium Delivery',
            'tnagar_instore': 'T.Nagar In-store',
            'tnagar_delivery': 'T.Nagar Delivery',
          };

          for (const key of channelOrder) {
            const data = byChannel[key];
            if (data) {
              lines.push(`${channelLabels[key]}: ₹${Math.round(data.subtotal).toLocaleString('en-IN')} (${data.orders.size} orders)`);
            } else {
              lines.push(`${channelLabels[key]}: ₹0 (0 orders)`);
            }
          }

          // Menu Sales = subtotal (core_total, pre-tax pre-discount)
          // Packaging & Other = total - (subtotal - discount + tax) — the remainder that reconciles exactly
          const packagingOther = Math.round(totalRevenue - (totalSubtotal - totalDiscount + totalTax));
          lines.push(`Menu Sales: ₹${Math.round(totalSubtotal).toLocaleString('en-IN')}`);
          if (totalDiscount > 0) {
            lines.push(`Aggregator Discounts: -₹${Math.round(totalDiscount).toLocaleString('en-IN')}`);
          }
          if (packagingOther !== 0) {
            const sign = packagingOther > 0 ? '+' : '-';
            lines.push(`Packaging & Other: ${sign}₹${Math.abs(packagingOther).toLocaleString('en-IN')}`);
          }
          lines.push(`GST Collected: ₹${Math.round(totalTax).toLocaleString('en-IN')}`);
          lines.push(`*Net Collected: ₹${Math.round(totalRevenue).toLocaleString('en-IN')} | Orders: ${allOrders.size}*`);

          // 📊 GROSS MARGIN section
          lines.push('');
          if (marginRawData && marginRawData.length > 0) {
            // Aggregate margin by outlet
            const marginByOutlet: Record<string, { revenue: number; margin: number }> = {};
            for (const row of marginRawData) {
              const outlet = row.outlet || 'unknown';
              if (!marginByOutlet[outlet]) marginByOutlet[outlet] = { revenue: 0, margin: 0 };
              const qty = parseInt(row.item_quantity) || 1;
              marginByOutlet[outlet].revenue += (parseFloat(row.item_unit_price_rupees) || 0) * qty;
              marginByOutlet[outlet].margin += parseFloat(row.gross_margin_inr) || 0;
            }
            const costedCount = marginRawData.length;
            const coveragePct = totalLineCount ? Math.round((costedCount / totalLineCount) * 100) : 0;
            lines.push(`📊 *GROSS MARGIN* _(${coveragePct}% of items costed)_`);
            const outletOrder = ['palladium', 'tnagar'];
            let combinedMargin = 0;
            let combinedRevenue = 0;
            for (const outlet of outletOrder) {
              const data = marginByOutlet[outlet];
              if (data) {
                const pct = data.revenue > 0 ? (data.margin / data.revenue * 100) : 0;
                const outletName = outlet === 'tnagar' ? 'T.Nagar' : 'Palladium';
                lines.push(`${outletName}: ₹${Math.round(data.margin).toLocaleString('en-IN')} (${pct.toFixed(1)}%)`);
                combinedMargin += data.margin;
                combinedRevenue += data.revenue;
              }
            }
            const combinedPct = combinedRevenue > 0 ? (combinedMargin / combinedRevenue * 100) : 0;
            lines.push(`*Combined: ₹${Math.round(combinedMargin).toLocaleString('en-IN')} (${combinedPct.toFixed(1)}%)*`);
          } else {
            lines.push(`📊 *GROSS MARGIN*`);
            lines.push(`_(populates once recipe costing is complete)_`);
          }

          // 🏆 TOP 3 ITEMS section
          lines.push('');
          lines.push(`🏆 *TOP 3 ITEMS TODAY*`);
          const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
          if (sortedItems.length > 0) {
            for (const [name, count] of sortedItems) {
              lines.push(`• ${name}: ${count} orders`);
            }
          } else {
            lines.push(`_(no item-level data available)_`);
          }

          // 📦 STOCK ALERTS section
          lines.push('');
          lines.push(`📦 *STOCK ALERTS*`);
          if (stockData && stockData.length > 0) {
            // Show top 5 most critical
            const alerts = stockData.slice(0, 5);
            for (const item of alerts) {
              const outletName = item.outlet === 'tnagar' ? 'T.Nagar' : item.outlet === 'palladium' ? 'Palladium' : item.outlet;
              lines.push(`• ${item.item_name} low at ${outletName}: ${item.current_quantity} ${item.unit || 'units'}`);
            }
            if (stockData.length > 5) {
              lines.push(`_(+${stockData.length - 5} more alerts)_`);
            }
          } else {
            lines.push(`No alerts today ✅`);
          }

          // 🗑️ WASTAGE section
          lines.push('');
          lines.push(`🗑️ *WASTAGE*`);
          if (wastageData && wastageData.length > 0) {
            let totalWastageCost = 0;
            for (const item of wastageData.slice(0, 3)) {
              const outletName = item.outlet === 'tnagar' ? 'T.Nagar' : item.outlet === 'palladium' ? 'Palladium' : item.outlet;
              lines.push(`• ${item.item_name}: ${item.quantity} ${item.unit || 'units'} (${outletName})`);
              totalWastageCost += (item.cost_rupees || 0);
            }
            if (totalWastageCost > 0) {
              lines.push(`Total wastage cost: ₹${Math.round(totalWastageCost).toLocaleString('en-IN')}`);
            }
          } else {
            lines.push(`_(populates after stock take sync)_`);
          }
        }

        content = lines.join('\n');
      }

      const { notifyOwner } = await import('./notification');
      const { sendWhatsApp } = await import('../whatsapp');

      // Send via both channels
      const [delivered, whatsappResult] = await Promise.all([
        notifyOwner({ title, content }),
        sendWhatsApp({ body: content }),
      ]);

      return res.json({
        success: delivered || whatsappResult.success,
        title,
        content,
        whatsapp: whatsappResult.success ? 'sent' : whatsappResult.error,
      });
    } catch (err: any) {
      console.error('[Service Digest] Error:', err.message);
      return res.status(500).json({ error: 'internal', message: err.message || 'Failed to send digest' });
    }
  });

  // ============ PAGEVIEW TRACKING ENDPOINT ============
  // Lightweight endpoint for client-side analytics tracking
  app.post('/api/track', async (req, res) => {
    try {
      const { sessionId, url, referrer, device, utmSource, utmMedium, utmCampaign } = req.body;
      
      if (!sessionId || !url) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Parse user agent for browser/OS
      const ua = req.headers['user-agent'] || '';
      let browser = 'Unknown';
      let os = 'Unknown';
      
      if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
      else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
      else if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Edg')) browser = 'Edge';
      else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
      
      if (ua.includes('Windows')) os = 'Windows';
      else if (ua.includes('Mac OS')) os = 'macOS';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
      else if (ua.includes('Linux')) os = 'Linux';
      
      // Detect device type from user agent if not provided
      let deviceType = device || 'desktop';
      if (!device) {
        if (/Mobile|Android.*Mobile|iPhone|iPod/.test(ua)) deviceType = 'mobile';
        else if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) deviceType = 'tablet';
      }
      
      const { getDb } = await import('../db');
      const { pageviews } = await import('../../drizzle/schema');
      
      const dbInstance = await getDb();
      if (!dbInstance) {
        return res.status(200).json({ ok: true }); // Silently succeed if DB unavailable
      }
      
      await dbInstance.insert(pageviews).values({
        sessionId: sessionId.substring(0, 64),
        url: url.substring(0, 500),
        referrer: referrer ? referrer.substring(0, 500) : null,
        browser,
        os,
        device: deviceType as 'desktop' | 'mobile' | 'tablet',
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
      });
      
      return res.status(200).json({ ok: true });
    } catch (error) {
      // Never fail tracking - just log and return success
      console.error('[Track] Error:', error);
      return res.status(200).json({ ok: true });
    }
  });

  // ============ IMAGE PROXY / OPTIMIZER ============
  // Resizes large S3/CloudFront images on the fly using Sharp
  app.get('/api/img', async (req, res) => {
    try {
      const url = req.query.url as string;
      const w = parseInt(req.query.w as string) || 400;
      const q = parseInt(req.query.q as string) || 80;
      
      if (!url || (!url.includes('cloudfront.net') && !url.includes('amazonaws.com'))) {
        return res.status(400).json({ error: 'Invalid URL' });
      }
      
      // Clamp dimensions
      const width = Math.min(Math.max(w, 50), 1200);
      const quality = Math.min(Math.max(q, 10), 100);
      
      // Set aggressive cache headers (1 year)
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      res.set('Vary', 'Accept');
      
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(502).json({ error: 'Failed to fetch image' });
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      const sharp = (await import('sharp')).default;
      
      // Determine output format based on Accept header
      const acceptsWebp = req.headers.accept?.includes('image/webp');
      const acceptsAvif = req.headers.accept?.includes('image/avif');
      
      let pipeline = sharp(buffer).resize(width, undefined, { fit: 'inside', withoutEnlargement: true });
      
      if (acceptsAvif) {
        pipeline = pipeline.avif({ quality });
        res.set('Content-Type', 'image/avif');
      } else if (acceptsWebp) {
        pipeline = pipeline.webp({ quality });
        res.set('Content-Type', 'image/webp');
      } else {
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        res.set('Content-Type', 'image/jpeg');
      }
      
      const optimized = await pipeline.toBuffer();
      res.send(optimized);
    } catch (error) {
      console.error('[ImageProxy] Error:', error);
      // Fallback: redirect to original
      const url = req.query.url as string;
      if (url) return res.redirect(url);
      res.status(500).json({ error: 'Image processing failed' });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
// Deployment trigger Mon Dec 15 12:25:17 EST 2025
