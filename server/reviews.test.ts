import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { reviews, orders, users } from '../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

describe('Reviews Feature', () => {
  let dbInstance: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    dbInstance = await getDb();
  });

  describe('Database Schema', () => {
    it('should have reviews table accessible', async () => {
      if (!dbInstance) {
        console.log('Database not available, skipping test');
        return;
      }
      
      // Simply verify we can query the reviews table
      const result = await dbInstance.select().from(reviews).limit(1);
      
      // Should return an array (may be empty)
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Review Queries', () => {
    it('should be able to query reviews with user and order info', async () => {
      if (!dbInstance) {
        console.log('Database not available, skipping test');
        return;
      }
      
      // This tests the join query used in getAllAdmin
      const allReviews = await dbInstance.select({
        id: reviews.id,
        orderId: reviews.orderId,
        userId: reviews.userId,
        productId: reviews.productId,
        rating: reviews.rating,
        reviewText: reviews.reviewText,
        isApproved: reviews.isApproved,
        isVisible: reviews.isVisible,
        createdAt: reviews.createdAt,
        userName: users.name,
        orderNumber: orders.orderNumber,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .leftJoin(orders, eq(reviews.orderId, orders.id))
      .orderBy(desc(reviews.createdAt))
      .limit(10);
      
      // Should return an array (may be empty if no reviews yet)
      expect(Array.isArray(allReviews)).toBe(true);
    });
  });
});

describe('Invoice Feature', () => {
  describe('Invoice HTML Generation', () => {
    it('should generate valid invoice HTML', async () => {
      const { generateInvoiceHtml } = await import('./invoice');
      
      const testData = {
        orderNumber: 'TM-TEST-001',
        orderDate: new Date(),
        customerName: 'Test Customer',
        customerPhone: '+91 9876543210',
        orderType: 'delivery' as const,
        deliveryAddress: '123 Test Street, Chennai',
        items: [
          { name: 'Hazelnut Milk Tea', quantity: 2, unitPrice: 25000, totalPrice: 50000 },
          { name: 'Mango Mochi (Set of 2)', quantity: 1, unitPrice: 35000, totalPrice: 35000 },
        ],
        subtotal: 85000,
        stateGst: 2125,
        centralGst: 2125,
        deliveryCharge: 5000,
        discount: 0,
        totalAmount: 94250,
        paymentMethod: 'Online',
        paymentStatus: 'completed',
      };
      
      const html = generateInvoiceHtml(testData);
      
      // Verify HTML structure
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Taiwan Maami');
      expect(html).toContain('TM-TEST-001');
      expect(html).toContain('Test Customer');
      expect(html).toContain('Hazelnut Milk Tea');
      expect(html).toContain('Mango Mochi');
      expect(html).toContain('State GST');
      expect(html).toContain('Central GST');
      expect(html).toContain('INVOICE');
    });

    it('should handle orders without delivery address', async () => {
      const { generateInvoiceHtml } = await import('./invoice');
      
      const testData = {
        orderNumber: 'TM-TEST-002',
        orderDate: new Date(),
        customerName: 'Pickup Customer',
        customerPhone: '+91 9876543210',
        orderType: 'pickup' as const,
        items: [
          { name: 'Iced Coffee', quantity: 1, unitPrice: 18000, totalPrice: 18000 },
        ],
        subtotal: 18000,
        stateGst: 450,
        centralGst: 450,
        deliveryCharge: 0,
        discount: 0,
        totalAmount: 18900,
        paymentMethod: 'Cash',
        paymentStatus: 'pending',
      };
      
      const html = generateInvoiceHtml(testData);
      
      // Should not contain delivery address section
      expect(html).toContain('Pickup');
      expect(html).not.toContain('Delivery Address');
    });

    it('should show discount when applied', async () => {
      const { generateInvoiceHtml } = await import('./invoice');
      
      const testData = {
        orderNumber: 'TM-TEST-003',
        orderDate: new Date(),
        customerName: 'Discount Customer',
        customerPhone: '+91 9876543210',
        orderType: 'delivery' as const,
        items: [
          { name: 'Matcha Latte', quantity: 1, unitPrice: 28000, totalPrice: 28000 },
        ],
        subtotal: 28000,
        stateGst: 700,
        centralGst: 700,
        deliveryCharge: 0,
        discount: 5000,
        totalAmount: 24400,
        paymentMethod: 'Online',
        paymentStatus: 'completed',
      };
      
      const html = generateInvoiceHtml(testData);
      
      // Should contain discount section
      expect(html).toContain('Discount');
      expect(html).toContain('color: green');
    });
  });
});
