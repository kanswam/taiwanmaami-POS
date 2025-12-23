import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { getDb } from "./db";
import { seedDatabase } from "./seed";
import { categories, subcategories, products, addons, orders, orderItems, orderItemAddons, payments, discounts, addresses, storeLocations, deliveryAreas, users } from "../drizzle/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { generateOrderNumber, calculateGst } from "@shared/types";
// POS functionality removed - Employee Master import removed
import { outletProducts, loyaltyRewards, stampTransactions, guestOrders, reviews, kotQueue } from "../drizzle/schema";
import { ENV } from './_core/env';

// Admin procedure - only allows admin role
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// POS functionality removed - staffProcedure removed, using adminProcedure for order management

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

    getFullMenu: publicProcedure
      .input(z.object({ isDelivery: z.boolean().default(false) }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { categories: [], subcategories: [], products: [], addons: [] };

        const cats = await db.getCategories();
        const subs = await db.getSubcategories();
        const prods = await dbInstance!.select().from(products)
          .where(and(
            eq(products.isActive, true),
            eq(products.isInStock, true),
            input.isDelivery ? eq(products.availableDelivery, true) : eq(products.availableInstore, true)
          ))
          .orderBy(asc(products.displayOrder));
        const adds = await db.getAddons();

        return { categories: cats, subcategories: subs, products: prods, addons: adds };
      }),
  }),

  // Order routes
  orders: router({
    create: publicProcedure
      .input(z.object({
        orderType: z.enum(['instore', 'delivery', 'pickup']),
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
        const orderNumber = generateOrderNumber();

        // Create order
        const [orderResult] = await dbInstance!.insert(orders).values({
          orderNumber,
          userId: ctx.user?.id,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          orderType: input.orderType,
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
          const [itemResult] = await dbInstance!.insert(orderItems).values({
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

        return { orderId, orderNumber, totalAmount };
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

    updateStatus: adminProcedure
      .input(z.object({ orderId: z.number(), status: z.string() }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        
        // Get order details before updating
        const [order] = await dbInstance!
          .select()
          .from(orders)
          .where(eq(orders.id, input.orderId));
        
        await db.updateOrderStatus(input.orderId, input.status);
        
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

    getRecent: adminProcedure
      .input(z.object({ limit: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        return db.getRecentOrders(input?.limit || 50);
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
          const items = await dbInstance!.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));
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
        }
        
        return { success: true, message: 'Payment verified successfully' };
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
        displayOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { id, ...data } = input;
        await dbInstance!.update(categories).set(data).where(eq(categories.id, id));
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
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const [result] = await dbInstance!.insert(products).values(input);
        const [product] = await dbInstance!.select().from(products).where(eq(products.id, result.insertId));
        return product;
      }),

    updateProduct: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        chineseName: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        imageUrl: z.string().nullable().optional(),
        instorePrice: z.number().optional(),
        deliveryPrice: z.number().optional(),
        isInStock: z.boolean().optional(),
        availableInstore: z.boolean().optional(),
        availableDelivery: z.boolean().optional(),
        displayOrder: z.number().optional(),
        isActive: z.boolean().optional(),
        subcategoryId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { id, ...data } = input;
        await dbInstance!.update(products).set(data).where(eq(products.id, id));
        return { success: true };
      }),

    uploadProductImage: adminProcedure
      .input(z.object({
        productId: z.number(),
        imageBase64: z.string(),
        mimeType: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import('./storage');
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Convert base64 to buffer
        const base64Data = input.imageBase64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique file key
        const ext = input.fileName.split('.').pop() || 'jpg';
        const fileKey = `products/${input.productId}-${Date.now()}.${ext}`;
        
        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Update product with new image URL
        await dbInstance!.update(products).set({ imageUrl: url }).where(eq(products.id, input.productId));
        
        return { success: true, imageUrl: url };
      }),

    deleteProduct: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await dbInstance!.update(products).set({ isActive: false }).where(eq(products.id, input.id));
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
        
        // Build query based on scope
        let query = dbInstance.select().from(products).where(eq(products.isActive, true));
        
        if (input.scope === 'category' && input.categoryId) {
          const subs = await dbInstance.select({ id: subcategories.id }).from(subcategories).where(eq(subcategories.categoryId, input.categoryId));
          const subIds = subs.map(s => s.id);
          if (subIds.length > 0) {
            query = dbInstance.select().from(products).where(and(eq(products.isActive, true), sql`${products.subcategoryId} IN (${sql.join(subIds.map(id => sql`${id}`), sql`, `)})`));
          }
        } else if (input.scope === 'subcategory' && input.subcategoryId) {
          query = dbInstance.select().from(products).where(and(eq(products.isActive, true), eq(products.subcategoryId, input.subcategoryId)));
        }
        
        const allProducts = await query;
        
        // Round to nearest 5 rupees (500 paise)
        const roundToNearest5 = (paise: number) => Math.round(paise / 500) * 500;
        
        // Calculate new prices
        const preview = allProducts.map(p => {
          let newInstorePrice = p.instorePrice;
          let newDeliveryPrice = p.deliveryPrice;
          
          const calculateNewPrice = (currentPrice: number | null) => {
            if (!currentPrice) return null;
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
          
          if (input.priceType === 'instore' || input.priceType === 'both') {
            newInstorePrice = calculateNewPrice(p.instorePrice);
          }
          if (input.priceType === 'delivery' || input.priceType === 'both') {
            newDeliveryPrice = calculateNewPrice(p.deliveryPrice);
          }
          
          return {
            id: p.id,
            name: p.name,
            oldInstorePrice: p.instorePrice,
            newInstorePrice,
            oldDeliveryPrice: p.deliveryPrice,
            newDeliveryPrice,
          };
        });
        
        return { products: preview, totalCount: preview.length };
      }),

    // Apply bulk price update
    bulkPriceUpdate: adminProcedure
      .input(z.object({
        updates: z.array(z.object({
          id: z.number(),
          instorePrice: z.number().nullable().optional(),
          deliveryPrice: z.number().nullable().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        for (const update of input.updates) {
          const data: Record<string, number | null> = {};
          if (update.instorePrice !== undefined) data.instorePrice = update.instorePrice;
          if (update.deliveryPrice !== undefined) data.deliveryPrice = update.deliveryPrice;
          
          if (Object.keys(data).length > 0) {
            await dbInstance.update(products).set(data).where(eq(products.id, update.id));
          }
        }
        
        return { success: true, updatedCount: input.updates.length };
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

    // Get all products for admin
    getAllProducts: adminProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      return dbInstance.select().from(products).orderBy(asc(products.subcategoryId), asc(products.displayOrder));
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
        orderType: z.enum(['delivery', 'pickup']),
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
        
        const orderNumber = generateOrderNumber();
        
        // Create order (userId = null for guest)
        const [orderResult] = await dbInstance!.insert(orders).values({
          orderNumber,
          userId: 0, // Guest order marker
          orderType: input.orderType,
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
        });
        
        const orderId = orderResult.insertId;
        
        // Create order items
        for (const item of input.items) {
          const addonsTotal = item.addons.reduce((sum, a) => sum + a.price, 0);
          const lineTotal = (item.unitPrice + addonsTotal) * item.quantity;
          
          const [itemResult] = await dbInstance!.insert(orderItems).values({
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
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        
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
          status: 'approved', // Auto-approve reviews
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
});

export type AppRouter = typeof appRouter;

// KOT Polling System v1.2 - Schema fix deployed 2025-12-12 16:05 IST - orderId as varchar, outletId added, kotData as json
