/**
 * Input Validation for /api/service/* endpoints
 * 
 * Uses Zod schemas to validate all query parameters and request bodies.
 * Returns 400 with detailed error messages on validation failure.
 */

import { Request, Response, NextFunction } from "express";
import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

// ISO 8601 date string validator
const isoDateString = z.string().refine(
  (val) => !isNaN(new Date(val).getTime()),
  { message: "Must be a valid ISO 8601 date string" }
);

// Positive integer string (for IDs, limits, offsets)
const positiveIntString = z.string().regex(/^\d+$/, "Must be a positive integer");

// Comma-separated values (for filter lists)
const commaSeparated = z.string().regex(/^[a-zA-Z0-9_,]+$/, "Must be comma-separated alphanumeric values");

// ── Endpoint Schemas ─────────────────────────────────────────────────────────

export const ordersQuerySchema = z.object({
  from: isoDateString.optional(),
  to: isoDateString.optional(),
  outletId: positiveIntString.optional(),
  orderType: z.string().regex(/^(instore|delivery|pickup)(,(instore|delivery|pickup))*$/, 
    "Must be comma-separated: instore, delivery, pickup").optional(),
  status: z.string().regex(/^[a-z_]+(,[a-z_]+)*$/, 
    "Must be comma-separated lowercase status values").optional(),
  paymentMethod: z.string().regex(/^[a-z_]+(,[a-z_]+)*$/, 
    "Must be comma-separated lowercase payment methods").optional(),
  limit: z.string().regex(/^\d+$/).refine(v => parseInt(v) >= 1 && parseInt(v) <= 500, 
    "Must be between 1 and 500").optional(),
  offset: z.string().regex(/^\d+$/).refine(v => parseInt(v) >= 0, 
    "Must be >= 0").optional(),
  include: z.string().regex(/^(items|addons)(,(items|addons))*$/, 
    "Must be comma-separated: items, addons").optional(),
}).strict();

export const employeesQuerySchema = z.object({
  status: z.enum(["active", "inactive"]).optional(),
  limit: z.string().regex(/^\d+$/).refine(v => parseInt(v) >= 1 && parseInt(v) <= 200, 
    "Must be between 1 and 200").optional(),
  offset: z.string().regex(/^\d+$/).refine(v => parseInt(v) >= 0, 
    "Must be >= 0").optional(),
  outlet: z.string().max(100, "Outlet filter too long").optional(),
}).strict();

export const menuProductsQuerySchema = z.object({
  outletId: z.enum(["1", "2"]).optional(),
  available: z.enum(["true", "false"]).optional(),
  categoryId: positiveIntString.optional(),
  limit: z.string().regex(/^\d+$/).refine(v => parseInt(v) >= 1 && parseInt(v) <= 500, 
    "Must be between 1 and 500").optional(),
  offset: z.string().regex(/^\d+$/).refine(v => parseInt(v) >= 0, 
    "Must be >= 0").optional(),
}).strict();

export const menuToggleBodySchema = z.object({
  productId: z.number().int().positive("productId must be a positive integer"),
  available: z.boolean(),
}).strict();

export const etlRunBodySchema = z.object({
  date: isoDateString.optional(),
  outlets: z.array(z.enum(["palladium", "tnagar"])).optional(),
  force: z.boolean().optional(),
}).strict().optional();

export const etlStatusQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).refine(v => parseInt(v) >= 1 && parseInt(v) <= 50, 
    "Must be between 1 and 50").optional(),
}).strict();

// ── Validation Middleware Factory ────────────────────────────────────────────

type ValidationTarget = "query" | "body";

/**
 * Creates an Express middleware that validates the specified target (query or body)
 * against the given Zod schema.
 */
export function validate(schema: z.ZodSchema, target: ValidationTarget = "query") {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = target === "query" ? req.query : req.body;
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }));

      console.log(`[InputValidation] Rejected | path=${req.path} | errors=${JSON.stringify(errors)}`);

      return res.status(400).json({
        error: "validation_error",
        message: "Request validation failed. Check the errors array for details.",
        errors,
      });
    }

    next();
  };
}

// ── Pre-built Validation Middlewares ─────────────────────────────────────────

export const validateOrdersQuery = validate(ordersQuerySchema, "query");
export const validateEmployeesQuery = validate(employeesQuerySchema, "query");
export const validateMenuProductsQuery = validate(menuProductsQuerySchema, "query");
export const validateMenuToggleBody = validate(menuToggleBodySchema, "body");
export const validateEtlRunBody = validate(etlRunBodySchema, "body");
export const validateEtlStatusQuery = validate(etlStatusQuerySchema, "query");
