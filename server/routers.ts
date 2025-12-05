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
        const prods = await dbInstance.select().from(products)
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
        const [orderResult] = await dbInstance.insert(orders).values({
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
          const [itemResult] = await dbInstance.insert(orderItems).values({
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
            await dbInstance.insert(orderItemAddons).values({
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
        await db.updateOrderStatus(input.orderId, input.status);
        return { success: true };
      }),

    getRecent: staffProcedure
      .input(z.object({ limit: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        return db.getRecentOrders(input?.limit || 50);
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
        const [result] = await dbInstance.insert(categories).values(input);
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
        await dbInstance.update(categories).set(data).where(eq(categories.id, id));
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
        const [result] = await dbInstance.insert(products).values(input);
        return { id: result.insertId };
      }),

    updateProduct: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        chineseName: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
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
        await dbInstance.update(products).set(data).where(eq(products.id, id));
        return { success: true };
      }),

    deleteProduct: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await dbInstance.update(products).set({ isActive: false }).where(eq(products.id, input.id));
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
          await dbInstance.update(products).set({ imageUrl: item.imageUrl }).where(eq(products.id, item.productId));
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
        await dbInstance.update(subcategories).set(data).where(eq(subcategories.id, id));
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
        const [result] = await dbInstance.insert(discounts).values({
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

      const allOrders = await dbInstance.select().from(orders);
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
        await dbInstance.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),
  }),

  // POS routes
  pos: router({
    createOrder: staffProcedure
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
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const subtotal = input.items.reduce((sum, item) => sum + item.lineTotal, 0);
        const gst = calculateGst(subtotal);
        const totalAmount = subtotal + gst.total - input.discountAmount - input.loyaltyPointsUsed;
        const orderNumber = generateOrderNumber();

        // Create order
        const [orderResult] = await dbInstance.insert(orders).values({
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
          staffId: ctx.user.id,
          specialInstructions: input.specialInstructions,
        });

        const orderId = orderResult.insertId;

        // Create order items
        for (const item of input.items) {
          const [itemResult] = await dbInstance.insert(orderItems).values({
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
            await dbInstance.insert(orderItemAddons).values({
              orderItemId: itemResult.insertId,
              addonId: addon.id,
              addonName: addon.name,
              addonPrice: addon.price,
            });
          }
        }

        // Record payments
        for (const payment of input.payments) {
          await dbInstance.insert(payments).values({
            orderId,
            paymentMethod: payment.method,
            amount: payment.amount,
            paymentStatus: 'success',
          });
        }

        return { orderId, orderNumber, totalAmount };
      }),
  }),
});

export type AppRouter = typeof appRouter;
