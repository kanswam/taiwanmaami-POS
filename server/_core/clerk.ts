import { getAuth } from "@clerk/express";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";

/**
 * Authenticate an Express request using Clerk's session token.
 * Returns the local database User or null if unauthenticated.
 *
 * Replaces sdk.authenticateRequest(req) from the Manus OAuth flow.
 * Clerk's clerkMiddleware() must be applied globally before this is called.
 */
export async function authenticateClerkRequest(
  req: Request
): Promise<User | null> {
  const { userId } = getAuth(req);

  if (!userId) return null;

  // userId is Clerk's user_xxx ID, stored in our openId column
  const user = await db.getUserByOpenId(userId);

  return user ?? null;
}
