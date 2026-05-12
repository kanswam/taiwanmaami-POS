export const ENV = {
  databaseUrl: process.env.CUSTOM_DATABASE_URL || process.env.DATABASE_URL || "",
  isProduction: process.env.NODE_ENV === "production",
  // Clerk authentication
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET ?? "",
  kotPrintSecret: process.env.KOT_PRINT_SECRET ?? "",
  // Cloudinary configuration for image optimization
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  // Razorpay payment gateway
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  // JWT Secret for wholesale auth
  jwtSecret: process.env.JWT_SECRET ?? "",
  // Umami Analytics
  analyticsEndpoint: process.env.VITE_ANALYTICS_ENDPOINT ?? "",
  analyticsWebsiteId: process.env.VITE_ANALYTICS_WEBSITE_ID ?? "",
  // Petpooja quick upload PIN
  petpoojaUploadPin: process.env.PETPOOJA_UPLOAD_PIN ?? "",
  // MaamiTech Agentic AI — service-to-service auth
  maamitechApiEnabled: process.env.MAAMITECH_API_ENABLED === "true",
  maamitechServiceToken: process.env.MAAMITECH_SERVICE_TOKEN ?? "",
  // Employee Master API (for proxy)
  empMasterApiUrl: process.env.EMP_MASTER_API_URL ?? "",
  empMasterApiKey: process.env.EMP_MASTER_API_KEY ?? "",
  // Scoped Token Registry (JSON array of TokenEntry objects)
  maamitechTokenRegistry: process.env.MAAMITECH_TOKEN_REGISTRY ?? "",
  // Supabase Data Lake
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
};
