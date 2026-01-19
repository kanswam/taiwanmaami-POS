import { describe, it, expect, vi, beforeEach } from "vitest";
import { restoreFromBackup } from "./backup";

// Mock the storage module
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://mock-s3.com/backup.json", key: "backup.json" }),
  storageGet: vi.fn().mockResolvedValue({ url: "https://mock-s3.com/backup.json" }),
}));

// Mock the notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

describe("Database Restore Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("restoreFromBackup", () => {
    it("should fail gracefully with invalid backup URL", async () => {
      // Mock fetch to return an error
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      const result = await restoreFromBackup(
        "https://invalid-url.com/backup.json",
        false // Don't create pre-restore backup for this test
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to fetch backup");
      expect(result.timestamp).toBeDefined();

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it("should fail gracefully with invalid backup format (missing metadata)", async () => {
      // Mock fetch to return invalid JSON structure
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ invalid: "structure" }),
      });

      const result = await restoreFromBackup(
        "https://mock-s3.com/backup.json",
        false // Don't create pre-restore backup for this test
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid backup format");

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it("should fail gracefully with invalid backup format (missing data)", async () => {
      // Mock fetch to return JSON with metadata but no data
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ 
          metadata: { createdAt: "2025-01-19T00:00:00Z" },
          // missing data field
        }),
      });

      const result = await restoreFromBackup(
        "https://mock-s3.com/backup.json",
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid backup format");

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it("should return timestamp on both success and failure", async () => {
      // Mock fetch to fail
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      const result = await restoreFromBackup(
        "https://invalid-url.com/backup.json",
        false
      );

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it("should include preRestoreBackupKey in result when backup fails", async () => {
      // Mock fetch to fail
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      const result = await restoreFromBackup(
        "https://invalid-url.com/backup.json",
        false // Skip pre-restore backup
      );

      expect(result.success).toBe(false);
      // preRestoreBackupKey should be undefined when we skip pre-restore backup
      expect(result.preRestoreBackupKey).toBeUndefined();

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });
});
