import { getAuth } from "@clerk/express";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";

/**
 * Authenticate an Express request using Clerk's session token.
 * Returns the local database User or null if unauthenticated.
 *
 * Replaces sdk.authenticateRequest(req) from the Manus OAuth flow.
 * When Clerk is not configured (no CLERK_SECRET_KEY), returns null
 * gracefully so the app still works without authentication.
 */
export async function authenticateClerkRequest(
  req: Request
): Promise<User | null> {
  // If Clerk is not configured, skip authentication entirely
  if (!process.env.CLERK_SECRET_KEY) return null;

  try {
    const { userId } = getAuth(req);

    if (!userId) return null;

    // userId is Clerk's user_xxx ID, stored in our openId column
    const user = await db.getUserByOpenId(userId);

    return user ?? null;
  } catch (error) {
    // getAuth() throws if clerkMiddleware() wasn't applied or keys are invalid
    console.warn("[Clerk] authenticateClerkRequest failed:", (error as Error).message);
    return null;
  }
}
