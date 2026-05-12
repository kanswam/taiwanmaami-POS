# Phase B Step 3 — Clerk Integration Plan

**Date:** 12 May 2026  
**Status:** DRAFT — Awaiting approval before implementation  
**Target:** DigitalOcean App Platform at thamaraifoods.com (parallel stack; taiwanmaami.com untouched)

---

## 1. Executive Summary

This plan migrates Taiwan Maami's authentication from Manus OAuth to **Clerk** (`@clerk/express` + `@clerk/clerk-react`), removes all Manus platform dependencies (Forge API, CDN, runtime plugin, LLM chatbot), and replaces them with direct alternatives (Cloudinary, Twilio WhatsApp, Google Maps API key). The goal is a self-contained app deployable on DigitalOcean App Platform with zero Manus runtime dependencies.

**Key constraint:** All 493 existing users (matched by email) will seamlessly transition on first Clerk login — no action required from customers.

---

## 2. New Packages to Install

| Package | Purpose |
|---------|---------|
| `@clerk/express` | Backend middleware — verifies Clerk session tokens, exposes `getAuth(req)` |
| `@clerk/clerk-react` | Frontend provider + hooks (`useUser`, `useAuth`, `SignIn`, `SignUp`, `UserButton`) |
| `svix` | Webhook signature verification for Clerk webhook events |

**Packages to REMOVE from package.json:**
- `vite-plugin-manus-runtime`
- `@builder.io/vite-plugin-jsx-loc` (Manus-specific, not needed in production)

---

## 3. New Files to Create

### 3.1 `server/_core/clerk.ts` — Clerk Middleware Setup

**Purpose:** Initialize Clerk Express middleware, export helpers.

**Contents:**
- Import `clerkMiddleware`, `getAuth`, `requireAuth` from `@clerk/express`
- Export `clerkMiddleware()` for use in Express app
- Export helper `getClerkUserId(req)` that calls `getAuth(req)` and returns `userId`
- Export `requireClerkAuth` middleware for protected routes (non-tRPC endpoints like webhooks)

### 3.2 `server/_core/clerkWebhook.ts` — Webhook Handler

**Purpose:** Handle Clerk `user.created` and `user.updated` events to sync users into our MySQL database.

**Logic:**
1. Verify webhook signature using `svix` library + `CLERK_WEBHOOK_SECRET`
2. On `user.created`:
   - Extract email from `data.email_addresses[0].email_address`
   - Check if email exists in `users` table
   - **If exists:** `UPDATE users SET openId = clerkUserId WHERE email = ?` (link existing account)
   - **If not exists:** `INSERT` new user with Clerk userId as `openId`, name from Clerk profile
   - Check if email is admin (`kannanswamy@hotmail.com` or `theresa.hu.cy@taiwanmaami.com`) → set role = 'admin'
   - Check Employee Master API → if staff, set role = 'staff'
3. On `user.updated`:
   - Sync name/email changes from Clerk to our `users` table

### 3.3 `server/cloudinaryStorage.ts` — Cloudinary-Only Storage (replaces `server/storage.ts`)

**Purpose:** Replace Manus Forge S3 with Cloudinary for all file uploads (images, PDFs, backups).

**Exports:**
- `storagePut(relKey, buffer, mimeType)` → uploads to Cloudinary, returns `{ key, url }`
- `storageGet(relKey)` → returns Cloudinary URL (for backups stored as raw files)

**Note:** This maintains the same API signature as the current `storage.ts` so all 8+ call sites (`backup.ts`, `routers.ts`, `workshopInvoice.ts`, `hybridStorage.ts`, etc.) continue working with zero changes.

---

## 4. Files to Modify

### 4.1 `server/_core/index.ts` — Express App Setup

**Changes:**
- Add `clerkMiddleware()` to Express app (before tRPC handler)
- Register webhook route: `app.post('/api/clerk-webhook', clerkWebhookHandler)`
- Remove `/api/oauth/callback` route (currently in `oauth.ts`)
- Keep `/api/service/digest` endpoint (uses Bearer token auth, not OAuth)
- Keep `/api/service/etl` endpoint (same)

### 4.2 `server/_core/context.ts` — tRPC Context Builder

**Current:** Calls `sdk.authenticateRequest(req)` → returns Manus user info → queries DB by openId.

**New:**
- Call `getAuth(req)` from `@clerk/express` → get `userId` (Clerk ID)
- If `userId` exists: query `users` table by `openId = userId` (since we store Clerk userId in the openId column)
- Return `ctx.user` with same shape as today (id, name, email, role, phone, outletId, isManager)
- If no userId (unauthenticated): `ctx.user = null` (same as today)

### 4.3 `server/_core/env.ts` — Environment Variables

**REMOVE these vars:**
- `VITE_APP_ID` — Manus OAuth app ID
- `OAUTH_SERVER_URL` — Manus OAuth backend
- `VITE_OAUTH_PORTAL_URL` — Manus login portal
- `OWNER_OPEN_ID` — Manus owner identifier (admin detection moves to email-based)
- `BUILT_IN_FORGE_API_URL` — Manus Forge proxy
- `BUILT_IN_FORGE_API_KEY` — Manus Forge token
- `VITE_FRONTEND_FORGE_API_KEY` — Frontend Forge token
- `VITE_FRONTEND_FORGE_API_URL` — Frontend Forge URL
- `VITE_ANALYTICS_ENDPOINT` — Manus analytics
- `VITE_ANALYTICS_WEBSITE_ID` — Manus analytics

**ADD these vars:**
- `CLERK_SECRET_KEY` — Clerk backend secret (sk_live_...)
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk frontend key (pk_live_...)
- `CLERK_WEBHOOK_SECRET` — Webhook signature verification (whsec_...)
- `GOOGLE_MAPS_API_KEY` — Direct Google Maps API key (for deliveryCharge.ts)

**KEEP unchanged:**
- `CUSTOM_DATABASE_URL` / `DATABASE_URL`
- `JWT_SECRET` (may still use for service tokens)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (and test variants)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_WHATSAPP_TO`
- `EMP_MASTER_API_KEY`, `EMP_MASTER_API_URL`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `MAAMITECH_SERVICE_TOKEN`
- `PETPOOJA_UPLOAD_PIN`
- `KOT_PRINT_SECRET`, `VITE_KOT_PRINT_SECRET`

### 4.4 `server/db.ts` — Database Helpers

**Changes:**
- Rename `getUserByOpenId(openId)` → `getUserByClerkId(clerkId)` (same logic, just rename for clarity)
- Update `upsertUser()`:
  - Currently uses Manus openId as identifier
  - Change to accept Clerk userId + email + name
  - Admin detection: check if email is in admin list (not OWNER_OPEN_ID comparison)
  - Staff detection: call Employee Master API (already exists, just wire differently)
- Add `getUserByEmail(email)` helper (for webhook user-linking)

### 4.5 `server/routers.ts` — tRPC Procedures

**Changes:**
- `auth.me` procedure: currently returns `ctx.user` (already works since context.ts provides it)
  - Minor: remove any OWNER_OPEN_ID comparison for admin detection
  - Admin check already uses `ctx.user.role === 'admin'` — no change needed
- `auth.logout` procedure: Clerk handles logout client-side; keep this as a no-op or remove
- Remove `import { notifyOwner }` → replace with `import { sendWhatsApp }` where needed (see 4.8)
- Remove `invokeLLM` import from partnerRouter (unused — only imported, never called)

### 4.6 `server/_core/notification.ts` — Owner Notifications

**Current:** Calls Manus Forge notification API.

**New:** Replace with Twilio WhatsApp (reuse existing `server/whatsapp.ts`).

```
export async function notifyOwner({ title, content }) {
  const { sendWhatsApp } = await import('../whatsapp');
  const body = `*${title}*\n\n${content}`;
  const result = await sendWhatsApp({ body });
  return result.success;
}
```

This means all 20+ `notifyOwner()` call sites across `routers.ts`, `backup.ts`, `partnerRouter.ts` continue working with zero changes — only the internal implementation changes.

### 4.7 `server/_core/map.ts` — Google Maps

**Current:** Routes through Manus Forge proxy (`BUILT_IN_FORGE_API_URL`).

**New:** Call Google Maps APIs directly with `GOOGLE_MAPS_API_KEY`.

**Impact:** Only `server/deliveryCharge.ts` uses this (Distance Matrix API). The frontend `Map.tsx` component is not used anywhere currently — can be updated later if needed.

### 4.8 `client/src/main.tsx` — App Entry Point

**Changes:**
- Wrap app in `<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>`
- Remove the Manus `manus-content-root` badge-hiding code (lines that hide Manus branding)
- Remove loading splash that references manuscdn.com logo

### 4.9 `client/src/const.ts` — Login URL Helper

**Current:** `getLoginUrl()` builds Manus OAuth portal redirect URL.

**New:** Remove `getLoginUrl()` entirely. Clerk handles login via `<SignIn />` component or `useClerk().openSignIn()`.

### 4.10 `client/src/_core/hooks/useAuth.ts` — React Auth Hook

**Current:** Calls `trpc.auth.me.useQuery()` and provides user state.

**New approach (hybrid — minimal disruption):**
- Keep `trpc.auth.me.useQuery()` as the source of truth for user data (since our DB has role, outletId, isManager, loyaltyPoints, etc. that Clerk doesn't know about)
- Add Clerk's `useAuth()` for session state (isSignedIn, signOut)
- The `trpc.auth.me` endpoint already works because `context.ts` will use Clerk's session token
- Replace `getLoginUrl()` usage with Clerk's `<SignIn />` redirect

### 4.11 `client/src/components/Header.tsx` — Navigation Header

**Changes:**
- Replace login button (currently links to `getLoginUrl()`) with Clerk `<SignInButton />`
- Replace user avatar/menu with Clerk `<UserButton />` (or keep custom UI + use `useClerk().signOut()`)
- Update logo URL from manuscdn.com → Cloudinary URL

### 4.12 `client/src/components/LoginTransition.tsx`

**Changes:**
- Remove Manus OAuth callback handling (the "logging you in..." transition screen)
- Replace with Clerk's built-in redirect handling (or remove entirely — Clerk handles this)

### 4.13 `vite.config.ts` — Build Configuration

**Changes:**
- Remove `import { vitePluginManusRuntime } from "vite-plugin-manus-runtime"`
- Remove `import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc"`
- Remove both from `plugins` array
- Remove `.manuspre.computer`, `.manus.computer`, `.manus-asia.computer`, `.manuscomputer.ai`, `.manusvm.computer` from `allowedHosts`
- Add `thamaraifoods.com` and `.ondigitalocean.app` to `allowedHosts` (or just use `true` for all hosts)

### 4.14 CDN Migration — 54 manuscdn.com URLs across 9 files

**Strategy:** Upload all assets to Cloudinary, then find-and-replace URLs.

| File | Asset Type | Count |
|------|-----------|-------|
| `client/src/pages/Home.tsx` | Videos (MP4/MOV), posters (JPG) | ~18 |
| `client/src/pages/Menu.tsx` | Product images (JPG) | ~10 |
| `client/src/pages/Events.tsx` | Event images (JPG) | 3 (already partially migrated, broken URLs) |
| `client/src/pages/LeelaHyderabad.tsx` | Poster image | 1 |
| `client/src/components/Header.tsx` | Logo image | 1 |
| `client/src/components/LoginTransition.tsx` | Logo image | 1 |
| `client/src/main.tsx` | Splash logo | 1 |
| `client/src/components/ChatWidget.tsx` | Greeting lady image | 1 (file being deleted) |
| `client/src/components/VoiceChatWidget.tsx` | Greeting lady image | 1 (file being deleted) |

**Process:**
1. Download all 34 unique assets from manuscdn.com
2. Upload to Cloudinary under `taiwan-maami/static/` folder
3. Replace all URLs in code with Cloudinary delivery URLs
4. Videos: Cloudinary supports video hosting (or use DigitalOcean Spaces if cheaper)

---

## 5. Files to DELETE

| File | Reason |
|------|--------|
| `server/_core/sdk.ts` | Entire Manus OAuth SDK (exchangeCodeForToken, getUserInfo, createSessionToken, authenticateRequest) |
| `server/_core/oauth.ts` | Manus OAuth callback handler — replaced by Clerk webhook |
| `server/chatbot.ts` | LLM chatbot using invokeLLM — scope decision: remove entirely |
| `server/tts.ts` | Text-to-speech using Manus Forge — scope decision: remove |
| `server/_core/llm.ts` | Manus Forge LLM wrapper — no longer needed (chatbot removed, partnerRouter doesn't use it) |
| `server/_core/imageGeneration.ts` | Manus Forge image generation — not used in production flows |
| `server/_core/voiceTranscription.ts` | Manus Forge voice transcription — not used |
| `client/src/components/ChatWidget.tsx` | Customer chatbot UI — remove |
| `client/src/components/VoiceChatWidget.tsx` | Voice chat UI — remove |
| `client/src/components/AIChatBox.tsx` | AI chat component — only used by ChatWidget |
| `client/src/components/Map.tsx` | Manus Maps proxy component — not imported anywhere |

---

## 6. User Migration Strategy (493 Existing Users)

### 6.1 How It Works

The `users.openId` column (varchar 64) currently stores Manus openId (22-char base62). After migration, it will store Clerk userId (format: `user_2abc...`, 27-32 chars). Both fit in varchar(64).

**On first Clerk login by an existing customer:**
1. Customer signs in via Clerk (email/password or Google OAuth)
2. Clerk fires `user.created` webhook to our `/api/clerk-webhook` endpoint
3. Webhook handler checks: does this email exist in our `users` table?
4. **Yes → UPDATE:** `UPDATE users SET openId = 'user_2abc...' WHERE email = 'customer@example.com'`
5. Customer's order history, loyalty points, addresses — all preserved (linked by `users.id` int FK)

**For brand-new customers:**
1. Sign up via Clerk
2. Webhook fires → email not found → INSERT new user row with Clerk userId as openId

### 6.2 Special Cases

| User | Current openId | Action |
|------|---------------|--------|
| Walk-in customer | `walkin-customer-account` | Keep as-is — never logs in via Clerk, used only for POS walk-in orders |
| Admin (Kannan) | Manus openId | Matched by email `kannanswamy@hotmail.com` → set role='admin' |
| Admin (Theresa) | Manus openId | Matched by email `theresa.hu.cy@taiwanmaami.com` → set role='admin' |
| 10 staff users | Manus openId | Matched by email → Employee Master API confirms → set role='staff' |
| 480 customers | Manus openId | Matched by email → role stays 'user' |

### 6.3 No Downtime, No Bulk Migration

We do NOT need to pre-populate Clerk with 493 users. Clerk is the identity provider — users create accounts there on first visit. Our webhook links them to existing DB records by email. This is a **lazy migration** — zero downtime, zero bulk operations.

---

## 7. Environment Variables — Complete List for DO Deployment

### 7.1 Required (must set in DO App Platform)

| Variable | Source | Example |
|----------|--------|---------|
| `CUSTOM_DATABASE_URL` | DigitalOcean MySQL | `mysql://user:pass@host:25060/db?ssl=...` |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys | `sk_live_abc123...` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys | `pk_live_abc123...` |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks | `whsec_abc123...` |
| `JWT_SECRET` | Self-generated | (for service token auth on /api/service/* endpoints) |
| `MAAMITECH_SERVICE_TOKEN` | Self-generated | (for ETL/digest cron auth) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Dashboard | `drpu1dbqk` |
| `CLOUDINARY_API_KEY` | Cloudinary Dashboard | `123456789` |
| `CLOUDINARY_API_SECRET` | Cloudinary Dashboard | `abc123...` |
| `RAZORPAY_KEY_ID` | Razorpay Dashboard | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Dashboard | `...` |
| `TWILIO_ACCOUNT_SID` | Twilio Console | `AC...` |
| `TWILIO_AUTH_TOKEN` | Twilio Console | `...` |
| `TWILIO_WHATSAPP_FROM` | Twilio Console | `whatsapp:+14155238886` |
| `TWILIO_WHATSAPP_TO` | Twilio Console | `whatsapp:+91...` |
| `EMP_MASTER_API_KEY` | Internal | `...` |
| `EMP_MASTER_API_URL` | Internal | `https://...` |
| `SUPABASE_URL` | Supabase Dashboard | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard | `eyJ...` |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console | `AIza...` |
| `KOT_PRINT_SECRET` | Self-generated | (KOT printer auth) |
| `VITE_KOT_PRINT_SECRET` | Same as above | (frontend KOT auth) |
| `PETPOOJA_UPLOAD_PIN` | Internal | `...` |

### 7.2 Removed (no longer needed)

| Variable | Reason |
|----------|--------|
| `VITE_APP_ID` | Manus OAuth — replaced by Clerk |
| `OAUTH_SERVER_URL` | Manus OAuth — replaced by Clerk |
| `VITE_OAUTH_PORTAL_URL` | Manus OAuth — replaced by Clerk |
| `OWNER_OPEN_ID` | Admin detection now by email |
| `OWNER_NAME` | Not used in code logic |
| `BUILT_IN_FORGE_API_URL` | Manus Forge — all services replaced |
| `BUILT_IN_FORGE_API_KEY` | Manus Forge — all services replaced |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus Forge — all services replaced |
| `VITE_FRONTEND_FORGE_API_URL` | Manus Forge — all services replaced |
| `VITE_ANALYTICS_ENDPOINT` | Manus analytics — remove or replace with Plausible/PostHog later |
| `VITE_ANALYTICS_WEBSITE_ID` | Same |

---

## 8. Implementation Order (Suggested Sequence)

The implementation should proceed in this order to minimize breakage at each step:

| Step | Description | Risk | Reversible? |
|------|-------------|------|-------------|
| 1 | Delete chatbot/tts/voice files + remove ChatWidget from UI | None | Yes |
| 2 | Replace `notification.ts` internals with Twilio WhatsApp | Low | Yes |
| 3 | Replace `storage.ts` with Cloudinary-only implementation | Low | Yes |
| 4 | Replace `map.ts` with direct Google Maps API call | Low | Yes |
| 5 | CDN migration — upload assets to Cloudinary, replace URLs | Low | Yes |
| 6 | Install Clerk packages, create `clerk.ts` + `clerkWebhook.ts` | Medium | Yes |
| 7 | Update `context.ts` to use Clerk `getAuth()` | **High** | Checkpoint first |
| 8 | Update `env.ts` — remove Manus vars, add Clerk vars | **High** | Checkpoint first |
| 9 | Update frontend — ClerkProvider, remove getLoginUrl, update Header | **High** | Checkpoint first |
| 10 | Update `vite.config.ts` — remove Manus plugins | Low | Yes |
| 11 | Delete `sdk.ts`, `oauth.ts`, `llm.ts`, `imageGeneration.ts`, `voiceTranscription.ts` | Medium | Checkpoint first |
| 12 | Test full flow locally | — | — |
| 13 | Create DO App Platform app spec + deploy | — | — |

---

## 9. Clerk Configuration (Dashboard Setup)

Before implementation, set up in Clerk Dashboard (https://dashboard.clerk.com):

1. **Create application** — name: "Taiwan Maami" or "Thamarai Foods"
2. **Authentication methods:**
   - Email + password (primary)
   - Google OAuth (optional, for convenience)
   - Phone number (optional, for OTP login)
3. **Webhook endpoint:**
   - URL: `https://thamaraifoods.com/api/clerk-webhook`
   - Events: `user.created`, `user.updated`
4. **Customization:**
   - Brand color: Taiwan Maami teal (#0d9488)
   - Logo: Upload Taiwan Maami logo
   - Redirect URLs: `https://thamaraifoods.com`

---

## 10. What Stays Unchanged

These systems have NO Manus dependencies and work as-is on DigitalOcean:

- Razorpay payment integration
- Twilio WhatsApp (already direct)
- Supabase ETL pipeline
- KOT printer integration
- Petpooja webhook receiver
- Employee Master API
- All tRPC routers (business logic)
- All database schema + data
- GitHub Actions workflows (ETL cron, digest cron)
- Drizzle ORM + migrations

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Clerk webhook fails → user not linked | Low | High (user sees empty account) | Fallback: context.ts does email lookup if openId not found |
| manuscdn.com assets go offline before migration | Medium | High (broken images/videos) | Priority: migrate CDN assets first (Step 5) |
| Google Maps API key billing surprise | Low | Low | Set budget alert in Google Cloud Console |
| Cloudinary free tier limits | Low | Medium | Current usage is well within free tier (25GB bandwidth) |
| Staff not recognized on first login | Low | Medium | Employee Master API timeout → default to 'user' role, admin can promote manually |

---

## 12. Testing Checklist (Post-Implementation)

- [ ] New customer can sign up via Clerk and place an order
- [ ] Existing customer (by email) logs in → sees order history + loyalty points
- [ ] Admin (kannanswamy@hotmail.com) logs in → gets admin role → can access admin panel
- [ ] Staff user logs in → gets staff role → can access POS
- [ ] Walk-in customer account still works for POS orders
- [ ] KOT prints on new order
- [ ] WhatsApp notification fires on new order (replaces notifyOwner)
- [ ] Daily digest sends via WhatsApp (already working)
- [ ] Image uploads go to Cloudinary (product images, backups)
- [ ] Delivery charge calculation works (Google Maps direct)
- [ ] Razorpay payments process correctly
- [ ] All manuscdn.com assets load from Cloudinary
- [ ] No references to manus.im, manuscdn.com, or Forge API in production build

---

## 13. Questions for Kannan Before Implementation

1. **Google Maps API key** — Do you already have one, or should I guide you through creating one in Google Cloud Console? (Needed for delivery charge calculation)

2. **Clerk authentication methods** — Should customers be able to log in with:
   - Email + password only?
   - Email + Google OAuth?
   - Phone OTP?

3. **Video hosting** — The homepage has 8 videos (~50MB total) currently on manuscdn.com. Cloudinary supports video but charges for bandwidth. Alternatives:
   - Cloudinary (simplest, same as images)
   - DigitalOcean Spaces ($5/mo, 250GB bandwidth)
   - YouTube embeds (free, but different UX)
   
   Which do you prefer?

4. **Analytics** — Currently using Manus analytics (being removed). Want to add:
   - Plausible Analytics (privacy-friendly, $9/mo)?
   - Google Analytics (free)?
   - Skip for now?

---

*This plan covers all changes needed. No code will be written until you approve. Please review and let me know if anything needs adjustment.*
