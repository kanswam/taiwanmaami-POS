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
import { authenticateStaffByMobile, getActiveEmployees } from "./employeeMaster";
import { posSessions, posAuditLog, outletProducts, loyaltyRewards, stampTransactions, guestOrders, reviews, kotQueue } from "../drizzle/schema";
import { ENV } from './_core/env';

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

    updateStatus: staffProcedure
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
          let bonusStamps = 0;
          let welcomeStamp = 0;
          
          // Bonus stamp for orders >= ₹900
          if (orderTotal >= 90000) {
            bonusStamps = 1;
          }
          
          // Welcome stamp for first order
          if (isFirstOrder) {
            welcomeStamp = 1;
          }
          
          const totalStamps = stampsEarned + bonusStamps + welcomeStamp;
          
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
              action: isFirstOrder ? 'welcome' : (bonusStamps > 0 ? 'bonus' : 'earn'),
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

    getRecent: staffProcedure
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
            customerName: order.customerName || 'Guest',
            customerPhone: order.customerPhone || '',
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
            orderId: input.orderId,
            orderNumber: order.orderNumber,
            kotData: JSON.stringify(kotData),
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
        return { id: result.insertId };
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

    // POS Audit logs
    getPOSAuditLogs: adminProcedure
      .input(z.object({
        outletId: z.number().optional(),
        dateRange: z.enum(['today', 'week', 'month']),
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];

        const now = new Date();
        let startDate = new Date();
        
        if (input.dateRange === 'today') {
          startDate.setHours(0, 0, 0, 0);
        } else if (input.dateRange === 'week') {
          startDate.setDate(now.getDate() - 7);
        } else {
          startDate.setDate(now.getDate() - 30);
        }

        let query = dbInstance.select().from(posAuditLog)
          .where(sql`${posAuditLog.createdAt} >= ${startDate.toISOString()}`)
          .orderBy(desc(posAuditLog.createdAt))
          .limit(500);

        const logs = await query;
        
        // Filter by outlet if specified
        if (input.outletId) {
          return logs.filter(log => log.outletId === input.outletId);
        }
        return logs;
      }),
  }),

  // POS Staff Authentication routes
  posAuth: router({
    // Authenticate staff by mobile number
    loginByMobile: publicProcedure
      .input(z.object({ mobile: z.string() }))
      .mutation(async ({ input }) => {
        const result = await authenticateStaffByMobile(input.mobile);
        return result;
      }),

    // Create POS session after successful authentication
    createSession: publicProcedure
      .input(z.object({
        employeeId: z.string(),
        employeeCode: z.string(),
        employeeName: z.string(),
        employeeMobile: z.string(),
        outletId: z.number(),
        outletName: z.string(),
        deviceInfo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        // Create new session
        const [result] = await dbInstance!.insert(posSessions).values({
          employeeId: input.employeeId,
          employeeCode: input.employeeCode,
          employeeName: input.employeeName,
          employeeMobile: input.employeeMobile,
          outletId: input.outletId,
          outletName: input.outletName,
          deviceInfo: input.deviceInfo,
          ipAddress: ctx.req.ip || ctx.req.headers['x-forwarded-for']?.toString() || 'unknown',
          isActive: true,
        });

        const sessionId = result.insertId;

        // Log the login action
        await dbInstance!.insert(posAuditLog).values({
          sessionId,
          employeeCode: input.employeeCode,
          outletId: input.outletId,
          action: 'login',
          details: { deviceInfo: input.deviceInfo },
        });

        return { sessionId, success: true };
      }),

    // End POS session (logout)
    endSession: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        // Get session details for audit log
        const [session] = await dbInstance!.select().from(posSessions).where(eq(posSessions.id, input.sessionId));
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

        // Update session
        await dbInstance!.update(posSessions).set({
          logoutTime: new Date(),
          isActive: false,
        }).where(eq(posSessions.id, input.sessionId));

        // Log the logout action
        await dbInstance!.insert(posAuditLog).values({
          sessionId: input.sessionId,
          employeeCode: session.employeeCode,
          outletId: session.outletId,
          action: 'logout',
        });

        return { success: true };
      }),

    // Get active session by employee
    getActiveSession: publicProcedure
      .input(z.object({ employeeCode: z.string() }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return null;

        const [session] = await dbInstance!.select().from(posSessions)
          .where(and(
            eq(posSessions.employeeCode, input.employeeCode),
            eq(posSessions.isActive, true)
          ))
          .orderBy(desc(posSessions.loginTime))
          .limit(1);

        return session || null;
      }),

    // Get available outlets for staff
    getOutlets: publicProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      return dbInstance.select().from(storeLocations).where(eq(storeLocations.isActive, true));
    }),
  }),

  // POS routes
  pos: router({
    createOrder: publicProcedure
      .input(z.object({
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
        })),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        discountAmount: z.number().default(0),
        discountCode: z.string().optional(),
        loyaltyPointsUsed: z.number().default(0),
        payments: z.array(z.object({
          method: z.enum(['cash', 'card', 'upi']),
          amount: z.number(),
        })),
        specialInstructions: z.string().optional(),
        // Session info for audit
        sessionId: z.number(),
        outletId: z.number(),
        employeeCode: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const subtotal = input.items.reduce((sum, item) => sum + item.lineTotal, 0);
        const gst = calculateGst(subtotal);
        const totalAmount = subtotal + gst.total - input.discountAmount - input.loyaltyPointsUsed;
        const orderNumber = generateOrderNumber();

        // Create order with outlet and session tracking
        const [orderResult] = await dbInstance!.insert(orders).values({
          orderNumber,
          orderType: 'instore',
          orderStatus: 'completed',
          paymentStatus: 'completed',
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          subtotal,
          stateGst: gst.stateGst,
          centralGst: gst.centralGst,
          deliveryCharge: 0,
          discountAmount: input.discountAmount,
          loyaltyPointsUsed: input.loyaltyPointsUsed,
          totalAmount,
          discountCode: input.discountCode,
          outletId: input.outletId,
          posSessionId: input.sessionId,
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
          });

          for (const addon of item.addons) {
            await dbInstance!.insert(orderItemAddons).values({
              orderItemId: itemResult.insertId,
              addonId: addon.id,
              addonName: addon.name,
              addonPrice: addon.price,
            });
          }
        }

        // Record payments
        for (const payment of input.payments) {
          await dbInstance!.insert(payments).values({
            orderId,
            paymentMethod: payment.method,
            amount: payment.amount,
            paymentStatus: 'success',
          });
        }

        // Log the order creation for audit
        await dbInstance!.insert(posAuditLog).values({
          sessionId: input.sessionId,
          employeeCode: input.employeeCode,
          outletId: input.outletId,
          action: 'create_order',
          orderId,
          details: {
            orderNumber,
            totalAmount,
            itemCount: input.items.length,
            paymentMethods: input.payments.map(p => p.method),
          },
        });

        // Create KOT for kitchen printing (POS orders)
        const kotData = {
          orderId: orderNumber,
          customerName: input.customerName || 'Walk-in Customer',
          customerPhone: input.customerPhone || '',
          items: input.items.map(item => ({
            productName: item.productName,
            quantity: item.quantity,
            price: item.unitPrice,
            size: item.size,
            withBoba: item.withBoba,
            sugarLevel: item.sugarLevel,
            iceLevel: item.iceLevel,
            addons: item.addons.map(a => ({
              name: a.name,
              price: a.price,
            })),
          })),
          totalAmount,
          createdAt: new Date().toISOString(),
        };
        
        await dbInstance!.insert(kotQueue).values({
          orderId,
          orderNumber,
          kotData: JSON.stringify(kotData),
          isPrinted: false,
        });

        return { orderId, orderNumber, totalAmount };
      }),
  }),

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
        
        // Bonus stamp for orders ≥ ₹900
        if (input.orderTotal >= 90000) {
          stamps += 1;
        }
        
        // Welcome stamp for first order
        if (isFirstOrder) {
          stamps += 1;
        }
        
        return {
          stampsToEarn: stamps,
          isFirstOrder,
          hasBonus: input.orderTotal >= 90000,
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
        let bonusStamps = 0;
        let welcomeStamp = 0;
        
        // Bonus stamp for orders ≥ ₹900
        if (input.orderTotal >= 90000) {
          bonusStamps = 1;
        }
        
        // Welcome stamp for first order
        if (isFirstOrder) {
          welcomeStamp = 1;
        }
        
        const totalStamps = stampsEarned + bonusStamps + welcomeStamp;
        
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
          
          if (bonusStamps > 0) {
            await dbInstance!.insert(stampTransactions).values({
              userId: ctx.user.id,
              orderId: input.orderId,
              action: 'bonus',
              stamps: bonusStamps,
              orderTotal: input.orderTotal,
              description: 'Bonus stamp for spending ₹900+',
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
        
        return pendingKots.map(kot => ({
          id: kot.id,
          orderId: kot.orderId,
          orderNumber: kot.orderNumber,
          kotData: JSON.parse(kot.kotData),
          createdAt: kot.createdAt,
        }));
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

// KOT Polling System v1.1 - Force Redeploy 2025-12-11 18:58 IST
