/**
 * Vitest config for CI environment (no DATABASE_URL available).
 * Excludes tests that require a live database or external services.
 */
import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    exclude: [
      // DB-dependent tests (require DATABASE_URL)
      "server/addon-selection-mode.test.ts",
      "server/b2b.test.ts",
      "server/backup.restore.test.ts",
      "server/botAnalytics.test.ts",
      "server/cloudinary.test.ts",
      "server/cms-refunds.test.ts",
      "server/cms.test.ts",
      "server/customerDetails.test.ts",
      "server/customers.merge.test.ts",
      "server/employeeMaster.test.ts",
      "server/events-workshops.test.ts",
      "server/events.test.ts",
      "server/excel-exports.test.ts",
      "server/hybridStorage.test.ts",
      "server/kot-instore.test.ts",
      "server/kot.summary.test.ts",
      "server/mergeOrders.test.ts",
      "server/pageview-tracking.test.ts",
      "server/paymentAlert.test.ts",
      "server/petpoojaUpload.test.ts",
      "server/popup.test.ts",
      "server/pos-tables.test.ts",
      "server/razorpay.test.ts",
      "server/salesReportStructure.test.ts",
      "server/supabase.test.ts",
      "server/tokenRegistry.test.ts",
      "server/voiceChat.test.ts",
      "server/wholesale.test.ts",
    ],
  },
});
