import { COOKIE_NAME, THIRTY_DAYS_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { isEmployeeEmail } from "../employeeMaster";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Wraps isEmployeeEmail with a timeout so it never blocks OAuth login.
 * If the Employee Master API is slow or down, login still succeeds.
 */
async function safeIsEmployeeEmail(email: string): Promise<boolean> {
  try {
    const result = await Promise.race([
      isEmployeeEmail(email),
      new Promise<boolean>((resolve) => setTimeout(() => {
        console.warn("[OAuth] Employee check timed out after 5s, skipping");
        resolve(false);
      }, 5000)),
    ]);
    return result;
  } catch (error) {
    console.error("[OAuth] Employee check failed, skipping:", error);
    return false;
  }
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      console.log("[OAuth] Starting token exchange...");
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      console.log("[OAuth] Token exchange successful, fetching user info...");
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      console.log("[OAuth] User info received:", userInfo.openId, userInfo.email);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Check if user email is in Employee Master for auto staff role
      // This is non-critical — if it fails or times out, login still works
      let role: 'admin' | 'staff' | 'user' | undefined = undefined;
      if (userInfo.email) {
        const isEmployee = await safeIsEmployeeEmail(userInfo.email);
        if (isEmployee) {
          role = 'staff';
          console.log(`[OAuth] Auto-granting staff role to employee: ${userInfo.email}`);
        }
      }

      console.log("[OAuth] Upserting user...");
      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
        role: role,
      });
      console.log("[OAuth] User upserted, creating session token...");

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: THIRTY_DAYS_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: THIRTY_DAYS_MS });

      console.log("[OAuth] Login complete, redirecting to /");
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed at step:", error);
      // Provide more detail in the error response for debugging
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "OAuth callback failed", detail: message });
    }
  });
}
