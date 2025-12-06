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
import { eq, and, desc, asc, sql, gte, lte } from "drizzle-orm";
import { generateOrderNumber, calculateGst } from "@shared/types";
import { authenticateStaffByMobile, getActiveEmployees } from "./employeeMaster";
import { posSessions, posAuditLog, outletProducts, reviews } from "../drizzle/schema";
import { generateInvoiceHtml, type InvoiceData } from "./invoice";

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
        await dbInstance.insert(payments).values({
          orderId: input.orderId,
          paymentMethod: 'razorpay',
          paymentStatus: 'success',
          amount: 0, // Will be updated from order
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
        });
        
        // Update order status to confirmed and save Razorpay payment details
        await dbInstance.update(orders)
          .set({ 
            orderStatus: 'confirmed', 
            paymentStatus: 'completed',
            razorpayOrderId: input.razorpayOrderId,
            razorpayPaymentId: input.razorpayPaymentId
          })
          .where(eq(orders.id, input.orderId));
        
        return { success: true, message: 'Payment verified successfully' };
      }),

    // Generate invoice HTML
    getInvoice: publicProcedure
      .input(z.object({ orderNumber: z.string() }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const orderResult = await dbInstance.select().from(orders).where(eq(orders.orderNumber, input.orderNumber));
        if (!orderResult.length) throw new TRPCError({ code: 'NOT_FOUND' });
        const order = orderResult[0];
        
        // Get order items
        const items = await dbInstance.select({
          id: orderItems.id,
          productName: orderItems.productName,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          lineTotal: orderItems.lineTotal,
        }).from(orderItems).where(eq(orderItems.orderId, order.id));
        
        const invoiceData: InvoiceData = {
          orderNumber: order.orderNumber,
          orderDate: order.createdAt,
          customerName: order.customerName || 'Guest',
          customerPhone: order.customerPhone || '',
  
          orderType: order.orderType as 'delivery' | 'pickup',
          deliveryAddress: order.deliveryAddress || undefined,
          items: items.map(item => ({
            name: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.lineTotal,
          })),
          subtotal: order.subtotal,
          stateGst: order.stateGst,
          centralGst: order.centralGst,
          deliveryCharge: order.deliveryCharge || 0,
          discount: order.discountAmount || 0,
          totalAmount: order.totalAmount,
          paymentMethod: order.razorpayPaymentId ? 'Online (Razorpay)' : 'Cash',
          paymentStatus: order.paymentStatus || 'Pending',
        };
        
        const html = generateInvoiceHtml(invoiceData);
        return { html, invoiceData };
      }),

    // Email invoice
    emailInvoice: protectedProcedure
      .input(z.object({ orderNumber: z.string(), email: z.string().email() }))
      .mutation(async ({ input }) => {
        const { notifyOwner } = await import('./_core/notification');
        
        // For now, notify owner about invoice request
        // In production, this would send email to customer
        await notifyOwner({
          title: 'Invoice Email Request',
          content: `Customer requested invoice for order ${input.orderNumber} to be sent to ${input.email}`,
        });
        
        return { success: true, message: 'Invoice will be sent to your email shortly' };
      }),
  }),

  // Reviews router
  reviews: router({
    // Submit a review
    submit: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        overallRating: z.number().min(1).max(5),
        overallReview: z.string().optional(),
        productReviews: z.array(z.object({
          productId: z.number(),
          rating: z.number().min(1).max(5),
          reviewText: z.string().optional(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Check if order exists and belongs to user
        const orderResult = await dbInstance.select().from(orders).where(eq(orders.id, input.orderId));
        if (!orderResult.length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        
        // Check if already reviewed
        const existingReview = await dbInstance.select().from(reviews)
          .where(and(eq(reviews.orderId, input.orderId), eq(reviews.userId, ctx.user.id)));
        if (existingReview.length) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'You have already reviewed this order' });
        }
        
        // Insert overall order review
        await dbInstance.insert(reviews).values({
          orderId: input.orderId,
          userId: ctx.user.id,
          productId: null, // null means overall order review
          rating: input.overallRating,
          reviewText: input.overallReview || null,
        });
        
        // Insert product-specific reviews
        if (input.productReviews?.length) {
          for (const pr of input.productReviews) {
            await dbInstance.insert(reviews).values({
              orderId: input.orderId,
              userId: ctx.user.id,
              productId: pr.productId,
              rating: pr.rating,
              reviewText: pr.reviewText || null,
            });
          }
        }
        
        return { success: true, message: 'Thank you for your review!' };
      }),

    // Get reviews for a product
    getByProduct: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const productReviews = await dbInstance.select({
          id: reviews.id,
          rating: reviews.rating,
          reviewText: reviews.reviewText,
          createdAt: reviews.createdAt,
          userName: users.name,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .where(and(
          eq(reviews.productId, input.productId),
          eq(reviews.isVisible, true)
        ))
        .orderBy(desc(reviews.createdAt))
        .limit(10);
        
        return productReviews;
      }),

    // Get average rating for a product
    getProductRating: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const result = await dbInstance.select({
          avgRating: sql`AVG(${reviews.rating})`,
          count: sql`COUNT(*)`,
        })
        .from(reviews)
        .where(and(
          eq(reviews.productId, input.productId),
          eq(reviews.isVisible, true)
        ));
        
        return {
          averageRating: result[0]?.avgRating ? Number(Number(result[0].avgRating).toFixed(1)) : null,
          reviewCount: Number(result[0]?.count) || 0,
        };
      }),

    // Get all product ratings (for displaying on product cards)
    getAllProductRatings: publicProcedure
      .query(async () => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const ratings = await dbInstance.select({
          productId: reviews.productId,
          avgRating: sql`AVG(${reviews.rating})`,
          count: sql`COUNT(*)`,
        })
        .from(reviews)
        .where(and(
          sql`${reviews.productId} IS NOT NULL`,
          eq(reviews.isVisible, true)
        ))
        .groupBy(reviews.productId);
        
        return ratings.map(r => ({
          productId: r.productId,
          averageRating: r.avgRating ? Number(Number(r.avgRating).toFixed(1)) : null,
          reviewCount: Number(r.count) || 0,
        }));
      }),

    // Check if user can review an order
    canReview: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Check if order is completed
        const orderResult = await dbInstance.select().from(orders).where(eq(orders.id, input.orderId));
        if (!orderResult.length) return { canReview: false, reason: 'Order not found' };
        
        const order = orderResult[0];
        if (order.orderStatus !== 'completed') {
          return { canReview: false, reason: 'Order must be completed before reviewing' };
        }
        
        // Check if already reviewed
        const existingReview = await dbInstance.select().from(reviews)
          .where(and(eq(reviews.orderId, input.orderId), eq(reviews.userId, ctx.user.id)));
        if (existingReview.length) {
          return { canReview: false, reason: 'Already reviewed' };
        }
        
        return { canReview: true };
      }),

    // Admin: Get all reviews for moderation
    getAllAdmin: adminProcedure
      .query(async () => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const allReviews = await dbInstance.select({
          id: reviews.id,
          orderId: reviews.orderId,
          userId: reviews.userId,
          productId: reviews.productId,
          rating: reviews.rating,
          reviewText: reviews.reviewText,
          isApproved: reviews.isApproved,
          isVisible: reviews.isVisible,
          createdAt: reviews.createdAt,
          userName: users.name,
          orderNumber: orders.orderNumber,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .leftJoin(orders, eq(reviews.orderId, orders.id))
        .orderBy(desc(reviews.createdAt))
        .limit(100);
        
        return allReviews;
      }),

    // Admin: Toggle review visibility
    toggleVisibility: adminProcedure
      .input(z.object({ reviewId: z.number(), isVisible: z.boolean() }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        await dbInstance.update(reviews)
          .set({ isVisible: input.isVisible })
          .where(eq(reviews.id, input.reviewId));
        
        return { success: true };
      }),

    // Admin: Delete review
    delete: adminProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        await dbInstance.delete(reviews).where(eq(reviews.id, input.reviewId));
        
        return { success: true };
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
        videoUrl: z.string().nullable().optional(),
        videoThumbnail: z.string().nullable().optional(),
        isFeaturedVideo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { id, ...data } = input;
        await dbInstance.update(products).set(data).where(eq(products.id, id));
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
        await dbInstance.update(products).set({ imageUrl: url }).where(eq(products.id, input.productId));
        
        return { success: true, imageUrl: url };
      }),

    // Upload product video
    uploadProductVideo: adminProcedure
      .input(z.object({
        productId: z.number(),
        videoBase64: z.string(),
        mimeType: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import('./storage');
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Convert base64 to buffer
        const base64Data = input.videoBase64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique file key
        const ext = input.fileName.split('.').pop() || 'mp4';
        const fileKey = `videos/${input.productId}-${Date.now()}.${ext}`;
        
        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Update product with new video URL
        await dbInstance.update(products).set({ videoUrl: url }).where(eq(products.id, input.productId));
        
        return { success: true, videoUrl: url };
      }),

    // Get featured videos for homepage carousel
    getFeaturedVideos: publicProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      
      const result = await dbInstance.select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        videoUrl: products.videoUrl,
        videoThumbnail: products.videoThumbnail,
        imageUrl: products.imageUrl,
        deliveryPrice: products.deliveryPrice,
      })
      .from(products)
      .where(and(
        eq(products.isFeaturedVideo, true),
        eq(products.isActive, true),
        sql`${products.videoUrl} IS NOT NULL`
      ))
      .limit(10);
      
      return result;
    }),

    // Get products with videos
    getProductsWithVideos: publicProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      
      const result = await dbInstance.select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        videoUrl: products.videoUrl,
        videoThumbnail: products.videoThumbnail,
        imageUrl: products.imageUrl,
        deliveryPrice: products.deliveryPrice,
      })
      .from(products)
      .where(and(
        eq(products.isActive, true),
        sql`${products.videoUrl} IS NOT NULL`
      ));
      
      return result;
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
        const existing = await dbInstance.select().from(outletProducts)
          .where(and(
            eq(outletProducts.outletId, input.outletId),
            eq(outletProducts.productId, input.productId)
          ));

        if (existing.length > 0) {
          // Update existing
          await dbInstance.update(outletProducts)
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
          await dbInstance.insert(outletProducts).values({
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
        const [result] = await dbInstance.insert(posSessions).values({
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
        await dbInstance.insert(posAuditLog).values({
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
        const [session] = await dbInstance.select().from(posSessions).where(eq(posSessions.id, input.sessionId));
        if (!session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

        // Update session
        await dbInstance.update(posSessions).set({
          logoutTime: new Date(),
          isActive: false,
        }).where(eq(posSessions.id, input.sessionId));

        // Log the logout action
        await dbInstance.insert(posAuditLog).values({
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

        const [session] = await dbInstance.select().from(posSessions)
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
          outletId: input.outletId,
          posSessionId: input.sessionId,
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

        // Log the order creation for audit
        await dbInstance.insert(posAuditLog).values({
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

        return { orderId, orderNumber, totalAmount };
      }),
  }),

  // Analytics routes
  analytics: router({
    getSalesSummary: adminProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);
        
        // Calculate previous period for comparison
        const periodLength = end.getTime() - start.getTime();
        const prevStart = new Date(start.getTime() - periodLength);
        const prevEnd = new Date(start.getTime());

        // Current period stats
        const currentStats = await database
          .select({
            totalRevenue: sql`COALESCE(SUM(${orders.totalAmount}), 0)`,
            totalOrders: sql`COUNT(*)`,
            totalItems: sql`0`,
          })
          .from(orders)
          .where(and(
            gte(orders.createdAt, start),
            lte(orders.createdAt, end),
            eq(orders.orderStatus, 'completed')
          ));

        // Previous period stats
        const prevStats = await database
          .select({
            totalRevenue: sql`COALESCE(SUM(${orders.totalAmount}), 0)`,
            totalOrders: sql`COUNT(*)`,
          })
          .from(orders)
          .where(and(
            gte(orders.createdAt, prevStart),
            lte(orders.createdAt, prevEnd),
            eq(orders.orderStatus, 'completed')
          ));

        const currentRaw = currentStats[0] || { totalRevenue: 0, totalOrders: 0, totalItems: 0 };
        const prevRaw = prevStats[0] || { totalRevenue: 0, totalOrders: 0 };
        
        const current = {
          totalRevenue: Number(currentRaw.totalRevenue) || 0,
          totalOrders: Number(currentRaw.totalOrders) || 0,
          totalItems: Number(currentRaw.totalItems) || 0,
        };
        const prev = {
          totalRevenue: Number(prevRaw.totalRevenue) || 0,
          totalOrders: Number(prevRaw.totalOrders) || 0,
        };

        const avgOrderValue = current.totalOrders > 0 ? current.totalRevenue / current.totalOrders : 0;
        const prevAvgOrderValue = prev.totalOrders > 0 ? prev.totalRevenue / prev.totalOrders : 0;

        // Convert paise to rupees (divide by 100)
        return {
          totalRevenue: Math.round(current.totalRevenue / 100),
          totalOrders: current.totalOrders,
          totalItems: current.totalItems,
          avgOrderValue: Math.round(avgOrderValue / 100),
          revenueChange: prev.totalRevenue > 0 ? ((current.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100 : 0,
          ordersChange: prev.totalOrders > 0 ? ((current.totalOrders - prev.totalOrders) / prev.totalOrders) * 100 : 0,
          aovChange: prevAvgOrderValue > 0 ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100 : 0,
          itemsChange: 0,
        };
      }),

    getCategoryBreakdown: adminProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);

        const breakdown = await database
          .select({
            categoryId: categories.id,
            categoryName: categories.name,
            revenue: sql`COALESCE(SUM(${orderItems.lineTotal}), 0)`,
            orderCount: sql`COUNT(DISTINCT ${orders.id})`,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .innerJoin(products, eq(orderItems.productId, products.id))
          .innerJoin(subcategories, eq(products.subcategoryId, subcategories.id))
          .innerJoin(categories, eq(subcategories.categoryId, categories.id))
          .where(and(
            gte(orders.createdAt, start),
            lte(orders.createdAt, end),
            eq(orders.orderStatus, 'completed')
          ))
          .groupBy(categories.id, categories.name)
          .orderBy(desc(sql`SUM(${orderItems.lineTotal})`));

        const totalRevenue = breakdown.reduce((sum: number, cat: typeof breakdown[0]) => sum + Number(cat.revenue), 0);

        // Convert paise to rupees (divide by 100)
        return breakdown.map((cat: typeof breakdown[0]) => ({
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          revenue: Math.round(Number(cat.revenue) / 100),
          orderCount: Number(cat.orderCount),
          percentage: totalRevenue > 0 ? (Number(cat.revenue) / totalRevenue) * 100 : 0,
        }));
      }),

    getTopProducts: adminProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        limit: z.number().optional().default(10),
      }))
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);

        const topProducts = await database
          .select({
            productId: products.id,
            productName: products.name,
            quantity: sql`COALESCE(SUM(${orderItems.quantity}), 0)`,
            revenue: sql`COALESCE(SUM(${orderItems.lineTotal}), 0)`,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .innerJoin(products, eq(orderItems.productId, products.id))
          .where(and(
            gte(orders.createdAt, start),
            lte(orders.createdAt, end),
            eq(orders.orderStatus, 'completed')
          ))
          .groupBy(products.id, products.name)
          .orderBy(desc(sql`SUM(${orderItems.lineTotal})`))
          .limit(input.limit);

        // Convert paise to rupees (divide by 100)
        return topProducts.map(p => ({
          productId: p.productId,
          productName: p.productName,
          quantity: Number(p.quantity),
          revenue: Math.round(Number(p.revenue) / 100),
        }));
      }),
  }),
});

export type AppRouter = typeof appRouter;
