import { verifyWebhook } from "@clerk/express/webhooks";
import type { Express, Request, Response } from "express";
import express from "express";
import * as db from "../db";
import { isEmployeeEmail } from "../employeeMaster";

/** Admin emails — set role to 'admin' on login */
const ADMIN_EMAILS = [
  "kannan.swamy@taiwanmaami.com",
  "theresa.hu.cy@taiwanmaami.com",
];

/**
 * Safely check Employee Master API with timeout.
 * If the API is slow or down, login still succeeds (defaults to customer).
 */
async function safeIsEmployeeEmail(email: string): Promise<boolean> {
  try {
    return await Promise.race([
      isEmployeeEmail(email),
      new Promise<boolean>((resolve) =>
        setTimeout(() => {
          console.warn("[ClerkWebhook] Employee check timed out after 5s");
          resolve(false);
        }, 5000)
      ),
    ]);
  } catch (error) {
    console.error("[ClerkWebhook] Employee check failed:", error);
    return false;
  }
}

/**
 * Determine user role based on email.
 * Priority: admin (email match) > staff (Employee Master) > customer (default)
 */
async function determineRole(
  email: string | null
): Promise<"admin" | "staff" | "customer"> {
  if (!email) return "customer";
  const normalizedEmail = email.toLowerCase().trim();

  // Admin check — exact email match
  if (ADMIN_EMAILS.includes(normalizedEmail)) return "admin";

  // Staff check — Employee Master API
  const isStaff = await safeIsEmployeeEmail(normalizedEmail);
  if (isStaff) return "staff";

  return "customer";
}

/**
 * Register the Clerk webhook endpoint.
 * MUST be called BEFORE express.json() middleware for this route,
 * because verifyWebhook needs the raw body.
 */
export function registerClerkWebhookRoute(app: Express) {
  app.post(
    "/api/clerk-webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      try {
        const evt = await verifyWebhook(req);

        if (evt.type === "user.created" || evt.type === "user.updated") {
          const clerkUserId = evt.data.id; // "user_xxx"
          const primaryEmail =
            evt.data.email_addresses?.find(
              (e: any) => e.id === evt.data.primary_email_address_id
            )?.email_address ??
            evt.data.email_addresses?.[0]?.email_address ??
            null;

          const firstName = evt.data.first_name ?? "";
          const lastName = evt.data.last_name ?? "";
          const fullName =
            [firstName, lastName].filter(Boolean).join(" ") || null;

          console.log(
            `[ClerkWebhook] ${evt.type}: ${clerkUserId} / ${primaryEmail}`
          );

          // Determine role
          const role = await determineRole(primaryEmail);

          // --- Lazy migration for existing users ---
          // If a user with this email already exists but has a different openId
          // (i.e., they were created via Manus OAuth), update their openId to the
          // Clerk user ID so all their data (orders, stamps, credit) is preserved.
          if (primaryEmail) {
            const existingByEmail = await db.getUserByEmail(primaryEmail);
            if (existingByEmail && existingByEmail.openId !== clerkUserId) {
              console.log(
                `[ClerkWebhook] Migrating user ${existingByEmail.openId} → ${clerkUserId} (email: ${primaryEmail})`
              );
              await db.migrateUserOpenId(
                existingByEmail.openId,
                clerkUserId
              );
              // After migration, update role + name + lastSignedIn
              await db.upsertUser({
                openId: clerkUserId,
                name: fullName ?? existingByEmail.name,
                email: primaryEmail,
                loginMethod: "clerk",
                lastSignedIn: new Date(),
                role: role !== "customer" ? role : undefined, // Don't downgrade existing role
              });
              return res.json({ success: true, migrated: true });
            }
          }

          // --- New user or returning Clerk user ---
          await db.upsertUser({
            openId: clerkUserId,
            name: fullName,
            email: primaryEmail,
            loginMethod: "clerk",
            lastSignedIn: new Date(),
            role: role !== "customer" ? role : undefined,
          });

          return res.json({ success: true });
        }

        // Other event types — acknowledge but ignore
        return res.json({ received: true });
      } catch (err: any) {
        console.error("[ClerkWebhook] Verification failed:", err.message);
        return res.status(400).json({ error: "Webhook verification failed" });
      }
    }
  );
}
