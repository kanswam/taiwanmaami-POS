import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { handleSalesReportExport } from "../excelExport";
import { handleDeliveryUpload, handleGetDeliveryUploads, handleDeleteDeliveryUpload, deliveryUploadMiddleware } from "../deliveryUpload";
import { createContext } from "./context";
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
          return {
            productName: item.productName,
            quantity: item.quantity,
            price: item.unitPrice,
            size: item.size,
            withBoba: item.withBoba,
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
        outletId: order.outletId || 1,
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
        outletId: order.outletId || 1,
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

  // Delivery data upload/management
  app.post('/api/delivery/upload', deliveryUploadMiddleware as any, handleDeliveryUpload as any);
  app.get('/api/delivery/uploads', handleGetDeliveryUploads as any);
  app.delete('/api/delivery/uploads/:id', handleDeleteDeliveryUpload as any);

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
