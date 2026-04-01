import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { getDb, serializeDates, serializeDateArray } from "./db";
import { seedDatabase } from "./seed";
import { categories, subcategories, products, addons, orders, orderItems as orderItemsTable, orderItemAddons, payments, discounts, discountUsage, addresses, storeLocations, deliveryAreas, users, productAddons, loyaltyTransactions } from "../drizzle/schema";
import { eq, and, desc, asc, sql, or, gte, lte, isNull, inArray } from "drizzle-orm";
import { generateOrderNumber, calculateGst } from "@shared/types";
// POS functionality removed - Employee Master import removed
import { outletProducts, loyaltyRewards, stampTransactions, guestOrders, reviews, kotQueue, receiptQueue, productAuditLog, categoryAuditLog, complaints, eventInquiries, eventOrders, eventOrderItems, workshops, workshopBookings, workshopDates, workshopWaitlist, backupLogs, blogArticles, deliverySalesUploads, deliveryItemSales, pageviews as pageviewsTable, popupRegistrations, homepageSections, chatConversations, chatMessages } from "../drizzle/schema";
import { ENV } from './_core/env';
import { wholesaleRouter } from './wholesaleRouter';
import { chatWithBot } from './chatbot';
import { notifyOwner } from './_core/notification';
import { calculateDeliveryCharge } from './deliveryCharge';
import { transcribeAudio } from './_core/voiceTranscription';
import { textToSpeech, getVoiceForLanguage } from './tts';
import { storagePut } from './storage';
import { partnerRouter, calculatePartnerBenefits, getActivePartnerSubscription } from './partnerRouter';
import { isFoodAvailable, getFoodCategoryId, getFoodSchedule, saveFoodSchedule, formatSchedule, invalidateScheduleCache } from './foodSchedule';
import { partnerBenefitsLog, partnerSubscriptions } from '../drizzle/schema';

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

    // Public food schedule status — tells the frontend if food is currently available
    getFoodStatus: publicProcedure.query(async () => {
      const available = await isFoodAvailable();
      const config = await getFoodSchedule();
      const formatted = formatSchedule(config);
      return { foodAvailable: available, schedule: formatted, manualOverride: config.manualOverride || null };
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

        const allCats = await db.getCategories();
        const allSubs = await db.getSubcategories();
        
        // Check if food is currently available based on time schedule
        const foodAvailable = await isFoodAvailable();
        const foodCategoryId = getFoodCategoryId();
        
        // Filter out food category entirely when outside food hours
        const cats = foodAvailable ? allCats : allCats.filter(c => c.id !== foodCategoryId);
        
        // Filter subcategories by availability for the order type
        // Also filter out food subcategories when outside food hours
        const subs = allSubs.filter(sub => {
          // If food is not available, exclude all food subcategories
          if (!foodAvailable && sub.categoryId === foodCategoryId) return false;
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

        return { categories: cats, subcategories: subs, products: prods, addons: adds, foodAvailable };
      }),
  }),

  // Order routes
  orders: router({
    // Calculate delivery charge based on address distance from T. Nagar
    getDeliveryCharge: publicProcedure
      .input(z.object({
        deliveryAddress: z.string().min(5),
      }))
      .query(async ({ input }) => {
        const result = await calculateDeliveryCharge(input.deliveryAddress);
        return {
          chargePaise: result.chargePaise,
          chargeRupees: result.chargePaise / 100,
          tierLabel: result.tierLabel,
          distanceKm: result.distanceKm,
          distanceText: result.distanceText,
          durationText: result.durationText,
          usedFallback: result.usedFallback,
        };
      }),

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
        // Offline sync: original timestamp when order was placed offline
        offlineCreatedAt: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        try {
        // Calculate totals
        const subtotal = input.items.reduce((sum, item) => sum + item.lineTotal, 0);
        const gst = calculateGst(subtotal);
        let discountAmount = 0;
        // Tiered delivery charge based on distance, FREE for orders above ₹2500
        let deliveryCharge = 0;
        if (input.orderType === 'delivery') {
          if (subtotal >= 250000) {
            deliveryCharge = 0; // Free delivery for orders ≥₹2500
          } else if (input.deliveryAddress) {
            const chargeResult = await calculateDeliveryCharge(input.deliveryAddress);
            deliveryCharge = chargeResult.chargePaise;
            console.log(`[Order] Delivery charge: ${chargeResult.tierLabel} (${chargeResult.distanceKm}km, ${chargeResult.distanceText})`);
          } else {
            deliveryCharge = 10000; // Fallback ₹100 if no address
          }
        }

        // Apply discount if code provided
        let appliedDiscount: Awaited<ReturnType<typeof db.getDiscountByCode>> = undefined;
        let loyaltyVoucherCode: string | null = null;
        if (input.discountCode && input.discountCode.startsWith('REWARD:')) {
          // Loyalty reward redemption
          loyaltyVoucherCode = input.discountCode.replace('REWARD:', '');
          if (ctx.user?.id) {
            const [reward] = await dbInstance!.select().from(loyaltyRewards)
              .where(and(
                eq(loyaltyRewards.voucherCode, loyaltyVoucherCode),
                eq(loyaltyRewards.userId, ctx.user.id),
                eq(loyaltyRewards.isRedeemed, false)
              ));
            if (reward && new Date(reward.expiresAt) > new Date()) {
              // Find the most expensive large drink in the order to make free
              const largeDrinkItems = input.items.filter(item => item.size === 'large');
              if (largeDrinkItems.length > 0) {
                const mostExpensive = largeDrinkItems.reduce((max, item) => 
                  item.unitPrice > max.unitPrice ? item : max, largeDrinkItems[0]);
                discountAmount = mostExpensive.unitPrice;
              }
            } else {
              // Invalid or expired reward, ignore
              loyaltyVoucherCode = null;
            }
          }
        } else if (input.discountCode) {
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

        // Birthday free drink detection
        let birthdayFreeApplied = false;
        if (ctx.user?.id && discountAmount === 0) {
          // Only apply birthday free drink if no other discount is already applied
          try {
            // POLICY: Customer must order at least 2 items to qualify for birthday free drink
            // This prevents abuse where someone registers just to claim a free drink without buying anything
            const totalItemQuantity = input.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
            
            if (totalItemQuantity >= 2) {
              const [birthdayUser] = await dbInstance!.select({
                birthMonth: users.birthMonth,
                birthDay: users.birthDay,
                birthdayCodeUsedYear: users.birthdayCodeUsedYear,
              }).from(users).where(eq(users.id, ctx.user.id));

              if (birthdayUser?.birthMonth && birthdayUser?.birthDay) {
                const now = new Date();
                const currentYear = now.getFullYear();
                
                // Check if birthday free drink already used this year
                if (birthdayUser.birthdayCodeUsedYear !== currentYear) {
                  // Check if today is within the birthday week (3 days before to 3 days after)
                  const birthdayThisYear = new Date(currentYear, birthdayUser.birthMonth - 1, birthdayUser.birthDay);
                  const diffMs = now.getTime() - birthdayThisYear.getTime();
                  const diffDays = diffMs / (1000 * 60 * 60 * 24);
                  
                  if (diffDays >= -3 && diffDays <= 3) {
                    // Birthday week! Find the most expensive item to make free
                    const mostExpensiveItem = input.items.reduce((max, item) => 
                      item.lineTotal > max.lineTotal ? item : max, input.items[0]);
                    
                    if (mostExpensiveItem) {
                      discountAmount = mostExpensiveItem.lineTotal;
                      birthdayFreeApplied = true;
                      console.log(`[Order] Birthday free drink applied for user ${ctx.user.id}: ${mostExpensiveItem.productName} (₹${mostExpensiveItem.lineTotal / 100})`);
                    }
                  }
                }
              }
            } else {
              console.log(`[Order] Birthday free drink skipped for user ${ctx.user?.id}: requires at least 2 items, got ${totalItemQuantity}`);
            }
          } catch (bdErr) {
            console.error('Birthday check failed:', bdErr);
            // Don't fail the order - birthday check is non-critical
          }
        }

        // =============================================
        // PARTNER PROGRAMME BENEFITS
        // =============================================
        let partnerBenefitAmount = 0;
        let partnerSubId: number | null = null;
        let partnerBenefitsToLog: Array<{
          type: 'free_biang_biang' | 'free_large_tea' | 'tea_discount';
          amount: number;
          itemName?: string;
          itemOriginalPrice?: number;
          discountPercent?: number;
          teaItemsCount?: number;
        }> = [];

        if (ctx.user?.id) {
          try {
            const outletId = input.orderType === 'delivery' ? 2 : (input.outletId || 2);
            const partnerResult = await calculatePartnerBenefits(
              ctx.user.id,
              outletId,
              input.items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                lineTotal: item.lineTotal,
                size: item.size || null,
                quantity: item.quantity,
              }))
            );

            if (partnerResult && partnerResult.totalBenefitAmount > 0) {
              partnerBenefitAmount = partnerResult.totalBenefitAmount;
              partnerSubId = partnerResult.subscription.id;
              partnerBenefitsToLog = partnerResult.benefits;
              console.log(`[Order] Partner benefits applied for user ${ctx.user.id}: ₹${partnerBenefitAmount / 100} (${partnerResult.benefits.map(b => b.type).join(', ')})`);
            }
          } catch (partnerErr) {
            console.error('Partner benefit calculation failed:', partnerErr);
            // Don't fail the order - partner benefits are non-critical
          }
        }

        // Recalculate GST on net amount after discount
        const netAfterDiscount = subtotal - discountAmount - partnerBenefitAmount;
        const finalGst = (birthdayFreeApplied || partnerBenefitAmount > 0) ? calculateGst(netAfterDiscount) : gst;
        const totalAmount = subtotal + finalGst.total + deliveryCharge - discountAmount - partnerBenefitAmount - input.loyaltyPointsUsed;
        
        // Generate sequential order number (resets each financial year on April 1st)
        // Format: YY-NNNNN (e.g., "26-00001" for FY 2026-27)
        const { generateNextOrderNumber } = await import('./orderNumberHelper');
        const orderNumber = await generateNextOrderNumber(dbInstance!);

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
          stateGst: finalGst.stateGst,
          centralGst: finalGst.centralGst,
          deliveryCharge,
          discountAmount,
          loyaltyPointsUsed: input.loyaltyPointsUsed,
          totalAmount,
          deliveryAddressId: input.deliveryAddressId,
          deliveryAddress: input.deliveryAddress,
          scheduledTime: input.scheduledTime ? new Date(input.scheduledTime) : null,
          discountCode: birthdayFreeApplied ? 'BIRTHDAY_FREE_DRINK' : input.discountCode,
          specialInstructions: input.specialInstructions,
          partnerBenefitAmount,
          partnerSubscriptionId: partnerSubId,
          // If this is an offline-synced order, use the original creation timestamp
          ...(input.offlineCreatedAt ? { createdAt: new Date(input.offlineCreatedAt) } : {}),
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
        
        // Mark birthday free drink as used for this year
        if (birthdayFreeApplied && ctx.user?.id) {
          try {
            await dbInstance!.update(users).set({
              birthdayCodeUsedYear: new Date().getFullYear(),
            }).where(eq(users.id, ctx.user.id));
            console.log(`[Order] Birthday free drink marked as used for user ${ctx.user.id} in ${new Date().getFullYear()}`);
          } catch (bdUpdateErr) {
            console.error('Failed to update birthdayCodeUsedYear:', bdUpdateErr);
          }
        }

        // Redeem loyalty reward voucher if used
        if (loyaltyVoucherCode && ctx.user?.id && discountAmount > 0) {
          try {
            // Mark reward as redeemed
            await dbInstance!.update(loyaltyRewards).set({
              isRedeemed: true,
              redeemedAt: new Date(),
              redeemedOrderId: orderId,
            }).where(and(
              eq(loyaltyRewards.voucherCode, loyaltyVoucherCode),
              eq(loyaltyRewards.userId, ctx.user.id)
            ));
            
            // Log stamp transaction for redemption
            await dbInstance!.insert(stampTransactions).values({
              userId: ctx.user.id,
              orderId: orderId,
              action: 'redeem',
              stamps: -10,
              orderTotal: totalAmount,
              description: `Redeemed reward: Free Large Drink on order #${orderNumber}`,
              createdAt: new Date(),
            });
            
            // Deduct 10 stamps from user
            const [currentUser] = await dbInstance!.select({ stampCount: users.stampCount }).from(users).where(eq(users.id, ctx.user.id));
            const newStampCount = Math.max(0, (currentUser?.stampCount || 0) - 10);
            await dbInstance!.update(users).set({ stampCount: newStampCount }).where(eq(users.id, ctx.user.id));
          } catch (rewardErr) {
            console.error('Failed to redeem loyalty reward:', rewardErr);
            // Don't fail the order - the reward can be manually reconciled
          }
        }
        
        // Log Partner benefits
        if (partnerSubId && partnerBenefitsToLog.length > 0) {
          try {
            const outletId = input.orderType === 'delivery' ? 2 : (input.outletId || 2);
            for (const benefit of partnerBenefitsToLog) {
              await dbInstance!.insert(partnerBenefitsLog).values({
                subscriptionId: partnerSubId,
                userId: ctx.user!.id,
                orderId,
                orderNumber,
                outletId,
                benefitType: benefit.type,
                benefitAmount: benefit.amount,
                itemName: benefit.itemName || null,
                itemOriginalPrice: benefit.itemOriginalPrice || null,
                discountPercent: benefit.discountPercent || null,
                teaItemsCount: benefit.teaItemsCount || null,
              });
            }
          } catch (benefitLogErr) {
            console.error('Failed to log partner benefits:', benefitLogErr);
            // Don't fail the order
          }
        }

        return { orderId, orderNumber, totalAmount, partnerBenefitAmount };
        } catch (err: any) {
          console.error('Order creation failed:', err);
          // Never expose raw SQL errors to customers
          if (err instanceof TRPCError) throw err;
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unable to place your order right now. Please try again or contact the store.',
          });
        }
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
          outletId: order.outletId || 2,
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
        
        // Look up customer email from users table for Google Customer Reviews
        let customerEmail: string | null = null;
        if (order.userId) {
          const dbInstance = await db.getDb();
          if (dbInstance) {
            const [user] = await dbInstance.select({ email: users.email }).from(users).where(eq(users.id, order.userId));
            customerEmail = user?.email || null;
          }
        }
        
        return { order: { ...order, customerEmail }, items };
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
        
        // Update payment method, status, and proof if provided (for completed in-store orders)
        if (input.status === 'completed' && (input.paymentMethod || input.paymentProofUrl)) {
          const updateData: any = {};
          if (input.paymentMethod) {
            updateData.paymentMethod = input.paymentMethod;
            updateData.paymentStatus = 'completed';
            updateData.paymentCollectedAt = new Date();
          }
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
            outletId: order.outletId || 2,
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
          } else if (orderTotal <= 0) {
            // POLICY: Do not award stamps (including welcome stamps) on zero-value orders
            // This prevents gaming via birthday-only or fully-discounted orders
            console.log(`[Order] Stamps skipped for order #${order.orderNumber}: zero-value order (₹${orderTotal / 100})`);
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
        paymentMethod: z.enum(['upi', 'cash', 'card', 'swiggy_dineout', 'zomato_dineout', 'eazydiner', 'other']).default('cash'),
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
        
        // Update payment status to completed with accountability tracking
        await dbInstance
          .update(orders)
          .set({
            paymentStatus: 'completed',
            paymentMethod: input.paymentMethod,
            paymentCollectedBy: ctx.user.name || 'Staff',
            paymentCollectedAt: new Date(),
            paymentNote: input.notes || `Payment collected: ${input.paymentMethod} (by ${ctx.user.name || 'Staff'})`,
            staffNotes: input.notes ? `[Payment: ${input.paymentMethod}] ${input.notes}` : `[Payment: ${input.paymentMethod} collected by ${ctx.user.name || 'Staff'}]`,
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
          .orderBy(sql`${orders.createdAt} DESC`)
          .limit(input?.limit || 50);
        
        // Get unredeemed rewards for registered CUSTOMER users in these orders (exclude staff/admin)
        const userIds = Array.from(new Set(recentOrders.filter(o => o.userId && o.userId > 0).map(o => o.userId!)));
        const userRewardsMap: Record<number, { count: number; rewards: { id: number; voucherCode: string; rewardType: string; expiresAt: Date }[] }> = {};
        if (userIds.length > 0) {
          // First, identify which userIds belong to staff/admin so we can exclude them
          const staffAdminUsers = await dbInstance.select({ id: users.id }).from(users)
            .where(and(
              inArray(users.id, userIds),
              inArray(users.role, ['staff', 'admin'])
            ));
          const staffAdminIds = new Set(staffAdminUsers.map(u => u.id));
          const customerUserIds = userIds.filter(id => !staffAdminIds.has(id));
          
          if (customerUserIds.length > 0) {
            const activeRewards = await dbInstance.select().from(loyaltyRewards)
              .where(eq(loyaltyRewards.isRedeemed, false));
            const now = new Date();
            activeRewards.forEach(r => {
              if (new Date(r.expiresAt) > now && customerUserIds.includes(r.userId)) {
                if (!userRewardsMap[r.userId]) userRewardsMap[r.userId] = { count: 0, rewards: [] };
                userRewardsMap[r.userId].count += 1;
                userRewardsMap[r.userId].rewards.push({ id: r.id, voucherCode: r.voucherCode, rewardType: r.rewardType, expiresAt: r.expiresAt });
              }
            });
          }
        }

        // Get order items for each order
        const ordersWithItems = await Promise.all(
          recentOrders.map(async (order) => {
            const items = await dbInstance.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
            const customerRewards = order.userId ? userRewardsMap[order.userId] : undefined;
            return { ...order, items, customerRewards: customerRewards || null };
          })
        );
        
        return ordersWithItems;
      }),

    // Get orders with failed/pending Razorpay payments (for staff alert system)
    getFailedPayments: staffProcedure
      .query(async () => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];
        
        // Find orders where:
        // 1. razorpayOrderId exists (Razorpay checkout was initiated)
        // 2. paymentStatus is still 'pending' (payment not completed)
        // 3. Order is not cancelled
        // 4. Created in the last 24 hours (recent enough to act on)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const failedOrders = await dbInstance
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            customerName: orders.customerName,
            customerPhone: orders.customerPhone,
            totalAmount: orders.totalAmount,
            orderType: orders.orderType,
            orderStatus: orders.orderStatus,
            paymentStatus: orders.paymentStatus,
            razorpayOrderId: orders.razorpayOrderId,
            razorpayPaymentId: orders.razorpayPaymentId,
            tableNumber: orders.tableNumber,
            outletId: orders.outletId,
            createdAt: orders.createdAt,
          })
          .from(orders)
          .where(
            and(
              sql`${orders.razorpayOrderId} IS NOT NULL AND ${orders.razorpayOrderId} != ''`,
              eq(orders.paymentStatus, 'pending'),
              sql`${orders.orderStatus} != 'cancelled'`,
              gte(orders.createdAt, twentyFourHoursAgo),
            )
          )
          .orderBy(desc(orders.createdAt));
        
        // Also get guest info for guest orders
        const enrichedOrders = await Promise.all(
          failedOrders.map(async (order) => {
            let guestInfo = null;
            if (!order.customerName || !order.customerPhone) {
              const [guest] = await dbInstance.select().from(guestOrders).where(eq(guestOrders.orderId, order.id));
              if (guest) {
                guestInfo = { name: guest.guestName, phone: guest.guestPhone };
              }
            }
            
            const minutesAgo = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
            
            return {
              ...order,
              customerName: order.customerName || guestInfo?.name || 'Unknown',
              customerPhone: order.customerPhone || guestInfo?.phone || '',
              minutesAgo,
              isUrgent: minutesAgo <= 15, // Within 15 min = customer might still be in shop
            };
          })
        );
        
        return enrichedOrders;
      }),

    // Staff can verify a failed Razorpay payment via API and recover it
    verifyFailedPayment: staffProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const [order] = await dbInstance.select().from(orders).where(eq(orders.id, input.orderId));
        if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        
        if (!order.razorpayOrderId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No Razorpay order ID found' });
        }
        
        if (order.paymentStatus === 'completed') {
          return { success: true, alreadyPaid: true, message: 'Payment already completed' };
        }
        
        // Check Razorpay API for any captured payment
        const { fetchOrderPayments } = await import('./razorpay');
        const rpPayments = await fetchOrderPayments(order.razorpayOrderId);
        
        const capturedPayment = rpPayments.find((p: any) => p.status === 'captured');
        
        if (!capturedPayment) {
          // No payment found - return failure info for staff
          const failedPayments = rpPayments.filter((p: any) => p.status === 'failed');
          return { 
            success: false, 
            alreadyPaid: false, 
            message: `No successful payment found. ${failedPayments.length} failed attempt(s).`,
            failedAttempts: failedPayments.length,
            lastFailReason: failedPayments[0]?.error_description || failedPayments[0]?.error_reason || 'Unknown',
          };
        }
        
        // Payment found! Recover it
        let paymentMethod: 'upi' | 'card' | 'razorpay' = 'razorpay';
        if (capturedPayment.method === 'upi') paymentMethod = 'upi';
        else if (capturedPayment.method === 'card') paymentMethod = 'card';
        
        await dbInstance
          .update(orders)
          .set({
            paymentStatus: 'completed',
            razorpayPaymentId: capturedPayment.id,
            paymentMethod: paymentMethod,
            paymentCollectedBy: ctx.user.name || 'Staff',
            paymentCollectedAt: new Date(),
            paymentNote: `Recovered via failed payment alert by ${ctx.user.name || 'Staff'}. Payment ID: ${capturedPayment.id}, Amount: ₹${(capturedPayment.amount / 100).toFixed(2)}, Method: ${capturedPayment.method}`,
          })
          .where(eq(orders.id, input.orderId));
        
        // Also update order status to confirmed if still pending
        if (order.orderStatus === 'pending') {
          await dbInstance
            .update(orders)
            .set({ orderStatus: 'confirmed' })
            .where(eq(orders.id, input.orderId));
        }
        
        return { 
          success: true, 
          alreadyPaid: false, 
          message: `Payment recovered! ₹${(capturedPayment.amount / 100).toFixed(2)} via ${capturedPayment.method}`,
          paymentId: capturedPayment.id,
          amount: capturedPayment.amount,
        };
      }),

    // Staff can cancel a failed payment order
    cancelFailedPaymentOrder: staffProcedure
      .input(z.object({ 
        orderId: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const [order] = await dbInstance.select().from(orders).where(eq(orders.id, input.orderId));
        if (!order) throw new TRPCError({ code: 'NOT_FOUND' });
        
        if (order.orderStatus === 'completed' || order.orderStatus === 'cancelled') {
          return { success: false, message: 'Order already completed or cancelled' };
        }
        
        await dbInstance
          .update(orders)
          .set({ 
            orderStatus: 'cancelled',
            staffNotes: `Cancelled via payment alert by ${ctx.user.name || 'Staff'}. Reason: ${input.reason || 'Payment failed - customer did not re-attempt'}`,
          })
          .where(eq(orders.id, input.orderId));
        
        return { success: true, message: 'Order cancelled' };
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

    // Verify payment with Razorpay API - for recovering missed callbacks
    verifyRazorpayPayment: staffProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const [order] = await dbInstance.select().from(orders).where(eq(orders.id, input.orderId));
        if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        
        if (!order.razorpayOrderId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No Razorpay order ID found for this order' });
        }
        
        if (order.paymentStatus === 'completed') {
          return { success: true, alreadyPaid: true, message: 'Payment already marked as completed' };
        }
        
        const { fetchOrderPayments } = await import('./razorpay');
        const payments = await fetchOrderPayments(order.razorpayOrderId);
        
        // Find a captured payment
        const capturedPayment = payments.find((p: any) => p.status === 'captured');
        
        if (!capturedPayment) {
          return { success: false, alreadyPaid: false, message: `No captured payment found in Razorpay for order ${order.razorpayOrderId}. ${payments.length} payment(s) found with statuses: ${payments.map((p: any) => p.status).join(', ') || 'none'}` };
        }
        
        // Determine payment method from Razorpay
        let paymentMethod: 'upi' | 'card' | 'razorpay' = 'razorpay';
        if (capturedPayment.method === 'upi') paymentMethod = 'upi';
        else if (capturedPayment.method === 'card') paymentMethod = 'card';
        
        // Update the order with the recovered payment info
        await dbInstance
          .update(orders)
          .set({
            paymentStatus: 'completed',
            razorpayPaymentId: capturedPayment.id,
            paymentMethod: paymentMethod,
            paymentCollectedBy: ctx.user.name || 'Staff',
            paymentCollectedAt: new Date(),
            paymentNote: `Recovered via Razorpay API verification by ${ctx.user.name || 'Staff'}. Payment ID: ${capturedPayment.id}, Amount: ₹${(capturedPayment.amount / 100).toFixed(2)}, Method: ${capturedPayment.method}`,
          })
          .where(eq(orders.id, input.orderId));
        
        return {
          success: true,
          alreadyPaid: false,
          message: `Payment verified! ₹${(capturedPayment.amount / 100).toFixed(2)} via ${capturedPayment.method}. Payment ID: ${capturedPayment.id}`,
          paymentId: capturedPayment.id,
          amount: capturedPayment.amount,
          method: capturedPayment.method,
        };
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
        
        // Recalculate discount if a percentage-based discount code is applied
        let newDiscountAmount = order.discountAmount || 0;
        if (order.discountCode) {
          const [discount] = await dbInstance.select().from(discounts).where(eq(discounts.code, order.discountCode));
          if (discount && discount.type === 'percentage') {
            newDiscountAmount = Math.round(newSubtotal * discount.value / 100);
            if (discount.maxDiscountAmount && newDiscountAmount > discount.maxDiscountAmount) {
              newDiscountAmount = discount.maxDiscountAmount;
            }
          }
        }
        
        const discountedSubtotal = newSubtotal - newDiscountAmount;
        const newStateGst = Math.round(discountedSubtotal * 0.025);
        const newCentralGst = Math.round(discountedSubtotal * 0.025);
        const newTotalAmount = discountedSubtotal + newStateGst + newCentralGst + order.deliveryCharge;
        
        // Update order totals
        await dbInstance
          .update(orders)
          .set({
            subtotal: newSubtotal,
            discountAmount: newDiscountAmount,
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
          outletId: order.outletId || 2,
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
        
        // Recalculate discount if a percentage-based discount code is applied
        let newDiscountAmount = order.discountAmount || 0;
        if (order.discountCode) {
          const [discount] = await dbInstance.select().from(discounts).where(eq(discounts.code, order.discountCode));
          if (discount && discount.type === 'percentage') {
            newDiscountAmount = Math.round(newSubtotal * discount.value / 100);
            if (discount.maxDiscountAmount && newDiscountAmount > discount.maxDiscountAmount) {
              newDiscountAmount = discount.maxDiscountAmount;
            }
          }
        }
        
        const discountedSubtotal = newSubtotal - newDiscountAmount;
        const newStateGst = Math.round(discountedSubtotal * 0.025);
        const newCentralGst = Math.round(discountedSubtotal * 0.025);
        const newTotalAmount = discountedSubtotal + newStateGst + newCentralGst + order.deliveryCharge;
        
        // Update order totals
        await dbInstance
          .update(orders)
          .set({
            subtotal: newSubtotal,
            discountAmount: newDiscountAmount,
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
          outletId: order.outletId || 2,
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
          outletId: order.outletId || 2,
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
        
        // Get product details and addons for each item
        const itemsWithProducts = await Promise.all(
          items.map(async (item) => {
            const [product] = await dbInstance.select().from(products).where(eq(products.id, item.productId));
            const addons = await dbInstance.select().from(orderItemAddons).where(eq(orderItemAddons.orderItemId, item.id));
            return { ...item, product, addonsList: addons };
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
        
        // Save razorpayOrderId immediately so webhook can find the order
        const dbInstance = await getDb();
        if (dbInstance) {
          await dbInstance.update(orders)
            .set({ razorpayOrderId: razorpayOrder.id })
            .where(eq(orders.id, input.orderId));
        }
        
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
            outletId: order.outletId || 2, // Default to T Nagar if not specified
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
            outletId: order.outletId || 2,
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
    // Get full menu for admin - NO availability filtering, shows everything
    getFullMenuAdmin: staffProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return { categories: [], subcategories: [], products: [], addons: [] };

      // Get ALL categories, subcategories, products without any availability filtering
      const cats = await db.getCategories(false); // include inactive categories
      const subs = await db.getSubcategories(undefined, false); // include inactive subcategories
      const allProds = await dbInstance.select().from(products)
        .orderBy(asc(products.displayOrder));
      const adds = await db.getAddons();

      return { categories: cats, subcategories: subs, products: allProds, addons: adds };
    }),

    // Food Schedule Management
    getFoodSchedule: staffProcedure.query(async () => {
      const config = await getFoodSchedule();
      const formatted = formatSchedule(config);
      const currentlyAvailable = await isFoodAvailable();
      return { config, formatted, currentlyAvailable };
    }),

    updateFoodSchedule: adminProcedure
      .input(z.object({
        enabled: z.boolean(),
        manualOverride: z.enum(['on', 'off']).nullable().optional(),
        weekday: z.array(z.object({
          startHour: z.number().min(0).max(24),
          startMinute: z.number().min(0).max(59),
          endHour: z.number().min(0).max(24),
          endMinute: z.number().min(0).max(59),
        })),
        weekend: z.array(z.object({
          startHour: z.number().min(0).max(24),
          startMinute: z.number().min(0).max(59),
          endHour: z.number().min(0).max(24),
          endMinute: z.number().min(0).max(59),
        })),
      }))
      .mutation(async ({ input }) => {
        const success = await saveFoodSchedule(input);
        if (!success) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to save food schedule' });
        invalidateScheduleCache();
        return { success: true };
      }),

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
        
        // Update BOTH isAvailable AND isInStock — the menu page checks isInStock
        await dbInstance!.update(products).set({ isAvailable, isInStock: isAvailable }).where(eq(products.id, id));
        
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
        isNonVeg: z.boolean().default(false),
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
        // isActive removed - product activation/deactivation requires dedicated deleteProduct/reactivateProduct with double confirmation
        subcategoryId: z.number().optional(),
        isVegetarian: z.boolean().optional(),
        isVegan: z.boolean().optional(),
        containsEgg: z.boolean().optional(),
        isNonVeg: z.boolean().optional(),
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
        
        // Update the product (only if there are actual changes)
        if (Object.keys(data).length > 0) {
          await dbInstance!.update(products).set(data).where(eq(products.id, id));
        }
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

    // Deactivate product (soft delete) - requires double confirmation
    // Admin must provide product name AND confirmation code
    deleteProduct: adminProcedure
      .input(z.object({ 
        id: z.number(),
        confirmProductName: z.string(), // Must match the product name exactly
        confirmationCode: z.string(), // Must be "DEACTIVATE"
      }))
      .mutation(async ({ input, ctx }) => {
        if (input.confirmationCode !== 'DEACTIVATE') {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Invalid confirmation code. You must type DEACTIVATE to proceed.' 
          });
        }
        
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Get product for audit log
        const [product] = await dbInstance!.select().from(products).where(eq(products.id, input.id));
        if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
        
        // Verify product name matches (case-insensitive trim)
        if (product.name.trim().toLowerCase() !== input.confirmProductName.trim().toLowerCase()) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Product name does not match. Please type the exact product name to confirm.' 
          });
        }
        
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
        console.log(`[deleteProduct] Product ${input.id} (${product.name}) deactivated by ${ctx.user?.name} with double confirmation`);
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

    // Permanently delete a product (only if no order history) - requires STRICT double confirmation
    // Admin must type product name AND "DELETE-FOREVER" to proceed
    permanentlyDeleteProduct: adminProcedure
      .input(z.object({ 
        id: z.number(),
        confirmProductName: z.string(), // Must match the product name exactly
        confirmationCode: z.string(), // Must be "DELETE-FOREVER"
      }))
      .mutation(async ({ input, ctx }) => {
        if (input.confirmationCode !== 'DELETE-FOREVER') {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Invalid confirmation code. You must type DELETE-FOREVER to proceed.' 
          });
        }
        
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        // Get product
        const [product] = await dbInstance!.select().from(products).where(eq(products.id, input.id));
        if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
        
        // Verify product name matches (case-insensitive trim)
        if (product.name.trim().toLowerCase() !== input.confirmProductName.trim().toLowerCase()) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Product name does not match. Please type the exact product name to confirm.' 
          });
        }
        
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
        
        console.log(`[permanentlyDeleteProduct] Product ${input.id} (${product.name}) PERMANENTLY deleted by ${ctx.user?.name} with double confirmation`);
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
        
        // When reactivating, also reset isAvailable to true so product appears on customer menu
        await dbInstance!.update(products).set({ isActive: true, isAvailable: true }).where(eq(products.id, input.id));
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
    // Bulk toggle outlet availability for products
    bulkToggleOutletAvailability: adminProcedure
      .input(z.object({
        productIds: z.array(z.number()),
        outlet: z.enum(['palladium', 'tnagar']),
        isAvailable: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const field = input.outlet === 'palladium' ? products.availableAtPalladium : products.availableAtTnagar;
        for (const productId of input.productIds) {
          await dbInstance.update(products)
            .set({ [input.outlet === 'palladium' ? 'availableAtPalladium' : 'availableAtTnagar']: input.isAvailable })
            .where(eq(products.id, productId));
        }
        return { success: true, updated: input.productIds.length };
      }),

    // Toggle single product outlet availability (quick toggle)
    toggleProductOutlet: adminProcedure
      .input(z.object({
        productId: z.number(),
        outlet: z.enum(['palladium', 'tnagar']),
        isAvailable: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await dbInstance.update(products)
          .set({ [input.outlet === 'palladium' ? 'availableAtPalladium' : 'availableAtTnagar']: input.isAvailable })
          .where(eq(products.id, input.productId));
        return { success: true };
      }),

    // Bulk toggle entire subcategory for an outlet
    toggleSubcategoryOutlet: adminProcedure
      .input(z.object({
        subcategoryId: z.number(),
        outlet: z.enum(['palladium', 'tnagar']),
        isAvailable: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        // Update all products in this subcategory
        const subProducts = await dbInstance.select({ id: products.id }).from(products).where(eq(products.subcategoryId, input.subcategoryId));
        const col = input.outlet === 'palladium' ? 'availableAtPalladium' : 'availableAtTnagar';
        for (const p of subProducts) {
          await dbInstance.update(products).set({ [col]: input.isAvailable }).where(eq(products.id, p.id));
        }
        // Also update the subcategory itself
        const { subcategories } = await import('../drizzle/schema.js');
        await dbInstance.update(subcategories).set({ [col]: input.isAvailable }).where(eq(subcategories.id, input.subcategoryId));
        return { success: true, updated: subProducts.length };
      }),

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

    // Staff: Redeem a customer's reward at the counter
    staffRedeemReward: staffProcedure
      .input(z.object({
        rewardId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await getDb();
        
        // Find the reward
        const [reward] = await dbInstance!
          .select()
          .from(loyaltyRewards)
          .where(eq(loyaltyRewards.id, input.rewardId));
        
        if (!reward) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Reward not found' });
        }
        
        if (reward.isRedeemed) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This reward has already been redeemed' });
        }
        
        if (new Date(reward.expiresAt) < new Date()) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This reward has expired' });
        }
        
        // Mark as redeemed by staff
        await dbInstance!
          .update(loyaltyRewards)
          .set({
            isRedeemed: true,
            redeemedAt: new Date(),
            redeemedOrderId: null, // Staff counter redemption, no specific order
          })
          .where(eq(loyaltyRewards.id, reward.id));
        
        // Log the redemption in stamp transactions
        await dbInstance!.insert(stampTransactions).values({
          userId: reward.userId,
          orderId: null,
          action: 'redeem',
          stamps: 0,
          description: `Reward redeemed at counter by ${ctx.user.name || 'Staff'}${input.notes ? ` — ${input.notes}` : ''}`,
        });
        
        // Get customer name for confirmation
        const [customer] = await dbInstance!
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, reward.userId));
        
        return {
          success: true,
          customerName: customer?.name || 'Customer',
          rewardType: reward.rewardType,
          voucherCode: reward.voucherCode,
          redeemedAt: new Date(),
          redeemedBy: ctx.user.name || 'Staff',
        };
      }),

    // Staff/Admin: Get all rewards for a specific customer (for admin customer view)
    getCustomerRewards: staffProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        const rewards = await dbInstance!
          .select()
          .from(loyaltyRewards)
          .where(eq(loyaltyRewards.userId, input.customerId))
          .orderBy(desc(loyaltyRewards.createdAt));
        
        return rewards.map(r => ({
          id: r.id,
          rewardType: r.rewardType,
          voucherCode: r.voucherCode,
          isRedeemed: r.isRedeemed,
          redeemedAt: r.redeemedAt,
          redeemedOrderId: r.redeemedOrderId,
          expiresAt: r.expiresAt,
          createdAt: r.createdAt,
          isExpired: new Date(r.expiresAt) < new Date(),
        }));
      }),

    // Customer: Get own reward history (for profile page proof)
    getMyRewardHistory: protectedProcedure.query(async ({ ctx }) => {
      const dbInstance = await getDb();
      const rewards = await dbInstance!
        .select()
        .from(loyaltyRewards)
        .where(eq(loyaltyRewards.userId, ctx.user.id))
        .orderBy(desc(loyaltyRewards.createdAt));
      
      return rewards.map(r => ({
        id: r.id,
        rewardType: r.rewardType,
        voucherCode: r.voucherCode,
        isRedeemed: r.isRedeemed,
        redeemedAt: r.redeemedAt,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
        isExpired: !r.isRedeemed && new Date(r.expiresAt) < new Date(),
        status: r.isRedeemed ? 'redeemed' as const : (new Date(r.expiresAt) < new Date() ? 'expired' as const : 'available' as const),
      }));
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
        // Offline sync: original timestamp when order was placed offline
        offlineCreatedAt: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        
        try {
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
        // Tiered delivery charge based on distance, FREE for orders above ₹2500
        let deliveryCharge = 0;
        if (input.orderType === 'delivery') {
          if (subtotal >= 250000) {
            deliveryCharge = 0; // Free delivery for orders ≥₹2500
          } else {
            const deliveryAddr = input.addressLine1 
              ? `${input.addressLine1}${input.addressLine2 ? ', ' + input.addressLine2 : ''}, ${input.area}, Chennai - ${input.pincode}`
              : '';
            if (deliveryAddr) {
              const chargeResult = await calculateDeliveryCharge(deliveryAddr);
              deliveryCharge = chargeResult.chargePaise;
              console.log(`[GuestOrder] Delivery charge: ${chargeResult.tierLabel} (${chargeResult.distanceKm}km, ${chargeResult.distanceText})`);
            } else {
              deliveryCharge = 10000; // Fallback ₹100 if no address
            }
          }
        }
        const totalAmount = subtotal + gstDetails.total + deliveryCharge;
        
        // Generate sequential order number (resets each financial year on April 1st)
        // Format: YY-NNNNN (e.g., "26-00001" for FY 2026-27)
        const { generateNextOrderNumber } = await import('./orderNumberHelper');
        const orderNumber = await generateNextOrderNumber(dbInstance!);
        
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
          // If this is an offline-synced order, use the original creation timestamp
          ...(input.offlineCreatedAt ? { createdAt: new Date(input.offlineCreatedAt) } : {}),
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
        } catch (err: any) {
          console.error('Guest order creation failed:', err);
          if (err instanceof TRPCError) throw err;
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unable to place your order right now. Please try again or contact the store.',
          });
        }
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
              addons: item.addons?.map((a: any) => ({ name: a.name, price: a.price })) || [],
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
          .leftJoin(products, eq(orderItemsTable.productId, products.id))
          .where(sql`${orderItemsTable.orderId} IN (${sql.join(orderIds, sql`, `)})`);

        const allCategories = await dbInstance.select().from(categories);
        const allSubcategories = await dbInstance.select().from(subcategories);
        const subcatToCat: Record<number, number> = {};
        allSubcategories.forEach(s => { subcatToCat[s.id] = s.categoryId; });

        // Use catId 0 for "Custom Items" category (items with no product match)
        const categoryStats: Record<number, { revenue: number; quantity: number; orders: Set<number> }> = {};
        items.forEach(item => {
          const catId = item.subcategoryId ? (subcatToCat[item.subcategoryId] ?? 0) : 0;
          if (!categoryStats[catId]) categoryStats[catId] = { revenue: 0, quantity: 0, orders: new Set() };
          categoryStats[catId].revenue += item.totalPrice;
          categoryStats[catId].quantity += item.quantity;
          categoryStats[catId].orders.add(item.orderId);
        });

        const result = allCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          revenue: categoryStats[cat.id]?.revenue || 0,
          quantity: categoryStats[cat.id]?.quantity || 0,
          orderCount: categoryStats[cat.id]?.orders.size || 0,
        }));

        // Add "Custom Items" row if there are any custom items
        if (categoryStats[0]) {
          result.push({
            id: 0,
            name: 'Custom Items',
            revenue: categoryStats[0].revenue,
            quantity: categoryStats[0].quantity,
            orderCount: categoryStats[0].orders.size,
          });
        }

        return result.sort((a, b) => b.revenue - a.revenue);
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
          .leftJoin(products, eq(orderItemsTable.productId, products.id))
          .where(sql`${orderItemsTable.orderId} IN (${sql.join(orderIds, sql`, `)})`);

        const allSubcategories = await dbInstance.select().from(subcategories);
        let filteredSubcategories = allSubcategories;
        if (input?.categoryId) {
          filteredSubcategories = allSubcategories.filter(s => s.categoryId === input.categoryId);
        }

        const subcatStats: Record<number, { revenue: number; quantity: number; orders: Set<number> }> = {};
        items.forEach(item => {
          const subcatId = item.subcategoryId ?? 0;
          if (!subcatStats[subcatId]) subcatStats[subcatId] = { revenue: 0, quantity: 0, orders: new Set() };
          subcatStats[subcatId].revenue += item.totalPrice;
          subcatStats[subcatId].quantity += item.quantity;
          subcatStats[subcatId].orders.add(item.orderId);
        });

        const result = filteredSubcategories.map(sub => ({
          id: sub.id,
          name: sub.name,
          categoryId: sub.categoryId,
          revenue: subcatStats[sub.id]?.revenue || 0,
          quantity: subcatStats[sub.id]?.quantity || 0,
          orderCount: subcatStats[sub.id]?.orders.size || 0,
        })).filter(s => s.revenue > 0);

        // Add "Custom Items" row if there are any custom items and no category filter
        if (subcatStats[0] && !input?.categoryId) {
          result.push({
            id: 0,
            name: 'Custom Items',
            categoryId: 0,
            revenue: subcatStats[0].revenue,
            quantity: subcatStats[0].quantity,
            orderCount: subcatStats[0].orders.size,
          });
        }

        return result.sort((a, b) => b.revenue - a.revenue);
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
          .leftJoin(products, eq(orderItemsTable.productId, products.id))
          .where(sql`${orderItemsTable.orderId} IN (${sql.join(orderIds, sql`, `)})`);

        let filteredItems = items;
        if (input?.subcategoryId) {
          filteredItems = items.filter(i => i.subcategoryId === input.subcategoryId);
        } else if (input?.categoryId) {
          const allSubcategories = await dbInstance.select().from(subcategories);
          const subcatIds = allSubcategories.filter(s => s.categoryId === input.categoryId).map(s => s.id);
          filteredItems = items.filter(i => subcatIds.includes(i.subcategoryId ?? 0));
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

        // Get staff/admin user IDs to exclude from top customers
        const staffUsers = await dbInstance.select({ id: users.id, phone: users.phone })
          .from(users)
          .where(or(eq(users.role, 'staff'), eq(users.role, 'admin')));
        const staffUserIds = new Set(staffUsers.map(u => u.id));
        const staffPhones = new Set(staffUsers.map(u => u.phone).filter(Boolean));

        let conditions: any[] = [sql`${orders.orderStatus} != 'cancelled'`];
        if (input?.startDate) conditions.push(sql`${orders.createdAt} >= ${input.startDate}`);
        if (input?.endDate) conditions.push(sql`${orders.createdAt} <= ${input.endDate + ' 23:59:59'}`);

        const whereClause = and(...conditions);
        const matchingOrders = await dbInstance.select().from(orders).where(whereClause);

        const customerStats: Record<string, { name: string; phone: string; orders: number; totalSpent: number }> = {};
        matchingOrders.forEach(order => {
          // Skip orders from staff/admin users
          if (order.userId && staffUserIds.has(order.userId)) return;
          if (order.customerPhone && staffPhones.has(order.customerPhone)) return;

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
          const utcDate = new Date(order.createdAt);
          const hour = (utcDate.getUTCHours() + 5 + (utcDate.getUTCMinutes() + 30 >= 60 ? 1 : 0)) % 24;
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

    // Item-level Sales Analysis with Day-of-Week Heatmap
    getItemDayAnalysis: adminProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        categoryId: z.number().optional(),
        subcategoryId: z.number().optional(),
        orderType: z.enum(['all', 'instore', 'delivery', 'pickup']).default('all'),
        metric: z.enum(['quantity', 'revenue']).default('quantity'),
        limit: z.number().default(20),
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { products: [], dayTotals: [] };

        let conditions: any[] = [
          sql`${orders.orderStatus} != 'cancelled'`,
          sql`${orders.createdAt} >= ${input.startDate}`,
          sql`${orders.createdAt} <= ${input.endDate + ' 23:59:59'}`,
        ];
        if (input.orderType !== 'all') conditions.push(eq(orders.orderType, input.orderType));

        const matchingOrders = await dbInstance.select({
          id: orders.id,
          createdAt: orders.createdAt,
        }).from(orders).where(and(...conditions));
        const orderIds = matchingOrders.map(o => o.id);
        if (orderIds.length === 0) return { products: [], dayTotals: [] };

        // Build order date map
        const orderDateMap: Record<number, Date> = {};
        matchingOrders.forEach(o => { orderDateMap[o.id] = new Date(o.createdAt); });

        const items = await dbInstance
          .select({
            orderId: orderItemsTable.orderId,
            productId: orderItemsTable.productId,
            productName: orderItemsTable.productName,
            quantity: orderItemsTable.quantity,
            lineTotal: orderItemsTable.lineTotal,
            subcategoryId: products.subcategoryId,
            status: orderItemsTable.status,
          })
          .from(orderItemsTable)
          .innerJoin(products, eq(orderItemsTable.productId, products.id))
          .where(sql`${orderItemsTable.orderId} IN (${sql.join(orderIds, sql`, `)})`);

        // Filter by category/subcategory
        let filteredItems = items.filter(i => i.status === 'active' || !i.status);
        if (input.subcategoryId) {
          filteredItems = filteredItems.filter(i => i.subcategoryId === input.subcategoryId);
        } else if (input.categoryId) {
          const allSubs = await dbInstance.select().from(subcategories);
          const subcatIds = allSubs.filter(s => s.categoryId === input.categoryId).map(s => s.id);
          filteredItems = filteredItems.filter(i => subcatIds.includes(i.subcategoryId));
        }

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Build product x day matrix
        const productDayMap: Record<number, { name: string; total: number; totalRevenue: number; days: number[] }> = {};
        const dayTotals = [0, 0, 0, 0, 0, 0, 0];

        filteredItems.forEach(item => {
          const orderDate = orderDateMap[item.orderId];
          if (!orderDate) return;
          const dayIdx = orderDate.getDay();

          if (!productDayMap[item.productId]) {
            productDayMap[item.productId] = { name: item.productName, total: 0, totalRevenue: 0, days: [0, 0, 0, 0, 0, 0, 0] };
          }
          productDayMap[item.productId].days[dayIdx] += item.quantity;
          productDayMap[item.productId].total += item.quantity;
          productDayMap[item.productId].totalRevenue += item.lineTotal;
          dayTotals[dayIdx] += item.quantity;
        });

        // Sort and limit
        const sortKey = input.metric === 'revenue' ? 'totalRevenue' : 'total';
        const productList = Object.entries(productDayMap)
          .map(([id, data]) => ({
            id: Number(id),
            name: data.name,
            totalQuantity: data.total,
            totalRevenue: data.totalRevenue,
            days: data.days,
          }))
          .sort((a, b) => input.metric === 'revenue' ? b.totalRevenue - a.totalRevenue : b.totalQuantity - a.totalQuantity)
          .slice(0, input.limit);

        return {
          products: productList,
          dayTotals: dayNames.map((name, idx) => ({ day: name, total: dayTotals[idx] })),
        };
      }),

    // Product Mix Analysis - what items are commonly ordered together
    getProductMixAnalysis: adminProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        minOccurrences: z.number().default(3),
        limit: z.number().default(20),
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { pairs: [], insights: [] };

        let conditions: any[] = [
          sql`${orders.orderStatus} != 'cancelled'`,
          sql`${orders.createdAt} >= ${input.startDate}`,
          sql`${orders.createdAt} <= ${input.endDate + ' 23:59:59'}`,
        ];

        const matchingOrders = await dbInstance.select({ id: orders.id }).from(orders).where(and(...conditions));
        const orderIds = matchingOrders.map(o => o.id);
        if (orderIds.length === 0) return { pairs: [], insights: [] };

        const items = await dbInstance
          .select({
            orderId: orderItemsTable.orderId,
            productId: orderItemsTable.productId,
            productName: orderItemsTable.productName,
            status: orderItemsTable.status,
          })
          .from(orderItemsTable)
          .where(sql`${orderItemsTable.orderId} IN (${sql.join(orderIds, sql`, `)})`);

        const activeItems = items.filter(i => i.status === 'active' || !i.status);

        // Group items by order
        const orderProducts: Record<number, { id: number; name: string }[]> = {};
        activeItems.forEach(item => {
          if (!orderProducts[item.orderId]) orderProducts[item.orderId] = [];
          // Deduplicate within order
          if (!orderProducts[item.orderId].find(p => p.id === item.productId)) {
            orderProducts[item.orderId].push({ id: item.productId, name: item.productName });
          }
        });

        // Count co-occurrences (pairs)
        const pairCounts: Record<string, { productA: string; productB: string; count: number }> = {};
        Object.values(orderProducts).forEach(prods => {
          if (prods.length < 2) return;
          for (let i = 0; i < prods.length; i++) {
            for (let j = i + 1; j < prods.length; j++) {
              const [a, b] = [prods[i], prods[j]].sort((x, y) => x.id - y.id);
              const key = `${a.id}_${b.id}`;
              if (!pairCounts[key]) pairCounts[key] = { productA: a.name, productB: b.name, count: 0 };
              pairCounts[key].count++;
            }
          }
        });

        const pairs = Object.values(pairCounts)
          .filter(p => p.count >= input.minOccurrences)
          .sort((a, b) => b.count - a.count)
          .slice(0, input.limit);

        // Generate insights
        const insights: string[] = [];
        if (pairs.length > 0) {
          insights.push(`"${pairs[0].productA}" and "${pairs[0].productB}" are ordered together most often (${pairs[0].count} times).`);
        }
        if (pairs.length > 2) {
          const topPairs = pairs.slice(0, 3).map(p => `${p.productA} + ${p.productB}`);
          insights.push(`Top combos: ${topPairs.join(', ')}.`);
        }

        // Category-level co-occurrence
        const allSubs = await dbInstance.select().from(subcategories);
        const allCats = await dbInstance.select().from(categories);
        const prodSubMap: Record<number, number> = {};
        const allProds = await dbInstance.select({ id: products.id, subcategoryId: products.subcategoryId }).from(products);
        allProds.forEach(p => { prodSubMap[p.id] = p.subcategoryId; });
        const subCatMap: Record<number, number> = {};
        allSubs.forEach(s => { subCatMap[s.id] = s.categoryId; });
        const catNameMap: Record<number, string> = {};
        allCats.forEach(c => { catNameMap[c.id] = c.name; });

        const catPairCounts: Record<string, { catA: string; catB: string; count: number }> = {};
        Object.values(orderProducts).forEach(prods => {
          const catIds = Array.from(new Set(prods.map(p => subCatMap[prodSubMap[p.id]]).filter(Boolean)));
          if (catIds.length < 2) return;
          for (let i = 0; i < catIds.length; i++) {
            for (let j = i + 1; j < catIds.length; j++) {
              const [a, b] = [catIds[i], catIds[j]].sort();
              const key = `${a}_${b}`;
              if (!catPairCounts[key]) catPairCounts[key] = { catA: catNameMap[a] || String(a), catB: catNameMap[b] || String(b), count: 0 };
              catPairCounts[key].count++;
            }
          }
        });

        const topCatPair = Object.values(catPairCounts).sort((a, b) => b.count - a.count)[0];
        if (topCatPair) {
          insights.push(`${topCatPair.catA} + ${topCatPair.catB} categories are most commonly ordered together (${topCatPair.count} orders).`);
        }

        return { pairs, insights };
      }),

    // Hourly Product Category Analysis - what sells at what time
    getHourlyProductAnalysis: adminProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        orderType: z.enum(['all', 'instore', 'delivery', 'pickup']).default('all'),
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { hourlyData: [], categoryNames: [] };

        let conditions: any[] = [
          sql`${orders.orderStatus} != 'cancelled'`,
          sql`${orders.createdAt} >= ${input.startDate}`,
          sql`${orders.createdAt} <= ${input.endDate + ' 23:59:59'}`,
        ];
        if (input.orderType !== 'all') conditions.push(eq(orders.orderType, input.orderType));

        const matchingOrders = await dbInstance.select({
          id: orders.id,
          createdAt: orders.createdAt,
        }).from(orders).where(and(...conditions));
        const orderIds = matchingOrders.map(o => o.id);
        if (orderIds.length === 0) return { hourlyData: [], categoryNames: [] };

        // Convert UTC to IST (UTC+5:30) for hour extraction
        const orderHourMap: Record<number, number> = {};
        matchingOrders.forEach(o => {
          const utcDate = new Date(o.createdAt);
          const istHour = (utcDate.getUTCHours() + 5 + (utcDate.getUTCMinutes() + 30 >= 60 ? 1 : 0)) % 24;
          orderHourMap[o.id] = istHour;
        });

        const items = await dbInstance
          .select({
            orderId: orderItemsTable.orderId,
            quantity: orderItemsTable.quantity,
            lineTotal: orderItemsTable.lineTotal,
            subcategoryId: products.subcategoryId,
            status: orderItemsTable.status,
          })
          .from(orderItemsTable)
          .innerJoin(products, eq(orderItemsTable.productId, products.id))
          .where(sql`${orderItemsTable.orderId} IN (${sql.join(orderIds, sql`, `)})`);

        const activeItems = items.filter(i => i.status === 'active' || !i.status);

        const allSubs = await dbInstance.select().from(subcategories);
        const allCats = await dbInstance.select().from(categories);
        const subCatMap: Record<number, number> = {};
        allSubs.forEach(s => { subCatMap[s.id] = s.categoryId; });
        const catNameMap: Record<number, string> = {};
        allCats.forEach(c => { catNameMap[c.id] = c.name; });

        // Build hour x category matrix
        const hourCatMatrix: Record<number, Record<number, { quantity: number; revenue: number }>> = {};
        for (let h = 0; h < 24; h++) hourCatMatrix[h] = {};

        activeItems.forEach(item => {
          const hour = orderHourMap[item.orderId];
          if (hour === undefined) return;
          const catId = subCatMap[item.subcategoryId];
          if (!catId) return;
          if (!hourCatMatrix[hour][catId]) hourCatMatrix[hour][catId] = { quantity: 0, revenue: 0 };
          hourCatMatrix[hour][catId].quantity += item.quantity;
          hourCatMatrix[hour][catId].revenue += item.lineTotal;
        });

        // Get unique category IDs that have data
        const activeCatIds = Array.from(new Set(activeItems.map(i => subCatMap[i.subcategoryId]).filter(Boolean)));
        const categoryNames = activeCatIds.map(id => ({ id, name: catNameMap[id] || String(id) }));

        const hourlyData = Array.from({ length: 24 }, (_, h) => ({
          hour: h,
          hourLabel: `${String(h).padStart(2, '0')}:00`,
          categories: activeCatIds.map(catId => ({
            categoryId: catId,
            quantity: hourCatMatrix[h][catId]?.quantity || 0,
            revenue: hourCatMatrix[h][catId]?.revenue || 0,
          })),
          totalQuantity: Object.values(hourCatMatrix[h]).reduce((s, c) => s + c.quantity, 0),
          totalRevenue: Object.values(hourCatMatrix[h]).reduce((s, c) => s + c.revenue, 0),
        }));

        return { hourlyData, categoryNames };
      }),

    // Business Recommendations - AI-powered insights from sales data
    getBusinessRecommendations: adminProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { recommendations: [] };

        const start = new Date(input.startDate);
        const end = new Date(input.endDate);
        end.setHours(23, 59, 59, 999);

        // Get order data with items
        const allOrders = await dbInstance.select({
          id: orders.id,
          totalAmount: orders.totalAmount,
          createdAt: orders.createdAt,
          orderType: orders.orderType,
          orderStatus: orders.orderStatus,
        }).from(orders)
          .where(and(
            gte(orders.createdAt, start),
            sql`${orders.createdAt} <= ${end}`,
            sql`${orders.orderStatus} NOT IN ('cancelled')`
          ));

        // Get item-level data
        const itemData = await dbInstance.select({
          productName: orderItemsTable.productName,
          quantity: orderItemsTable.quantity,
          unitPrice: orderItemsTable.unitPrice,
          categoryName: categories.name,
          subcategoryName: subcategories.name,
          orderId: orderItemsTable.orderId,
          orderCreatedAt: orders.createdAt,
        }).from(orderItemsTable)
          .innerJoin(orders, eq(orderItemsTable.orderId, orders.id))
          .leftJoin(products, eq(orderItemsTable.productId, products.id))
          .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))
          .leftJoin(categories, eq(subcategories.categoryId, categories.id))
          .where(and(
            gte(orders.createdAt, start),
            sql`${orders.createdAt} <= ${end}`,
            sql`${orders.orderStatus} NOT IN ('cancelled')`
          ));

        const recommendations: { type: string; title: string; description: string; priority: 'high' | 'medium' | 'low'; icon: string }[] = [];

        // 1. Day-of-week analysis
        const dayRevenue: Record<number, number> = {};
        const dayOrders: Record<number, number> = {};
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        allOrders.forEach(o => {
          const day = new Date(o.createdAt!).getDay();
          dayRevenue[day] = (dayRevenue[day] || 0) + (o.totalAmount || 0);
          dayOrders[day] = (dayOrders[day] || 0) + 1;
        });
        const sortedDays = Object.entries(dayRevenue).sort(([,a], [,b]) => b - a);
        if (sortedDays.length >= 2) {
          const bestDay = dayNames[parseInt(sortedDays[0][0])];
          const bestRev = sortedDays[0][1];
          const worstDay = dayNames[parseInt(sortedDays[sortedDays.length - 1][0])];
          const worstRev = sortedDays[sortedDays.length - 1][1];
          const ratio = bestRev / (worstRev || 1);
          if (ratio > 1.5) {
            recommendations.push({
              type: 'opportunity',
              title: `${bestDay} is your strongest day`,
              description: `${bestDay} generates ${ratio.toFixed(1)}x more revenue than ${worstDay}. Consider running special promotions on ${worstDay} to boost sales, or double down on ${bestDay} with premium offerings.`,
              priority: 'high',
              icon: 'calendar',
            });
          }
        }

        // Weekend vs weekday
        const weekendRev = (dayRevenue[0] || 0) + (dayRevenue[6] || 0);
        const weekdayRev = [1,2,3,4,5].reduce((s, d) => s + (dayRevenue[d] || 0), 0);
        const weekendAvg = weekendRev / 2;
        const weekdayAvg = weekdayRev / 5;
        if (weekendAvg > weekdayAvg * 1.3) {
          recommendations.push({
            type: 'insight',
            title: 'Weekends outperform weekdays significantly',
            description: `Weekend average is ₹${(weekendAvg / 100).toLocaleString('en-IN', {maximumFractionDigits: 0})}/day vs weekday ₹${(weekdayAvg / 100).toLocaleString('en-IN', {maximumFractionDigits: 0})}/day. Consider weekday-only promotions (e.g., "Weekday Happy Hour" or loyalty bonus stamps) to drive mid-week traffic.`,
            priority: 'medium',
            icon: 'trending',
          });
        } else if (weekdayAvg > weekendAvg * 1.3) {
          recommendations.push({
            type: 'insight',
            title: 'Weekdays are stronger than weekends',
            description: `Weekday average is ₹${(weekdayAvg / 100).toLocaleString('en-IN', {maximumFractionDigits: 0})}/day vs weekend ₹${(weekendAvg / 100).toLocaleString('en-IN', {maximumFractionDigits: 0})}/day. Weekend events, family combos, or Instagram-worthy specials could boost weekend footfall.`,
            priority: 'medium',
            icon: 'trending',
          });
        }

        // 2. Category performance
        const catRevenue: Record<string, number> = {};
        const catQuantity: Record<string, number> = {};
        itemData.forEach(item => {
          const cat = item.categoryName || 'Unknown';
          catRevenue[cat] = (catRevenue[cat] || 0) + ((item.unitPrice || 0) * (item.quantity || 1));
          catQuantity[cat] = (catQuantity[cat] || 0) + (item.quantity || 1);
        });
        const sortedCats = Object.entries(catRevenue).sort(([,a], [,b]) => b - a);
        if (sortedCats.length >= 2) {
          const topCat = sortedCats[0];
          const bottomCat = sortedCats[sortedCats.length - 1];
          recommendations.push({
            type: 'focus',
            title: `"${topCat[0]}" is your revenue driver`,
            description: `"${topCat[0]}" accounts for ₹${(topCat[1] / 100).toLocaleString('en-IN', {maximumFractionDigits: 0})} in revenue. Consider expanding this category with new variants. "${bottomCat[0]}" is underperforming at ₹${(bottomCat[1] / 100).toLocaleString('en-IN', {maximumFractionDigits: 0})} — review pricing, visibility, or consider bundling with popular items.`,
            priority: 'high',
            icon: 'category',
          });
        }

        // 3. Top product recommendations
        const productRevenue: Record<string, { revenue: number; quantity: number; category: string }> = {};
        itemData.forEach(item => {
          const name = item.productName || 'Unknown';
          if (!productRevenue[name]) productRevenue[name] = { revenue: 0, quantity: 0, category: item.categoryName || '' };
          productRevenue[name].revenue += (item.unitPrice || 0) * (item.quantity || 1);
          productRevenue[name].quantity += item.quantity || 1;
        });
        const sortedProducts = Object.entries(productRevenue).sort(([,a], [,b]) => b.revenue - a.revenue);
        if (sortedProducts.length >= 3) {
          const top3 = sortedProducts.slice(0, 3).map(([name]) => name);
          recommendations.push({
            type: 'action',
            title: 'Feature your top 3 sellers prominently',
            description: `${top3.join(', ')} are your best sellers. Ensure these are prominently featured on your menu, website hero section, and Instagram. Consider creating combo deals around these items.`,
            priority: 'high',
            icon: 'star',
          });
        }

        // 4. Average order value analysis
        const totalRevenue = allOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
        const avgOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0;
        if (avgOrderValue > 0) {
          const avgInRupees = avgOrderValue / 100;
          if (avgInRupees < 500) {
            recommendations.push({
              type: 'action',
              title: `Increase average order value (currently ₹${avgInRupees.toFixed(0)})`,
              description: `Your AOV is ₹${avgInRupees.toFixed(0)}. Consider upselling strategies: "Add a boba drink for ₹X" prompts, combo meals, or minimum order thresholds for free delivery to push AOV above ₹500.`,
              priority: 'medium',
              icon: 'rupee',
            });
          } else {
            recommendations.push({
              type: 'insight',
              title: `Healthy average order value: ₹${avgInRupees.toFixed(0)}`,
              description: `Your AOV of ₹${avgInRupees.toFixed(0)} is solid. Maintain this by continuing to offer attractive combos and add-ons. Consider premium limited-edition items to push it even higher.`,
              priority: 'low',
              icon: 'rupee',
            });
          }
        }

        // 5. Order type analysis
        const orderTypeCount: Record<string, number> = {};
        allOrders.forEach(o => {
          const t = o.orderType || 'instore';
          orderTypeCount[t] = (orderTypeCount[t] || 0) + 1;
        });
        const totalOrders = allOrders.length;
        const deliveryPct = ((orderTypeCount['delivery'] || 0) / totalOrders * 100);
        const instorePct = ((orderTypeCount['instore'] || 0) / totalOrders * 100);
        if (deliveryPct < 20 && totalOrders > 10) {
          recommendations.push({
            type: 'opportunity',
            title: `Delivery orders are only ${deliveryPct.toFixed(0)}% of total`,
            description: `Most orders are in-store (${instorePct.toFixed(0)}%). Growing delivery can significantly expand your reach. Consider: delivery-exclusive discounts, partnering with food aggregators, or promoting your WhatsApp ordering more on social media.`,
            priority: 'medium',
            icon: 'delivery',
          });
        }

        // 6. Time-based insights
        const hourCounts: Record<number, number> = {};
        allOrders.forEach(o => {
          const utcHour = new Date(o.createdAt!).getUTCHours();
          const istHour = (utcHour + 5) % 24 + (new Date(o.createdAt!).getUTCMinutes() >= 30 ? 1 : 0);
          const adjustedHour = istHour % 24;
          hourCounts[adjustedHour] = (hourCounts[adjustedHour] || 0) + 1;
        });
        const lunchOrders = [11,12,13,14].reduce((s, h) => s + (hourCounts[h] || 0), 0);
        const dinnerOrders = [18,19,20,21].reduce((s, h) => s + (hourCounts[h] || 0), 0);
        if (lunchOrders < dinnerOrders * 0.5 && totalOrders > 20) {
          recommendations.push({
            type: 'opportunity',
            title: 'Lunch is significantly weaker than dinner',
            description: `Lunch (11-14) has ${lunchOrders} orders vs dinner (18-21) with ${dinnerOrders}. Consider lunch specials, office delivery partnerships, or "lunch combo" pricing to boost daytime traffic.`,
            priority: 'high',
            icon: 'clock',
          });
        }

        // 7. Product mix / combo suggestions
        const orderProducts: Record<number, string[]> = {};
        itemData.forEach(item => {
          if (!orderProducts[item.orderId]) orderProducts[item.orderId] = [];
          orderProducts[item.orderId].push(item.productName || '');
        });
        const pairCounts: Record<string, number> = {};
        Object.values(orderProducts).forEach(prods => {
          const unique = Array.from(new Set(prods));
          for (let i = 0; i < unique.length; i++) {
            for (let j = i + 1; j < unique.length; j++) {
              const key = [unique[i], unique[j]].sort().join(' + ');
              pairCounts[key] = (pairCounts[key] || 0) + 1;
            }
          }
        });
        const topPairs = Object.entries(pairCounts).sort(([,a], [,b]) => b - a).slice(0, 3);
        if (topPairs.length > 0 && topPairs[0][1] >= 3) {
          recommendations.push({
            type: 'action',
            title: 'Create combo deals from popular pairings',
            description: `Your customers frequently order: ${topPairs.map(([pair, count]) => `${pair} (${count}x)`).join(', ')}. Create official combo deals with a small discount to encourage even more cross-selling.`,
            priority: 'high',
            icon: 'combo',
          });
        }

        // 8. Delivery channel analysis (from Petpooja uploads)
        const startDateStr = input.startDate;
        const endDateStr = input.endDate;
        const deliveryEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);
        const allInsightDeliveryUploads = await dbInstance.select()
          .from(deliverySalesUploads)
          .where(and(
            sql`DATE(${deliverySalesUploads.periodStart}) >= ${startDateStr}`,
            sql`DATE(${deliverySalesUploads.periodEnd}) <= DATE_ADD(${endDateStr}, INTERVAL 1 DAY)`
          ));
        // Deduplicate overlapping uploads (same logic as getCombinedChannelAnalytics)
        const sortedInsightUploads = [...allInsightDeliveryUploads].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const deliveryUploads = sortedInsightUploads.filter((upload, idx) => {
          const uploadStart = new Date(upload.periodStart).getTime();
          const uploadEnd = new Date(upload.periodEnd).getTime();
          for (let i = 0; i < idx; i++) {
            const newerStart = new Date(sortedInsightUploads[i].periodStart).getTime();
            const newerEnd = new Date(sortedInsightUploads[i].periodEnd).getTime();
            if (newerStart <= uploadStart && newerEnd >= uploadEnd) return false;
          }
          return true;
        });

        if (deliveryUploads.length > 0) {
          let zomatoOrders = 0, zomatoAmount = 0, swiggyOrders = 0, swiggyAmount = 0;
          let dineInOrders = 0, dineInAmount = 0, deliveryGrandTotal = 0, deliveryTotalOrders = 0;
          for (const u of deliveryUploads) {
            zomatoOrders += u.zomatoOrders || 0;
            zomatoAmount += u.zomatoAmount || 0;
            swiggyOrders += u.swiggyOrders || 0;
            swiggyAmount += u.swiggyAmount || 0;
            dineInOrders += u.dineInOrders || 0;
            dineInAmount += u.dineInAmount || 0;
            deliveryGrandTotal += u.grandTotal || 0;
            deliveryTotalOrders += u.totalOrders || 0;
          }

          // Channel mix insight
          const websiteTotal = totalRevenue;
          const allChannelRevenue = websiteTotal + deliveryGrandTotal;
          const websitePct = allChannelRevenue > 0 ? Math.round(websiteTotal / allChannelRevenue * 100) : 0;
          const zomatoPct = allChannelRevenue > 0 ? Math.round(zomatoAmount / allChannelRevenue * 100) : 0;
          const swiggyPct = allChannelRevenue > 0 ? Math.round(swiggyAmount / allChannelRevenue * 100) : 0;

          recommendations.push({
            type: 'insight',
            title: 'Multi-Channel Revenue Breakdown',
            description: `Total across all channels: ₹${(allChannelRevenue / 100).toLocaleString('en-IN', {maximumFractionDigits: 0})} (${allOrders.length + deliveryTotalOrders} orders). Website: ${websitePct}%, Zomato: ${zomatoPct}%, Swiggy: ${swiggyPct}%. ${websitePct > 50 ? 'Website is your dominant channel — great for margins since you avoid aggregator commissions.' : 'Delivery platforms contribute the majority — consider strategies to shift more customers to direct ordering to save on commissions.'}`,
            priority: 'high',
            icon: 'channels',
          });

          // AOV comparison across channels
          const websiteAOV = allOrders.length > 0 ? totalRevenue / allOrders.length / 100 : 0;
          const zomatoAOV = zomatoOrders > 0 ? zomatoAmount / zomatoOrders / 100 : 0;
          const swiggyAOV = swiggyOrders > 0 ? swiggyAmount / swiggyOrders / 100 : 0;
          if (websiteAOV > 0 && zomatoAOV > 0) {
            const higherChannel = websiteAOV > zomatoAOV ? 'Website' : 'Zomato';
            const lowerChannel = websiteAOV > zomatoAOV ? 'Zomato' : 'Website';
            const higherAOV = Math.max(websiteAOV, zomatoAOV);
            const lowerAOV = Math.min(websiteAOV, zomatoAOV);
            const diff = Math.round((higherAOV / lowerAOV - 1) * 100);
            if (diff > 10) {
              recommendations.push({
                type: 'insight',
                title: `${higherChannel} has ${diff}% higher AOV than ${lowerChannel}`,
                description: `${higherChannel} AOV: ₹${Math.round(higherAOV)} vs ${lowerChannel}: ₹${Math.round(lowerAOV)}${swiggyAOV > 0 ? `, Swiggy: ₹${Math.round(swiggyAOV)}` : ''}. ${websiteAOV > zomatoAOV ? 'Direct orders are more valuable per transaction. Promote website ordering with loyalty rewards or exclusive items.' : 'Delivery customers spend more per order — consider offering premium combos on aggregator platforms.'}`,
                priority: 'medium',
                icon: 'rupee',
              });
            }
          }

          // Swiggy growth opportunity
          if (swiggyOrders > 0 && zomatoOrders > 0 && swiggyOrders < zomatoOrders * 0.5) {
            recommendations.push({
              type: 'opportunity',
              title: 'Swiggy growth opportunity',
              description: `Swiggy has only ${Math.round(swiggyOrders / zomatoOrders * 100)}% of Zomato's order volume (${swiggyOrders} vs ${zomatoOrders}) but ${swiggyAOV > zomatoAOV ? 'a higher' : 'a comparable'} AOV. Consider investing in Swiggy promotions, featured listings, or exclusive deals to grow this channel.`,
              priority: 'medium',
              icon: 'growth',
            });
          }

          // Delivery product insights
          const deliveryItems = await dbInstance.select({
            baseProductName: deliveryItemSales.baseProductName,
            category: deliveryItemSales.category,
            totalQty: sql<number>`SUM(${deliveryItemSales.quantity})`,
            totalAmount: sql<number>`SUM(${deliveryItemSales.amount})`,
          }).from(deliveryItemSales)
            .where(sql`${deliveryItemSales.uploadId} IN (${sql.join(deliveryUploads.map(u => sql`${u.id}`), sql`, `)})`)
            .groupBy(deliveryItemSales.baseProductName, deliveryItemSales.category)
            .orderBy(sql`SUM(${deliveryItemSales.quantity}) DESC`);

          // Find delivery-only bestsellers (not on website)
          const websiteProductNames = new Set(Object.keys(productRevenue).map(n => n.trim().toLowerCase()));
          const deliveryOnlyHits = deliveryItems
            .filter(d => !websiteProductNames.has((d.baseProductName || '').trim().toLowerCase()) && Number(d.totalQty) >= 5)
            .slice(0, 3);
          if (deliveryOnlyHits.length > 0) {
            recommendations.push({
              type: 'focus',
              title: 'Delivery-exclusive bestsellers',
              description: `These products sell well on delivery but not on your website: ${deliveryOnlyHits.map(d => `${d.baseProductName} (${d.totalQty} sold)`).join(', ')}. Consider adding them to your website menu or creating special promotions around them.`,
              priority: 'medium',
              icon: 'delivery',
            });
          }

          // Top delivery categories
          const deliveryCatRevenue: Record<string, number> = {};
          deliveryItems.forEach(d => {
            const cat = d.category || 'Unknown';
            deliveryCatRevenue[cat] = (deliveryCatRevenue[cat] || 0) + Number(d.totalAmount || 0);
          });
          const topDeliveryCats = Object.entries(deliveryCatRevenue).sort(([,a], [,b]) => b - a).slice(0, 3);
          if (topDeliveryCats.length > 0) {
            recommendations.push({
              type: 'insight',
              title: 'Top delivery categories',
              description: `On delivery platforms, your top categories are: ${topDeliveryCats.map(([cat, rev]) => `${cat} (₹${(rev / 100).toLocaleString('en-IN', {maximumFractionDigits: 0})})`).join(', ')}. Ensure these categories have optimized photos and descriptions on Zomato/Swiggy for maximum conversion.`,
              priority: 'low',
              icon: 'category',
            });
          }

          // Commission savings opportunity
          const estimatedCommission = (zomatoAmount + swiggyAmount) * 0.25; // ~25% aggregator commission
          if (estimatedCommission > 0) {
            recommendations.push({
              type: 'action',
              title: `Estimated ₹${(estimatedCommission / 100).toLocaleString('en-IN', {maximumFractionDigits: 0})} in aggregator commissions`,
              description: `At ~25% commission rate, you're paying approximately ₹${(estimatedCommission / 100).toLocaleString('en-IN', {maximumFractionDigits: 0})} to Zomato/Swiggy. Shifting even 20% of delivery orders to your website could save ₹${(estimatedCommission * 0.2 / 100).toLocaleString('en-IN', {maximumFractionDigits: 0})}. Promote your website with QR codes on packaging, social media, and in-store signage.`,
              priority: 'high',
              icon: 'rupee',
            });
          }
        }

        // Sort by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return { recommendations };
      }),

    // ============================================
    // Predictive Analytics
    // ============================================

    getMonthlyProjection: adminProcedure
      .input(z.object({ year: z.number(), month: z.number().min(1).max(12) }))
      .query(async ({ input }) => {
        const { getMonthlyProjection } = await import('./predictions');
        return getMonthlyProjection(input.year, input.month);
      }),

    getItemDemandForecast: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getItemDemandForecast } = await import('./predictions');
        const start = input?.startDate ? new Date(input.startDate) : undefined;
        const end = input?.endDate ? new Date(input.endDate) : undefined;
        return getItemDemandForecast(start, end);
      }),

    getProcurementForecast: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getProcurementForecast } = await import('./predictions');
        const start = input?.startDate ? new Date(input.startDate) : undefined;
        const end = input?.endDate ? new Date(input.endDate) : undefined;
        return getProcurementForecast(start, end);
      }),

    getTrendAlerts: adminProcedure
      .input(z.object({
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getTrendAlerts } = await import('./predictions');
        const end = input?.endDate ? new Date(input.endDate) : undefined;
        return getTrendAlerts(end);
      }),

    getTotalSalesForecast: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getTotalSalesForecast } = await import('./predictions');
        const start = input?.startDate ? new Date(input.startDate) : undefined;
        const end = input?.endDate ? new Date(input.endDate) : undefined;
        return getTotalSalesForecast(start, end);
      }),

    getForecastAccuracy: adminProcedure
      .input(z.object({ year: z.number(), month: z.number().min(1).max(12) }))
      .query(async ({ input }) => {
        const { getForecastAccuracy } = await import('./predictions');
        return getForecastAccuracy(input.year, input.month);
      }),

    // List all delivery data upload periods for the period selector
    getDeliveryPeriods: adminProcedure
      .query(async () => {
        const dbInstance = await getDb();
        if (!dbInstance) return [];
        const uploads = await dbInstance.select({
          id: deliverySalesUploads.id,
          periodLabel: deliverySalesUploads.periodLabel,
          periodStart: deliverySalesUploads.periodStart,
          periodEnd: deliverySalesUploads.periodEnd,
          totalOrders: deliverySalesUploads.totalOrders,
          grandTotal: deliverySalesUploads.grandTotal,
          zomatoOrders: deliverySalesUploads.zomatoOrders,
          swiggyOrders: deliverySalesUploads.swiggyOrders,
          dineInOrders: deliverySalesUploads.dineInOrders,
          createdAt: deliverySalesUploads.createdAt,
        }).from(deliverySalesUploads)
          .orderBy(sql`${deliverySalesUploads.periodStart} DESC`);
        
        // For each period, get website order totals using CALENDAR MONTH dates
        // (not Petpooja period dates which may span across months, e.g. Jan 27 - Feb 26)
        const enriched = await Promise.all(uploads.map(async (u) => {
          // Parse the periodLabel to extract calendar month dates
          // e.g. "February 2026" -> Feb 1 - Feb 28, "January 2026" -> Jan 1 - Jan 31
          // For partial periods like "Mid March 2026" or "mid Feb 2026", use 1st to 15th of that month
          let websiteStart = u.periodStart;
          let websiteEnd = u.periodEnd;
          const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
          const monthAbbrevs: Record<string, string> = { jan: 'january', feb: 'february', mar: 'march', apr: 'april', may: 'may', jun: 'june', jul: 'july', aug: 'august', sep: 'september', oct: 'october', nov: 'november', dec: 'december' };
          
          // Match full month: "February 2026"
          const fullMonthMatch = u.periodLabel.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i);
          // Match partial/mid month: "Mid March 2026", "mid Feb 2026", "Early Jan 2026"
          const midMonthMatch = u.periodLabel.match(/^(?:mid|early|first half|1st half)\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/i);
          
          if (fullMonthMatch) {
            const monthIdx = monthNames.indexOf(fullMonthMatch[1].toLowerCase());
            const year = parseInt(fullMonthMatch[2]);
            if (monthIdx >= 0) {
              websiteStart = new Date(year, monthIdx, 1);
              // Last day of month
              websiteEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
            }
          } else if (midMonthMatch) {
            // Resolve abbreviated or full month name
            const rawMonth = midMonthMatch[1].toLowerCase();
            const resolvedMonth = monthAbbrevs[rawMonth] || rawMonth;
            const monthIdx = monthNames.indexOf(resolvedMonth);
            const year = parseInt(midMonthMatch[2]);
            if (monthIdx >= 0) {
              websiteStart = new Date(year, monthIdx, 1);
              // Mid-month: use the actual periodEnd date but cap to end of month
              // Use the day from periodEnd if it's within the same month, otherwise use 15th
              const periodEndDate = new Date(u.periodEnd);
              if (periodEndDate.getMonth() === monthIdx && periodEndDate.getFullYear() === year) {
                websiteEnd = new Date(year, monthIdx, periodEndDate.getDate(), 23, 59, 59, 999);
              } else {
                websiteEnd = new Date(year, monthIdx, 15, 23, 59, 59, 999);
              }
            }
          }
          const websiteResult = await dbInstance.select({
            orderCount: sql<number>`COUNT(*)`,
            totalAmount: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
          }).from(orders)
            .where(and(
              gte(orders.createdAt, websiteStart),
              lte(orders.createdAt, websiteEnd),
              sql`${orders.orderStatus} != 'cancelled'`
            ));
          const websiteOrders = Number(websiteResult[0]?.orderCount) || 0;
          const websiteAmount = Number(websiteResult[0]?.totalAmount) || 0;

          // Also fetch event order revenue for this period
          const eventResult = await dbInstance.select({
            orderCount: sql<number>`COUNT(*)`,
            totalAmount: sql<number>`COALESCE(SUM(${eventOrders.totalAmount}), 0)`,
          }).from(eventOrders)
            .where(and(
              gte(eventOrders.createdAt, websiteStart),
              lte(eventOrders.createdAt, websiteEnd),
              sql`${eventOrders.status} IN ('confirmed', 'in_progress', 'completed')`
            ));
          const eventOrderCount = Number(eventResult[0]?.orderCount) || 0;
          const eventAmount = Number(eventResult[0]?.totalAmount) || 0;

          return {
            ...u,
            websiteOrders,
            websiteAmount,
            eventOrders: eventOrderCount,
            eventAmount,
            combinedTotal: (Number(u.grandTotal) || 0) + websiteAmount + eventAmount,
          };
        }));
        return enriched;
      }),

    // Website Traffic Analytics - proxy to Umami API
    // Combined channel analytics (website + delivery)
    getCombinedChannelAnalytics: adminProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return null;
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);
        end.setHours(23, 59, 59, 999);

        // 1. Website orders
        const websiteOrders = await dbInstance.select({
          count: sql<number>`COUNT(*)`,
          revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
          avgOrder: sql<number>`COALESCE(AVG(${orders.totalAmount}), 0)`,
          gst: sql<number>`COALESCE(SUM(COALESCE(${orders.stateGst}, 0) + COALESCE(${orders.centralGst}, 0)), 0)`,
        }).from(orders)
          .where(and(
            sql`${orders.createdAt} >= ${start}`,
            sql`${orders.createdAt} <= ${end}`,
            sql`${orders.orderStatus} != 'cancelled'`
          ));

        // 2. Delivery data from uploads (use date-only comparison to avoid timezone issues)
        const startDateStr = input.startDate; // YYYY-MM-DD
        const endDateStr = input.endDate; // YYYY-MM-DD
        const allDeliveryUploads = await dbInstance.select()
          .from(deliverySalesUploads)
          .where(and(
            sql`DATE(${deliverySalesUploads.periodStart}) >= ${startDateStr}`,
            sql`DATE(${deliverySalesUploads.periodEnd}) <= DATE_ADD(${endDateStr}, INTERVAL 1 DAY)`
          ));

        // Deduplicate overlapping uploads: if a newer upload's period fully contains
        // an older upload's period, skip the older one to avoid double-counting.
        // Sort by createdAt DESC so newer uploads take priority.
        const sortedUploads = [...allDeliveryUploads].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const deliveryUploads = sortedUploads.filter((upload, idx) => {
          const uploadStart = new Date(upload.periodStart).getTime();
          const uploadEnd = new Date(upload.periodEnd).getTime();
          // Check if any newer upload (earlier in the sorted array) fully contains this one
          for (let i = 0; i < idx; i++) {
            const newerStart = new Date(sortedUploads[i].periodStart).getTime();
            const newerEnd = new Date(sortedUploads[i].periodEnd).getTime();
            if (newerStart <= uploadStart && newerEnd >= uploadEnd) {
              return false; // Skip: newer upload fully covers this period
            }
          }
          return true;
        });

        // Aggregate delivery data
        let deliveryTotals = {
          zomatoOrders: 0, zomatoAmount: 0,
          swiggyOrders: 0, swiggyAmount: 0,
          dineInOrders: 0, dineInAmount: 0,
          totalOrders: 0, grandTotal: 0,
          cgst: 0, sgst: 0,
          cashAmount: 0, cardAmount: 0, upiAmount: 0,
        };
        for (const u of deliveryUploads) {
          deliveryTotals.zomatoOrders += u.zomatoOrders || 0;
          deliveryTotals.zomatoAmount += u.zomatoAmount || 0;
          deliveryTotals.swiggyOrders += u.swiggyOrders || 0;
          deliveryTotals.swiggyAmount += u.swiggyAmount || 0;
          deliveryTotals.dineInOrders += u.dineInOrders || 0;
          deliveryTotals.dineInAmount += u.dineInAmount || 0;
          deliveryTotals.totalOrders += u.totalOrders || 0;
          deliveryTotals.grandTotal += u.grandTotal || 0;
          deliveryTotals.cgst += u.cgst || 0;
          deliveryTotals.sgst += u.sgst || 0;
          deliveryTotals.cashAmount += u.cashAmount || 0;
          deliveryTotals.cardAmount += u.cardAmount || 0;
          deliveryTotals.upiAmount += u.upiAmount || 0;
        }

        // 3. Delivery item-level data for product comparison
        const deliveryItems = deliveryUploads.length > 0 
          ? await dbInstance.select({
              baseProductName: deliveryItemSales.baseProductName,
              category: deliveryItemSales.category,
              totalQty: sql<number>`SUM(${deliveryItemSales.quantity})`,
              totalAmount: sql<number>`SUM(${deliveryItemSales.amount})`,
            }).from(deliveryItemSales)
              .where(sql`${deliveryItemSales.uploadId} IN (${sql.join(deliveryUploads.map(u => sql`${u.id}`), sql`, `)})`)
              .groupBy(deliveryItemSales.baseProductName, deliveryItemSales.category)
              .orderBy(sql`SUM(${deliveryItemSales.quantity}) DESC`)
          : [];

        // 4. Website item-level data for product comparison
        const websiteItems = await dbInstance.select({
          productName: products.name,
          subcategoryName: subcategories.name,
          totalQty: sql<number>`SUM(${orderItemsTable.quantity})`,
          totalAmount: sql<number>`SUM(${orderItemsTable.quantity} * ${orderItemsTable.unitPrice})`,
        }).from(orderItemsTable)
          .innerJoin(orders, eq(orderItemsTable.orderId, orders.id))
          .innerJoin(products, eq(orderItemsTable.productId, products.id))
          .innerJoin(subcategories, eq(products.subcategoryId, subcategories.id))
          .where(and(
            sql`${orders.createdAt} >= ${start}`,
            sql`${orders.createdAt} <= ${end}`,
            sql`${orders.orderStatus} != 'cancelled'`
          ))
          .groupBy(products.name, subcategories.name)
          .orderBy(sql`SUM(${orderItemsTable.quantity}) DESC`);

        // 5. Workshop + Event revenue
        const workshopRevenue = await dbInstance.select({
          count: sql<number>`COUNT(*)`,
          revenue: sql<number>`COALESCE(SUM(${workshopBookings.totalAmount}), 0)`,
        }).from(workshopBookings)
          .where(and(
            sql`${workshopBookings.createdAt} >= ${start}`,
            sql`${workshopBookings.createdAt} <= ${end}`,
            sql`${workshopBookings.paymentStatus} = 'paid'`
          ));

        const eventRevenue = await dbInstance.select({
          count: sql<number>`COUNT(*)`,
          revenue: sql<number>`COALESCE(SUM(${eventOrders.totalAmount}), 0)`,
        }).from(eventOrders)
          .where(and(
            sql`${eventOrders.createdAt} >= ${start}`,
            sql`${eventOrders.createdAt} <= ${end}`,
            sql`${eventOrders.status} IN ('confirmed', 'in_progress', 'completed')`
          ));

        // Build channel summary
        const websiteRevenue = Number(websiteOrders[0]?.revenue || 0);
        const websiteCount = Number(websiteOrders[0]?.count || 0);
        const zomatoRevenue = deliveryTotals.zomatoAmount; // in paise
        const swiggyRevenue = deliveryTotals.swiggyAmount; // in paise
        const petpoojaDineIn = deliveryTotals.dineInAmount; // in paise
        const workshopRev = Number(workshopRevenue[0]?.revenue || 0);
        const eventRev = Number(eventRevenue[0]?.revenue || 0);

        const channels = [
          {
            name: 'Website / Direct',
            orders: websiteCount,
            revenue: websiteRevenue, // in paise
            avgOrderValue: websiteCount > 0 ? Math.round(websiteRevenue / websiteCount) : 0,
            gst: Number(websiteOrders[0]?.gst || 0),
            color: '#8B4513',
          },
          {
            name: 'Zomato',
            orders: deliveryTotals.zomatoOrders,
            revenue: zomatoRevenue,
            avgOrderValue: deliveryTotals.zomatoOrders > 0 ? Math.round(zomatoRevenue / deliveryTotals.zomatoOrders) : 0,
            gst: 0, // GST included in delivery amounts
            color: '#E23744',
          },
          {
            name: 'Swiggy',
            orders: deliveryTotals.swiggyOrders,
            revenue: swiggyRevenue,
            avgOrderValue: deliveryTotals.swiggyOrders > 0 ? Math.round(swiggyRevenue / deliveryTotals.swiggyOrders) : 0,
            gst: 0,
            color: '#FC8019',
          },
          {
            name: 'Petpooja Dine-in (Fallback)',
            orders: deliveryTotals.dineInOrders,
            revenue: petpoojaDineIn,
            avgOrderValue: deliveryTotals.dineInOrders > 0 ? Math.round(petpoojaDineIn / deliveryTotals.dineInOrders) : 0,
            gst: 0,
            color: '#6B7280',
          },
          {
            name: 'Workshops',
            orders: Number(workshopRevenue[0]?.count || 0),
            revenue: workshopRev,
            avgOrderValue: Number(workshopRevenue[0]?.count || 0) > 0 ? Math.round(workshopRev / Number(workshopRevenue[0]?.count || 0)) : 0,
            gst: 0,
            color: '#10B981',
          },
          {
            name: 'Events',
            orders: Number(eventRevenue[0]?.count || 0),
            revenue: eventRev,
            avgOrderValue: Number(eventRevenue[0]?.count || 0) > 0 ? Math.round(eventRev / Number(eventRevenue[0]?.count || 0)) : 0,
            gst: 0,
            color: '#8B5CF6',
          },
        ].filter(c => c.orders > 0 || c.revenue > 0);

        const totalRevenue = channels.reduce((sum, c) => sum + c.revenue, 0);
        const totalOrders = channels.reduce((sum, c) => sum + c.orders, 0);

        // Build product comparison (top 15 products across channels)
        const productMap = new Map<string, { name: string; websiteQty: number; websiteRevenue: number; deliveryQty: number; deliveryRevenue: number; category: string }>();
        
        for (const item of websiteItems) {
          const key = (item.productName || '').trim().toLowerCase();
          const existing = productMap.get(key) || { name: (item.productName || '').trim(), websiteQty: 0, websiteRevenue: 0, deliveryQty: 0, deliveryRevenue: 0, category: (item.subcategoryName || '').trim() };
          existing.websiteQty += Number(item.totalQty || 0);
          existing.websiteRevenue += Number(item.totalAmount || 0);
          productMap.set(key, existing);
        }
        
        for (const item of deliveryItems) {
          const key = (item.baseProductName || '').trim().toLowerCase();
          const existing = productMap.get(key) || { name: (item.baseProductName || '').trim(), websiteQty: 0, websiteRevenue: 0, deliveryQty: 0, deliveryRevenue: 0, category: (item.category || '').trim() };
          existing.deliveryQty += Number(item.totalQty || 0);
          existing.deliveryRevenue += Number(item.totalAmount || 0);
          productMap.set(key, existing);
        }

        const productComparison = Array.from(productMap.values())
          .map(p => ({
            ...p,
            totalQty: p.websiteQty + p.deliveryQty,
            totalRevenue: p.websiteRevenue + p.deliveryRevenue,
            websiteShare: p.websiteQty + p.deliveryQty > 0 ? Math.round((p.websiteQty / (p.websiteQty + p.deliveryQty)) * 100) : 0,
            deliveryShare: p.websiteQty + p.deliveryQty > 0 ? Math.round((p.deliveryQty / (p.websiteQty + p.deliveryQty)) * 100) : 0,
          }))
          .sort((a, b) => b.totalQty - a.totalQty)
          .slice(0, 20);

        // Generate cross-channel insights
        const insights: string[] = [];
        
        if (websiteCount > 0 && deliveryTotals.zomatoOrders > 0) {
          const websiteAOV = websiteRevenue / websiteCount / 100;
          const zomatoAOV = zomatoRevenue / deliveryTotals.zomatoOrders / 100;
          if (websiteAOV > zomatoAOV * 1.1) {
            insights.push(`Website AOV (₹${Math.round(websiteAOV)}) is ${Math.round((websiteAOV/zomatoAOV - 1) * 100)}% higher than Zomato (₹${Math.round(zomatoAOV)}) — your most profitable channel per order.`);
          }
        }

        if (deliveryTotals.swiggyOrders > 0 && deliveryTotals.zomatoOrders > 0) {
          const swiggyAOV = swiggyRevenue / deliveryTotals.swiggyOrders / 100;
          const zomatoAOV = zomatoRevenue / deliveryTotals.zomatoOrders / 100;
          if (swiggyAOV > zomatoAOV && deliveryTotals.swiggyOrders < deliveryTotals.zomatoOrders * 0.5) {
            insights.push(`Swiggy has higher AOV (₹${Math.round(swiggyAOV)}) than Zomato (₹${Math.round(zomatoAOV)}) but only ${Math.round(deliveryTotals.swiggyOrders / deliveryTotals.zomatoOrders * 100)}% of the volume — growth opportunity.`);
          }
        }

        // Products that sell better on delivery vs website
        const deliveryStronger = productComparison.filter(p => p.deliveryShare > 65 && p.totalQty >= 5);
        const websiteStronger = productComparison.filter(p => p.websiteShare > 65 && p.totalQty >= 5);
        
        if (deliveryStronger.length > 0) {
          insights.push(`Products stronger on delivery: ${deliveryStronger.slice(0, 3).map(p => p.name).join(', ')} — consider promoting these on Zomato/Swiggy.`);
        }
        if (websiteStronger.length > 0) {
          insights.push(`Products stronger on website/dine-in: ${websiteStronger.slice(0, 3).map(p => p.name).join(', ')} — these may not travel well for delivery.`);
        }

        const deliveryPct = totalRevenue > 0 ? Math.round((zomatoRevenue + swiggyRevenue) / totalRevenue * 100) : 0;
        const websitePct = totalRevenue > 0 ? Math.round(websiteRevenue / totalRevenue * 100) : 0;
        insights.push(`Channel mix: Website ${websitePct}% vs Delivery ${deliveryPct}% of total revenue.`);

        return {
          channels,
          totalRevenue,
          totalOrders,
          productComparison,
          insights,
          hasDeliveryData: deliveryUploads.length > 0,
          deliveryPeriods: deliveryUploads.map(u => u.periodLabel),
        };
      }),

    getItemwiseSalesReport: adminProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        orderType: z.enum(['all', 'instore', 'delivery', 'pickup']).default('all'),
        categoryId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { items: [], summary: { totalItems: 0, totalQuantity: 0, totalRevenue: 0, totalOrders: 0 } };

        let conditions: any[] = [sql`${orders.orderStatus} != 'cancelled'`];
        if (input.startDate) conditions.push(sql`${orders.createdAt} >= ${input.startDate}`);
        if (input.endDate) conditions.push(sql`${orders.createdAt} <= ${input.endDate + ' 23:59:59'}`);
        if (input.orderType && input.orderType !== 'all') conditions.push(eq(orders.orderType, input.orderType));

        const whereClause = and(...conditions);
        const matchingOrders = await dbInstance.select().from(orders).where(whereClause);
        const orderIds = matchingOrders.map(o => o.id);

        if (orderIds.length === 0) {
          const orderTotalRevenue = matchingOrders.reduce((sum, o) => sum + o.totalAmount, 0);
          const orderTotalGst = matchingOrders.reduce((sum, o) => sum + (o.stateGst + o.centralGst), 0);
          return { items: [], summary: { totalItems: 0, totalQuantity: 0, totalRevenue: 0, totalOrders: matchingOrders.length, orderTotalRevenue, orderTotalGst } };
        }

        // Get all order items with product details — use LEFT JOIN so custom items (productId=0) are included
        const items = await dbInstance
          .select({
            productId: orderItemsTable.productId,
            productName: orderItemsTable.productName,
            quantity: orderItemsTable.quantity,
            unitPrice: orderItemsTable.unitPrice,
            lineTotal: orderItemsTable.lineTotal,
            size: orderItemsTable.size,
            orderId: orderItemsTable.orderId,
            subcategoryId: products.subcategoryId,
          })
          .from(orderItemsTable)
          .leftJoin(products, eq(orderItemsTable.productId, products.id))
          .where(sql`${orderItemsTable.orderId} IN (${sql.join(orderIds, sql`, `)})`);

        // Get all subcategories and categories for grouping
        const allSubcategories = await dbInstance.select().from(subcategories);
        const allCategories = await dbInstance.select().from(categories);

        // Build subcategory -> category map
        const subcatToCat: Record<number, { catId: number; catName: string; subcatName: string }> = {};
        for (const sc of allSubcategories) {
          const cat = allCategories.find(c => c.id === sc.categoryId);
          subcatToCat[sc.id] = { catId: sc.categoryId, catName: cat?.name || 'Unknown', subcatName: sc.name };
        }

        // Filter by category if specified
        let filteredItems = items;
        if (input.categoryId) {
          const subcatIds = allSubcategories.filter(s => s.categoryId === input.categoryId).map(s => s.id);
          // Include custom items (subcategoryId is null) only when no category filter is applied
          filteredItems = items.filter(i => i.subcategoryId !== null && subcatIds.includes(i.subcategoryId));
        }

        // Aggregate by product + size
        const productSizeStats: Record<string, {
          productId: number;
          productName: string;
          size: string;
          categoryName: string;
          subcategoryName: string;
          quantity: number;
          revenue: number;
          orderCount: number;
          avgPrice: number;
          orderIds: Set<number>;
        }> = {};

        for (const item of filteredItems) {
          const size = item.size || 'standard';
          // For custom items (productId=0), use the product name as part of the key to keep them separate
          const key = item.productId === 0 ? `custom-${item.productName}-${size}` : `${item.productId}-${size}`;
          const catInfo = item.subcategoryId ? (subcatToCat[item.subcategoryId] || { catId: 0, catName: 'Custom Items', subcatName: 'Custom Items' }) : { catId: 0, catName: 'Custom Items', subcatName: 'Custom Items' };

          if (!productSizeStats[key]) {
            productSizeStats[key] = {
              productId: item.productId,
              productName: item.productName,
              size,
              categoryName: catInfo.catName,
              subcategoryName: catInfo.subcatName,
              quantity: 0,
              revenue: 0,
              orderCount: 0,
              avgPrice: 0,
              orderIds: new Set(),
            };
          }
          productSizeStats[key].quantity += item.quantity;
          productSizeStats[key].revenue += item.lineTotal;
          productSizeStats[key].orderIds.add(item.orderId);
        }

        // Convert to array and calculate derived fields
        const totalRevenue = Object.values(productSizeStats).reduce((sum, s) => sum + s.revenue, 0);
        const totalQuantity = Object.values(productSizeStats).reduce((sum, s) => sum + s.quantity, 0);

        const result = Object.values(productSizeStats)
          .map(s => ({
            productId: s.productId,
            productName: s.productName,
            size: s.size,
            categoryName: s.categoryName,
            subcategoryName: s.subcategoryName,
            quantity: s.quantity,
            revenue: s.revenue,
            orderCount: s.orderIds.size,
            avgPrice: s.quantity > 0 ? Math.round(s.revenue / s.quantity) : 0,
            revenueShare: totalRevenue > 0 ? Math.round((s.revenue / totalRevenue) * 10000) / 100 : 0,
            quantityShare: totalQuantity > 0 ? Math.round((s.quantity / totalQuantity) * 10000) / 100 : 0,
          }))
          .sort((a, b) => b.quantity - a.quantity);

        // Calculate order-level totals for the summary cards (consistent with Sales tab)
        const orderTotalRevenue = matchingOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        const orderTotalGst = matchingOrders.reduce((sum, o) => sum + (o.stateGst + o.centralGst), 0);

        return {
          items: result,
          summary: {
            totalItems: result.length,
            totalQuantity,
            totalRevenue: totalRevenue, // Sum of line items (pre-tax, pre-delivery, pre-discount)
            totalOrders: matchingOrders.length,
            orderTotalRevenue, // Sum of order totalAmount (includes GST, delivery, minus discounts) — matches Sales tab
            orderTotalGst, // GST total
          },
        };
      }),

    getWebsiteTraffic: adminProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) {
          return { error: 'Database not available', stats: null, pageviews: null, referrers: [], browsers: [], os: [], devices: [], countries: [], pages: [], channels: [], entries: [] };
        }

        try {
          const startDate = new Date(input.startDate);
          const endDate = new Date(input.endDate + 'T23:59:59.999Z');

          // Query all pageviews in the date range
          const allPageviews = await dbInstance.select().from(pageviewsTable)
            .where(and(
              sql`${pageviewsTable.createdAt} >= ${startDate}`,
              sql`${pageviewsTable.createdAt} <= ${endDate}`
            ));

          // Calculate stats
          const uniqueSessions = new Set(allPageviews.map(pv => pv.sessionId));
          const totalPageviews = allPageviews.length;
          const uniqueVisitors = uniqueSessions.size;
          const sessions = uniqueSessions.size;

          // Calculate avg duration (estimate based on session pageview spread)
          const sessionTimestamps: Record<string, number[]> = {};
          allPageviews.forEach(pv => {
            if (!sessionTimestamps[pv.sessionId]) sessionTimestamps[pv.sessionId] = [];
            sessionTimestamps[pv.sessionId].push(new Date(pv.createdAt).getTime());
          });
          let totalDuration = 0;
          let sessionCount = 0;
          Object.values(sessionTimestamps).forEach(timestamps => {
            if (timestamps.length > 1) {
              const duration = Math.max(...timestamps) - Math.min(...timestamps);
              totalDuration += duration;
              sessionCount++;
            }
          });
          const avgDuration = sessionCount > 0 ? Math.round(totalDuration / sessionCount / 1000) : 0;

          const stats = {
            pageviews: { value: totalPageviews, prev: 0 },
            visitors: { value: uniqueVisitors, prev: 0 },
            visits: { value: sessions, prev: 0 },
            bounces: { value: 0, prev: 0 },
            totaltime: { value: avgDuration * sessions, prev: 0 },
          };

          // Daily pageview breakdown
          const dailyMap: Record<string, { views: number; visitors: Set<string> }> = {};
          allPageviews.forEach(pv => {
            const day = new Date(pv.createdAt).toISOString().split('T')[0];
            if (!dailyMap[day]) dailyMap[day] = { views: 0, visitors: new Set() };
            dailyMap[day].views++;
            dailyMap[day].visitors.add(pv.sessionId);
          });
          const pageviewsData = {
            pageviews: Object.entries(dailyMap).sort().map(([date, data]) => ({ x: date, y: data.views })),
            sessions: Object.entries(dailyMap).sort().map(([date, data]) => ({ x: date, y: data.visitors.size })),
          };

          // Referrer breakdown
          const referrerMap: Record<string, number> = {};
          allPageviews.forEach(pv => {
            if (pv.referrer) {
              try {
                const hostname = new URL(pv.referrer).hostname || pv.referrer;
                referrerMap[hostname] = (referrerMap[hostname] || 0) + 1;
              } catch {
                referrerMap[pv.referrer] = (referrerMap[pv.referrer] || 0) + 1;
              }
            }
          });
          const referrers = Object.entries(referrerMap)
            .sort((a, b) => b[1] - a[1])
            .map(([x, y]) => ({ x, y }));

          // Browser breakdown
          const browserMap: Record<string, number> = {};
          allPageviews.forEach(pv => {
            const b = pv.browser || 'Unknown';
            browserMap[b] = (browserMap[b] || 0) + 1;
          });
          const browsers = Object.entries(browserMap)
            .sort((a, b) => b[1] - a[1])
            .map(([x, y]) => ({ x, y }));

          // OS breakdown
          const osMap: Record<string, number> = {};
          allPageviews.forEach(pv => {
            const o = pv.os || 'Unknown';
            osMap[o] = (osMap[o] || 0) + 1;
          });
          const osData = Object.entries(osMap)
            .sort((a, b) => b[1] - a[1])
            .map(([x, y]) => ({ x, y }));

          // Device breakdown
          const deviceMap: Record<string, number> = {};
          allPageviews.forEach(pv => {
            const d = pv.device || 'desktop';
            deviceMap[d] = (deviceMap[d] || 0) + 1;
          });
          const devices = Object.entries(deviceMap)
            .sort((a, b) => b[1] - a[1])
            .map(([x, y]) => ({ x, y }));

          // Pages breakdown
          const pageMap: Record<string, number> = {};
          allPageviews.forEach(pv => {
            pageMap[pv.url] = (pageMap[pv.url] || 0) + 1;
          });
          const pages = Object.entries(pageMap)
            .sort((a, b) => b[1] - a[1])
            .map(([x, y]) => ({ x, y }));

          // Entry pages (first page per session)
          const sessionFirstPage: Record<string, { url: string; time: number }> = {};
          allPageviews.forEach(pv => {
            const time = new Date(pv.createdAt).getTime();
            if (!sessionFirstPage[pv.sessionId] || time < sessionFirstPage[pv.sessionId].time) {
              sessionFirstPage[pv.sessionId] = { url: pv.url, time };
            }
          });
          const entryMap: Record<string, number> = {};
          Object.values(sessionFirstPage).forEach(({ url }) => {
            entryMap[url] = (entryMap[url] || 0) + 1;
          });
          const entries = Object.entries(entryMap)
            .sort((a, b) => b[1] - a[1])
            .map(([x, y]) => ({ x, y }));

          // UTM/Channel breakdown
          const channelMap: Record<string, number> = {};
          allPageviews.forEach(pv => {
            if (pv.utmSource) {
              const source = pv.utmSource.toLowerCase();
              if (source.includes('instagram') || source.includes('ig')) channelMap['Instagram'] = (channelMap['Instagram'] || 0) + 1;
              else if (source.includes('facebook') || source.includes('fb')) channelMap['Facebook'] = (channelMap['Facebook'] || 0) + 1;
              else if (source.includes('google')) channelMap['Google'] = (channelMap['Google'] || 0) + 1;
              else if (source.includes('whatsapp')) channelMap['WhatsApp'] = (channelMap['WhatsApp'] || 0) + 1;
              else channelMap[pv.utmSource] = (channelMap[pv.utmSource] || 0) + 1;
            }
          });
          const channels = Object.entries(channelMap)
            .sort((a, b) => b[1] - a[1])
            .map(([x, y]) => ({ x, y }));

          return {
            error: null,
            stats,
            pageviews: pageviewsData,
            referrers,
            browsers,
            os: osData,
            devices,
            countries: [],
            pages,
            channels,
            entries,
          };
        } catch (err) {
          console.error('Traffic analytics error:', err);
          return { error: 'Failed to fetch analytics', stats: null, pageviews: null, referrers: [], browsers: [], os: [], devices: [], countries: [], pages: [], channels: [], entries: [] };
        }
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

        // Get all rewards per user (both redeemed and unredeemed)
        const allRewards = await dbInstance.select().from(loyaltyRewards);
        const now = new Date();
        const userRewards: Record<number, { count: number; rewards: { id: number; voucherCode: string; rewardType: string; expiresAt: Date; isRedeemed: boolean; redeemedAt: Date | null }[] }> = {};
        allRewards.forEach(r => {
          // Only count unredeemed, non-expired as active
          const isExpired = new Date(r.expiresAt) < now;
          const isActive = !r.isRedeemed && !isExpired;
          if (!userRewards[r.userId]) userRewards[r.userId] = { count: 0, rewards: [] };
          if (isActive) userRewards[r.userId].count += 1;
          userRewards[r.userId].rewards.push({ id: r.id, voucherCode: r.voucherCode, rewardType: r.rewardType, expiresAt: r.expiresAt, isRedeemed: r.isRedeemed, redeemedAt: r.redeemedAt });
        });

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
          unredeemedRewards: userRewards[user.id]?.count || 0,
          rewardDetails: userRewards[user.id]?.rewards || [],
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
              unredeemedRewards: 0,
              rewardDetails: [],
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

        // Check if stamps reached 10+ and create rewards
        let currentStamps = newStampCount;
        let rewardsCreated = 0;
        while (currentStamps >= 10) {
          const voucherCode = `REWARD${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          await dbInstance.insert(loyaltyRewards).values({
            userId: input.customerId,
            rewardType: 'free_large_bubble_tea',
            voucherCode: voucherCode,
            isRedeemed: false,
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          });
          currentStamps -= 10;
          rewardsCreated++;

          // Record reward creation in stamp transactions
          await dbInstance.insert(stampTransactions).values({
            userId: input.customerId,
            orderId: null,
            action: 'redeem',
            stamps: -10,
            orderTotal: 0,
            description: `Reward earned: Free Large Bubble Tea (voucher: ${voucherCode})`,
            createdAt: new Date(),
          });
        }

        // Update stamp count after creating rewards
        if (rewardsCreated > 0) {
          await dbInstance.update(users).set({ stampCount: currentStamps }).where(eq(users.id, input.customerId));
        }

        const finalStampCount = rewardsCreated > 0 ? currentStamps : newStampCount;
        return { 
          success: true, 
          newStampCount: finalStampCount,
          rewardsCreated,
          message: rewardsCreated > 0 
            ? `Added ${input.stamps} stamps to ${customer.name}'s account. ${rewardsCreated} reward(s) created! Stamps remaining: ${finalStampCount}`
            : `Added ${input.stamps} stamps to ${customer.name}'s account` 
        };
      }),

    // Adjust stamps (add or deduct) for a customer - admin only
    adjustStamps: adminProcedure
      .input(z.object({
        customerId: z.number(),
        adjustment: z.number().min(-20).max(20).refine(v => v !== 0, 'Adjustment cannot be zero'),
        reason: z.string().min(1, 'Reason is required'),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const [customer] = await dbInstance.select().from(users).where(eq(users.id, input.customerId));
        if (!customer) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found' });
        }

        if (customer.role === 'staff' || customer.role === 'admin') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot adjust stamps for staff or admin accounts' });
        }

        const currentStamps = customer.stampCount || 0;
        let newStampCount = currentStamps + input.adjustment;
        if (newStampCount < 0) newStampCount = 0;

        // Update stamp count
        await dbInstance.update(users).set({
          stampCount: newStampCount,
          ...(input.adjustment > 0 ? {
            lifetimeStamps: (customer.lifetimeStamps || 0) + input.adjustment,
            lastStampDate: new Date(),
          } : {}),
        }).where(eq(users.id, input.customerId));

        // Record the stamp transaction
        const { stampTransactions } = await import('../drizzle/schema.js');
        await dbInstance.insert(stampTransactions).values({
          userId: input.customerId,
          orderId: null,
          action: input.adjustment > 0 ? 'bonus' : 'admin_deduct',
          stamps: input.adjustment,
          orderTotal: 0,
          description: `${input.reason} (by ${ctx.user.name})`,
          createdAt: new Date(),
        });

        // If adding stamps, check if rewards should be created
        let rewardsCreated = 0;
        let finalStampCount = newStampCount;
        if (input.adjustment > 0 && newStampCount >= 10) {
          while (finalStampCount >= 10) {
            const voucherCode = `REWARD${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            await dbInstance.insert(loyaltyRewards).values({
              userId: input.customerId,
              rewardType: 'free_large_bubble_tea',
              voucherCode: voucherCode,
              isRedeemed: false,
              expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            });
            finalStampCount -= 10;
            rewardsCreated++;

            await dbInstance.insert(stampTransactions).values({
              userId: input.customerId,
              orderId: null,
              action: 'redeem',
              stamps: -10,
              orderTotal: 0,
              description: `Reward earned: Free Large Bubble Tea (voucher: ${voucherCode})`,
              createdAt: new Date(),
            });
          }
          await dbInstance.update(users).set({ stampCount: finalStampCount }).where(eq(users.id, input.customerId));
        }

        const action = input.adjustment > 0 ? 'Added' : 'Deducted';
        const absAdj = Math.abs(input.adjustment);
        return {
          success: true,
          previousStamps: currentStamps,
          newStampCount: finalStampCount,
          rewardsCreated,
          message: rewardsCreated > 0
            ? `${action} ${absAdj} stamp(s). ${rewardsCreated} reward(s) created! Stamps: ${currentStamps} → ${finalStampCount}`
            : `${action} ${absAdj} stamp(s) for ${customer.name}. Stamps: ${currentStamps} → ${finalStampCount}`,
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

    // Preview merge - show what data will be transferred
    // Supports both registered (numeric ID) and guest (string ID like 'guest_9025331599') accounts
    previewMerge: adminProcedure
      .input(z.object({
        sourceId: z.union([z.number(), z.string()]),
        targetId: z.union([z.number(), z.string()]),
      }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const isSourceGuest = typeof input.sourceId === 'string' && String(input.sourceId).startsWith('guest_');
        const isTargetGuest = typeof input.targetId === 'string' && String(input.targetId).startsWith('guest_');

        if (isSourceGuest && isTargetGuest) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot merge two guest accounts. At least one must be a registered account.' });
        if (String(input.sourceId) === String(input.targetId)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot merge an account with itself' });

        // Build source data
        let sourceData: any;
        let sourceOrdersList: any[] = [];
        if (isSourceGuest) {
          const guestPhone = String(input.sourceId).replace('guest_', '');
          // Find guest orders by phone
          const guestOrderRecords = await dbInstance.select().from(orders).where(
            and(or(eq(orders.userId, 0), isNull(orders.userId)), eq(orders.customerPhone, guestPhone))
          );
          // Also check guestOrders table
          const guestOrderRecords2 = await dbInstance.select().from(guestOrders).where(eq(guestOrders.guestPhone, guestPhone));
          sourceOrdersList = guestOrderRecords;
          const totalSpent = guestOrderRecords.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
          sourceData = {
            id: input.sourceId,
            name: guestOrderRecords[0]?.customerName || guestOrderRecords2[0]?.guestName || 'Guest',
            email: guestOrderRecords2[0]?.guestEmail || null,
            phone: guestPhone,
            loginMethod: 'guest',
            stampCount: 0,
            lifetimeStamps: 0,
            storeCredit: 0,
            loyaltyPoints: 0,
            notes: null,
            birthMonth: null,
            birthDay: null,
            orderCount: guestOrderRecords.length,
            addressCount: 0,
            stampTransactionCount: 0,
            loyaltyTransactionCount: 0,
            rewardCount: 0,
            discountUsageCount: 0,
            reviewCount: 0,
            complaintCount: 0,
            totalSpent,
            isGuest: true,
            createdAt: null,
          };
        } else {
          const sourceId = Number(input.sourceId);
          const [source] = await dbInstance.select().from(users).where(eq(users.id, sourceId));
          if (!source) throw new TRPCError({ code: 'NOT_FOUND', message: 'Source account not found' });
          if (source.role === 'admin' || source.role === 'staff') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot merge staff/admin accounts' });
          sourceOrdersList = await dbInstance.select().from(orders).where(eq(orders.userId, source.id));
          const sourceAddresses = await dbInstance.select().from(addresses).where(eq(addresses.userId, source.id));
          const sourceStampTxns = await dbInstance.select().from(stampTransactions).where(eq(stampTransactions.userId, source.id));
          const sourceLoyaltyTxns = await dbInstance.select().from(loyaltyTransactions).where(eq(loyaltyTransactions.userId, source.id));
          const sourceLoyaltyRewards = await dbInstance.select().from(loyaltyRewards).where(eq(loyaltyRewards.userId, source.id));
          const sourceDiscountUsages = await dbInstance.select().from(discountUsage).where(eq(discountUsage.userId, source.id));
          const sourceReviews = await dbInstance.select().from(reviews).where(eq(reviews.userId, source.id));
          const sourceComplaints = await dbInstance.select().from(complaints).where(eq(complaints.userId, source.id));
          sourceData = {
            id: source.id,
            name: source.name,
            email: source.email,
            phone: source.phone,
            loginMethod: source.loginMethod,
            stampCount: source.stampCount || 0,
            lifetimeStamps: source.lifetimeStamps || 0,
            storeCredit: source.storeCredit || 0,
            loyaltyPoints: source.loyaltyPoints || 0,
            notes: source.notes,
            birthMonth: source.birthMonth,
            birthDay: source.birthDay,
            orderCount: sourceOrdersList.length,
            addressCount: sourceAddresses.length,
            stampTransactionCount: sourceStampTxns.length,
            loyaltyTransactionCount: sourceLoyaltyTxns.length,
            rewardCount: sourceLoyaltyRewards.length,
            discountUsageCount: sourceDiscountUsages.length,
            reviewCount: sourceReviews.length,
            complaintCount: sourceComplaints.length,
            isGuest: false,
            createdAt: source.createdAt,
          };
        }

        // Build target data
        let targetData: any;
        let targetOrdersList: any[] = [];
        if (isTargetGuest) {
          const guestPhone = String(input.targetId).replace('guest_', '');
          const guestOrderRecords = await dbInstance.select().from(orders).where(
            and(or(eq(orders.userId, 0), isNull(orders.userId)), eq(orders.customerPhone, guestPhone))
          );
          const guestOrderRecords2 = await dbInstance.select().from(guestOrders).where(eq(guestOrders.guestPhone, guestPhone));
          targetOrdersList = guestOrderRecords;
          const totalSpent = guestOrderRecords.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
          targetData = {
            id: input.targetId,
            name: guestOrderRecords[0]?.customerName || guestOrderRecords2[0]?.guestName || 'Guest',
            email: guestOrderRecords2[0]?.guestEmail || null,
            phone: guestPhone,
            loginMethod: 'guest',
            stampCount: 0,
            lifetimeStamps: 0,
            storeCredit: 0,
            loyaltyPoints: 0,
            notes: null,
            birthMonth: null,
            birthDay: null,
            orderCount: guestOrderRecords.length,
            isGuest: true,
            createdAt: null,
          };
        } else {
          const targetId = Number(input.targetId);
          const [target] = await dbInstance.select().from(users).where(eq(users.id, targetId));
          if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'Target account not found' });
          if (target.role === 'admin' || target.role === 'staff') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot merge into staff/admin accounts' });
          targetOrdersList = await dbInstance.select().from(orders).where(eq(orders.userId, target.id));
          targetData = {
            id: target.id,
            name: target.name,
            email: target.email,
            phone: target.phone,
            loginMethod: target.loginMethod,
            stampCount: target.stampCount || 0,
            lifetimeStamps: target.lifetimeStamps || 0,
            storeCredit: target.storeCredit || 0,
            loyaltyPoints: target.loyaltyPoints || 0,
            notes: target.notes,
            birthMonth: target.birthMonth,
            birthDay: target.birthDay,
            orderCount: targetOrdersList.length,
            isGuest: false,
            createdAt: target.createdAt,
          };
        }

        return {
          source: sourceData,
          target: targetData,
          mergePreview: {
            stampCountAfterMerge: (sourceData.stampCount || 0) + (targetData.stampCount || 0),
            lifetimeStampsAfterMerge: (sourceData.lifetimeStamps || 0) + (targetData.lifetimeStamps || 0),
            storeCreditAfterMerge: (sourceData.storeCredit || 0) + (targetData.storeCredit || 0),
            loyaltyPointsAfterMerge: (sourceData.loyaltyPoints || 0) + (targetData.loyaltyPoints || 0),
            totalOrdersAfterMerge: sourceOrdersList.length + targetOrdersList.length,
            recordsToTransfer: {
              orders: sourceOrdersList.length,
              addresses: sourceData.addressCount || 0,
              stampTransactions: sourceData.stampTransactionCount || 0,
              loyaltyTransactions: sourceData.loyaltyTransactionCount || 0,
              rewards: sourceData.rewardCount || 0,
              discountUsages: sourceData.discountUsageCount || 0,
              reviews: sourceData.reviewCount || 0,
              complaints: sourceData.complaintCount || 0,
            },
          },
        };
      }),

    // Execute the merge - supports both registered and guest accounts
    executeMerge: adminProcedure
      .input(z.object({
        sourceId: z.union([z.number(), z.string()]),
        targetId: z.union([z.number(), z.string()]),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const isSourceGuest = typeof input.sourceId === 'string' && String(input.sourceId).startsWith('guest_');
        const isTargetGuest = typeof input.targetId === 'string' && String(input.targetId).startsWith('guest_');

        if (isSourceGuest && isTargetGuest) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot merge two guest accounts' });
        if (String(input.sourceId) === String(input.targetId)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot merge an account with itself' });

        if (isSourceGuest) {
          // GUEST → REGISTERED merge
          const guestPhone = String(input.sourceId).replace('guest_', '');
          const targetId = Number(input.targetId);
          const [target] = await dbInstance.select().from(users).where(eq(users.id, targetId));
          if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'Target account not found' });
          if (target.role === 'admin' || target.role === 'staff') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot merge into staff/admin accounts' });

          // Reassign guest orders (userId=0, matching phone) to target user
          await dbInstance.update(orders).set({ userId: target.id }).where(
            and(or(eq(orders.userId, 0), isNull(orders.userId)), eq(orders.customerPhone, guestPhone))
          );

          // Fill in phone if target doesn't have one
          const updateFields: Record<string, any> = {};
          if (!target.phone) updateFields.phone = guestPhone;
          // Get guest name from orders if target has no name
          if (!target.name) {
            const [guestOrder] = await dbInstance.select().from(orders).where(eq(orders.customerPhone, guestPhone));
            if (guestOrder?.customerName) updateFields.name = guestOrder.customerName;
          }
          if (Object.keys(updateFields).length > 0) {
            await dbInstance.update(users).set(updateFields).where(eq(users.id, target.id));
          }

          // Record audit trail
          await dbInstance.insert(stampTransactions).values({
            userId: target.id,
            orderId: null,
            action: 'bonus',
            stamps: 0,
            orderTotal: 0,
            description: `Guest account merge: guest orders from phone ${guestPhone} reassigned to this account by admin ${ctx.user.name}`,
            createdAt: new Date(),
          });

        } else if (isTargetGuest) {
          // REGISTERED → GUEST merge (less common but supported)
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot merge a registered account into a guest account. Please swap source and target.' });

        } else {
          // REGISTERED → REGISTERED merge (original logic)
          const sourceId = Number(input.sourceId);
          const targetId = Number(input.targetId);
          const [source] = await dbInstance.select().from(users).where(eq(users.id, sourceId));
          const [target] = await dbInstance.select().from(users).where(eq(users.id, targetId));

          if (!source) throw new TRPCError({ code: 'NOT_FOUND', message: 'Source account not found' });
          if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'Target account not found' });
          if (source.id === target.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot merge an account with itself' });
          if (source.role === 'admin' || source.role === 'staff') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot merge staff/admin accounts' });
          if (target.role === 'admin' || target.role === 'staff') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot merge into staff/admin accounts' });

          // 1. Transfer orders
          await dbInstance.update(orders).set({ userId: target.id }).where(eq(orders.userId, source.id));
          // 2. Transfer addresses
          await dbInstance.update(addresses).set({ userId: target.id }).where(eq(addresses.userId, source.id));
          // 3. Transfer stamp transactions
          await dbInstance.update(stampTransactions).set({ userId: target.id }).where(eq(stampTransactions.userId, source.id));
          // 4. Transfer loyalty transactions
          await dbInstance.update(loyaltyTransactions).set({ userId: target.id }).where(eq(loyaltyTransactions.userId, source.id));
          // 5. Transfer loyalty rewards
          await dbInstance.update(loyaltyRewards).set({ userId: target.id }).where(eq(loyaltyRewards.userId, source.id));
          // 6. Transfer discount usage
          await dbInstance.update(discountUsage).set({ userId: target.id }).where(eq(discountUsage.userId, source.id));
          // 7. Transfer reviews
          await dbInstance.update(reviews).set({ userId: target.id }).where(eq(reviews.userId, source.id));
          // 8. Transfer complaints
          await dbInstance.update(complaints).set({ userId: target.id }).where(eq(complaints.userId, source.id));

          // 9. Merge user data
          const mergedStampCount = (source.stampCount || 0) + (target.stampCount || 0);
          const mergedLifetimeStamps = (source.lifetimeStamps || 0) + (target.lifetimeStamps || 0);
          const mergedStoreCredit = (source.storeCredit || 0) + (target.storeCredit || 0);
          const mergedLoyaltyPoints = (source.loyaltyPoints || 0) + (target.loyaltyPoints || 0);

          const updateFields: Record<string, any> = {
            stampCount: mergedStampCount,
            lifetimeStamps: mergedLifetimeStamps,
            storeCredit: mergedStoreCredit,
            loyaltyPoints: mergedLoyaltyPoints,
          };

          if (!target.phone && source.phone) updateFields.phone = source.phone;
          if (!target.email && source.email) updateFields.email = source.email;
          if (!target.name && source.name) updateFields.name = source.name;
          if (!target.birthMonth && source.birthMonth) {
            updateFields.birthMonth = source.birthMonth;
            updateFields.birthDay = source.birthDay;
          }
          if (source.notes) {
            updateFields.notes = target.notes 
              ? `${target.notes}\n---\nMerged from account #${source.id}: ${source.notes}`
              : `Merged from account #${source.id}: ${source.notes}`;
          }
          if (source.lastStampDate && (!target.lastStampDate || source.lastStampDate > target.lastStampDate)) {
            updateFields.lastStampDate = source.lastStampDate;
          }

          await dbInstance.update(users).set(updateFields).where(eq(users.id, target.id));

          // 10. Audit trail
          if ((source.stampCount || 0) > 0) {
            await dbInstance.insert(stampTransactions).values({
              userId: target.id,
              orderId: null,
              action: 'bonus',
              stamps: 0,
              orderTotal: 0,
              description: `Account merge: ${source.stampCount} stamps transferred from account #${source.id} (${source.name || source.phone || 'unknown'}) by admin ${ctx.user.name}`,
              createdAt: new Date(),
            });
          }

          // 11. Deactivate source
          await dbInstance.update(users).set({
            name: `[MERGED → #${target.id}] ${source.name || ''}`,
            notes: `Account merged into #${target.id} (${target.name || target.email || target.phone}) on ${new Date().toISOString()} by admin ${ctx.user.name}. Original data: name=${source.name}, phone=${source.phone}, email=${source.email}, stamps=${source.stampCount}, storeCredit=${source.storeCredit}`,
            stampCount: 0,
            lifetimeStamps: 0,
            storeCredit: 0,
            loyaltyPoints: 0,
          }).where(eq(users.id, source.id));
        }

        return {
          success: true,
          message: `Accounts merged successfully`,
        };
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
        email: z.string().email(),
        phone: z.string().min(10),
        company: z.string().optional(),
        eventType: z.enum(["wedding", "corporate", "school", "birthday", "private", "festival", "other"]),
        eventDate: z.string(),
        eventTime: z.string(),
        venue: z.string().min(1),
        guestCount: z.number().min(1),
        serviceType: z.enum(["beverages_only", "food_only", "both"]),
        preferredBeverages: z.string().optional(),
        preferredFood: z.string().optional(),
        budgetRange: z.string().optional(),
        specialRequirements: z.string().optional(),
        referralSource: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        const refNum = `EV${Date.now().toString(36).toUpperCase()}`;
        const result = await database.insert(eventInquiries).values({
          referenceNumber: refNum,
          customerName: input.customerName,
          email: input.email,
          phone: input.phone,
          company: input.company || null,
          eventType: input.eventType,
          eventDate: new Date(input.eventDate),
          eventTime: input.eventTime,
          venue: input.venue,
          guestCount: input.guestCount,
          serviceType: input.serviceType,
          preferredBeverages: input.preferredBeverages || null,
          preferredFood: input.preferredFood || null,
          budgetRange: input.budgetRange || null,
          specialRequirements: input.specialRequirements || null,
          referralSource: input.referralSource || null,
        });
        
        // Notify owner about new inquiry
        await notifyOwner({
          title: `New Event Inquiry: ${input.eventType}`,
          content: `New event inquiry from ${input.customerName} (${input.email})\n\nEvent: ${input.eventType}\nDate: ${input.eventDate}\nVenue: ${input.venue}\nGuests: ${input.guestCount}\nService: ${input.serviceType}`,
        });
        
        return { success: true, id: result[0].insertId, referenceNumber: refNum };
      }),

    // Get all inquiries (admin)
    getInquiries: adminProcedure
      .input(z.object({
        status: z.enum(["new", "contacted", "quoted", "confirmed", "completed", "cancelled", "all"]).optional(),
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
        status: z.enum(["new", "contacted", "quoted", "confirmed", "completed", "cancelled"]),
        internalNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        await database.update(eventInquiries)
          .set({ 
            status: input.status,
            internalNotes: input.internalNotes || null,
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

  // Popup Event Registrations (e.g., The Leela Hyderabad)
  popup: router({
    // Register interest for a popup event — DISABLED (event ended March 8, 2026)
    registerInterest: publicProcedure
      .input(z.object({
        eventSlug: z.string().min(1),
        customerName: z.string().min(1, "Name is required"),
        customerEmail: z.string().email("Valid email is required"),
        customerPhone: z.string().min(10, "Valid phone number is required"),
        eventType: z.enum(["dinner", "masterclass"]),
        selectedDate: z.string().min(1, "Please select a date"),
        numberOfGuests: z.number().min(1).max(20).default(1),
        specialRequirements: z.string().optional(),
      }))
      .mutation(async () => {
        // Event has ended — reject all new registrations
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This event has ended. Registrations are no longer accepted.' });
      }),

    // Get all registrations for a popup event (admin)
    getRegistrations: adminProcedure
      .input(z.object({
        eventSlug: z.string(),
        eventType: z.enum(["dinner", "masterclass", "all"]).optional(),
      }))
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const conditions = [eq(popupRegistrations.eventSlug, input.eventSlug)];
        if (input.eventType && input.eventType !== "all") {
          conditions.push(eq(popupRegistrations.eventType, input.eventType));
        }
        
        return database.select().from(popupRegistrations)
          .where(and(...conditions))
          .orderBy(desc(popupRegistrations.createdAt));
      }),

    // Update registration status (admin)
    updateRegistrationStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["registered", "confirmed", "cancelled"]),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        await database.update(popupRegistrations)
          .set({ status: input.status })
          .where(eq(popupRegistrations.id, input.id));
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
      .query(async ({ input, ctx }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'NOT_FOUND' });
        
        const [article] = await database.select()
          .from(blogArticles)
          .where(eq(blogArticles.slug, input.slug));
        
        if (!article) throw new TRPCError({ code: 'NOT_FOUND' });
        
        // Only admins can view non-published articles
        if (article.status !== 'published') {
          const isAdmin = ctx.user?.role === 'admin';
          if (!isAdmin) throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
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

    // Upload blog featured image (admin only)
    uploadImage: adminProcedure
      .input(z.object({
        articleId: z.number(),
        imageBase64: z.string(), // base64 data URL
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const { articleId, imageBase64 } = input;
        
        // Validate article exists
        const [article] = await database.select({ id: blogArticles.id })
          .from(blogArticles)
          .where(eq(blogArticles.id, articleId));
        if (!article) throw new TRPCError({ code: 'NOT_FOUND', message: 'Article not found' });
        
        // Extract base64 data
        const base64Match = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!base64Match) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid image data' });
        
        const ext = base64Match[1] === 'jpeg' ? 'jpg' : base64Match[1];
        const buffer = Buffer.from(base64Match[2], 'base64');
        
        // Upload via hybrid storage (S3 + Cloudinary)
        try {
          const { hybridUpload } = await import('./hybridStorage');
          const result = await hybridUpload(buffer, {
            fileName: `blog-${articleId}-${Date.now()}.${ext}`,
            folder: 'blog',
            mimeType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            tags: ['blog', 'featured-image'],
          });
          
          const imageUrl = result.deliveryUrl;
          
          await database.update(blogArticles)
            .set({ imageUrl })
            .where(eq(blogArticles.id, articleId));
          
          return { success: true, imageUrl };
        } catch (err) {
          console.error('[blog.uploadImage] Upload failed:', err);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to upload image' });
        }
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

  // AI Chatbot Ordering Assistant
  chatbot: router({
    chat: publicProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.string(),
          content: z.string(),
        })),
        sessionId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const response = await chatWithBot(input.messages);
        
        // Log conversation asynchronously (don't block the response)
        try {
          const dbInstance = await getDb();
          if (dbInstance && input.sessionId) {
            const lastUserMsg = [...input.messages].reverse().find(m => m.role === 'user');
            
            // Find or create conversation
            let convId: number;
            const existing = await dbInstance.select().from(chatConversations)
              .where(eq(chatConversations.sessionId, input.sessionId))
              .limit(1);
            
            if (existing.length > 0) {
              convId = existing[0].id;
              await dbInstance.update(chatConversations)
                .set({ messageCount: sql`messageCount + 2` })
                .where(eq(chatConversations.id, convId));
            } else {
              const userName = (ctx as any)?.user?.name || null;
              const userId = (ctx as any)?.user?.id || null;
              const [result] = await dbInstance.insert(chatConversations).values({
                sessionId: input.sessionId,
                userId,
                userName,
                messageCount: 2,
                channel: 'text',
              });
              convId = result.insertId;
            }
            
            // Detect intents for logging
            const { detectIntents, extractSearchQuery } = await import('./chatbot');
            const userContent = lastUserMsg?.content || '';
            const intents = detectIntents(userContent);
            const searchQuery = intents.includes('search_menu') ? extractSearchQuery(userContent) : null;
            
            // Log user message
            if (lastUserMsg) {
              await dbInstance.insert(chatMessages).values({
                conversationId: convId,
                role: 'user',
                content: lastUserMsg.content,
                intents: intents,
                searchQuery,
              });
            }
            
            // Log bot response
            await dbInstance.insert(chatMessages).values({
              conversationId: convId,
              role: 'assistant',
              content: response.reply,
              productsShown: response.cards?.length || 0,
            });
          }
        } catch (logErr) {
          console.error('[ChatLog] Failed to log conversation:', logErr);
        }
        
        return response;
      }),

    // Voice chat: receive audio URL → transcribe → chat → TTS → return audio + text
    voiceChat: publicProcedure
      .input(z.object({
        audioUrl: z.string().url(),
        conversationHistory: z.array(z.object({
          role: z.string(),
          content: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        // Step 1: Transcribe the audio
        const transcription = await transcribeAudio({
          audioUrl: input.audioUrl,
          prompt: 'Transcribe the customer\'s voice message. They may speak in English, Tamil, Hindi, Mandarin Chinese, or other languages.',
        });

        if ('error' in transcription) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: transcription.error,
            cause: transcription,
          });
        }

        const userText = transcription.text;
        const detectedLanguage = transcription.language || 'en';

        console.log(`[VoiceChat] Transcribed (${detectedLanguage}): ${userText}`);

        // Step 2: Build conversation history with the new transcribed message
        const history = [
          ...(input.conversationHistory || []),
          { role: 'user', content: userText },
        ];

        // Step 3: Get chatbot response (it will auto-detect language from the user message)
        const chatResponse = await chatWithBot(history);

        console.log(`[VoiceChat] Bot reply: ${chatResponse.reply.substring(0, 100)}...`);

        // Step 4: Convert bot reply to speech
        // Strip markdown formatting for cleaner TTS output
        const cleanText = chatResponse.reply
          .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold
          .replace(/\*([^*]+)\*/g, '$1')      // Remove italic
          .replace(/#{1,6}\s/g, '')            // Remove headings
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
          .replace(/[`~]/g, '')                // Remove code markers
          .replace(/\n{3,}/g, '\n\n')          // Collapse multiple newlines
          .trim();

        const voice = getVoiceForLanguage(detectedLanguage);
        const ttsResult = await textToSpeech({
          text: cleanText,
          voice,
          speed: 1.0,
        });

        let audioResponseUrl: string | null = null;
        if ('audioUrl' in ttsResult) {
          audioResponseUrl = ttsResult.audioUrl;
        } else {
          console.error('[VoiceChat] TTS failed:', ttsResult.error);
          // Continue without audio — text response still works
        }

        return {
          // Transcription info
          userText,
          detectedLanguage,
          // Bot response
          reply: chatResponse.reply,
          cards: chatResponse.cards,
          quickReplies: chatResponse.quickReplies,
          // Audio response
          audioUrl: audioResponseUrl,
        };
      }),

    // Upload audio from frontend for voice chat
    uploadAudio: publicProcedure
      .input(z.object({
        audioBase64: z.string(),
        mimeType: z.string().default('audio/webm'),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.audioBase64, 'base64');
        
        // Check size (16MB limit)
        const sizeMB = buffer.length / (1024 * 1024);
        if (sizeMB > 16) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Audio file too large (${sizeMB.toFixed(1)}MB). Maximum is 16MB.`,
          });
        }

        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const ext = input.mimeType.includes('webm') ? 'webm' : 
                    input.mimeType.includes('mp4') ? 'm4a' :
                    input.mimeType.includes('ogg') ? 'ogg' : 'webm';
        const fileKey = `voice-chat/input-${timestamp}-${randomSuffix}.${ext}`;

        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return { audioUrl: url };
      }),
  }),

  // =============================================
  // CHATBOT ANALYTICS
  // =============================================
  chatAnalytics: router({
    // Admin: Get conversation stats overview
    getStats: adminProcedure
      .input(z.object({
        days: z.number().default(30),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { totalConversations: 0, totalMessages: 0, avgMessagesPerConv: 0, topIntents: [], recentConversations: [], dailyUsage: [] };
        
        const days = input?.days || 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        // Total conversations
        const [convCount] = await dbInstance.select({ count: sql<number>`COUNT(*)` })
          .from(chatConversations)
          .where(gte(chatConversations.startedAt, since));
        
        // Total messages
        const [msgCount] = await dbInstance.select({ count: sql<number>`COUNT(*)` })
          .from(chatMessages)
          .where(gte(chatMessages.createdAt, since));
        
        // Top intents (from user messages)
        const intentRows = await dbInstance.select({
          intents: chatMessages.intents,
        })
          .from(chatMessages)
          .where(and(
            eq(chatMessages.role, 'user'),
            gte(chatMessages.createdAt, since)
          ));
        
        // Count intents
        const intentCounts: Record<string, number> = {};
        for (const row of intentRows) {
          const intents = (row.intents as string[] | null) || [];
          for (const intent of intents) {
            intentCounts[intent] = (intentCounts[intent] || 0) + 1;
          }
        }
        const topIntents = Object.entries(intentCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([intent, count]) => ({ intent, count }));
        
        // Top search queries
        const searchRows = await dbInstance.select({
          searchQuery: chatMessages.searchQuery,
        })
          .from(chatMessages)
          .where(and(
            eq(chatMessages.role, 'user'),
            gte(chatMessages.createdAt, since),
            sql`${chatMessages.searchQuery} IS NOT NULL AND ${chatMessages.searchQuery} != ''`
          ));
        
        const queryCounts: Record<string, number> = {};
        for (const row of searchRows) {
          const q = (row.searchQuery || '').toLowerCase().trim();
          if (q) queryCounts[q] = (queryCounts[q] || 0) + 1;
        }
        const topSearches = Object.entries(queryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([query, count]) => ({ query, count }));
        
        // Daily usage for chart
        const dailyRows = await dbInstance.select({
          date: sql<string>`DATE(\`createdAt\`)`.as('date'),
          count: sql<number>`COUNT(*)`.as('count'),
        })
          .from(chatMessages)
          .where(and(
            eq(chatMessages.role, 'user'),
            gte(chatMessages.createdAt, since)
          ))
          .groupBy(sql`DATE(\`createdAt\`)`)
          .orderBy(sql`DATE(\`createdAt\`)`);
        
        // Recent conversations with preview
        const recentConvs = await dbInstance.select()
          .from(chatConversations)
          .where(gte(chatConversations.startedAt, since))
          .orderBy(desc(chatConversations.lastMessageAt))
          .limit(20);
        
        // Get first user message for each conversation as preview
        const recentWithPreview = await Promise.all(recentConvs.map(async (conv) => {
          const firstMsg = await dbInstance.select()
            .from(chatMessages)
            .where(and(
              eq(chatMessages.conversationId, conv.id),
              eq(chatMessages.role, 'user')
            ))
            .orderBy(asc(chatMessages.createdAt))
            .limit(1);
          return {
            ...conv,
            preview: firstMsg[0]?.content || '(no message)',
          };
        }));
        
        return {
          totalConversations: Number(convCount?.count || 0),
          totalMessages: Number(msgCount?.count || 0),
          avgMessagesPerConv: convCount?.count ? Math.round(Number(msgCount?.count || 0) / Number(convCount.count)) : 0,
          topIntents,
          topSearches,
          dailyUsage: dailyRows.map(r => ({ date: r.date, count: Number(r.count) })),
          recentConversations: recentWithPreview,
        };
      }),
    
    // Admin: Get full conversation messages
    getConversation: adminProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) return { conversation: null, messages: [] };
        
        const [conv] = await dbInstance.select().from(chatConversations)
          .where(eq(chatConversations.id, input.conversationId));
        
        const msgs = await dbInstance.select().from(chatMessages)
          .where(eq(chatMessages.conversationId, input.conversationId))
          .orderBy(asc(chatMessages.createdAt));
        
        return { conversation: conv || null, messages: msgs };
      }),
  }),

  // =============================================
  // HOMEPAGE CMS
  // =============================================
  partner: partnerRouter,
  homepage: router({
    // Public: Get all homepage sections for rendering
    getSections: publicProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      return dbInstance.select().from(homepageSections).orderBy(asc(homepageSections.displayOrder));
    }),

    // Public: Get featured products for carousel
    getFeaturedProducts: publicProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const featured = await dbInstance.select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        imageUrl: products.imageUrl,
        instorePrice: products.instorePrice,
        deliveryPrice: products.deliveryPrice,
        useBasePrice: products.useBasePrice,
        isVegetarian: products.isVegetarian,
        isNonVeg: products.isNonVeg,
        containsEgg: products.containsEgg,
        featuredOrder: products.featuredOrder,
        subcategoryId: products.subcategoryId,
        subcategoryName: subcategories.name,
        categoryName: categories.name,
        categoryId: categories.id,
        // Base prices from subcategory for drinks
        basePriceRegularWithBoba: subcategories.basePriceRegularWithBoba,
        basePriceRegularNoBoba: subcategories.basePriceRegularNoBoba,
        basePricePetiteWithBoba: subcategories.basePricePetiteWithBoba,
        basePricePetiteNoBoba: subcategories.basePricePetiteNoBoba,
        availableAtPalladium: products.availableAtPalladium,
        availableAtTnagar: products.availableAtTnagar,
      })
        .from(products)
        .innerJoin(subcategories, eq(products.subcategoryId, subcategories.id))
        .innerJoin(categories, eq(subcategories.categoryId, categories.id))
        .where(and(
          eq(products.isFeatured, true),
          eq(products.isActive, true)
        ))
        .orderBy(asc(products.featuredOrder));
      return featured;
    }),

    // Admin: Update a homepage section
    updateSection: adminProcedure
      .input(z.object({
        sectionKey: z.string(),
        title: z.string().optional(),
        subtitle: z.string().optional(),
        content: z.any().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const existing = await dbInstance.select().from(homepageSections)
          .where(eq(homepageSections.sectionKey, input.sectionKey));
        
        const updateData: any = {};
        if (input.title !== undefined) updateData.title = input.title;
        if (input.subtitle !== undefined) updateData.subtitle = input.subtitle;
        if (input.content !== undefined) updateData.content = input.content;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        
        if (existing.length > 0) {
          await dbInstance.update(homepageSections)
            .set(updateData)
            .where(eq(homepageSections.sectionKey, input.sectionKey));
        } else {
          await dbInstance.insert(homepageSections).values({
            sectionKey: input.sectionKey,
            ...updateData,
          });
        }
        return { success: true };
      }),

    // Admin: Toggle featured status on a product
    toggleFeatured: adminProcedure
      .input(z.object({
        productId: z.number(),
        isFeatured: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        if (input.isFeatured) {
          // Get max featured order
          const maxOrder = await dbInstance.select({ max: sql<number>`MAX(featuredOrder)` })
            .from(products)
            .where(eq(products.isFeatured, true));
          const nextOrder = (maxOrder[0]?.max || 0) + 1;
          await dbInstance.update(products)
            .set({ isFeatured: true, featuredOrder: nextOrder })
            .where(eq(products.id, input.productId));
        } else {
          await dbInstance.update(products)
            .set({ isFeatured: false, featuredOrder: 0 })
            .where(eq(products.id, input.productId));
        }
        return { success: true };
      }),

    // Admin: Reorder featured products
    reorderFeatured: adminProcedure
      .input(z.object({
        productIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        for (let i = 0; i < input.productIds.length; i++) {
          await dbInstance.update(products)
            .set({ featuredOrder: i + 1 })
            .where(eq(products.id, input.productIds[i]));
        }
        return { success: true };
      }),

    // Admin: Get all products with featured status for the selector
    getAllProductsForFeatured: adminProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      return dbInstance.select({
        id: products.id,
        name: products.name,
        imageUrl: products.imageUrl,
        isFeatured: products.isFeatured,
        featuredOrder: products.featuredOrder,
        subcategoryName: subcategories.name,
        categoryName: categories.name,
        isActive: products.isActive,
      })
        .from(products)
        .innerJoin(subcategories, eq(products.subcategoryId, subcategories.id))
        .innerJoin(categories, eq(subcategories.categoryId, categories.id))
        .where(eq(products.isActive, true))
        .orderBy(asc(categories.displayOrder), asc(subcategories.displayOrder), asc(products.displayOrder));
    }),
  }),

  // ─── Offline Mode Settings ──────────────────────────────────────
  offline: router({
    /** Get offline mode settings (public — staff devices need this without admin auth) */
    getSettings: publicProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return { palladiumEnabled: false, tNagarEnabled: false };
      const { siteSettings } = await import('../drizzle/schema.js');
      const rows = await dbInstance.select().from(siteSettings)
        .where(sql`${siteSettings.key} IN ('offline_palladium_enabled', 'offline_tnagar_enabled')`);
      const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
      return {
        palladiumEnabled: map['offline_palladium_enabled'] === 'true',
        tNagarEnabled: map['offline_tnagar_enabled'] === 'true',
      };
    }),

    /** Admin: toggle offline mode per outlet */
    updateSettings: adminProcedure
      .input(z.object({
        palladiumEnabled: z.boolean(),
        tNagarEnabled: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { siteSettings } = await import('../drizzle/schema.js');

        const pairs = [
          { key: 'offline_palladium_enabled', value: String(input.palladiumEnabled) },
          { key: 'offline_tnagar_enabled', value: String(input.tNagarEnabled) },
        ];

        for (const { key, value } of pairs) {
          const existing = await dbInstance.select().from(siteSettings).where(eq(siteSettings.key, key));
          if (existing.length > 0) {
            await dbInstance.update(siteSettings).set({ value }).where(eq(siteSettings.key, key));
          } else {
            await dbInstance.insert(siteSettings).values({ key, value });
          }
        }
        return { success: true };
      }),
  }),

  // ─── Product Catalog Export/Import ──────────────────────────────────
  catalog: router({
    /** Export all products with descriptions as JSON (frontend converts to Excel) */
    exportProducts: adminProcedure.query(async () => {
      const dbInstance = await getDb();
      if (!dbInstance) return [];
      const { products, subcategories, categories } = await import('../drizzle/schema.js');
      const rows = await dbInstance.select({
        id: products.id,
        name: products.name,
        chineseName: products.chineseName,
        categoryName: categories.name,
        subcategoryName: subcategories.name,
        description: products.description,
        isActive: products.isActive,
        instorePrice: products.instorePrice,
        basePriceRegularWithBoba: subcategories.basePriceRegularWithBoba,
        basePriceLargeWithBoba: subcategories.basePriceLargeWithBoba,
      })
        .from(products)
        .innerJoin(subcategories, eq(products.subcategoryId, subcategories.id))
        .innerJoin(categories, eq(subcategories.categoryId, categories.id))
        .orderBy(asc(categories.displayOrder), asc(subcategories.displayOrder), asc(products.displayOrder));
      return rows;
    }),

    /** Bulk-update product descriptions from imported data */
    importDescriptions: adminProcedure
      .input(z.object({
        updates: z.array(z.object({
          id: z.number(),
          description: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { products } = await import('../drizzle/schema.js');

        let updated = 0;
        let skipped = 0;
        const errors: { id: number; error: string }[] = [];

        for (const { id, description } of input.updates) {
          try {
            const existing = await dbInstance.select({ id: products.id }).from(products).where(eq(products.id, id));
            if (existing.length === 0) {
              skipped++;
              errors.push({ id, error: 'Product not found' });
              continue;
            }
            await dbInstance.update(products).set({ description }).where(eq(products.id, id));
            updated++;
          } catch (err: any) {
            errors.push({ id, error: err.message || 'Unknown error' });
            skipped++;
          }
        }

        return { updated, skipped, total: input.updates.length, errors };
      }),
  }),
});

export type AppRouter = typeof appRouter;
