/**
 * MaamiTech Service-to-Service Authentication Middleware
 * 
 * This module provides a static API key middleware for machine-to-machine
 * communication. It is gated behind the MAAMITECH_API_ENABLED feature flag
 * and validates requests using the MAAMITECH_SERVICE_TOKEN bearer token.
 * 
 * Usage:
 *   All /api/service/* routes pass through this middleware.
 *   Requests must include: Authorization: Bearer <MAAMITECH_SERVICE_TOKEN>
 * 
 * Security:
 *   - Feature flag must be enabled (MAAMITECH_API_ENABLED=true)
 *   - Token must match exactly (constant-time comparison)
 *   - All requests are logged with timestamp and path
 */

import { Request, Response, NextFunction } from "express";
import { ENV } from "./_core/env";
import crypto from "crypto";
import { eq, and, gte, lte, inArray, sql, desc } from "drizzle-orm";
import { orders, orderItems, orderItemAddons, products, subcategories, categories } from "../drizzle/schema";

// Constant-time string comparison to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to maintain constant time behavior
    const dummy = Buffer.alloc(a.length, 0);
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

/**
 * Express middleware that validates the MaamiTech service token.
 * 
 * Checks:
 * 1. Feature flag is enabled
 * 2. Authorization header is present with Bearer scheme
 * 3. Token matches MAAMITECH_SERVICE_TOKEN (constant-time comparison)
 */
export function serviceAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check feature flag first
  if (!ENV.maamitechApiEnabled) {
    console.log(`[ServiceAuth] Rejected: API disabled | path=${req.path} | ip=${req.ip}`);
    return res.status(503).json({
      error: "service_unavailable",
      message: "MaamiTech API is not enabled on this instance.",
    });
  }

  // Check token is configured
  if (!ENV.maamitechServiceToken) {
    console.error(`[ServiceAuth] CRITICAL: MAAMITECH_SERVICE_TOKEN not configured`);
    return res.status(503).json({
      error: "service_misconfigured",
      message: "Service token not configured. Contact administrator.",
    });
  }

  // Extract bearer token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log(`[ServiceAuth] Rejected: Missing/invalid auth header | path=${req.path} | ip=${req.ip}`);
    return res.status(401).json({
      error: "unauthorized",
      message: "Missing or invalid Authorization header. Expected: Bearer <token>",
    });
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  // Constant-time token comparison
  if (!secureCompare(token, ENV.maamitechServiceToken)) {
    console.log(`[ServiceAuth] Rejected: Invalid token | path=${req.path} | ip=${req.ip}`);
    return res.status(403).json({
      error: "forbidden",
      message: "Invalid service token.",
    });
  }

  // Token valid — log and proceed
  console.log(`[ServiceAuth] Authenticated | path=${req.path} | method=${req.method} | ip=${req.ip}`);
  next();
}

/**
 * Health check handler for /api/service/health
 * Returns system status without exposing sensitive data.
 */
export async function handleServiceHealth(req: Request, res: Response) {
  const { getDb } = await import("./db");
  
  let dbStatus = "unknown";
  try {
    const dbInstance = await getDb();
    if (dbInstance) {
      dbStatus = "connected";
    } else {
      dbStatus = "unavailable";
    }
  } catch {
    dbStatus = "error";
  }

  return res.json({
    status: "ok",
    service: "taiwan-maami-pos",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    checks: {
      database: dbStatus,
      featureFlag: "enabled",
    },
  });
}

/**
 * Employee Master proxy handler.
 * Forwards authenticated requests to the Employee Master API.
 * 
 * The Employee Master API uses /api/v1/ prefix and X-API-Key header.
 * 
 * Supported sub-paths (mapped from /api/service/employee-master/*):
 *   GET /employees — List all active employees
 *   GET /employees/:id — Get specific employee by ID
 *   GET /employees/by-mobile/:mobile — Look up employee by phone
 */
/**
 * Orders list handler for /api/service/orders
 * Returns filtered, paginated orders with nested items and addons.
 * 
 * Query parameters:
 *   from       — ISO 8601 start date (inclusive), e.g. 2026-04-01T00:00:00.000Z
 *   to         — ISO 8601 end date (inclusive), e.g. 2026-04-30T23:59:59.999Z
 *   outletId   — Filter by outlet ID (integer)
 *   orderType  — Filter by type: instore, delivery, pickup (comma-separated for multiple)
 *   status     — Filter by order status (comma-separated)
 *   paymentMethod — Filter by payment method (comma-separated)
 *   limit      — Max records to return (default 50, max 500)
 *   offset     — Skip N records (default 0)
 *   include    — Comma-separated: items, addons (default: items,addons)
 * 
 * All monetary amounts are returned in rupees (divided by 100 from paise).
 * Test orders (isTestData=true) are always excluded.
 */
export async function handleOrdersList(req: Request, res: Response) {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) {
    return res.status(503).json({ error: "database_unavailable", message: "Database connection not available." });
  }

  try {
    // Parse query parameters
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const includeParam = (req.query.include as string) || "items,addons";
    const includeItems = includeParam.includes("items");
    const includeAddons = includeParam.includes("addons");

    // Build WHERE conditions
    const conditions: any[] = [eq(orders.isTestData, false)];

    // Date range filter
    if (req.query.from) {
      const fromDate = new Date(req.query.from as string);
      if (!isNaN(fromDate.getTime())) {
        conditions.push(gte(orders.createdAt, fromDate));
      }
    }
    if (req.query.to) {
      const toDate = new Date(req.query.to as string);
      if (!isNaN(toDate.getTime())) {
        conditions.push(lte(orders.createdAt, toDate));
      }
    }

    // Outlet filter
    if (req.query.outletId) {
      const outletId = parseInt(req.query.outletId as string);
      if (!isNaN(outletId)) {
        conditions.push(eq(orders.outletId, outletId));
      }
    }

    // Order type filter (comma-separated)
    if (req.query.orderType) {
      const types = (req.query.orderType as string).split(",").map(t => t.trim()).filter(Boolean);
      if (types.length === 1) {
        conditions.push(eq(orders.orderType, types[0] as any));
      } else if (types.length > 1) {
        conditions.push(inArray(orders.orderType, types as any[]));
      }
    }

    // Order status filter (comma-separated)
    if (req.query.status) {
      const statuses = (req.query.status as string).split(",").map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        conditions.push(eq(orders.orderStatus, statuses[0] as any));
      } else if (statuses.length > 1) {
        conditions.push(inArray(orders.orderStatus, statuses as any[]));
      }
    }

    // Payment method filter (comma-separated)
    if (req.query.paymentMethod) {
      const methods = (req.query.paymentMethod as string).split(",").map(m => m.trim()).filter(Boolean);
      if (methods.length === 1) {
        conditions.push(eq(orders.paymentMethod, methods[0] as any));
      } else if (methods.length > 1) {
        conditions.push(inArray(orders.paymentMethod, methods as any[]));
      }
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(whereClause);
    const totalCount = Number(countResult[0]?.count ?? 0);

    // Get orders
    const orderRows = await db.select().from(orders).where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    // Convert paise to rupees helper
    const toRupees = (paise: number | null | undefined): number | null => {
      if (paise === null || paise === undefined) return null;
      return paise / 100;
    };

    // Build response with nested items
    const ordersWithItems = await Promise.all(orderRows.map(async (order) => {
      const result: any = {
        id: order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        // Customer info
        customerId: order.userId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        // Outlet & staff
        outletId: order.outletId,
        staffId: order.staffId,
        tableNumber: order.tableNumber,
        // Amounts in rupees
        subtotal: toRupees(order.subtotal),
        stateGst: toRupees(order.stateGst),
        centralGst: toRupees(order.centralGst),
        deliveryCharge: toRupees(order.deliveryCharge),
        discountAmount: toRupees(order.discountAmount),
        manualDiscountAmount: toRupees(order.manualDiscountAmount),
        totalAmount: toRupees(order.totalAmount),
        refundAmount: toRupees(order.refundAmount),
        partnerBenefitAmount: toRupees(order.partnerBenefitAmount),
        // Discount & loyalty
        discountCode: order.discountCode,
        loyaltyPointsUsed: order.loyaltyPointsUsed,
        manualDiscountType: order.manualDiscountType,
        manualDiscountPercent: order.manualDiscountPercent,
        manualDiscountReason: order.manualDiscountReason,
        // Delivery
        deliveryAddress: order.deliveryAddress,
        porterOrderId: order.porterOrderId,
        // Payment tracking
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: order.razorpayPaymentId,
        paymentCollectedBy: order.paymentCollectedBy,
        paymentCollectedAt: order.paymentCollectedAt,
        // Refund
        refundMethod: order.refundMethod,
        refundReason: order.refundReason,
        refundProcessedAt: order.refundProcessedAt,
        // Notes
        specialInstructions: order.specialInstructions,
        staffNotes: order.staffNotes,
        // Timestamps
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        completedAt: order.completedAt,
      };

      // Fetch items if requested
      if (includeItems) {
        const items = await db.select().from(orderItems)
          .where(and(
            eq(orderItems.orderId, order.id),
            eq(orderItems.isTestData, false)
          ));

        result.items = await Promise.all(items.map(async (item) => {
          const itemResult: any = {
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            size: item.size,
            withBoba: item.withBoba,
            bobaType: item.bobaType,
            sugarLevel: item.sugarLevel,
            iceLevel: item.iceLevel,
            quantity: item.quantity,
            unitPrice: toRupees(item.unitPrice),
            addonsTotal: toRupees(item.addonsTotal),
            lineTotal: toRupees(item.lineTotal),
            status: item.status,
            specialInstructions: item.specialInstructions,
          };

          // Fetch addons if requested
          if (includeAddons) {
            const addons = await db.select().from(orderItemAddons)
              .where(eq(orderItemAddons.orderItemId, item.id));
            itemResult.addons = addons.map(addon => ({
              id: addon.id,
              addonName: addon.addonName,
              addonPrice: toRupees(addon.addonPrice),
            }));
          }

          return itemResult;
        }));
      }

      return result;
    }));

    return res.json({
      success: true,
      data: ordersWithItems,
      meta: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
        filters: {
          from: req.query.from || null,
          to: req.query.to || null,
          outletId: req.query.outletId || null,
          orderType: req.query.orderType || null,
          status: req.query.status || null,
          paymentMethod: req.query.paymentMethod || null,
        },
      },
    });
  } catch (error: any) {
    console.error(`[ServiceAuth:Orders] Error:`, error.message);
    return res.status(500).json({
      error: "internal_error",
      message: "Failed to fetch orders.",
      detail: error.message,
    });
  }
}

/**
 * Employees list handler for /api/service/employees
 * Wraps the Employee Master proxy with a standardized response format.
 * 
 * Query parameters:
 *   status  — Filter by status: active, inactive (default: active)
 *   limit   — Max records (default 50)
 *   offset  — Skip N records (default 0)
 *   outlet  — Filter by primary outlet name (partial match)
 */
export async function handleEmployeesList(req: Request, res: Response) {
  if (!ENV.empMasterApiUrl || !ENV.empMasterApiKey) {
    return res.status(503).json({
      error: "service_misconfigured",
      message: "Employee Master API credentials not configured.",
    });
  }

  try {
    const status = (req.query.status as string) || "active";
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const outlet = req.query.outlet as string;

    // Build query params for Employee Master API
    const params = new URLSearchParams();
    params.set("status", status);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    const targetUrl = `${ENV.empMasterApiUrl}/api/v1/employees?${params.toString()}`;
    console.log(`[ServiceAuth:Employees] Fetching ${targetUrl}`);

    const response = await fetch(targetUrl, {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": ENV.empMasterApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: "upstream_error",
        message: `Employee Master returned ${response.status}`,
        detail: errorText.substring(0, 200),
      });
    }

    const upstream = await response.json();
    let employees = upstream.data || [];

    // Client-side outlet filter (Employee Master may not support this filter)
    if (outlet) {
      const outletLower = outlet.toLowerCase();
      employees = employees.filter((emp: any) =>
        emp.primaryOutlet && emp.primaryOutlet.toLowerCase().includes(outletLower)
      );
    }

    // Strip sensitive fields for agent consumption
    const sanitized = employees.map((emp: any) => ({
      id: emp.id,
      employeeCode: emp.employeeCode,
      name: emp.name?.trim(),
      email: emp.email,
      phone: emp.phone,
      primaryOutlet: emp.primaryOutlet,
      department: emp.department,
      role: emp.role,
      employmentType: emp.employmentType,
      status: emp.status,
      employmentStartDate: emp.employmentStartDate,
      employmentEndDate: emp.employmentEndDate,
      probationEndDate: emp.probationEndDate,
      confirmationDate: emp.confirmationDate,
      baseSalary: emp.baseSalary,
      hraAllowance: emp.hraAllowance,
      transportAllowance: emp.transportAllowance,
      foodAllowance: emp.foodAllowance,
      otherAllowances: emp.otherAllowances,
    }));

    return res.json({
      success: true,
      data: sanitized,
      meta: {
        total: upstream.meta?.count ?? sanitized.length,
        limit,
        offset,
        hasMore: (upstream.meta?.count ?? 0) > offset + limit,
        filters: {
          status,
          outlet: outlet || null,
        },
      },
    });
  } catch (error: any) {
    console.error(`[ServiceAuth:Employees] Error:`, error.message);
    return res.status(502).json({
      error: "proxy_error",
      message: "Failed to reach Employee Master API.",
      detail: error.message,
    });
  }
}

/**
 * Menu products list handler for /api/service/menu/products
 * Returns all products with their availability status.
 * 
 * Query parameters:
 *   outletId    — Filter by outlet: 1 (Palladium), 2 (T.Nagar)
 *   available   — Filter: true (in-stock only), false (out-of-stock only), omit for all
 *   categoryId  — Filter by category ID
 *   limit       — Max records (default 100, max 500)
 *   offset      — Skip N records (default 0)
 */
export async function handleMenuProducts(req: Request, res: Response) {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) {
    return res.status(503).json({ error: "database_unavailable", message: "Database connection not available." });
  }

  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const conditions: any[] = [eq(products.isActive, true)];

    if (req.query.available === "true") {
      conditions.push(eq(products.isAvailable, true));
    } else if (req.query.available === "false") {
      conditions.push(eq(products.isAvailable, false));
    }

    if (req.query.categoryId) {
      const catId = parseInt(req.query.categoryId as string);
      if (!isNaN(catId)) {
        // Get subcategories for this category, then filter products
        const subs = await db.select({ id: subcategories.id }).from(subcategories).where(eq(subcategories.categoryId, catId));
        const subIds = subs.map(s => s.id);
        if (subIds.length > 0) {
          conditions.push(inArray(products.subcategoryId, subIds));
        } else {
          // No subcategories = no products
          return res.json({ success: true, data: [], meta: { total: 0, limit, offset, hasMore: false } });
        }
      }
    }

    const whereClause = and(...conditions);

    const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(products).where(whereClause);
    const totalCount = Number(countResult[0]?.count ?? 0);

    const productRows = await db.select().from(products).where(whereClause)
      .orderBy(products.displayOrder)
      .limit(limit)
      .offset(offset);

    const toRupees = (paise: number | null | undefined): number | null => {
      if (paise === null || paise === undefined) return null;
      return paise / 100;
    };

    const data = productRows.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      subcategoryId: p.subcategoryId,
      // Availability
      isAvailable: p.isAvailable,
      isInStock: p.isInStock,
      isActive: p.isActive,
      availableInstore: p.availableInstore,
      availableDelivery: p.availableDelivery,
      availableAtPalladium: p.availableAtPalladium,
      availableAtTnagar: p.availableAtTnagar,
      // Pricing in rupees
      instorePrice: toRupees(p.instorePrice),
      deliveryPrice: toRupees(p.deliveryPrice),
      // Dietary
      isVegetarian: p.isVegetarian,
      isVegan: p.isVegan,
      containsEgg: p.containsEgg,
      isNonVeg: p.isNonVeg,
    }));

    return res.json({
      success: true,
      data,
      meta: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
        filters: {
          available: req.query.available || null,
          categoryId: req.query.categoryId || null,
        },
      },
    });
  } catch (error: any) {
    console.error(`[ServiceAuth:Menu] Error:`, error.message);
    return res.status(500).json({ error: "internal_error", message: "Failed to fetch menu products.", detail: error.message });
  }
}

/**
 * Menu toggle availability handler for POST /api/service/menu/toggle-availability
 * Toggles a product's real-time availability (isAvailable + isInStock).
 * 
 * Request body:
 *   productId  — The product ID to toggle
 *   available  — Boolean: true = mark available, false = mark unavailable
 */
export async function handleMenuToggleAvailability(req: Request, res: Response) {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) {
    return res.status(503).json({ error: "database_unavailable", message: "Database connection not available." });
  }

  try {
    const { productId, available } = req.body;

    if (typeof productId !== "number" || typeof available !== "boolean") {
      return res.status(400).json({
        error: "invalid_input",
        message: "Request body must include productId (number) and available (boolean).",
      });
    }

    // Verify product exists
    const existing = await db.select({ id: products.id, name: products.name, isAvailable: products.isAvailable })
      .from(products)
      .where(eq(products.id, productId));

    if (existing.length === 0) {
      return res.status(404).json({
        error: "not_found",
        message: `Product with ID ${productId} not found.`,
      });
    }

    // Update both isAvailable AND isInStock (same logic as the staff toggle)
    await db.update(products).set({ isAvailable: available, isInStock: available }).where(eq(products.id, productId));

    console.log(`[ServiceAuth:Menu] Agent toggled product ${productId} (${existing[0].name}) availability: ${existing[0].isAvailable} → ${available}`);

    return res.json({
      success: true,
      data: {
        productId,
        productName: existing[0].name,
        previousAvailability: existing[0].isAvailable,
        currentAvailability: available,
      },
    });
  } catch (error: any) {
    console.error(`[ServiceAuth:MenuToggle] Error:`, error.message);
    return res.status(500).json({ error: "internal_error", message: "Failed to toggle product availability.", detail: error.message });
  }
}

export async function handleEmployeeMasterProxy(req: Request, res: Response) {
  if (!ENV.empMasterApiUrl || !ENV.empMasterApiKey) {
    return res.status(503).json({
      error: "service_misconfigured",
      message: "Employee Master API credentials not configured.",
    });
  }

  // Build the target URL: strip /api/service/employee-master prefix, prepend /api/v1
  const subPath = req.path.replace(/^\/api\/service\/employee-master/, "") || "/";
  const targetUrl = `${ENV.empMasterApiUrl}/api/v1${subPath}`;

  // Forward query parameters
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
  const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

  console.log(`[ServiceAuth:EmpMaster] Proxying ${req.method} ${fullUrl}`);

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": ENV.empMasterApiKey,
      },
    };

    // Forward body for POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(fullUrl, fetchOptions);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error(`[ServiceAuth:EmpMaster] Proxy error:`, error.message);
    return res.status(502).json({
      error: "proxy_error",
      message: "Failed to reach Employee Master API.",
      detail: error.message,
    });
  }
}
