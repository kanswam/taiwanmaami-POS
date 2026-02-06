import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { getDb, serializeDates, serializeDateArray } from "./db";
import { seedDatabase } from "./seed";
import { categories, subcategories, products, addons, orders, orderItems as orderItemsTable, orderItemAddons, payments, discounts, addresses, storeLocations, deliveryAreas, users, productAddons } from "../drizzle/schema";
import { eq, and, desc, asc, sql, or, gte } from "drizzle-orm";
import { generateOrderNumber, calculateGst } from "@shared/types";
// POS functionality removed - Employee Master import removed
import { outletProducts, loyaltyRewards, stampTransactions, guestOrders, reviews, kotQueue, receiptQueue, productAuditLog, categoryAuditLog, complaints, eventInquiries, eventOrders, eventOrderItems, workshops, workshopBookings, workshopDates, workshopWaitlist, backupLogs, blogArticles } from "../drizzle/schema";
import { ENV } from './_core/env';
import { wholesaleRouter } from './wholesaleRouter';
import { notifyOwner } from './_core/notification';

// Admin procedure - only allows admin role
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Staff procedure - allows staff and admin roles
const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'staff' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Staff access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Menu routes (public)
  menu: router({
    getCategories: publicProcedure.query(async () => {
      return db.getCategories();
    }),

    getSubcategories: publicProcedure
      .input(z.object({ categoryId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.getSubcategories(input?.categoryId);
      }),

    getProducts: publicProcedure
      .input(z.object({ 
        subcategoryId: z.number().optional(),
        categoryId: z.number().optional(),
        isDelivery: z.boolean().default(false)
      }).optional())
      .query(async ({ input }) => {
        if (input?.categoryId) {
          return db.getProductsWithSubcategory(input.categoryId, input.isDelivery);
        }
        return db.getProducts(input?.subcategoryId);
      }),

    getProductBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const product = await db.getProductBySlug(input.slug);
        if (!product) throw new TRPCError({ code: 'NOT_FOUND' });
        
        const subcategory = await db.getSubcategoryBySlug(product.subcategoryId.toString());
        return { product, subcategory };
      }),

    getAddons: publicProcedure
      .input(z.object({ type: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return db.getAddons(input?.type);
      }),

    getCustomizationOptions: publicProcedure.query(async () => {
      return db.getCustomizationOptions();
    }),

    // Get public delivery settings (radius, enabled status, etc.)
    getDeliverySettings: publicProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return { deliveryRadius: 15, deliveryEnabled: true };
      const { siteSettings } = await import('../drizzle/schema.js');
      const settings = await dbInstance.select().from(siteSettings).where(
        or(
          eq(siteSettings.key, 'delivery_radius'),
          eq(siteSettings.key, 'delivery_enabled')
        )
      );
      const settingsMap: Record<string, string> = {};
      settings.forEach(s => { if (s.value) settingsMap[s.key] = s.value; });
      const radius = settingsMap.delivery_radius ? parseInt(settingsMap.delivery_radius) || 15 : 15;
      const enabled = settingsMap.delivery_enabled !== 'false';
      return { deliveryRadius: radius, deliveryEnabled: enabled };
    }),

    // Get addons linked to a specific product
    getProductAddons: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return db.getProductAddonsForProduct(input.productId);
      }),

    // Public site settings for homepage CMS content (no auth required)
    getPublicSiteSettings: publicProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { siteSettings } = await import('../drizzle/schema.js');
      return dbInstance.select().from(siteSettings);
    }),

    getFullMenu: publicProcedure
      .input(z.object({ 
        isDelivery: z.boolean().default(false), 
        isPickup: z.boolean().default(false),
        includeUnavailable: z.boolean().default(true) 
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { categories: [], subcategories: [], products: [], addons: [] };

        const cats = await db.getCategories();
        const allSubs = await db.getSubcategories();
        
        // Filter subcategories by availability for the order type
        const subs = allSubs.filter(sub => {
          if (input.isDelivery) return sub.availableDelivery !== false;
          if (input.isPickup) return sub.availablePickup !== false;
          return sub.availableInstore !== false;
        });
        
        // Get IDs of available subcategories
        const availableSubcategoryIds = subs.map(s => s.id);
        
        // Include all products for the channel, showing inactive/out-of-stock with visual indicators
        // Filter by availability channel (delivery vs instore) AND subcategory availability
        // Order by subcategory (which inherits category order), then product displayOrder
        const prods = await dbInstance!.select()
          .from(products)
          .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))
          .leftJoin(categories, eq(subcategories.categoryId, categories.id))
          .where(
            input.isDelivery ? eq(products.availableDelivery, true) : eq(products.availableInstore, true)
          )
          .orderBy(
            asc(categories.displayOrder),
            asc(subcategories.displayOrder),
            asc(products.displayOrder)
          )
          .then(rows => rows.map(r => r.products))
          .then(prods => prods.filter(p => availableSubcategoryIds.includes(p.subcategoryId)));
        const adds = await db.getAddons();

        return { categories: cats, subcategories: subs, products: prods, addons: adds };
      }),
  }),

  // Order routes
  orders: router({
    create: publicProcedure
      .input(z.object({
        orderType: z.enum(['instore', 'delivery', 'pickup']),
        tableNumber: z.string().optional(), // For in-store orders
        outletId: z.number().optional(), // 1 = Palladium, 2 = T.Nagar
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        items: z.array(z.object({
          productId: z.number(),
          productName: z.string(),
          size: z.enum(['petite', 'regular', 'large']).optional(),
          withBoba: z.boolean().optional(),
          sugarLevel: z.string().optional(),
          iceLevel: z.string().optional(),
          quantity: z.number().min(1),
          unitPrice: z.number(),
          addonsTotal: z.number(),
          lineTotal: z.number(),
          addons: z.array(z.object({
            id: z.number(),
            name: z.string(),
            price: z.number(),
          })),
          specialInstructions: z.string().optional(),
        })),
        deliveryAddressId: z.number().optional(),
        deliveryAddress: z.string().optional(),
        scheduledTime: z.string().optional(),
        discountCode: z.string().optional(),
        specialInstructions: z.string().optional(),
        loyaltyPointsUsed: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        // Calculate totals
        const subtotal = input.items.reduce((sum, item) => sum + item.lineTotal, 0);
        const gst = calculateGst(subtotal);
        let discountAmount = 0;
        // ₹100 flat delivery charge for delivery orders, FREE for orders above ₹2500
        let deliveryCharge = 0;
        if (input.orderType === 'delivery') {
          deliveryCharge = subtotal >= 250000 ? 0 : 10000; // Free delivery for orders ≥₹2500
        }

        // Apply discount if code provided
        let appliedDiscount: Awaited<ReturnType<typeof db.getDiscountByCode>> = undefined;
        if (input.discountCode) {
          const discount = await db.getDiscountByCode(input.discountCode);
          if (discount && discount.isActive) {
            // Validate first-time only restriction
            if (discount.firstTimeOnly && ctx.user?.id) {
              const hasUsed = await db.hasUserUsedDiscount(ctx.user.id, discount.id);
              const orderCount = await db.getUserOrderCount(ctx.user.id);
              if (hasUsed || orderCount > 0) {
                // Skip discount - user is not eligible
                discount.isActive = false; // Mark as not applicable
              }
            }
            // Validate order type restriction
            if (discount.orderTypeRestriction && discount.orderTypeRestriction !== 'all') {
              // Map 'instore' to 'dine_in' for comparison with discount restriction
              const mappedOrderType = input.orderType === 'instore' ? 'dine_in' : input.orderType;
              if (discount.orderTypeRestriction !== mappedOrderType) {
                discount.isActive = false; // Mark as not applicable
              }
            }
            if (discount.isActive) {
              appliedDiscount = discount;
              if (discount.type === 'percentage') {
                discountAmount = Math.round(subtotal * discount.value / 100);
                if (discount.maxDiscountAmount) {
                  discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
                }
              } else {
                discountAmount = discount.value;
              }
            }
          }
        }

        const totalAmount = subtotal + gst.total + deliveryCharge - discountAmount - input.loyaltyPointsUsed;
        
        // Generate sequential 5-digit order number
        const [maxOrderResult] = await dbInstance!.execute(sql`SELECT MAX(CAST(orderNumber AS UNSIGNED)) as maxNum FROM orders WHERE orderNumber REGEXP '^[0-9]+$'`);
        const maxNum = (maxOrderResult as any)[0]?.maxNum || 0;
        const nextNum = maxNum + 1;
        const orderNumber = String(nextNum).padStart(5, '0');

        // Determine outletId: Delivery always from T.Nagar (2), otherwise use provided outletId
        const outletId = input.orderType === 'delivery' ? 2 : (input.outletId || 2);
        
        // Create order
        const [orderResult] = await dbInstance!.insert(orders).values({
          orderNumber,
          userId: ctx.user?.id,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          orderType: input.orderType,
          tableNumber: input.orderType === 'instore' ? input.tableNumber : null,
          outletId,
          subtotal,
          stateGst: gst.stateGst,
          centralGst: gst.centralGst,
          deliveryCharge,
          discountAmount,
          loyaltyPointsUsed: input.loyaltyPointsUsed,
          totalAmount,
          deliveryAddressId: input.deliveryAddressId,
          deliveryAddress: input.deliveryAddress,
          scheduledTime: input.scheduledTime ? new Date(input.scheduledTime) : null,
          discountCode: input.discountCode,
          specialInstructions: input.specialInstructions,
        });

        const orderId = orderResult.insertId;

        // Create order items
        for (const item of input.items) {
          const [itemResult] = await dbInstance!.insert(orderItemsTable).values({
            orderId,
            productId: item.productId,
            productName: item.productName,
            size: item.size,
            withBoba: item.withBoba,
            sugarLevel: item.sugarLevel,
            iceLevel: item.iceLevel,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            addonsTotal: item.addonsTotal,
            lineTotal: item.lineTotal,
            specialInstructions: item.specialInstructions,
          });

          const orderItemId = itemResult.insertId;

          // Create order item addons
          for (const addon of item.addons) {
            await dbInstance!.insert(orderItemAddons).values({
              orderItemId,
              addonId: addon.id,
              addonName: addon.name,
              addonPrice: addon.price,
            });
          }
        }

        // For in-store orders, create KOT immediately
        // Kitchen needs to start preparing right away since customer is present
        if (input.orderType === 'instore') {
          try {
            const kotData = {
              orderId: orderNumber,
              orderType: 'INSTORE',
              tableNumber: input.tableNumber || '',
              customerName: input.customerName || ctx.user?.name || 'Guest',
              customerPhone: input.customerPhone || '',
              specialInstructions: input.specialInstructions || '',
              items: input.items.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                price: item.unitPrice,
                size: item.size,
                withBoba: item.withBoba,
                sugarLevel: item.sugarLevel,
                iceLevel: item.iceLevel,
                specialInstructions: item.specialInstructions || '',
                addons: item.addons.map(a => ({
                  name: a.name,
                  price: a.price,
                })),
              })),
              totalAmount,
              createdAt: new Date().toISOString(),
            };
            
            await dbInstance!.insert(kotQueue).values({
              orderId: orderId.toString(),
              outletId: outletId, // Route to selected outlet (1=Palladium, 2=T.Nagar)
              orderNumber,
              kotData: kotData,
              isPrinted: false,
            });
          } catch (kotError) {
            // CRITICAL: KOT queuing failed - notify owner immediately
            console.error('CRITICAL: KOT queuing failed for order', orderNumber, kotError);
            try {
              await notifyOwner({
                title: `🚨 CRITICAL: KOT Failed for Order #${orderNumber}`,
                content: `KOT could not be queued for in-store order #${orderNumber}. Table: ${input.tableNumber || 'N/A'}. Please manually print KOT from Admin panel immediately!`,
              });
            } catch (notifyError) {
              console.error('Failed to send KOT failure notification', notifyError);
            }
          }
        }
        
        // For PICKUP orders, create KOT immediately on order confirmation
        // Kitchen needs to start preparing so food is ready when customer arrives
        if (input.orderType === 'pickup') {
          try {
            const kotData = {
              orderId: orderNumber,
              orderType: 'PICKUP',
              customerName: input.customerName || ctx.user?.name || 'Guest',
              customerPhone: input.customerPhone || '',
              specialInstructions: input.specialInstructions || '',
              items: input.items.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                price: item.unitPrice,
                size: item.size,
                withBoba: item.withBoba,
                sugarLevel: item.sugarLevel,
                iceLevel: item.iceLevel,
                specialInstructions: item.specialInstructions || '',
                addons: item.addons.map(a => ({
                  name: a.name,
                  price: a.price,
                })),
              })),
              totalAmount,
              createdAt: new Date().toISOString(),
            };
            
            await dbInstance!.insert(kotQueue).values({
              orderId: orderId.toString(),
              outletId: outletId, // Route to selected outlet (1=Palladium, 2=T.Nagar)
              orderNumber,
              kotData: kotData,
              isPrinted: false,
            });
          } catch (kotError) {
            // CRITICAL: KOT queuing failed - notify owner immediately
            console.error('CRITICAL: KOT queuing failed for pickup order', orderNumber, kotError);
            try {
              await notifyOwner({
                title: `🚨 CRITICAL: KOT Failed for Pickup Order #${orderNumber}`,
                content: `KOT could not be queued for pickup order #${orderNumber}. Customer: ${input.customerName || ctx.user?.name || 'Guest'}. Please manually print KOT from Admin panel immediately!`,
              });
            } catch (notifyError) {
              console.error('Failed to send KOT failure notification', notifyError);
            }
          }
        }
        
        // Record discount usage if a first-time discount was applied
        if (appliedDiscount && appliedDiscount.firstTimeOnly && ctx.user?.id) {
          await db.recordDiscountUsage(appliedDiscount.id, ctx.user.id, orderId);
        }
        
        return { orderId, orderNumber, totalAmount };
      }),

    // Create KOT for in-store orders that skip payment
    createKotForInstore: publicProcedure
      .input(z.object({
        orderId: z.number(),
        orderNumber: z.string(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Get order details
        const [order] = await dbInstance.select().from(orders).where(eq(orders.id, input.orderId));
        if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        
        // Only create KOT for in-store orders
        if (order.orderType !== 'instore') {
          return { success: false, message: 'KOT only created for in-store orders' };
        }
        
        // Get order items
        const items = await dbInstance.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, input.orderId));
        const itemIds = items.map(i => i.id);
        const itemAddons = itemIds.length > 0 
          ? await dbInstance.select().from(orderItemAddons).where(sql`${orderItemAddons.orderItemId} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`)
          : [];
        
        // Build KOT data
        const kotData = {
          orderId: order.orderNumber,
          orderType: 'INSTORE',
          tableNumber: order.tableNumber || '',
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
        
        await dbInstance.insert(kotQueue).values({
          orderId: order.id.toString(),
          outletId: order.outletId || 1,
          orderNumber: order.orderNumber,
          kotData: kotData,
          isPrinted: false,
        });
        
        return { success: true };
      }),

    getByNumber: publicProcedure
      .input(z.object({ orderNumber: z.string() }))
      .query(async ({ input }) => {
        const order = await db.getOrderByNumber(input.orderNumber);
        if (!order) throw new TRPCError({ code: 'NOT_FOUND' });
        
        const items = await db.getOrderItems(order.id);
        return { order, items };
      }),

    getUserOrders: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserOrders(ctx.user.id);
    }),

    // Staff can update order status
    updateStatus: staffProcedure
      .input(z.object({ 
        orderId: z.number(), 
        status: z.string(),
        paymentMethod: z.enum(['cash', 'upi', 'card', 'swiggy_dineout', 'zomato_dineout', 'eazydiner', 'other']).optional(),
        paymentProofUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        
        // Get order details before updating
        const [order] = await dbInstance!
          .select()
          .from(orders)
          .where(eq(orders.id, input.orderId));
        
        if (!order) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        }
        
        // CRITICAL: Prevent delivery orders from being prepared without payment
        // Delivery orders MUST be paid online before preparation can start
        if (order.orderType === 'delivery' && 
            input.status !== 'pending' && 
            input.status !== 'cancelled' &&
            order.paymentStatus !== 'completed') {
          throw new TRPCError({ 
            code: 'PRECONDITION_FAILED', 
            message: 'Cannot prepare delivery order - payment not verified. Please wait for payment confirmation or cancel the order.' 
          });
        }
        
        // For pickup orders with online payment selected, also require payment before preparation
        if (order.orderType === 'pickup' && 
            order.paymentMethod === 'razorpay' &&
            input.status !== 'pending' && 
            input.status !== 'cancelled' &&
            order.paymentStatus !== 'completed') {
          throw new TRPCError({ 
            code: 'PRECONDITION_FAILED', 
            message: 'Cannot prepare order - online payment not verified. Please wait for payment confirmation or cancel the order.' 
          });
        }
        
        await db.updateOrderStatus(input.orderId, input.status);
        
        // Update payment method and proof if provided (for completed in-store orders)
        if (input.status === 'completed' && (input.paymentMethod || input.paymentProofUrl)) {
          const updateData: any = {};
          if (input.paymentMethod) updateData.paymentMethod = input.paymentMethod;
          if (input.paymentProofUrl) updateData.paymentProofUrl = input.paymentProofUrl;
          
          await dbInstance!
            .update(orders)
            .set(updateData)
            .where(eq(orders.id, input.orderId));
        }
        
        // Queue receipt for printing when order is completed
        if (input.status === 'completed' && order) {
          // Get order items with details
          const items = await dbInstance!.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, input.orderId));
          // Get all item addons for this order's items
          const itemIds = items.map(i => i.id);
          const itemAddons = itemIds.length > 0 
            ? await dbInstance!.select().from(orderItemAddons).where(sql`${orderItemAddons.orderItemId} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`)
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
                name: item.productName,
                quantity: item.quantity,
                price: item.unitPrice,
                size: item.size,
                addons: addons.map(a => ({ name: a.addonName, price: a.addonPrice })),
              };
            }),
            subtotal: order.subtotal,
            sgst: order.stateGst,
            cgst: order.centralGst,
            discount: order.discountAmount || 0,
            deliveryCharge: order.deliveryCharge || 0,
            total: order.totalAmount,
            paymentMethod: input.paymentMethod || order.paymentMethod || 'cash',
            createdAt: new Date().toISOString(),
          };
          
          await dbInstance!.insert(receiptQueue).values({
            orderId: order.id,
            outletId: order.outletId || 1,
            orderNumber: order.orderNumber,
            receiptData: receiptData,
            isPrinted: false,
          });
        }
        
        // Award stamps when order is marked as completed
        if (input.status === 'completed' && order && order.userId) {
          const orderTotal = order.totalAmount || 0;
          
          // Get current user info including role
          const [user] = await dbInstance!
            .select({
              stampCount: users.stampCount,
              lifetimeStamps: users.lifetimeStamps,
              role: users.role,
            })
            .from(users)
            .where(eq(users.id, order.userId));
          
          // Staff and admin accounts should not earn stamps
          if (user?.role === 'staff' || user?.role === 'admin') {
            // Skip stamp awarding for staff/admin
          } else {
          
          const isFirstOrder = (user?.lifetimeStamps || 0) === 0;
          let stampsEarned = Math.floor(orderTotal / 45000); // 1 stamp per ₹450
          let welcomeStamp = 0;
          
          // Welcome stamp for first order
          if (isFirstOrder) {
            welcomeStamp = 1;
          }
          
          const totalStamps = stampsEarned + welcomeStamp;
          
          if (totalStamps > 0) {
            // Update user stamps
            const newStampCount = (user?.stampCount || 0) + totalStamps;
            const newLifetimeStamps = (user?.lifetimeStamps || 0) + totalStamps;
            
            await dbInstance!
              .update(users)
              .set({
                stampCount: newStampCount,
                lifetimeStamps: newLifetimeStamps,
                lastStampDate: new Date(),
              })
              .where(eq(users.id, order.userId));
            
            // Record stamp transaction
            await dbInstance!.insert(stampTransactions).values({
              userId: order.userId,
              orderId: input.orderId,
              action: isFirstOrder ? 'welcome' : 'earn',
              stamps: totalStamps,
              orderTotal: orderTotal,
              description: `Earned ${totalStamps} stamp(s) from order #${order.orderNumber}`,
              createdAt: new Date(),
            });
            
            // Check if user earned any rewards (every 10 stamps)
            let currentStamps = newStampCount;
            let rewardsCreated = 0;
            while (currentStamps >= 10) {
              // Create a reward with unique voucher code
              const voucherCode = `REWARD${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
              await dbInstance!.insert(loyaltyRewards).values({
                userId: order.userId,
                rewardType: 'free_large_bubble_tea',
                voucherCode: voucherCode,
                isRedeemed: false,
                expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
                createdAt: new Date(),
              });
              currentStamps -= 10;
              rewardsCreated++;
            }
            
            // Update stamp count after creating rewards
            if (rewardsCreated > 0) {
              await dbInstance!
                .update(users)
                .set({ stampCount: currentStamps })
                .where(eq(users.id, order.userId));
            }
          }
          } // Close else block for staff/admin check
        }
        
        // Deduct stamps when order is cancelled (if stamps were previously awarded)
        if (input.status === 'cancelled' && order && order.userId) {
          // Check if this order has stamp transactions
          const existingStampTx = await dbInstance!
            .select()
            .from(stampTransactions)
            .where(and(
              eq(stampTransactions.orderId, input.orderId),
              eq(stampTransactions.action, 'earn')
            ));
          
          if (existingStampTx.length > 0) {
            // Calculate total stamps that were awarded for this order
            const stampsToDeduct = existingStampTx.reduce((sum, tx) => sum + tx.stamps, 0);
            
            if (stampsToDeduct > 0) {
              // Get current user stamp count
              const [user] = await dbInstance!
                .select({
                  stampCount: users.stampCount,
                  lifetimeStamps: users.lifetimeStamps,
                })
                .from(users)
                .where(eq(users.id, order.userId));
              
              // Deduct stamps (don't go below 0)
              const newStampCount = Math.max(0, (user?.stampCount || 0) - stampsToDeduct);
              const newLifetimeStamps = Math.max(0, (user?.lifetimeStamps || 0) - stampsToDeduct);
              
              await dbInstance!
                .update(users)
                .set({
                  stampCount: newStampCount,
                  lifetimeStamps: newLifetimeStamps,
                })
                .where(eq(users.id, order.userId));
              
              // Record stamp deduction transaction
              await dbInstance!.insert(stampTransactions).values({
                userId: order.userId,
                orderId: input.orderId,
                action: 'deduct',
                stamps: -stampsToDeduct,
                orderTotal: order.totalAmount,
                description: `Stamps deducted - order #${order.orderNumber} cancelled`,
                createdAt: new Date(),
              });
            }
          }
        }
        
        return { success: true };
      }),

    // Staff can manually confirm payment for delivery orders (QR code payment, etc.)
    confirmPaymentManually: staffProcedure
      .input(z.object({
        orderId: z.number(),
        paymentMethod: z.enum(['upi', 'cash', 'card', 'other']).default('upi'),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Get order details
        const [order] = await dbInstance
          .select()
          .from(orders)
          .where(eq(orders.id, input.orderId));
        
        if (!order) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        }
        
        // Only allow manual confirmation for pending delivery/pickup orders
        if (order.paymentStatus === 'completed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payment already confirmed' });
        }
        
        // Update payment status to completed
        await dbInstance
          .update(orders)
          .set({
            paymentStatus: 'completed',
            paymentMethod: input.paymentMethod,
            staffNotes: input.notes ? `[Manual Payment] ${input.notes}` : `[Manual Payment Confirmed by ${ctx.user.name || 'Staff'}]`,
          })
          .where(eq(orders.id, input.orderId));
        
        return { success: true, message: 'Payment confirmed manually' };
      }),

    // Staff can view recent orders
    getRecent: staffProcedure
      .input(z.object({ 
        limit: z.number().default(50),
        outlet: z.enum(['all', 'palladium', 'tnagar']).optional(),
        orderType: z.enum(['all', 'instore', 'delivery', 'pickup']).optional(),
        status: z.enum(['all', 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled']).optional(),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];
        
        let conditions: any[] = [];
        
        // Filter by outlet if specified - this website only handles T Nagar orders (outletId 2)
        if (input?.outlet && input.outlet !== 'all') {
          // T Nagar is outletId 2
          conditions.push(eq(orders.outletId, 2));
        }
        
        // Filter by order type if specified
        if (input?.orderType && input.orderType !== 'all') {
          conditions.push(eq(orders.orderType, input.orderType));
        }
        
        // Filter by status if specified
        if (input?.status && input.status !== 'all') {
          conditions.push(eq(orders.orderStatus, input.status));
        }
        
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        
        // Sort by orderNumber numerically in descending order
        const recentOrders = await dbInstance
          .select()
          .from(orders)
          .where(whereClause)
          .orderBy(sql`CAST(${orders.orderNumber} AS UNSIGNED) DESC`)
          .limit(input?.limit || 50);
        
        // Get order items for each order
        const ordersWithItems = await Promise.all(
          recentOrders.map(async (order) => {
            const items = await dbInstance.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
            return { ...order, items };
          })
        );
        
        return ordersWithItems;
      }),

    // Get active in-store orders for table dashboard
    getActiveInstoreOrders: staffProcedure
      .query(async () => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];
        
        // Get in-store orders that are not completed or cancelled
        const activeOrders = await dbInstance
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.orderType, 'instore'),
              sql`${orders.orderStatus} NOT IN ('completed', 'cancelled')`
            )
          )
          .orderBy(desc(orders.createdAt));
        
        return activeOrders;
      }),

    // Update payment status
    updatePaymentStatus: adminProcedure
      .input(z.object({ 
        orderId: z.number(), 
        paymentStatus: z.enum(['pending', 'partial', 'completed', 'refunded']) 
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        await dbInstance
          .update(orders)
          .set({ paymentStatus: input.paymentStatus })
          .where(eq(orders.id, input.orderId));
        
        return { success: true };
      }),

    // Staff can update notes on orders
    updateStaffNotes: staffProcedure
      .input(z.object({ orderId: z.number(), notes: z.string() }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        await dbInstance
          .update(orders)
          .set({ staffNotes: input.notes })
          .where(eq(orders.id, input.orderId));
        
        return { success: true };
      }),

    // Apply manual discount to existing order
    applyManualDiscount: adminProcedure
      .input(z.object({
        orderId: z.number(),
        discountType: z.enum(['fixed', 'percentage']),
        discountValue: z.number().min(0), // Amount in paise for fixed, percentage value for percentage
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Get current order
        const [order] = await dbInstance.select().from(orders).where(eq(orders.id, input.orderId));
        if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        
        // Calculate discount amount
        let discountAmount: number;
        if (input.discountType === 'percentage') {
          // Calculate percentage of subtotal (before GST)
          discountAmount = Math.round(order.subtotal * (input.discountValue / 100));
        } else {
          // Fixed amount (already in paise)
          discountAmount = input.discountValue;
        }
        
        // Ensure discount doesn't exceed subtotal
        if (discountAmount > order.subtotal) {
          discountAmount = order.subtotal;
        }
        
        // Recalculate totals
        const newSubtotalAfterDiscount = order.subtotal - discountAmount;
        const newStateGst = Math.round(newSubtotalAfterDiscount * 0.025);
        const newCentralGst = Math.round(newSubtotalAfterDiscount * 0.025);
        const newTotalAmount = newSubtotalAfterDiscount + newStateGst + newCentralGst + order.deliveryCharge;
        
        // Update order with discount
        await dbInstance
          .update(orders)
          .set({
            manualDiscountAmount: discountAmount,
            manualDiscountType: input.discountType,
            manualDiscountPercent: input.discountType === 'percentage' ? input.discountValue : null,
            manualDiscountReason: input.reason || null,
            manualDiscountApprovedBy: ctx.user.id,
            discountAmount: discountAmount,
            stateGst: newStateGst,
            centralGst: newCentralGst,
            totalAmount: newTotalAmount,
          })
          .where(eq(orders.id, input.orderId));
        
        return { 
          success: true, 
          discountAmount,
          newTotalAmount,
        };
      }),

    // Add items to existing order (for in-store customers adding more items)
    addItemsToOrder: publicProcedure
      .input(z.object({
        orderId: z.number(),
        items: z.array(z.object({
          productId: z.number(),
          productName: z.string(),
          size: z.enum(['petite', 'regular', 'large']).optional(),
          withBoba: z.boolean().optional(),
          sugarLevel: z.string().optional(),
          iceLevel: z.string().optional(),
          quantity: z.number().min(1),
          unitPrice: z.number(),
          addonsTotal: z.number(),
          lineTotal: z.number(),
          addons: z.array(z.object({
            id: z.number(),
            name: z.string(),
            price: z.number(),
          })),
          specialInstructions: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Get current order
        const [order] = await dbInstance.select().from(orders).where(eq(orders.id, input.orderId));
        if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        
        // Only allow adding items to pending payment orders (in-store)
        if (order.paymentStatus !== 'pending') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot add items to paid orders' });
        }
        
        // Only allow adding to in-store orders
        if (order.orderType !== 'instore') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only add items to in-store orders' });
        }
        
        // Calculate new items total
        const newItemsSubtotal = input.items.reduce((sum, item) => sum + item.lineTotal, 0);
        
        // Insert new order items
        const newOrderItems = [];
        for (const item of input.items) {
          const [insertedItem] = await dbInstance.insert(orderItemsTable).values({
            orderId: input.orderId,
            productId: item.productId,
            productName: item.productName,
            size: item.size || null,
            withBoba: item.withBoba ?? null,
            sugarLevel: item.sugarLevel || null,
            iceLevel: item.iceLevel || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            addonsTotal: item.addonsTotal,
            lineTotal: item.lineTotal,
            specialInstructions: item.specialInstructions || null,
          }).$returningId();
          
          // Insert add-ons for this item
          for (const addon of item.addons) {
            await dbInstance.insert(orderItemAddons).values({
              orderItemId: insertedItem.id,
              addonId: addon.id,
              addonName: addon.name,
              addonPrice: addon.price,
            });
          }
          
          newOrderItems.push({ ...item, id: insertedItem.id });
        }
        
        // Recalculate order totals
        const newSubtotal = order.subtotal + newItemsSubtotal;
        const discountedSubtotal = newSubtotal - (order.discountAmount || 0);
        const newStateGst = Math.round(discountedSubtotal * 0.025);
        const newCentralGst = Math.round(discountedSubtotal * 0.025);
        const newTotalAmount = discountedSubtotal + newStateGst + newCentralGst + order.deliveryCharge;
        
        // Update order totals
        await dbInstance
          .update(orders)
          .set({
            subtotal: newSubtotal,
            stateGst: newStateGst,
            centralGst: newCentralGst,
            totalAmount: newTotalAmount,
          })
          .where(eq(orders.id, input.orderId));
        
        // Queue supplementary KOT for new items only
        const kotData = {
          orderId: order.orderNumber,
          orderType: order.orderType.toUpperCase(),
          customerName: order.customerName || 'Guest',
          customerPhone: order.customerPhone || '',
          tableNumber: order.tableNumber || '',
          specialInstructions: '',
          isAddition: true, // Flag to indicate this is additional items
          items: newOrderItems.map(item => ({
            productName: item.productName,
            quantity: item.quantity,
            price: item.unitPrice,
            size: item.size,
            withBoba: item.withBoba,
            sugarLevel: item.sugarLevel,
            iceLevel: item.iceLevel,
            specialInstructions: item.specialInstructions || '',
            addons: item.addons.map(a => ({ name: a.name, price: a.price })),
          })),
          totalAmount: newItemsSubtotal,
          createdAt: new Date().toISOString(),
        };
        
        await dbInstance.insert(kotQueue).values({
          orderId: order.id.toString(),
          outletId: order.outletId || 1,
          orderNumber: order.orderNumber,
          kotData: kotData,
          isPrinted: false,
        });
        
        return { 
          success: true, 
          orderNumber: order.orderNumber,
          newTotal: newTotalAmount,
        };
      }),

    // Add custom item to existing order (for ad-hoc items like extra egg)
    addCustomItemToOrder: publicProcedure
      .input(z.object({
        orderId: z.number(),
        itemName: z.string().min(1),
        price: z.number().min(0), // Price in paise
        quantity: z.number().min(1).default(1),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Get current order
        const [order] = await dbInstance.select().from(orders).where(eq(orders.id, input.orderId));
        if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        
        // Only allow adding items to pending payment orders (in-store)
        if (order.paymentStatus !== 'pending') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot add items to paid orders' });
        }
        
        // Only allow adding to in-store orders
        if (order.orderType !== 'instore') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only add items to in-store orders' });
        }
        
        const lineTotal = input.price * input.quantity;
        
        // Insert custom order item with productId = 0 to indicate custom item
        const [insertedItem] = await dbInstance.insert(orderItemsTable).values({
          orderId: input.orderId,
          productId: 0, // 0 indicates custom item
          productName: `[Custom] ${input.itemName}`,
          size: null,
          withBoba: null,
          sugarLevel: null,
          iceLevel: null,
          quantity: input.quantity,
          unitPrice: input.price,
          addonsTotal: 0,
          lineTotal: lineTotal,
          specialInstructions: input.notes || null,
        }).$returningId();
        
        // Recalculate order totals
        const newSubtotal = order.subtotal + lineTotal;
        const discountedSubtotal = newSubtotal - (order.discountAmount || 0);
        const newStateGst = Math.round(discountedSubtotal * 0.025);
        const newCentralGst = Math.round(discountedSubtotal * 0.025);
        const newTotalAmount = discountedSubtotal + newStateGst + newCentralGst + order.deliveryCharge;
        
        // Update order totals
        await dbInstance
          .update(orders)
          .set({
            subtotal: newSubtotal,
            stateGst: newStateGst,
            centralGst: newCentralGst,
            totalAmount: newTotalAmount,
          })
          .where(eq(orders.id, input.orderId));
        
        // Queue supplementary KOT for custom item
        const kotData = {
          orderId: order.orderNumber,
          orderType: order.orderType.toUpperCase(),
          customerName: order.customerName || 'Guest',
          customerPhone: order.customerPhone || '',
          tableNumber: order.tableNumber || '',
          specialInstructions: '',
          isAddition: true,
          isCustomItem: true,
          items: [{
            productName: `[Custom] ${input.itemName}`,
            quantity: input.quantity,
            price: input.price,
            size: null,
            withBoba: null,
            sugarLevel: null,
            iceLevel: null,
            specialInstructions: input.notes || '',
            addons: [],
          }],
          totalAmount: lineTotal,
          createdAt: new Date().toISOString(),
        };
        
        await dbInstance.insert(kotQueue).values({
          orderId: order.id.toString(),
          outletId: order.outletId || 1,
          orderNumber: order.orderNumber,
          kotData: kotData,
          isPrinted: false,
        });
        
        return { 
          success: true, 
          orderNumber: order.orderNumber,
          newTotal: newTotalAmount,
          itemName: input.itemName,
        };
      }),

    // Cancel an order item (for dine-in orders only)
    cancelOrderItem: staffProcedure
      .input(z.object({
        orderItemId: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Get the order item
        const [item] = await dbInstance
          .select()
          .from(orderItemsTable)
          .where(eq(orderItemsTable.id, input.orderItemId));
        
        if (!item) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Order item not found' });
        }
        
        // Get the order to check if it's dine-in and not completed
        const [order] = await dbInstance
          .select()
          .from(orders)
          .where(eq(orders.id, item.orderId));
        
        if (!order) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        }
        
        if (order.orderType !== 'instore') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only cancel items from dine-in orders' });
        }
        
        if (order.orderStatus === 'completed' || order.orderStatus === 'cancelled') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot modify completed or cancelled orders' });
        }
        
        // Update the item status to cancelled
        await dbInstance
          .update(orderItemsTable)
          .set({
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy: ctx.user.id,
            cancellationReason: input.reason || 'Cancelled by staff',
          })
          .where(eq(orderItemsTable.id, input.orderItemId));
        
        // Recalculate order totals (excluding cancelled items)
        const allItems = await dbInstance
          .select()
          .from(orderItemsTable)
          .where(eq(orderItemsTable.orderId, order.id));
        
        const activeItems = allItems.filter(i => i.status !== 'cancelled');
        const newSubtotal = activeItems.reduce((sum, i) => sum + i.lineTotal, 0);
        const newStateGst = Math.round(newSubtotal * 0.025);
        const newCentralGst = Math.round(newSubtotal * 0.025);
        const newTotalAmount = newSubtotal + newStateGst + newCentralGst;
        
        await dbInstance
          .update(orders)
          .set({
            subtotal: newSubtotal,
            stateGst: newStateGst,
            centralGst: newCentralGst,
            totalAmount: newTotalAmount,
          })
          .where(eq(orders.id, order.id));
        
        // Create supplementary KOT for cancelled item to notify kitchen
        const cancellationKotData = {
          orderId: order.orderNumber,
          orderType: 'INSTORE',
          customerName: order.customerName || 'Guest',
          tableNumber: order.tableNumber || '',
          isCancellation: true,
          cancelledItemName: item.productName,
          cancelledItemQuantity: item.quantity,
          cancellationReason: input.reason || 'Cancelled by staff',
          createdAt: new Date().toISOString(),
        };
        
        await dbInstance.insert(kotQueue).values({
          orderId: order.id.toString(),
          outletId: order.outletId || 1,
          orderNumber: order.orderNumber,
          kotData: cancellationKotData,
          isPrinted: false,
        });
        
        return { 
          success: true, 
          message: 'Item cancelled successfully',
          newTotalAmount,
        };
      }),

    // Get active order for a table (for customer add-to-order flow)
    getActiveOrderForTable: publicProcedure
      .input(z.object({ tableNumber: z.string() }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return null;
        
        // Find active (unpaid) order for this table
        const [activeOrder] = await dbInstance
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.tableNumber, input.tableNumber),
              eq(orders.orderType, 'instore'),
              eq(orders.paymentStatus, 'pending')
            )
          )
          .orderBy(desc(orders.createdAt))
          .limit(1);
        
        return activeOrder || null;
      }),

    // Cancel a pending order (used when payment fails or is abandoned)
    cancelOrder: publicProcedure
      .input(z.object({ 
        orderId: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Get order
        const [order] = await dbInstance.select().from(orders).where(eq(orders.id, input.orderId));
        if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        
        // Only cancel pending orders (not completed or already cancelled)
        if (order.orderStatus === 'completed' || order.orderStatus === 'cancelled') {
          return { success: false, message: 'Cannot cancel completed or already cancelled orders' };
        }
        
        // Update order status to cancelled
        await dbInstance
          .update(orders)
          .set({ 
            orderStatus: 'cancelled',
            staffNotes: input.reason ? `Auto-cancelled: ${input.reason}` : 'Auto-cancelled: Payment failed',
          })
          .where(eq(orders.id, input.orderId));
        
        return { success: true, message: 'Order cancelled' };
      }),

    getById: adminProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Get order
        const [order] = await dbInstance.select().from(orders).where(eq(orders.id, input.orderId));
        if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        
        // Get order items with product details
        const items = await dbInstance
          .select()
          .from(orderItemsTable)
          .where(eq(orderItemsTable.orderId, input.orderId));
        
        // Get product details for each item
        const itemsWithProducts = await Promise.all(
          items.map(async (item) => {
            const [product] = await dbInstance.select().from(products).where(eq(products.id, item.productId));
            return { ...item, product };
          })
        );
        
        return { ...order, items: itemsWithProducts };
      }),

    // Razorpay payment procedures
    createPaymentOrder: publicProcedure
      .input(z.object({
        orderId: z.number(),
        orderNumber: z.string(),
        amount: z.number(), // Amount in paise
      }))
      .mutation(async ({ input }) => {
        const { createRazorpayOrder, getRazorpayKeyId } = await import('./razorpay');
        
        const razorpayOrder = await createRazorpayOrder({
          amount: input.amount,
          currency: 'INR',
          receipt: input.orderNumber,
          notes: { orderid: input.orderNumber },
        });
        
        return {
          razorpayOrderId: razorpayOrder.id,
          razorpayKeyId: getRazorpayKeyId(),
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          description: `Order #${input.orderNumber}`,
        };
      }),

    verifyPayment: publicProcedure
      .input(z.object({
        orderId: z.number(),
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { verifyPaymentSignature, fetchPaymentDetails } = await import('./razorpay');
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Verify signature
        const isValid = verifyPaymentSignature(
          input.razorpayOrderId,
          input.razorpayPaymentId,
          input.razorpaySignature
        );
        
        if (!isValid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid payment signature' });
        }
        
        // Fetch actual payment amount from Razorpay API
        let actualPaymentAmount = 0;
        try {
          const paymentDetails = await fetchPaymentDetails(input.razorpayPaymentId);
          actualPaymentAmount = paymentDetails.amount; // Amount in paise
        } catch (error) {
          console.error('Failed to fetch Razorpay payment details:', error);
          // Continue with 0 if fetch fails - reconciliation report can still fetch later
        }
        
        // Update order payment status with actual amount from Razorpay
        await dbInstance!.insert(payments).values({
          orderId: input.orderId,
          paymentMethod: 'razorpay',
          paymentStatus: 'success',
          amount: actualPaymentAmount, // Actual amount collected from Razorpay
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
        });
        
        // Update order status to confirmed and record payment method
        await dbInstance!.update(orders)
          .set({ 
            orderStatus: 'confirmed', 
            paymentStatus: 'completed',
            paymentMethod: 'razorpay',
            razorpayOrderId: input.razorpayOrderId,
            razorpayPaymentId: input.razorpayPaymentId,
          })
          .where(eq(orders.id, input.orderId));
        
        // Create KOT for kitchen printing
        const [order] = await dbInstance!.select().from(orders).where(eq(orders.id, input.orderId));
        if (order) {
          // Get order items with details
          const items = await dbInstance!.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, input.orderId));
          // Get all item addons for this order's items
          const itemIds = items.map(i => i.id);
          const itemAddons = itemIds.length > 0 
            ? await dbInstance!.select().from(orderItemAddons).where(sql`${orderItemAddons.orderItemId} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`)
            : [];
          
          // Build KOT data
          const kotData = {
            orderId: order.orderNumber,
            orderType: order.orderType.toUpperCase(), // PICKUP, DELIVERY, INSTORE
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
          
          await dbInstance!.insert(kotQueue).values({
            orderId: order.id.toString(),
            outletId: order.outletId || 1, // Default to outlet 1 if not specified
            orderNumber: order.orderNumber,
            kotData: kotData, // JSON type, no need to stringify
            isPrinted: false,
          });
          
          // Queue receipt for printing
          const receiptData = {
            orderNumber: order.orderNumber,
            orderType: order.orderType.toUpperCase(),
            customerName: order.customerName || 'Guest',
            customerPhone: order.customerPhone || '',
            items: items.map(item => {
              const addons = itemAddons.filter(a => a.orderItemId === item.id);
              return {
                name: item.productName,
                quantity: item.quantity,
                price: item.unitPrice,
                addons: addons.map(a => ({ name: a.addonName, price: a.addonPrice })),
              };
            }),
            subtotal: order.subtotal,
            sgst: order.stateGst,
            cgst: order.centralGst,
            discount: order.discountAmount || 0,
            total: order.totalAmount,
            createdAt: new Date().toISOString(),
          };
          
          await dbInstance!.insert(receiptQueue).values({
            orderId: order.id,
            outletId: order.outletId || 1,
            orderNumber: order.orderNumber,
            receiptData: receiptData,
            isPrinted: false,
          });
          
          // Send notification to owner about new order
          try {
            const orderTypeLabel = order.orderType === 'delivery' ? 'Delivery' : order.orderType === 'pickup' ? 'Pickup' : 'In-Store';
            const itemsList = items.map(i => `${i.quantity}x ${i.productName}`).join(', ');
            await notifyOwner({
              title: `🆕 New ${orderTypeLabel} Order #${order.orderNumber}`,
              content: `Customer: ${order.customerName || 'Guest'}\nPhone: ${order.customerPhone || 'N/A'}\nAmount: ₹${(order.totalAmount / 100).toFixed(2)}\nItems: ${itemsList}\n\nOrder placed via website. Please check the admin panel for details.`
            });
          } catch (notifyError) {
            console.warn('[Order] Failed to send notification:', notifyError);
            // Don't fail the order if notification fails
          }
        }
        
        return { success: true, message: 'Payment verified successfully' };
      }),

    // Payment report for admin - shows payments by date and method
    getPaymentReport: adminProcedure
      .input(z.object({
        startDate: z.string(), // ISO date string
        endDate: z.string(),   // ISO date string
        outlet: z.enum(['all', 'palladium', 'tnagar']).optional(),
        paymentMethod: z.string().optional(), // 'all', 'cash', 'upi', 'card', 'swiggy_dineout', 'zomato_dineout', 'other'
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const startDate = new Date(input.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(input.endDate);
        endDate.setHours(23, 59, 59, 999);
        
        // Build query conditions
        const conditions = [
          sql`${orders.createdAt} >= ${startDate}`,
          sql`${orders.createdAt} <= ${endDate}`,
          eq(orders.orderStatus, 'completed'),
        ];
        
        // Add outlet filter - Palladium is outletId 1, T.Nagar is outletId 2
        if (input.outlet && input.outlet !== 'all') {
          const outletId = input.outlet === 'palladium' ? 1 : 2;
          conditions.push(eq(orders.outletId, outletId));
        }
        
        // Add payment method filter
        if (input.paymentMethod && input.paymentMethod !== 'all') {
          conditions.push(sql`${orders.paymentMethod} = ${input.paymentMethod}`);
        }
        
        // Get orders with payment info
        const completedOrders = await dbInstance
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            customerName: orders.customerName,
            totalAmount: orders.totalAmount,
            paymentMethod: orders.paymentMethod,
            paymentProofUrl: orders.paymentProofUrl,
            outletId: orders.outletId,
            createdAt: orders.createdAt,
            orderType: orders.orderType,
          })
          .from(orders)
          .where(and(...conditions))
          .orderBy(desc(orders.createdAt));
        
        // Get workshop bookings with paid status in date range
        const workshopConditions = [
          sql`${workshopBookings.createdAt} >= ${startDate}`,
          sql`${workshopBookings.createdAt} <= ${endDate}`,
          eq(workshopBookings.paymentStatus, 'paid'),
        ];
        
        // Add payment method filter for workshops if specified
        if (input.paymentMethod && input.paymentMethod !== 'all') {
          workshopConditions.push(sql`${workshopBookings.paymentMethod} = ${input.paymentMethod}`);
        }
        
        const paidWorkshopBookings = await dbInstance
          .select({
            id: workshopBookings.id,
            bookingNumber: workshopBookings.bookingNumber,
            customerName: workshopBookings.customerName,
            totalAmount: workshopBookings.totalAmount,
            paymentMethod: workshopBookings.paymentMethod,
            ticketCount: workshopBookings.ticketCount,
            createdAt: workshopBookings.createdAt,
          })
          .from(workshopBookings)
          .where(and(...workshopConditions))
          .orderBy(desc(workshopBookings.createdAt));
        
        // Calculate summary by payment method
        const summary: Record<string, { count: number; total: number }> = {};
        let grandTotal = 0;
        let collectedRevenue = 0; // Actual money collected (excludes gifts)
        let promotionalValue = 0; // Value of complimentary/birthday gift orders
        let totalOrders = 0;
        
        // Add orders to summary
        for (const order of completedOrders) {
          const method = order.paymentMethod || 'unknown';
          if (!summary[method]) {
            summary[method] = { count: 0, total: 0 };
          }
          summary[method].count++;
          summary[method].total += order.totalAmount;
          grandTotal += order.totalAmount;
          
          // Track collected vs promotional separately
          if (method === 'birthday_gift' || method === 'complimentary') {
            promotionalValue += order.totalAmount;
          } else {
            collectedRevenue += order.totalAmount;
          }
          totalOrders++;
        }
        
        // Add workshop bookings to summary
        let workshopTotal = 0;
        let workshopCount = 0;
        for (const booking of paidWorkshopBookings) {
          const method = booking.paymentMethod || 'unknown';
          if (!summary[method]) {
            summary[method] = { count: 0, total: 0 };
          }
          summary[method].count++;
          summary[method].total += booking.totalAmount;
          grandTotal += booking.totalAmount;
          workshopTotal += booking.totalAmount;
          workshopCount++;
        }
        
        return {
          orders: completedOrders,
          workshopBookings: paidWorkshopBookings.map(b => ({
            id: b.id,
            orderNumber: b.bookingNumber,
            customerName: b.customerName,
            totalAmount: b.totalAmount,
            paymentMethod: b.paymentMethod,
            paymentProofUrl: null,
            outletId: 2, // Workshops are at T.Nagar
            createdAt: b.createdAt,
            orderType: 'workshop' as const,
            ticketCount: b.ticketCount,
          })),
          summary,
          grandTotal,
          collectedRevenue: collectedRevenue + workshopTotal, // Actual money collected
          promotionalValue, // Value of birthday gifts and complimentary orders
          totalOrders: totalOrders + workshopCount,
          workshopStats: {
            count: workshopCount,
            total: workshopTotal,
          },
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        };
      }),
  }),

  // Discount routes
  discounts: router({
    validate: protectedProcedure
      .input(z.object({ code: z.string(), subtotal: z.number(), orderType: z.enum(['delivery', 'pickup', 'dine_in']).optional() }))
      .query(async ({ ctx, input }) => {
        const discount = await db.getDiscountByCode(input.code);
        if (!discount) return { valid: false, message: 'Invalid discount code' };
        if (!discount.isActive) return { valid: false, message: 'Discount code is no longer active' };
        if (discount.minOrderAmount && input.subtotal < discount.minOrderAmount) {
          return { valid: false, message: `Minimum order amount is ₹${discount.minOrderAmount / 100}` };
        }
        if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
          return { valid: false, message: 'Discount code usage limit reached' };
        }
        
        // Check order type restriction
        if (discount.orderTypeRestriction && discount.orderTypeRestriction !== 'all') {
          if (!input.orderType) {
            return { valid: false, message: 'This discount code is only valid for delivery orders' };
          }
          if (discount.orderTypeRestriction !== input.orderType) {
            const typeLabel = discount.orderTypeRestriction === 'delivery' ? 'delivery' : discount.orderTypeRestriction === 'pickup' ? 'pickup' : 'dine-in';
            return { valid: false, message: `This discount code is only valid for ${typeLabel} orders` };
          }
        }
        
        // Check first-time only restriction
        if (discount.firstTimeOnly) {
          // Check if user has used this discount before
          const hasUsed = await db.hasUserUsedDiscount(ctx.user.id, discount.id);
          if (hasUsed) {
            return { valid: false, message: 'This discount code can only be used once per customer' };
          }
          // Check if user has any previous orders (must be first-time customer)
          const orderCount = await db.getUserOrderCount(ctx.user.id);
          if (orderCount > 0) {
            return { valid: false, message: 'This discount code is only for first-time customers' };
          }
        }
        
        let discountAmount = 0;
        if (discount.type === 'percentage') {
          discountAmount = Math.round(input.subtotal * discount.value / 100);
          if (discount.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
          }
        } else {
          discountAmount = discount.value;
        }

        return { valid: true, discount, discountAmount };
      }),
  }),

  // Profile routes
  profile: router({
    // Get full user profile
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      const birthday = await db.getUserBirthday(ctx.user.id);
      const loyaltyInfo = await db.getUserLoyaltyInfo(ctx.user.id);
      return {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        phone: user?.phone,
        birthMonth: birthday?.birthMonth,
        birthDay: birthday?.birthDay,
        loyaltyStamps: loyaltyInfo?.currentStamps || 0,
        totalStampsEarned: loyaltyInfo?.totalStampsEarned || 0,
        freeRewardsEarned: loyaltyInfo?.freeRewardsEarned || 0
      };
    }),

    // Update user profile (name, phone)
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).optional(),
        phone: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    getBirthday: protectedProcedure.query(async ({ ctx }) => {
      const birthday = await db.getUserBirthday(ctx.user.id);
      return {
        hasBirthday: !!(birthday?.birthMonth && birthday?.birthDay),
        birthMonth: birthday?.birthMonth,
        birthDay: birthday?.birthDay,
        birthdayCodeUsedYear: birthday?.birthdayCodeUsedYear
      };
    }),

    updateBirthday: protectedProcedure
      .input(z.object({
        birthMonth: z.number().min(1).max(12),
        birthDay: z.number().min(1).max(31)
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if birthday is already set - prevent changes
        const existingBirthday = await db.getUserBirthday(ctx.user.id);
        if (existingBirthday?.birthMonth && existingBirthday?.birthDay) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Birthday cannot be changed once set. Please contact support if you need to update it.' 
          });
        }
        await db.updateUserBirthday(ctx.user.id, input.birthMonth, input.birthDay);
        return { success: true };
      }),
  }),

  // Address routes
  addresses: router({
    getUserAddresses: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserAddresses(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        addressLine1: z.string(),
        addressLine2: z.string().optional(),
        area: z.string(),
        pincode: z.string(),
        landmark: z.string().optional(),
        isDefault: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createAddress({
          userId: ctx.user.id,
          ...input,
        });
        return { id };
      }),

    getDeliveryAreas: publicProcedure.query(async () => {
      return db.getDeliveryAreas();
    }),
  }),

  // Store locations
  stores: router({
    getAll: publicProcedure.query(async () => {
      return db.getStoreLocations();
    }),
  }),

  // Admin routes
  admin: router({
    // Seed database
    seed: adminProcedure.mutation(async () => {
      await seedDatabase();
      return { success: true };
    }),

    // SAFE delete test data only - NEVER deletes production data
    safeDeleteTestData: adminProcedure
      .input(z.object({
        confirmationCode: z.string(), // Must be "DELETE_TEST_DATA"
      }))
      .mutation(async ({ input }) => {
        if (input.confirmationCode !== "DELETE_TEST_DATA") {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Invalid confirmation code. Must type DELETE_TEST_DATA to proceed.' 
          });
        }
        
        const { safeDeleteTestData, hasProductionData } = await import('./safeDelete');
        
        // Check what data exists
        const dataCheck = await hasProductionData();
        
        if (dataCheck.testCount === 0) {
          return {
            success: false,
            message: 'No test data found to delete.',
            productionCount: dataCheck.productionCount,
            testCount: 0,
            deletedOrders: 0,
            deletedOrderItems: 0,
          };
        }
        
        // Perform safe deletion
        const result = await safeDeleteTestData();
        
        return {
          success: result.success,
          message: result.error || `Deleted ${result.deletedOrders} test orders`,
          productionCount: dataCheck.productionCount,
          testCount: dataCheck.testCount,
          deletedOrders: result.deletedOrders,
          deletedOrderItems: result.deletedOrderItems,
          backupUrl: result.backupUrl,
        };
      }),

    // Mark specific orders as test data
    markOrdersAsTestData: adminProcedure
      .input(z.object({
        orderIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        const { markOrdersAsTestData } = await import('./safeDelete');
        const result = await markOrdersAsTestData(input.orderIds);
        return result;
      }),

    // Check production vs test data counts
    checkDataStatus: adminProcedure
      .query(async () => {
        const { hasProductionData } = await import('./safeDelete');
        return await hasProductionData();
      }),

    // Category management
    createCategory: adminProcedure
      .input(z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        displayOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const [result] = await dbInstance!.insert(categories).values(input);
        return { id: result.insertId };
      }),

    updateCategory: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        imageBase64: z.string().optional(), // For uploading new image
        displayOrder: z.number().optional(),
        isActive: z.boolean().optional(),
        availableInstore: z.boolean().optional(),
        availableDelivery: z.boolean().optional(),
        availablePickup: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { id, imageBase64, ...data } = input;
        
        // Handle image upload if base64 provided - uses hybrid storage (S3 backup + Cloudinary delivery)
        if (imageBase64 && imageBase64.length > 0) {
          try {
            const { hybridUpload } = await import('./hybridStorage');
            const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            // Detect image type from base64 header
            const mimeMatch = imageBase64.match(/^data:([^;]+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
            const fileName = `${id}-${Date.now()}.${ext}`;
            console.log('[updateCategory] Uploading image:', fileName, 'size:', buffer.length);
            const result = await hybridUpload(buffer, {
              folder: 'categories',
              fileName,
              mimeType,
              tags: ['category', `category-${id}`],
            });
            console.log('[updateCategory] Image uploaded - Delivery:', result.deliveryUrl, 'Backup:', result.backupUrl);
            (data as any).imageUrl = result.deliveryUrl;
          } catch (err) {
            console.error('[updateCategory] Image upload failed:', err);
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to upload image' });
          }
        }
        
        // Only update if there's data to update
        if (Object.keys(data).length > 0) {
          await dbInstance!.update(categories).set(data).where(eq(categories.id, id));
        }
        return { success: true };
      }),

    deleteCategory: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const subs = await dbInstance!.select().from(subcategories).where(eq(subcategories.categoryId, input.id));
        if (subs.length > 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete category with subcategories. Delete subcategories first.' });
        }
        await dbInstance!.delete(categories).where(eq(categories.id, input.id));
        return { success: true };
      }),

    // Subcategory management
    createSubcategory: adminProcedure
      .input(z.object({
        name: z.string(),
        chineseName: z.string().nullable().optional(),
        slug: z.string(),
        categoryId: z.number(),
        displayOrder: z.number().optional(),
        hasSizeVariants: z.boolean().optional(),
        hasBobaOption: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const [result] = await dbInstance!.insert(subcategories).values(input);
        return { id: result.insertId };
      }),

    updateSubcategory: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        chineseName: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        slug: z.string().optional(),
        categoryId: z.number().optional(),
        displayOrder: z.number().optional(),
        hasSizeVariants: z.boolean().optional(),
        hasBobaOption: z.boolean().optional(),
        imageUrl: z.string().optional(),
        imageBase64: z.string().optional(), // For uploading new image (legacy)
        imageData: z.string().nullable().optional(), // For uploading new image (base64 data URL)
        basePricePetiteWithBoba: z.number().optional(),
        basePricePetiteNoBoba: z.number().optional(),
        basePriceRegularWithBoba: z.number().optional(),
        basePriceRegularNoBoba: z.number().optional(),
        basePriceLargeWithBoba: z.number().optional(),
        basePriceLargeNoBoba: z.number().optional(),
        deliveryPriceRegularWithBoba: z.number().optional(),
        deliveryPriceRegularNoBoba: z.number().optional(),
        deliveryPriceLargeWithBoba: z.number().optional(),
        deliveryPriceLargeNoBoba: z.number().optional(),
        syncProductPrices: z.boolean().optional(), // If true, update all products with useBasePrice=true
        availableInstore: z.boolean().optional(),
        availableDelivery: z.boolean().optional(),
        availablePickup: z.boolean().optional(),
        availableAtPalladium: z.boolean().optional(),
        availableAtTnagar: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { id, imageBase64, imageData, syncProductPrices, availableInstore, availableDelivery, availablePickup, availableAtPalladium, availableAtTnagar, ...data } = input;
        
        console.log('[updateSubcategory] Input received:', { id, hasImageData: !!imageData, hasImageBase64: !!imageBase64, imageDataLength: imageData?.length });
        
        // Handle image upload if base64 provided (support both imageBase64 and imageData)
        // Uses hybrid storage: S3 (backup) + Cloudinary (optimized delivery)
        const base64ToUpload = imageData || imageBase64;
        if (base64ToUpload) {
          console.log('[updateSubcategory] Uploading image, base64 length:', base64ToUpload.length);
          const { hybridUpload } = await import('./hybridStorage');
          const base64Data = base64ToUpload.replace(/^data:[^;]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          // Detect mime type from base64 header
          const mimeMatch = base64ToUpload.match(/^data:([^;]+);base64,/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
          const fileName = `${id}-${Date.now()}.${ext}`;
          const result = await hybridUpload(buffer, {
            folder: 'subcategories',
            fileName,
            mimeType,
            tags: ['subcategory', `subcategory-${id}`],
          });
          console.log('[updateSubcategory] Image uploaded - Delivery:', result.deliveryUrl, 'Backup:', result.backupUrl);
          (data as any).imageUrl = result.deliveryUrl;
        }
        
        // Add availability fields to data if provided
        if (availableInstore !== undefined) (data as any).availableInstore = availableInstore;
        if (availableDelivery !== undefined) (data as any).availableDelivery = availableDelivery;
        if (availablePickup !== undefined) (data as any).availablePickup = availablePickup;
        if (availableAtPalladium !== undefined) (data as any).availableAtPalladium = availableAtPalladium;
        if (availableAtTnagar !== undefined) (data as any).availableAtTnagar = availableAtTnagar;
        
        console.log('[updateSubcategory] Data to update:', { ...data, imageUrl: (data as any).imageUrl });
        await dbInstance!.update(subcategories).set(data).where(eq(subcategories.id, id));
        console.log('[updateSubcategory] Database updated successfully');
        
        // Sync prices to products if requested
        let syncedCount = 0;
        if (syncProductPrices) {
          // Get updated subcategory data
          const [updatedSubcat] = await dbInstance!.select().from(subcategories).where(eq(subcategories.id, id));
          if (updatedSubcat) {
            // Find all products in this subcategory with useBasePrice=true
            const productsToSync = await dbInstance!.select().from(products)
              .where(and(eq(products.subcategoryId, id), eq(products.useBasePrice, true)));
            
            // Update each product's prices based on subcategory base prices
            for (const product of productsToSync) {
              await dbInstance!.update(products).set({
                instorePrice: updatedSubcat.basePriceRegularWithBoba || updatedSubcat.basePriceRegularNoBoba || product.instorePrice,
                deliveryPrice: updatedSubcat.deliveryPriceRegularWithBoba || updatedSubcat.deliveryPriceRegularNoBoba || product.deliveryPrice,
              }).where(eq(products.id, product.id));
              syncedCount++;
            }
          }
        }
        
        return { success: true, syncedCount };
      }),

    // Preview price sync - shows how many products would be affected
    previewPriceSync: adminProcedure
      .input(z.object({ subcategoryId: z.number() }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { count: 0, products: [] };
        
        const productsToSync = await dbInstance!.select().from(products)
          .where(and(eq(products.subcategoryId, input.subcategoryId), eq(products.useBasePrice, true)));
        
        return {
          count: productsToSync.length,
          products: productsToSync.map(p => ({ id: p.id, name: p.name })),
        };
      }),

    // Staff can toggle subcategory availability (delivery/pickup/instore)
    toggleSubcategoryAvailability: staffProcedure
      .input(z.object({
        id: z.number(),
        availableInstore: z.boolean().optional(),
        availableDelivery: z.boolean().optional(),
        availablePickup: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { id, availableInstore, availableDelivery, availablePickup } = input;
        
        const updateData: Record<string, boolean> = {};
        if (availableInstore !== undefined) updateData.availableInstore = availableInstore;
        if (availableDelivery !== undefined) updateData.availableDelivery = availableDelivery;
        if (availablePickup !== undefined) updateData.availablePickup = availablePickup;
        
        if (Object.keys(updateData).length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No availability fields provided' });
        }
        
        await dbInstance!.update(subcategories).set(updateData).where(eq(subcategories.id, id));
        
        // Log the change
        console.log(`[Staff] ${ctx.user.name} (${ctx.user.id}) toggled availability for subcategory ${id}:`, updateData);
        
        return { success: true };
      }),

    toggleProductAvailability: staffProcedure
      .input(z.object({
        id: z.number(),
        isAvailable: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { id, isAvailable } = input;
        
        await dbInstance!.update(products).set({ isAvailable }).where(eq(products.id, id));
        
        // Log the change
        console.log(`[Staff] ${ctx.user.name} (${ctx.user.id}) toggled product ${id} availability to ${isAvailable}`);
        
        return { success: true };
      }),

    deleteSubcategory: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const prods = await dbInstance!.select().from(products).where(eq(products.subcategoryId, input.id));
        if (prods.length > 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete subcategory with products. Move or delete products first.' });
        }
        await dbInstance!.delete(subcategories).where(eq(subcategories.id, input.id));
        return { success: true };
      }),

    // Get all products including inactive ones - for staff availability management
    getAllProducts: staffProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const allProducts = await dbInstance.select().from(products).orderBy(asc(products.displayOrder));
      return allProducts;
    }),

    // Product management
    createProduct: adminProcedure
      .input(z.object({
        subcategoryId: z.number(),
        name: z.string(),
        chineseName: z.string().optional(),
        slug: z.string(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        instorePrice: z.number().optional(),
        deliveryPrice: z.number().optional(),
        deliveryUnitMultiplier: z.number().default(1),
        isVegetarian: z.boolean().default(true),
        isVegan: z.boolean().default(false),
        containsEgg: z.boolean().default(false),
        availableInstore: z.boolean().default(true),
        availableDelivery: z.boolean().default(true),
        displayOrder: z.number().default(0),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const [result] = await dbInstance!.insert(products).values(input);
        const [product] = await dbInstance!.select().from(products).where(eq(products.id, result.insertId));
        
        // Create audit log for product creation
        await dbInstance!.insert(productAuditLog).values({
          productId: product.id,
          productName: product.name,
          userId: ctx.user?.id || null,
          userName: ctx.user?.name || 'Unknown',
          action: 'create',
          fieldChanged: null,
          oldValue: null,
          newValue: JSON.stringify(product),
        });
        
        return product;
      }),

    updateProduct: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        chineseName: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        imageUrl: z.string().nullable().optional(),
        imageUrl2: z.string().nullable().optional(),
        imageUrl3: z.string().nullable().optional(),
        instorePrice: z.number().optional(),
        deliveryPrice: z.number().optional(),
        isInStock: z.boolean().optional(),
        availableInstore: z.boolean().optional(),
        availableDelivery: z.boolean().optional(),
        availableAtPalladium: z.boolean().optional(),
        displayOrder: z.number().optional(),
        isActive: z.boolean().optional(),
        subcategoryId: z.number().optional(),
        isVegetarian: z.boolean().optional(),
        isVegan: z.boolean().optional(),
        containsEgg: z.boolean().optional(),
        useBasePrice: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { id, ...data } = input;
        
        // Get current product state for audit log
        const [currentProduct] = await dbInstance!.select().from(products).where(eq(products.id, id));
        if (!currentProduct) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
        
        // Determine action type based on changes
        let action: 'update' | 'stock_in' | 'stock_out' | 'deactivate' | 'reactivate' | 'price_change' = 'update';
        if (data.isInStock !== undefined && data.isInStock !== currentProduct.isInStock) {
          action = data.isInStock ? 'stock_in' : 'stock_out';
        } else if (data.isActive !== undefined && data.isActive !== currentProduct.isActive) {
          action = data.isActive ? 'reactivate' : 'deactivate';
        } else if (data.instorePrice !== undefined || data.deliveryPrice !== undefined) {
          action = 'price_change';
        }
        
        // Create audit log entries for each changed field
        const changedFields = Object.keys(data).filter(key => {
          const k = key as keyof typeof data;
          return data[k] !== undefined && data[k] !== (currentProduct as any)[k];
        });
        
        for (const field of changedFields) {
          await dbInstance!.insert(productAuditLog).values({
            productId: id,
            productName: currentProduct.name,
            userId: ctx.user?.id || null,
            userName: ctx.user?.name || 'Unknown',
            action,
            fieldChanged: field,
            oldValue: JSON.stringify((currentProduct as any)[field]),
            newValue: JSON.stringify((data as any)[field]),
          });
        }
        
        // Update the product
        await dbInstance!.update(products).set(data).where(eq(products.id, id));
        return { success: true };
      }),

    uploadProductImage: adminProcedure
      .input(z.object({
        productId: z.number(),
        imageBase64: z.string(),
        mimeType: z.string(),
        fileName: z.string(),
        imageIndex: z.number().optional(), // 0 = main, 1 = second, 2 = third
      }))
      .mutation(async ({ input }) => {
        const { hybridUpload } = await import('./hybridStorage');
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Convert base64 to buffer
        const base64Data = input.imageBase64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique file name
        const ext = input.fileName.split('.').pop() || 'jpg';
        const imageIndex = input.imageIndex ?? 0;
        const fileName = `${input.productId}-img${imageIndex + 1}-${Date.now()}.${ext}`;
        
        // Upload to both S3 (backup) and Cloudinary (delivery)
        const result = await hybridUpload(buffer, {
          folder: 'products',
          fileName,
          mimeType: input.mimeType,
          tags: ['product', `product-${input.productId}`],
        });
        
        // Use Cloudinary URL for delivery (optimized), S3 URL is backup
        const url = result.deliveryUrl;
        console.log(`[uploadProductImage] Uploaded - Delivery: ${url}, Backup: ${result.backupUrl}`);
        
        // Update product with new image URL based on index
        const updateData: Record<string, string> = {};
        if (imageIndex === 0) {
          updateData.imageUrl = url;
        } else if (imageIndex === 1) {
          updateData.imageUrl2 = url;
        } else if (imageIndex === 2) {
          updateData.imageUrl3 = url;
        }
        
        await dbInstance!.update(products).set(updateData).where(eq(products.id, input.productId));
        
        return { success: true, imageUrl: url, backupUrl: result.backupUrl };
      }),

    deleteProduct: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Get product for audit log
        const [product] = await dbInstance!.select().from(products).where(eq(products.id, input.id));
        if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
        
        // Create audit log for deactivation (soft delete)
        await dbInstance!.insert(productAuditLog).values({
          productId: input.id,
          productName: product.name,
          userId: ctx.user?.id || null,
          userName: ctx.user?.name || 'Unknown',
          action: 'deactivate',
          fieldChanged: 'isActive',
          oldValue: 'true',
          newValue: 'false',
        });
        
        await dbInstance!.update(products).set({ isActive: false }).where(eq(products.id, input.id));
        return { success: true };
      }),

    // Check if product can be permanently deleted (no order history)
    canDeleteProduct: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Check if product has any order history
        const orderItems = await dbInstance!.select({ count: sql<number>`COUNT(*)` })
          .from(orderItemsTable)
          .where(eq(orderItemsTable.productId, input.id));
        
        const hasOrderHistory = (orderItems[0]?.count || 0) > 0;
        return { canDelete: !hasOrderHistory, orderCount: orderItems[0]?.count || 0 };
      }),

    // Permanently delete a product (only if no order history)
    permanentlyDeleteProduct: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Get product
        const [product] = await dbInstance!.select().from(products).where(eq(products.id, input.id));
        if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
        
        // Check if product has any order history
        const orderItems = await dbInstance!.select({ count: sql<number>`COUNT(*)` })
          .from(orderItemsTable)
          .where(eq(orderItemsTable.productId, input.id));
        
        if ((orderItems[0]?.count || 0) > 0) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Cannot permanently delete product with order history. Use disable instead.' 
          });
        }
        
        // Delete audit logs for this product first
        await dbInstance!.delete(productAuditLog).where(eq(productAuditLog.productId, input.id));
        
        // Permanently delete the product
        await dbInstance!.delete(products).where(eq(products.id, input.id));
        
        console.log(`[permanentlyDeleteProduct] Product ${input.id} (${product.name}) permanently deleted by ${ctx.user?.name}`);
        return { success: true };
      }),

    // Reactivate a deactivated product
    reactivateProduct: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Get product for audit log
        const [product] = await dbInstance!.select().from(products).where(eq(products.id, input.id));
        if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
        
        // Create audit log for reactivation
        await dbInstance!.insert(productAuditLog).values({
          productId: input.id,
          productName: product.name,
          userId: ctx.user?.id || null,
          userName: ctx.user?.name || 'Unknown',
          action: 'reactivate',
          fieldChanged: 'isActive',
          oldValue: 'false',
          newValue: 'true',
        });
        
        await dbInstance!.update(products).set({ isActive: true }).where(eq(products.id, input.id));
        return { success: true };
      }),

    // Bulk price update with preview
    bulkPricePreview: adminProcedure
      .input(z.object({
        scope: z.enum(['all', 'category', 'subcategory']),
        categoryId: z.number().optional(),
        subcategoryId: z.number().optional(),
        priceType: z.enum(['instore', 'delivery', 'both']),
        updateMethod: z.enum(['percentage_increase', 'percentage_decrease', 'fixed_increase', 'fixed_decrease']),
        value: z.number(), // percentage (e.g., 10 for 10%) or fixed amount in paise
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Round to nearest 5 rupees (500 paise)
        const roundToNearest5 = (paise: number) => Math.round(paise / 500) * 500;
        
        const calculateNewPrice = (currentPrice: number | null) => {
          if (!currentPrice || currentPrice === 0) return null;
          let newPrice = currentPrice;
          switch (input.updateMethod) {
            case 'percentage_increase':
              newPrice = currentPrice * (1 + input.value / 100);
              break;
            case 'percentage_decrease':
              newPrice = currentPrice * (1 - input.value / 100);
              break;
            case 'fixed_increase':
              newPrice = currentPrice + input.value;
              break;
            case 'fixed_decrease':
              newPrice = currentPrice - input.value;
              break;
          }
          return roundToNearest5(Math.max(0, newPrice));
        };
        
        // Get subcategories based on scope
        let allSubcategories;
        if (input.scope === 'category' && input.categoryId) {
          allSubcategories = await dbInstance.select().from(subcategories).where(eq(subcategories.categoryId, input.categoryId));
        } else if (input.scope === 'subcategory' && input.subcategoryId) {
          allSubcategories = await dbInstance.select().from(subcategories).where(eq(subcategories.id, input.subcategoryId));
        } else {
          allSubcategories = await dbInstance.select().from(subcategories);
        }
        
        // Preview subcategory price changes (for bubble teas with base pricing)
        const subcategoryPreviews = allSubcategories.map(s => {
          const preview: {
            id: number;
            name: string;
            type: 'subcategory';
            oldInstorePrice: number | null;
            newInstorePrice: number | null;
            oldDeliveryPrice: number | null;
            newDeliveryPrice: number | null;
          } = {
            id: s.id,
            name: `[Subcategory] ${s.name}`,
            type: 'subcategory',
            oldInstorePrice: s.basePriceRegularWithBoba,
            newInstorePrice: s.basePriceRegularWithBoba,
            oldDeliveryPrice: s.deliveryPriceRegularWithBoba,
            newDeliveryPrice: s.deliveryPriceRegularWithBoba,
          };
          
          if (input.priceType === 'instore' || input.priceType === 'both') {
            preview.newInstorePrice = calculateNewPrice(s.basePriceRegularWithBoba);
          }
          if (input.priceType === 'delivery' || input.priceType === 'both') {
            preview.newDeliveryPrice = calculateNewPrice(s.deliveryPriceRegularWithBoba);
          }
          
          return preview;
        }).filter(p => p.oldInstorePrice || p.oldDeliveryPrice);
        
        // Get products with individual prices
        let productsQuery = dbInstance.select().from(products).where(
          and(
            eq(products.isActive, true),
            sql`((${products.instorePrice} IS NOT NULL AND ${products.instorePrice} > 0) OR (${products.deliveryPrice} IS NOT NULL AND ${products.deliveryPrice} > 0))`
          )
        );
        
        if (input.scope === 'category' && input.categoryId) {
          const subs = await dbInstance.select({ id: subcategories.id }).from(subcategories).where(eq(subcategories.categoryId, input.categoryId));
          const subIds = subs.map(s => s.id);
          if (subIds.length > 0) {
            productsQuery = dbInstance.select().from(products).where(
              and(
                eq(products.isActive, true),
                sql`${products.subcategoryId} IN (${sql.join(subIds.map(id => sql`${id}`), sql`, `)})`,
                sql`((${products.instorePrice} IS NOT NULL AND ${products.instorePrice} > 0) OR (${products.deliveryPrice} IS NOT NULL AND ${products.deliveryPrice} > 0))`
              )
            );
          }
        } else if (input.scope === 'subcategory' && input.subcategoryId) {
          productsQuery = dbInstance.select().from(products).where(
            and(
              eq(products.isActive, true),
              eq(products.subcategoryId, input.subcategoryId),
              sql`((${products.instorePrice} IS NOT NULL AND ${products.instorePrice} > 0) OR (${products.deliveryPrice} IS NOT NULL AND ${products.deliveryPrice} > 0))`
            )
          );
        }
        
        const allProducts = await productsQuery;
        
        // Preview product price changes
        const productPreviews = allProducts.map(p => {
          let newInstorePrice = p.instorePrice;
          let newDeliveryPrice = p.deliveryPrice;
          
          if (input.priceType === 'instore' || input.priceType === 'both') {
            newInstorePrice = calculateNewPrice(p.instorePrice);
          }
          if (input.priceType === 'delivery' || input.priceType === 'both') {
            newDeliveryPrice = calculateNewPrice(p.deliveryPrice);
          }
          
          return {
            id: p.id,
            name: p.name,
            type: 'product' as const,
            oldInstorePrice: p.instorePrice,
            newInstorePrice,
            oldDeliveryPrice: p.deliveryPrice,
            newDeliveryPrice,
          };
        });
        
        const allPreviews = [...subcategoryPreviews, ...productPreviews];
        
        return { 
          products: allPreviews, 
          totalCount: allPreviews.length,
          subcategoryCount: subcategoryPreviews.length,
          productCount: productPreviews.length,
        };
      }),

    // Apply bulk price update
    bulkPriceUpdate: adminProcedure
      .input(z.object({
        updates: z.array(z.object({
          id: z.number(),
          type: z.enum(['product', 'subcategory']),
          instorePrice: z.number().nullable().optional(),
          deliveryPrice: z.number().nullable().optional(),
        })),
        priceType: z.enum(['instore', 'delivery', 'both']),
        updateMethod: z.enum(['percentage_increase', 'percentage_decrease', 'fixed_increase', 'fixed_decrease']),
        value: z.number(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const roundToNearest5 = (paise: number) => Math.round(paise / 500) * 500;
        
        const calculateNewPrice = (currentPrice: number | null) => {
          if (!currentPrice || currentPrice === 0) return currentPrice;
          let newPrice = currentPrice;
          switch (input.updateMethod) {
            case 'percentage_increase':
              newPrice = currentPrice * (1 + input.value / 100);
              break;
            case 'percentage_decrease':
              newPrice = currentPrice * (1 - input.value / 100);
              break;
            case 'fixed_increase':
              newPrice = currentPrice + input.value;
              break;
            case 'fixed_decrease':
              newPrice = currentPrice - input.value;
              break;
          }
          return roundToNearest5(Math.max(0, newPrice));
        };
        
        let productCount = 0;
        let subcategoryCount = 0;
        
        for (const update of input.updates) {
          if (update.type === 'product') {
            const data: Record<string, number | null> = {};
            if (update.instorePrice !== undefined) data.instorePrice = update.instorePrice;
            if (update.deliveryPrice !== undefined) data.deliveryPrice = update.deliveryPrice;
            
            if (Object.keys(data).length > 0) {
              await dbInstance.update(products).set(data).where(eq(products.id, update.id));
              productCount++;
            }
          } else if (update.type === 'subcategory') {
            // Get current subcategory prices
            const [sub] = await dbInstance.select().from(subcategories).where(eq(subcategories.id, update.id));
            if (!sub) continue;
            
            const data: Record<string, number | null> = {};
            
            // Update all size variants for instore
            if (input.priceType === 'instore' || input.priceType === 'both') {
              if (sub.basePricePetiteWithBoba) data.basePricePetiteWithBoba = calculateNewPrice(sub.basePricePetiteWithBoba);
              if (sub.basePricePetiteNoBoba) data.basePricePetiteNoBoba = calculateNewPrice(sub.basePricePetiteNoBoba);
              if (sub.basePriceRegularWithBoba) data.basePriceRegularWithBoba = calculateNewPrice(sub.basePriceRegularWithBoba);
              if (sub.basePriceRegularNoBoba) data.basePriceRegularNoBoba = calculateNewPrice(sub.basePriceRegularNoBoba);
              if (sub.basePriceLargeWithBoba) data.basePriceLargeWithBoba = calculateNewPrice(sub.basePriceLargeWithBoba);
              if (sub.basePriceLargeNoBoba) data.basePriceLargeNoBoba = calculateNewPrice(sub.basePriceLargeNoBoba);
            }
            
            // Update all size variants for delivery
            if (input.priceType === 'delivery' || input.priceType === 'both') {
              if (sub.deliveryPriceRegularWithBoba) data.deliveryPriceRegularWithBoba = calculateNewPrice(sub.deliveryPriceRegularWithBoba);
              if (sub.deliveryPriceRegularNoBoba) data.deliveryPriceRegularNoBoba = calculateNewPrice(sub.deliveryPriceRegularNoBoba);
              if (sub.deliveryPriceLargeWithBoba) data.deliveryPriceLargeWithBoba = calculateNewPrice(sub.deliveryPriceLargeWithBoba);
              if (sub.deliveryPriceLargeNoBoba) data.deliveryPriceLargeNoBoba = calculateNewPrice(sub.deliveryPriceLargeNoBoba);
            }
            
            if (Object.keys(data).length > 0) {
              await dbInstance.update(subcategories).set(data).where(eq(subcategories.id, update.id));
              subcategoryCount++;
            }
          }
        }
        
        return { success: true, updatedCount: productCount + subcategoryCount, productCount, subcategoryCount };
      }),

    // Update category display order (for reordering)
    updateCategoryOrder: adminProcedure
      .input(z.object({
        categoryOrders: z.array(z.object({
          id: z.number(),
          displayOrder: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        for (const item of input.categoryOrders) {
          await dbInstance.update(categories).set({ displayOrder: item.displayOrder }).where(eq(categories.id, item.id));
        }
        
        return { success: true, updatedCount: input.categoryOrders.length };
      }),

    // Update subcategory display order (for reordering)
    updateSubcategoryOrder: adminProcedure
      .input(z.object({
        subcategoryOrders: z.array(z.object({
          id: z.number(),
          displayOrder: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        for (const item of input.subcategoryOrders) {
          await dbInstance.update(subcategories).set({ displayOrder: item.displayOrder }).where(eq(subcategories.id, item.id));
        }
        
        return { success: true, updatedCount: input.subcategoryOrders.length };
      }),

    // Update product display order (for drag-and-drop)
    updateProductOrder: adminProcedure
      .input(z.object({
        productOrders: z.array(z.object({
          id: z.number(),
          displayOrder: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        for (const item of input.productOrders) {
          await dbInstance.update(products).set({ displayOrder: item.displayOrder }).where(eq(products.id, item.id));
        }
        
        return { success: true, updatedCount: input.productOrders.length };
      }),

    // Bulk update product images
    bulkUpdateImages: adminProcedure
      .input(z.array(z.object({
        productId: z.number(),
        imageUrl: z.string(),
      })))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        for (const item of input) {
          await dbInstance!.update(products).set({ imageUrl: item.imageUrl }).where(eq(products.id, item.productId));
        }
        return { success: true, count: input.length };
      }),

    // Subcategory pricing update
    updateSubcategoryPricing: adminProcedure
      .input(z.object({
        id: z.number(),
        basePricePetiteWithBoba: z.number().optional(),
        basePricePetiteNoBoba: z.number().optional(),
        basePriceRegularWithBoba: z.number().optional(),
        basePriceRegularNoBoba: z.number().optional(),
        basePriceLargeWithBoba: z.number().optional(),
        basePriceLargeNoBoba: z.number().optional(),
        deliveryPriceRegularWithBoba: z.number().optional(),
        deliveryPriceRegularNoBoba: z.number().optional(),
        deliveryPriceLargeWithBoba: z.number().optional(),
        deliveryPriceLargeNoBoba: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { id, ...data } = input;
        await dbInstance!.update(subcategories).set(data).where(eq(subcategories.id, id));
        return { success: true };
      }),

    // Discount management
    createDiscount: adminProcedure
      .input(z.object({
        code: z.string(),
        description: z.string().optional(),
        type: z.enum(['percentage', 'fixed_amount']),
        value: z.number(),
        minOrderAmount: z.number().default(0),
        maxDiscountAmount: z.number().optional(),
        validFrom: z.string().optional(),
        validUntil: z.string().optional(),
        usageLimit: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const [result] = await dbInstance!.insert(discounts).values({
          ...input,
          validFrom: input.validFrom ? new Date(input.validFrom) : null,
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
        });
        return { id: result.insertId };
      }),

    getAllDiscounts: adminProcedure.query(async () => {
      return db.getAllDiscounts();
    }),

    deleteDiscount: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await dbInstance!.delete(discounts).where(eq(discounts.id, input.id));
        return { success: true };
      }),

    // Add-on management
    getAllAddons: adminProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      // Return all addons including inactive ones for admin
      return dbInstance!.select().from(addons).orderBy(asc(addons.type), asc(addons.displayOrder));
    }),

    createAddon: adminProcedure
      .input(z.object({
        name: z.string(),
        chineseName: z.string().optional(),
        type: z.enum(['boba_flavor', 'boba_size', 'extra_boba', 'vegan_milk', 'food_addon']),
        pricePetite: z.number().optional(),
        priceRegular: z.number().optional(),
        priceLarge: z.number().optional(),
        fixedPrice: z.number().optional(),
        displayOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const [result] = await dbInstance!.insert(addons).values({
          ...input,
          isActive: true,
        });
        return { id: result.insertId, success: true };
      }),

    updateAddon: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        chineseName: z.string().optional(),
        type: z.enum(['boba_flavor', 'boba_size', 'extra_boba', 'vegan_milk', 'food_addon']).optional(),
        pricePetite: z.number().optional().nullable(),
        priceRegular: z.number().optional().nullable(),
        priceLarge: z.number().optional().nullable(),
        fixedPrice: z.number().optional().nullable(),
        isActive: z.boolean().optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { id, ...updateData } = input;
        // Filter out undefined values
        const cleanData = Object.fromEntries(
          Object.entries(updateData).filter(([_, v]) => v !== undefined)
        );
        if (Object.keys(cleanData).length > 0) {
          await dbInstance!.update(addons).set(cleanData).where(eq(addons.id, id));
        }
        return { success: true };
      }),

    toggleAddonStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await dbInstance!.update(addons).set({ isActive: input.isActive }).where(eq(addons.id, input.id));
        return { success: true };
      }),

    deleteAddon: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        // Soft delete by setting isActive to false
        await dbInstance!.update(addons).set({ isActive: false }).where(eq(addons.id, input.id));
        return { success: true };
      }),

    // Get addons for a specific product
    getProductAddons: adminProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];
        const links = await dbInstance!.select().from(productAddons).where(eq(productAddons.productId, input.productId));
        const addonIds = links.map(l => l.addonId);
        if (addonIds.length === 0) return [];
        const addonList = await dbInstance!.select().from(addons).where(sql`${addons.id} IN (${sql.join(addonIds.map(id => sql`${id}`), sql`, `)})`);
        return addonList;
      }),

    // Link an addon to a product
    linkAddonToProduct: adminProcedure
      .input(z.object({
        productId: z.number(),
        addonId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        // Check if link already exists
        const existing = await dbInstance!.select().from(productAddons)
          .where(and(eq(productAddons.productId, input.productId), eq(productAddons.addonId, input.addonId)));
        if (existing.length > 0) return { success: true, message: 'Already linked' };
        await dbInstance!.insert(productAddons).values(input);
        return { success: true };
      }),

    // Unlink an addon from a product
    unlinkAddonFromProduct: adminProcedure
      .input(z.object({
        productId: z.number(),
        addonId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await dbInstance!.delete(productAddons)
          .where(and(eq(productAddons.productId, input.productId), eq(productAddons.addonId, input.addonId)));
        return { success: true };
      }),

    // Get all subcategories for admin
    getAllSubcategories: adminProcedure.query(async () => {
      return db.getSubcategories(undefined, false);
    }),

    // Dashboard stats
    getDashboardStats: adminProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return { totalOrders: 0, todayOrders: 0, totalRevenue: 0, todayRevenue: 0 };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allOrders = await dbInstance!.select().from(orders);
      const todayOrders = allOrders.filter(o => new Date(o.createdAt) >= today);
      
      const totalRevenue = allOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      return {
        totalOrders: allOrders.length,
        todayOrders: todayOrders.length,
        totalRevenue,
        todayRevenue,
      };
    }),

    // User management
    getAllUsers: adminProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      return dbInstance.select().from(users).orderBy(desc(users.createdAt));
    }),

    updateUserRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(['customer', 'staff', 'admin']) }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await dbInstance!.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),

    // Outlet product management
    getOutletProducts: adminProcedure
      .input(z.object({ outletId: z.number() }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];
        return dbInstance.select().from(outletProducts).where(eq(outletProducts.outletId, input.outletId));
      }),

    updateOutletProduct: adminProcedure
      .input(z.object({
        outletId: z.number(),
        productId: z.number(),
        isAvailable: z.boolean(),
        instorePriceOverride: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        // Check if record exists
        const existing = await dbInstance!.select().from(outletProducts)
          .where(and(
            eq(outletProducts.outletId, input.outletId),
            eq(outletProducts.productId, input.productId)
          ));

        if (existing.length > 0) {
          // Update existing
          await dbInstance!.update(outletProducts)
            .set({
              isAvailable: input.isAvailable,
              instorePriceOverride: input.instorePriceOverride,
            })
            .where(and(
              eq(outletProducts.outletId, input.outletId),
              eq(outletProducts.productId, input.productId)
            ));
        } else {
          // Insert new
          await dbInstance!.insert(outletProducts).values({
            outletId: input.outletId,
            productId: input.productId,
            isAvailable: input.isAvailable,
            instorePriceOverride: input.instorePriceOverride,
          });
        }
        return { success: true };
      }),
    // POS Audit logs removed - POS functionality removed

    // Site settings management
    getSiteSettings: adminProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { siteSettings } = await import('../drizzle/schema.js');
      return dbInstance.select().from(siteSettings);
    }),

    updateSiteSetting: adminProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { siteSettings } = await import('../drizzle/schema.js');
        
        // Check if setting exists
        const existing = await dbInstance.select().from(siteSettings).where(eq(siteSettings.key, input.key));
        
        if (existing.length > 0) {
          // Update existing
          await dbInstance.update(siteSettings).set({ value: input.value }).where(eq(siteSettings.key, input.key));
        } else {
          // Insert new
          await dbInstance.insert(siteSettings).values({ key: input.key, value: input.value });
        }
        return { success: true };
      }),
  }),

  // POS functionality removed - posAuth and pos routers removed

  // Loyalty program routes
  loyalty: router({
    // Get user's stamp card status
    getStampCard: protectedProcedure.query(async ({ ctx }) => {
      const dbInstance = await getDb();
      const [user] = await dbInstance!
        .select({
          stampCount: users.stampCount,
          lifetimeStamps: users.lifetimeStamps,
          lastStampDate: users.lastStampDate,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id));
      
      // Get available rewards
      const rewards = await dbInstance!
        .select()
        .from(loyaltyRewards)
        .where(and(
          eq(loyaltyRewards.userId, ctx.user.id),
          eq(loyaltyRewards.isRedeemed, false)
        ))
        .orderBy(desc(loyaltyRewards.createdAt));
      
      return {
        stampCount: user?.stampCount || 0,
        lifetimeStamps: user?.lifetimeStamps || 0,
        lastStampDate: user?.lastStampDate,
        stampsToNextReward: 10 - ((user?.stampCount || 0) % 10),
        availableRewards: rewards,
      };
    }),

    // Get stamp transaction history
    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        const transactions = await dbInstance!
          .select()
          .from(stampTransactions)
          .where(eq(stampTransactions.userId, ctx.user.id))
          .orderBy(desc(stampTransactions.createdAt))
          .limit(input.limit);
        return transactions;
      }),

    // Calculate stamps for an order (preview before checkout)
    previewStamps: protectedProcedure
      .input(z.object({ orderTotal: z.number() })) // in paise
      .query(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        const [user] = await dbInstance!
          .select({ lifetimeStamps: users.lifetimeStamps })
          .from(users)
          .where(eq(users.id, ctx.user.id));
        
        const isFirstOrder = (user?.lifetimeStamps || 0) === 0;
        let stamps = Math.floor(input.orderTotal / 45000); // 1 stamp per ₹450
        
        // Welcome stamp for first order
        if (isFirstOrder) {
          stamps += 1;
        }
        
        return {
          stampsToEarn: stamps,
          isFirstOrder,
          hasBonus: false,
        };
      }),

    // Award stamps after order completion
    awardStamps: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        orderTotal: z.number(), // in paise
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        
        // Staff and admin accounts should not earn stamps
        if (ctx.user.role === 'staff' || ctx.user.role === 'admin') {
          return {
            stampsEarned: 0,
            currentStamps: 0,
            rewardsCreated: 0,
            isFirstOrder: false,
            skippedReason: 'Staff/admin accounts do not earn loyalty stamps',
          };
        }
        
        // Get current user stamp count
        const [user] = await dbInstance!
          .select({
            stampCount: users.stampCount,
            lifetimeStamps: users.lifetimeStamps,
          })
          .from(users)
          .where(eq(users.id, ctx.user.id));
        
        const isFirstOrder = (user?.lifetimeStamps || 0) === 0;
        let stampsEarned = Math.floor(input.orderTotal / 45000); // 1 stamp per ₹450
        let welcomeStamp = 0;
        
        // Welcome stamp for first order
        if (isFirstOrder) {
          welcomeStamp = 1;
        }
        
        const totalStamps = stampsEarned + welcomeStamp;
        
        if (totalStamps > 0) {
          // Update user stamps
          const newStampCount = (user?.stampCount || 0) + totalStamps;
          const newLifetimeStamps = (user?.lifetimeStamps || 0) + totalStamps;
          
          await dbInstance!
            .update(users)
            .set({
              stampCount: newStampCount,
              lifetimeStamps: newLifetimeStamps,
              lastStampDate: new Date(),
            })
            .where(eq(users.id, ctx.user.id));
          
          // Log transactions
          if (stampsEarned > 0) {
            await dbInstance!.insert(stampTransactions).values({
              userId: ctx.user.id,
              orderId: input.orderId,
              action: 'earn',
              stamps: stampsEarned,
              orderTotal: input.orderTotal,
              description: `Earned ${stampsEarned} stamp(s) for order`,
            });
          }
          
          if (welcomeStamp > 0) {
            await dbInstance!.insert(stampTransactions).values({
              userId: ctx.user.id,
              orderId: input.orderId,
              action: 'welcome',
              stamps: welcomeStamp,
              orderTotal: input.orderTotal,
              description: 'Welcome stamp for first order',
            });
          }
          
          // Check if reward earned (10 stamps)
          let rewardsCreated = 0;
          let currentStamps = newStampCount;
          while (currentStamps >= 10) {
            currentStamps -= 10;
            rewardsCreated++;
            
            // Generate unique voucher code
            const voucherCode = `TM${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            
            // Create reward (expires in 30 days)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            
            await dbInstance!.insert(loyaltyRewards).values({
              userId: ctx.user.id,
              rewardType: 'free_large_bubble_tea',
              voucherCode,
              expiresAt,
            });
          }
          
          // Update stamp count after rewards
          if (rewardsCreated > 0) {
            await dbInstance!
              .update(users)
              .set({ stampCount: currentStamps })
              .where(eq(users.id, ctx.user.id));
          }
          
          return {
            stampsEarned: totalStamps,
            currentStamps: rewardsCreated > 0 ? currentStamps : newStampCount,
            rewardsCreated,
            isFirstOrder,
          };
        }
        
        return {
          stampsEarned: 0,
          currentStamps: user?.stampCount || 0,
          rewardsCreated: 0,
          isFirstOrder,
        };
      }),

    // Get available rewards for redemption
    getAvailableRewards: protectedProcedure.query(async ({ ctx }) => {
      const dbInstance = await getDb();
      const rewards = await dbInstance!
        .select()
        .from(loyaltyRewards)
        .where(and(
          eq(loyaltyRewards.userId, ctx.user.id),
          eq(loyaltyRewards.isRedeemed, false)
        ))
        .orderBy(asc(loyaltyRewards.expiresAt));
      
      // Filter out expired rewards
      const now = new Date();
      return rewards.filter(r => new Date(r.expiresAt) > now);
    }),

    // Redeem a reward
    redeemReward: protectedProcedure
      .input(z.object({
        voucherCode: z.string(),
        orderId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        
        // Find the reward
        const [reward] = await dbInstance!
          .select()
          .from(loyaltyRewards)
          .where(eq(loyaltyRewards.voucherCode, input.voucherCode));
        
        if (!reward) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid voucher code' });
        }
        
        if (reward.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'This voucher belongs to another account' });
        }
        
        if (reward.isRedeemed) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Voucher already used' });
        }
        
        if (new Date(reward.expiresAt) < new Date()) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Voucher has expired' });
        }
        
        // Mark as redeemed
        await dbInstance!
          .update(loyaltyRewards)
          .set({
            isRedeemed: true,
            redeemedAt: new Date(),
            redeemedOrderId: input.orderId,
          })
          .where(eq(loyaltyRewards.id, reward.id));
        
        // Log transaction
        await dbInstance!.insert(stampTransactions).values({
          userId: ctx.user.id,
          orderId: input.orderId,
          action: 'redeem',
          stamps: -10,
          description: 'Redeemed reward: Free Large Bubble Tea',
        });
        
        // Return discount amount (₹250 for large bubble tea)
        return {
          discountAmount: 25000, // ₹250 in paise
          rewardType: 'Free Large Bubble Tea',
          voucherCode: input.voucherCode,
        };
      }),

    // Validate voucher code (for checkout preview)
    validateVoucher: protectedProcedure
      .input(z.object({ voucherCode: z.string() }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        
        const [reward] = await dbInstance!
          .select()
          .from(loyaltyRewards)
          .where(eq(loyaltyRewards.voucherCode, input.voucherCode));
        
        if (!reward) {
          return { valid: false, error: 'Invalid voucher code' };
        }
        
        if (reward.userId !== ctx.user.id) {
          return { valid: false, error: 'This voucher belongs to another account' };
        }
        
        if (reward.isRedeemed) {
          return { valid: false, error: 'Voucher already used' };
        }
        
        if (new Date(reward.expiresAt) < new Date()) {
          return { valid: false, error: 'Voucher has expired' };
        }
        
        return {
          valid: true,
          discountAmount: 25000, // ₹250
          rewardType: 'Free Large Bubble Tea',
          expiresAt: reward.expiresAt,
        };
      }),
  }),

  // Guest checkout routes
  guest: router({
    // Create order as guest
    createOrder: publicProcedure
      .input(z.object({
        guestName: z.string().min(2),
        guestPhone: z.string().min(10),
        guestEmail: z.string().email().optional(),
        orderType: z.enum(['instore', 'delivery', 'pickup']),
        tableNumber: z.string().optional(), // For in-store orders
        idempotencyKey: z.string().optional(), // For preventing duplicate orders on network retry
        items: z.array(z.object({
          productId: z.number(),
          productName: z.string(),
          size: z.enum(['petite', 'regular', 'large']).optional(),
          withBoba: z.boolean().optional(),
          bobaType: z.string().optional(),
          bobaSize: z.string().optional(),
          poppingBobaFlavor: z.string().optional(),
          sugarLevel: z.string().optional(),
          iceLevel: z.string().optional(),
          specialInstructions: z.string().optional(),
          quantity: z.number(),
          unitPrice: z.number(),
          addons: z.array(z.object({
            id: z.number(),
            name: z.string(),
            price: z.number(),
          })),
        })),
        // Delivery address
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        area: z.string().optional(),
        pincode: z.string().optional(),
        landmark: z.string().optional(),
        // Pickup details
        pickupTime: z.string().optional(),
        storeLocationId: z.number().optional(),
        // Special instructions for the entire order
        specialInstructions: z.string().optional(),
        // Payment
        paymentMethod: z.enum(['online', 'cash_at_pickup']),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        
        // Check for duplicate order using idempotency key
        if (input.idempotencyKey) {
          const [existingOrder] = await dbInstance!.select().from(orders).where(eq(orders.idempotencyKey, input.idempotencyKey)).limit(1);
          if (existingOrder) {
            // Return existing order instead of creating duplicate
            return {
              orderId: existingOrder.id,
              orderNumber: existingOrder.orderNumber,
              totalAmount: existingOrder.totalAmount,
            };
          }
        }
        
        // Calculate totals
        let subtotal = 0;
        for (const item of input.items) {
          const addonsTotal = item.addons.reduce((sum, a) => sum + a.price, 0);
          subtotal += (item.unitPrice + addonsTotal) * item.quantity;
        }
        
        const gstDetails = calculateGst(subtotal);
        // ₹100 flat delivery charge for delivery orders, FREE for orders above ₹2500
        let deliveryCharge = 0;
        if (input.orderType === 'delivery') {
          deliveryCharge = subtotal >= 250000 ? 0 : 10000; // Free delivery for orders ≥₹2500
        }
        const totalAmount = subtotal + gstDetails.total + deliveryCharge;
        
        // Generate sequential 5-digit order number
        const [maxOrderResult] = await dbInstance!.execute(sql`SELECT MAX(CAST(orderNumber AS UNSIGNED)) as maxNum FROM orders WHERE orderNumber REGEXP '^[0-9]+$'`);
        const maxNum = (maxOrderResult as any)[0]?.maxNum || 0;
        const nextNum = maxNum + 1;
        const orderNumber = String(nextNum).padStart(5, '0');
        
        // Create order (userId = null for guest)
        const [orderResult] = await dbInstance!.insert(orders).values({
          orderNumber,
          userId: 0, // Guest order marker
          orderType: input.orderType,
          tableNumber: input.orderType === 'instore' ? input.tableNumber : null,
          orderStatus: 'pending',
          paymentStatus: input.paymentMethod === 'cash_at_pickup' ? 'pending' : 'pending',
          subtotal,
          stateGst: gstDetails.stateGst,
          centralGst: gstDetails.centralGst,
          deliveryCharge,
          totalAmount,
          // Delivery address as single field
          deliveryAddress: input.addressLine1 ? `${input.addressLine1}${input.addressLine2 ? ', ' + input.addressLine2 : ''}, ${input.area}, Chennai - ${input.pincode}` : undefined,
          // Pickup
          scheduledTime: input.pickupTime ? new Date(`1970-01-01T${input.pickupTime}:00`) : undefined,
          outletId: input.storeLocationId,
          // Special instructions
          specialInstructions: input.specialInstructions,
          // Idempotency key to prevent duplicate orders on network retry
          idempotencyKey: input.idempotencyKey || null,
        });
        
        const orderId = orderResult.insertId;
        
        // Create order items
        for (const item of input.items) {
          const addonsTotal = item.addons.reduce((sum, a) => sum + a.price, 0);
          const lineTotal = (item.unitPrice + addonsTotal) * item.quantity;
          
          const [itemResult] = await dbInstance!.insert(orderItemsTable).values({
            orderId,
            productId: item.productId,
            productName: item.productName,
            size: item.size,
            withBoba: item.withBoba,
            sugarLevel: item.sugarLevel,
            iceLevel: item.iceLevel,
            specialInstructions: item.specialInstructions,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            addonsTotal,
            lineTotal,
          });
          
          // Add addons
          for (const addon of item.addons) {
            await dbInstance!.insert(orderItemAddons).values({
              orderItemId: itemResult.insertId,
              addonId: addon.id,
              addonName: addon.name,
              addonPrice: addon.price,
            });
          }
        }
        
        // Create guest order record
        await dbInstance!.insert(guestOrders).values({
          orderId,
          guestName: input.guestName,
          guestPhone: input.guestPhone,
          guestEmail: input.guestEmail,
        });
        
        // For ALL in-store orders, create KOT immediately
        // Kitchen needs to start preparing right away since customer is present
        // This applies regardless of payment method (cash, online, etc.)
        if (input.orderType === 'instore') {
          try {
            // Build KOT data
            const kotData = {
              orderId: orderNumber,
              orderType: 'INSTORE',
              tableNumber: input.tableNumber || '',
              customerName: input.guestName,
              customerPhone: input.guestPhone,
              specialInstructions: input.specialInstructions || '',
              items: input.items.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                price: item.unitPrice,
                size: item.size,
                withBoba: item.withBoba,
                sugarLevel: item.sugarLevel,
                iceLevel: item.iceLevel,
                specialInstructions: item.specialInstructions || '',
                addons: item.addons.map(a => ({
                  name: a.name,
                  price: a.price,
                })),
              })),
              totalAmount,
              createdAt: new Date().toISOString(),
            };
            
            await dbInstance!.insert(kotQueue).values({
              orderId: orderId.toString(),
              outletId: input.storeLocationId || 2, // Default to T Nagar (2)
              orderNumber,
              kotData: kotData,
              isPrinted: false,
            });
            
            // Send notification for in-store guest order
            try {
              const itemsList = input.items.map(i => `${i.quantity}x ${i.productName}`).join(', ');
              await notifyOwner({
                title: `🆕 New In-Store Order #${orderNumber}`,
                content: `Customer: ${input.guestName}\nPhone: ${input.guestPhone}\nTable: ${input.tableNumber || 'N/A'}\nAmount: ₹${(totalAmount / 100).toFixed(2)}\nItems: ${itemsList}\nPayment: Cash at Counter\n\nOrder placed via website. Please check the admin panel for details.`
              });
            } catch (notifyError) {
              console.warn('[Order] Failed to send notification:', notifyError);
            }
          } catch (kotError) {
            // CRITICAL: KOT queuing failed - notify owner immediately
            console.error('CRITICAL: KOT queuing failed for guest order', orderNumber, kotError);
            try {
              await notifyOwner({
                title: `🚨 CRITICAL: KOT Failed for Order #${orderNumber}`,
                content: `KOT could not be queued for in-store order #${orderNumber}. Customer: ${input.guestName}, Table: ${input.tableNumber || 'N/A'}. Please manually print KOT from Admin panel immediately!`,
              });
            } catch (notifyError) {
              console.error('Failed to send KOT failure notification', notifyError);
            }
          }
        }
        
        // For PICKUP orders, create KOT immediately on order confirmation
        // Kitchen needs to start preparing so food is ready when customer arrives
        if (input.orderType === 'pickup') {
          try {
            // Build KOT data
            const kotData = {
              orderId: orderNumber,
              orderType: 'PICKUP',
              customerName: input.guestName,
              customerPhone: input.guestPhone,
              specialInstructions: input.specialInstructions || '',
              items: input.items.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                price: item.unitPrice,
                size: item.size,
                withBoba: item.withBoba,
                sugarLevel: item.sugarLevel,
                iceLevel: item.iceLevel,
                specialInstructions: item.specialInstructions || '',
                addons: item.addons.map(a => ({
                  name: a.name,
                  price: a.price,
                })),
              })),
              totalAmount,
              createdAt: new Date().toISOString(),
            };
            
            await dbInstance!.insert(kotQueue).values({
              orderId: orderId.toString(),
              outletId: input.storeLocationId || 2, // Default to T Nagar (2)
              orderNumber,
              kotData: kotData,
              isPrinted: false,
            });
            
            // Send notification for pickup order
            try {
              const itemsList = input.items.map(i => `${i.quantity}x ${i.productName}`).join(', ');
              await notifyOwner({
                title: `🆕 New Pickup Order #${orderNumber}`,
                content: `Customer: ${input.guestName}\nPhone: ${input.guestPhone}\nAmount: ₹${(totalAmount / 100).toFixed(2)}\nItems: ${itemsList}\n\nPickup order placed. Please prepare and notify customer when ready.`
              });
            } catch (notifyError) {
              console.warn('[Order] Failed to send notification:', notifyError);
            }
          } catch (kotError) {
            // CRITICAL: KOT queuing failed - notify owner immediately
            console.error('CRITICAL: KOT queuing failed for pickup order', orderNumber, kotError);
            try {
              await notifyOwner({
                title: `🚨 CRITICAL: KOT Failed for Pickup Order #${orderNumber}`,
                content: `KOT could not be queued for pickup order #${orderNumber}. Customer: ${input.guestName}. Please manually print KOT from Admin panel immediately!`,
              });
            } catch (notifyError) {
              console.error('Failed to send KOT failure notification', notifyError);
            }
          }
        }
        
        return {
          orderId,
          orderNumber,
          totalAmount,
          gstDetails,
        };
      }),

    // Get guest order by order number and phone
    getOrder: publicProcedure
      .input(z.object({
        orderNumber: z.string(),
        phone: z.string(),
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        
        // Find order
        const [order] = await dbInstance!
          .select()
          .from(orders)
          .where(eq(orders.orderNumber, input.orderNumber));
        
        if (!order) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        }
        
        // Verify guest phone
        const [guest] = await dbInstance!
          .select()
          .from(guestOrders)
          .where(eq(guestOrders.orderId, order.id));
        
        if (!guest || guest.guestPhone !== input.phone) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Phone number does not match' });
        }
        
        // Get order items
        const items = await dbInstance!
          .select()
          .from(orderItemsTable)
          .where(eq(orderItemsTable.orderId, order.id));
        
        return {
          ...order,
          guestName: guest.guestName,
          guestPhone: guest.guestPhone,
          guestEmail: guest.guestEmail,
          items,
        };
      }),
  }),

  // Reviews routes
  reviews: router({
    // Submit a review (authenticated users only)
    submit: protectedProcedure
      .input(z.object({
        orderId: z.number().optional(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        
        // Check if user already reviewed this order
        if (input.orderId) {
          const [existingReview] = await dbInstance!
            .select()
            .from(reviews)
            .where(and(
              eq(reviews.userId, ctx.user.id),
              eq(reviews.orderId, input.orderId)
            ));
          
          if (existingReview) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'You have already reviewed this order' });
          }
        }
        
        const [review] = await dbInstance!.insert(reviews).values({
          userId: ctx.user.id,
          orderId: input.orderId || null,
          rating: input.rating,
          comment: input.comment || null,
          customerName: ctx.user.name || 'Anonymous',
          status: 'pending', // Requires admin approval before display
        }).$returningId();
        
        return { success: true, reviewId: review.id };
      }),

    // Get all approved reviews (public)
    getApproved: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(10),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        const limit = input?.limit || 10;
        
        const reviewsList = await dbInstance!
          .select({
            id: reviews.id,
            rating: reviews.rating,
            comment: reviews.comment,
            customerName: reviews.customerName,
            createdAt: reviews.createdAt,
          })
          .from(reviews)
          .where(eq(reviews.status, 'approved'))
          .orderBy(desc(reviews.createdAt))
          .limit(limit);
        
        return reviewsList;
      }),

    // Get review stats (public)
    getStats: publicProcedure.query(async () => {
      const dbInstance = await getDb();
      
      const stats = await dbInstance!
        .select({
          avgRating: sql<number>`AVG(${reviews.rating})`,
          totalReviews: sql<number>`COUNT(*)`,
        })
        .from(reviews)
        .where(eq(reviews.status, 'approved'));
      
      return {
        averageRating: stats[0]?.avgRating ? Number(stats[0].avgRating.toFixed(1)) : 0,
        totalReviews: Number(stats[0]?.totalReviews) || 0,
      };
    }),

    // Check if user can review an order
    canReview: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        
        // Check if order exists and belongs to user
        const [order] = await dbInstance!
          .select()
          .from(orders)
          .where(and(
            eq(orders.id, input.orderId),
            eq(orders.userId, ctx.user.id)
          ));
        
        if (!order) {
          return { canReview: false, reason: 'Order not found' };
        }
        
        if (order.orderStatus !== 'completed') {
          return { canReview: false, reason: 'Order not completed yet' };
        }
        
        // Check if already reviewed
        const [existingReview] = await dbInstance!
          .select()
          .from(reviews)
          .where(and(
            eq(reviews.userId, ctx.user.id),
            eq(reviews.orderId, input.orderId)
          ));
        
        if (existingReview) {
          return { canReview: false, reason: 'Already reviewed' };
        }
        
        return { canReview: true };
      }),

    // Admin: Get all reviews
    getAll: adminProcedure
      .input(z.object({
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        const limit = input?.limit || 50;
        const offset = input?.offset || 0;
        
        let query = dbInstance!
          .select({
            id: reviews.id,
            userId: reviews.userId,
            orderId: reviews.orderId,
            rating: reviews.rating,
            comment: reviews.comment,
            customerName: reviews.customerName,
            status: reviews.status,
            adminResponse: reviews.adminResponse,
            createdAt: reviews.createdAt,
            updatedAt: reviews.updatedAt,
          })
          .from(reviews)
          .orderBy(desc(reviews.createdAt))
          .limit(limit)
          .offset(offset);
        
        if (input?.status) {
          query = query.where(eq(reviews.status, input.status)) as typeof query;
        }
        
        return query;
      }),

    // Admin: Update review status
    updateStatus: adminProcedure
      .input(z.object({
        reviewId: z.number(),
        status: z.enum(['pending', 'approved', 'rejected']),
        adminResponse: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        
        await dbInstance!
          .update(reviews)
          .set({
            status: input.status,
            adminResponse: input.adminResponse || null,
          })
          .where(eq(reviews.id, input.reviewId));
        
        return { success: true };
      }),

    // Admin: Delete review
    delete: adminProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        
        await dbInstance!
          .delete(reviews)
          .where(eq(reviews.id, input.reviewId));
        
        return { success: true };
      }),
  }),

  // Customer complaints management
  complaints: router({
    // Submit a complaint (public - can be guest or authenticated)
    submit: publicProcedure
      .input(z.object({
        orderId: z.number().optional(),
        orderNumber: z.string().optional(),
        customerName: z.string().min(1),
        customerEmail: z.string().email().optional(),
        customerPhone: z.string().optional(),
        complaintType: z.enum(['delivery_issue', 'quality_issue', 'missing_item', 'wrong_order', 'late_delivery', 'payment_issue', 'staff_behavior', 'other']),
        description: z.string().min(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        
        const [complaint] = await dbInstance!.insert(complaints).values({
          userId: ctx.user?.id || null,
          orderId: input.orderId || null,
          orderNumber: input.orderNumber || null,
          customerName: input.customerName,
          customerEmail: input.customerEmail || null,
          customerPhone: input.customerPhone || null,
          complaintType: input.complaintType,
          description: input.description,
          status: 'open',
          priority: input.complaintType === 'delivery_issue' || input.complaintType === 'wrong_order' ? 'high' : 'medium',
        }).$returningId();
        
        return { success: true, complaintId: complaint.id };
      }),

    // Get user's complaints (authenticated)
    getMine: protectedProcedure.query(async ({ ctx }) => {
      const dbInstance = await getDb();
      
      const myComplaints = await dbInstance!
        .select()
        .from(complaints)
        .where(eq(complaints.userId, ctx.user.id))
        .orderBy(desc(complaints.createdAt));
      
      return myComplaints;
    }),

    // Admin: Get all complaints
    getAll: adminProcedure
      .input(z.object({
        status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        const limit = input?.limit || 50;
        const offset = input?.offset || 0;
        
        let conditions = [];
        if (input?.status) {
          conditions.push(eq(complaints.status, input.status));
        }
        if (input?.priority) {
          conditions.push(eq(complaints.priority, input.priority));
        }
        
        const query = dbInstance!
          .select()
          .from(complaints)
          .orderBy(desc(complaints.createdAt))
          .limit(limit)
          .offset(offset);
        
        if (conditions.length > 0) {
          return query.where(and(...conditions));
        }
        
        return query;
      }),

    // Admin: Get complaint stats
    getStats: adminProcedure.query(async () => {
      const dbInstance = await getDb();
      
      const [stats] = await dbInstance!
        .select({
          total: sql<number>`COUNT(*)`,
          open: sql<number>`SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END)`,
          inProgress: sql<number>`SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)`,
          resolved: sql<number>`SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END)`,
          closed: sql<number>`SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END)`,
        })
        .from(complaints);
      
      return {
        total: Number(stats?.total) || 0,
        open: Number(stats?.open) || 0,
        inProgress: Number(stats?.inProgress) || 0,
        resolved: Number(stats?.resolved) || 0,
        closed: Number(stats?.closed) || 0,
      };
    }),

    // Admin: Update complaint status
    updateStatus: adminProcedure
      .input(z.object({
        complaintId: z.number(),
        status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        
        const updateData: any = { status: input.status };
        if (input.priority) {
          updateData.priority = input.priority;
        }
        
        await dbInstance!
          .update(complaints)
          .set(updateData)
          .where(eq(complaints.id, input.complaintId));
        
        return { success: true };
      }),

    // Admin: Resolve complaint with action (refund/store credit)
    resolve: adminProcedure
      .input(z.object({
        complaintId: z.number(),
        resolution: z.string().min(1),
        resolutionType: z.enum(['refund', 'store_credit', 'replacement', 'apology', 'no_action']),
        refundAmount: z.number().optional(), // In paise
        storeCreditAmount: z.number().optional(), // In paise
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        
        // Get the complaint to find the user
        const [complaint] = await dbInstance!
          .select()
          .from(complaints)
          .where(eq(complaints.id, input.complaintId));
        
        if (!complaint) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Complaint not found' });
        }
        
        // If store credit is being issued and user exists, update their balance
        if (input.resolutionType === 'store_credit' && input.storeCreditAmount && complaint.userId) {
          await dbInstance!
            .update(users)
            .set({
              storeCredit: sql`${users.storeCredit} + ${input.storeCreditAmount}`,
            })
            .where(eq(users.id, complaint.userId));
        }
        
        // Update the complaint
        await dbInstance!
          .update(complaints)
          .set({
            status: 'resolved',
            resolution: input.resolution,
            resolutionType: input.resolutionType,
            refundAmount: input.refundAmount || null,
            storeCreditAmount: input.storeCreditAmount || null,
            resolvedBy: ctx.user.id,
            resolvedByName: ctx.user.name || 'Admin',
            resolvedAt: new Date(),
          })
          .where(eq(complaints.id, input.complaintId));
        
        return { success: true };
      }),

    // Admin: Delete complaint
    delete: adminProcedure
      .input(z.object({ complaintId: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        
        await dbInstance!
          .delete(complaints)
          .where(eq(complaints.id, input.complaintId));
        
        return { success: true };
      }),
  }),

  // KOT (Kitchen Order Ticket) routes for polling from outlet printer
  kot: router({
    // Poll for pending KOTs - called by outlet computer
    pollPending: publicProcedure
      .input(z.object({ secret: z.string() }))
      .query(async ({ input }) => {
        // Verify secret
        if (input.secret !== ENV.kotPrintSecret) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid KOT secret' });
        }
        
        const dbInstance = await getDb();
        if (!dbInstance) return [];
        
        // Get all pending KOTs (not yet printed)
        const pendingKots = await dbInstance
          .select()
          .from(kotQueue)
          .where(eq(kotQueue.isPrinted, false))
          .orderBy(asc(kotQueue.createdAt));
        
        return pendingKots.map(kot => {
          // kotData is already a JSON object from the database
          return {
            id: kot.id,
            orderId: kot.orderId,
            orderNumber: kot.orderNumber,
            kotData: kot.kotData,
            createdAt: kot.createdAt,
          };
        });
      }),

    // Mark KOT as printed - called after successful print
    markPrinted: publicProcedure
      .input(z.object({ 
        secret: z.string(),
        kotId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Verify secret
        if (input.secret !== ENV.kotPrintSecret) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid KOT secret' });
        }
        
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        await dbInstance
          .update(kotQueue)
          .set({
            isPrinted: true,
            printedAt: new Date(),
          })
          .where(eq(kotQueue.id, input.kotId));
        
        return { success: true };
      }),

    // Get daily KOT summary report with detailed order-level data
    getDailySummary: adminProcedure
      .input(z.object({ 
        date: z.string().optional() // YYYY-MM-DD format, defaults to today
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { 
          totalKots: 0, 
          orders: [], 
          hourlyBreakdown: [], 
          orderTypeBreakdown: {},
          topItems: [],
          peakHours: [],
        };
        
        // Parse date or use today
        const targetDate = input.date ? new Date(input.date) : new Date();
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
        
        // Get all KOTs for the day
        const dailyKots = await dbInstance
          .select()
          .from(kotQueue)
          .where(and(
            sql`${kotQueue.createdAt} >= ${startOfDay.toISOString()}`,
            sql`${kotQueue.createdAt} <= ${endOfDay.toISOString()}`
          ))
          .orderBy(desc(kotQueue.createdAt));
        
        // Build detailed order list
        const orders = dailyKots.map(kot => {
          const kotData = typeof kot.kotData === 'string' ? JSON.parse(kot.kotData) : kot.kotData;
          return {
            kotId: kot.id,
            orderNumber: kot.orderNumber,
            orderType: kotData.orderType || 'PICKUP',
            customerName: kotData.customerName || 'Guest',
            items: kotData.items?.map((item: any) => ({
              name: item.productName,
              quantity: item.quantity || 1,
              customizations: [
                item.size ? `Size: ${item.size}` : null,
                item.withBoba !== null && item.withBoba !== undefined ? `Boba: ${item.withBoba ? 'Yes' : 'No'}` : null,
                item.sugarLevel ? `Sugar: ${item.sugarLevel}` : null,
                item.iceLevel ? `Ice: ${item.iceLevel}` : null,
              ].filter(Boolean).join(', '),
            })) || [],
            totalItems: kotData.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 0,
            createdAt: new Date(kot.createdAt).toISOString(),
            isPrinted: kot.isPrinted,
          };
        });
        
        // Calculate hourly breakdown (0-23 hours)
        const hourCounts: Record<number, number> = {};
        for (let i = 0; i < 24; i++) {
          hourCounts[i] = 0;
        }
        
        dailyKots.forEach(kot => {
          const hour = new Date(kot.createdAt).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        const hourlyBreakdown = Object.entries(hourCounts)
          .map(([hour, count]) => ({
            hour: parseInt(hour),
            hourLabel: `${hour.padStart(2, '0')}:00`,
            count,
          }))
          .sort((a, b) => a.hour - b.hour);
        
        // Find peak hours (hours with above-average orders)
        const avgOrdersPerHour = dailyKots.length / 24;
        const peakHours = hourlyBreakdown
          .filter(h => h.count > avgOrdersPerHour && h.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(h => ({
            hour: h.hourLabel,
            orders: h.count,
            recommendation: h.count > avgOrdersPerHour * 2 ? 'High volume - add extra staff' : 'Moderate volume - standard staffing',
          }));
        
        // Order type breakdown
        const orderTypeBreakdown: Record<string, number> = {};
        dailyKots.forEach(kot => {
          const kotData = typeof kot.kotData === 'string' ? JSON.parse(kot.kotData) : kot.kotData;
          const type = kotData.orderType || 'PICKUP';
          orderTypeBreakdown[type] = (orderTypeBreakdown[type] || 0) + 1;
        });
        
        // Count items from KOT data
        const itemCounts: Record<string, number> = {};
        dailyKots.forEach(kot => {
          const kotData = typeof kot.kotData === 'string' ? JSON.parse(kot.kotData) : kot.kotData;
          kotData.items?.forEach((item: any) => {
            const name = item.productName;
            itemCounts[name] = (itemCounts[name] || 0) + (item.quantity || 1);
          });
        });
        
        // Get top 10 items
        const topItems = Object.entries(itemCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([name, count]) => ({ productName: name, quantity: count }));
        
        return {
          totalKots: dailyKots.length,
          orders,
          hourlyBreakdown,
          orderTypeBreakdown,
          topItems,
          peakHours,
          date: targetDate.toISOString().split('T')[0],
        };
      }),

    // Get KOT status (for debugging)
    getStatus: publicProcedure
      .input(z.object({ secret: z.string() }))
      .query(async ({ input }) => {
        // Verify secret
        if (input.secret !== ENV.kotPrintSecret) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid KOT secret' });
        }
        
        const dbInstance = await getDb();
        if (!dbInstance) return { total: 0, pending: 0, printed: 0 };
        
        const [stats] = await dbInstance
          .select({
            total: sql<number>`COUNT(*)`,
            pending: sql<number>`SUM(CASE WHEN isPrinted = false THEN 1 ELSE 0 END)`,
            printed: sql<number>`SUM(CASE WHEN isPrinted = true THEN 1 ELSE 0 END)`,
          })
          .from(kotQueue);
        
        return {
          total: Number(stats?.total || 0),
          pending: Number(stats?.pending || 0),
          printed: Number(stats?.printed || 0),
        };
      }),
  }),

  // Audit Log routes
  audit: router({
    // Get product audit logs
    getProductLogs: adminProcedure
      .input(z.object({
        productId: z.number().optional(),
        action: z.enum(['create', 'update', 'delete', 'deactivate', 'reactivate', 'stock_in', 'stock_out', 'price_change', 'image_change']).optional(),
        userId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(500).default(100),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { logs: [], total: 0 };
        
        const limit = input?.limit || 100;
        const offset = input?.offset || 0;
        
        let conditions: any[] = [];
        
        if (input?.productId) {
          conditions.push(eq(productAuditLog.productId, input.productId));
        }
        if (input?.action) {
          conditions.push(eq(productAuditLog.action, input.action));
        }
        if (input?.userId) {
          conditions.push(eq(productAuditLog.userId, input.userId));
        }
        if (input?.startDate) {
          conditions.push(sql`${productAuditLog.createdAt} >= ${input.startDate}`);
        }
        if (input?.endDate) {
          conditions.push(sql`${productAuditLog.createdAt} <= ${input.endDate}`);
        }
        
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        
        const logs = await dbInstance
          .select()
          .from(productAuditLog)
          .where(whereClause)
          .orderBy(desc(productAuditLog.createdAt))
          .limit(limit)
          .offset(offset);
        
        const [countResult] = await dbInstance
          .select({ count: sql<number>`COUNT(*)` })
          .from(productAuditLog)
          .where(whereClause);
        
        return {
          logs,
          total: Number(countResult?.count || 0),
        };
      }),

    // Get audit summary stats
    getSummary: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { byAction: [], byUser: [], recentChanges: [] };
        
        let dateConditions: any[] = [];
        if (input?.startDate) {
          dateConditions.push(sql`${productAuditLog.createdAt} >= ${input.startDate}`);
        }
        if (input?.endDate) {
          dateConditions.push(sql`${productAuditLog.createdAt} <= ${input.endDate}`);
        }
        const whereClause = dateConditions.length > 0 ? and(...dateConditions) : undefined;
        
        // Count by action type
        const byAction = await dbInstance
          .select({
            action: productAuditLog.action,
            count: sql<number>`COUNT(*)`,
          })
          .from(productAuditLog)
          .where(whereClause)
          .groupBy(productAuditLog.action);
        
        // Count by user
        const byUser = await dbInstance
          .select({
            userName: productAuditLog.userName,
            userId: productAuditLog.userId,
            count: sql<number>`COUNT(*)`,
          })
          .from(productAuditLog)
          .where(whereClause)
          .groupBy(productAuditLog.userName, productAuditLog.userId);
        
        // Recent changes (last 20)
        const recentChanges = await dbInstance
          .select()
          .from(productAuditLog)
          .orderBy(desc(productAuditLog.createdAt))
          .limit(20);
        
        return {
          byAction: byAction.map(a => ({ action: a.action, count: Number(a.count) })),
          byUser: byUser.map(u => ({ userName: u.userName || 'Unknown', userId: u.userId, count: Number(u.count) })),
          recentChanges,
        };
      }),

    // Get product change history
    getProductHistory: adminProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];
        
        const history = await dbInstance
          .select()
          .from(productAuditLog)
          .where(eq(productAuditLog.productId, input.productId))
          .orderBy(desc(productAuditLog.createdAt));
        
        return history;
      }),
  }),

  // Analytics routes
  analytics: router({
    // Sales Overview
    getSalesOverview: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        orderType: z.enum(['all', 'instore', 'delivery', 'pickup']).default('all'),
        categoryId: z.number().optional(),
        subcategoryId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, totalGst: 0 };

        let conditions: any[] = [sql`${orders.orderStatus} != 'cancelled'`];
        if (input?.startDate) conditions.push(sql`${orders.createdAt} >= ${input.startDate}`);
        if (input?.endDate) conditions.push(sql`${orders.createdAt} <= ${input.endDate + ' 23:59:59'}`);
        if (input?.orderType && input.orderType !== 'all') conditions.push(eq(orders.orderType, input.orderType));

        const whereClause = and(...conditions);
        const matchingOrders = await dbInstance.select().from(orders).where(whereClause);

        let totalRevenue = 0;
        let totalGst = 0;
        matchingOrders.forEach(order => {
          totalRevenue += order.totalAmount;
          totalGst += (order.stateGst + order.centralGst);
        });

        return {
          totalRevenue,
          totalOrders: matchingOrders.length,
          avgOrderValue: matchingOrders.length > 0 ? Math.round(totalRevenue / matchingOrders.length) : 0,
          totalGst,
        };
      }),

    // Sales by Category
    getSalesByCategory: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        orderType: z.enum(['all', 'instore', 'delivery', 'pickup']).default('all'),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];

        let conditions: any[] = [sql`${orders.orderStatus} != 'cancelled'`];
        if (input?.startDate) conditions.push(sql`${orders.createdAt} >= ${input.startDate}`);
        if (input?.endDate) conditions.push(sql`${orders.createdAt} <= ${input.endDate + ' 23:59:59'}`);
        if (input?.orderType && input.orderType !== 'all') conditions.push(eq(orders.orderType, input.orderType));

        const whereClause = and(...conditions);
        const matchingOrders = await dbInstance.select().from(orders).where(whereClause);
        const orderIds = matchingOrders.map(o => o.id);

        if (orderIds.length === 0) return [];

        const items = await dbInstance
          .select({
            orderId: orderItemsTable.orderId,
            quantity: orderItemsTable.quantity,
            totalPrice: orderItemsTable.lineTotal,
            subcategoryId: products.subcategoryId,
          })
          .from(orderItemsTable)
          .innerJoin(products, eq(orderItemsTable.productId, products.id))
          .where(sql`${orderItemsTable.orderId} IN (${sql.join(orderIds, sql`, `)})`);

        const allCategories = await dbInstance.select().from(categories);
        const allSubcategories = await dbInstance.select().from(subcategories);
        const subcatToCat: Record<number, number> = {};
        allSubcategories.forEach(s => { subcatToCat[s.id] = s.categoryId; });

        const categoryStats: Record<number, { revenue: number; quantity: number; orders: Set<number> }> = {};
        items.forEach(item => {
          const catId = subcatToCat[item.subcategoryId];
          if (!categoryStats[catId]) categoryStats[catId] = { revenue: 0, quantity: 0, orders: new Set() };
          categoryStats[catId].revenue += item.totalPrice;
          categoryStats[catId].quantity += item.quantity;
          categoryStats[catId].orders.add(item.orderId);
        });

        return allCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          revenue: categoryStats[cat.id]?.revenue || 0,
          quantity: categoryStats[cat.id]?.quantity || 0,
          orderCount: categoryStats[cat.id]?.orders.size || 0,
        })).sort((a, b) => b.revenue - a.revenue);
      }),

    // Sales by Subcategory
    getSalesBySubcategory: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        categoryId: z.number().optional(),
        orderType: z.enum(['all', 'instore', 'delivery', 'pickup']).default('all'),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];

        let conditions: any[] = [sql`${orders.orderStatus} != 'cancelled'`];
        if (input?.startDate) conditions.push(sql`${orders.createdAt} >= ${input.startDate}`);
        if (input?.endDate) conditions.push(sql`${orders.createdAt} <= ${input.endDate + ' 23:59:59'}`);
        if (input?.orderType && input.orderType !== 'all') conditions.push(eq(orders.orderType, input.orderType));

        const whereClause = and(...conditions);
        const matchingOrders = await dbInstance.select().from(orders).where(whereClause);
        const orderIds = matchingOrders.map(o => o.id);

        if (orderIds.length === 0) return [];

        const items = await dbInstance
          .select({
            orderId: orderItemsTable.orderId,
            quantity: orderItemsTable.quantity,
            totalPrice: orderItemsTable.lineTotal,
            subcategoryId: products.subcategoryId,
          })
          .from(orderItemsTable)
          .innerJoin(products, eq(orderItemsTable.productId, products.id))
          .where(sql`${orderItemsTable.orderId} IN (${sql.join(orderIds, sql`, `)})`);

        const allSubcategories = await dbInstance.select().from(subcategories);
        let filteredSubcategories = allSubcategories;
        if (input?.categoryId) {
          filteredSubcategories = allSubcategories.filter(s => s.categoryId === input.categoryId);
        }

        const subcatStats: Record<number, { revenue: number; quantity: number; orders: Set<number> }> = {};
        items.forEach(item => {
          if (!subcatStats[item.subcategoryId]) subcatStats[item.subcategoryId] = { revenue: 0, quantity: 0, orders: new Set() };
          subcatStats[item.subcategoryId].revenue += item.totalPrice;
          subcatStats[item.subcategoryId].quantity += item.quantity;
          subcatStats[item.subcategoryId].orders.add(item.orderId);
        });

        return filteredSubcategories.map(sub => ({
          id: sub.id,
          name: sub.name,
          categoryId: sub.categoryId,
          revenue: subcatStats[sub.id]?.revenue || 0,
          quantity: subcatStats[sub.id]?.quantity || 0,
          orderCount: subcatStats[sub.id]?.orders.size || 0,
        })).filter(s => s.revenue > 0).sort((a, b) => b.revenue - a.revenue);
      }),

    // Product Performance (Top/Bottom)
    getProductPerformance: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        categoryId: z.number().optional(),
        subcategoryId: z.number().optional(),
        orderType: z.enum(['all', 'instore', 'delivery', 'pickup']).default('all'),
        sortBy: z.enum(['revenue', 'quantity']).default('revenue'),
        limit: z.number().default(20),
        order: z.enum(['top', 'bottom']).default('top'),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];

        let conditions: any[] = [sql`${orders.orderStatus} != 'cancelled'`];
        if (input?.startDate) conditions.push(sql`${orders.createdAt} >= ${input.startDate}`);
        if (input?.endDate) conditions.push(sql`${orders.createdAt} <= ${input.endDate + ' 23:59:59'}`);
        if (input?.orderType && input.orderType !== 'all') conditions.push(eq(orders.orderType, input.orderType));

        const whereClause = and(...conditions);
        const matchingOrders = await dbInstance.select().from(orders).where(whereClause);
        const orderIds = matchingOrders.map(o => o.id);

        if (orderIds.length === 0) return [];

        const items = await dbInstance
          .select({
            productId: orderItemsTable.productId,
            productName: orderItemsTable.productName,
            quantity: orderItemsTable.quantity,
            totalPrice: orderItemsTable.lineTotal,
            subcategoryId: products.subcategoryId,
          })
          .from(orderItemsTable)
          .innerJoin(products, eq(orderItemsTable.productId, products.id))
          .where(sql`${orderItemsTable.orderId} IN (${sql.join(orderIds, sql`, `)})`);

        let filteredItems = items;
        if (input?.subcategoryId) {
          filteredItems = items.filter(i => i.subcategoryId === input.subcategoryId);
        } else if (input?.categoryId) {
          const allSubcategories = await dbInstance.select().from(subcategories);
          const subcatIds = allSubcategories.filter(s => s.categoryId === input.categoryId).map(s => s.id);
          filteredItems = items.filter(i => subcatIds.includes(i.subcategoryId));
        }

        const productStats: Record<number, { name: string; revenue: number; quantity: number }> = {};
        filteredItems.forEach(item => {
          if (!productStats[item.productId]) productStats[item.productId] = { name: item.productName, revenue: 0, quantity: 0 };
          productStats[item.productId].revenue += item.totalPrice;
          productStats[item.productId].quantity += item.quantity;
        });

        let result = Object.entries(productStats).map(([id, stats]) => ({
          id: Number(id),
          name: stats.name,
          revenue: stats.revenue,
          quantity: stats.quantity,
        }));

        const sortKey = input?.sortBy || 'revenue';
        result.sort((a, b) => input?.order === 'bottom' ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]);

        return result.slice(0, input?.limit || 20);
      }),

    // Customer Analytics
    getCustomerAnalytics: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { totalCustomers: 0, repeatCustomers: 0, repeatRate: 0, avgOrdersPerCustomer: 0, avgLifetimeValue: 0 };

        let conditions: any[] = [sql`${orders.orderStatus} != 'cancelled'`];
        if (input?.startDate) conditions.push(sql`${orders.createdAt} >= ${input.startDate}`);
        if (input?.endDate) conditions.push(sql`${orders.createdAt} <= ${input.endDate + ' 23:59:59'}`);

        const whereClause = and(...conditions);
        const matchingOrders = await dbInstance.select().from(orders).where(whereClause);

        const customerStats: Record<string, { orders: number; totalSpent: number }> = {};
        matchingOrders.forEach(order => {
          // Only count registered users (userId > 0) for repeat customer metrics
          // Guest orders (userId = 0 or null) are excluded from repeat customer calculation
          if (!order.userId || order.userId === 0) return;
          const key = `user_${order.userId}`;
          if (!customerStats[key]) customerStats[key] = { orders: 0, totalSpent: 0 };
          customerStats[key].orders += 1;
          customerStats[key].totalSpent += order.totalAmount;
        });

        const customers = Object.values(customerStats);
        const totalCustomers = customers.length;
        const repeatCustomers = customers.filter(c => c.orders > 1).length;
        const totalOrders = customers.reduce((sum, c) => sum + c.orders, 0);
        const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);

        return {
          totalCustomers,
          repeatCustomers,
          repeatRate: totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0,
          avgOrdersPerCustomer: totalCustomers > 0 ? totalOrders / totalCustomers : 0,
          avgLifetimeValue: totalCustomers > 0 ? Math.round(totalSpent / totalCustomers) : 0,
        };
      }),

    // Top Customers
    getTopCustomers: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().default(10),
        sortBy: z.enum(['totalSpent', 'orders']).default('totalSpent'),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];

        let conditions: any[] = [sql`${orders.orderStatus} != 'cancelled'`];
        if (input?.startDate) conditions.push(sql`${orders.createdAt} >= ${input.startDate}`);
        if (input?.endDate) conditions.push(sql`${orders.createdAt} <= ${input.endDate + ' 23:59:59'}`);

        const whereClause = and(...conditions);
        const matchingOrders = await dbInstance.select().from(orders).where(whereClause);

        const customerStats: Record<string, { name: string; phone: string; orders: number; totalSpent: number }> = {};
        matchingOrders.forEach(order => {
          const key = order.customerPhone || `user_${order.userId}`;
          if (!customerStats[key]) customerStats[key] = { 
            name: order.customerName || 'Guest', 
            phone: order.customerPhone || '', 
            orders: 0, 
            totalSpent: 0 
          };
          customerStats[key].orders += 1;
          customerStats[key].totalSpent += order.totalAmount;
        });

        let result = Object.values(customerStats);
        const sortKey = input?.sortBy || 'totalSpent';
        result.sort((a, b) => b[sortKey] - a[sortKey]);

        return result.slice(0, input?.limit || 10);
      }),

    // Day of Week Analysis
    getDayOfWeekAnalysis: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        categoryId: z.number().optional(),
        subcategoryId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];

        let conditions: any[] = [sql`${orders.orderStatus} != 'cancelled'`];
        if (input?.startDate) conditions.push(sql`${orders.createdAt} >= ${input.startDate}`);
        if (input?.endDate) conditions.push(sql`${orders.createdAt} <= ${input.endDate + ' 23:59:59'}`);

        const whereClause = and(...conditions);
        const matchingOrders = await dbInstance.select().from(orders).where(whereClause);

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayStats: Record<number, { revenue: number; orders: number }> = {};
        for (let i = 0; i < 7; i++) dayStats[i] = { revenue: 0, orders: 0 };

        matchingOrders.forEach(order => {
          const dayOfWeek = new Date(order.createdAt).getDay();
          dayStats[dayOfWeek].revenue += order.totalAmount;
          dayStats[dayOfWeek].orders += 1;
        });

        return dayNames.map((name, idx) => ({
          day: name,
          dayIndex: idx,
          revenue: dayStats[idx].revenue,
          orders: dayStats[idx].orders,
          avgOrderValue: dayStats[idx].orders > 0 ? Math.round(dayStats[idx].revenue / dayStats[idx].orders) : 0,
        }));
      }),

    // Peak Hours Analysis
    getPeakHoursAnalysis: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];

        let conditions: any[] = [sql`${orders.orderStatus} != 'cancelled'`];
        if (input?.startDate) conditions.push(sql`${orders.createdAt} >= ${input.startDate}`);
        if (input?.endDate) conditions.push(sql`${orders.createdAt} <= ${input.endDate + ' 23:59:59'}`);

        const whereClause = and(...conditions);
        const matchingOrders = await dbInstance.select().from(orders).where(whereClause);

        const hourStats: Record<number, { revenue: number; orders: number }> = {};
        for (let i = 0; i < 24; i++) hourStats[i] = { revenue: 0, orders: 0 };

        matchingOrders.forEach(order => {
          const hour = new Date(order.createdAt).getHours();
          hourStats[hour].revenue += order.totalAmount;
          hourStats[hour].orders += 1;
        });

        return Object.entries(hourStats).map(([hour, stats]) => ({
          hour: parseInt(hour),
          hourLabel: `${hour.padStart(2, '0')}:00 - ${String((parseInt(hour) + 1) % 24).padStart(2, '0')}:00`,
          revenue: stats.revenue,
          orders: stats.orders,
        }));
      }),

    // Daily Sales Trend
    getDailySalesTrend: adminProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        categoryId: z.number().optional(),
        subcategoryId: z.number().optional(),
        orderType: z.enum(['all', 'instore', 'delivery', 'pickup']).default('all'),
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];

        let conditions: any[] = [
          sql`${orders.orderStatus} != 'cancelled'`,
          sql`${orders.createdAt} >= ${input.startDate}`,
          sql`${orders.createdAt} <= ${input.endDate + ' 23:59:59'}`,
        ];
        if (input.orderType && input.orderType !== 'all') conditions.push(eq(orders.orderType, input.orderType));

        const whereClause = and(...conditions);
        const matchingOrders = await dbInstance.select().from(orders).where(whereClause);

        const dailyStats: Record<string, { revenue: number; orders: number }> = {};
        
        // Initialize all dates in range
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          dailyStats[dateStr] = { revenue: 0, orders: 0 };
        }

        matchingOrders.forEach(order => {
          const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
          if (dailyStats[dateStr]) {
            dailyStats[dateStr].revenue += order.totalAmount;
            dailyStats[dateStr].orders += 1;
          }
        });

        return Object.entries(dailyStats).map(([date, stats]) => ({
          date,
          revenue: stats.revenue,
          orders: stats.orders,
        })).sort((a, b) => a.date.localeCompare(b.date));
      }),

    // GST Report
    getGstReport: adminProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        groupBy: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { summary: { totalTaxableValue: 0, totalCgst: 0, totalSgst: 0, totalGst: 0 }, details: [] };

        const matchingOrders = await dbInstance
          .select()
          .from(orders)
          .where(and(
            sql`${orders.orderStatus} != 'cancelled'`,
            sql`${orders.createdAt} >= ${input.startDate}`,
            sql`${orders.createdAt} <= ${input.endDate + ' 23:59:59'}`,
          ));

        // Group by period
        const periodStats: Record<string, { taxableValue: number; gst: number; cgst: number; sgst: number; orderCount: number }> = {};
        
        matchingOrders.forEach(order => {
          let period: string;
          const orderDate = new Date(order.createdAt);
          
          if (input.groupBy === 'daily') {
            period = orderDate.toISOString().split('T')[0];
          } else if (input.groupBy === 'weekly') {
            const weekStart = new Date(orderDate);
            weekStart.setDate(orderDate.getDate() - orderDate.getDay());
            period = `Week of ${weekStart.toISOString().split('T')[0]}`;
          } else {
            period = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
          }

          if (!periodStats[period]) periodStats[period] = { taxableValue: 0, gst: 0, cgst: 0, sgst: 0, orderCount: 0 };
          
          const gstAmount = order.stateGst + order.centralGst;
          const taxableValue = order.totalAmount - gstAmount;
          periodStats[period].taxableValue += taxableValue;
          periodStats[period].gst += gstAmount;
          periodStats[period].cgst += order.centralGst;
          periodStats[period].sgst += order.stateGst;
          periodStats[period].orderCount += 1;
        });

        const details = Object.entries(periodStats).map(([period, stats]) => ({
          period,
          taxableValue: stats.taxableValue,
          cgst: stats.cgst,
          sgst: stats.sgst,
          gst: stats.gst,
          orderCount: stats.orderCount,
        })).sort((a, b) => a.period.localeCompare(b.period));

        const summary = {
          totalTaxableValue: details.reduce((sum, d) => sum + d.taxableValue, 0),
          totalCgst: details.reduce((sum, d) => sum + d.cgst, 0),
          totalSgst: details.reduce((sum, d) => sum + d.sgst, 0),
          totalGst: details.reduce((sum, d) => sum + d.gst, 0),
        };

        return { summary, details };
      }),

    // Razorpay Payment Reconciliation Report
    getRazorpayReconciliation: adminProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        period: z.enum(['daily', 'weekly', 'monthly', 'custom']).default('daily'),
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        const startDate = new Date(input.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(input.endDate);
        endDate.setHours(23, 59, 59, 999);

        // Get all Razorpay payments with their orders
        const razorpayOrders = await dbInstance
          .select({
            orderId: orders.id,
            orderNumber: orders.orderNumber,
            orderType: orders.orderType,
            customerName: orders.customerName,
            customerPhone: orders.customerPhone,
            orderTotal: orders.totalAmount,
            subtotal: orders.subtotal,
            stateGst: orders.stateGst,
            centralGst: orders.centralGst,
            deliveryCharge: orders.deliveryCharge,
            discountAmount: orders.discountAmount,
            orderStatus: orders.orderStatus,
            paymentStatus: orders.paymentStatus,
            razorpayOrderId: orders.razorpayOrderId,
            razorpayPaymentId: orders.razorpayPaymentId,
            paymentMethod: orders.paymentMethod,
            reconciliationNote: orders.reconciliationNote,
            reconciledAt: orders.reconciledAt,
            createdAt: orders.createdAt,
            paymentId: payments.id,
            paymentAmount: payments.amount,
            paymentRazorpayId: payments.razorpayPaymentId,
          })
          .from(orders)
          .leftJoin(payments, eq(orders.id, payments.orderId))
          .where(and(
            sql`${orders.createdAt} >= ${startDate}`,
            sql`${orders.createdAt} <= ${endDate}`,
            // Include ALL orders that have Razorpay payment ID OR paymentMethod is razorpay
            or(
              eq(orders.paymentMethod, 'razorpay'),
              sql`${orders.razorpayPaymentId} IS NOT NULL AND ${orders.razorpayPaymentId} != ''`
            ),
          ))
          .orderBy(desc(orders.createdAt));

        // Auto-fetch Razorpay payment amounts for orders that don't have them stored
        const { fetchPaymentDetails } = await import('./razorpay');
        const razorpayAmounts: Record<string, number> = {};
        
        for (const order of razorpayOrders) {
          const paymentId = order.razorpayPaymentId || order.paymentRazorpayId;
          if (paymentId && !razorpayAmounts[paymentId]) {
            try {
              const details = await fetchPaymentDetails(paymentId);
              razorpayAmounts[paymentId] = details.amount; // in paise
            } catch (error) {
              console.error(`Failed to fetch Razorpay payment ${paymentId}:`, error);
              razorpayAmounts[paymentId] = 0;
            }
          }
        }

        // Process each order and calculate discrepancies using actual Razorpay amounts
        const reconciliationItems = razorpayOrders.map(order => {
          const orderTotal = Number(order.orderTotal); // in paise
          const paymentId = order.razorpayPaymentId || order.paymentRazorpayId || '';
          // Use fetched Razorpay amount, fall back to DB stored amount
          const razorpayAmount = paymentId ? (razorpayAmounts[paymentId] || 0) : 0;
          const dbPaymentAmount = Number(order.paymentAmount) || 0;
          // Prefer Razorpay amount if available, otherwise use DB amount
          const actualCollected = razorpayAmount > 0 ? razorpayAmount : dbPaymentAmount;
          const discrepancy = orderTotal - actualCollected;
          const hasDiscrepancy = actualCollected > 0 && Math.abs(discrepancy) > 100; // More than ₹1 difference
          const paymentMissing = !paymentId;

          return {
            orderId: order.orderId,
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            customerName: order.customerName || 'Guest',
            customerPhone: order.customerPhone || '',
            orderTotal,
            subtotal: Number(order.subtotal),
            gst: Number(order.stateGst) + Number(order.centralGst),
            deliveryCharge: Number(order.deliveryCharge),
            discountAmount: Number(order.discountAmount) || 0,
            paymentAmount: actualCollected, // Now contains actual Razorpay amount
            razorpayAmount, // Explicit Razorpay fetched amount
            dbPaymentAmount, // What was stored in DB
            discrepancy,
            hasDiscrepancy,
            paymentMissing,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            razorpayOrderId: order.razorpayOrderId || '',
            razorpayPaymentId: paymentId,
            paymentMethod: order.paymentMethod || 'unknown',
            reconciliationNote: order.reconciliationNote || null,
            reconciledAt: order.reconciledAt || null,
            isReconciled: !!order.reconciledAt && !order.reconciliationNote?.startsWith('[WRITE-OFF]'),
            isWrittenOff: !!order.reconciledAt && order.reconciliationNote?.startsWith('[WRITE-OFF]'),
            createdAt: order.createdAt,
          };
        });

        // Calculate summary statistics
        const totalOrders = reconciliationItems.length;
        const totalExpected = reconciliationItems.reduce((sum, item) => sum + item.orderTotal, 0);
        const totalCollected = reconciliationItems.reduce((sum, item) => sum + item.paymentAmount, 0);
        const totalDiscrepancy = totalExpected - totalCollected;
        const ordersWithDiscrepancy = reconciliationItems.filter(item => item.hasDiscrepancy || item.paymentMissing);
        const discrepancyCount = ordersWithDiscrepancy.length;
        const discrepancyAmount = ordersWithDiscrepancy.reduce((sum, item) => sum + item.discrepancy, 0);

        // Group by date for daily breakdown
        const dailyBreakdown: Record<string, { orders: number; expected: number; collected: number; discrepancy: number }> = {};
        reconciliationItems.forEach(item => {
          const dateStr = new Date(item.createdAt).toISOString().split('T')[0];
          if (!dailyBreakdown[dateStr]) {
            dailyBreakdown[dateStr] = { orders: 0, expected: 0, collected: 0, discrepancy: 0 };
          }
          dailyBreakdown[dateStr].orders++;
          dailyBreakdown[dateStr].expected += item.orderTotal;
          dailyBreakdown[dateStr].collected += item.paymentAmount;
          dailyBreakdown[dateStr].discrepancy += item.discrepancy;
        });

        const dailySummary = Object.entries(dailyBreakdown)
          .map(([date, stats]) => ({ date, ...stats }))
          .sort((a, b) => a.date.localeCompare(b.date));

        return {
          items: reconciliationItems,
          summary: {
            totalOrders,
            totalExpected,
            totalCollected,
            totalDiscrepancy,
            discrepancyCount,
            discrepancyAmount,
          },
          dailySummary,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        };
      }),

    // Fetch actual payment amount from Razorpay API
    fetchRazorpayPaymentDetails: adminProcedure
      .input(z.object({ paymentId: z.string() }))
      .query(async ({ input }) => {
        try {
          const { fetchPaymentDetails } = await import('./razorpay');
          const paymentDetails = await fetchPaymentDetails(input.paymentId);
          return {
            success: true,
            payment: {
              id: paymentDetails.id,
              amount: paymentDetails.amount, // in paise
              currency: paymentDetails.currency,
              status: paymentDetails.status,
              method: paymentDetails.method,
              email: paymentDetails.email,
              contact: paymentDetails.contact,
              createdAt: new Date(paymentDetails.created_at * 1000).toISOString(),
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch payment details',
          };
        }
      }),

    // Mark an order as reconciled (discrepancy resolved) or written off (loss accepted)
    markOrderReconciled: adminProcedure
      .input(z.object({
        orderId: z.number(),
        note: z.string().min(1, 'Note is required'),
        isWriteOff: z.boolean().optional().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        const [order] = await dbInstance
          .select({ id: orders.id, orderNumber: orders.orderNumber })
          .from(orders)
          .where(eq(orders.id, input.orderId));
        
        if (!order) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        }

        // Prefix note with type for clarity
        const notePrefix = input.isWriteOff ? '[WRITE-OFF] ' : '[RECONCILED] ';
        const fullNote = notePrefix + input.note;

        await dbInstance
          .update(orders)
          .set({
            reconciliationNote: fullNote,
            reconciledAt: new Date(),
            reconciledBy: ctx.user.id,
          })
          .where(eq(orders.id, input.orderId));

        const action = input.isWriteOff ? 'written off' : 'marked as reconciled';
        return {
          success: true,
          orderNumber: order.orderNumber,
          message: `Order ${order.orderNumber} ${action}`,
        };
      }),

    // Bulk fetch Razorpay payment details for reconciliation
    bulkFetchRazorpayPayments: adminProcedure
      .input(z.object({ paymentIds: z.array(z.string()) }))
      .mutation(async ({ input }) => {
        const { fetchPaymentDetails } = await import('./razorpay');
        const results: Record<string, { amount: number; status: string; error?: string }> = {};

        for (const paymentId of input.paymentIds) {
          try {
            const details = await fetchPaymentDetails(paymentId);
            results[paymentId] = {
              amount: details.amount,
              status: details.status,
            };
          } catch (error) {
            results[paymentId] = {
              amount: 0,
              status: 'error',
              error: error instanceof Error ? error.message : 'Failed to fetch',
            };
          }
        }

        return results;
      }),
  }),

  // Customer management routes
  customers: router({
    // Get all customers (registered users + aggregated guest data)
    getAll: adminProcedure
      .input(z.object({
        search: z.string().optional(),
        type: z.enum(['all', 'registered', 'guest']).default('all'),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { customers: [], total: 0 };

        // Get registered users (exclude staff and admin)
        let registeredUsers: any[] = [];
        if (input?.type !== 'guest') {
          // Filter to only show customers (exclude staff and admin roles)
          const roleFilter = sql`(${users.role} = 'user' OR ${users.role} = 'customer' OR ${users.role} IS NULL)`;
          
          if (input?.search) {
            registeredUsers = await dbInstance.select().from(users).where(
              and(
                roleFilter,
                or(
                  sql`${users.name} LIKE ${`%${input.search}%`}`,
                  sql`${users.phone} LIKE ${`%${input.search}%`}`,
                  sql`${users.email} LIKE ${`%${input.search}%`}`
                )
              )
            );
          } else {
            registeredUsers = await dbInstance.select().from(users).where(roleFilter);
          }
        }

        // Get order stats for registered users
        const userOrderStats: Record<number, { orders: number; totalSpent: number; lastOrder: Date | null }> = {};
        const allOrders = await dbInstance.select().from(orders).where(sql`${orders.orderStatus} != 'cancelled'`);
        
        allOrders.forEach(order => {
          if (order.userId && order.userId > 0) {
            if (!userOrderStats[order.userId]) {
              userOrderStats[order.userId] = { orders: 0, totalSpent: 0, lastOrder: null };
            }
            userOrderStats[order.userId].orders += 1;
            userOrderStats[order.userId].totalSpent += order.totalAmount;
            if (!userOrderStats[order.userId].lastOrder || new Date(order.createdAt) > userOrderStats[order.userId].lastOrder!) {
              userOrderStats[order.userId].lastOrder = new Date(order.createdAt);
            }
          }
        });

        // Build registered customer list
        const registeredCustomers = registeredUsers.map(user => ({
          id: user.id,
          type: 'registered' as const,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          storeCredit: user.storeCredit || 0,
          loyaltyPoints: user.loyaltyPoints || 0,
          stampCount: user.stampCount || 0,
          totalOrders: userOrderStats[user.id]?.orders || 0,
          totalSpent: userOrderStats[user.id]?.totalSpent || 0,
          lastOrderDate: userOrderStats[user.id]?.lastOrder?.toISOString() || null,
          createdAt: user.createdAt,
        }));

        // Get guest customers (aggregated from orders)
        let guestCustomers: any[] = [];
        if (input?.type !== 'registered') {
          const guestStats: Record<string, { name: string; phone: string; orders: number; totalSpent: number; lastOrder: Date | null }> = {};
          
          allOrders.forEach(order => {
            if ((!order.userId || order.userId === 0) && order.customerPhone) {
              const key = order.customerPhone;
              if (!guestStats[key]) {
                guestStats[key] = { 
                  name: order.customerName || 'Guest', 
                  phone: order.customerPhone,
                  orders: 0, 
                  totalSpent: 0,
                  lastOrder: null
                };
              }
              guestStats[key].orders += 1;
              guestStats[key].totalSpent += order.totalAmount;
              if (order.customerName && guestStats[key].name === 'Guest') {
                guestStats[key].name = order.customerName;
              }
              if (!guestStats[key].lastOrder || new Date(order.createdAt) > guestStats[key].lastOrder!) {
                guestStats[key].lastOrder = new Date(order.createdAt);
              }
            }
          });

          guestCustomers = Object.entries(guestStats)
            .filter(([phone]) => !input?.search || phone.includes(input.search) || guestStats[phone].name.toLowerCase().includes(input.search.toLowerCase()))
            .map(([phone, stats]) => ({
              id: `guest_${phone}`,
              type: 'guest' as const,
              name: stats.name,
              email: null,
              phone: stats.phone,
              role: null,
              storeCredit: 0,
              loyaltyPoints: 0,
              stampCount: 0,
              totalOrders: stats.orders,
              totalSpent: stats.totalSpent,
              lastOrderDate: stats.lastOrder?.toISOString() || null,
              createdAt: null,
            }));
        }

        // Combine and sort
        let allCustomers = [...registeredCustomers, ...guestCustomers];
        allCustomers.sort((a, b) => b.totalSpent - a.totalSpent);

        const total = allCustomers.length;
        const customers = allCustomers.slice(input?.offset || 0, (input?.offset || 0) + (input?.limit || 100));

        return { customers, total };
      }),

    // Add a new customer manually
    create: adminProcedure
      .input(z.object({
        name: z.string(),
        phone: z.string(),
        email: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        // Check if phone already exists
        const existing = await dbInstance.select().from(users).where(eq(users.phone, input.phone));
        if (existing.length > 0) {
          throw new TRPCError({ code: 'CONFLICT', message: 'A customer with this phone number already exists' });
        }

        // Create a new user with a placeholder openId
        const [result] = await dbInstance.insert(users).values({
          openId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: input.name,
          phone: input.phone,
          email: input.email || null,
          loginMethod: 'manual',
          role: 'customer',
        });

        return { success: true, customerId: result.insertId };
      }),

    // Update customer details
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        storeCredit: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const { id, ...updateData } = input;
        const cleanData = Object.fromEntries(
          Object.entries(updateData).filter(([_, v]) => v !== undefined)
        );

        if (Object.keys(cleanData).length > 0) {
          await dbInstance.update(users).set(cleanData).where(eq(users.id, id));
        }

        return { success: true };
      }),

    // Add stamps to customer (for transferring physical loyalty card stamps to digital)
    addStamps: staffProcedure
      .input(z.object({
        customerId: z.number(),
        stamps: z.number().min(1).max(10),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        // Get current user
        const [customer] = await dbInstance.select().from(users).where(eq(users.id, input.customerId));
        if (!customer) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found' });
        }

        // Don't allow adding stamps to staff/admin accounts
        if (customer.role === 'staff' || customer.role === 'admin') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot add stamps to staff or admin accounts' });
        }

        // Update stamp count
        const newStampCount = (customer.stampCount || 0) + input.stamps;
        const newLifetimeStamps = (customer.lifetimeStamps || 0) + input.stamps;

        await dbInstance.update(users).set({
          stampCount: newStampCount,
          lifetimeStamps: newLifetimeStamps,
          lastStampDate: new Date(),
        }).where(eq(users.id, input.customerId));

        // Record the stamp transaction
        const { stampTransactions } = await import('../drizzle/schema.js');
        await dbInstance.insert(stampTransactions).values({
          userId: input.customerId,
          orderId: null,
          action: 'bonus',
          stamps: input.stamps,
          orderTotal: 0,
          description: input.reason || `Physical card transfer by ${ctx.user.name}`,
          createdAt: new Date(),
        });

        return { 
          success: true, 
          newStampCount,
          message: `Added ${input.stamps} stamps to ${customer.name}'s account` 
        };
      }),

    // Get customer order history
    getOrderHistory: adminProcedure
      .input(z.object({
        customerId: z.number().optional(),
        customerPhone: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];

        let customerOrders;
        if (input.customerId) {
          customerOrders = await dbInstance.select().from(orders)
            .where(eq(orders.userId, input.customerId))
            .orderBy(desc(orders.createdAt));
        } else if (input.customerPhone) {
          customerOrders = await dbInstance.select().from(orders)
            .where(eq(orders.customerPhone, input.customerPhone))
            .orderBy(desc(orders.createdAt));
        } else {
          return [];
        }

        return customerOrders;
      }),
  }),

  // CMS (Content Management System) routes for editable content pages
  cms: router({
    // Get page content by key
    getContent: publicProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return null;
        const { siteSettings } = await import('../drizzle/schema.js');
        const [content] = await dbInstance.select().from(siteSettings).where(eq(siteSettings.key, `cms_${input.key}`));
        return content?.value || null;
      }),

    // Get all CMS content
    getAllContent: adminProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { siteSettings } = await import('../drizzle/schema.js');
      const allSettings = await dbInstance.select().from(siteSettings).where(sql`${siteSettings.key} LIKE 'cms_%'`);
      return allSettings.map(s => ({ key: s.key.replace('cms_', ''), value: s.value, updatedAt: s.updatedAt }));
    }),

    // Update page content
    updateContent: adminProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { siteSettings } = await import('../drizzle/schema.js');
        const fullKey = `cms_${input.key}`;
        
        const [existing] = await dbInstance.select().from(siteSettings).where(eq(siteSettings.key, fullKey));
        if (existing) {
          await dbInstance.update(siteSettings).set({ value: input.value }).where(eq(siteSettings.key, fullKey));
        } else {
          await dbInstance.insert(siteSettings).values({ key: fullKey, value: input.value });
        }
        return { success: true };
      }),
  }),

  // Admin PIN management for discount authorization
  adminPin: router({
    // Check if current admin has a PIN set
    hasPin: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') return false;
      const dbInstance = await getDb();
      if (!dbInstance) return false;
      const { adminPins } = await import('../drizzle/schema.js');
      const [pin] = await dbInstance.select().from(adminPins).where(and(eq(adminPins.userId, ctx.user.id), eq(adminPins.isActive, true)));
      return !!pin;
    }),

    // Set or update admin PIN
    setPin: adminProcedure
      .input(z.object({ pin: z.string().length(4).regex(/^\d{4}$/) }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { adminPins } = await import('../drizzle/schema.js');
        const crypto = await import('crypto');
        const pinHash = crypto.createHash('sha256').update(input.pin).digest('hex');
        
        // Deactivate existing PINs
        await dbInstance.update(adminPins).set({ isActive: false }).where(eq(adminPins.userId, ctx.user.id));
        
        // Create new PIN
        await dbInstance.insert(adminPins).values({ userId: ctx.user.id, pinHash, isActive: true });
        return { success: true };
      }),

    // Verify PIN for discount authorization
    verifyPin: publicProcedure
      .input(z.object({ adminId: z.number(), pin: z.string() }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { adminPins } = await import('../drizzle/schema.js');
        const crypto = await import('crypto');
        const pinHash = crypto.createHash('sha256').update(input.pin).digest('hex');
        
        const [pin] = await dbInstance.select().from(adminPins).where(
          and(eq(adminPins.userId, input.adminId), eq(adminPins.pinHash, pinHash), eq(adminPins.isActive, true))
        );
        
        if (!pin) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid PIN' });
        }
        return { success: true };
      }),

    // Get list of admins (for PIN selection)
    getAdmins: publicProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { adminPins } = await import('../drizzle/schema.js');
      
      const admins = await dbInstance.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, 'admin'));
      const pinsSet = await dbInstance.select({ userId: adminPins.userId }).from(adminPins).where(eq(adminPins.isActive, true));
      const adminIdsWithPin = new Set(pinsSet.map(p => p.userId));
      
      return admins.filter(a => adminIdsWithPin.has(a.id)).map(a => ({ id: a.id, name: a.name || 'Admin' }));
    }),

    // Log discount authorization
    logAuthorization: publicProcedure
      .input(z.object({
        orderId: z.number().optional(),
        orderNumber: z.string().optional(),
        discountAmount: z.number(),
        discountReason: z.string().optional(),
        authorizedBy: z.number(),
        authorizedByName: z.string(),
        requestedBy: z.number().optional(),
        requestedByName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { discountAuthorizations } = await import('../drizzle/schema.js');
        
        await dbInstance.insert(discountAuthorizations).values(input);
        return { success: true };
      }),
  }),

  // Refund approval workflow
  refunds: router({
    // Staff: Request a refund
    requestRefund: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        orderNumber: z.string(),
        refundAmount: z.number(),
        refundReason: z.string(),
        refundType: z.enum(['full', 'partial', 'store_credit']),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { refundRequests } = await import('../drizzle/schema.js');
        
        const [request] = await dbInstance.insert(refundRequests).values({
          orderId: input.orderId,
          orderNumber: input.orderNumber,
          refundAmount: input.refundAmount,
          refundReason: input.refundReason,
          refundType: input.refundType,
          requestedBy: ctx.user.id,
          requestedByName: ctx.user.name || 'Staff',
          status: 'pending',
        }).$returningId();
        
        // Notify admins
        try {
          await notifyOwner({
            title: '🔔 Refund Request Pending',
            content: `Order #${input.orderNumber}\nAmount: ₹${(input.refundAmount / 100).toFixed(2)}\nType: ${input.refundType}\nReason: ${input.refundReason}\nRequested by: ${ctx.user.name || 'Staff'}\n\nPlease review in the admin panel.`
          });
        } catch (e) {}
        
        return { success: true, requestId: request.id };
      }),

    // Admin: Get pending refund requests
    getPending: adminProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { refundRequests } = await import('../drizzle/schema.js');
      
      return dbInstance.select().from(refundRequests).where(eq(refundRequests.status, 'pending')).orderBy(desc(refundRequests.createdAt));
    }),

    // Admin: Get all refund requests
    getAll: adminProcedure
      .input(z.object({
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        limit: z.number().default(50),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];
        const { refundRequests } = await import('../drizzle/schema.js');
        
        let query = dbInstance.select().from(refundRequests);
        if (input?.status) {
          query = query.where(eq(refundRequests.status, input.status)) as any;
        }
        return query.orderBy(desc(refundRequests.createdAt)).limit(input?.limit || 50);
      }),

    // Admin: Approve or reject refund
    review: adminProcedure
      .input(z.object({
        requestId: z.number(),
        action: z.enum(['approve', 'reject']),
        reviewNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { refundRequests } = await import('../drizzle/schema.js');
        
        // Get the request
        const [request] = await dbInstance.select().from(refundRequests).where(eq(refundRequests.id, input.requestId));
        if (!request) throw new TRPCError({ code: 'NOT_FOUND', message: 'Refund request not found' });
        if (request.status !== 'pending') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Request already processed' });
        
        const newStatus = input.action === 'approve' ? 'approved' : 'rejected';
        
        await dbInstance.update(refundRequests).set({
          status: newStatus,
          reviewedBy: ctx.user.id,
          reviewedByName: ctx.user.name || 'Admin',
          reviewedAt: new Date(),
          reviewNotes: input.reviewNotes || null,
        }).where(eq(refundRequests.id, input.requestId));
        
        // If approved and store_credit, add to user's balance
        if (input.action === 'approve' && request.refundType === 'store_credit') {
          const [order] = await dbInstance.select().from(orders).where(eq(orders.id, request.orderId));
          if (order?.userId) {
            await dbInstance.update(users).set({
              storeCredit: sql`${users.storeCredit} + ${request.refundAmount}`,
            }).where(eq(users.id, order.userId));
          }
        }
        
        return { success: true, status: newStatus };
      }),

    // Get pending count for badge
    getPendingCount: adminProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return 0;
      const { refundRequests } = await import('../drizzle/schema.js');
      
      const [result] = await dbInstance.select({ count: sql<number>`COUNT(*)` }).from(refundRequests).where(eq(refundRequests.status, 'pending'));
      return Number(result?.count || 0);
    }),

    // End-of-day reconciliation report
    getEndOfDayReport: adminProcedure
      .input(z.object({
        date: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return null;

        const reportDate = input?.date ? new Date(input.date) : new Date();
        const startOfDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate(), 0, 0, 0);
        const endOfDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate(), 23, 59, 59);

        const completedOrders = await dbInstance
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.orderStatus, 'completed'),
              sql`${orders.createdAt} >= ${startOfDay.toISOString()}`,
              sql`${orders.createdAt} <= ${endOfDay.toISOString()}`
            )
          )
          .orderBy(desc(orders.createdAt));

        let totalSubtotal = 0;
        let totalGst = 0;
        let totalCollected = 0;
        let cashOrders = 0;
        let onlineOrders = 0;
        let discrepancies = [];

        for (const order of completedOrders) {
          totalSubtotal += order.subtotal || 0;
          totalGst += (order.stateGst || 0) + (order.centralGst || 0);
          totalCollected += order.totalAmount || 0;

          if (order.paymentMethod === 'cash') {
            cashOrders++;
          } else if (order.paymentMethod === 'razorpay' || order.paymentMethod === 'upi' || order.paymentMethod === 'card') {
            onlineOrders++;
          }

          const expectedTotal = (order.subtotal || 0) + (order.stateGst || 0) + (order.centralGst || 0);
          if (order.totalAmount !== expectedTotal) {
            discrepancies.push({
              orderNumber: order.orderNumber,
              subtotal: order.subtotal,
              gst: (order.stateGst || 0) + (order.centralGst || 0),
              expected: expectedTotal,
              actual: order.totalAmount,
              difference: order.totalAmount - expectedTotal,
            });
          }
        }

        return {
          date: reportDate.toISOString().split('T')[0],
          summary: {
            totalOrders: completedOrders.length,
            cashOrders,
            onlineOrders,
            totalSubtotal,
            totalGst,
            totalCollected,
            expectedTotal: totalSubtotal + totalGst,
            discrepancy: totalCollected - (totalSubtotal + totalGst),
          },
          discrepancies,
          orders: completedOrders.map(o => ({
            orderNumber: o.orderNumber,
            customerName: o.customerName || 'Guest',
            orderType: o.orderType,
            paymentMethod: o.paymentMethod,
            subtotal: o.subtotal,
            gst: (o.stateGst || 0) + (o.centralGst || 0),
            total: o.totalAmount,
            createdAt: o.createdAt,
          })),
        };
      }),
  }),

  // Events & Catering
  events: router({
    // Submit a new event inquiry (public)
    submitInquiry: publicProcedure
      .input(z.object({
        customerName: z.string().min(1),
        customerEmail: z.string().email(),
        customerPhone: z.string().min(10),
        companyName: z.string().optional(),
        eventType: z.enum(["wedding", "corporate", "school", "private", "other"]),
        eventDate: z.string(),
        eventTime: z.string().optional(),
        venue: z.string().min(1),
        guestCount: z.number().min(1),
        cateringType: z.enum(["beverages_only", "food_only", "both"]),
        preferredItems: z.string().optional(),
        budgetRange: z.string().optional(),
        specialRequirements: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const result = await database.insert(eventInquiries).values({
          ...input,
          companyName: input.companyName || null,
          eventTime: input.eventTime || null,
          preferredItems: input.preferredItems || null,
          budgetRange: input.budgetRange || null,
          specialRequirements: input.specialRequirements || null,
        });
        
        // Notify owner about new inquiry
        await notifyOwner({
          title: `New Event Inquiry: ${input.eventType}`,
          content: `New event inquiry from ${input.customerName} (${input.customerEmail})\n\nEvent: ${input.eventType}\nDate: ${input.eventDate}\nVenue: ${input.venue}\nGuests: ${input.guestCount}\nCatering: ${input.cateringType}`,
        });
        
        return { success: true, id: result[0].insertId };
      }),

    // Get all inquiries (admin)
    getInquiries: adminProcedure
      .input(z.object({
        status: z.enum(["new", "contacted", "quoted", "confirmed", "cancelled", "all"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const statusFilter = input?.status;
        
        if (statusFilter && statusFilter !== "all") {
          return database.select().from(eventInquiries)
            .where(eq(eventInquiries.status, statusFilter))
            .orderBy(desc(eventInquiries.createdAt));
        }
        return database.select().from(eventInquiries)
          .orderBy(desc(eventInquiries.createdAt));
      }),

    // Update inquiry status (admin)
    updateInquiryStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "quoted", "confirmed", "cancelled"]),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        await database.update(eventInquiries)
          .set({ 
            status: input.status,
            adminNotes: input.adminNotes || null,
          })
          .where(eq(eventInquiries.id, input.id));
        return { success: true };
      }),

    // Create event order from inquiry (admin)
    createOrder: adminProcedure
      .input(z.object({
        inquiryId: z.number().optional(),
        customerName: z.string().min(1),
        customerEmail: z.string().email(),
        customerPhone: z.string().min(10),
        companyName: z.string().optional(),
        eventType: z.enum(["wedding", "corporate", "school", "private", "other"]),
        eventDate: z.string(),
        eventTime: z.string().optional(),
        venue: z.string().min(1),
        guestCount: z.number().min(1),
        advancePercentage: z.number().min(0).max(100).default(50),
      }))
      .mutation(async ({ input, ctx }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const orderNumber = `EVT${Date.now().toString(36).toUpperCase()}`;
        
        const result = await database.insert(eventOrders).values({
          inquiryId: input.inquiryId || null,
          orderNumber,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          companyName: input.companyName || null,
          eventType: input.eventType,
          eventDate: input.eventDate,
          eventTime: input.eventTime || null,
          venue: input.venue,
          guestCount: input.guestCount,
          advancePercentage: input.advancePercentage,
          createdBy: ctx.user.id,
        });
        
        // Update inquiry status if linked
        if (input.inquiryId) {
          await database.update(eventInquiries)
            .set({ status: "quoted" })
            .where(eq(eventInquiries.id, input.inquiryId));
        }
        
        return { success: true, orderNumber, id: result[0].insertId };
      }),

    // Get all event orders (admin)
    getOrders: adminProcedure
      .input(z.object({
        status: z.enum(["draft", "quoted", "confirmed", "in_progress", "completed", "cancelled", "all"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const statusFilter = input?.status;
        
        if (statusFilter && statusFilter !== "all") {
          return database.select().from(eventOrders)
            .where(eq(eventOrders.status, statusFilter))
            .orderBy(desc(eventOrders.createdAt));
        }
        return database.select().from(eventOrders)
          .orderBy(desc(eventOrders.createdAt));
      }),

    // Get single event order with items (admin)
    getOrder: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const order = await database.select().from(eventOrders)
          .where(eq(eventOrders.id, input.id))
          .limit(1);
        
        if (!order.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Event order not found" });
        }
        
        const items = await database.select().from(eventOrderItems)
          .where(eq(eventOrderItems.eventOrderId, input.id));
        
        return { order: order[0], items };
      }),

    // Add item to event order (admin)
    addOrderItem: adminProcedure
      .input(z.object({
        eventOrderId: z.number(),
        itemType: z.enum(["beverage", "food", "staff", "delivery", "equipment", "other"]),
        itemName: z.string().min(1),
        description: z.string().optional(),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0), // in paise
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const totalPrice = input.quantity * input.unitPrice;
        
        await database.insert(eventOrderItems).values({
          eventOrderId: input.eventOrderId,
          itemType: input.itemType,
          itemName: input.itemName,
          description: input.description || null,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          totalPrice,
        });
        
        // Recalculate order totals
        const items = await database.select().from(eventOrderItems)
          .where(eq(eventOrderItems.eventOrderId, input.eventOrderId));
        
        const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const gstAmount = Math.round(subtotal * 0.18); // 18% GST
        const totalAmount = subtotal + gstAmount;
        
        const order = await database.select().from(eventOrders)
          .where(eq(eventOrders.id, input.eventOrderId))
          .limit(1);
        
        const advanceAmount = Math.round(totalAmount * (order[0].advancePercentage / 100));
        const balanceAmount = totalAmount - advanceAmount;
        
        await database.update(eventOrders)
          .set({ 
            subtotal,
            gstAmount,
            totalAmount,
            advanceAmount,
            balanceAmount,
          })
          .where(eq(eventOrders.id, input.eventOrderId));
        
        return { success: true };
      }),

    // Remove item from event order (admin)
    removeOrderItem: adminProcedure
      .input(z.object({ itemId: z.number(), eventOrderId: z.number() }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        await database.delete(eventOrderItems)
          .where(eq(eventOrderItems.id, input.itemId));
        
        // Recalculate order totals
        const items = await database.select().from(eventOrderItems)
          .where(eq(eventOrderItems.eventOrderId, input.eventOrderId));
        
        const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const gstAmount = Math.round(subtotal * 0.18);
        const totalAmount = subtotal + gstAmount;
        
        const order = await database.select().from(eventOrders)
          .where(eq(eventOrders.id, input.eventOrderId))
          .limit(1);
        
        const advanceAmount = Math.round(totalAmount * (order[0].advancePercentage / 100));
        const balanceAmount = totalAmount - advanceAmount;
        
        await database.update(eventOrders)
          .set({ 
            subtotal,
            gstAmount,
            totalAmount,
            advanceAmount,
            balanceAmount,
          })
          .where(eq(eventOrders.id, input.eventOrderId));
        
        return { success: true };
      }),

    // Update event order status (admin)
    updateOrderStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "quoted", "confirmed", "in_progress", "completed", "cancelled"]),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        await database.update(eventOrders)
          .set({ status: input.status })
          .where(eq(eventOrders.id, input.id));
        return { success: true };
      }),

    // Record payment for event order (admin)
    recordPayment: adminProcedure
      .input(z.object({
        id: z.number(),
        paymentType: z.enum(["advance", "balance"]),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const now = new Date();
        
        if (input.paymentType === "advance") {
          await database.update(eventOrders)
            .set({ advancePaid: true, advancePaidAt: now, status: "confirmed" })
            .where(eq(eventOrders.id, input.id));
        } else {
          await database.update(eventOrders)
            .set({ balancePaid: true, balancePaidAt: now, status: "completed" })
            .where(eq(eventOrders.id, input.id));
        }
        
        return { success: true };
      }),

    // Delete event inquiry (admin)
    deleteInquiry: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        // Check if inquiry has linked orders
        const linkedOrders = await database.select().from(eventOrders)
          .where(eq(eventOrders.inquiryId, input.id));
        
        if (linkedOrders.length > 0) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: `Cannot delete inquiry with ${linkedOrders.length} linked order(s). Please delete the orders first.` 
          });
        }
        
        await database.delete(eventInquiries).where(eq(eventInquiries.id, input.id));
        return { success: true };
      }),

    // Delete event order (admin)
    deleteOrder: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        // Delete order items first
        await database.delete(eventOrderItems).where(eq(eventOrderItems.eventOrderId, input.id));
        
        // Delete the order
        await database.delete(eventOrders).where(eq(eventOrders.id, input.id));
        return { success: true };
      }),
  }),

  // Workshops & Ticketing
  workshops: router({
    // Get all published workshops (public)
    // Shows all published workshops - date filtering removed to allow flexibility
    // Workshops with past dates can still be shown for reference or rescheduling
    getPublished: publicProcedure.query(async () => {
      const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const result = await database.select().from(workshops)
        .where(eq(workshops.status, "published"))
        .orderBy(asc(workshops.workshopDate));
      return serializeDateArray(result);
    }),

    // Get single workshop (public)
    getWorkshop: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const workshop = await database.select().from(workshops)
          .where(eq(workshops.id, input.id))
          .limit(1);
        
        if (!workshop.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Workshop not found" });
        }
        
        return serializeDates(workshop[0]);
      }),

    // Get available dates for a workshop (public)
    getWorkshopDates: publicProcedure
      .input(z.object({ workshopId: z.number() }))
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const dates = await database.select().from(workshopDates)
          .where(and(
            eq(workshopDates.workshopId, input.workshopId),
            eq(workshopDates.isActive, true)
          ))
          .orderBy(asc(workshopDates.sessionDate));
        
        // Return dates with availability info
        return dates.map(d => ({
          id: d.id,
          sessionDate: d.sessionDate instanceof Date ? d.sessionDate.toISOString().split('T')[0] : String(d.sessionDate),
          startTime: d.startTime,
          endTime: d.endTime,
          maxCapacity: d.maxCapacity,
          bookedCount: d.bookedCount,
          availableSeats: d.maxCapacity - d.bookedCount,
          isSoldOut: d.bookedCount >= d.maxCapacity,
        }));
      }),

    // Join waitlist for sold-out workshop date (public)
    joinWaitlist: publicProcedure
      .input(z.object({
        workshopId: z.number(),
        workshopDateId: z.number(),
        customerName: z.string().min(1),
        customerEmail: z.string().email(),
        customerPhone: z.string().min(10),
        ticketCount: z.number().min(1).max(5),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        // Verify the date is actually sold out
        const dateInfo = await database.select().from(workshopDates)
          .where(eq(workshopDates.id, input.workshopDateId))
          .limit(1);
        
        if (!dateInfo.length) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Workshop date not found' });
        }
        
        if (dateInfo[0].bookedCount < dateInfo[0].maxCapacity) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This date still has available spots. Please book directly.' });
        }
        
        // Check if customer is already on waitlist for this date
        const existingEntry = await database.select().from(workshopWaitlist)
          .where(and(
            eq(workshopWaitlist.workshopDateId, input.workshopDateId),
            eq(workshopWaitlist.customerEmail, input.customerEmail),
            eq(workshopWaitlist.status, 'waiting')
          ))
          .limit(1);
        
        if (existingEntry.length) {
          throw new TRPCError({ code: 'CONFLICT', message: 'You are already on the waitlist for this date.' });
        }
        
        // Add to waitlist
        const result = await database.insert(workshopWaitlist).values({
          workshopId: input.workshopId,
          workshopDateId: input.workshopDateId,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          ticketCount: input.ticketCount,
          status: 'waiting',
        });
        
        // Get position in waitlist
        const position = await database.select({ count: sql<number>`count(*)` })
          .from(workshopWaitlist)
          .where(and(
            eq(workshopWaitlist.workshopDateId, input.workshopDateId),
            eq(workshopWaitlist.status, 'waiting')
          ));
        
        return {
          success: true,
          position: position[0]?.count || 1,
          message: `You've been added to the waitlist. Your position is #${position[0]?.count || 1}.`
        };
      }),

    // Get waitlist position for a customer (public)
    getWaitlistPosition: publicProcedure
      .input(z.object({
        workshopDateId: z.number(),
        customerEmail: z.string().email(),
      }))
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const entry = await database.select().from(workshopWaitlist)
          .where(and(
            eq(workshopWaitlist.workshopDateId, input.workshopDateId),
            eq(workshopWaitlist.customerEmail, input.customerEmail),
            eq(workshopWaitlist.status, 'waiting')
          ))
          .limit(1);
        
        if (!entry.length) {
          return { onWaitlist: false, position: null };
        }
        
        // Count entries before this one
        const position = await database.select({ count: sql<number>`count(*)` })
          .from(workshopWaitlist)
          .where(and(
            eq(workshopWaitlist.workshopDateId, input.workshopDateId),
            eq(workshopWaitlist.status, 'waiting'),
            sql`${workshopWaitlist.createdAt} <= ${entry[0].createdAt}`
          ));
        
        return {
          onWaitlist: true,
          position: position[0]?.count || 1,
          ticketCount: entry[0].ticketCount,
        };
      }),

    // Get waitlist entries for admin (admin only)
    getWaitlistEntries: adminProcedure
      .input(z.object({ workshopDateId: z.number() }))
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const entries = await database.select().from(workshopWaitlist)
          .where(eq(workshopWaitlist.workshopDateId, input.workshopDateId))
          .orderBy(asc(workshopWaitlist.createdAt));
        
        return entries;
      }),

    // Book workshop tickets (public)
    // Create workshop booking and Razorpay order
    bookTickets: publicProcedure
      .input(z.object({
        workshopId: z.number(),
        workshopDateId: z.number().optional(), // Optional for backwards compatibility
        customerName: z.string().min(1),
        customerEmail: z.string().email(),
        customerPhone: z.string().min(10),
        ticketCount: z.number().min(1).max(5),
        specialRequirements: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        // Get workshop and check availability
        const workshop = await database.select().from(workshops)
          .where(eq(workshops.id, input.workshopId))
          .limit(1);
        
        if (!workshop.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Workshop not found" });
        }
        
        const w = workshop[0];
        
        // Check if workshop has multiple dates
        let selectedDate = null;
        let availableSeats = 0;
        
        if (input.workshopDateId) {
          // Multi-date workshop - check specific date availability
          const [dateRecord] = await database.select().from(workshopDates)
            .where(and(
              eq(workshopDates.id, input.workshopDateId),
              eq(workshopDates.workshopId, input.workshopId),
              eq(workshopDates.isActive, true)
            ));
          
          if (!dateRecord) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Selected date not available" });
          }
          
          selectedDate = dateRecord;
          availableSeats = dateRecord.maxCapacity - dateRecord.bookedCount;
        } else {
          // Legacy single-date workshop - use workshop's own capacity
          if (!w.totalCapacity || w.bookedCount === null) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid workshop data" });
          }
          availableSeats = w.totalCapacity - w.bookedCount;
        }
        
        if (input.ticketCount > availableSeats) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: availableSeats === 0 
              ? "Sorry, this date is sold out!" 
              : `Only ${availableSeats} seats available for this date` 
          });
        }
        
        // Check early bird pricing
        const today = new Date().toISOString().split('T')[0];
        const deadlineStr = w.earlyBirdDeadline instanceof Date 
          ? w.earlyBirdDeadline.toISOString().split('T')[0]
          : String(w.earlyBirdDeadline);
        const isEarlyBird = w.earlyBirdPrice && w.earlyBirdDeadline && today <= deadlineStr;
        // Prices are stored in paise in the database
        const pricePerTicketPaise = isEarlyBird ? w.earlyBirdPrice : (w.price || 0);
        if (!pricePerTicketPaise) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid workshop pricing" });
        }
        const totalAmountPaise = pricePerTicketPaise * input.ticketCount;
        const totalAmountRupees = totalAmountPaise / 100; // Convert to rupees for display
        
        const bookingNumber = `WS${Date.now().toString(36).toUpperCase()}`;
        
        // Create booking with pending payment status (store amount in paise)
        const [insertedBooking] = await database.insert(workshopBookings).values({
          workshopId: input.workshopId,
          workshopDateId: input.workshopDateId || null,
          bookingNumber,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          ticketCount: input.ticketCount,
          totalAmount: totalAmountPaise,
          paymentStatus: 'pending',
          specialRequirements: input.specialRequirements || null,
        }).$returningId();
        
        // Create Razorpay order (Razorpay expects amount in paise)
        console.log('[Workshop Booking] Creating Razorpay order:', { totalAmountPaise, bookingNumber, workshopTitle: w.title });
        const { createRazorpayOrder, getRazorpayKeyId } = await import('./razorpay');
        const razorpayOrder = await createRazorpayOrder({
          amount: totalAmountPaise,
          currency: 'INR',
          receipt: bookingNumber,
          notes: {
            bookingNumber,
            workshopTitle: w.title,
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            ticketCount: String(input.ticketCount),
          },
        });
        
        return { 
          success: true, 
          bookingId: insertedBooking.id,
          bookingNumber,
          totalAmount: totalAmountRupees,
          isEarlyBird,
          workshopTitle: w.title,
          workshopDate: selectedDate ? selectedDate.sessionDate : w.workshopDate,
          workshopDateId: input.workshopDateId || null,
          razorpayOrderId: razorpayOrder.id,
          razorpayKeyId: getRazorpayKeyId(),
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
        };
      }),

    // Verify workshop payment and finalize booking
    verifyPayment: publicProcedure
      .input(z.object({
        bookingId: z.number(),
        bookingNumber: z.string(),
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { verifyPaymentSignature } = await import('./razorpay');
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        // Verify signature
        const isValid = verifyPaymentSignature(
          input.razorpayOrderId,
          input.razorpayPaymentId,
          input.razorpaySignature
        );
        
        if (!isValid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid payment signature' });
        }
        
        // Get booking details
        const [booking] = await database.select().from(workshopBookings)
          .where(eq(workshopBookings.id, input.bookingId));
        
        if (!booking) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
        }
        
        // Get workshop details
        const [workshop] = await database.select().from(workshops)
          .where(eq(workshops.id, booking.workshopId));
        
        // Update booking with payment info
        await database.update(workshopBookings)
          .set({
            paymentStatus: 'paid',
            paymentMethod: 'razorpay',
            paymentId: input.razorpayPaymentId,
          })
          .where(eq(workshopBookings.id, input.bookingId));
        
        // Update workshop booked count (only after successful payment)
        await database.update(workshops)
          .set({ bookedCount: sql`${workshops.bookedCount} + ${booking.ticketCount}` })
          .where(eq(workshops.id, booking.workshopId));
        
        // If booking has a specific date, update that date's booked count too
        if (booking.workshopDateId) {
          await database.update(workshopDates)
            .set({ bookedCount: sql`${workshopDates.bookedCount} + ${booking.ticketCount}` })
            .where(eq(workshopDates.id, booking.workshopDateId));
        }
        
        // Get selected date info for invoice
        let selectedDateInfo = null;
        if (booking.workshopDateId) {
          const [dateRecord] = await database.select().from(workshopDates)
            .where(eq(workshopDates.id, booking.workshopDateId));
          if (dateRecord) {
            selectedDateInfo = dateRecord;
          }
        }
        
        // Generate invoice PDF
        let invoiceUrl = '';
        try {
          const { generateWorkshopInvoice } = await import('./workshopInvoice');
          const today = new Date();
          const isEarlyBird = workshop?.earlyBirdDeadline && workshop.earlyBirdPrice
            ? new Date(workshop.earlyBirdDeadline) >= today
            : false;
          const pricePerTicket = isEarlyBird && workshop?.earlyBirdPrice 
            ? workshop.earlyBirdPrice 
            : (workshop?.price || 0);
          
          // Use selected date info if available, otherwise fall back to workshop date
          const invoiceDate = selectedDateInfo?.sessionDate || workshop?.workshopDate || new Date();
          const invoiceTime = selectedDateInfo 
            ? `${selectedDateInfo.startTime} - ${selectedDateInfo.endTime}` 
            : (workshop ? `${workshop.startTime} - ${workshop.endTime}` : '');
          
          const invoiceResult = await generateWorkshopInvoice({
            bookingNumber: booking.bookingNumber,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            customerPhone: booking.customerPhone,
            workshopTitle: workshop?.title || 'Workshop',
            workshopDate: invoiceDate,
            workshopTime: invoiceTime,
            workshopVenue: workshop?.venue || '',
            ticketCount: booking.ticketCount,
            pricePerTicket,
            totalAmount: booking.totalAmount,
            paymentId: input.razorpayPaymentId,
            isEarlyBird,
            invoiceDate: new Date(),
          });
          invoiceUrl = invoiceResult.url;
          
          // Update booking with invoice URL
          await database.update(workshopBookings)
            .set({ invoiceUrl })
            .where(eq(workshopBookings.id, input.bookingId));
        } catch (invoiceError) {
          console.error('Failed to generate invoice:', invoiceError);
          // Continue without invoice - don't fail the payment
        }
        
        // Notify owner
        await notifyOwner({
          title: `Workshop Payment Received: ${workshop?.title}`,
          content: `Payment confirmed for ${booking.customerName}\n\nBooking #: ${booking.bookingNumber}\nTickets: ${booking.ticketCount}\nAmount: ₹${(booking.totalAmount / 100).toFixed(2)}\nPayment ID: ${input.razorpayPaymentId}${invoiceUrl ? `\n\nInvoice: ${invoiceUrl}` : ''}`,
        });
        
        // Use selected date info if available - convert to ISO string for frontend
        const returnDate = selectedDateInfo?.sessionDate 
          ? new Date(selectedDateInfo.sessionDate).toISOString() 
          : (workshop?.workshopDate ? new Date(workshop.workshopDate).toISOString() : '');
        const returnTime = selectedDateInfo 
          ? `${selectedDateInfo.startTime} - ${selectedDateInfo.endTime}` 
          : (workshop ? `${workshop.startTime} - ${workshop.endTime}` : '');
        
        return { 
          success: true,
          bookingNumber: booking.bookingNumber,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          ticketCount: booking.ticketCount,
          totalAmount: booking.totalAmount,
          workshopTitle: workshop?.title,
          workshopDate: returnDate,
          workshopDateId: booking.workshopDateId,
          workshopTime: returnTime,
          workshopVenue: workshop?.venue,
          paymentId: input.razorpayPaymentId,
          invoiceUrl,
        };
      }),

    // Get all workshops (admin)
    getAll: adminProcedure.query(async () => {
      const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const result = await database.select().from(workshops)
        .orderBy(desc(workshops.createdAt));
      return serializeDateArray(result);
    }),

    // Create workshop (admin)
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        shortDescription: z.string().optional(),
        description: z.string().min(1),
        instructorName: z.string().min(1),
        workshopDate: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        duration: z.string().optional(),
        venue: z.string().min(1),
        totalCapacity: z.number().min(1),
        price: z.number().min(0), // in paise
        earlyBirdPrice: z.number().optional(),
        earlyBirdDeadline: z.string().optional(),
        imageUrl: z.string().optional(),
        status: z.enum(["draft", "published"]).default("draft"),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        // Generate slug from title
        const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
        // Map to database column names (database has different column names than schema)
        const result = await database.insert(workshops).values({
          slug,
          title: input.title,
          shortDescription: input.shortDescription || null,
          description: input.description,
          instructorName: input.instructorName,
          instructor: input.instructorName, // database requires 'instructor' column
          workshopDate: new Date(input.workshopDate),
          startTime: input.startTime,
          endTime: input.endTime,
          duration: input.duration || '2 hours',
          location: input.venue, // database uses 'location' not 'venue'
          venue: input.venue,
          maxCapacity: input.totalCapacity, // database uses 'maxCapacity'
          totalCapacity: input.totalCapacity,
          ticketPrice: input.price, // database uses 'ticketPrice'
          price: input.price,
          earlyBirdPrice: input.earlyBirdPrice || null,
          earlyBirdDeadline: input.earlyBirdDeadline ? new Date(input.earlyBirdDeadline) : null,
          imageUrl: input.imageUrl || null,
          status: input.status,
        });
        return { success: true, id: result[0].insertId };
      }),

    // Update workshop (admin)
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        shortDescription: z.string().optional(),
        description: z.string().optional(),
        instructorName: z.string().optional(),
        workshopDate: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        duration: z.string().optional(),
        venue: z.string().optional(),
        totalCapacity: z.number().min(1).optional(),
        price: z.number().min(0).optional(),
        earlyBirdPrice: z.number().optional(),
        earlyBirdDeadline: z.string().optional(),
        imageUrl: z.string().optional(),
        status: z.enum(["draft", "published", "cancelled", "completed"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const { id, workshopDate, earlyBirdDeadline, ...rest } = input;
        const updates: any = { ...rest };
        if (workshopDate) updates.workshopDate = new Date(workshopDate);
        if (earlyBirdDeadline) updates.earlyBirdDeadline = new Date(earlyBirdDeadline);
        // Map to database column names
        if (rest.instructorName) updates.instructor = rest.instructorName;
        if (rest.venue) updates.location = rest.venue;
        if (rest.totalCapacity) updates.maxCapacity = rest.totalCapacity;
        if (rest.price) updates.ticketPrice = rest.price;
        await database.update(workshops)
          .set(updates)
          .where(eq(workshops.id, id));
        return { success: true };
      }),

    // Get workshop bookings (admin)
    getBookings: adminProcedure
      .input(z.object({ workshopId: z.number() }))
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        return database.select().from(workshopBookings)
          .where(eq(workshopBookings.workshopId, input.workshopId))
          .orderBy(desc(workshopBookings.createdAt));
      }),

    // Update booking payment status (admin)
    updateBookingPayment: adminProcedure
      .input(z.object({
        bookingId: z.number(),
        paymentStatus: z.enum(["pending", "paid", "refunded", "cancelled"]),
        paymentMethod: z.string().optional(),
        paymentId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        await database.update(workshopBookings)
          .set({
            paymentStatus: input.paymentStatus,
            paymentMethod: input.paymentMethod || null,
            paymentId: input.paymentId || null,
          })
          .where(eq(workshopBookings.id, input.bookingId));
        return { success: true };
      }),

    // Update booking attendance (admin)
    updateAttendance: adminProcedure
      .input(z.object({
        bookingId: z.number(),
        attendedStatus: z.enum(["not_attended", "attended", "no_show"]),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        await database.update(workshopBookings)
          .set({ attendedStatus: input.attendedStatus })
          .where(eq(workshopBookings.id, input.bookingId));
        return { success: true };
      }),

    // Cancel booking (admin) - releases spot for unpaid bookings
    cancelBooking: adminProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        // Get booking details first
        const [booking] = await database.select().from(workshopBookings)
          .where(eq(workshopBookings.id, input.bookingId));
        
        if (!booking) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
        }
        
        // If booking was paid, decrement the booked count
        if (booking.paymentStatus === 'paid') {
          await database.update(workshops)
            .set({ bookedCount: sql`GREATEST(0, ${workshops.bookedCount} - ${booking.ticketCount})` })
            .where(eq(workshops.id, booking.workshopId));
          
          if (booking.workshopDateId) {
            await database.update(workshopDates)
              .set({ bookedCount: sql`GREATEST(0, ${workshopDates.bookedCount} - ${booking.ticketCount})` })
              .where(eq(workshopDates.id, booking.workshopDateId));
          }
        }
        
        // Delete the booking
        await database.delete(workshopBookings).where(eq(workshopBookings.id, input.bookingId));
        
        return { success: true };
      }),

    // Delete workshop (admin)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        // Check if workshop has any bookings
        const bookings = await database.select().from(workshopBookings)
          .where(eq(workshopBookings.workshopId, input.id));
        
        if (bookings.length > 0) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: `Cannot delete workshop with ${bookings.length} existing booking(s). Please cancel or refund bookings first.` 
          });
        }
        
        await database.delete(workshops).where(eq(workshops.id, input.id));
        return { success: true };
      }),
  }),

  // Backup management
  backup: router({
    // Create a manual backup (admin only)
    createBackup: adminProcedure.mutation(async () => {
      const { createBackup } = await import('./backup');
      const result = await createBackup();
      return result;
    }),

    // Get backup history from database
    getHistory: adminProcedure.query(async () => {
      const database = await getDb();
      if (!database) return [];
      
      // Query backup_logs table if it exists, otherwise return empty
      try {
        const logs = await database.select().from(backupLogs)
          .orderBy(desc(backupLogs.createdAt))
          .limit(30);
        return logs;
      } catch {
        return [];
      }
    }),

    // Get download URL for a backup
    getDownloadUrl: adminProcedure
      .input(z.object({ backupKey: z.string() }))
      .query(async ({ input }) => {
        const { getBackupDownloadUrl } = await import('./backup');
        const url = await getBackupDownloadUrl(input.backupKey);
        return { url };
      }),

    // Run scheduled backup with notification (admin only)
    runScheduledBackup: adminProcedure.mutation(async () => {
      const { runScheduledBackup } = await import('./backup');
      const result = await runScheduledBackup();
      return result;
    }),

    // Restore from a backup (admin only)
    restoreFromBackup: adminProcedure
      .input(z.object({ 
        backupUrl: z.string(),
        createPreRestoreBackup: z.boolean().default(true)
      }))
      .mutation(async ({ input }) => {
        const { restoreFromBackup } = await import('./backup');
        const result = await restoreFromBackup(input.backupUrl, input.createPreRestoreBackup);
        return result;
      }),
  }),

  // Blog for SEO
  blog: router({
    // Get published articles (public)
    getPublished: publicProcedure
      .input(z.object({ limit: z.number().default(10), offset: z.number().default(0) }).optional())
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) return { articles: [], total: 0 };
        
        const limit = input?.limit || 10;
        const offset = input?.offset || 0;
        
        const articles = await database.select()
          .from(blogArticles)
          .where(eq(blogArticles.status, 'published'))
          .orderBy(desc(blogArticles.publishedAt))
          .limit(limit)
          .offset(offset);
        
        const countResult = await database.select({ count: sql<number>`count(*)` })
          .from(blogArticles)
          .where(eq(blogArticles.status, 'published'));
        
        return { articles: serializeDateArray(articles), total: countResult[0]?.count || 0 };
      }),

    // Get single article by slug (public)
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'NOT_FOUND' });
        
        const [article] = await database.select()
          .from(blogArticles)
          .where(eq(blogArticles.slug, input.slug));
        
        if (!article) throw new TRPCError({ code: 'NOT_FOUND' });
        
        // Increment view count for published articles
        if (article.status === 'published') {
          await database.update(blogArticles)
            .set({ viewCount: sql`${blogArticles.viewCount} + 1` })
            .where(eq(blogArticles.id, article.id));
        }
        
        return serializeDates(article);
      }),

    // Get all articles (admin only)
    getAll: adminProcedure
      .input(z.object({ status: z.enum(['draft', 'pending_review', 'published', 'archived']).optional() }).optional())
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) return [];
        
        let query = database.select().from(blogArticles).orderBy(desc(blogArticles.updatedAt));
        
        if (input?.status) {
          const articles = await database.select()
            .from(blogArticles)
            .where(eq(blogArticles.status, input.status))
            .orderBy(desc(blogArticles.updatedAt));
          return serializeDateArray(articles);
        }
        
        const articles = await query;
        return serializeDateArray(articles);
      }),

    // Create article (admin only)
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        slug: z.string().min(1),
        excerpt: z.string().optional(),
        content: z.string().min(1),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        keywords: z.string().optional(),
        imageUrl: z.string().optional(),
        authorName: z.string().optional(),
        status: z.enum(['draft', 'pending_review', 'published', 'archived']).default('draft'),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const publishedAt = input.status === 'published' ? new Date() : null;
        
        const [result] = await database.insert(blogArticles).values({
          ...input,
          publishedAt,
        });
        
        return { id: result.insertId };
      }),

    // Update article (admin only)
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        excerpt: z.string().optional(),
        content: z.string().optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        keywords: z.string().optional(),
        imageUrl: z.string().optional(),
        authorName: z.string().optional(),
        status: z.enum(['draft', 'pending_review', 'published', 'archived']).optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const { id, ...updateData } = input;
        
        // If publishing, set publishedAt
        if (updateData.status === 'published') {
          const [existing] = await database.select({ publishedAt: blogArticles.publishedAt })
            .from(blogArticles)
            .where(eq(blogArticles.id, id));
          
          if (!existing?.publishedAt) {
            (updateData as any).publishedAt = new Date();
          }
        }
        
        await database.update(blogArticles)
          .set(updateData)
          .where(eq(blogArticles.id, id));
        
        return { success: true };
      }),

    // Delete article (admin only)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        await database.delete(blogArticles).where(eq(blogArticles.id, input.id));
        return { success: true };
      }),
  }),

  // Wholesale B2B Portal
  wholesale: wholesaleRouter,
});

export type AppRouter = typeof appRouter;
