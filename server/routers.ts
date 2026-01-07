import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { getDb } from "./db";
import { seedDatabase } from "./seed";
import { categories, subcategories, products, addons, orders, orderItems as orderItemsTable, orderItemAddons, payments, discounts, addresses, storeLocations, deliveryAreas, users, productAddons } from "../drizzle/schema";
import { eq, and, desc, asc, sql, or } from "drizzle-orm";
import { generateOrderNumber, calculateGst } from "@shared/types";
// POS functionality removed - Employee Master import removed
import { outletProducts, loyaltyRewards, stampTransactions, guestOrders, reviews, kotQueue, receiptQueue, productAuditLog, categoryAuditLog, complaints } from "../drizzle/schema";
import { ENV } from './_core/env';
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
        let deliveryCharge = 0;

        // Apply discount if code provided
        if (input.discountCode) {
          const discount = await db.getDiscountByCode(input.discountCode);
          if (discount && discount.isActive) {
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

        const totalAmount = subtotal + gst.total + deliveryCharge - discountAmount - input.loyaltyPointsUsed;
        
        // Generate sequential 5-digit order number
        const [maxOrderResult] = await dbInstance!.execute(sql`SELECT MAX(CAST(orderNumber AS UNSIGNED)) as maxNum FROM orders WHERE orderNumber REGEXP '^[0-9]+$'`);
        const maxNum = (maxOrderResult as any)[0]?.maxNum || 0;
        const nextNum = maxNum + 1;
        const orderNumber = String(nextNum).padStart(5, '0');

        // Create order
        const [orderResult] = await dbInstance!.insert(orders).values({
          orderNumber,
          userId: ctx.user?.id,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          orderType: input.orderType,
          tableNumber: input.orderType === 'instore' ? input.tableNumber : null,
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

        // For in-store orders with cash payment, create KOT immediately
        // This is handled on the frontend by checking if paymentMethod is 'cash'
        // The KOT will be created when the order is placed without going through Razorpay
        
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
        paymentMethod: z.enum(['cash', 'upi', 'card', 'swiggy_dineout', 'zomato_dineout', 'other']).optional(),
        paymentProofUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        
        // Get order details before updating
        const [order] = await dbInstance!
          .select()
          .from(orders)
          .where(eq(orders.id, input.orderId));
        
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
          
          // Get current user stamp count
          const [user] = await dbInstance!
            .select({
              stampCount: users.stampCount,
              lifetimeStamps: users.lifetimeStamps,
            })
            .from(users)
            .where(eq(users.id, order.userId));
          
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
        }
        
        return { success: true };
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
        
        // Filter by outlet if specified (outletId is int, need to map outlet name to id)
        if (input?.outlet && input.outlet !== 'all') {
          // Map outlet name to outletId: palladium=1, tnagar=2 (based on storeLocations)
          const outletIdMap: Record<string, number> = { palladium: 1, tnagar: 2 };
          const outletId = outletIdMap[input.outlet];
          if (outletId) {
            conditions.push(eq(orders.outletId, outletId));
          }
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
        
        const recentOrders = await dbInstance
          .select()
          .from(orders)
          .where(whereClause)
          .orderBy(desc(orders.createdAt))
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
          newSubtotal,
          newTotalAmount,
          itemsAdded: newOrderItems.length,
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
        amount: z.number(), // Amount in paise
      }))
      .mutation(async ({ input }) => {
        const { createRazorpayOrder, getRazorpayKeyId } = await import('./razorpay');
        
        const razorpayOrder = await createRazorpayOrder({
          amount: input.amount,
          currency: 'INR',
          receipt: `order_${input.orderId}`,
          notes: { orderId: String(input.orderId) },
        });
        
        return {
          razorpayOrderId: razorpayOrder.id,
          razorpayKeyId: getRazorpayKeyId(),
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
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
        const { verifyPaymentSignature } = await import('./razorpay');
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
        
        // Update order payment status
        await dbInstance!.insert(payments).values({
          orderId: input.orderId,
          paymentMethod: 'razorpay',
          paymentStatus: 'success',
          amount: 0, // Will be updated from order
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
        });
        
        // Update order status to confirmed
        await dbInstance!.update(orders)
          .set({ orderStatus: 'confirmed', paymentStatus: 'completed' })
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
        
        // Add outlet filter
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
        
        // Calculate summary by payment method
        const summary: Record<string, { count: number; total: number }> = {};
        let grandTotal = 0;
        let totalOrders = 0;
        
        for (const order of completedOrders) {
          const method = order.paymentMethod || 'unknown';
          if (!summary[method]) {
            summary[method] = { count: 0, total: 0 };
          }
          summary[method].count++;
          summary[method].total += order.totalAmount;
          grandTotal += order.totalAmount;
          totalOrders++;
        }
        
        return {
          orders: completedOrders,
          summary,
          grandTotal,
          totalOrders,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        };
      }),
  }),

  // Discount routes
  discounts: router({
    validate: publicProcedure
      .input(z.object({ code: z.string(), subtotal: z.number() }))
      .query(async ({ input }) => {
        const discount = await db.getDiscountByCode(input.code);
        if (!discount) return { valid: false, message: 'Invalid discount code' };
        if (!discount.isActive) return { valid: false, message: 'Discount code is no longer active' };
        if (discount.minOrderAmount && input.subtotal < discount.minOrderAmount) {
          return { valid: false, message: `Minimum order amount is ₹${discount.minOrderAmount / 100}` };
        }
        if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
          return { valid: false, message: 'Discount code usage limit reached' };
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

    // Get all products including inactive ones
    getAllProducts: adminProcedure.query(async () => {
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
        
        // Calculate totals
        let subtotal = 0;
        for (const item of input.items) {
          const addonsTotal = item.addons.reduce((sum, a) => sum + a.price, 0);
          subtotal += (item.unitPrice + addonsTotal) * item.quantity;
        }
        
        const gstDetails = calculateGst(subtotal);
        const deliveryCharge = input.orderType === 'delivery' ? 5000 : 0; // ₹50 delivery
        const totalAmount = subtotal + deliveryCharge;
        
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
        
        // For in-store "Pay at Counter" orders, create KOT immediately
        // Kitchen needs to start preparing right away since customer is present
        if (input.orderType === 'instore' && input.paymentMethod === 'cash_at_pickup') {
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
            outletId: input.storeLocationId || 1,
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

        // Get registered users
        let registeredUsers: any[] = [];
        if (input?.type !== 'guest') {
          let userQuery = dbInstance.select().from(users);
          if (input?.search) {
            userQuery = userQuery.where(
              or(
                sql`${users.name} LIKE ${`%${input.search}%`}`,
                sql`${users.phone} LIKE ${`%${input.search}%`}`,
                sql`${users.email} LIKE ${`%${input.search}%`}`
              )
            ) as any;
          }
          registeredUsers = await userQuery;
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
  }),
});

export type AppRouter = typeof appRouter;

// KOT Polling System v1.2 - Schema fix deployed 2025-12-12 16:05 IST - orderId as varchar, outletId added, kotData as json
