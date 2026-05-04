import "dotenv/config";
import express from "express";
import { ENV } from "./env";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
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
import { sdk } from "./sdk";
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
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
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
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'unauthorized', message: 'Valid session cookie required' });
      }
      // Any valid authenticated session can trigger ETL (scheduled task uses platform-assigned role)
      next();
    } catch (err: any) {
      return res.status(403).json({ error: 'auth_failed', message: err.message || 'Authentication failed' });
    }
  }, handleETL as any);

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
