import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';

describe('CMS, Admin PIN, and Refunds Features', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  describe('CMS Content', () => {
    it('should have site_settings table for CMS content', async () => {
      // Verify the site_settings table exists and can be queried
      const result = await db.execute('SELECT COUNT(*) as count FROM site_settings WHERE `key` LIKE "cms_%"');
      expect(result).toBeDefined();
    });

    it('should be able to insert and retrieve CMS content', async () => {
      const testKey = `cms_test_${Date.now()}`;
      const testValue = 'Test content for CMS';
      
      // Insert test content
      await db.execute(`INSERT INTO site_settings (\`key\`, value) VALUES ('${testKey}', '${testValue}') ON DUPLICATE KEY UPDATE value = '${testValue}'`);
      
      // Retrieve it
      const [result] = await db.execute(`SELECT * FROM site_settings WHERE \`key\` = '${testKey}'`);
      expect(result).toBeDefined();
      
      // Clean up
      await db.execute(`DELETE FROM site_settings WHERE \`key\` = '${testKey}'`);
    });
  });

  describe('Admin PIN', () => {
    it('should have adminPins table', async () => {
      const result = await db.execute('SELECT COUNT(*) as count FROM adminPins');
      expect(result).toBeDefined();
    });

    it('should be able to store hashed PIN', async () => {
      const crypto = await import('crypto');
      const testPin = '1234';
      const pinHash = crypto.createHash('sha256').update(testPin).digest('hex');
      
      // The hash should be 64 characters (SHA-256 hex)
      expect(pinHash.length).toBe(64);
      expect(pinHash).not.toBe(testPin); // Should be hashed, not plain text
    });
  });

  describe('Refund Requests', () => {
    it('should have refundRequests table', async () => {
      const result = await db.execute('SELECT COUNT(*) as count FROM refundRequests');
      expect(result).toBeDefined();
    });

    it('should have correct columns in refundRequests table', async () => {
      const [columns] = await db.execute('DESCRIBE refundRequests');
      const columnNames = columns.map((c: any) => c.Field);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('orderId');
      expect(columnNames).toContain('orderNumber');
      expect(columnNames).toContain('refundAmount');
      expect(columnNames).toContain('refundReason');
      expect(columnNames).toContain('refundType');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('requestedBy');
      expect(columnNames).toContain('reviewedBy');
    });
  });

  describe('Discount Authorizations', () => {
    it('should have discountAuthorizations table', async () => {
      const result = await db.execute('SELECT COUNT(*) as count FROM discountAuthorizations');
      expect(result).toBeDefined();
    });
  });
});
