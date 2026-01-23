import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { 
  wholesaleCategories, 
  wholesaleProducts, 
  wholesaleCustomers, 
  wholesaleCart, 
  wholesaleOrders, 
  wholesaleOrderItems,
  wholesalePasswordResets
} from "../drizzle/schema";
import { eq, and, desc, asc, sql, or, gte, lte } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from './_core/env';
import crypto from "crypto";

// Types for wholesale customer session
interface WholesaleCustomerSession {
  customerId: number;
  email: string;
  businessName: string;
}

// Helper to verify wholesale customer JWT
const verifyWholesaleToken = (token: string): WholesaleCustomerSession | null => {
  try {
    const decoded = jwt.verify(token, ENV.jwtSecret) as WholesaleCustomerSession & { type: string };
    if (decoded.type !== 'wholesale') return null;
    return { customerId: decoded.customerId, email: decoded.email, businessName: decoded.businessName };
  } catch {
    return null;
  }
};

// Helper to generate wholesale order number
const generateWholesaleOrderNumber = async (): Promise<string> => {
  const database = await getDb();
  if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const today = new Date();
  const datePrefix = `WS${today.getFullYear().toString().slice(-2)}${(today.getMonth() + 1).toString().padStart(2, '0')}`;
  
  // Get latest order number for today
  const latestOrder = await database.select({ orderNumber: wholesaleOrders.orderNumber })
    .from(wholesaleOrders)
    .where(sql`${wholesaleOrders.orderNumber} LIKE ${datePrefix + '%'}`)
    .orderBy(desc(wholesaleOrders.orderNumber))
    .limit(1);
  
  let sequence = 1;
  if (latestOrder.length > 0) {
    const lastSeq = parseInt(latestOrder[0].orderNumber.slice(-4));
    sequence = lastSeq + 1;
  }
  
  return `${datePrefix}${sequence.toString().padStart(4, '0')}`;
};

// Wholesale customer procedure - verifies JWT from header
const wholesaleCustomerProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const authHeader = ctx.req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Please log in to continue' });
  }
  
  const token = authHeader.slice(7);
  const customer = verifyWholesaleToken(token);
  if (!customer) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired session' });
  }
  
  return next({ ctx: { ...ctx, wholesaleCustomer: customer } });
});

// Admin procedure for wholesale management
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const wholesaleRouter = router({
  // ==================== PUBLIC ROUTES ====================
  
  // Get all active categories
  getCategories: publicProcedure.query(async () => {
    const database = await getDb();
    if (!database) return [];
    
    return database.select()
      .from(wholesaleCategories)
      .where(eq(wholesaleCategories.isActive, true))
      .orderBy(asc(wholesaleCategories.displayOrder));
  }),
  
  // Get products (public can see names/images, prices only after login)
  getProducts: publicProcedure
    .input(z.object({ 
      categoryId: z.number().optional(),
      includePrice: z.boolean().default(false) // Only true if logged in
    }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      
      let query = database.select({
        id: wholesaleProducts.id,
        categoryId: wholesaleProducts.categoryId,
        name: wholesaleProducts.name,
        slug: wholesaleProducts.slug,
        description: wholesaleProducts.description,
        specifications: wholesaleProducts.specifications,
        imageUrl: wholesaleProducts.imageUrl,
        imageUrl2: wholesaleProducts.imageUrl2,
        imageUrl3: wholesaleProducts.imageUrl3,
        videoUrl: wholesaleProducts.videoUrl,
        unit: wholesaleProducts.unit,
        stockQuantity: wholesaleProducts.stockQuantity,
        isFeatured: wholesaleProducts.isFeatured,
        // Only include price fields if requested
        ...(input?.includePrice ? {
          basePrice: wholesaleProducts.basePrice,
          pricingTiers: wholesaleProducts.pricingTiers,
          unitsPerCase: wholesaleProducts.unitsPerCase,
        } : {})
      })
      .from(wholesaleProducts)
      .where(eq(wholesaleProducts.isActive, true))
      .orderBy(asc(wholesaleProducts.displayOrder));
      
      if (input?.categoryId) {
        return database.select({
          id: wholesaleProducts.id,
          categoryId: wholesaleProducts.categoryId,
          name: wholesaleProducts.name,
          slug: wholesaleProducts.slug,
          description: wholesaleProducts.description,
          specifications: wholesaleProducts.specifications,
          imageUrl: wholesaleProducts.imageUrl,
          imageUrl2: wholesaleProducts.imageUrl2,
          imageUrl3: wholesaleProducts.imageUrl3,
          videoUrl: wholesaleProducts.videoUrl,
          unit: wholesaleProducts.unit,
          stockQuantity: wholesaleProducts.stockQuantity,
          isFeatured: wholesaleProducts.isFeatured,
          ...(input?.includePrice ? {
            basePrice: wholesaleProducts.basePrice,
            pricingTiers: wholesaleProducts.pricingTiers,
            unitsPerCase: wholesaleProducts.unitsPerCase,
          } : {})
        })
        .from(wholesaleProducts)
        .where(and(
          eq(wholesaleProducts.isActive, true),
          eq(wholesaleProducts.categoryId, input.categoryId)
        ))
        .orderBy(asc(wholesaleProducts.displayOrder));
      }
      
      return query;
    }),
  
  // Get single product by slug
  getProductBySlug: publicProcedure
    .input(z.object({ slug: z.string(), includePrice: z.boolean().default(false) }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'NOT_FOUND' });
      
      const products = await database.select()
        .from(wholesaleProducts)
        .where(and(
          eq(wholesaleProducts.slug, input.slug),
          eq(wholesaleProducts.isActive, true)
        ))
        .limit(1);
      
      if (products.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      }
      
      const product = products[0];
      
      // Hide pricing if not logged in
      if (!input.includePrice) {
        return {
          ...product,
          basePrice: null,
          pricingTiers: null,
        };
      }
      
      return product;
    }),
  
  // ==================== CUSTOMER AUTH ====================
  
  // Register new wholesale customer
  register: publicProcedure
    .input(z.object({
      businessName: z.string().min(2, 'Business name is required'),
      gstNumber: z.string().optional(),
      businessType: z.enum(['cafe', 'restaurant', 'retailer', 'distributor', 'caterer', 'other']).default('other'),
      contactPerson: z.string().min(2, 'Contact person name is required'),
      email: z.string().email('Invalid email address'),
      phone: z.string().min(10, 'Valid phone number is required'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      addressLine1: z.string().min(5, 'Address is required'),
      addressLine2: z.string().optional(),
      city: z.string().default('Chennai'),
      state: z.string().default('Tamil Nadu'),
      pincode: z.string().min(6, 'Valid pincode is required'),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      
      // Check if email already exists
      const existing = await database.select({ id: wholesaleCustomers.id })
        .from(wholesaleCustomers)
        .where(eq(wholesaleCustomers.email, input.email.toLowerCase()))
        .limit(1);
      
      if (existing.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Email already registered. Please login instead.' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);
      
      // Create customer
      const result = await database.insert(wholesaleCustomers).values({
        businessName: input.businessName,
        gstNumber: input.gstNumber || null,
        businessType: input.businessType,
        contactPerson: input.contactPerson,
        email: input.email.toLowerCase(),
        phone: input.phone,
        passwordHash,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 || null,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        isVerified: true, // Auto-verify for now
        isActive: true,
      });
      
      const customerId = result[0].insertId;
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          type: 'wholesale',
          customerId,
          email: input.email.toLowerCase(),
          businessName: input.businessName
        },
        ENV.jwtSecret,
        { expiresIn: '7d' }
      );
      
      return { 
        success: true, 
        token,
        customer: {
          id: customerId,
          businessName: input.businessName,
          email: input.email.toLowerCase(),
        }
      };
    }),
  
  // Login
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      
      const customers = await database.select()
        .from(wholesaleCustomers)
        .where(eq(wholesaleCustomers.email, input.email.toLowerCase()))
        .limit(1);
      
      if (customers.length === 0) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid email or password' });
      }
      
      const customer = customers[0];
      
      if (!customer.isActive) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Account is deactivated. Please contact support.' });
      }
      
      const validPassword = await bcrypt.compare(input.password, customer.passwordHash);
      if (!validPassword) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid email or password' });
      }
      
      // Update last login
      await database.update(wholesaleCustomers)
        .set({ lastLoginAt: new Date() })
        .where(eq(wholesaleCustomers.id, customer.id));
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          type: 'wholesale',
          customerId: customer.id,
          email: customer.email,
          businessName: customer.businessName
        },
        ENV.jwtSecret,
        { expiresIn: '7d' }
      );
      
      return { 
        success: true, 
        token,
        customer: {
          id: customer.id,
          businessName: customer.businessName,
          email: customer.email,
          contactPerson: customer.contactPerson,
          phone: customer.phone,
          gstNumber: customer.gstNumber,
        }
      };
    }),
  
  // Get current customer profile
  getProfile: wholesaleCustomerProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    
    const customers = await database.select({
      id: wholesaleCustomers.id,
      businessName: wholesaleCustomers.businessName,
      gstNumber: wholesaleCustomers.gstNumber,
      businessType: wholesaleCustomers.businessType,
      contactPerson: wholesaleCustomers.contactPerson,
      email: wholesaleCustomers.email,
      phone: wholesaleCustomers.phone,
      addressLine1: wholesaleCustomers.addressLine1,
      addressLine2: wholesaleCustomers.addressLine2,
      city: wholesaleCustomers.city,
      state: wholesaleCustomers.state,
      pincode: wholesaleCustomers.pincode,
    })
    .from(wholesaleCustomers)
    .where(eq(wholesaleCustomers.id, ctx.wholesaleCustomer.customerId))
    .limit(1);
    
    if (customers.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found' });
    }
    
    return customers[0];
  }),
  
  // Update profile
  updateProfile: wholesaleCustomerProcedure
    .input(z.object({
      businessName: z.string().min(2).optional(),
      gstNumber: z.string().optional(),
      contactPerson: z.string().min(2).optional(),
      phone: z.string().min(10).optional(),
      addressLine1: z.string().min(5).optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().min(6).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      
      await database.update(wholesaleCustomers)
        .set(input)
        .where(eq(wholesaleCustomers.id, ctx.wholesaleCustomer.customerId));
      
      return { success: true };
    }),
  
  // ==================== CART ====================
  
  // Get cart items
  getCart: wholesaleCustomerProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) return [];
    
    const cartItems = await database.select({
      id: wholesaleCart.id,
      productId: wholesaleCart.productId,
      quantity: wholesaleCart.quantity,
      productName: wholesaleProducts.name,
      productSlug: wholesaleProducts.slug,
      imageUrl: wholesaleProducts.imageUrl,
      basePrice: wholesaleProducts.basePrice,
      unit: wholesaleProducts.unit,
      pricingTiers: wholesaleProducts.pricingTiers,
      stockQuantity: wholesaleProducts.stockQuantity,
    })
    .from(wholesaleCart)
    .innerJoin(wholesaleProducts, eq(wholesaleCart.productId, wholesaleProducts.id))
    .where(eq(wholesaleCart.customerId, ctx.wholesaleCustomer.customerId));
    
    return cartItems;
  }),
  
  // Add to cart
  addToCart: wholesaleCustomerProcedure
    .input(z.object({
      productId: z.number(),
      quantity: z.number().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      
      // Check if product exists and is in stock
      const products = await database.select()
        .from(wholesaleProducts)
        .where(and(
          eq(wholesaleProducts.id, input.productId),
          eq(wholesaleProducts.isActive, true)
        ))
        .limit(1);
      
      if (products.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      }
      
      // Check if already in cart
      const existing = await database.select()
        .from(wholesaleCart)
        .where(and(
          eq(wholesaleCart.customerId, ctx.wholesaleCustomer.customerId),
          eq(wholesaleCart.productId, input.productId)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        // Update quantity
        await database.update(wholesaleCart)
          .set({ quantity: existing[0].quantity + input.quantity })
          .where(eq(wholesaleCart.id, existing[0].id));
      } else {
        // Add new item
        await database.insert(wholesaleCart).values({
          customerId: ctx.wholesaleCustomer.customerId,
          productId: input.productId,
          quantity: input.quantity,
        });
      }
      
      return { success: true };
    }),
  
  // Update cart item quantity
  updateCartItem: wholesaleCustomerProcedure
    .input(z.object({
      cartItemId: z.number(),
      quantity: z.number().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      
      await database.update(wholesaleCart)
        .set({ quantity: input.quantity })
        .where(and(
          eq(wholesaleCart.id, input.cartItemId),
          eq(wholesaleCart.customerId, ctx.wholesaleCustomer.customerId)
        ));
      
      return { success: true };
    }),
  
  // Remove from cart
  removeFromCart: wholesaleCustomerProcedure
    .input(z.object({ cartItemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      
      await database.delete(wholesaleCart)
        .where(and(
          eq(wholesaleCart.id, input.cartItemId),
          eq(wholesaleCart.customerId, ctx.wholesaleCustomer.customerId)
        ));
      
      return { success: true };
    }),
  
  // Clear cart
  clearCart: wholesaleCustomerProcedure.mutation(async ({ ctx }) => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    
    await database.delete(wholesaleCart)
      .where(eq(wholesaleCart.customerId, ctx.wholesaleCustomer.customerId));
    
    return { success: true };
  }),
  
  // ==================== ORDERS ====================
  
  // Create order (initiate payment)
  createOrder: wholesaleCustomerProcedure
    .input(z.object({
      customerNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      
      // Get cart items
      const cartItems = await database.select({
        id: wholesaleCart.id,
        productId: wholesaleCart.productId,
        quantity: wholesaleCart.quantity,
        productName: wholesaleProducts.name,
        basePrice: wholesaleProducts.basePrice,
        unit: wholesaleProducts.unit,
        pricingTiers: wholesaleProducts.pricingTiers,
      })
      .from(wholesaleCart)
      .innerJoin(wholesaleProducts, eq(wholesaleCart.productId, wholesaleProducts.id))
      .where(eq(wholesaleCart.customerId, ctx.wholesaleCustomer.customerId));
      
      if (cartItems.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cart is empty' });
      }
      
      // Get customer details
      const customers = await database.select()
        .from(wholesaleCustomers)
        .where(eq(wholesaleCustomers.id, ctx.wholesaleCustomer.customerId))
        .limit(1);
      
      if (customers.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found' });
      }
      
      const customer = customers[0];
      
      // Calculate totals
      let subtotal = 0;
      const orderItems: Array<{
        productId: number;
        productName: string;
        unit: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }> = [];
      
      for (const item of cartItems) {
        // Calculate price based on quantity tiers
        let unitPrice = item.basePrice;
        if (item.pricingTiers && Array.isArray(item.pricingTiers)) {
          const tiers = item.pricingTiers as Array<{ minQty: number; price: number }>;
          // Sort tiers by minQty descending to find the best price
          const sortedTiers = [...tiers].sort((a, b) => b.minQty - a.minQty);
          for (const tier of sortedTiers) {
            if (item.quantity >= tier.minQty) {
              unitPrice = tier.price;
              break;
            }
          }
        }
        
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;
        
        orderItems.push({
          productId: item.productId,
          productName: item.productName,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
        });
      }
      
      // Calculate GST (18% = 9% CGST + 9% SGST)
      const cgst = Math.round(subtotal * 0.09);
      const sgst = Math.round(subtotal * 0.09);
      const totalGst = cgst + sgst;
      const totalAmount = subtotal + totalGst;
      
      // Generate order number
      const orderNumber = await generateWholesaleOrderNumber();
      
      // Create Razorpay order
      const Razorpay = (await import('razorpay')).default;
      const razorpay = new Razorpay({
        key_id: ENV.razorpayKeyId,
        key_secret: ENV.razorpayKeySecret,
      });
      
      const razorpayOrder = await razorpay.orders.create({
        amount: totalAmount, // Already in paise
        currency: 'INR',
        receipt: orderNumber,
        notes: {
          orderType: 'wholesale',
          customerId: ctx.wholesaleCustomer.customerId.toString(),
          businessName: customer.businessName,
        },
      });
      
      // Create order in database
      const orderResult = await database.insert(wholesaleOrders).values({
        orderNumber,
        customerId: ctx.wholesaleCustomer.customerId,
        businessName: customer.businessName,
        gstNumber: customer.gstNumber,
        contactPerson: customer.contactPerson,
        email: customer.email,
        phone: customer.phone,
        pickupLocation: 'Taiwan Maami - T. Nagar, Chennai',
        subtotal,
        cgst,
        sgst,
        totalGst,
        totalAmount,
        paymentStatus: 'pending',
        paymentMethod: 'razorpay',
        razorpayOrderId: razorpayOrder.id,
        orderStatus: 'pending',
        customerNotes: input.customerNotes || null,
      });
      
      const orderId = orderResult[0].insertId;
      
      // Create order items
      for (const item of orderItems) {
        await database.insert(wholesaleOrderItems).values({
          orderId,
          ...item,
        });
      }
      
      return {
        success: true,
        orderId,
        orderNumber,
        razorpayOrderId: razorpayOrder.id,
        amount: totalAmount,
        currency: 'INR',
        key: ENV.razorpayKeyId,
        customer: {
          name: customer.contactPerson,
          email: customer.email,
          phone: customer.phone,
        },
      };
    }),
  
  // Verify payment and complete order
  verifyPayment: wholesaleCustomerProcedure
    .input(z.object({
      orderId: z.number(),
      razorpayPaymentId: z.string(),
      razorpayOrderId: z.string(),
      razorpaySignature: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      
      // Get order
      const orders = await database.select()
        .from(wholesaleOrders)
        .where(and(
          eq(wholesaleOrders.id, input.orderId),
          eq(wholesaleOrders.customerId, ctx.wholesaleCustomer.customerId)
        ))
        .limit(1);
      
      if (orders.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      }
      
      const order = orders[0];
      
      // Verify signature
      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', ENV.razorpayKeySecret)
        .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
        .digest('hex');
      
      if (expectedSignature !== input.razorpaySignature) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid payment signature' });
      }
      
      // Update order
      await database.update(wholesaleOrders)
        .set({
          paymentStatus: 'paid',
          razorpayPaymentId: input.razorpayPaymentId,
          orderStatus: 'confirmed',
        })
        .where(eq(wholesaleOrders.id, input.orderId));
      
      // Clear cart
      await database.delete(wholesaleCart)
        .where(eq(wholesaleCart.customerId, ctx.wholesaleCustomer.customerId));
      
      return { success: true, orderNumber: order.orderNumber };
    }),
  
  // Get customer orders
  getOrders: wholesaleCustomerProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) return [];
    
    return database.select()
      .from(wholesaleOrders)
      .where(eq(wholesaleOrders.customerId, ctx.wholesaleCustomer.customerId))
      .orderBy(desc(wholesaleOrders.createdAt));
  }),
  
  // Get single order with items
  getOrder: wholesaleCustomerProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      
      const orders = await database.select()
        .from(wholesaleOrders)
        .where(and(
          eq(wholesaleOrders.id, input.orderId),
          eq(wholesaleOrders.customerId, ctx.wholesaleCustomer.customerId)
        ))
        .limit(1);
      
      if (orders.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      }
      
      const items = await database.select()
        .from(wholesaleOrderItems)
        .where(eq(wholesaleOrderItems.orderId, input.orderId));
      
      return { order: orders[0], items };
    }),
  
  // ==================== ADMIN ROUTES ====================
  
  admin: router({
    // Get all categories (including inactive)
    getCategories: adminProcedure.query(async () => {
      const database = await getDb();
      if (!database) return [];
      
      return database.select()
        .from(wholesaleCategories)
        .orderBy(asc(wholesaleCategories.displayOrder));
    }),
    
    // Create category
    createCategory: adminProcedure
      .input(z.object({
        name: z.string().min(2),
        slug: z.string().min(2),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        displayOrder: z.number().default(0),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const result = await database.insert(wholesaleCategories).values(input);
        return { success: true, id: result[0].insertId };
      }),
    
    // Update category
    updateCategory: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(2).optional(),
        slug: z.string().min(2).optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        displayOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const { id, ...data } = input;
        await database.update(wholesaleCategories)
          .set(data)
          .where(eq(wholesaleCategories.id, id));
        
        return { success: true };
      }),
    
    // Delete category
    deleteCategory: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Check if category has products
        const products = await database.select({ id: wholesaleProducts.id })
          .from(wholesaleProducts)
          .where(eq(wholesaleProducts.categoryId, input.id))
          .limit(1);
        
        if (products.length > 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete category with products. Move or delete products first.' });
        }
        
        await database.delete(wholesaleCategories)
          .where(eq(wholesaleCategories.id, input.id));
        
        return { success: true };
      }),
    
    // Get all products (including inactive)
    getProducts: adminProcedure
      .input(z.object({ categoryId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) return [];
        
        if (input?.categoryId) {
          return database.select()
            .from(wholesaleProducts)
            .where(eq(wholesaleProducts.categoryId, input.categoryId))
            .orderBy(asc(wholesaleProducts.displayOrder));
        }
        
        return database.select()
          .from(wholesaleProducts)
          .orderBy(asc(wholesaleProducts.displayOrder));
      }),
    
    // Create product
    createProduct: adminProcedure
      .input(z.object({
        categoryId: z.number(),
        name: z.string().min(2),
        slug: z.string().min(2),
        description: z.string().optional(),
        specifications: z.string().optional(),
        imageUrl: z.string().optional(),
        imageUrl2: z.string().optional(),
        imageUrl3: z.string().optional(),
        videoUrl: z.string().optional(),
        basePrice: z.number().min(0),
        unit: z.string(),
        unitsPerCase: z.number().optional(),
        pricingTiers: z.array(z.object({
          minQty: z.number(),
          price: z.number(),
        })).optional(),
        stockQuantity: z.number().default(0),
        lowStockThreshold: z.number().default(10),
        isActive: z.boolean().default(true),
        isFeatured: z.boolean().default(false),
        displayOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const result = await database.insert(wholesaleProducts).values({
          ...input,
          pricingTiers: input.pricingTiers ? JSON.stringify(input.pricingTiers) : null,
        });
        
        return { success: true, id: result[0].insertId };
      }),
    
    // Update product
    updateProduct: adminProcedure
      .input(z.object({
        id: z.number(),
        categoryId: z.number().optional(),
        name: z.string().min(2).optional(),
        slug: z.string().min(2).optional(),
        description: z.string().optional(),
        specifications: z.string().optional(),
        imageUrl: z.string().optional(),
        imageUrl2: z.string().optional(),
        imageUrl3: z.string().optional(),
        videoUrl: z.string().optional(),
        basePrice: z.number().min(0).optional(),
        unit: z.string().optional(),
        unitsPerCase: z.number().optional(),
        pricingTiers: z.array(z.object({
          minQty: z.number(),
          price: z.number(),
        })).optional(),
        stockQuantity: z.number().optional(),
        lowStockThreshold: z.number().optional(),
        isActive: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const { id, pricingTiers, ...data } = input;
        await database.update(wholesaleProducts)
          .set({
            ...data,
            ...(pricingTiers !== undefined ? { pricingTiers: JSON.stringify(pricingTiers) } : {}),
          })
          .where(eq(wholesaleProducts.id, id));
        
        return { success: true };
      }),
    
    // Delete product
    deleteProduct: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        await database.delete(wholesaleProducts)
          .where(eq(wholesaleProducts.id, input.id));
        
        return { success: true };
      }),
    
    // Get all customers
    getCustomers: adminProcedure.query(async () => {
      const database = await getDb();
      if (!database) return [];
      
      return database.select({
        id: wholesaleCustomers.id,
        businessName: wholesaleCustomers.businessName,
        gstNumber: wholesaleCustomers.gstNumber,
        businessType: wholesaleCustomers.businessType,
        contactPerson: wholesaleCustomers.contactPerson,
        email: wholesaleCustomers.email,
        phone: wholesaleCustomers.phone,
        city: wholesaleCustomers.city,
        isActive: wholesaleCustomers.isActive,
        isVerified: wholesaleCustomers.isVerified,
        createdAt: wholesaleCustomers.createdAt,
        lastLoginAt: wholesaleCustomers.lastLoginAt,
      })
      .from(wholesaleCustomers)
      .orderBy(desc(wholesaleCustomers.createdAt));
    }),
    
    // Toggle customer active status
    toggleCustomerStatus: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        await database.update(wholesaleCustomers)
          .set({ isActive: input.isActive })
          .where(eq(wholesaleCustomers.id, input.id));
        
        return { success: true };
      }),
    
    // Get all orders
    getOrders: adminProcedure
      .input(z.object({
        status: z.enum(['pending', 'confirmed', 'processing', 'ready', 'completed', 'cancelled']).optional(),
        paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
      }).optional())
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) return [];
        
        let query = database.select()
          .from(wholesaleOrders)
          .orderBy(desc(wholesaleOrders.createdAt));
        
        // Note: Filtering would need to be added with proper where clauses
        return query;
      }),
    
    // Update order status
    updateOrderStatus: adminProcedure
      .input(z.object({
        orderId: z.number(),
        orderStatus: z.enum(['pending', 'confirmed', 'processing', 'ready', 'completed', 'cancelled']),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const updateData: Record<string, unknown> = { orderStatus: input.orderStatus };
        if (input.adminNotes) updateData.adminNotes = input.adminNotes;
        if (input.orderStatus === 'completed') updateData.completedAt = new Date();
        
        await database.update(wholesaleOrders)
          .set(updateData)
          .where(eq(wholesaleOrders.id, input.orderId));
        
        return { success: true };
      }),
    
    // Get order details
    getOrderDetails: adminProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const orders = await database.select()
          .from(wholesaleOrders)
          .where(eq(wholesaleOrders.id, input.orderId))
          .limit(1);
        
        if (orders.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        }
        
        const items = await database.select()
          .from(wholesaleOrderItems)
          .where(eq(wholesaleOrderItems.orderId, input.orderId));
        
        return { order: orders[0], items };
      }),
    
    // Get sales summary
    getSalesSummary: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) return { totalOrders: 0, totalRevenue: 0, pendingOrders: 0 };
        
        // Get total paid orders
        const paidOrders = await database.select({
          count: sql<number>`COUNT(*)`,
          total: sql<number>`SUM(${wholesaleOrders.totalAmount})`,
        })
        .from(wholesaleOrders)
        .where(eq(wholesaleOrders.paymentStatus, 'paid'));
        
        // Get pending orders count
        const pendingOrders = await database.select({
          count: sql<number>`COUNT(*)`,
        })
        .from(wholesaleOrders)
        .where(and(
          eq(wholesaleOrders.paymentStatus, 'paid'),
          or(
            eq(wholesaleOrders.orderStatus, 'pending'),
            eq(wholesaleOrders.orderStatus, 'confirmed'),
            eq(wholesaleOrders.orderStatus, 'processing')
          )
        ));
        
        return {
          totalOrders: paidOrders[0]?.count || 0,
          totalRevenue: paidOrders[0]?.total || 0,
          pendingOrders: pendingOrders[0]?.count || 0,
        };
      }),
  }),
});

export type WholesaleRouter = typeof wholesaleRouter;
